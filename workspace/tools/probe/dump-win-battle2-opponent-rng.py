#!/usr/bin/env python3
"""Dev-time RAM probe: pin the ROM's real `gRngValue` at the battle-2
opponent-generation point on the committed WIN GO ON route, attribute every
Random() call around it, and read the far side's realized opponent party.

Replays the committed mechanicLab fixture
`tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`
verbatim through its 39 segments, then (in the `party` phase) presses the
held battle-room quote once and reads the freshly constructed battle-2
`gEnemyParty` from RAM (box-decrypted: species, personality, item per slot)
together with `gFrontierTempParty` and `gRngValue`.

Phase `selection` (the single-frame verdict) fast-forwards to the generation
frame (6636) and CPU-single-steps it, LR-attributing every `Random()` call
and capturing `gRngValue` at `GenerateOpponentMons` entry and return.

Run through the teardown-safe wrapper, twice fresh:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-win-battle2-opponent-rng.py <fresh-output.json> --phase selection
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-win-battle2-opponent-rng.py <fresh-output.json> --phase party
"""

from __future__ import annotations

import bisect
import json
import struct
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (4,):
    raise SystemExit(
        f"usage: {sys.argv[0]} <output.json> --phase selection|party|construction"
    )
OUTPUT_PATH = Path(sys.argv[1])
PHASE = sys.argv[3]
if PHASE not in ("selection", "party", "construction"):
    raise SystemExit(f"unknown phase {PHASE!r}")

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
FIXTURE_PATH = (
    WORKTREE_ROOT
    / "tools"
    / "battle-lab"
    / "scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json"
)

SRANDCOUNT_ADDR = 0x020249C0  # source static: src/random.c:5
RANDOM_ENTRY_PC = 0x0806F5CE  # Random() entry, pipelined Thumb PC (+2)
GENERATE_OPPONENT_MONS_ENTRY_PC = 0x081A61B2  # battle_factory.o's GenerateOpponentMons
GET_RANDOM_SCALED_FRONTIER_TRAINER_ID_ENTRY_PC = 0x0816254A
GET_FACTORY_MON_ID_ENTRY_PC = 0x081A6EF2
FILL_FACTORY_FRONTIER_TRAINER_PARTY_ENTRY_PC = 0x081635D6

GENERATION_FRAME = 6636  # empirically found: gTrainerBattleOpponent_A flips 50 -> 9

POKEMON_SIZE = 100
SUBSTRUCT_POSITIONS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2),
    (0, 2, 3, 1), (0, 3, 2, 1), (1, 0, 2, 3), (1, 0, 3, 2),
    (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2),
    (2, 3, 0, 1), (3, 2, 0, 1), (1, 2, 3, 0), (1, 3, 2, 0),
    (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)
STAT_NAMES = ("hp", "attack", "defense", "speed", "spAttack", "spDefense")


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab  # noqa: E402

ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

EXPECTED_CANONICAL_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"


def symbols(elf: Path) -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        capture_output=True, text=True, check=True,
    ).stdout
    rows = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] in ("t", "T"):
            rows.append((int(fields[0], 16), fields[2]))
    return rows


def symbol_at(table: list[tuple[int, str]], address: int) -> str:
    index = bisect.bisect_right(table, (address, "\uffff")) - 1
    if index < 0:
        return f"0x{address:08x}"
    base, name = table[index]
    return name if address == base else f"{name}+0x{address - base:x}"


def read_bytes(oracle, base: int, length: int) -> bytes:
    return bytes(oracle.read_u8(base + offset) for offset in range(length))


