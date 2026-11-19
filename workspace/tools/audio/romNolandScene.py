"""Noland's battle-room scenes on the real ROM, frame by frame (docs/parity-mac/noland-room-scenes.md).

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romNolandScene.py OUT.json --challenge 2|5 [--symbols 0|1|2] [--heard S,G]
      [--profile off|on] [--seed N] [--win] [--gate-k K] [--no-sound] [--frames CAP] [--epilogue-frames N]

The lab stages the walk-up to Noland (oracle/battle_lab.py `factoryBrain` + `walkup`: the checkpoint is the open GO ON / RECORD / REST / RETIRE
menu before the Factory Head, challenge 2 = silver, 5 = gold). This tool adds the save's record the lab does not stage: the Factory symbols
(--symbols: 1 = silver, 2 = silver + gold; the lab itself sets silver for challenge 5) and the heard-speech bits (--heard S,G, battledBrainFlags).
From the checkpoint the ROM plays the scene to the battle's first action menu: GO ON, "swap before the Head?" (NO), the walk, the room, Noland's
lines, the transition, the battle start. --win then ends the battle as a win (gBattleOutcome = B_OUTCOME_WON at the first action menu, then FIGHT and
the first move: the turn ends straight into HandleEndTurn_BattleWon, the game's own win script) and records what follows: the room after the battle,
Noland's symbol scene when the symbol is new, the warp to the Lobby, the Lobby's won-challenge text, for --epilogue-frames frames past the
Lobby's first frame.

Every frame (1-based: frame k = after the k-th advance; frame 0 = the checkpoint):
  sha     the first 16 hex digits of sha256 of the RGB888 framebuffer (the oracle's frame hash),
  rng     gRngValue after the frame (draws = LCG distance from the frame before),
  press   the buttons held during the frame,
  gate    [A, B]: would a press of A (B) for this one frame change the screen within K frames (fork test from the state before the frame)?
  sounds  the m4a calls of the frame (stepping hooks, soundEventProbe.py's decoding; only effective calls),
  where   the script position (the label the script pointer sits in) and the main callback.
The drive presses at the first frame a press ADVANCES the game (the script context, the text printer's state, the live tasks or the main callback
differ two frames later than without it): A everywhere except the swap prompt's YES/NO, which is answered B (NO).
"""
import bisect, hashlib, json, os, subprocess, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import soundEventProbe as sep  # noqa: E402  (EmeraldOracle, BattleLab, validate_request, REF, HARNESS, PROFILES, load_defines, s8)
import romDecisionDriver  # noqa: E402
import battle_lab  # noqa: E402
from mgba import ffi  # noqa: E402

SB2_BATTLED_BRAIN_FLAGS, HEARD_SILVER_BIT, HEARD_GOLD_BIT = 0xD00, 1 << 8, 1 << 9
FLAG_SYS_FACTORY_GOLD = 0x8CD
STATICS = ("sGlobalScriptContext", "sGlobalScriptContextStatus", "sTextPrinters", "sFieldMessageBoxMode", "WaitForAorBPress",
           "Task_HandleYesNoInput", "Task_HandleMultichoiceInput", "Task_DrawFieldMessage", "WaitForMovementFinish")
TASK_SIZE, TASK_COUNT = 40, 16
TEXT_PRINTER_SIZE = 0x24  # struct TextPrinter (text.h): template 0x10, callback, subStruct[7], active (+0x1B), state (+0x1C), textSpeed, delayCounter
B_OUTCOME_WON = 1
SAVE_IWRAM, STATE_HEADER, MPLAY_INFO_SIZE, MPLAY_TRACK_SIZE = 0x19000, 0x400, 0x40, 0x50


