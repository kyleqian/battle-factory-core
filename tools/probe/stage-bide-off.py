#!/usr/bin/env python3
"""Capture compact read-only Bide internals from a legal Scene-OFF lab run.

The scenario is staged only through BattleLab's legal Factory construction;
the nested trace is ordinary controller input. This probe reads narrow RAM
fields that semantic captures intentionally do not publish, then writes only
an initial snapshot and later snapshots when a Bide-relevant observable
changes.
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
STATUS2_BIDE = 0x300
STATUS2_MULTIPLETURNS = 0x1000
BIDE_SCRIPTS = (
    ("BattleScript_BideStoringEnergy", 0x082DAD71, 0x082DAD7C),
    ("BattleScript_BideAttack", 0x082DAD7C, 0x082DADC4),
    ("BattleScript_BideNoEnergyToAttack", 0x082DADC4, 0x082DADD1),
)


def signed32(value: int) -> int:
    return value - 0x1_0000_0000 if value & 0x8000_0000 else value


def bide_script_label(pointer: int) -> str | None:
    for name, start, end in BIDE_SCRIPTS:
        if start <= pointer < end:
            return name
    return None


def main() -> None:
    raw_request = json.loads(SCENARIO_PATH.read_text())
    if raw_request.get("profile") != "battle-scene-off":
        raise ValueError("Bide evidence must use the Battle Scene OFF profile")
    request = validate_request(raw_request, "battle-scene-off")
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

    def state() -> dict:
        battle_mons = symbols["gBattleMons"]
        status2 = [oracle.read_u32(battle_mons + battler * BATTLE_MON_SIZE + 0x50)
                   for battler in range(2)]
        script_pointer = oracle.read_u32(symbols["gBattlescriptCurrInstr"])
        bide_dmg = [signed32(oracle.read_u32(symbols["gBideDmg"] + battler * 4))
                    for battler in range(2)]
        return {
            "bideTurns": [(value & STATUS2_BIDE) >> 8 for value in status2],
            "status2": status2,
            "multipleTurns": [bool(value & STATUS2_MULTIPLETURNS) for value in status2],
            "bideDmg": bide_dmg,
            "bideTarget": [oracle.read_u8(symbols["gBideTarget"] + battler)
                           for battler in range(2)],
            "scriptingBideDmg": signed32(oracle.read_u32(symbols["gBattleScripting"] + 4)),
            "currentMove": u16(symbols["gCurrentMove"]),
            "battlerAttacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "battlerTarget": oracle.read_u8(symbols["gBattlerTarget"]),
            "script": bide_script_label(script_pointer),
            "hp": [u16(battle_mons + battler * BATTLE_MON_SIZE + 0x28) for battler in range(2)],
            "pp": [[oracle.read_u8(battle_mons + battler * BATTLE_MON_SIZE + 0x24 + slot)
                    for slot in range(4)] for battler in range(2)],
        }

    snapshots: list[dict] = []
    prior = None
    tick = 0

    def capture() -> None:
        nonlocal prior
        current = state()
        if current != prior:
            snapshots.append({"tick": tick, **current})
            prior = current

    capture()
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            capture()

    OUTPUT_PATH.write_text(json.dumps({
        "profile": "battle-scene-off",
        "scenario": SCENARIO_PATH.name,
        "totalFrames": tick,
        "bideScripts": [name for name, _, _ in BIDE_SCRIPTS],
        "snapshots": snapshots,
    }, indent=2) + "\n")


main()