def decrypt_party_mon(oracle, base: int) -> dict:
    personality = oracle.read_u32(base)
    ot_id = oracle.read_u32(base + 4)
    key = personality ^ ot_id
    encrypted = read_bytes(oracle, base + 32, 48)
    physical = b"".join(
        struct.pack("<I", struct.unpack("<I", encrypted[o:o + 4])[0] ^ key)
        for o in range(0, 48, 4)
    )
    logical: list[bytes | None] = [None, None, None, None]
    for logical_id, physical_index in enumerate(SUBSTRUCT_POSITIONS[personality % 24]):
        logical[logical_id] = physical[physical_index * 12:(physical_index + 1) * 12]
    core, moves_data, ev_data, iv_data = logical
    species, item, _, _, friendship, _ = struct.unpack("<HHIBBH", core)
    moves = list(struct.unpack("<4H", moves_data[:8]))
    iv_word = struct.unpack("<I", iv_data[4:8])[0]
    ability_slot = (iv_word >> 31) & 1
    return {
        "personality": personality,
        "otId": ot_id,
        "species": species,
        "item": item,
        "nature": personality % 25,
        "abilitySlot": ability_slot,
        "friendship": friendship,
        "moves": moves,
        "checksumValid": (
            sum(struct.unpack("<24H", b"".join(logical))) & 0xFFFF
        ) == oracle.read_u16(base + 28),
    }


def stage_fixture(oracle) -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    request = {key: value for key, value in fixture.items() if key != "trace"}
    request.setdefault("rentalSwapCount", 0)
    request.setdefault("preCheckpointCaptureFrames", [])
    request.setdefault("preCheckpointCaptureAllFrames", False)
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)
    return fixture


def replay(oracle, fixture) -> None:
    for segment in fixture["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)


def run_selection_phase() -> dict:
    table = symbols((REFERENCE_POKEEMERALD / "pokeemerald.elf").resolve())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}")
    fixture = stage_fixture(oracle)

    calls: list[dict] = []
    gen_entry: dict | None = None
    gen_return: dict | None = None
    pending_gen: dict | None = None
    tick = 0
    for segment in fixture["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            tick += 1
            if tick == GENERATION_FRAME:
                oracle._set_buttons(buttons)
                start_counter = oracle.core.frame_counter
                steps = 0
                while True:
                    pc = oracle.core.cpu.pc
                    if pc == RANDOM_ENTRY_PC:
                        pre = oracle.read_u32(oracle.symbols["gRngValue"])
                        lr = oracle.core.cpu.lr
                        calls.append({
                            "caller": symbol_at(table, lr),
                            "lr": f"0x{lr:08x}",
                            "pre": pre,
                            "post": (pre * 1103515245 + 24691) & 0xFFFFFFFF,
                        })
                    elif pc == GENERATE_OPPONENT_MONS_ENTRY_PC and pending_gen is None:
                        pending_gen = {
                            "frame": tick,
                            "lr": oracle.core.cpu.lr,
                            "rngAtEntry": oracle.read_u32(oracle.symbols["gRngValue"]),
                        }
                        gen_entry = pending_gen
                    elif (
                        pending_gen is not None
                        and pc in (pending_gen["lr"] & ~1, (pending_gen["lr"] & ~1) + 2, pending_gen["lr"])
                        and gen_return is None
                    ):
                        gen_return = {
                            "frame": tick,
                            "rngAtReturn": oracle.read_u32(oracle.symbols["gRngValue"]),
                            "returnPc": f"0x{pc:08x}",
                        }
                        pending_gen = None
                    if oracle.core.frame_counter != start_counter:
                        break
                    oracle.core.step()
                    steps += 1
                    if steps > 20_000_000:
                        raise RuntimeError(f"frame {tick} did not end while single-stepping")
                oracle._screen_stale = False
                oracle.frame += 1
            else:
                oracle.advance(buttons)

    return {
        "phase": "selection",
        "generationFrame": GENERATION_FRAME,
        "genEntry": gen_entry,
        "genReturn": gen_return,
        "randomCalls": calls,
        "tempParty": [
            oracle.read_u16(oracle.symbols["gFrontierTempParty"] + i * 2)
            for i in range(3)
        ],
        "opponentA": oracle.read_u16(oracle.symbols["gTrainerBattleOpponent_A"]),
        "rngValueAfter": oracle.read_u32(oracle.symbols["gRngValue"]),
    }


def run_party_phase() -> dict:
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}")
    fixture = stage_fixture(oracle)
    replay(oracle, fixture)
    before_press = oracle.read_u32(oracle.symbols["gRngValue"])
    # Press A once to dismiss the held quote, then idle past closemessage,
    # HealPlayerParty, and DoSpecialTrainerBattle's party construction
    # (the three construction bursts land ~11313-11335; read after them).
    oracle.advance(["A"])
    for _ in range(45):
        oracle.advance([])
    after = oracle.read_u32(oracle.symbols["gRngValue"])
    enemy_base = oracle.symbols["gEnemyParty"]
    return {
        "phase": "party",
        "rngBeforeQuotePress": before_press,
        "rngAfterSetup": after,
        "tempParty": [
            oracle.read_u16(oracle.symbols["gFrontierTempParty"] + i * 2)
            for i in range(3)
        ],
        "opponentA": oracle.read_u16(oracle.symbols["gTrainerBattleOpponent_A"]),
        "enemyParty": [
            decrypt_party_mon(oracle, enemy_base + i * POKEMON_SIZE)
            for i in range(3)
        ],
        "battleNum": oracle.read_u16(
            oracle.read_u32(oracle.symbols["gSaveBlock2Ptr"]) + 0xCB2
        ),
    }


