#!/usr/bin/env python3
"""Mechanically re-check the BattleTurnPassed RNG-gap verdict.

Fast, hermetic check:
    python3 tools/probe/verify-turn-boundary-rng-gap.py

Optional Battle Scene OFF fixture check (run through the teardown wrapper):
    python3 tools/run-mgba-probe.py /tmp/fresh/result.json -- \
      /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
      tools/probe/verify-turn-boundary-rng-gap.py /tmp/fresh/result.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def static_checks() -> dict:
    source = text("reference/pokeemerald/src/battle_main.c")
    passed = source[source.index("void BattleTurnPassed(void)"):]
    passed = passed[:passed.index("\n}", passed.index("void BattleTurnPassed(void)"))]
    require(
        passed.index("TurnValuesCleanUp(FALSE);")
        < passed.index("gBattleMainFunc = HandleTurnActionSelectionState;")
        < passed.index("gRandomTurnNumber = Random();"),
        "ROM boundary draw is not after tail cleanup and action-selection callback assignment",
    )

    full_turn = text("src/engine/factoryBattleScriptFullTurnDecision.ts")
    end_turn = text("src/engine/battleEndTurnOrchestration.ts")
    require(
        "runBattleEndTurnOrchestration(PROGRAM, handlers, preEndTurnState)" in full_turn,
        "production full-turn reducer no longer enters end-turn orchestration",
    )
    require(
        "gRandomTurnNumber" not in full_turn and "gRandomTurnNumber" not in end_turn,
        "production path acquired an explicit random-turn-number model; revisit verdict",
    )
    require(
        "kind: \"next-turn\"" in end_turn
        and "rulesContext: finishTurnValuesCleanUp(result.state.rulesContext)" in end_turn,
        "next-turn tail shape changed; revisit the boundary audit",
    )

    old_model = text("src/engine/battleTurn.ts")
    old_fixture = text("src/engine/battle2OffScenario.ts")
    require(
        "scenario.turnEndRngGroups.forEach" in old_model
        and "turnEndRngGroups: [1, 2, 5]" in old_fixture,
        "legacy opaque whole-window draw model changed",
    )
    require(
        full_turn.count("turnEndRngGroups") == 0
        and end_turn.count("turnEndRngGroups") == 0,
        "legacy turnEndRngGroups leaked onto the production path",
    )

    full_turn_test = text("tests/factoryBattleScriptFullTurnDecision.test.ts")
    end_turn_test = text("tests/battleEndTurnOrchestration.test.ts")
    for assertion in (
        "expect(t1t.state.rng.calls).toBe(8)",
        "expect(t2t.state.rng.calls).toBe(16)",
        "expect(t1.state.rng.calls).toBe(19)",
        "expect(t2.state.rng.calls).toBe(38)",
    ):
        require(assertion in full_turn_test, f"missing staged RNG assertion: {assertion}")
    require(
        "expect(turn2.state.rng.calls).toBe(turn1.state.rng.calls)" in end_turn_test
        and "expect(turn2.state.rng.value).toBe(turn1.state.rng.value)" in end_turn_test,
        "clean multi-turn end-turn test no longer pins a frozen RNG cursor",
    )

    return {
        "verdict": "REFUTED",
        "rom": "one unconditional Random() after assigning the next action-selection callback, before that callback executes",
        "production": "no equivalent boundary draw",
        "legacy": "battleTurn.ts injects opaque fixture-owned whole-window groups only",
        "stagedAssertions": [8, 16, 19, 38],
    }


def iter_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def oracle_check(output_path: Path) -> dict:
    harness = ROOT
    while not (harness / "oracle" / "emerald_core.py").is_file():
        if harness.parent == harness:
            raise RuntimeError("could not find oracle/emerald_core.py")
        harness = harness.parent
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    fixture_path = ROOT / "tools/battle-lab/mechanic-swift-swim-turn-boundary-off.json"
    request = validate_request(json.loads(fixture_path.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    BattleLab(oracle, "battle-scene-off").prepare(request)

    current_move_addr = 0x020241EA
    attacker_addr = 0x0202420B
    random_turn_addr = 0x02024330
    rand_count_addr = 0x020249C0
    actions: list[dict] = []
    rand_frames: list[dict] = []
    previous_move = oracle.read_u16(current_move_addr)
    previous_count = oracle.read_u32(rand_count_addr)
    for frame, buttons in iter_frames(request["trace"]):
        oracle.advance(buttons)
        move = oracle.read_u16(current_move_addr)
        if move != previous_move and move != 0:
            actions.append({
                "frame": frame,
                "move": move,
                "attacker": oracle.read_u8(attacker_addr),
            })
        previous_move = move
        count = oracle.read_u32(rand_count_addr)
        delta = (count - previous_count) & 0xFFFFFFFF
        if delta:
            rand_frames.append({
                "frame": frame,
                "count": delta,
                "randomTurnNumber": oracle.read_u16(random_turn_addr),
            })
        previous_count = count

    expected_actions = [
        {"move": 1, "attacker": 1},
        {"move": 240, "attacker": 0},
        {"move": 61, "attacker": 0},
        {"move": 1, "attacker": 1},
    ]
    observed = [{"move": row["move"], "attacker": row["attacker"]} for row in actions]
    require(observed == expected_actions, f"unexpected two-turn action order: {observed}")
    observed_rand_frames = [(row["frame"], row["count"]) for row in rand_frames]
    expected_rand_frames = [
        (74, 1), (101, 1), (104, 1), (201, 1),
        (503, 1), (509, 5),
        (1042, 1), (1069, 1), (1072, 1), (1221, 1),
        (1233, 1), (1260, 1), (1263, 1), (1362, 1),
        (1499, 1), (1505, 5),
    ]
    require(
        observed_rand_frames == expected_rand_frames,
        f"unexpected OFF Random() frame ledger: {observed_rand_frames}",
    )
    require(
        sum(row["count"] for row in rand_frames) == 24
        and rand_frames[4]["randomTurnNumber"] == 2913
        and rand_frames[14]["randomTurnNumber"] == 1052,
        "OFF boundary random-turn-number checkpoints changed",
    )
    result = {
        "fixture": str(fixture_path.relative_to(ROOT)),
        "actions": actions,
        "order": ["Smeargle", "Surskit", "Surskit", "Smeargle"],
        "randFrames": rand_frames,
    }
    output_path.write_text(json.dumps({"static": static_checks(), "oracle": result}, indent=2) + "\n")
    return result


def main() -> None:
    static = static_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: REFUTED — production is one draw short at every clean turn boundary")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    output = Path(sys.argv[1])
    result = oracle_check(output)
    print(f"wrote {output}: {result['order']}", flush=True)


if __name__ == "__main__":
    main()
