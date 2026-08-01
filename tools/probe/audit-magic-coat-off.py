#!/usr/bin/env python3
"""Read Magic Coat's legal Scene-OFF battle-lab state without ROM writes.

BattleLab performs the approved legal construction and ordinary controller
input drives the move.  This probe only observes the live state transitions
needed to audit Cmd_attackcanceler's Magic Coat intercept.
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
MOVE_MAGIC_COAT = 277
MOVE_TAIL_WHIP = 39
PROTECT_BOUNCE_MOVE = 1 << 4
HITMARKER_ALLOW_NO_PP = 1 << 23
HITMARKER_OBEYS = 1 << 25


def main() -> None:
    raw = json.loads(SCENARIO_PATH.read_text())
    if raw.get("profile") != "battle-scene-off":
        raise ValueError("Magic Coat audit requires Battle Scene OFF")
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
        hit_marker = oracle.read_u32(symbols["gHitMarker"])
        return {
            "currentMove": u16(symbols["gCurrentMove"]),
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "target": oracle.read_u8(symbols["gBattlerTarget"]),
            "scriptingBattler": oracle.read_u8(symbols["gBattleScripting"]),
            "hitMarker": hit_marker,
            "obeys": bool(hit_marker & HITMARKER_OBEYS),
            "allowNoPp": bool(hit_marker & HITMARKER_ALLOW_NO_PP),
            "bounceMove": [bool(oracle.read_u32(protect + battler * 4) & PROTECT_BOUNCE_MOVE)
                           for battler in range(2)],
            # BattlePokemon.statStages[] @0x18, index order HP,ATK,DEF,SPEED,SPATK,SPDEF,ACC,EVA
            # (6 = neutral). The old "attackStages" read at 0x3A was the last
            # nickname byte, not a stat stage.
            "statStages": [[oracle.read_u8(mons + battler * BATTLE_MON_SIZE + 0x18 + stat)
                            for stat in range(8)] for battler in range(2)],
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
        "moves": {"magicCoat": MOVE_MAGIC_COAT, "tailWhip": MOVE_TAIL_WHIP},
        "totalFrames": tick,
        "transitions": transitions,
    }, indent=2) + "\n")


main()
