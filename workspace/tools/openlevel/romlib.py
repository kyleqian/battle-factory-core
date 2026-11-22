"""Open Level ROM tools (tools/openlevel/README.md): the shared part. mGBA in process (oracle/emerald_core.py), no oracle server.

- `Rom(profile)` loads the ROM and the bootstrap's save without running the bootstrap; `replay()` runs the bootstrap's own timeline
  (segments, then pokes, then settle frames) frame by frame, so a caller can stop at a frame, save a state, or step a frame instruction
  by instruction with PC traps (`frame(buttons, traps)`, the pattern of tools/frame-catcher/romRun.py's SoundLog.stepping).
- `read_mon(addr)` decodes a 100-byte struct Pokemon (include/pokemon.h) with names from the decomp's constants headers.
"""
import hashlib, json, re, struct, sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (WORKSPACE, *WORKSPACE.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
sys.path.insert(0, str(WORKSPACE / "tools/frame-catcher"))
from emerald_core import EmeraldOracle, load_bootstrap_spec  # noqa: E402
from mgba import ffi  # noqa: E402
from romRun import nm_table, resolve  # noqa: E402
from mons import decrypt_mon  # noqa: E402

REF = (WORKSPACE / "reference/pokeemerald").resolve()
BOOT = HARNESS / "oracle/bootstrap"
PROFILES = {
    "lv50-on": "factory.json", "lv50-off": "factory-battle-scene-off.json",
    "open-on": "factory-open.json", "open-off": "factory-open-battle-scene-off.json",
}

# SaveBlock2 (include/global.h struct BattleFrontier; the factoryRentsCount header comment is wrong, oracle/battle_lab.py:113-120)
SB2_LVL_MODE, SB2_BATTLE_NUM, SB2_TRAINER_IDS, SB2_STREAK_FLAGS = 0xCA9, 0xCB2, 0xCB4, 0xCDC
SB2_TOWER_STREAK_SINGLES_50 = 0xCE0  # towerWinStreaks[0][0]
SB2_FACTORY_STREAK = 0xDE2  # factoryWinStreaks[battleMode][lvlMode], u16: + 2 * (2 * battleMode + lvlMode)
SB2_FACTORY_RENTS = 0xDF2  # factoryRentsCount[battleMode][lvlMode]
SB2_RENTAL_MONS, RENTAL_MON_SIZE = 0xE70, 12
SELECT_MONS, SELECT_MON_SIZE, SELECT_MON_DATA = 12, 108, 8  # struct FactorySelectScreen.mons[6] (battle_factory_screen.c:102-121)
POKEMON_SIZE = 100

FUNCS = {
    "GenerateInitialRentalMons": "src/battle_factory.o", "GenerateOpponentMons": "src/battle_factory.o",
    "GetFactoryMonId": None, "GetNumPastRentalsRank": None, "GetRandomScaledFrontierTrainerId": None,
    "CreateFrontierFactorySelectableMons": None, "FillFactoryTrainerParty": None, "FillFactoryFrontierTrainerParty": None,
    "CreateMonWithEVSpreadNatureOTID": None, "Random": None, "VBlankIntr": None,
    "HandleInputChooseAction": "src/battle_controller_player.o", "BattleMainCB2": None, "GetHighestLevelInPlayerParty": None, "GetFrontierEnemyMonLevel": None,
}
DATA = {"sFactorySelectScreen": None, "sRandCount": None}


def _defines(header, prefix):
    out = {}
    for m in re.finditer(r"^#define\s+%s(\w+)\s+(\d+)\s*$" % prefix, (REF / header).read_text(), re.M):
        out.setdefault(int(m.group(2)), m.group(1))
    return out


SPECIES = _defines("include/constants/species.h", "SPECIES_")
MOVES = _defines("include/constants/moves.h", "MOVE_")
ITEMS = _defines("include/constants/items.h", "ITEM_")
NATURES ={i: n for i, n in _defines("include/constants/pokemon.h", "NATURE_").items() if i < 25}


class _NoBoot(EmeraldOracle):
    """EmeraldOracle without its bootstrap run: the ROM reset with the save loaded, frame 0."""

    def _run_bootstrap(self, spec):
        return 0


class Rom:
    def __init__(self, profile):
        self.profile = profile
        self.path = BOOT / PROFILES[profile]
        self.spec = load_bootstrap_spec(self.path)
        self.o = _NoBoot(REF / "pokeemerald.gba", REF / "pokeemerald.map", self.path)
        nm, map_text = nm_table(), (REF / "pokeemerald.map").read_text()
        self.f = resolve(nm, map_text, FUNCS, (".text",))
        self.d = resolve(nm, map_text, DATA, (".bss", "ewram_data", ".data", "COMMON"))
        self.s = self.o.symbols
        starts = sorted({a & ~1 for addrs in nm.values() for a in addrs})
        self.ends = {n: next(a for a in starts if a > self.f[n]) for n in ("VBlankIntr",)}
        self.core = self.o.core
        self.native, self.gpr = self.core._core, self.core.cpu._native.gprs
        self._step, self._fc = self.native.step, self.native.frameCounter
        self.frameno = 0  # frames run since reset (0-indexed: the next frame to run)
        # the ELF's code symbols, static ones included (the linker map lacks statics such as GetFactoryMonId), for caller names
        code = sorted({(a & ~1, n) for n, addrs in nm.items() for a in addrs if 0x08000000 <= a < 0x0A000000})
        self._addrs, self._syms = [a for a, _ in code], code

    # -- memory --------------------------------------------------------------
    def u8(self, a): return self.o.read_u8(a)
    def u16(self, a): return self.o.read_u16(a)
    def s16(self, a):
        v = self.o.read_u16(a)
        return v - 0x10000 if v & 0x8000 else v
    def u32(self, a): return self.o.read_u32(a)
    def w16(self, a, v): self.o.write_u16(a, v)
    def w32(self, a, v): self.o.write_u32(a, v)
    def read(self, a, n): return bytes(self.core.memory.u8[a:a + n])
    def sb2(self): return self.u32(self.s["gSaveBlock2Ptr"])
    def sb1(self): return self.u32(self.s["gSaveBlock1Ptr"])
    def rng(self): return self.u32(self.s["gRngValue"])
    def rand_count(self): return self.u32(self.d["sRandCount"])
    def reg(self, i): return int(self.gpr[i]) & 0xFFFFFFFF

    def state(self): return bytes(ffi.buffer(self.core.save_raw_state()))
    def load(self, st, frameno):
        self.core.load_raw_state(st)
        self.o._set_buttons([])
        self.frameno = frameno

    def screen_sha(self): return hashlib.sha256(self.o._render_rgb()).hexdigest()
    def screen_png(self): return self.o.screen_png()

    def caller(self, lr):
        import bisect
        i = bisect.bisect_right(self._addrs, (lr & ~1) - 2) - 1
        return self._syms[i][1] if i >= 0 else hex(lr)

    def in_vblank(self, lr): return self.f["VBlankIntr"] <= (lr & ~1) < self.ends["VBlankIntr"]

    # -- frames --------------------------------------------------------------
    def fast(self, buttons=()):
        self.o._set_buttons(list(buttons))
        self.core.run_frame()
        self.o._screen_stale = False
        self.frameno += 1

    def frame(self, buttons=(), traps=None):
        """One frame stepped instruction by instruction; `traps` {pc: callback} (entry trap = function address + 2, the pipelined
        Thumb PC, as romRun.py). A callback may add traps to the same dict (return traps)."""
        self.o._set_buttons(list(buttons))
        traps = traps if traps is not None else {}
        gpr, step, fc, native = self.gpr, self._step, self._fc, self.native
        start = fc(native)
        while fc(native) == start:
            t = traps.get(gpr[15])
            if t is not None:
                t()
            step(native)
        self.o._screen_stale = False
        self.frameno += 1

    def timeline(self):
        """The bootstrap's frames as [(buttons, pokes_before)] in order: scripted segments, then the pokes, then the settle frames."""
        out = []
        for seg in self.spec.get("segments", []):
            out += [tuple(seg.get("buttons", []))] * int(seg["frames"])
        return out, len(out), int(self.spec.get("settleFrames", 0))

    def apply_pokes(self):
        for poke in self.spec.get("pokes", []):
            addr = self.o.resolve_poke_addr(poke)
            for i, v in enumerate(poke["bytes"]):
                self.o.write_u8(addr + i, v)

    def replay(self, upto=None, per_frame=None):
        """Run the bootstrap from frame `self.frameno` (0 after construction) to frame `upto` (exclusive; None = the whole bootstrap).
        `per_frame(rom, buttons)` may run the frame itself (return True) or leave it to the fast path (return False/None)."""
        frames, scripted, settle = self.timeline()
        total = scripted + settle
        upto = total if upto is None else upto
        while self.frameno < upto:
            if self.frameno == scripted:
                self.apply_pokes()
            buttons = frames[self.frameno] if self.frameno < scripted else ()
            if not (per_frame and per_frame(self, buttons)):
                self.fast(buttons)
        if upto == total and scripted == total:
            self.apply_pokes()
        return total

    # -- records -------------------------------------------------------------
    def rentals(self):
        base = self.sb2() + SB2_RENTAL_MONS
        out = []
        for k in range(6):
            a = base + RENTAL_MON_SIZE * k
            out.append({"setId": self.u16(a), "personality": self.u32(a + 4), "ivs": self.u8(a + 8), "abilityNum": self.u8(a + 9)})
        return out

    def frontier(self):
        s2 = self.sb2()
        return {
            "lvlMode": self.u8(s2 + SB2_LVL_MODE) & 3,
            "battleNum": self.u16(s2 + SB2_BATTLE_NUM),
            "trainerIds": [self.u16(s2 + SB2_TRAINER_IDS + 2 * i) for i in range(7)],
            "winStreakActiveFlags": hex(self.u32(s2 + SB2_STREAK_FLAGS)),
            "factoryWinStreaks": [self.u16(s2 + SB2_FACTORY_STREAK + 2 * i) for i in range(4)],
            "factoryRentsCount": [self.u16(s2 + SB2_FACTORY_RENTS + 2 * i) for i in range(4)],
            "towerWinStreakSingles50": self.u16(s2 + SB2_TOWER_STREAK_SINGLES_50),
            "trainer": self.u16(self.s["gTrainerBattleOpponent_A"]),
            "opponentSetIds": [self.u16(self.s["gFrontierTempParty"] + 2 * i) for i in range(3)],
        }

    def read_mon(self, addr, size=POKEMON_SIZE):
        raw = self.read(addr, size)
        return decode_mon(raw)

    def select_mons(self):
        scr = self.u32(self.d["sFactorySelectScreen"])
        if not scr:
            return None
        out = []
        for k in range(6):
            m = scr + SELECT_MONS + SELECT_MON_SIZE * k
            rec = decode_mon(self.read(m + SELECT_MON_DATA, POKEMON_SIZE))
            rec["setId"] = self.u16(m)
            out.append(rec)
        return out

    def party(self, symbol):
        return [decode_mon(self.read(self.s[symbol] + POKEMON_SIZE * i, POKEMON_SIZE)) for i in range(3)]


def decode_mon(raw):
    personality, ot_id = struct.unpack_from("<II", raw, 0)
    logical, ok = decrypt_mon(raw)
    g, a, e, m = logical
    species, item, exp = struct.unpack_from("<HHI", g, 0)
    pp_bonuses, friendship = g[8], g[9]
    moves = list(struct.unpack_from("<4H", a, 0))
    pp = list(a[8:12])
    evs = list(e[0:6])
    ivw = struct.unpack_from("<I", m, 4)[0]
    ivs = [(ivw >> (5 * j)) & 31 for j in range(6)]
    level = raw[84]
    hp = struct.unpack_from("<H", raw, 86)[0]
    st = list(struct.unpack_from("<6H", raw, 88))  # maxHP, attack, defense, speed, spAttack, spDefense (struct Pokemon order)
    return {
        "checksumOk": ok, "personality": personality, "otId": ot_id, "nature": NATURES.get(personality % 25, personality % 25),
        "species": species, "speciesName": SPECIES.get(species), "level": level, "experience": exp,
        "heldItem": item, "heldItemName": ITEMS.get(item), "friendship": friendship, "ppBonuses": pp_bonuses,
        "moves": moves, "moveNames": [MOVES.get(x) for x in moves], "pp": pp,
        "ivs": ivs, "evs": evs, "abilityNum": ivw >> 31, "isEgg": (ivw >> 30) & 1,
        "hp": hp, "stats": dict(zip(("maxHP", "attack", "defense", "speed", "spAttack", "spDefense"), st)),
    }


def write_json(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, indent=1) + "\n")
