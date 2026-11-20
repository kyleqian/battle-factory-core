"""Frame catcher, ROM side (tools/frame-catcher/README.md): plays on the real ROM the round an engine run played, and records every frame.

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUTDIR/rom/done.json -- python3 tools/frame-catcher/romRun.py ENGINE_DIR OUTDIR/rom [--profile on|off] [--max-frames N]

ENGINE_DIR is an engineRun.mjs output. The ROM is set up as the engine's round (nothing else is written into the ROM):
  * at the draft: the six rentals (set, personality, IV, ability) and the first trainer and sets, then the select screen is entered again;
  * before each later battle's trainer roll (the GO ON answer): gRngValue, so the ROM's own roll gives the engine's trainer and sets;
  * before each battle: the opponent's personality, IVs, ability bit and stats (the ROM builds that party with VBlank draws between members);
  * at each battle's first turn: gRngValue and gRandomTurnNumber, the engine's (the ROM's later draws in battle are its own).
Then the ROM is driven by the engine's choices: at every menu that waits for the player (menuKind) the engine's cursor moves and A / B
presses are made again, in order, at the same frame offset from the menu's first frame; between menus the engine's presses are made again
at the same offset from the last menu. Writes OUTDIR/frames.bin, frames.idx.json, perframe.u32 (as the engine side) and timeline.json
(sounds, menus, presses, the staging log and the driver log).
"""
import bisect, hashlib, json, os, re, struct, subprocess, sys, time, zlib
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (WORKSPACE, *WORKSPACE.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import SUBSTRUCT_POSITIONS  # noqa: E402
from mgba import ffi  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from plan import Plan, Driver, lcg, lcg_back  # noqa: E402

REF = (WORKSPACE / "reference/pokeemerald").resolve()
PROFILES = {"on": "factory.json", "off": "factory-battle-scene-off.json"}

# SaveBlock2 (include/global.h struct BattleFrontier offsets; oracle/battle_lab.py uses the same)
SB2_TRAINER_ID, SB2_LVL_MODE, SB2_BATTLE_NUM, SB2_TRAINER_IDS = 0x0A, 0xCA9, 0xCB2, 0xCB4
SB2_TOWER_STREAK, SB2_FACTORY_STREAK, SB2_FACTORY_RENTS, SB2_RENTAL_MONS = 0xCE0, 0xDE2, 0xDF2, 0xE70
RENTAL_MON_SIZE, POKEMON_SIZE, TASK_SIZE, TASK_COUNT = 12, 100, 40, 16
# struct FactorySelectScreen / FactorySwapScreen fields (battle_factory_screen.c:102-159; tools/audio/romRoundDriver.py has the same)
SELECT_MENU_CURSOR, SELECT_CURSOR, SELECT_YESNO_CURSOR = 0, 3, 7
SWAP_MENU_CURSOR, SWAP_CURSOR, SWAP_YESNO_CURSOR = 0, 3, 22

FUNCS = {  # name -> object file of the copy we want (None = the only one)
    "HandleInputChooseAction": "src/battle_controller_player.o", "HandleInputChooseMove": "src/battle_controller_player.o",
    "BattleMainCB2": None, "HandleTurnActionSelectionState": None, "TryDoEventsBeforeFirstTurn": None,
    "Task_BattleTransition": "src/battle_transition.o", "GetSpecialBattleTransition": None, "FillFactoryTrainerParty": None,
    "Task_HandleChooseMonInput": "src/party_menu.o", "Task_HandleSelectionMenuInput": "src/party_menu.o",
    "Task_HandleInput": "src/pokemon_summary_screen.o", "Task_HandleInput_MoveSelect": "src/pokemon_summary_screen.o",
    "Task_HandleMultichoiceInput": "src/script_menu.o", "Task_HandleYesNoInput": "src/script_menu.o",
    "Select_Task_HandleChooseMons": None, "Select_Task_HandleMenu": None, "Select_Task_HandleYesNo": None,
    "Swap_Task_HandleChooseMons": None, "Swap_Task_HandleMenu": None, "Swap_Task_HandleYesNo": None,
}
DATA = {"sFactorySelectScreen": None, "sFactorySwapScreen": None, "sMenu": "src/menu.o"}
TASK_MENUS = (  # live task function -> menu kind (first match wins: a summary opened from a menu keeps the menu's task alive)
    ("Task_HandleInput", "summary"), ("Task_HandleInput_MoveSelect", "summary"),
    ("Task_HandleSelectionMenuInput", "battle.partySub"), ("Task_HandleChooseMonInput", "battle.party"),
    ("Select_Task_HandleYesNo", "draft.yesno"), ("Select_Task_HandleMenu", "draft.menu"), ("Select_Task_HandleChooseMons", "draft.cursor"),
    ("Swap_Task_HandleYesNo", "swap.yesno"), ("Swap_Task_HandleMenu", "swap.menu"), ("Swap_Task_HandleChooseMons", "swap.pick"),
    ("Task_HandleYesNoInput", "field.yesno"), ("Task_HandleMultichoiceInput", "field.multichoice"),
)


def nm_table():
    for tool in ("arm-none-eabi-nm", "nm"):
        try:
            text = subprocess.run([tool, str(REF / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
            break
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    else:
        raise SystemExit("romRun: no nm to read the ELF")
    out = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 3 and re.fullmatch(r"[0-9a-fA-F]{8}", parts[0]) and parts[1] in "tTdDbB":
            out.setdefault(parts[2], []).append(int(parts[0], 16))
    return out


def object_range(map_text, obj, section):
    m = re.search(r"^ %s\s+0x([0-9a-f]+)\s+0x([0-9a-f]+) %s$" % (re.escape(section), re.escape(obj)), map_text, re.M)
    if not m:
        raise SystemExit(f"romRun: no {section} range for {obj}")
    base = int(m.group(1), 16)
    return base, base + int(m.group(2), 16)


def resolve(nm, map_text, table, sections):
    out = {}
    for name, obj in table.items():
        addrs = nm.get(name, [])
        if obj is not None and len(addrs) != 1:
            for section in sections:
                try:
                    lo, hi = object_range(map_text, obj, section)
                except SystemExit:
                    continue
                inside = [a for a in addrs if lo <= a < hi]
                if len(inside) == 1:
                    addrs = inside
                    break
        if len(addrs) != 1:
            raise SystemExit(f"romRun: cannot resolve {name} ({obj}): {[hex(a) for a in addrs]}")
        out[name] = addrs[0] & ~1
    return out


class FrameStore:
    """Every distinct 240x160 RGB888 picture once (zlib), and the picture id of every frame (the engine side's format)."""

    def __init__(self, out):
        self.out = Path(out)
        self.fd = open(self.out / "frames.bin", "wb")
        self.index, self.ids, self.offset, self.perframe = [], {}, 0, []

    def add(self, rgb):
        h = hashlib.sha1(rgb).hexdigest()
        i = self.ids.get(h)
        if i is None:
            z = zlib.compress(rgb, 1)
            self.fd.write(z)
            self.index.append([h, self.offset, len(z)])
            self.offset += len(z)
            i = self.ids[h] = len(self.index) - 1
        self.perframe.append(i)
        return i

    def close(self):
        self.fd.close()
        (self.out / "frames.idx.json").write_text(json.dumps(self.index))
        (self.out / "perframe.u32").write_bytes(struct.pack(f"<{len(self.perframe)}I", *self.perframe))


class SoundLog:
    """The ROM's sound calls, as tools/audio/soundEventProbe.py logs them in its hybrid mode (--fast): a frame runs at full speed and is
    stepped again instruction by instruction (from the saved state before it) only when the m4a RAM changed during it; then each hooked
    call's entry is seen with its arguments. Events of calls that changed nothing are dropped ("effective rows only")."""
    HOOKS = ["m4aSongNumStart", "m4aSongNumStop", "PlayCryInternal", "PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning",
             "SE12PanpotControl", "PlayBGM", "PlayFanfare", "PlayFanfareByFanfareNum", "m4aMPlayFadeOut", "m4aMPlayFadeOutTemporarily",
             "m4aMPlayFadeIn", "m4aMPlayVolumeControl", "m4aMPlayStop", "m4aMPlayContinue"]
    FADE_HOOKS = {"m4aMPlayFadeOut": "out", "m4aMPlayFadeOutTemporarily": "out-temporary", "m4aMPlayFadeIn": "in"}
    SE_CALLERS = {"PlaySE", "PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"}
    BGM_CALLERS = {"PlayBGM", "PlayNewMapMusic", "FadeInNewBGM", "FadeOutAndPlayNewMapMusic", "FadeOutAndFadeInNewMapMusic"}
    FANFARE_CALLERS = {"PlayFanfare", "PlayFanfareByFanfareNum", "WaitFanfare", "Task_Fanfare"}
    SAVE_IWRAM, MPLAY_INFO_SIZE, MPLAY_TRACK_SIZE, STATE_HEADER = 0x19000, 0x40, 0x50, 0x400

    def __init__(self, oracle):
        self.o, self.core, self.cpu = oracle, oracle.core, oracle.core.cpu
        syms = sorted((a, n) for n, a in oracle.symbols.items() if a)
        self.addrs, self.syms = [a for a, _ in syms], syms
        self.entry = {oracle.symbols[n] + 2: n for n in self.HOOKS if oracle.symbols.get(n)}
        self.players = {oracle.symbols[f"gMPlayInfo_{n}"]: n for n in ("BGM", "SE1", "SE2", "SE3")}
        for i in range(2):
            self.players[oracle.symbols["gPokemonCryMusicPlayers"] + i * self.MPLAY_INFO_SIZE] = "cry"
        table = oracle.symbols["gSongTable"]
        self.header_to_song = {}
        for n in range(1200):
            self.header_to_song.setdefault(oracle.read_u32(table + n * 8), n)
        self.events, self.pending, self.watch = [], {}, {}
        self.frame = 0
        self.fast = self.restepped = 0
        self.native, self.gpr = self.core._core, self.cpu._native.gprs
        self.native_step, self.frame_counter = self.native.step, self.native.frameCounter

    @staticmethod
    def s8(v):
        v &= 0xFF
        return v - 256 if v & 0x80 else v

    def caller(self, lr):
        i = bisect.bisect_right(self.addrs, (lr & ~1) - 2) - 1
        return self.syms[i][1] if i >= 0 else None

    def live(self, a, n):
        return bytes(self.core.memory.u8[a:a + n])

    def blob(self, b):
        base = self.SAVE_IWRAM - 0x3000000
        return lambda a, n: b[base + a:base + a + n]

    def signature(self, iw):
        sig, clocks = [self.o.read_u32(self.o.symbols["gMPlay_PokemonCry"])], []
        for addr in self.players:
            info = iw(addr, self.MPLAY_INFO_SIZE)
            sig += [info[0:10], info[0x24:0x26], info[0x28:0x2A], info[0x2C:0x30]]
            clocks.append(int.from_bytes(info[0xC:0x10], "little"))
            tracks = int.from_bytes(info[0x2C:0x30], "little")
            if 0x3000000 <= tracks < 0x3008000 - self.MPLAY_TRACK_SIZE * 16:
                for t in range(min(info[8], 16)):
                    tr = iw(tracks + t * self.MPLAY_TRACK_SIZE, self.MPLAY_TRACK_SIZE)
                    sig.append(bytes((tr[0] & 0xC0, tr[0xB], tr[0xD], tr[0x13], tr[0x15])))
        sig.append(iw(self.o.symbols["gPokemonCrySongs"], 0x70))
        sig.append(iw(self.o.symbols["gPokemonCrySong"], 0x40))
        return sig, clocks

    def on_hook(self, name):
        g = [int(self.cpu.gprs[i]) & 0xFFFFFFFF for i in range(4)]
        n_events = len(self.events)
        lr = int(self.cpu.gprs[14]) & 0xFFFFFFFF
        via = self.caller(lr)
        f = self.frame
        if name == "PlayCryInternal":
            sp = int(self.cpu.gprs[13]) & 0xFFFFFFFF
            self.events.append({"frame": f, "kind": "cry", "id": g[0], "pan": self.s8(g[1]), "volume": self.s8(g[2]), "priority": g[3] & 0xFF,
                                "mode": self.o.read_u8(sp), "via": via})
        elif name in ("PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"):
            self.pending["pan"] = self.s8(g[1])
        elif name == "m4aSongNumStart":
            kind = "se" if via in self.SE_CALLERS else "bgm" if via in self.BGM_CALLERS else "fanfare" if via in self.FANFARE_CALLERS else "direct"
            pan = self.pending.pop("pan", None) if via in {"PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"} else None
            self.events.append({"frame": f, "kind": kind, "id": g[0], "pan": pan, "via": via})
        elif name == "SE12PanpotControl":
            self.events.append({"frame": f, "kind": "pan", "id": None, "pan": self.s8(g[0]), "via": via})
        elif name == "m4aSongNumStop":
            self.events.append({"frame": f, "kind": "stop", "id": g[0], "pan": None, "via": via})
        elif name.startswith("m4aMPlay"):
            player = self.players.get(g[0], f"0x{g[0]:08x}")
            song = self.header_to_song.get(self.o.read_u32(g[0]))
            ev = {"frame": f, "kind": None, "id": song, "pan": None, "player": player, "via": via}
            if name in self.FADE_HOOKS:
                ev.update(kind="fade", dir=self.FADE_HOOKS[name], speed=g[1] & 0xFFFF)
            elif name == "m4aMPlayVolumeControl":
                ev.update(kind="duck", tracks=g[1] & 0xFFFF, volume=g[2] & 0xFFFF)
            elif name == "m4aMPlayStop":
                ev["kind"] = "stop"
            else:
                ev["kind"] = "continue"
            if not (name == "m4aMPlayStop" and via == "m4aSongNumStop"):
                self.events.append(ev)
        ret = (lr & ~1) + 2
        self.watch.setdefault(ret, []).append((self.signature(self.live), self.events[n_events:]))

    def on_return(self, ret):
        after = self.signature(self.live)
        for before, targets in self.watch.pop(ret):
            if before == after:
                for t in targets:
                    t["noop"] = True

    def stepping(self, buttons, traps=None):
        self.o._set_buttons(list(buttons))
        start = self.frame_counter(self.native)
        gpr, entry, watch, step, native = self.gpr, self.entry, self.watch, self.native_step, self.native
        traps = traps or {}
        while self.frame_counter(native) == start:
            pc = gpr[15]
            name = entry.get(pc)
            if name:
                self.on_hook(name)
            if pc in watch:
                self.on_return(pc)
            trap = traps.get(pc)
            if trap is not None:
                trap()
            step(native)

    def advance(self, buttons, restep_with=None):
        """One frame; returns this frame's effective sound events. `restep_with()` (after the fast run) may return a {pc: callback} of
        instruction traps: the frame is then run again from its saved start, stepped, with the traps (e.g. a write at a function entry)."""
        self.frame += 1
        n0 = len(self.events)
        self.o._set_buttons(list(buttons))
        pre = bytes(ffi.buffer(self.core.save_raw_state()))
        sig0, clk0 = self.signature(self.blob(pre))
        self.core.run_frame()
        post = bytes(ffi.buffer(self.core.save_raw_state()))
        sig1, clk1 = self.signature(self.blob(post))
        traps = restep_with() if restep_with is not None else None
        if traps or not (sig0 == sig1 and all(b >= a for a, b in zip(clk0, clk1))):
            self.core.load_raw_state(pre)
            self.stepping(buttons, traps)
            self.restepped += 1
        else:
            self.fast += 1
        self.o._screen_stale = False
        self.o.frame += 1
        new = [e for e in self.events[n0:] if not e.get("noop")]
        return new


def decrypt_mon(raw):
    personality, ot_id = struct.unpack_from("<II", raw, 0)
    key = personality ^ ot_id
    data = raw[32:80]
    plain = b"".join(struct.pack("<I", struct.unpack_from("<I", data, o)[0] ^ key) for o in range(0, 48, 4))
    order = SUBSTRUCT_POSITIONS[personality % 24]
    logical = [plain[order[i] * 12:order[i] * 12 + 12] for i in range(4)]
    ok = sum(struct.unpack("<24H", plain)) & 0xFFFF == struct.unpack_from("<H", raw, 28)[0]
    return logical, ok


def encrypt_mon(raw, logical, personality, ot_id):
    order = SUBSTRUCT_POSITIONS[personality % 24]
    phys = [None] * 4
    for i in range(4):
        phys[order[i]] = logical[i]
    plain = b"".join(phys)
    key = personality ^ ot_id
    enc = b"".join(struct.pack("<I", struct.unpack_from("<I", plain, o)[0] ^ key) for o in range(0, 48, 4))
    out = bytearray(raw)
    struct.pack_into("<II", out, 0, personality, ot_id)
    struct.pack_into("<H", out, 28, sum(struct.unpack("<24H", plain)) & 0xFFFF)
    out[32:80] = enc
    return bytes(out)


STAT_ORDER = ("hp", "attack", "defense", "speed", "spAttack", "spDefense")


class Rom:
    def __init__(self, profile):
        self.o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / PROFILES[profile])
        nm, map_text = nm_table(), (REF / "pokeemerald.map").read_text()
        self.f = resolve(nm, map_text, FUNCS, (".text",))
        self.d = resolve(nm, map_text, DATA, (".bss", "ewram_data", ".data", "COMMON"))
        self.s = self.o.symbols
        self.task_menu = [(self.f[n], k) for n, k in TASK_MENUS]

    def u8(self, a): return self.o.read_u8(a)
    def u16(self, a): return self.o.read_u16(a)
    def u32(self, a): return self.o.read_u32(a)
    def save2(self): return self.u32(self.s["gSaveBlock2Ptr"])
    def cb2(self): return self.u32(self.s["gMain"] + 4) & ~1

    def read(self, a, n): return bytes(self.o.core.memory.u8[a:a + n])

    def write(self, a, data):
        for i, b in enumerate(data):
            self.o.write_u8(a + i, b)

    def live_tasks(self):
        t = self.s["gTasks"]
        return [self.u32(t + i * TASK_SIZE) & ~1 for i in range(TASK_COUNT) if self.u8(t + i * TASK_SIZE + 4)]

    def in_battle(self):
        return self.cb2() == self.f["BattleMainCB2"]

    def menu(self):
        """(kind, sig) of the menu waiting for the player, or None."""
        tasks = set(self.live_tasks())
        for func, kind in self.task_menu:
            if func in tasks:
                return kind, self.menu_sig(kind)
        if self.in_battle():
            func = self.u32(self.s["gBattlerControllerFuncs"]) & ~1
            if func == self.f["HandleInputChooseAction"]:
                return "battle.action", str(self.u8(self.s["gActionSelectionCursor"]))
            if func == self.f["HandleInputChooseMove"]:
                return "battle.fight", str(self.u8(self.s["gMoveSelectionCursor"]))
        return None

    def menu_sig(self, kind):
        if kind.startswith("draft."):
            p = self.u32(self.d["sFactorySelectScreen"])
            return str(self.u8(p + {"draft.cursor": SELECT_CURSOR, "draft.menu": SELECT_MENU_CURSOR, "draft.yesno": SELECT_YESNO_CURSOR}[kind])) if p else "?"
        if kind.startswith("swap."):
            p = self.u32(self.d["sFactorySwapScreen"])
            return str(self.u8(p + {"swap.pick": SWAP_CURSOR, "swap.menu": SWAP_MENU_CURSOR, "swap.yesno": SWAP_YESNO_CURSOR}[kind])) if p else "?"
        if kind in ("field.yesno", "field.multichoice", "battle.partySub"):
            v = self.u8(self.d["sMenu"] + 2)
            return str(v - 256 if v & 0x80 else v)
        if kind == "battle.party":
            v = self.u8(self.s["gPartyMenu"] + 9)
            return str(v - 256 if v & 0x80 else v)
        return "?"

    def party_species(self, symbol):
        out = []
        for i in range(3):
            raw = self.read(self.s[symbol] + i * POKEMON_SIZE, POKEMON_SIZE)
            logical, ok = decrypt_mon(raw)
            out.append(struct.unpack_from("<H", logical[0], 0)[0] if ok else None)
        return out


def run(engine_dir, out_dir, profile, max_frames):
    eng = json.loads((Path(engine_dir) / "timeline.json").read_text())
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    rom = Rom(profile)
    o, s = rom.o, rom.s
    facts = eng["facts"]
    battles = {b["battleIndex"]: b for b in facts["battles"]}
    log, staging = [], []

    def note(what, **kw):
        log.append({"frame": o.frame, "what": what, **kw})

    # ---- staging at the draft (the lab's own writes, oracle/battle_lab.py prepare, with the engine's rental records) ----
    o.new_session()
    save2 = rom.save2()
    rom_tid = struct.unpack("<I", rom.read(save2 + SB2_TRAINER_ID, 4))[0]
    if facts.get("playerTrainerId") is not None and rom_tid != facts["playerTrainerId"]:
        staging.append({"what": "playerTrainerId differs", "rom": rom_tid, "engine": facts["playerTrainerId"]})
    o.write_u8(save2 + SB2_LVL_MODE, rom.u8(save2 + SB2_LVL_MODE) & ~0x3)
    for off in (SB2_BATTLE_NUM, SB2_FACTORY_STREAK, SB2_TOWER_STREAK, SB2_FACTORY_RENTS):
        o.write_u16(save2 + off, 0)
    for i, r in enumerate(facts["rentals"]):
        base = save2 + SB2_RENTAL_MONS + i * RENTAL_MON_SIZE
        o.write_u16(base, r["setId"])
        o.write_u32(base + 4, r["personality"])
        o.write_u8(base + 8, r["fixedIv"])
        o.write_u8(base + 9, r["abilitySlot"])
    b0 = battles[0]
    for i, set_id in enumerate(b0["opponentSetIds"]):
        o.write_u16(s["gFrontierTempParty"] + i * 2, set_id)
    o.write_u16(s["gTrainerBattleOpponent_A"], b0["trainerId"])
    o.write_u16(save2 + SB2_TRAINER_IDS, b0["trainerId"])
    o.write_u32(s["gMain"] + 4, s["DoBattleFactorySelectScreen"] | 1)
    staging.append({"what": "draft", "rentals": [r["setId"] for r in facts["rentals"]], "trainer": b0["trainerId"], "sets": b0["opponentSetIds"]})

    # The engine's draft mount starts on a settled draft screen; the ROM re-enters the select screen (its fade-in is not compared): frame 0 of the
    # ROM recording is the first frame the new screen's cursor task runs.
    # The recording starts on the frame the ROM shows the engine's first picture (the settled draft screen), else once the cursor task
    # runs and the fade-in is over (300 frames).
    eng_idx = json.loads((Path(engine_dir) / "frames.idx.json").read_text())
    first_pic = eng_idx[struct.unpack_from("<I", (Path(engine_dir) / "perframe.u32").read_bytes(), 0)[0]][0]
    lead, ready_at, same = 0, None, False
    while True:
        o.advance([])
        lead += 1
        sel = rom.u32(rom.d["sFactorySelectScreen"])
        if ready_at is None and lead > 8 and sel and rom.f["Select_Task_HandleChooseMons"] in rom.live_tasks():
            ready_at = lead
        if ready_at is not None and hashlib.sha1(o.screen_rgb()).hexdigest() == first_pic:
            same = True
            break
        if ready_at is not None and lead - ready_at > 300:
            break
        if lead > 2000:
            raise SystemExit("romRun: the select screen did not come back after the draft staging")
    staging.append({"what": "select screen re-entered", "leadFrames": lead, "inputFrom": ready_at, "sameFirstPicture": same})
    o.frame = 0
    store = FrameStore(out)
    sound = SoundLog(o)
    store.add(o.screen_rgb())

    plan = Plan(eng)
    driver = Driver(plan, note)
    patched, rng_written, roll_forced = set(), set(), {}
    transitions = {int(k): v for k, v in (facts.get("transitions") or {}).items()}
    transitions["forced"] = set()
    sounds, menus, buttons_rle = [], [], []
    last_menu, last_buttons = None, None
    roll = None  # {battle, value, start}: gRngValue is held at `value` from the GO ON answer until the ROM rolls the trainer
    cap = max_frames if max_frames else int(eng["frames"] * 1.6) + 6000
    t0 = time.time()
    m = rom.menu()
    while o.frame < cap:
        buttons = driver.step(o.frame, m, rom)
        if buttons is None:
            break
        # The trainer roll of battle n >= 1 runs a few frames after the GO ON answer (BattleFactoryPreBattleRoom AskSwapMon: factory_generateopponentmons
        # first): from the answer until the roll, gRngValue is held so that the frame's VBlank draw leaves the engine's pre-roll value.
        bn = rom.u16(rom.save2() + SB2_BATTLE_NUM)
        if driver.just_answered == "field.multichoice" and bn in battles and bn > 0 and bn not in roll_forced and battles[bn].get("rollRngBefore") is not None:
            back = probe_roll(rom, buttons, battles[bn])
            roll = {"battle": bn, "value": back if back is not None else lcg_back(battles[bn]["rollRngBefore"]), "start": o.frame,
                    "trainerBefore": rom.u16(s["gTrainerBattleOpponent_A"]), "probed": back is not None}
            roll_forced[bn] = "pending"
        driver.just_answered = None
        if roll is not None:
            o.write_u32(s["gRngValue"], roll["value"])
        live_before = transition_task_live(rom) is not None
        new = sound.advance(buttons, restep_with=lambda: transition_traps(rom, battles, transitions, bn, staging, live_before))
        store.add(o.screen_rgb())
        f = o.frame
        b = "+".join(buttons)
        if b != last_buttons:
            buttons_rle.append([f, b])
            last_buttons = b
        for e in new:
            sounds.append([f, e])
        if roll is not None:
            tp = [rom.u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)]
            want = battles[roll["battle"]]
            if tp == want["opponentSetIds"] and rom.u16(s["gTrainerBattleOpponent_A"]) == want["trainerId"]:
                roll_forced[roll["battle"]] = "rolled"
                staging.append({"what": "trainer roll", "battle": roll["battle"], "frame": f, "trainer": want["trainerId"], "sets": tp, "framesHeld": f - roll["start"], "probed": roll["probed"]})
                roll = None
            elif rom.u16(s["gTrainerBattleOpponent_A"]) != roll["trainerBefore"] or f - roll["start"] > 600:
                # rolled something else: write the engine's trainer and sets (the attendant's comments on them may then differ)
                o.write_u16(s["gTrainerBattleOpponent_A"], want["trainerId"])
                for i, set_id in enumerate(want["opponentSetIds"]):
                    o.write_u16(s["gFrontierTempParty"] + i * 2, set_id)
                o.write_u16(rom.save2() + SB2_TRAINER_IDS + 2 * roll["battle"], want["trainerId"])
                roll_forced[roll["battle"]] = "written"
                staging.append({"what": "trainer roll missed; trainer and sets written", "battle": roll["battle"], "frame": f, "romTrainer": rom.u16(s["gTrainerBattleOpponent_A"]), "romSets": tp})
                roll = None
            else:
                o.write_u32(s["gRngValue"], roll["value"])
        # The opponent party: patched once the ROM has built it (DoSpecialTrainerBattle) and before battle init reads it.
        if bn in battles and bn not in patched and not rom.in_battle():
            want = battles[bn]
            species = [op["member"]["species"] for op in want["opponents"]]
            if rom.party_species("gEnemyParty") == species and [rom.u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)] == want["opponentSetIds"]:
                patch_enemy_party(rom, want, staging, f)
                patched.add(bn)
        # The transition the ROM started (Task_BattleTransition's tTransitionId) against the engine's.
        if bn in transitions and ("seen", bn) not in transitions["forced"]:
            rom_id = transition_task_live(rom)
            if rom_id is not None:
                staging.append({"what": "transition started", "battle": bn, "frame": f, "rom": rom_id, "engine": transitions[bn]["transitionId"],
                                "same": rom_id == transitions[bn]["transitionId"]})
                transitions["forced"].add(("seen", bn))
        # The battle RNG: written on the frame TryDoEventsBeforeFirstTurn hands over to the action selection (its last draw is gRandomTurnNumber).
        if rom.in_battle() and bn in battles and bn not in rng_written:
            if (rom.u32(s["gBattleMainFunc"]) & ~1) == rom.f["HandleTurnActionSelectionState"]:
                want = battles[bn]
                staging.append({"what": "battle rng", "battle": bn, "frame": f, "romRng": rom.u32(s["gRngValue"]), "romTurnNumber": rom.u16(s["gRandomTurnNumber"]),
                                "engineRng": want["rngAtActionMenu"], "engineTurnNumber": want["randomTurnNumber"], "partyPatched": bn in patched})
                o.write_u32(s["gRngValue"], want["rngAtActionMenu"])
                o.write_u16(s["gRandomTurnNumber"], want["randomTurnNumber"])
                pers = [rom.u32(s["gEnemyParty"] + i * POKEMON_SIZE) for i in range(3)]
                if pers != [op["personality"] for op in want["opponents"]]:
                    staging.append({"what": "opponent party is not the engine's at battle start", "battle": bn, "rom": pers,
                                    "engine": [op["personality"] for op in want["opponents"]]})
                rng_written.add(bn)
        m = rom.menu()
        mk = None if m is None else f"{m[0]}|{m[1]}"
        if mk != last_menu:
            menus.append([f, None if m is None else m[0], None if m is None else m[1]])
            last_menu = mk
        if f % 5000 == 0:
            print(f"rom: frame {f}, anchor {driver.ai}/{len(plan.anchors)}, {time.time() - t0:.0f} s", flush=True)
    store.close()
    result = {"side": "rom", "profile": profile, "frames": o.frame, "engineFrames": eng["frames"], "seconds": round(time.time() - t0, 1),
              "sound": {"fast": sound.fast, "restepped": sound.restepped}, "staging": staging, "driverLog": log,
              "anchorsMatched": driver.ai, "anchorsTotal": len(plan.anchors), "anchorBinds": driver.binds, "stop": driver.stop_reason,
              "steerFrames": driver.steer_frames,
              "sounds": sounds, "menus": menus, "buttons": buttons_rle}
    (out / "timeline.json").write_text(json.dumps(result))
    print(f"rom: {o.frame} frames, {len(store.index)} distinct pictures, {len(sounds)} sound events, anchors {driver.ai}/{len(plan.anchors)}, "
          f"stop {driver.stop_reason}, {result['seconds']} s", flush=True)
    return result


def transition_task_live(rom):
    t = rom.s["gTasks"]
    for i in range(TASK_COUNT):
        if rom.u8(t + i * TASK_SIZE + 4) and (rom.u32(t + i * TASK_SIZE) & ~1) == rom.f["Task_BattleTransition"]:
            return rom.u16(t + i * TASK_SIZE + 8 + 2)  # tTransitionId, data[1]
    return None


def transition_traps(rom, battles, transitions, bn, staging, live_before):
    """The battle-start transition: DoSpecialTrainerBattle draws it (GetSpecialBattleTransition, one Random()) and starts its task in
    the same frame (battle_tower.c, SPECIAL_BATTLE_FACTORY). When the fast run of a frame started the transition task, the frame is
    stepped again with a trap at that function's entry that sets gRngValue so the draw gives the engine's table row (and, when the
    engine recorded it, the engine's RNG after the draw, which the SQUARES transitions read on)."""
    t = transitions.get(bn)
    if t is None or bn in transitions["forced"] or live_before or transition_task_live(rom) is None:
        return None
    o, s = rom.o, rom.s
    transitions["forced"].add(bn)

    def at_entry():
        if t.get("rngAfterDraw") is not None:
            value = lcg_back(t["rngAfterDraw"])
        else:
            value = rom.u32(s["gRngValue"])
            for _ in range(256):
                if ((lcg(value) >> 16) % 12) == t["tableIndex"]:
                    break
                value = lcg(value)
        o.write_u32(s["gRngValue"], value)
        staging.append({"what": "transition", "battle": bn, "engine": t.get("transitionName"), "tableIndex": t["tableIndex"], "rng": value})
    return {rom.f["GetSpecialBattleTransition"] + 2: at_entry}


def rolled(rom, want):
    s = rom.s
    return ([rom.u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)] == want["opponentSetIds"]
            and rom.u16(s["gTrainerBattleOpponent_A"]) == want["trainerId"])


