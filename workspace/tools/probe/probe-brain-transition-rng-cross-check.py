#!/usr/bin/env python3
"""ISSUES #98 slice S0 -- the RNG decision-gate cross-check
docs/brain-transition-wiring-design.md's own S0 spec asks for: read the
ROM's own `gRngValue` (RAM 0x3005d80, `bin/oracle symbols gRngValue`)
across each walk-up fixture's own battle-lab scenario (gold
`factory-brain-gold-speech-close-off.json`, silver
`factory-brain-silver-walkup-speech-flicker-off.json`, both seed
305419896) at the moment `GetSpecialBattleTransition` performs its one
`Random()` draw, then compute `table[Random() % 12]` from the real value
and compare against §1's visual family identification (gold ->
CIRCLES_MEET_IN_SEQ idx 8, silver -> CIRCLES_CROSS idx 5).

Method (frame-aligned RAM read, the design's own sanctioned alternative
to a breakpoint probe): `BattleLab.prepare()`'s own `snapshot()` already
reads `gRngValue` into every pre-checkpoint capture
(`oracle/battle_lab.py` `snapshot()` -> `"rngValue"`); no subclassing
needed. Two source facts combine to make a plain per-frame RAM read
sufficient without a breakpoint:

1. `main.c:366`'s VBlankIntr calls `Random()` unconditionally once per
   frame UNLESS `gMain.inBattle && (gBattleTypeFlags & (LINK|FRONTIER|
   RECORDED))` -- and `gMain.inBattle` does not flip true until well
   after the transition animation finishes (`BattleTransition_
   StartOnField` runs while still on the overworld CB2), so gRngValue
   free-runs (exactly one LCG step per frame) through the ENTIRE walk-up
   AND the entire visible transition animation. A live probe run
   confirmed this directly: sampling every frame from well before through
   well after each fixture's transition-visual onset (§1) shows exactly
   one LCG step per frame almost everywhere.
2. `battle_tower.c:2092-2100` (`DoSpecialTrainerBattle`'s
   `SPECIAL_BATTLE_FACTORY` case) calls `FillFactoryTrainerParty()` then
   `GetSpecialBattleTransition(...)` back to back, synchronously, no task
   yield in between; `FillFactoryTrainerParty` -> `FillFactoryFrontier
   TrainerParty` -> (`gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`)
   -> `FillFactoryBrainParty(); return;` (`battle_tower.c:1849-1852`), so
   for a brain fight this one call chain performs the WHOLE 3-mon
   rejection-loop generation immediately followed by the one transition
   draw, with no other Random() consumer between them (matching the
   design doc's own source citation).

So the transition draw shows up as a short burst of >1 LCG steps between
two adjacent SAMPLED frames (the rejection-loop draws collapse into
however many frames the emulator schedules between two consecutive
`preCheckpointCaptureFrames` samples), sitting inside an otherwise
uniform 1-step-per-frame stream, followed by a clean run of pure 1-step
frames all the way through the transition's visible onset (confirmed:
no further anomaly appears between the burst and window end for either
fixture in this probe's actual run). The LAST such burst before that
clean tail is `FillFactoryBrainParty` + `GetSpecialBattleTransition`'s
combined draws; the value AT the end of that burst is already
`Random()`'s post-advance state, i.e. exactly what
`randomU16`/`pickFrontierTransition`'s own convention treats as `raw`
(`src/engine/opponentGen.ts:48-51,110-115`): table index =
`(burstEndValue >>> 16) % 12`.

Run via `python3 tools/run-mgba-probe.py <fresh-output.json> --
tools/probe/probe-brain-transition-rng-cross-check.py <fresh-output.json>`.
Read-only: does not touch src/, writes only the requested output path.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json>")

OUTPUT_PATH = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

TABLE = json.loads(
    (WORKTREE_ROOT / "src" / "data" / "gen" / "battle-transitions-frontier.json").read_text()
)["table"]

# ISO_RANDOMIZE1 (include/random.h:16), matching src/engine/rng.ts exactly.
LCG_MULTIPLIER = 1103515245
LCG_INCREMENT = 24691
LCG_MASK = 0xFFFFFFFF
MAX_BURST_STEPS_SEARCHED = 2000


def advance(value: int) -> int:
    return (LCG_MULTIPLIER * value + LCG_INCREMENT) & LCG_MASK


def steps_between(prev: int, cur: int) -> int | None:
    """How many LCG steps take `prev` to `cur`, or None if none found within the search cap."""
    v = prev
    for step in range(1, MAX_BURST_STEPS_SEARCHED + 1):
        v = advance(v)
        if v == cur:
            return step
    return None


FIXTURES = [
    {
        "label": "gold",
        "path": "tools/battle-lab/factory-brain-gold-speech-close-off.json",
        # Committed window is 2495-2620; §1's widened /tmp capture shows the
        # visual transition already under way by abs 2612. Widen a little
        # earlier than the committed window to bracket the RNG burst, and a
        # little later than 2620 for a clean-tail margin.
        "captureFrames": list(range(2540, 2631)),
        "expectedTableIndex": 8,
        "expectedFamily": "B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ",
    },
    {
        "label": "silver",
        "path": "tools/battle-lab/factory-brain-silver-walkup-speech-flicker-off.json",
        # Committed window is 3195-3300, already fully banked; §1 reads the
        # transition as already visually under way at abs 3280. Narrow the
        # widen to a margin before that.
        "captureFrames": list(range(3220, 3301)),
        "expectedTableIndex": 5,
        "expectedFamily": "B_TRANSITION_FRONTIER_CIRCLES_CROSS",
    },
]


def run_fixture(oracle: EmeraldOracle, spec: dict) -> dict:
    scenario = json.loads((WORKTREE_ROOT / spec["path"]).read_text())
    scenario["preCheckpointCaptureFrames"] = spec["captureFrames"]
    profile = scenario.get("profile", "battle-scene-off")
    request = validate_request(scenario, profile)
    if len(request["preCheckpointCaptureFrames"]) > 256:
        raise AssertionError(
            f"{spec['label']}: requested "
            f"{len(request['preCheckpointCaptureFrames'])} capture frames, over the 256 cap"
        )

    lab = BattleLab(oracle, profile)
    setup = lab.prepare(request)

    rows = sorted(
        (
            {"frame": c["frame"], "rngValue": c["state"]["rngValue"]}
            for c in setup["preCheckpointCaptures"]
        ),
        key=lambda r: r["frame"],
    )

    anomalies = []
    for i in range(1, len(rows)):
        prev, cur = rows[i - 1]["rngValue"], rows[i]["rngValue"]
        steps = steps_between(prev, cur)
        if steps != 1:
            anomalies.append(
                {
                    "fromFrame": rows[i - 1]["frame"],
                    "toFrame": rows[i]["frame"],
                    "steps": steps,
                    "toRngValue": cur,
                }
            )

    result = {
        "label": spec["label"],
        "sourceScenario": spec["path"],
        "expectedTableIndex": spec["expectedTableIndex"],
        "expectedFamily": spec["expectedFamily"],
        "windowFrames": [rows[0]["frame"], rows[-1]["frame"]],
        "rows": rows,
        "anomalies": anomalies,
    }

    if not anomalies:
        result["verdict"] = "INCONCLUSIVE: no burst (non-1-step run) found in window"
        return result

    last = anomalies[-1]
    burst_end_frame = last["toFrame"]
    burst_end_value = last["toRngValue"]
    tail_rows = [r for r in rows if r["frame"] >= burst_end_frame]
    clean_tail = all(
        steps_between(tail_rows[i]["rngValue"], tail_rows[i + 1]["rngValue"]) == 1
        for i in range(len(tail_rows) - 1)
    )

    raw = (burst_end_value >> 16) & 0xFFFF
    table_index = raw % len(TABLE)
    entry = TABLE[table_index]

    result["lastBurst"] = last
    result["cleanTailAfterLastBurst"] = clean_tail
    result["frozenAssumptionHeld"] = clean_tail
    result["derivedRaw"] = raw
    result["derivedTableIndex"] = table_index
    result["derivedTransitionId"] = entry["id"]
    result["derivedTransitionName"] = entry["name"]
    result["derivedTransitionFamily"] = entry["family"]
    result["matchesExpected"] = table_index == spec["expectedTableIndex"]
    return result


def main() -> None:
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    results = [run_fixture(oracle, spec) for spec in FIXTURES]

    output = {
        "schema": "brain-transition-rng-cross-check/v2",
        "note": (
            "gRngValue free-runs one LCG step per VBlank through the whole "
            "walk-up AND the whole visible transition animation (gMain."
            "inBattle only flips true after the transition finishes, "
            "main.c:366) -- the transition draw shows up as a short burst "
            "of >1-step deltas between two sampled frames, not a freeze. "
            "The LAST such burst before a clean (all 1-step) run to window "
            "end is FillFactoryBrainParty()+GetSpecialBattleTransition()'s "
            "combined draws (battle_tower.c:2092-2100,1849-1852); its "
            "final value is Random()'s post-advance state directly."
        ),
        "results": results,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str) + "\n")


main()
