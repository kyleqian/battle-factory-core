"""Log every sound the ROM starts in a short window as (frame, kind, id, pan/mode).

Read-only dev probe (docs/s11-audio-design.md). The libmgba-py binding exposes no
debugger, so "breakpoints" are a single-step loop that compares the Thumb PC with
function entries (PC == symbol + 2 is the first instruction, r0..r3 still hold
the arguments) -- the same technique as tools/probe/trace-factory-construction-rng.py.

  python3 tools/run-mgba-probe.py [--rm-log-on-success] OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json draft [--frames N] [--profile on|off] [--fast]
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json lab REQUEST.json [--frames N] [--log-setup] [--profile on|off] [--fast]
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json trace TRACE.json [--from N] [--frames N] [--profile on|off] [--fast]

`frame` is 1-based: an event during the k-th advance is reported at frame k, the
first frame whose capture can show its effect. `lab` replays a battle-lab request
(mechanicLab / factoryLegal) and logs only its trace window unless --log-setup.
`lab` output carries the replay `trace` key (route / battleScene / appStage id = request file stem / segments) that the aud24* tests replay.
OUT.json must not exist (the probe and the wrapper both refuse a stale path); --rm-log-on-success drops the wrapper's OUT.json.log.
--compact writes the committed-fixture form (one line, no spaces, trailing newline); --extra-hooks NAME[,NAME] (or AUDIO_PROBE_EXTRA_HOOKS=NAME[,NAME]; both are merged) adds non-audio call-log hooks, e.g. BlendPalette for the aud242d+ fixtures.
--setup-out FILE (lab mode, aud243b) writes {descriptor, snapshot, randomTurnNumber, opponentReply} of the staged action-menu state (gRngValue, both parties, battlers; aud243c: gRandomTurnNumber and the
opponent controller reply gBattleBufferB[1][0..3]) before the window runs.
--drive DECISIONS.json (lab mode, aud243d) replaces the request's static trace by the closed-loop ROM driver (tools/audio/romDecisionDriver.py): it consumes the engine's decision list
(soundCensusRomReplay.ts `decisions`) by menu state until gBattleOutcome != 0 (or --frames N, or the no-progress watchdog, which aborts with a state dump), at full speed with no sound hooks. The result's `drive` key
carries the executed run-length segments, per-decision ROM anchors, the ROM state timeline and the stop reason; --drive-out FILE also writes the request with trace.segments = the executed segments (the frozen,
open-loop trace for romStateTimeline.py / a sound pass of `lab`).
--profile selects the Scene ON (default) or Scene OFF oracle bootstrap.
--fast is the hybrid mode: frames run at full speed and a frame is re-stepped (from the
saved pre-frame state) only when the m4a RAM signature changed during it. Plain stepping
is the reference; tools/audio/compareProbe.py proves a hybrid log equal to a stepping log.
"""
import bisect, json, os, re, struct, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, SUBSTRUCT_POSITIONS, validate_request  # noqa: E402
from mgba import ffi  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
import romDecisionDriver  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
HOOKS = ["m4aSongNumStart", "m4aSongNumStop", "PlayCryInternal", "PlaySE12WithPanning", "PlaySE1WithPanning",
         "PlaySE2WithPanning", "SE12PanpotControl", "PlayBGM", "PlayFanfare", "PlayFanfareByFanfareNum",
         "m4aMPlayFadeOut", "m4aMPlayFadeOutTemporarily", "m4aMPlayFadeIn", "m4aMPlayVolumeControl",
         "m4aMPlayStop", "m4aMPlayContinue"]
FADE_HOOKS = {"m4aMPlayFadeOut": "out", "m4aMPlayFadeOutTemporarily": "out-temporary", "m4aMPlayFadeIn": "in"}
PROFILES = {"on": ("battle-scene-on", "factory.json"), "off": ("battle-scene-off", "factory-battle-scene-off.json")}
SAVE_IWRAM = 0x19000  # offset of IWRAM inside save_raw_state() (verified against live memory)
MPLAY_INFO_SIZE, MPLAY_TRACK_SIZE = 0x40, 0x50
STATE_HEADER = 0x400  # cpu / event-queue bookkeeping at the top of a raw state differs between run_frame and stepping; memory does not
SE_CALLERS = {"PlaySE", "PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"}
BGM_CALLERS = {"PlayBGM", "PlayNewMapMusic", "FadeInNewBGM", "FadeOutAndPlayNewMapMusic", "FadeOutAndFadeInNewMapMusic"}
FANFARE_CALLERS = {"PlayFanfare", "PlayFanfareByFanfareNum", "WaitFanfare", "Task_Fanfare"}
CRY_MODES = ["NORMAL", "DOUBLES", "ENCOUNTER", "HIGH_PITCH", "ECHO_START", "FAINT", "ECHO_END", "ROAR_1", "ROAR_2",
             "GROWL_1", "GROWL_2", "WEAK", "WEAK_DOUBLES"]


