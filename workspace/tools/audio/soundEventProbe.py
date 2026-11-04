"""Log every sound the ROM starts in a short window as (frame, kind, id, pan/mode).

Read-only dev probe (docs/s11-audio-design.md). The libmgba-py binding exposes no
debugger, so "breakpoints" are a single-step loop that compares the Thumb PC with
function entries (PC == symbol + 2 is the first instruction, r0..r3 still hold
the arguments) -- the same technique as tools/probe/trace-factory-construction-rng.py.

  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json draft [--frames N] [--profile on|off] [--fast]
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json lab REQUEST.json [--frames N] [--log-setup] [--profile on|off] [--fast]
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json trace TRACE.json [--from N] [--frames N] [--profile on|off] [--fast]

`frame` is 1-based: an event during the k-th advance is reported at frame k, the
first frame whose capture can show its effect. `lab` replays a battle-lab request
(mechanicLab / factoryLegal) and logs only its trace window unless --log-setup.
--profile selects the Scene ON (default) or Scene OFF oracle bootstrap.
--fast is the hybrid mode: frames run at full speed and a frame is re-stepped (from the
saved pre-frame state) only when the m4a RAM signature changed during it. Plain stepping
is the reference; tools/audio/compareProbe.py proves a hybrid log equal to a stepping log.
"""
import bisect, json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402
from mgba import ffi  # noqa: E402

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


def main():
    out, mode, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    frames_cap = int(rest[rest.index("--frames") + 1]) if "--frames" in rest else None
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1] if "--profile" in rest else "on"]
    fast = "--fast" in rest
    skip_to = int(rest[rest.index("--from") + 1]) if "--from" in rest else 0  # trace mode: frames before this run unlogged at full speed
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    syms = sorted((a, n) for n, a in oracle.symbols.items() if a)
    addrs = [a for a, _ in syms]
    hooks = [n for n in HOOKS if oracle.symbols.get(n)]
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

    def hybrid_advance(buttons):
        oracle._set_buttons(list(buttons))
        pre = snapshot()
        sig0, clk0 = signature(blob_reader(pre))
        core.run_frame()
        post = snapshot()
        sig1, clk1 = signature(blob_reader(post))
        if sig0 == sig1 and all(b >= a for a, b in zip(clk0, clk1)):
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
        request = validate_request(request, profile)
        label = f"lab {Path(rest[0]).name}"
        lab = BattleLab(oracle, profile)
        if "--log-setup" in rest:
            oracle.advance = advance
        else:
            state["log"] = False
        lab.prepare(request)
        state["log"] = True
        state["frame"] = 0
        segments = request["trace"]["segments"]
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
    out.write_text(json.dumps({
        "schema": "audio-sound-events/v1", "window": label, "profile": profile, "frames": done - skip_to,
        "hooks": {n: f"0x{oracle.symbols[n]:08x}" for n in hooks}, "mode": "hybrid" if fast else "step",
        "steps": state["steps"], "hybrid": {**{k: state[k] for k in ("fast", "restepped", "state_mismatch")}, "mismatches": mismatches},
        "seconds": round(time.time() - t0, 1), "windowSeconds": round(time.time() - t_window, 1),
        "events": events, "calls": calls,
    }, indent=1))


main()
