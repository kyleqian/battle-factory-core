"""Frame catcher, ROM side (tools/frame-catcher/README.md): plays on the real ROM the round an engine run played, and records every frame.

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUTDIR/rom/done.json -- python3 tools/frame-catcher/romRun.py ENGINE_DIR OUTDIR/rom [--profile on|off] [--max-frames N]

ENGINE_DIR is an engineRun.mjs output. The ROM is set up as the engine's round (nothing else is written into the ROM):
  * at the draft: the six rentals (set, personality, IV, ability) and the first trainer and sets, then the select screen is entered again,
    and once it has built its six Pokemon (with personalities of its own) each is given the engine's personality;
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
from mgba import ffi  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from plan import Plan, Driver, RoundCounter, brain_trap_wanted, deal_opponent_check, deal_traps_wanted, go_on_roll, lcg, lcg_back, m4a_restarted  # noqa: E402
from mons import POKEMON_SIZE, STAT_ORDER, ability_num, decrypt_mon, encrypt_mon, gender, species_of, with_personality  # noqa: E402

REF = (WORKSPACE / "reference/pokeemerald").resolve()
PROFILES = {"on": "factory.json", "off": "factory-battle-scene-off.json"}

# SaveBlock2 (include/global.h struct BattleFrontier offsets; oracle/battle_lab.py uses the same)
SB2_TRAINER_ID, SB2_LVL_MODE, SB2_BATTLE_NUM, SB2_TRAINER_IDS = 0x0A, 0xCA9, 0xCB2, 0xCB4
SB2_TOWER_STREAK, SB2_FACTORY_STREAK, SB2_FACTORY_RENTS, SB2_RENTAL_MONS = 0xCE0, 0xDE2, 0xDF2, 0xE70
RENTAL_MON_SIZE, TASK_SIZE, TASK_COUNT = 12, 40, 16
# struct FactorySelectScreen / FactorySwapScreen fields (battle_factory_screen.c:102-159; tools/audio/romRoundDriver.py has the same)
SELECT_MENU_CURSOR, SELECT_CURSOR, SELECT_YESNO_CURSOR = 0, 3, 7
SWAP_MENU_CURSOR, SWAP_CURSOR, SWAP_YESNO_CURSOR = 0, 3, 22
SELECT_MONS, SELECT_MON_SIZE, SELECT_MON_DATA = 12, 108, 8  # mons[6] at +12; struct FactorySelectableMon: monId, ballSpriteId, selectedId, monData at +8
SPECIES_INFO_SIZE, SPECIES_GENDER_RATIO, SPECIES_ABILITY_2 = 28, 0x10, 0x17  # struct SpeciesInfo (include/pokemon.h): genderRatio, abilities[1]

FUNCS = {  # name -> object file of the copy we want (None = the only one)
    "HandleInputChooseAction": "src/battle_controller_player.o", "HandleInputChooseMove": "src/battle_controller_player.o",
    "BattleMainCB2": None, "HandleTurnActionSelectionState": None, "TryDoEventsBeforeFirstTurn": None,
    "Task_BattleTransition": "src/battle_transition.o", "GetSpecialBattleTransition": None, "FillFactoryTrainerParty": None,
    "Task_StartBattleAfterTransition": None, "Random": None,
    "Task_HandleChooseMonInput": "src/party_menu.o", "Task_HandleSelectionMenuInput": "src/party_menu.o",
    "Task_HandleInput": "src/pokemon_summary_screen.o", "Task_HandleInput_MoveSelect": "src/pokemon_summary_screen.o",
    "Task_HandleMultichoiceInput": "src/script_menu.o", "Task_HandleYesNoInput": "src/script_menu.o",
    "Select_Task_HandleChooseMons": None, "Select_Task_HandleMenu": None, "Select_Task_HandleYesNo": None,
    "Swap_Task_HandleChooseMons": None, "Swap_Task_HandleMenu": None, "Swap_Task_HandleYesNo": None,
    # round 2 and later (fcr2): the PreBattleRoom deal, and the Lobby save dialog's YES/NO (start_menu.c)
    "GenerateInitialRentalMons": "src/battle_factory.o", "GenerateOpponentMons": "src/battle_factory.o",
    "SaveGameTask": None, "SaveConfirmInputCallback": None, "SaveOverwriteInputCallback": None,
    "FillFactoryBrainParty": None,  # the Factory Head's party (battle 21 / 42), built at battle start
    "VBlankIntr": None,
}
DATA = {"sFactorySelectScreen": None, "sFactorySwapScreen": None, "sMenu": "src/menu.o", "sSaveDialogCallback": None}
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
        self.last_pre, self.last_buttons = pre, list(buttons)
        sig0, clk0 = self.signature(self.blob(pre))
        self.core.run_frame()
        post = bytes(ffi.buffer(self.core.save_raw_state()))
        sig1, clk1 = self.signature(self.blob(post))
        traps = restep_with() if restep_with is not None else None
        if traps or not (sig0 == sig1 and all(b >= a for a, b in zip(clk0, clk1))) or m4a_restarted(self.blob(pre), self.blob(post), self.players, self.MPLAY_INFO_SIZE, self.MPLAY_TRACK_SIZE):
            self.core.load_raw_state(pre)
            self.stepping(buttons, traps)
            self.restepped += 1
        else:
            self.fast += 1
        self.o._screen_stale = False
        self.o.frame += 1
        new = [e for e in self.events[n0:] if not e.get("noop")]
        return new


class Rom:
    def __init__(self, profile):
        self.o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / PROFILES[profile])
        nm, map_text = nm_table(), (REF / "pokeemerald.map").read_text()
        self.f = resolve(nm, map_text, FUNCS, (".text",))
        self.d = resolve(nm, map_text, DATA, (".bss", "ewram_data", ".data", "COMMON"))
        self.s = self.o.symbols
        self.task_menu = [(self.f[n], k) for n, k in TASK_MENUS]
        # the end of GetSpecialBattleTransition (the next function's start): its Random() call is told apart by the return address
        starts = sorted({a & ~1 for addrs in nm.values() for a in addrs})
        gst = self.f["GetSpecialBattleTransition"]
        self.gst_end = next(a for a in starts if a > gst)
        self.vblank_end = next(a for a in starts if a > self.f["VBlankIntr"])

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
        # the Lobby save dialog before a new challenge (Common_EventScript_SaveGame -> SaveGame): its "Would you like to save the game?" and
        # "There is already a saved file." YES/NO run under SaveGameTask, not a script menu task (start_menu.c:996-1075)
        if self.f["SaveGameTask"] in tasks and (self.u32(self.d["sSaveDialogCallback"]) & ~1) in (self.f["SaveConfirmInputCallback"], self.f["SaveOverwriteInputCallback"]):
            return "field.yesno", self.menu_sig("field.yesno")
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

    def rental_ids(self):
        base = self.save2() + SB2_RENTAL_MONS
        return [self.u16(base + i * RENTAL_MON_SIZE) for i in range(6)]

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
    # battles by g = round * 7 + battle index (engineRun.mjs; an older engine run has round 1 only, keyed by its battle index)
    battles = {b.get("g", b["battleIndex"]): b for b in facts["battles"]}
    rounds = facts.get("rounds") or []
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
            # The six are built by one call (Select_InitMonsData in CB2_InitSelectScreen's case 5) that can run over many frames (53 for the
            # anchor draft, ISSUES.md), and the cursor task is created in case 10, after it returned: none is half made now.
            patch_select_mons(rom, facts["rentals"], staging)
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
    # Rounds (fcr2): round 1 is staged above; the ROM plays its Lobby and the attendant's new challenge itself, and InitFactoryChallenge
    # (factory_init, at the save before the challenge) sets curChallengeBattleNum back to 0: the round counter steps there. The deal of round
    # r >= 1 (PreBattleRoom EnterRoom: factory_generaterentalmons, factory_generateopponentmons) is trapped (deal_traps), and the new select
    # screen's six get the engine's personalities as in round 1.
    rounds_seen, select_patched, deals = RoundCounter(), {0}, {}
    brains, brains_done = {}, set()
    transitions = {int(k): v for k, v in (facts.get("transitions") or {}).items()}
    transitions["forced"] = set()
    sounds, menus, buttons_rle, action_states = [], [], [], []
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
        bn_before, blips = rounds_seen.last, len(rounds_seen.blips)
        if rounds_seen.update(bn):
            staging.append({"what": "round", "round": rounds_seen.round + 1, "frame": o.frame, "battleNumBefore": bn_before})
        if len(rounds_seen.blips) > blips and len(rounds_seen.blips) <= 50:  # (the save blocks moved at a battle start; RoundCounter)
            staging.append({"what": "battle number blip (not a new round)", "frame": o.frame, "number": bn_before, "read": rounds_seen.blips[-1][2]})
        bn = rounds_seen.last
        rom_round, g = rounds_seen.round, rounds_seen.g()
        # (the Factory Head's GO ON leads to AskSwapBeforeHead: no factory_generateopponentmons; its party is FillFactoryBrainParty's, below)
        is_brain = g in battles and battles[g].get("generationKind") == "frontier-brain"
        if driver.just_answered == "field.multichoice" and g in battles and go_on_roll(bn) and not is_brain and g not in roll_forced and battles[g].get("rollRngBefore") is not None:
            back = probe_roll(rom, buttons, battles[g])
            roll = {"battle": g, "slot": bn, "value": back if back is not None else lcg_back(battles[g]["rollRngBefore"]), "start": o.frame,
                    "trainerBefore": rom.u16(s["gTrainerBattleOpponent_A"]), "probed": back is not None}
            roll_forced[g] = "pending"
        driver.just_answered = None
        if roll is not None:
            o.write_u32(s["gRngValue"], roll["value"])
        live_before = transition_task_live(rom) is not None
        deal = None
        if rom_round >= 1 and rom_round < len(rounds):
            deal = deals.setdefault(rom_round, {"round": rom_round, "want": rounds[rom_round], "first": battles.get(rom_round * 7), "rentals": None, "opponent": None, "armedAt": None})
            deal["idsBefore"] = rom.rental_ids()

        brain = None
        if is_brain and g not in brains_done and not rom.in_battle():
            brain = brains.setdefault(g, {"battle": g, "armedAt": None, "fired": None, "want": battles[g]})
            brain["enemyBefore"] = rom.read(s["gEnemyParty"], 8)

        def traps(g=g):
            out = {}
            for part in (transition_traps(rom, battles, transitions, g, staging, live_before), deal_traps(rom, deal, o.frame), brain_traps(rom, brain, o.frame)):
                for pc, fn in (part or {}).items():
                    if pc in out:  # two traps on one address (Random): both run
                        out[pc] = (lambda a, b: lambda: (a(), b()))(out[pc], fn)
                    else:
                        out[pc] = fn
            # a trap may add a one-shot trap at a return address (brain_traps' VBlank undo): the stepping loop reads this same dict
            BRAIN_TRAPS[0] = out
            return out or None
        new = sound.advance(buttons, restep_with=traps)
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
                o.write_u16(rom.save2() + SB2_TRAINER_IDS + 2 * roll["slot"], want["trainerId"])
                roll_forced[roll["battle"]] = "written"
                staging.append({"what": "trainer roll missed; trainer and sets written", "battle": roll["battle"], "frame": f, "romTrainer": rom.u16(s["gTrainerBattleOpponent_A"]), "romSets": tp})
                roll = None
            else:
                o.write_u32(s["gRngValue"], roll["value"])
        # The opponent party: patched once the ROM has finished building it and before battle init reads it. DoSpecialTrainerBattle
        # (battle_tower.c, SPECIAL_BATTLE_FACTORY) builds the three Pokemon and then starts the transition task; the build can run over
        # several frames (each Pokemon's nature search), so a frame can end with the third one half made (species set, experience and
        # level not yet): patching then let the ROM finish it on top (t3: Ledian at level-1 stats). The transition task marks the end.
        if deal is not None:
            finish_deal(rom, deal, staging, f, sound)
        if brain is not None and brain["fired"] is not None and g not in brains_done:
            species = [op["member"]["species"] for op in battles[g]["opponents"]]
            got = rom.party_species("gEnemyParty")
            if all(got) or f - brain["fired"]["frame"] > 20:
                brain["built"] = True
                brains_done.add(g)
                staging.append({"what": "Factory Head party", "battle": g, "frame": f, "builtFrom": brain["fired"]["frame"], "romRngAtEntry": brain["fired"]["romRng"],
                                "engineRng": brain["fired"]["engineRng"], "vblankDrawsUndone": brain["fired"]["vblankDrawsUndone"], "rom": got, "engine": species, "same": got == species})
        elif brain is not None and brain["armedAt"] is not None and brain["fired"] is None and f - brain["armedAt"] > 10:
            # gEnemyParty changed for another reason (the swap screen): wait for the next change
            staging.append({"what": "Factory Head party: armed without FillFactoryBrainParty, re-armed", "battle": g, "frame": f, "armedAt": brain["armedAt"]})
            brain["armedAt"] = None
        # the new round's select screen: once its cursor task runs, the six get the engine's personalities (as round 1's, patch_select_mons)
        if rom_round not in select_patched and rom_round < len(rounds) and rom.u32(rom.d["sFactorySelectScreen"]) and task_live(rom, rom.f["Select_Task_HandleChooseMons"]):
            select_patched.add(rom_round)
            staging.append({"what": "select screen", "round": rom_round + 1, "frame": f, "romSetIds": [rom.u16(rom.u32(rom.d["sFactorySelectScreen"]) + SELECT_MONS + i * SELECT_MON_SIZE) for i in range(6)],
                            "engineSetIds": [r["setId"] for r in rounds[rom_round]["rentals"]]})
            patch_select_mons(rom, rounds[rom_round]["rentals"], staging)
        if g in battles and g not in patched and not rom.in_battle() and transition_task_live(rom) is not None:
            want = battles[g]
            species = [op["member"]["species"] for op in want["opponents"]]
            # (the Factory Head's three are built by FillFactoryBrainParty, which does not use gFrontierTempParty)
            if rom.party_species("gEnemyParty") == species and (is_brain or [rom.u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)] == want["opponentSetIds"]):
                patch_enemy_party(rom, want, staging, f)
                patched.add(g)
        # The transition the ROM started (Task_BattleTransition's tTransitionId) against the engine's.
        if g in transitions and ("seen", g) not in transitions["forced"]:
            rom_id = transition_task_live(rom)
            if rom_id is not None:
                staging.append({"what": "transition started", "battle": g, "frame": f, "rom": rom_id, "engine": transitions[g]["transitionId"],
                                "same": rom_id == transitions[g]["transitionId"]})
                transitions["forced"].add(("seen", g))
        # The battle RNG: written on the frame TryDoEventsBeforeFirstTurn hands over to the action selection (its last draw is gRandomTurnNumber).
        if rom.in_battle() and g in battles and g not in rng_written:
            if (rom.u32(s["gBattleMainFunc"]) & ~1) == rom.f["HandleTurnActionSelectionState"]:
                want = battles[g]
                staging.append({"what": "battle rng", "battle": g, "frame": f, "romRng": rom.u32(s["gRngValue"]), "romTurnNumber": rom.u16(s["gRandomTurnNumber"]),
                                "engineRng": want["rngAtActionMenu"], "engineTurnNumber": want["randomTurnNumber"], "partyPatched": bn in patched})
                o.write_u32(s["gRngValue"], want["rngAtActionMenu"])
                o.write_u16(s["gRandomTurnNumber"], want["randomTurnNumber"])
                rom_party, eng_party = [], []
                for i, op in enumerate(want["opponents"]):
                    raw = rom.read(s["gEnemyParty"] + i * POKEMON_SIZE, POKEMON_SIZE)
                    lg, ok = decrypt_mon(raw)
                    mem = op["member"]
                    rom_party.append([struct.unpack_from("<I", raw, 0)[0], struct.unpack_from("<H", lg[0], 0)[0] if ok else None,
                                      struct.unpack_from("<I", lg[0], 4)[0] if ok else None, raw[84], list(struct.unpack_from("<7H", raw, 86))])
                    eng_party.append([op["personality"], mem["species"], mem["experience"], mem["level"],
                                      [mem["hp"], mem["maxHP"], mem["attack"], mem["defense"], mem["speed"], mem["spAttack"], mem["spDefense"]]])
                if rom_party != eng_party:
                    staging.append({"what": "opponent party is not the engine's at battle start", "battle": g, "rom": rom_party, "engine": eng_party})
                check_player_party(rom, want, staging, g)
                rng_written.add(g)
        m = rom.menu()
        mk = None if m is None else f"{m[0]}|{m[1]}"
        if mk != last_menu and m is not None and m[0] == "battle.action" and (last_menu or "").split("|")[0] != "battle.action":
            # the battle state the ROM chooses its turn in (compare: the engine's rulesContext at its action menu)
            def bm(b):
                base = s["gBattleMons"] + b * 0x58
                return [rom.u16(base), rom.u16(base + 0x28), rom.u16(base + 6), [rom.u8(base + 0x18 + i) for i in range(8)], rom.u32(base + 0x4C)]
            action_states.append([f, g, rom.u32(s["gRngValue"]), rom.u16(s["gRandomTurnNumber"]), bm(0), bm(1)])
        if mk != last_menu:
            menus.append([f, None if m is None else m[0], None if m is None else m[1]])
            last_menu = mk
        if f % 5000 == 0:
            print(f"rom: frame {f}, anchor {driver.ai}/{len(plan.anchors)}, {time.time() - t0:.0f} s", flush=True)
    store.close()
    result = {"side": "rom", "profile": profile, "frames": o.frame, "engineFrames": eng["frames"], "seconds": round(time.time() - t0, 1),
              "sound": {"fast": sound.fast, "restepped": sound.restepped}, "staging": staging, "driverLog": log,
              "anchorsMatched": driver.ai, "anchorsTotal": len(plan.anchors), "anchorBinds": driver.binds, "stop": driver.stop_reason,
              "steerFrames": driver.steer_frames, "actionMenuStates": action_states, "rounds": rom_round + 1, "battleNumberBlips": len(rounds_seen.blips),
              "deals": [{k: v for k, v in d.items() if k not in ("want", "first", "idsBefore")} for d in deals.values()],
              "sounds": sounds, "menus": menus, "buttons": buttons_rle}
    (out / "timeline.json").write_text(json.dumps(result))
    print(f"rom: {o.frame} frames, {len(store.index)} distinct pictures, {len(sounds)} sound events, anchors {driver.ai}/{len(plan.anchors)}, "
          f"stop {driver.stop_reason}, {result['seconds']} s", flush=True)
    return result


def task_live(rom, func):
    t = rom.s["gTasks"]
    return any(rom.u8(t + i * TASK_SIZE + 4) and (rom.u32(t + i * TASK_SIZE) & ~1) == func for i in range(TASK_COUNT))


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
    # Armed from the frame Task_StartBattleAfterTransition is live (DoSpecialTrainerBattle creates it after FillFactoryTrainerParty and
    # before the draw, battle_tower.c:2096-2099) until the draw has been trapped: the party build can run past a frame boundary, and the
    # draw then lands in the frame BEFORE the one whose fast run shows the transition task (seed 9, Scene ON, battle 6: draw in ROM
    # frame 62979, task from 62980). Armed only on the task's frame, the trap was never hit there and the ROM kept its own transition
    # (9 battles of 26 rounds).
    t = transitions.get(bn)
    if t is None or bn in transitions["forced"] or live_before:
        return None
    if transition_task_live(rom) is None and not task_live(rom, rom.f["Task_StartBattleAfterTransition"]):
        return None
    o, s = rom.o, rom.s
    gst, gst_end = rom.f["GetSpecialBattleTransition"], rom.gst_end

    # The value is written at the draw itself, Random() called from GetSpecialBattleTransition (RANDOM_TRANSITION, battle_setup.c:863,
    # 885), not at the function's entry: the overworld VBlank draws Random() once per frame, and when a frame boundary fell between the
    # entry and the draw (seed 13 Scene ON battle 1, seed 0 Scene ON battle 5, seed 18 Scene ON battle 6) the VBlank's draw took the
    # written value and the ROM still started its own transition.
    def at_random():
        if bn in transitions["forced"] or not (gst <= (int(o.core.cpu.gprs[14]) & ~1) < gst_end):
            return
        transitions["forced"].add(bn)
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
    return {rom.f["Random"] + 2: at_random}


def deal_traps(rom, deal, frame):
    """Round r >= 1's deal (PreBattleRoom EnterRoom, scripts.inc:30-31): factory_generaterentalmons then factory_generateopponentmons, one
    script run at the end of the walk (prebattleEntry.ts, the deal tick). When a frame's fast run changed rentalMons' set ids, it is stepped
    again with two traps: at GenerateInitialRentalMons' entry gRngValue is set to the engine's deal cursor (so the ROM draws the engine's six
    set ids itself), and at GenerateOpponentMons' entry to the cursor the engine rolled round r's first opponent from (so the trainer, its
    sets and the attendant's comments on them are the ROM's own roll of the engine's opponent). The ROM's own cursor at each entry is kept:
    with the engine's deal cursor, the ROM reaches GenerateOpponentMons right after the six set ids. When the opponent roll falls in the
    next frame (a frame boundary inside the script run), its trap stays armed for a few frames."""
    wanted = deal_traps_wanted(deal, rom.rental_ids() if deal is not None else None, frame)
    if "give-up" in wanted:
        deal["opponent"] = {"frame": frame, "missed": True}
        return None
    if not wanted:
        return None
    o, s = rom.o, rom.s
    want, first = deal["want"], deal["first"]
    out = {}
    if "rentals" in wanted:

        def at_rentals():
            if deal["rentals"] is not None:
                return
            deal["rentals"] = {"frame": frame, "romRng": rom.u32(s["gRngValue"]), "engineRng": want["dealRngBefore"]}
            o.write_u32(s["gRngValue"], want["dealRngBefore"])
        out[rom.f["GenerateInitialRentalMons"] + 2] = at_rentals
    value = (first or {}).get("rollRngBefore")
    if value is None:
        value = want.get("rentalRngAfter")

    def at_opponent():
        if deal["opponent"] is not None or deal["rentals"] is None:
            return
        deal["opponent"] = {"frame": frame, "romRng": rom.u32(s["gRngValue"]), "engineRng": value, "engineSelectionRng": want.get("selectionRngValue")}
        if value is not None:
            o.write_u32(s["gRngValue"], value)
    out[rom.f["GenerateOpponentMons"] + 2] = at_opponent
    return out


BRAIN_TRAPS = [None]  # the trap dict of the frame being stepped (brain_traps adds return traps to it)


def brain_traps(rom, brain, frame):
    """The Factory Head's party (FillFactoryBrainParty, battle_factory.c:759, from DoSpecialTrainerBattle via FillFactoryTrainerParty, which
    zeroes gEnemyParty first): when a frame's fast run changed gEnemyParty's first record, it is stepped again with a trap at
    FillFactoryBrainParty's entry that sets gRngValue to the cursor the engine drew the Head's three from (its first set draw), so the
    ROM builds the engine's three itself; the party patch at the transition then gives them the engine's personalities. Armed until it
    fires (the zeroing and the build can fall on two frames); a change of gEnemyParty that is not the build re-arms after 10 frames."""
    if brain is None or brain.get("built"):
        return None
    if brain["fired"] is None:
        arm, armed = brain_trap_wanted(brain, rom.read(rom.s["gEnemyParty"], 8), frame)
        if not armed:
            return None
        if arm:
            brain["armedAt"] = frame
    value = brain["want"].get("rollRngBefore")
    if value is None:
        return None
    o, s = rom.o, rom.s

    def at_brain():
        if brain["fired"] is not None:
            return
        brain["fired"] = {"frame": frame, "romRng": rom.u32(s["gRngValue"]), "engineRng": value, "vblankDrawsUndone": 0}
        o.write_u32(s["gRngValue"], value)
    out = {rom.f["FillFactoryBrainParty"] + 2: at_brain}
    if True:
        # The build runs over several frames, and the overworld VBlankIntr draws Random() once per frame (main.c:366) between its draws;
        # the engine draws the Head's three back to back (#55, parked: distribution parity). While the build runs, a VBlankIntr Random()
        # is undone: gRngValue is put back at its return, so the ROM's build reads the engine's stream.
        def at_random():
            if brain["fired"] is None or brain.get("built"):
                return
            lr = int(o.core.cpu.gprs[14]) & 0xFFFFFFFF
            if not (rom.f["VBlankIntr"] <= (lr & ~1) < rom.vblank_end):
                return
            saved = rom.u32(s["gRngValue"])
            ret = (lr & ~1) + 2
            table = BRAIN_TRAPS[0]

            def restore():
                o.write_u32(s["gRngValue"], saved)
                brain["fired"]["vblankDrawsUndone"] += 1
                table.pop(ret, None)
            if table is not None:
                table[ret] = restore
        out[rom.f["Random"] + 2] = at_random
    return out


def probe_deal_opponent(rom, sound, deal):
    """Which trainer and sets the ROM's own order rolls from the engine's deal cursor: the deal frame is stepped again from its saved start
    with only the GenerateInitialRentalMons trap (its opponent roll then reads the ROM's cursor right after the six set ids), and run on
    until the trainer is rolled. The state is put back afterwards."""
    o, s = rom.o, rom.s
    post = bytes(ffi.buffer(o.core.save_raw_state()))
    o.core.load_raw_state(sound.last_pre)
    o._set_buttons(sound.last_buttons)
    native, gpr = sound.native, sound.gpr
    start = sound.frame_counter(native)
    girm = rom.f["GenerateInitialRentalMons"] + 2
    trainer0 = rom.u16(s["gTrainerBattleOpponent_A"])
    while sound.frame_counter(native) == start:
        if gpr[15] == girm:
            o.write_u32(s["gRngValue"], deal["want"]["dealRngBefore"])
        sound.native_step(native)
    for _ in range(4):
        if rom.u16(s["gTrainerBattleOpponent_A"]) != trainer0:
            break
        o.core.run_frame()
    got = {"trainer": rom.u16(s["gTrainerBattleOpponent_A"]), "sets": [rom.u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)], "ids": rom.rental_ids()}
    o.core.load_raw_state(post)
    o._set_buttons([])
    return got


def finish_deal(rom, deal, staging, frame, sound=None):
    """After the trapped deal: the ROM's six set ids and first opponent against the engine's round. A different opponent is written (the
    engine's trainer and sets, trainerIds[0]); the attendant's comments, read in the same script run, are then the ROM's own."""
    o, s = rom.o, rom.s
    if deal["rentals"] is not None and "idsChecked" not in deal:
        deal["idsChecked"] = True
        ids = rom.rental_ids()
        want_ids = [r["setId"] for r in deal["want"]["rentals"]]
        staging.append({"what": "deal: rentals", "round": deal["round"] + 1, "frame": frame, "romRngAtEntry": deal["rentals"]["romRng"],
                        "engineRng": deal["rentals"]["engineRng"], "rom": ids, "engine": want_ids, "same": ids == want_ids})
        if sound is not None and deal["want"].get("dealRngBefore") is not None and deal["first"] is not None:
            deal["romOrder"] = probe_deal_opponent(rom, sound, deal)
    if deal["opponent"] is not None and "oppChecked" not in deal and not deal["opponent"].get("missed"):
        first = deal["first"]
        if first is None:
            return
        deal["oppChecked"] = True
        same, rom_opp, eng_opp = deal_opponent_check(rom.u16(s["gTrainerBattleOpponent_A"]), [rom.u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)], first)
        rec = {"what": "deal: first opponent", "round": deal["round"] + 1, "frame": frame, "romRngAtEntry": deal["opponent"]["romRng"],
               "engineRng": deal["opponent"]["engineRng"], "engineSelectionRng": deal["opponent"]["engineSelectionRng"],
               "rom": rom_opp, "engine": eng_opp, "same": same}
        if "romOrder" in deal:
            rec["romOwnOrder"] = deal["romOrder"]
        staging.append(rec)
        if not same:
            o.write_u16(s["gTrainerBattleOpponent_A"], first["trainerId"])
            for i, set_id in enumerate(first["opponentSetIds"]):
                o.write_u16(s["gFrontierTempParty"] + i * 2, set_id)
            o.write_u16(rom.save2() + SB2_TRAINER_IDS, first["trainerId"])
            staging.append({"what": "deal: first opponent written", "round": deal["round"] + 1, "frame": frame})
    elif deal["opponent"] is not None and deal["opponent"].get("missed") and "oppChecked" not in deal:
        deal["oppChecked"] = True
        staging.append({"what": "deal: the opponent roll was not trapped", "round": deal["round"] + 1, "frame": frame})


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


def species_info(rom, species):
    base = rom.s["gSpeciesInfo"] + species * SPECIES_INFO_SIZE
    return {"genderRatio": rom.u8(base + SPECIES_GENDER_RATIO), "twoAbilities": rom.u8(base + SPECIES_ABILITY_2) != 0}


def patch_select_mons(rom, rentals, staging):
    """The select screen's six Pokemon given the engine's personalities. The ROM builds them afresh from the rentals' set ids alone
    (CreateFrontierFactorySelectableMons: CreateMonWithEVSpreadNatureOTID draws a personality of the set's nature), and the three rented
    become the party (Select_CopyMonsToPlayerParty), so gender and, for a species with two abilities, the ability were the ROM's draw.
    Each is re-stored with the engine's personality and OT id as CreateMon would have built it (mons.with_personality); the rest of the
    record (stats, moves, item, IVs, EVs) is the ROM's own."""
    sel = rom.u32(rom.d["sFactorySelectScreen"])
    for i, r in enumerate(rentals):
        slot = sel + SELECT_MONS + i * SELECT_MON_SIZE
        base = slot + SELECT_MON_DATA
        raw = rom.read(base, POKEMON_SIZE)
        rec = {"what": "rental", "index": i, "setId": r["setId"]}
        species = species_of(raw)
        if rom.u16(slot) != r["setId"] or species is None:
            staging.append({**rec, "what": "rental not patched (not the engine's set, or unreadable)", "romSetId": rom.u16(slot)})
            continue
        info = species_info(rom, species)
        before, ot_before = struct.unpack_from("<II", raw, 0)
        ot_id = r.get("otId", ot_before)
        try:
            new = with_personality(raw, r["personality"], ot_id, info["twoAbilities"])
        except ValueError as err:
            staging.append({**rec, "what": "rental not patched", "why": str(err)})
            continue
        rom.write(base, new)
        rec.update(species=species, personality=[before, r["personality"]], gender=[gender(before, info["genderRatio"]), gender(r["personality"], info["genderRatio"])],
                   abilityNum=[ability_num(raw), ability_num(new)])
        logical, ok = decrypt_mon(raw)
        if ok and r.get("fixedIv") is not None:
            # the rental's IVs (one fixed value per challenge for all six stats, GetFactoryMonFixedIV) against the engine's
            iv_word = struct.unpack_from("<I", logical[3], 4)[0]
            rom_ivs = sorted({(iv_word >> (5 * k)) & 31 for k in range(6)})
            rec["ivs"] = [rom_ivs, r["fixedIv"]]
            rec["sameIvs"] = rom_ivs == [r["fixedIv"]]
        if ot_id != ot_before:
            rec["otId"] = [ot_before, ot_id]
        if ability_num(new) != r.get("abilitySlot", ability_num(new)):
            rec["engineAbilitySlot"] = r["abilitySlot"]  # the engine's slot is not the one the ROM gives this personality
        staging.append(rec)


def check_player_party(rom, want, staging, bn):
    """At the battle's first turn: the player's three against the engine's (personality, species, ability bit, gender, level, HP, stats)."""
    if not want.get("playerParty") or "member" not in want["playerParty"][0]:
        return
    rom_party, eng_party = [], []
    for i, r in enumerate(want["playerParty"]):
        raw = rom.read(rom.s["gPlayerParty"] + i * POKEMON_SIZE, POKEMON_SIZE)
        species = species_of(raw)
        personality = struct.unpack_from("<I", raw, 0)[0]
        ratio = species_info(rom, species)["genderRatio"] if species is not None else None
        rom_party.append([personality, species, ability_num(raw), gender(personality, ratio) if ratio is not None else None, raw[84],
                          list(struct.unpack_from("<7H", raw, 86))])
        mem = r["member"]
        eng_party.append([r["personality"], mem["species"], mem["abilityNum"], mem["gender"], mem["level"],
                          [mem["hp"], mem["maxHP"], mem["attack"], mem["defense"], mem["speed"], mem["spAttack"], mem["spDefense"]]])
    if rom_party != eng_party:
        staging.append({"what": "player party is not the engine's at battle start", "battle": bn, "rom": rom_party, "engine": eng_party})
    else:
        staging.append({"what": "player party is the engine's at battle start", "battle": bn, "personality": [p[0] for p in rom_party],
                        "gender": [p[3] for p in rom_party], "abilityNum": [p[2] for p in rom_party]})


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
        # the ROM's own IVs before the patch (fixed per challenge, GetFactoryMonFixedIV: they rise in round 2): a difference is the engine's
        rom_ivs = [(iv_word >> (5 * k)) & 31 for k in range(6)]
        eng_ivs = [ivs[n] for n in STAT_ORDER]
        new_word = (iv_word & 0x40000000) | sum(ivs[n] << (5 * k) for k, n in enumerate(STAT_ORDER)) | ((mem["abilityNum"] & 1) << 31)
        struct.pack_into("<I", misc, 4, new_word)
        logical = [logical[0], logical[1], logical[2], bytes(misc)]
        rec = bytearray(encrypt_mon(raw, logical, op["personality"], op.get("otId", ot_id)))
        struct.pack_into("<7H", rec, 86, mem["hp"], mem["maxHP"], mem["attack"], mem["defense"], mem["speed"], mem["spAttack"], mem["spDefense"])
        rom.write(base, rec)
        staging.append({"what": "enemy party member", "index": i, "frame": frame, "species": mem["species"], "personality": [before, op["personality"]],
                        "otId": [ot_id, op.get("otId", ot_id)], "ivs": [rom_ivs, eng_ivs], "sameIvs": rom_ivs == eng_ivs})


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
