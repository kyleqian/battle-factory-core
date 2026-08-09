#!/usr/bin/env python3
"""Compact semantic receipt for the Gate-6 Explosion/Damp family."""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def lcg_calls(start: int, end: int, limit: int = 32) -> int | None:
    value = start
    for calls in range(limit + 1):
        if value == end:
            return calls
        value = (1103515245 * value + 24691) & 0xFFFFFFFF
    return None


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    request = validate_request(fixture, PROFILE)
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS_ROOT / "oracle" / "bootstrap" / "factory-battle-scene-off.json",
    )
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    symbols = oracle.symbols
    damp_script = symbols["BattleScript_DampStopsExplosion"]

    def snapshot(frame: int) -> dict:
        state = lab.snapshot()
        battle_resources = oracle.read_u32(symbols["gBattleResources"])
        battle_history = oracle.read_u32(battle_resources + 24)
        script = oracle.read_u32(symbols["gBattlescriptCurrInstr"])
        return {
            "frame": frame,
            "rngValue": state["rngValue"],
            "currentMove": state["engine"]["currentMove"],
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "target": oracle.read_u8(symbols["gBattlerTarget"]),
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "abilityHistory": [oracle.read_u8(battle_history + 64 + i) for i in range(4)],
            "script": {"address": script, "symbol": "BattleScript_DampStopsExplosion" if script == damp_script else None},
            "player": {"hp": state["battlers"]["player"]["hp"], "pp": state["battlers"]["player"]["pp"]},
            "opponent": {"hp": state["battlers"]["opponent"]["hp"], "pp": state["battlers"]["opponent"]["pp"]},
        }

    initial = snapshot(0)
    damp = None
    resolved = None
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        state = snapshot(frame)
        if damp is None and state["script"]["symbol"] == "BattleScript_DampStopsExplosion":
            damp = state
        if resolved is None and state["currentMove"] == 153 and state["player"]["pp"][0] == 4:
            if damp is not None:
                resolved = damp
            elif state["player"]["hp"] == 0 and state["opponent"]["hp"] != initial["opponent"]["hp"]:
                resolved = state
        if resolved is not None:
            break

    if resolved is None:
        raise SystemExit("Explosion arm did not resolve within the fixture trace")
    result = {
        "schema": "gate6-damp-explosion-off-probe/v1",
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "initial": initial,
        "resolved": resolved,
        "actionRngCalls": lcg_calls(initial["rngValue"], resolved["rngValue"]),
        "dampFailureScript": {"symbol": "BattleScript_DampStopsExplosion", "address": damp_script},
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH}", flush=True)


main()