def s8(v):
    v &= 0xFF
    return v - 256 if v & 0x80 else v


def load_defines(path, prefix_re):
    names = {}
    for m in re.finditer(r"#define\s+(%s\w*)\s+(\d+)" % prefix_re, path.read_text()):
        names.setdefault(int(m.group(2)), m.group(1))
    return names


def lab_replay_trace(request_path, profile, segments):
    """The `trace` key the aud24* / audioProbeFixtures tests replay: a lab request's trace window staged by its own request id."""
    return {"route": "generated-orchestrator", "battleScene": "on" if profile == "battle-scene-on" else "off",
            "appStage": {"id": Path(request_path).stem, "frame": 0}, "segments": segments}


def extra_hook_names(rest, environ):
    """Names from `--extra-hooks A,B` (flag or --extra-hooks=A,B) plus AUDIO_PROBE_EXTRA_HOOKS, in order, deduplicated."""
    raw = [environ.get("AUDIO_PROBE_EXTRA_HOOKS", "")]
    for i, a in enumerate(rest):
        if a == "--extra-hooks":
            if i + 1 >= len(rest):
                raise SystemExit("soundEventProbe: --extra-hooks needs NAME[,NAME]")
            raw.append(rest[i + 1])
        elif a.startswith("--extra-hooks="):
            raw.append(a.split("=", 1)[1])
    return list(dict.fromkeys(n.strip() for r in raw for n in r.split(",") if n.strip()))


DRIVE_FRAME_CAP = 80000


def read_party_member(oracle, base):
    """Species, item and PP of one struct Pokemon, with HP and status1 (outside the encrypted box). GetBoxMonData / SetBoxMonData decrypt the box IN PLACE and
    encrypt it again before they return (pokemon.c), and an emulator frame can end inside one (the opponent's AI runs for more than a frame while the player's
    menu opens): the 48 data bytes are then plain, or half way. The box checksum (the sum of the 24 plain halfwords) tells which: try the encrypted reading, then
    the plain one; neither -> species / item / pp are None and the caller reads again on a later frame."""
    raw = bytes(oracle.core.memory.u8[base:base + 100])
    personality, ot_id = struct.unpack_from("<II", raw, 0)
    checksum = struct.unpack_from("<H", raw, 28)[0]
    data, key = raw[32:80], personality ^ ot_id
    xored = b"".join(struct.pack("<I", struct.unpack_from("<I", data, o)[0] ^ key) for o in range(0, 48, 4))
    out = {"species": None, "hp": struct.unpack_from("<H", raw, 86)[0], "status1": struct.unpack_from("<I", raw, 80)[0], "pp": None, "item": None}
    for physical in (xored, data):
        if sum(struct.unpack("<24H", physical)) & 0xFFFF == checksum:
            order = SUBSTRUCT_POSITIONS[personality % 24]
            growth, attacks = physical[order[0] * 12:order[0] * 12 + 12], physical[order[1] * 12:order[1] * 12 + 12]
            out["species"], out["item"] = struct.unpack_from("<HH", growth, 0)
            out["pp"] = list(attacks[8:12])
            break
    return out


