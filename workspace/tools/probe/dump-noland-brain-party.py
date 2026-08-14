#!/usr/bin/env python3
"""Dev-time RAM probe: capture the real ROM's `FillFactoryBrainParty`
(reference/pokeemerald/src/battle_factory.c:759-826 — the Frontier Brain
"Noland"'s Battle Factory party generator) with full `Random()` attribution.

Reuses the exact proven route from `dump-win-battle2-opponent-rng.py`
(the committed `scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`
mechanicLab fixture, replayed verbatim for its full 11308 frames) to reach
the real battle-2 party-construction window — the point, late in
`DoSpecialTrainerBattle`'s call chain, where
`FillFactoryFrontierTrainerParty` (battle_factory.c calls it from
`FillFactoryTrainerParty`; battle_tower.c:1852-1855 is the actual
`trainerId == TRAINER_FRONTIER_BRAIN` dispatch inside
`FillFactoryFrontierTrainerParty`) runs for real, RNG-driven, inside the
emulator.

At that point (after the fixture's own RNG-driven trainer-id selection at
its `GENERATE_OPPONENT_MONS` frame has already resolved — see the sibling
script's `GENERATION_FRAME` note — so nothing later in the flow depends on
or re-derives `gTrainerBattleOpponent_A`), this probe RAM-pokes three plain
(non-bitfield, or explicitly-masked-bitfield) SaveBlock2/var fields to
redirect that one dispatch onto the Frontier Brain path instead of the
fixture's own regular trainer:
  - `gSaveBlock2Ptr->frontier.factoryWinStreaks[FRONTIER_MODE_SINGLES][FRONTIER_LVL_50]`
    (absolute SaveBlock2 offset 0xDE2, confirmed against
    `oracle/battle_lab.py`'s `SB2_FACTORY_WIN_STREAK_SINGLES_50`) to the
    staged case's win streak.
  - `gSaveBlock2Ptr->frontier.curChallengeBattleNum` (offset 0xCB2) to 6
    (the 7th, last battle of a `FRONTIER_STAGES_PER_CHALLENGE`-battle
    challenge) — recorded for receipt fidelity; `FillFactoryBrainParty`
    itself never reads this field.
  - `gTrainerBattleOpponent_A` (a plain u16 global, not a bitfield) to
    `TRAINER_FRONTIER_BRAIN` (1022).
`VAR_FRONTIER_BATTLE_MODE` (save1 vars[0x40CE - 0x4000]) and the
`lvlMode:2` bitfield at SaveBlock2+0xCA9 are also force-set to
FRONTIER_MODE_SINGLES/FRONTIER_LVL_50 (both already 0 on this fixture, but
staged explicitly so the receipt can honestly claim it, not just observe
it) — the low 2 bits only, via `& ~0x3` on the existing byte.

`FillFactoryBrainParty` is then entered for real (2x "A" to dismiss the
held quote, matching the sibling script's construction-phase button
pattern, then CPU-single-stepping), LR-attributing every `Random()` call by
symbol-table bisection, and pairing each `GetFactoryMonId` call with the
u16 it returns in r0 at its single (compiler-deduplicated) call site inside
`FillFactoryBrainParty`'s `while` loop — this lets the probe re-run the
exact same accept/reject decision tree as the C source
(species==SPECIES_UNOWN / L50-high-tier / already-a-player-rental-monId /
duplicate-species / duplicate-item) against the *real* ROM-resident
`gFacilityTrainerMons`/`gBattleFrontierHeldItems` tables read live from
memory, not a hardcoded copy, and cross-check that reconstruction against
the realized `gEnemyParty`.

Run through the teardown-safe wrapper, twice fresh, from the workspace
root:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-noland-brain-party.py <fresh-output.json> silver
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-noland-brain-party.py <fresh-output.json> gold
"""

from __future__ import annotations

import bisect
import json
import struct
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3 or sys.argv[2] not in ("silver", "gold"):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> silver|gold")
OUTPUT_PATH = Path(sys.argv[1])
CASE_NAME = sys.argv[2]

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
FIXTURE_PATH = (
    WORKTREE_ROOT
    / "tools"
    / "battle-lab"
    / "scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json"
)


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
ELF_PATH = REFERENCE_POKEEMERALD / "pokeemerald.elf"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

