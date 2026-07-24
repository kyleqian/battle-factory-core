#!/usr/bin/env python3
"""Read Factory's disobedience inputs after one legal Scene-OFF construction.

This deliberately does not call ``IsMonDisobedient``: calling that helper can
advance RNG and write battle state outside its early-return path.  The probe
therefore observes only the real Factory flags and the already constructed
active battle mons.  Source establishes the helper's branch order.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} SCENARIO.json OUTPUT.json")

SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find the harness root")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


BATTLE_MON_SIZE = 0x58
BATTLE_TYPE_TRAINER = 1 << 3
BATTLE_TYPE_FACTORY = 1 << 19
BATTLE_TYPE_FRONTIER = 0x003F0100
BATTLE_MON_LEVEL = 0x2A
BATTLE_MON_OT_ID = 0x54
SAVEBLOCK2_PLAYER_TRAINER_ID = 0x0A


def main() -> None:
    raw_request = json.loads(SCENARIO_PATH.read_text())
    if raw_request.get("profile") != "battle-scene-off":
        raise ValueError("Factory disobedience evidence requires Battle Scene OFF")
    if raw_request.get("mode") != "factoryLegal":
        raise ValueError("Factory disobedience evidence requires factoryLegal construction")
    if raw_request.get("level") != 50:
        raise ValueError("Factory disobedience evidence is limited to Level-50 singles")

    request = validate_request(raw_request, "battle-scene-off")
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    )
    BattleLab(oracle, "battle-scene-off").prepare(request)
    symbols = oracle.symbols

    # Emerald's CPU word load rotates an unaligned address.  The trainer ID
    # begins at SaveBlock2+0x0A, so compose it byte-wise instead.
    def u32(address: int) -> int:
        return sum(oracle.read_u8(address + offset) << (8 * offset) for offset in range(4))

    battle_type_flags = oracle.read_u32(symbols["gBattleTypeFlags"])
    save_block2 = oracle.read_u32(symbols["gSaveBlock2Ptr"])
    player_trainer_id = u32(save_block2 + SAVEBLOCK2_PLAYER_TRAINER_ID)
    battle_mons = symbols["gBattleMons"]

    def mon(slot: int) -> dict[str, int | bool]:
        base = battle_mons + slot * BATTLE_MON_SIZE
        ot_id = u32(base + BATTLE_MON_OT_ID)
        return {
            "slot": slot,
            "level": oracle.read_u8(base + BATTLE_MON_LEVEL),
            "otId": ot_id,
            "otMatchesPlayerTrainerId": ot_id == player_trainer_id,
        }

    OUTPUT_PATH.write_text(json.dumps({
        "profile": "battle-scene-off",
        "scenario": SCENARIO_PATH.name,
        "readOnly": True,
        "battleTypeFlags": battle_type_flags,
        "hasTrainer": bool(battle_type_flags & BATTLE_TYPE_TRAINER),
        "hasFactory": bool(battle_type_flags & BATTLE_TYPE_FACTORY),
        "hasFrontier": bool(battle_type_flags & BATTLE_TYPE_FRONTIER),
        "hasDouble": bool(battle_type_flags & 1),
        "playerTrainerId": player_trainer_id,
        "battleMons": [mon(0), mon(1)],
        "rngValueAfterConstruction": oracle.read_u32(symbols["gRngValue"]),
        "boundary": (
            "No helper call or ROM write: source supplies the early-return result; "
            "this probe only establishes the real Factory construction inputs."
        ),
    }, indent=2) + "\n")


main()