def wide_state(oracle, lab=None):
    """parity-mac fourth pass: the battle state the wide compare checks at every decision point (soundCensusRomReplay.ts `wideOf` builds the same shape from the
    engine). Raw source fields: gBattleMons, gDisableStructs, gStatuses3, both parties (HP, status1, PP, item of each member), gSideStatuses / gSideTimers,
    gBattleWeather and gWishFutureKnock (include/battle.h:70-102, 149-174)."""
    sym = oracle.symbols
    r8, r16, r32 = oracle.read_u8, oracle.read_u16, oracle.read_u32

    def battler(b):
        base, d = sym["gBattleMons"] + b * 0x58, sym["gDisableStructs"] + b * 0x1C
        return {"partyIndex": r8(sym["gBattlerPartyIndexes"] + b * 2), "species": r16(base), "hp": r16(base + 0x28), "maxHp": r16(base + 0x2C),
                "status1": r32(base + 0x4C), "status2": r32(base + 0x50), "status3": r32(sym["gStatuses3"] + b * 4),
                "statStages": [r8(base + 0x18 + i) for i in range(8)], "moves": [r16(base + 0x0C + i * 2) for i in range(4)],
                "pp": [r8(base + 0x24 + i) for i in range(4)], "item": r16(base + 0x2E), "ability": r8(base + 0x20), "types": [r8(base + 0x21), r8(base + 0x22)],
                "stats": [r16(base + 2 + i * 2) for i in range(5)],
                "disabledMove": r16(d + 4), "encoredMove": r16(d + 6), "protectUses": r8(d + 8), "stockpileCounter": r8(d + 9), "substituteHP": r8(d + 0xA),
                "disableTimer": r8(d + 0xB) & 0xF, "encoreTimer": r8(d + 0xE) & 0xF, "perishSongTimer": r8(d + 0xF) & 0xF, "furyCutterCounter": r8(d + 0x10),
                "rolloutTimer": r8(d + 0x11) & 0xF, "chargeTimer": r8(d + 0x12) & 0xF, "tauntTimer": r8(d + 0x13) & 0xF, "isFirstTurn": r8(d + 0x16),
                "truantCounter": r8(d + 0x18) & 1, "mimickedMoves": r8(d + 0x18) >> 4, "rechargeTimer": r8(d + 0x19)}

    def party(symbol):
        return [read_party_member(oracle, sym[symbol] + i * 100) for i in range(3)]

    def side(i):
        t = sym["gSideTimers"] + i * 0xC
        return {"status": r16(sym["gSideStatuses"] + i * 2), "reflectTimer": r8(t), "lightscreenTimer": r8(t + 2), "mistTimer": r8(t + 4), "safeguardTimer": r8(t + 6),
                "spikesAmount": r8(t + 10)}

    w = sym["gWishFutureKnock"]
    return {"battlers": [battler(0), battler(1)], "parties": [party("gPlayerParty"), party("gEnemyParty")], "sides": [side(0), side(1)],
            "weather": r16(sym["gBattleWeather"]), "weatherTimer": r8(w + 0x28),
            "futureSightCounter": [r8(w + i) for i in range(2)], "futureSightAttacker": [r8(w + 4 + i) for i in range(2)],
            "futureSightMove": [r16(w + 0x18 + i * 2) for i in range(2)], "wishCounter": [r8(w + 0x20 + i) for i in range(2)], "wishMonId": [r8(w + 0x24 + i) for i in range(2)]}