EXPECTED_CANONICAL_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

# -- ROM addresses (arm-none-eabi-nm --defined-only reference/pokeemerald/pokeemerald.elf) --
# All *_ENTRY_PC constants are the function's own address + 2: libmgba-py's
# `cpu.pc` reads the pipelined Thumb PC (executing-instruction address + 2),
# not the retiring instruction's own address — see
# attribute-factory-ai-random-callers.py's module docstring for the
# empirical confirmation this convention rests on.
RANDOM_ENTRY_PC = 0x0806F5CC + 2
FILL_FACTORY_BRAIN_PARTY_ENTRY_PC = 0x081A6CD0 + 2
GET_FACTORY_MON_ID_ENTRY_PC = 0x081A6EF0 + 2
CREATE_MON_WITH_EV_SPREAD_ENTRY_PC = 0x08068634 + 2

# -- SaveBlock2 offsets (absolute within *gSaveBlock2Ptr; see
# tools/probe/dump-rentalmons.py's module docstring for the offset-comment
# gotcha this already resolved, and oracle/battle_lab.py's SB2_* constants
# this cross-checks against) --
SB2_LVL_MODE_BYTE = 0xCA9  # low 2 bits: lvlMode:2 (global.h:385)
SB2_CUR_CHALLENGE_BATTLE_NUM = 0xCB2  # global.h:390
SB2_FACTORY_WIN_STREAK_SINGLES_50 = 0xDE2  # global.h:423, [battleMode][lvlMode]
SB2_RENTAL_MONS = 0xE70  # global.h:448
SB2_PLAYER_TRAINER_ID = 0x0A  # global.h:513, TRAINER_ID_LENGTH == 4
RENTAL_MON_SIZE = 0xC

# -- SaveBlock1 vars array (global.h:1021) --
SB1_VARS = 0x139C
VAR_FRONTIER_BATTLE_MODE = 0x40CE
VARS_START = 0x4000

FRONTIER_MODE_SINGLES = 0
FRONTIER_LVL_50 = 0
TRAINER_FRONTIER_BRAIN = 1022  # include/constants/trainers.h:12
FRONTIER_STAGES_PER_CHALLENGE = 7
FRONTIER_MONS_HIGH_TIER = 849  # include/constants/battle_frontier_mons.h:862
SPECIES_UNOWN = 201
ITEM_NONE = 0

# battle_factory.c:157-167.
FIXED_IV_TABLE = ((3, 6), (6, 9), (9, 12), (12, 15), (15, 18), (21, 31), (31, 31), (31, 31))
# battle_factory.c:169-188 (Level 50 half only, adder == 0).
LEVEL_50_SET_RANGES = (
    (110, 199), (162, 266), (267, 371), (372, 467),
    (468, 563), (564, 659), (660, 755), (372, 849),
)

CASES = {
    # streak == win streak entering the battle; challengeNum == streak // 7.
    "silver": {"streak": 20, "challengeNum": 2, "monLevel": 50},
    "gold": {"streak": 41, "challengeNum": 5, "monLevel": 50},
}

FACILITY_MON_SIZE = 16  # agbcc rounds the 13-byte C struct up (battle_lab.py's comment).
POKEMON_SIZE = 100
SUBSTRUCT_POSITIONS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2),
    (0, 2, 3, 1), (0, 3, 2, 1), (1, 0, 2, 3), (1, 0, 3, 2),
    (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2),
    (2, 3, 0, 1), (3, 2, 0, 1), (1, 2, 3, 0), (1, 3, 2, 0),
    (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)


def build_symbol_table() -> list[tuple[int, str]]:
    out = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(ELF_PATH)],
        capture_output=True, text=True, check=True,
    ).stdout
    table: list[tuple[int, str]] = []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        addr_hex, kind, name = parts
        if kind not in ("t", "T"):
            continue
        table.append((int(addr_hex, 16), name))
    table.sort(key=lambda pair: pair[0])
    return table


def symbol_at(table: list[tuple[int, str]], address: int) -> str:
    index = bisect.bisect_right(table, (address, "￿")) - 1
    if index < 0:
        return f"0x{address:08x}"
    base, name = table[index]
    return name if address == base else f"{name}+0x{address - base:x}"