def run_construction_phase() -> dict:
    table = symbols((REFERENCE_POKEEMERALD / "pokeemerald.elf").resolve())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}")
    fixture = stage_fixture(oracle)
    replay(oracle, fixture)
    # 2-tick A dismissing the held quote (matching the fixture press style),
    # then single-step frames 11311..11345 watching FillFactoryFrontierTrainerParty.
    oracle.advance(["A"])
    oracle.advance(["A"])
    calls: list[dict] = []
    fill_entry: dict | None = None
    fill_return: dict | None = None
    pending_fill: dict | None = None
    tick = 11310
    for frame_no in range(11311, 11346):
        oracle._set_buttons([])
        start_counter = oracle.core.frame_counter
        steps = 0
        while True:
            pc = oracle.core.cpu.pc
            if pc == RANDOM_ENTRY_PC:
                pre = oracle.read_u32(oracle.symbols["gRngValue"])
                lr = oracle.core.cpu.lr
                calls.append({
                    "frame": frame_no,
                    "caller": symbol_at(table, lr),
                    "lr": f"0x{lr:08x}",
                    "pre": pre,
                    "post": (pre * 1103515245 + 24691) & 0xFFFFFFFF,
                })
            elif pc == FILL_FACTORY_FRONTIER_TRAINER_PARTY_ENTRY_PC and pending_fill is None:
                pending_fill = {
                    "frame": frame_no,
                    "lr": oracle.core.cpu.lr,
                    "rngAtEntry": oracle.read_u32(oracle.symbols["gRngValue"]),
                }
                fill_entry = pending_fill
            elif (
                pending_fill is not None
                and fill_return is None
                and pc in (pending_fill["lr"] & ~1, (pending_fill["lr"] & ~1) + 2, pending_fill["lr"])
            ):
                fill_return = {
                    "frame": frame_no,
                    "rngAtReturn": oracle.read_u32(oracle.symbols["gRngValue"]),
                    "returnPc": f"0x{pc:08x}",
                }
                pending_fill = None
            if oracle.core.frame_counter != start_counter:
                break
            oracle.core.step()
            steps += 1
            if steps > 20_000_000:
                raise RuntimeError(f"frame {frame_no} did not end while single-stepping")
        oracle._screen_stale = False
        oracle.frame += 1
        tick = frame_no
    return {
        "phase": "construction",
        "fillEntry": fill_entry,
        "fillReturn": fill_return,
        "randomCalls": calls,
        "tempParty": [
            oracle.read_u16(oracle.symbols["gFrontierTempParty"] + i * 2)
            for i in range(3)
        ],
        "opponentA": oracle.read_u16(oracle.symbols["gTrainerBattleOpponent_A"]),
    }


def main() -> None:
    if PHASE == "selection":
        result = run_selection_phase()
    elif PHASE == "party":
        result = run_party_phase()
    else:
        result = run_construction_phase()
    result["canonicalScreenSha256"] = EXPECTED_CANONICAL_SHA256
    OUTPUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"wrote {OUTPUT_PATH}", flush=True)


if __name__ == "__main__":
    main()