def drive_lab(oracle, funcs, decisions, cap=None, lab=None):
    """Closed-loop run of the staged lab battle (aud243d): returns the executed segments, anchors, ROM timeline (romStateTimeline.py row shape) and stop reason."""
    sym = oracle.symbols
    mons, tasks = sym["gBattleMons"], sym["gTasks"]
    driver = romDecisionDriver.RomDriver(decisions, funcs)

    def hp_row():
        return (oracle.read_u16(sym["gCurrentMove"]), oracle.read_u16(mons + 0x28), oracle.read_u16(mons + 0x58 + 0x28),
                oracle.read_u32(sym["gRngValue"]), oracle.read_u16(sym["gLastMoves"]), oracle.read_u16(sym["gLastMoves"] + 2))

    def observe(row):
        func = oracle.read_u32(sym["gBattlerControllerFuncs"])
        live = [oracle.read_u32(tasks + i * 40) & ~1 for i in range(16) if oracle.read_u8(tasks + i * 40 + 4)]
        slot = oracle.read_u8(sym["gPartyMenu"] + 9)
        return {"func": func, "actionCursor": oracle.read_u8(sym["gActionSelectionCursor"]), "moveCursor": oracle.read_u8(sym["gMoveSelectionCursor"]),
                "slotId": slot - 256 if slot & 0x80 else slot, "partyOrder": [oracle.read_u8(sym["gBattlePartyCurrentOrder"] + i) for i in range(3)], "partyTasks": live, "outcome": oracle.read_u8(sym["gBattleOutcome"]),
                "mainFunc": oracle.read_u32(sym["gBattleMainFunc"]),
                "sig": (func, row[1], row[2], row[3], oracle.read_u32(sym["gBattlescriptCurrInstr"]), oracle.read_u32(sym["gBattleMainFunc"]),
                        oracle.read_u32(sym["gBattleControllerExecFlags"]), oracle.read_u32(sym["gBattlerControllerFuncs"] + 4), tuple(live))}

    frames, timeline, stop, error = [], [], "outcome", None
    wide, reread = [], 0  # one wide state per decision, read on the frame its menu was first seen (parity-mac fourth pass)
    row = hp_row()
    timeline.append([0, *row])
    limit = DRIVE_FRAME_CAP if cap is None else cap
    while True:
        obs = observe(row)
        try:
            buttons = driver.step(obs)
        except romDecisionDriver.DriverError as e:
            stop, error = e.reason, e.dump
            break
        if lab is not None:
            def capture():
                w = wide_state(oracle, lab)
                if driver.last_state.startswith("party"):
                    # While the battle party menu is open gPlayerParty is in MENU order (party_menu.c UpdatePartyToBattleOrder:
                    # gPlayerParty[menu slot of party id i] = party member i); put it back in party-id order.
                    w["parties"][0] = [w["parties"][0][romDecisionDriver.menu_slot_for_party_id(obs["partyOrder"], i)] for i in range(3)]
                return w
            if len(wide) < driver.opened:
                wide.append(capture())
                reread = 4
            elif reread and any(m["species"] is None for side in wide[-1]["parties"] for m in side):
                # a party member was caught with its box half decrypted: take that member (only) from the next frames
                reread -= 1
                again = capture()["parties"]
                for side, fresh_side in zip(wide[-1]["parties"], again):
                    for i, m in enumerate(side):
                        if m["species"] is None and fresh_side[i]["species"] is not None:
                            side[i] = fresh_side[i]
        if buttons is None:
            break
        if len(frames) >= limit:
            stop = "frame-cap"
            break
        oracle.advance(buttons)
        frames.append(buttons)
        driver.advanced()
        cur = hp_row()
        if cur != row:
            timeline.append([len(frames), *cur])
            row = cur
    return {"stop": stop, "error": error, "frames": len(frames), "decisionsConsumed": driver.index, "decisionsTotal": len(decisions),
            "segments": romDecisionDriver.rle(frames), "anchors": driver.anchors, "timeline": timeline, "outcome": oracle.read_u8(sym["gBattleOutcome"]),
            "transitions": driver.trace, "lastObs": {k: v for k, v in obs.items() if k != "sig"},
            **({} if lab is None else {"wide": wide, "finalWide": wide_state(oracle, lab)})}


