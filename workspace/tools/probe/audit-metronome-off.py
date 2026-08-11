#!/usr/bin/env python3
"""Read-only Battle Scene OFF Metronome selection and attribution receipt."""
from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} SCENARIO.json OUTPUT.json")

SCENARIO_PATH, OUTPUT_PATH = map(Path, sys.argv[1:])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find harness oracle")


ORACLE_DIR = harness_root(WORKTREE_ROOT) / "oracle"
sys.path.insert(0, str(ORACLE_DIR))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle

MOVE_METRONOME = 118
MOVES_COUNT = 355
BATTLE_MON_SIZE = 0x58
SRANDCOUNT_ADDR = 0x020249C0  # static src/random.c:5; not in linker map
FORBIDDEN = {
    118, 165, 166, 102, 68, 243, 182, 197, 203, 194, 214, 168, 266, 289,
    270, 343, 271, 264,
}


def lcg_draw(value: int) -> tuple[int, int]:
    next_value = (value * 1103515245 + 24691) & 0xFFFFFFFF
    return next_value, next_value >> 16


def main() -> None:
    raw = json.loads(SCENARIO_PATH.read_text())
    if raw.get("profile") != "battle-scene-off":
        raise ValueError("requires battle-scene-off")
    req = validate_request(raw, "battle-scene-off")
    ref = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json")
    BattleLab(oracle, "battle-scene-off").prepare(req)
    s = oracle.symbols

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def words(addr: int) -> list[int]:
        return [u16(addr + i * 2) for i in range(2)]

    def snapshot() -> dict:
        mons = s["gBattleMons"]
        return {
            "randCount": oracle.read_u32(SRANDCOUNT_ADDR),
            "rngValue": oracle.read_u32(s["gRngValue"]),
            "currentMove": u16(s["gCurrentMove"]),
            "chosenMove": u16(s["gChosenMove"]),
            "calledMove": u16(s["gCalledMove"]),
            "attacker": oracle.read_u8(s["gBattlerAttacker"]),
            "target": oracle.read_u8(s["gBattlerTarget"]),
            "pp": [[oracle.read_u8(mons + BATTLE_MON_SIZE * battler + 0x24 + slot)
                    for slot in range(4)] for battler in range(2)],
            "lastMoves": words(s["gLastMoves"]),
            "lastPrintedMoves": words(s["gLastPrintedMoves"]),
            "lastLandedMoves": words(s["gLastLandedMoves"]),
            "lastResultingMoves": words(s["gLastResultingMoves"]),
        }

    transitions: list[dict] = []
    selector_draws: list[dict] = []
    selector_starts: list[dict] = []
    prior = snapshot()
    tick = 0
    metronome_armed = False
    for segment in req["trace"]["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
            now = snapshot()
            if now != prior:
                transitions.append({"tick": tick, **now})
            is_metronome = (now["currentMove"] == MOVE_METRONOME
                            and now["chosenMove"] == MOVE_METRONOME)
            if is_metronome and not metronome_armed:
                metronome_armed = True
                selector_starts.append({"tick": tick, "randCount": now["randCount"],
                                        "rngValue": now["rngValue"]})
            if metronome_armed and now["randCount"] > prior["randCount"]:
                value = prior["rngValue"]
                for ordinal in range(now["randCount"] - prior["randCount"]):
                    value, output = lcg_draw(value)
                    candidate = (output & 0x1FF) + 1
                    reason = ("out-of-range" if candidate >= MOVES_COUNT
                              else "forbidden" if candidate in FORBIDDEN else "accepted")
                    selector_draws.append({"tick": tick, "ordinalInFrame": ordinal,
                                           "randomReturn": output, "candidate": candidate,
                                           "reason": reason})
                    if reason == "accepted":
                        metronome_armed = False
                        break
            prior = now

    OUTPUT_PATH.write_text(json.dumps({
        "profile": "battle-scene-off",
        "scenario": SCENARIO_PATH.name,
        "readOnlyAfterConstruction": True,
        "totalFrames": tick,
        "forbiddenMoveIds": sorted(FORBIDDEN),
        "selectorStarts": selector_starts,
        "selectorDraws": selector_draws,
        "transitions": transitions,
    }, indent=2) + "\n")


main()