def read_bytes(oracle, base: int, length: int) -> bytes:
    return bytes(oracle.read_u8(base + offset) for offset in range(length))


def read_u32_unaligned(oracle, addr: int) -> int:
    # EmeraldOracle.read_u32 is a native `core.memory.u32[addr]` word read,
    # which silently rounds a non-4-byte-aligned `addr` down to the nearest
    # word boundary (confirmed empirically: reading SaveBlock2+0x0A, offset
    # 2 mod 4, returned the word at +0x08 instead). playerTrainerId sits at
    # SaveBlock2+0x0A (global.h:513), not 4-byte aligned, so it must be
    # read byte-by-byte (matching the source's own T1_READ_32 macro) rather
    # than through the native word accessor.
    return (
        oracle.read_u8(addr)
        | (oracle.read_u8(addr + 1) << 8)
        | (oracle.read_u8(addr + 2) << 16)
        | (oracle.read_u8(addr + 3) << 24)
    )


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
    evs = list(struct.unpack("<6B", ev_data[:6]))
    iv_word = struct.unpack("<I", iv_data[4:8])[0]
    ivs = {
        "hp": iv_word & 0x1F,
        "attack": (iv_word >> 5) & 0x1F,
        "defense": (iv_word >> 10) & 0x1F,
        "speed": (iv_word >> 15) & 0x1F,
        "spAttack": (iv_word >> 20) & 0x1F,
        "spDefense": (iv_word >> 25) & 0x1F,
    }
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
        "evs": {
            "hp": evs[0], "attack": evs[1], "defense": evs[2],
            "speed": evs[3], "spAttack": evs[4], "spDefense": evs[5],
        },
        "ivs": ivs,
        "checksumValid": (
            sum(struct.unpack("<24H", b"".join(logical))) & 0xFFFF
        ) == oracle.read_u16(base + 28),
    }


def stage_fixture(oracle) -> dict:
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