def probe_roll(rom, buttons, want):
    """The gRngValue to hold from the GO ON answer so that the ROM's own roll (factory_generateopponentmons, the frame after the multichoice
    task returns) gives the engine's trainer and sets: tried from a saved state with the value 0..3 draws before the engine's pre-roll value
    (one VBlank Random() runs between the write and the roll). Returns None when none of them does."""
    o, s = rom.o, rom.s
    saved = bytes(ffi.buffer(o.core.save_raw_state()))
    trainer_before = rom.u16(s["gTrainerBattleOpponent_A"])
    found = None
    for d in (1, 0, 2, 3):
        value = want["rollRngBefore"]
        for _ in range(d):
            value = lcg_back(value)
        o.core.load_raw_state(saved)
        for k in range(12):
            o.write_u32(s["gRngValue"], value)
            o._set_buttons(buttons if k < Driver.TAP else [])
            o.core.run_frame()
            if rom.u16(s["gTrainerBattleOpponent_A"]) != trainer_before or rolled(rom, want):
                break
        if rolled(rom, want):
            found = value
            break
    o.core.load_raw_state(saved)
    o._set_buttons([])
    return found


def patch_enemy_party(rom, want, staging, frame):
    s = rom.s
    for i, op in enumerate(want["opponents"]):
        base = s["gEnemyParty"] + i * POKEMON_SIZE
        raw = rom.read(base, POKEMON_SIZE)
        logical, ok = decrypt_mon(raw)
        mem = op["member"]
        before = struct.unpack_from("<I", raw, 0)[0]
        ot_id = struct.unpack_from("<I", raw, 4)[0]
        if not ok:
            staging.append({"what": "enemy party member unreadable", "index": i, "frame": frame})
            continue
        misc = bytearray(logical[3])
        iv_word = struct.unpack_from("<I", misc, 4)[0]
        ivs = mem["ivs"]
        new_word = (iv_word & 0x40000000) | sum(ivs[n] << (5 * k) for k, n in enumerate(STAT_ORDER)) | ((mem["abilityNum"] & 1) << 31)
        struct.pack_into("<I", misc, 4, new_word)
        logical = [logical[0], logical[1], logical[2], bytes(misc)]
        rec = bytearray(encrypt_mon(raw, logical, op["personality"], op.get("otId", ot_id)))
        struct.pack_into("<7H", rec, 86, mem["hp"], mem["maxHP"], mem["attack"], mem["defense"], mem["speed"], mem["spAttack"], mem["spDefense"])
        rom.write(base, rec)
        staging.append({"what": "enemy party member", "index": i, "frame": frame, "species": mem["species"], "personality": [before, op["personality"]],
                        "otId": [ot_id, op.get("otId", ot_id)]})


def main():
    args = sys.argv[1:]
    engine_dir, out_dir = args[0], args[1]
    profile = args[args.index("--profile") + 1] if "--profile" in args else None
    max_frames = int(args[args.index("--max-frames") + 1]) if "--max-frames" in args else None
    eng_meta = json.loads((Path(engine_dir) / "timeline.json").read_text())
    if profile is None:
        profile = eng_meta["facts"]["battleScene"]
    result = run(engine_dir, out_dir, profile, max_frames)
    done = Path(out_dir) / "done.json"
    if not done.exists():
        done.write_text(json.dumps({k: result[k] for k in ("frames", "seconds", "anchorsMatched", "anchorsTotal", "stop")}))


if __name__ == "__main__":
    main()
