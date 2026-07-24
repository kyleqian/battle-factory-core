#!/usr/bin/env python3
"""Read Protect's legal Scene-OFF attack-canceler branch without ROM writes."""

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
PROTECT_PROTECTED = 1 << 0
STATUS2_MULTIPLETURNS = 1 << 12
MOVE_RESULT_MISSED = 1 << 0


def main() -> None:
    raw = json.loads(SCENARIO_PATH.read_text())
    if raw.get("profile") != "battle-scene-off":
        raise ValueError("Protect audit requires Battle Scene OFF")
    request = validate_request(raw, "battle-scene-off")
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    )
    BattleLab(oracle, "battle-scene-off").prepare(request)
    symbols = oracle.symbols

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def snapshot() -> dict[str, object]:
        mons = symbols["gBattleMons"]
        protect = symbols["gProtectStructs"]
        status2 = [oracle.read_u32(mons + battler * BATTLE_MON_SIZE + 0x50)
                   for battler in range(2)]
        result = oracle.read_u8(symbols["gMoveResultFlags"])
        return {
            "currentMove": u16(symbols["gCurrentMove"]),
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "target": oracle.read_u8(symbols["gBattlerTarget"]),
            "protected": [bool(oracle.read_u32(protect + battler * 4) & PROTECT_PROTECTED)
                          for battler in range(2)],
            "multipleTurns": [bool(value & STATUS2_MULTIPLETURNS) for value in status2],
            "moveResultFlags": result,
            "missed": bool(result & MOVE_RESULT_MISSED),
            "lastLandedMoves": [u16(symbols["gLastLandedMoves"] + battler * 2)
                                for battler in range(2)],
            "lastHitByType": [oracle.read_u8(symbols["gLastHitByType"] + battler)
                              for battler in range(2)],
            "hp": [u16(mons + battler * BATTLE_MON_SIZE + 0x28) for battler in range(2)],
            "pp": [[oracle.read_u8(mons + battler * BATTLE_MON_SIZE + 0x24 + slot)
                    for slot in range(4)] for battler in range(2)],
        }

    transitions: list[dict[str, object]] = []
    prior: dict[str, object] | None = None
    tick = 0

    def capture() -> None:
        nonlocal prior
        state = snapshot()
        if state != prior:
            transitions.append({"tick": tick, **state})
            prior = state

    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
            capture()

    OUTPUT_PATH.write_text(json.dumps({
        "profile": "battle-scene-off",
        "scenario": SCENARIO_PATH.name,
        "readOnlyAfterConstruction": True,
        "totalFrames": tick,
        "transitions": transitions,
    }, indent=2) + "\n")


main()