def nm_symbols():
    text = subprocess.run(["nm", str(sep.REF / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    return romDecisionDriver.parse_nm(text)


class Scene:
    def __init__(self, oracle, gate_k, sound, rng_window=(1, 0)):
        self.o, self.sym, self.k = oracle, oracle.symbols, gate_k
        nm = nm_symbols()
        self.st = {}
        for name in STATICS:
            addrs = nm.get(name, [])
            if len(addrs) != 1:
                raise SystemExit(f"romNolandScene: cannot resolve {name}: {addrs}")
            self.st[name] = addrs[0] & ~1
        # script labels for the `where` column: every data label of the three Factory maps' scripts and the std scripts
        labels = sorted((a & ~1, n) for n, v in nm.items() for a in v
                        if n.startswith(("BattleFrontier_BattleFactory", "BattleFrontier_EventScript", "Std_", "Common_EventScript", "EventScript_")))
        self.label_addrs, self.label_names = [a for a, _ in labels], [n for _, n in labels]
        self.funcs = {}
        for n, v in nm.items():
            for a in v:
                self.funcs.setdefault(a & ~1, n)
        self.core, self.cpu = oracle.core, oracle.core.cpu
        self.native = self.core._core
        self.sound = sound
        self.events = []
        self.rng_callers = []
        self.rng_window = rng_window
        self.frame = 0
        if sound:
            self._setup_hooks()

    # -- RAM ------------------------------------------------------------------
    def u8(self, a): return self.o.read_u8(a)
    def u16(self, a): return self.o.read_u16(a)
    def u32(self, a): return self.o.read_u32(a)

    def save2(self):
        return self.u32(self.sym["gSaveBlock2Ptr"])

    def cb2(self):
        return self.u32(self.sym["gMain"] + 4) & ~1

    def tasks(self):
        base = self.sym["gTasks"]
        return tuple((self.u32(base + i * TASK_SIZE) & ~1) for i in range(TASK_COUNT) if self.u8(base + i * TASK_SIZE + 4))

    def ctx(self):
        c = self.st["sGlobalScriptContext"]
        depth = min(self.u8(c), 20)
        return (self.u8(self.st["sGlobalScriptContextStatus"]), self.u8(c + 1), self.u32(c + 4) & ~1, self.u32(c + 8), depth,
                tuple(self.u32(c + 0x0C + 4 * i) for i in range(depth)))

    def printer(self):
        p = self.st["sTextPrinters"]
        return (self.u8(p + 0x1B), self.u8(p + 0x1C))

    def printer_row(self):
        """sTextPrinters[0]: active, state, currentChar, currentX, currentY, scrollDistance, the down-arrow byte (delay:5, yPosIdx:2)."""
        p = self.st["sTextPrinters"]
        return [self.u8(p + 0x1B), self.u8(p + 0x1C), self.u32(p), self.u8(p + 8), self.u8(p + 9), self.u8(p + 0x1F), self.u8(p + 0x15)]

    def advance_sig(self):
        s = self.sym
        battle = (self.u32(s["gBattlerControllerFuncs"]), self.u32(s["gBattlerControllerFuncs"] + 4), self.u32(s["gBattleMainFunc"]),
                  self.u32(s["gBattlescriptCurrInstr"]), self.u32(s["gBattleControllerExecFlags"]))
        return (self.ctx(), self.printer(), self.tasks(), self.cb2(), self.u8(self.st["sFieldMessageBoxMode"]), battle)

    def action_menu_ready(self):
        s = self.sym
        return (self.cb2() == s["BattleMainCB2"] and self.u8(s["gBattlersCount"]) == 2 and self.u8(s["gBattleBufferA"]) == 18
                and self.u32(s["gBattleControllerExecFlags"]) == 1)

    def where(self):
        ptr = self.ctx()[3]
        i = bisect.bisect_right(self.label_addrs, ptr) - 1
        return self.label_names[i] if i >= 0 else hex(ptr)

    def sha(self):
        return hashlib.sha256(self.o.screen_rgb()).hexdigest()[:16]

    def snapshot(self):
        return bytes(ffi.buffer(self.core.save_raw_state()))

    def restore(self, blob):
        self.core.load_raw_state(blob)

    def fast(self, buttons):
        self.o._set_buttons(list(buttons))
        self.core.run_frame()
        self.o._screen_stale = False

    # -- fork tests -------------------------------------------------------------
    def gates(self):
        """[A, B] screen effect within K frames, and [A, B] advance (game state two frames on) of a one-frame press now."""
        pre = self.snapshot()
        out = {}
        base_sig, base_sha = None, None
        for press in ((), ("A",), ("B",)):
            self.fast(press)
            self.fast(())
            sig = self.advance_sig()
            for _ in range(self.k - 2):
                self.fast(())
            sha = self.sha()
            self.restore(pre)
            if not press:
                base_sig, base_sha = sig, sha
            else:
                out[press[0]] = (sha != base_sha, sig != base_sig)
        return [out["A"][0], out["B"][0]], [out["A"][1], out["B"][1]]

    # -- sound hooks (soundEventProbe.py's stepping decode) ---------------------
    def _setup_hooks(self):
        o = self.o
        hooks = [n for n in sep.HOOKS if o.symbols.get(n)]
        self.entry = {o.symbols[n] + 2: n for n in hooks}
        if self.rng_window[1] >= self.rng_window[0]:
            self.entry[o.symbols["Random"] + 2] = "Random"
            for n in os.environ.get("NOLAND_CALL_HOOKS", "").split(","):
                if n and o.symbols.get(n):
                    self.entry[o.symbols[n] + 2] = "call:" + n
        self.songs = sep.load_defines(sep.REF / "include/constants/songs.h", r"(?:SE|MUS)_")
        self.species = sep.load_defines(sep.REF / "include/constants/species.h", r"SPECIES_")
        self.players = {o.symbols[f"gMPlayInfo_{n}"]: n for n in ("BGM", "SE1", "SE2", "SE3")}
        for i in range(2):
            self.players[o.symbols["gPokemonCryMusicPlayers"] + i * MPLAY_INFO_SIZE] = "cry"
        table = o.symbols["gSongTable"]
        self.header_to_song = {}
        for n in range(max(self.songs) + 1):
            self.header_to_song.setdefault(o.read_u32(table + n * 8), n)
        syms = sorted((a, n) for n, a in o.symbols.items() if a)
        self.sym_addrs, self.sym_names = [a for a, _ in syms], [n for _, n in syms]
        self.watch, self.pending = {}, {}
        self.gpr = self.cpu._native.gprs

    def _caller(self, lr):
        i = bisect.bisect_right(self.sym_addrs, (lr & ~1) - 2) - 1
        return self.sym_names[i] if i >= 0 else None

    def _signature(self):
        o, mem = self.o, self.core.memory
        iw = lambda a, n: bytes(mem.u8[a:a + n])  # noqa: E731
        sig = [o.read_u32(o.symbols["gMPlay_PokemonCry"])]
        for addr in self.players:
            info = iw(addr, MPLAY_INFO_SIZE)
            sig += [info[0:10], info[0x24:0x26], info[0x28:0x2A], info[0x2C:0x30]]
            tracks = int.from_bytes(info[0x2C:0x30], "little")
            if 0x3000000 <= tracks < 0x3008000 - MPLAY_TRACK_SIZE * 16:
                for t in range(min(info[8], 16)):
                    tr = iw(tracks + t * MPLAY_TRACK_SIZE, MPLAY_TRACK_SIZE)
                    sig.append(bytes((tr[0] & 0xC0, tr[0xB], tr[0xD], tr[0x13], tr[0x15])))
        sig.append(iw(o.symbols["gPokemonCrySongs"], 0x70))
        sig.append(iw(o.symbols["gPokemonCrySong"], 0x40))
        return sig

    def _on_hook(self, name):
        if name.startswith("call:"):
            if self.rng_window[0] <= self.frame <= self.rng_window[1]:
                self.rng_callers.append((self.frame, name))
            return
        if name == "Random":
            if self.rng_window[0] <= self.frame <= self.rng_window[1]:
                lr = int(self.gpr[14]) & 0xFFFFFFFF
                self.rng_callers.append((self.frame, self._caller(lr)))
            return
        g = [int(self.gpr[i]) & 0xFFFFFFFF for i in range(4)]
        lr = int(self.gpr[14]) & 0xFFFFFFFF
        via = self._caller(lr)
        n_before = len(self.events)
        f = self.frame
        if name == "PlayCryInternal":
            m = self.o.read_u8(int(self.gpr[13]) & 0xFFFFFFFF)
            self.events.append({"frame": f, "kind": "cry", "id": g[0], "name": self.species.get(g[0]), "pan": sep.s8(g[1]), "volume": sep.s8(g[2]),
                                "priority": g[3] & 0xFF, "mode": sep.CRY_MODES[m] if m < len(sep.CRY_MODES) else m, "via": via})
        elif name in ("PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"):
            self.pending["pan"] = sep.s8(g[1])
        elif name == "m4aSongNumStart":
            kind = ("se" if via in sep.SE_CALLERS else "bgm" if via in sep.BGM_CALLERS else "fanfare" if via in sep.FANFARE_CALLERS else "direct")
            pan = self.pending.pop("pan", None) if via in {"PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"} else None
            self.events.append({"frame": f, "kind": kind, "id": g[0], "name": self.songs.get(g[0]), "pan": pan, "via": via})
        elif name == "SE12PanpotControl":
            self.events.append({"frame": f, "kind": "pan", "id": None, "name": None, "pan": sep.s8(g[0]), "via": via})
        elif name == "m4aSongNumStop":
            self.events.append({"frame": f, "kind": "stop", "id": g[0], "name": self.songs.get(g[0]), "pan": None, "via": via})
        elif name.startswith("m4aMPlay"):
            player = self.players.get(g[0], f"0x{g[0]:08x}")
            song = self.header_to_song.get(self.o.read_u32(g[0]))
            ev = {"frame": f, "kind": None, "id": song, "name": self.songs.get(song), "pan": None, "player": player, "via": via}
            if name in sep.FADE_HOOKS:
                ev.update(kind="fade", dir=sep.FADE_HOOKS[name], speed=g[1] & 0xFFFF)
            elif name == "m4aMPlayVolumeControl":
                ev.update(kind="duck", tracks=g[1] & 0xFFFF, volume=g[2] & 0xFFFF)
            elif name == "m4aMPlayStop":
                ev["kind"] = "stop"
            else:
                ev["kind"] = "continue"
            if not (name == "m4aMPlayStop" and via == "m4aSongNumStop"):
                self.events.append(ev)
        ret = (lr & ~1) + 2
        self.watch.setdefault(ret, []).append((self._signature(), self.events[n_before:]))

    def _on_return(self, ret):
        after = self._signature()
        for before, targets in self.watch.pop(ret):
            if before == after:
                for t in targets:
                    t["noop"] = True

    def step(self, buttons):
        """One frame of the recorded drive: instruction stepping with the sound hooks, or run_frame without them."""
        self.frame += 1
        if not self.sound:
            self.fast(buttons)
            self.o.frame += 1
            return
        self.o._set_buttons(list(buttons))
        native, gpr = self.native, self.gpr
        start = native.frameCounter(native)
        step = native.step
        entry, watch = self.entry, self.watch
        while native.frameCounter(native) == start:
            pc = gpr[15]
            name = entry.get(pc)
            if name:
                self._on_hook(name)
            if pc in watch:
                self._on_return(pc)
            step(native)
        self.o._screen_stale = False
        self.o.frame += 1


def lcg(x):
    return (x * 0x41C64E6D + 0x6073) & 0xFFFFFFFF


def lcg_distance(a, b, limit=20000):
    for n in range(limit + 1):
        if a == b:
            return n
        a = lcg(a)
    return None


def main():
    out, rest = Path(sys.argv[1]), sys.argv[2:]
    if out.exists():
        raise SystemExit(f"romNolandScene: refusing stale output path (delete it first): {out}")
    opt = lambda name, default=None: rest[rest.index(name) + 1] if name in rest else default  # noqa: E731
    challenge = int(opt("--challenge"))
    symbols = int(opt("--symbols", "0"))
    heard = None if opt("--heard") in (None, "") else [int(x) for x in opt("--heard").split(",")]
    scene = opt("--profile", "off")
    seed = int(opt("--seed", "305419896"))
    # the draft's three sets (the lab's rental ranges are per challenge: 267-269 fit challenge 2, 564-566 challenge 5)
    player_sets = [int(x) for x in opt("--sets", "564,565,566" if challenge >= 5 else "267,268,269").split(",")]
    win = "--win" in rest
    gate_k = int(opt("--gate-k", "6"))
    cap = int(opt("--frames", "20000"))
    epilogue = int(opt("--epilogue-frames", "600"))
    sound = "--no-sound" not in rest
    press_delay = int(opt("--press-delay", "0"))
    press_from = int(opt("--press-from", "0"))
    press_button = opt("--press-button", "A")
    yesno_b = "--yesno-b" in rest
    dump_dir = opt("--dump")
    dump_from, dump_to = int(opt("--dump-from", "0")), int(opt("--dump-to", "0"))
    if dump_dir:
        Path(dump_dir).mkdir(parents=True, exist_ok=True)
    profile, bootstrap = sep.PROFILES[scene]
    oracle = sep.EmeraldOracle(sep.REF / "pokeemerald.gba", sep.REF / "pokeemerald.map", sep.HARNESS / "oracle/bootstrap" / bootstrap)
    request = sep.validate_request({"schemaVersion": 1, "mode": "factoryBrain", "profile": profile, "level": 50, "challengeNum": challenge, "walkup": True,
                                    "playerSetIds": player_sets, "rentalSwapCount": 0, "seed": seed,
                                    "trace": {"segments": [{"frames": 1, "buttons": []}], "captureFrames": [0]}}, profile)
    t0 = time.time()
    lab = sep.BattleLab(oracle, profile)
    lab.prepare(request)
    s2 = oracle.read_u32(oracle.symbols["gSaveBlock2Ptr"])
    if symbols >= 1:
        lab._set_factory_symbol_flag(battle_lab.FLAG_SYS_FACTORY_SILVER)
    if symbols >= 2:
        lab._set_factory_symbol_flag(FLAG_SYS_FACTORY_GOLD)
    if heard is not None:
        flags = oracle.read_u16(s2 + SB2_BATTLED_BRAIN_FLAGS) & ~(HEARD_SILVER_BIT | HEARD_GOLD_BIT)
        flags |= (HEARD_SILVER_BIT if heard[0] else 0) | (HEARD_GOLD_BIT if heard[1] else 0)
        oracle.write_u16(s2 + SB2_BATTLED_BRAIN_FLAGS, flags)
    rw = opt("--rng-callers")
    sc = Scene(oracle, gate_k, sound, tuple(int(x) for x in rw.split("-")) if rw else (1, 0))
    flags_now = oracle.read_u16(s2 + SB2_BATTLED_BRAIN_FLAGS)
    record = {"symbols": lab._factory_symbol_count(), "heardBrainSpeech": {"silver": int(bool(flags_now & HEARD_SILVER_BIT)), "gold": int(bool(flags_now & HEARD_GOLD_BIT))}}
    funcs = sc.funcs
    rows = []
    rng0 = oracle.read_u32(oracle.symbols["gRngValue"])
    rows.append({"f": 0, "sha": sc.sha(), "rng": rng0, "where": sc.where(), "cb2": funcs.get(sc.cb2())})
    phase, battle_seen, lobby_first, presses, menu_frame = "room", False, None, [], None
    stop = None
    rng_prev = rng0
    won_staged = False
    yesno_moved = False
    last_tp = None
    ready_since = None
    battle_menu_presses = 0
    while True:
        if sc.frame >= cap:
            stop = "frame-cap"
            break
        cb2 = sc.cb2()
        in_battle = cb2 == oracle.symbols["BattleMainCB2"]
        if in_battle:
            battle_seen = True
        live = sc.tasks()
        action_menu = sc.action_menu_ready()
        if action_menu and menu_frame is None:
            menu_frame = sc.frame
            if not win:
                stop = "action-menu"
                break
        battle_pulse = won_staged and in_battle
        gate_eff, gate_adv = sc.gates() if not battle_pulse else ([None, None], [None, None])
        buttons = []
        if not battle_pulse:
            yesno = sc.st["Task_HandleYesNoInput"] in live and not in_battle
            if not yesno:
                yesno_moved = False
            # the swap prompt: NO as DOWN then A (the cursor starts on YES); every other wait: A
            # --press-delay N: press N frames after the first frame a press would be taken (a slower player); --press-from F: only from frame F on
            if gate_adv[0] and ready_since is None:
                ready_since = sc.frame
            if gate_adv[0] and ready_since is not None and sc.frame - ready_since >= (press_delay if sc.frame >= press_from else 0):
                if yesno and yesno_b:
                    buttons = ["B"]  # --yesno-b: B on the YES/NO is NO (Task_HandleYesNoInput MENU_B_PRESSED)
                else:
                    buttons = ["DOWN"] if yesno and not yesno_moved else [press_button if sc.frame >= press_from else "A"]
                if yesno and not yesno_moved:
                    yesno_moved = True
            if not gate_adv[0]:
                ready_since = None
        if win:
            if action_menu and not won_staged:
                oracle.write_u8(oracle.symbols["gBattleOutcome"], B_OUTCOME_WON)
                won_staged = True
            # FIGHT, the first move, then the win script's text: one press every 16 frames
            if won_staged and in_battle and (sc.frame - menu_frame) % 16 == 0:
                buttons = ["A"]
                battle_menu_presses += 1
        if battle_seen and not in_battle and win and cb2 == oracle.symbols["CB2_Overworld"] and phase == "room":
            phase = "after-battle"
        if phase == "after-battle" and lobby_first is None and "Lobby" in (sc.where() or ""):
            lobby_first = sc.frame
        if lobby_first is not None and sc.frame - lobby_first >= epilogue:
            stop = "epilogue"
            break
        n_events = len(sc.events)
        sc.step(buttons)
        if buttons:
            presses.append([sc.frame, buttons[0], sc.where() if not in_battle else funcs.get(oracle.read_u32(oracle.symbols["gBattleMainFunc"]) & ~1)])
        rng = oracle.read_u32(oracle.symbols["gRngValue"])
        row = {"f": sc.frame, "sha": sc.sha(), "rng": rng, "draws": lcg_distance(rng_prev, rng)}
        if dump_dir and dump_from <= sc.frame <= dump_to:
            Path(dump_dir, f"r{sc.frame}.rgb").write_bytes(oracle.screen_rgb())
        rng_prev = rng
        if buttons:
            row["press"] = buttons
        if gate_eff[0] is not None:
            row["gate"] = [int(gate_eff[0]), int(gate_eff[1])]
            row["adv"] = [int(gate_adv[0]), int(gate_adv[1])]
        tp = sc.printer_row()
        if tp != last_tp:
            row["tp"] = tp
            last_tp = tp
        evs = [e for e in sc.events[n_events:] if not e.get("noop")]
        if evs:
            row["sounds"] = evs
        w = sc.where()
        if w != (rows[-1].get("whereAt") or rows[-1].get("where")):
            row["where"] = w
        c = funcs.get(sc.cb2())
        if c != rows[-1].get("cb2Now", rows[-1].get("cb2")):
            row["cb2"] = c
        rows.append(row)
        # carry the last where / cb2 forward for the change detection without writing them on every row
        row["whereAt"], row["cb2Now"] = w, c
    for r in rows:
        r.pop("whereAt", None)
        r.pop("cb2Now", None)
    s2 = oracle.read_u32(oracle.symbols["gSaveBlock2Ptr"])
    flags_end = oracle.read_u16(s2 + SB2_BATTLED_BRAIN_FLAGS)
    result = {"schema": "rom-noland-scene/v1", "playerSetIds": player_sets, "pressDelay": press_delay, "pressFrom": press_from, "pressButton": press_button, "challenge": challenge, "scene": scene, "seed": seed, "gateK": gate_k, "sound": sound, "win": win,
              "recordStart": record, "recordEnd": {"symbols": lab._factory_symbol_count(),
                                                   "heardBrainSpeech": {"silver": int(bool(flags_end & HEARD_SILVER_BIT)), "gold": int(bool(flags_end & HEARD_GOLD_BIT))}},
              "rngStart": rng0, "actionMenuFrame": menu_frame, "lobbyFirstFrame": lobby_first, "stop": stop, "presses": presses,
              "frames": rows, "seconds": round(time.time() - t0, 1)}
    if sc.rng_callers:
        from collections import Counter
        result["rngCallers"] = [[f, c, n] for (f, c), n in sorted(Counter(sc.rng_callers).items())]
    out.write_text(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