def main() -> None:
    case = CASES[CASE_NAME]
    symbol_table = build_symbol_table()
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}")
    fixture = stage_fixture(oracle)
    replay(oracle, fixture)  # the proven 11308-frame route to the party-construction window.

    save2 = oracle.read_u32(oracle.symbols["gSaveBlock2Ptr"])
    save1 = oracle.read_u32(oracle.symbols["gSaveBlock1Ptr"])
    trainer_a_addr = oracle.symbols["gTrainerBattleOpponent_A"]
    rng_addr = oracle.symbols["gRngValue"]
    battle_mode_var_addr = save1 + SB1_VARS + 2 * (VAR_FRONTIER_BATTLE_MODE - VARS_START)

    pre_poke = {
        "factoryWinStreakSingles50": oracle.read_u16(save2 + SB2_FACTORY_WIN_STREAK_SINGLES_50),
        "curChallengeBattleNum": oracle.read_u16(save2 + SB2_CUR_CHALLENGE_BATTLE_NUM),
        "lvlModeBits": oracle.read_u8(save2 + SB2_LVL_MODE_BYTE) & 0x3,
        "battleModeVar": oracle.read_u16(battle_mode_var_addr),
        "trainerBattleOpponentA": oracle.read_u16(trainer_a_addr),
        "rentalMons": [
            oracle.read_u16(save2 + SB2_RENTAL_MONS + i * RENTAL_MON_SIZE) for i in range(6)
        ],
        "playerTrainerId": read_u32_unaligned(oracle, save2 + SB2_PLAYER_TRAINER_ID),
        "gRngValue": oracle.read_u32(rng_addr),
    }

    # -- the actual staging poke: redirect the one dispatch onto the brain path --
    oracle.write_u16(save2 + SB2_FACTORY_WIN_STREAK_SINGLES_50, case["streak"])
    oracle.write_u16(save2 + SB2_CUR_CHALLENGE_BATTLE_NUM, FRONTIER_STAGES_PER_CHALLENGE - 1)
    oracle.write_u8(
        save2 + SB2_LVL_MODE_BYTE,
        (oracle.read_u8(save2 + SB2_LVL_MODE_BYTE) & ~0x3) | FRONTIER_LVL_50,
    )
    oracle.write_u16(battle_mode_var_addr, FRONTIER_MODE_SINGLES)
    oracle.write_u16(trainer_a_addr, TRAINER_FRONTIER_BRAIN)

    staged = {
        "factoryWinStreakSingles50": oracle.read_u16(save2 + SB2_FACTORY_WIN_STREAK_SINGLES_50),
        "curChallengeBattleNum": oracle.read_u16(save2 + SB2_CUR_CHALLENGE_BATTLE_NUM),
        "lvlModeBits": oracle.read_u8(save2 + SB2_LVL_MODE_BYTE) & 0x3,
        "battleModeVar": oracle.read_u16(battle_mode_var_addr),
        "trainerBattleOpponentA": oracle.read_u16(trainer_a_addr),
        "rentalMons": pre_poke["rentalMons"],  # unchanged by the poke; recorded for clarity.
        "playerTrainerId": pre_poke["playerTrainerId"],
        # NOT "immediately before the first Random() draw" -- several frames
        # of unrelated VBlankIntr/GetSpecialBattleTransition Random() calls
        # (closemessage's arrow bounce, etc.) still run between this poke and
        # FillFactoryBrainParty's actual entry. See fillEntry.rngAtEntry for
        # the value at entry, and randomCalls[0].pre for the value
        # immediately before the first Random() call inside the window.
        "gRngValueAtStaging": oracle.read_u32(rng_addr),
    }

    challenge_num = staged["factoryWinStreakSingles50"] // FRONTIER_STAGES_PER_CHALLENGE
    assert challenge_num == case["challengeNum"], (challenge_num, case)
    fixed_iv_set = min(challenge_num + 2, len(FIXED_IV_TABLE) - 1)
    expected_fixed_iv = FIXED_IV_TABLE[fixed_iv_set][0]  # isLastBattle == FALSE (battle_factory.c:772).
    monid_lo, monid_hi = LEVEL_50_SET_RANGES[challenge_num]

    facility_trainer_mons_ptr_addr = oracle.symbols["gFacilityTrainerMons"]
    held_items_addr = oracle.symbols["gBattleFrontierHeldItems"]

    def facility_mon(monid: int) -> dict:
        ptr = oracle.read_u32(facility_trainer_mons_ptr_addr)
        base = ptr + monid * FACILITY_MON_SIZE
        species = oracle.read_u16(base)
        item_table_id = oracle.read_u8(base + 10)
        held_item = oracle.read_u16(held_items_addr + item_table_id * 2)
        return {"species": species, "itemTableId": item_table_id, "heldItem": held_item}

    # -- press A twice to dismiss the held quote (matches the sibling script's
    # construction-phase button pattern exactly), then single-step. --
    oracle.advance(["A"])
    oracle.advance(["A"])

    random_calls: list[dict] = []
    ledger: list[dict] = []
    fill_entry: dict | None = None
    fill_return: dict | None = None
    pending_getmonid_lr: int | None = None
    accepted_species: list[int] = []
    accepted_items: list[int] = []
    current_draw: dict | None = None  # the in-flight GetFactoryMonId draw awaiting its r0.
    personality_attempts_for_current_accept: list[dict] = []
    accept_index = 0

    tick = 11310
    done = False
    for frame_no in range(11311, 11391):
        if done:
            break
        oracle._set_buttons([])
        start_counter = oracle.core.frame_counter
        steps = 0
        while True:
            pc = oracle.core.cpu.pc
            if pc == RANDOM_ENTRY_PC:
                pre = oracle.read_u32(rng_addr)
                lr = oracle.core.cpu.lr
                caller = symbol_at(symbol_table, lr)
                call = {
                    "frame": frame_no, "caller": caller, "lr": f"0x{lr:08x}",
                    "pre": pre, "post": (pre * 1103515245 + 24691) & 0xFFFFFFFF,
                }
                random_calls.append(call)
                if caller.startswith("CreateMonWithEVSpreadNatureOTID") and current_draw is None:
                    personality_attempts_for_current_accept.append(call)
            elif pc == FILL_FACTORY_BRAIN_PARTY_ENTRY_PC and fill_entry is None:
                fill_entry = {"frame": frame_no, "lr": oracle.core.cpu.lr, "rngAtEntry": oracle.read_u32(rng_addr)}
            elif (
                fill_entry is not None and fill_return is None
                and pc in (fill_entry["lr"] & ~1, (fill_entry["lr"] & ~1) + 2, fill_entry["lr"])
            ):
                fill_return = {"frame": frame_no, "rngAtReturn": oracle.read_u32(rng_addr), "returnPc": f"0x{pc:08x}"}
            elif pc == GET_FACTORY_MON_ID_ENTRY_PC and current_draw is None:
                pending_getmonid_lr = oracle.core.cpu.lr
                current_draw = {"frame": frame_no}
            elif (
                pending_getmonid_lr is not None and current_draw is not None
                and pc in (pending_getmonid_lr & ~1, (pending_getmonid_lr & ~1) + 2, pending_getmonid_lr)
            ):
                monid = oracle.core.cpu.gprs[0]
                mon = facility_mon(monid)
                if mon["species"] == SPECIES_UNOWN:
                    outcome = "reject_unown"
                elif monid > FRONTIER_MONS_HIGH_TIER:
                    outcome = "reject_l50_high_tier"
                elif monid in staged["rentalMons"]:
                    outcome = "reject_player_rental_monid"
                elif mon["species"] in accepted_species:
                    outcome = "reject_duplicate_species"
                elif mon["heldItem"] != ITEM_NONE and mon["heldItem"] in accepted_items:
                    outcome = "reject_duplicate_item"
                else:
                    outcome = "accept"
                draw_record = {
                    "drawIndex": len(ledger),
                    "frame": current_draw["frame"],
                    "monId": monid,
                    "species": mon["species"],
                    "heldItem": mon["heldItem"],
                    "outcome": outcome,
                    "personalityAttempts": [],
                }
                if outcome == "accept":
                    accepted_species.append(mon["species"])
                    accepted_items.append(mon["heldItem"])
                    draw_record["acceptSlot"] = accept_index
                    accept_index += 1
                ledger.append(draw_record)
                if outcome == "accept":
                    personality_attempts_for_current_accept = draw_record["personalityAttempts"]
                else:
                    personality_attempts_for_current_accept = []  # rejected draws never call CreateMon.
                current_draw = None
                pending_getmonid_lr = None
            if oracle.core.frame_counter != start_counter:
                break
            oracle.core.step()
            steps += 1
            if steps > 20_000_000:
                raise RuntimeError(f"frame {frame_no} did not end while single-stepping")
        oracle._screen_stale = False
        oracle.frame += 1
        tick = frame_no
        if fill_return is not None:
            done = True

    if fill_entry is None or fill_return is None:
        raise SystemExit(
            f"FillFactoryBrainParty was not observed within the scan window "
            f"(fill_entry={fill_entry}, fill_return={fill_return}); the staged "
            f"redirect likely did not take effect."
        )

    enemy_base = oracle.symbols["gEnemyParty"]
    enemy_party = [decrypt_party_mon(oracle, enemy_base + i * POKEMON_SIZE) for i in range(3)]

    first_factory_call = next(
        (c for c in random_calls if c["caller"].startswith("GetFactoryMonId")), None
    )

    result = {
        "case": CASE_NAME,
        "canonicalScreenSha256": EXPECTED_CANONICAL_SHA256,
        "fixture": str(FIXTURE_PATH.relative_to(WORKTREE_ROOT)),
        "prePoke": pre_poke,
        "staged": staged,
        "derived": {
            "challengeNum": challenge_num,
            "expectedFixedIV": expected_fixed_iv,
            "monIdRange": {"lo": monid_lo, "hi": monid_hi},
        },
        "fillEntry": fill_entry,
        "fillReturn": fill_return,
        # The literal "gRngValue immediately before FillFactoryBrainParty's
        # first Random() draw" -- the `pre` value of the first Random() call
        # attributed to GetFactoryMonId, not gRngValueAtStaging (see its
        # comment: unrelated VBlankIntr/GetSpecialBattleTransition Random()
        # calls still run between staging and this function's own draws).
        "rngValueBeforeFirstFactoryDraw": first_factory_call["pre"] if first_factory_call else None,
        "rngValueAfterLastConstructionDraw": fill_return["rngAtReturn"],
        "randomCallCount": len(random_calls),
        "randomCalls": random_calls,
        "drawLedger": ledger,
        "enemyParty": enemy_party,
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"wrote {OUTPUT_PATH}: {len(ledger)} monId draws, {len(random_calls)} Random() calls", flush=True)


if __name__ == "__main__":
    main()