def main():
    out, mode, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    if out.exists():
        raise SystemExit(f"soundEventProbe: refusing stale output path (delete it first): {out}")
    frames_cap = int(rest[rest.index("--frames") + 1]) if "--frames" in rest else None
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1] if "--profile" in rest else "on"]
    fast = "--fast" in rest
    skip_to = int(rest[rest.index("--from") + 1]) if "--from" in rest else 0  # trace mode: frames before this run unlogged at full speed
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    syms = sorted((a, n) for n, a in oracle.symbols.items() if a)
    addrs = [a for a, _ in syms]
    hooks = [n for n in HOOKS + extra_hook_names(rest, os.environ) if oracle.symbols.get(n)]  # extra non-audio call-log hooks (e.g. BlendPalette)
    entry = {oracle.symbols[n] + 2: n for n in hooks}
    songs = load_defines(REF / "include/constants/songs.h", r"(?:SE|MUS)_")
    species = load_defines(REF / "include/constants/species.h", r"SPECIES_")
    cpu, core = oracle.core.cpu, oracle.core
    players = {oracle.symbols[f"gMPlayInfo_{n}"]: n for n in ("BGM", "SE1", "SE2", "SE3")}
    for i in range(2):
        players[oracle.symbols["gPokemonCryMusicPlayers"] + i * MPLAY_INFO_SIZE] = "cry"
    song_table = oracle.symbols["gSongTable"]
    header_to_song = {}
    for n in range(max(songs) + 1):
        header_to_song.setdefault(oracle.read_u32(song_table + n * 8), n)
    state = {"frame": 0, "log": True, "steps": 0, "fast": 0, "restepped": 0, "state_mismatch": 0}
    calls, events, pending, watch, mismatches = [], [], {}, {}, []

    def caller(lr):
        i = bisect.bisect_right(addrs, (lr & ~1) - 2) - 1
        return syms[i][1] if i >= 0 else None

    def on_hook(name):
        g = [int(cpu.gprs[i]) & 0xFFFFFFFF for i in range(4)]
        n_events = len(events)
        via = caller(g_lr())
        row = {"frame": state["frame"], "fn": name, "via": via, "r0": g[0], "r1": g[1]}
        if name not in HOOKS:
            row["r2"], row["r3"] = g[2], g[3]
        if name == "PlayCryInternal":
            sp = int(cpu.gprs[13]) & 0xFFFFFFFF
            m = oracle.read_u8(sp)
            ev = {"frame": row["frame"], "kind": "cry", "id": g[0], "name": species.get(g[0]),
                  "pan": s8(g[1]), "volume": s8(g[2]), "priority": g[3] & 0xFF,
                  "mode": CRY_MODES[m] if m < len(CRY_MODES) else m, "via": via}
            events.append(ev)
        elif name in ("PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"):
            pending["pan"] = s8(g[1])
        elif name == "m4aSongNumStart":
            kind = ("se" if via in SE_CALLERS else "bgm" if via in BGM_CALLERS else
                    "fanfare" if via in FANFARE_CALLERS else "direct")
            pan = pending.pop("pan", None) if via in {"PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"} else None
            events.append({"frame": row["frame"], "kind": kind, "id": g[0], "name": songs.get(g[0]), "pan": pan, "via": via})
        elif name == "SE12PanpotControl":
            events.append({"frame": row["frame"], "kind": "pan", "id": None, "name": None, "pan": s8(g[0]), "via": via})
        elif name == "m4aSongNumStop":
            events.append({"frame": row["frame"], "kind": "stop", "id": g[0], "name": songs.get(g[0]), "pan": None, "via": via})
        elif name.startswith("m4aMPlay"):
            player = players.get(g[0], f"0x{g[0]:08x}")
            song = header_to_song.get(oracle.read_u32(g[0]))
            ev = {"frame": row["frame"], "kind": None, "id": song, "name": songs.get(song), "pan": None, "player": player, "via": via}
            if name in FADE_HOOKS:
                ev.update(kind="fade", dir=FADE_HOOKS[name], speed=g[1] & 0xFFFF)
            elif name == "m4aMPlayVolumeControl":
                ev.update(kind="duck", tracks=g[1] & 0xFFFF, volume=g[2] & 0xFFFF)
            elif name == "m4aMPlayStop":
                ev["kind"] = "stop"
            else:
                ev["kind"] = "continue"
            # m4aSongNumStop's own m4aMPlayStop is already reported by its "stop" event
            if not (name == "m4aMPlayStop" and via == "m4aSongNumStop"):
                events.append(ev)
        calls.append(row)
        # classify the call: effective iff the m4a signature differs between entry and return (hybrid mode can only see those)
        ret = (g_lr() & ~1) + 2
        sig_before = signature(live_reader)
        watch.setdefault(ret, []).append((sig_before, [row, *events[n_events:]]))

    def on_return(ret):
        sig_after = signature(live_reader)
        for sig_before, targets in watch.pop(ret):
            if sig_before == sig_after:
                for t in targets:
                    t["noop"] = True

    def g_lr():
        return int(cpu.gprs[14]) & 0xFFFFFFFF

    native, gpr = core._core, cpu._native.gprs  # raw cffi handles: the wrapped core.step() / cpu.pc cost ~3x per instruction
    native_step, native_frame_counter = native.step, native.frameCounter

    def stepping_advance(buttons):
        oracle._set_buttons(list(buttons))
        start = native_frame_counter(native)
        state["frame"] += 1
        steps = 0
        while native_frame_counter(native) == start:
            if state["log"]:
                pc = gpr[15]
                name = entry.get(pc)
                if name:
                    on_hook(name)
                if pc in watch:
                    on_return(pc)
            native_step(native)
            steps += 1
        state["steps"] += steps
        oracle._screen_stale = False
        oracle.frame += 1

    def snapshot():
        return bytes(ffi.buffer(core.save_raw_state()))

    def blob_reader(blob):
        return lambda a, n: blob[SAVE_IWRAM + a - 0x3000000:SAVE_IWRAM + a - 0x3000000 + n]

    def live_reader(a, n):
        return bytes(core.memory.u8[a:a + n])

    def signature(iw):
        """Sound-relevant m4a RAM. Per track only the EXIST / START flag bits and the *X control fields (keyShiftX, pitX, volX,
        panX) that m4aMPlay{Pitch,Volume,Panpot}Control write; the score-driven fields (vol, pan, tune, wait, ...) change
        every few frames in any playing song and would defeat the fast path. Clocks are compared separately (a restart resets one)."""
        sig, clocks = [oracle.read_u32(oracle.symbols["gMPlay_PokemonCry"])], []
        for addr in players:
            info = iw(addr, MPLAY_INFO_SIZE)
            sig += [info[0:10], info[0x24:0x26], info[0x28:0x2A], info[0x2C:0x30]]
            clocks.append(int.from_bytes(info[0xC:0x10], "little"))
            tracks = int.from_bytes(info[0x2C:0x30], "little")
            if 0x3000000 <= tracks < 0x3008000 - MPLAY_TRACK_SIZE * 16:
                for t in range(min(info[8], 16)):
                    tr = iw(tracks + t * MPLAY_TRACK_SIZE, MPLAY_TRACK_SIZE)
                    sig.append(bytes((tr[0] & 0xC0, tr[0xB], tr[0xD], tr[0x13], tr[0x15])))
        sig.append(iw(oracle.symbols["gPokemonCrySongs"], 0x70))
        sig.append(iw(oracle.symbols["gPokemonCrySong"], 0x40))
        return sig, clocks

    def restarted_every_frame(pre_iw, post_iw):
        """A song started again on every frame (AnimTask_Rollout_Step's PlaySE12WithPanning(SE_M_HEADBUTT) on 10 frames in a
        row, battle_anim_rock.c:638-651) ends each frame in the same just-started state, so the signature cannot see it. A live
        track of an unpaused player always moves something in a frame (clock and the track's wait / cmdPtr on a tick, tempoC
        between ticks); a player whose clock, tempo counters and tracks did not change at all over a frame while a track still
        EXISTs was restarted on it."""
        for addr in players:
            info0, info1 = pre_iw(addr, MPLAY_INFO_SIZE), post_iw(addr, MPLAY_INFO_SIZE)
            # clock (0x0C) and tempoD / tempoU / tempoI / tempoC (0x1C-0x23); MUSICPLAYER_STATUS_PAUSE in status (0x04)
            if info0[0xC:0x10] != info1[0xC:0x10] or info0[0x1C:0x24] != info1[0x1C:0x24] or int.from_bytes(info1[4:8], "little") & 0x80000000:
                continue
            tracks = int.from_bytes(info1[0x2C:0x30], "little")
            if not 0x3000000 <= tracks < 0x3008000 - MPLAY_TRACK_SIZE * 16:
                continue
            n = min(info1[8], 16) * MPLAY_TRACK_SIZE
            t0, t1 = pre_iw(tracks, n), post_iw(tracks, n)
            if t0 == t1 and any(t1[i] & 0x80 for i in range(0, n, MPLAY_TRACK_SIZE)):  # MPT_FLG_EXIST
                return True
        return False

    def hybrid_advance(buttons):
        oracle._set_buttons(list(buttons))
        pre = snapshot()
        sig0, clk0 = signature(blob_reader(pre))
        core.run_frame()
        post = snapshot()
        sig1, clk1 = signature(blob_reader(post))
        if (sig0 == sig1 and all(b >= a for a, b in zip(clk0, clk1))
                and not restarted_every_frame(blob_reader(pre), blob_reader(post))):
            state["frame"] += 1
            state["fast"] += 1
            oracle._screen_stale = False
            oracle.frame += 1
            return
        core.load_raw_state(pre)
        stepping_advance(buttons)
        state["restepped"] += 1
        stepped = snapshot()
        if stepped[STATE_HEADER:] != post[STATE_HEADER:]:
            state["state_mismatch"] += 1
            diff = [i for i in range(STATE_HEADER, len(post)) if stepped[i] != post[i]]
            iw_base = SAVE_IWRAM - 0x3000000
            step_pc, step_sp = gpr[15], gpr[13]
            core.load_raw_state(post)
            fast_pc, fast_sp = gpr[15], gpr[13]
            caught = 0  # run_frame can end 1-2 instructions off the stepping loop's boundary; step it to the same pc/sp and re-diff
            while (gpr[15], gpr[13]) != (step_pc, step_sp) and caught < 16:
                native_step(native)
                caught += 1
            residual = [i for i in range(STATE_HEADER, len(post)) if snapshot()[i] != stepped[i]] if caught < 16 else None
            core.load_raw_state(stepped)
            mismatches.append({"frame": state["frame"], "bytes": len(diff), "first": hex(diff[0]), "last": hex(diff[-1]),
                               "addrs": [hex(i - iw_base) for i in diff[:32]], "stepped": [stepped[i] for i in diff[:32]],
                               "fast": [post[i] for i in diff[:32]], "stepped_pc": hex(step_pc), "stepped_sp": hex(step_sp), "fast_pc": hex(fast_pc), "fast_sp": hex(fast_sp),
                               "catchup_steps": caught, "residual_bytes_after_catchup": None if residual is None else len(residual)})

    replay_trace = None
    def run_drive(oracle, path, cap):
        return drive_lab(oracle, romDecisionDriver.resolve_funcs(REF), romDecisionDriver.load_decisions(path), cap, lab)

    drive_path = rest[rest.index("--drive") + 1] if "--drive" in rest else None
    drive_out = Path(rest[rest.index("--drive-out") + 1]) if "--drive-out" in rest else None
    if drive_path is not None and mode != "lab":
        raise SystemExit("soundEventProbe: --drive needs lab mode")
    t0 = time.time()
    if fast:
        advance = hybrid_advance
    else:
        advance = stepping_advance
    if mode == "draft":
        oracle.new_session()
        script = [([], 20), (["RIGHT"], 2), ([], 20), (["A"], 2), ([], 40), (["B"], 2), ([], 30)]
        segments = [{"frames": n, "buttons": b} for b, n in script]
        label = "draft: 20 idle, RIGHT x2, 20 idle, A x2, 40 idle, B x2, 30 idle (canonical Battle Factory draft anchor)"
    elif mode == "seventh-win":
        # The staged Factory seventh-win Lobby terminal (tools/probe/stage-factory-seventh-win-timeline-off.py): the stage
        # script's own prefix replay, staging writes and release schedule, with the sound hooks logging from its tick 1.
        import importlib.util
        stage_path = ROOT / "tools/probe/stage-factory-seventh-win-timeline-off.py"
        saved_argv = sys.argv
        sys.argv = [str(stage_path), str(out)]
        spec = importlib.util.spec_from_file_location("stage_seventh_win", stage_path)
        stage = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(stage)
        sys.argv = saved_argv
        record_a = "--record-a" in rest  # also press A on the record menu's first accepted frame (default NO)
        state["log"] = False
        stage.replay_and_stage(oracle, json.loads(stage.PREFIX_PATH.read_text()))
        state["log"] = True
        state["frame"] = 0
        schedule = {**stage.INPUTS_TO_READY_MENU, **({stage.MENU_ACCEPT: ["A"]} if record_a else {})}
        end = stage.FINAL_FRAME if record_a else stage.MENU_ACCEPT
        segments, last = [], 0
        for tick in sorted(schedule):
            if tick - last - 1 > 0:
                segments.append({"frames": tick - last - 1, "buttons": []})
            segments.append({"frames": 1, "buttons": schedule[tick]})
            last = tick
        segments.append({"frames": end - last, "buttons": []})
        label = "seventh-win stage (staged Factory Lobby WonChallenge, Scene OFF): A releases at " + ", ".join(map(str, sorted(schedule)))
    elif mode == "trace":
        oracle.new_session()
        segments = json.loads(Path(rest[0]).read_text())["segments"]
        label = f"trace {Path(rest[0]).name}" + (f" from frame {skip_to}" if skip_to else "")
    else:
        request = json.loads(Path(rest[0]).read_text())
        request["profile"] = profile  # one request file serves both scenes; only the profile field differs
        # parity-mac fourth pass: `replay` (the test player's name and the census seed) is the replay tool's own note; the lab does not know the key.
        replay_note = request.pop("replay", None)
        request = validate_request(request, profile)
        label = f"lab {Path(rest[0]).name}"
        lab = BattleLab(oracle, profile)
        if "--log-setup" in rest:
            oracle.advance = advance
        else:
            state["log"] = False
        descriptor = lab.prepare(request)
        state["log"] = True
        state["frame"] = 0
        segments = request["trace"]["segments"]
        replay_trace = lab_replay_trace(rest[0], profile, segments)
        if "--setup-out" in rest:  # aud243b: the action-menu state (RNG, both parties) of this lab staging, for the engine side of a ROM replay
            Path(rest[rest.index("--setup-out") + 1]).write_text(json.dumps(
                {"descriptor": {k: v for k, v in descriptor.items() if k != "preCheckpointCaptures"}, "snapshot": lab.snapshot(),
                 # aud243c: the opponent's turn-1 decision is already made at the menu (gRngValue is post-AI); the replay aligns on gRandomTurnNumber instead.
                 "randomTurnNumber": oracle.read_u16(oracle.symbols["gRandomTurnNumber"]),
                 "opponentReply": [oracle.read_u8(oracle.symbols["gBattleBufferB"] + 0x200 + i) for i in range(4)],
                 # parity-mac: AI_THINKING_STRUCT->simulatedRNG (gBattleResources->ai, +0x18): the four `100 - Random() % 16` of BattleAI_SetupAIData
                 # (battle_ai_script_commands.c:340-341). They pin where the opponent's pre-menu draws sit in the RNG stream (soundCensusRomReplay replay).
                 "opponentAiSimulatedRng": [oracle.read_u8(oracle.read_u32(oracle.read_u32(oracle.symbols["gBattleResources"]) + 0x14) + 0x18 + i) for i in range(4)],
                 # parity-mac: gLastMoves of both battlers; [0, 0] only before the first turn (the replay refuses a staging that already played one)
                 "lastMoves": [oracle.read_u16(oracle.symbols["gLastMoves"] + 2 * i) for i in range(2)]},
                separators=(",", ":")))
    drive_result = None
    if drive_path is not None:
        drive_result = run_drive(oracle, drive_path, frames_cap)
        segments = []
        replay_trace["segments"] = drive_result["segments"]
        if drive_out is not None:
            # parity-mac: the validated request of a factoryBrain staging carries the fields the lab filled in itself (battleNum 6, trainerId 1022, opponentSetIds []),
            # and validate_request refuses them on input: drop them so the frozen request can be staged again (romStateTimeline.py).
            frozen = {k: v for k, v in request.items() if not (request["mode"] == "factoryBrain" and k in ("battleNum", "trainerId", "opponentSetIds"))}
            drive_out.write_text(json.dumps({**frozen, **({} if replay_note is None else {"replay": replay_note}),
                                             "trace": {"segments": drive_result["segments"], "captureFrames": [0]}}, indent=1))
    t_window = time.time()
    done = 0
    for seg in segments:
        for _ in range(seg["frames"]):
            if frames_cap is not None and done >= skip_to + frames_cap:
                break
            if done < skip_to:
                oracle.advance(seg.get("buttons", []))
                state["frame"] += 1
            else:
                advance(seg.get("buttons", []))
            done += 1
    if fast:  # the fast path cannot see no-op calls; a no-op that shares a re-stepped frame is dropped too, so the log is "effective rows only"
        events, calls = [e for e in events if not e.get("noop")], [c for c in calls if not c.get("noop")]
    result = {
        "schema": "audio-sound-events/v1", "window": label, "profile": profile, "frames": done - skip_to,
        "hooks": {n: f"0x{oracle.symbols[n]:08x}" for n in hooks}, "mode": "hybrid" if fast else "step",
        "steps": state["steps"], "hybrid": {**{k: state[k] for k in ("fast", "restepped", "state_mismatch")}, "mismatches": mismatches},
        "seconds": round(time.time() - t0, 1), "windowSeconds": round(time.time() - t_window, 1),
        "events": events, "calls": calls,
    }
    if replay_trace is not None:
        result["trace"] = replay_trace
    if drive_result is not None:
        result["drive"] = drive_result
    out.write_text(json.dumps(result, separators=(",", ":")) + "\n" if "--compact" in rest else json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
