#!/usr/bin/env python3
"""d4w (S10A): Pursuit SECOND-body window wrappers from a prep41 counters receipt (prep41Counters.py).
usage: d4wBody2Windows.py <pursuit-counters.json> <pursuit-body2-hp.json> <outDir>
For every lb26 scenario (turn 1: the foe's move [+ stat], the attacker's Pursuit; turn 2: the same again) the wrapper's dense window is the
scenario's OWN body 1 (activation .. first inactive, from the counters run, never from live output), its timingPhase the measured optional
lag of that body, fieldProfile HP = the direct-mGBA probe's hp at that activation (stageFacts hpAfter [player, opponent]), and precedingBodies = the turn-1 units + the attacker's own Pursuit body + the turn-2 units (= the turn-1 units)."""
import json, sys
from pathlib import Path

rec, hp, out = json.loads(Path(sys.argv[1]).read_text()), json.loads(Path(sys.argv[2]).read_text())["scenarios"], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
for w in rec["windows"]:
    if "later-bodies-lb26" not in w["fixture"] or w["duplicateOf"]: continue
    src = json.loads(Path(w["fixture"]).read_text())
    b = w["bodies"][1]
    units = src["precedingBodies"]
    stem = Path(w["fixture"]).stem[len("pursuit-"):]
    facts = hp[stem]
    assert [facts["bodyWindows"][1]["startFrame"], facts["bodyWindows"][1]["endFrame"]] == [b["activation"], b["firstInactive"]], stem
    player, opponent = facts["interBodyGaps"][0]["hpAfter"]
    fx = {"sourceFixture": w["fixture"], "denseWindow": {"startFrame": b["activation"], "endFrame": b["firstInactive"]},
          "timingPhase": b["phase"],
          "fieldProfile": {**src["fieldProfile"], "playerHp": player, "opponentHp": opponent},
          "precedingBodies": units + [{"moveId": 228, "side": src["attacker"]["geometry"]["side"]}] + units,
          "timingEvidence": f"{sys.argv[1].split('/')[-1]}: body 1 lag ages {b['lagAges']} ({b['rows']} rows), counters r0 == r1 {w['identical']}"}
    (out / f"pursuit-lb26b2-{stem}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print("pursuit-lb26b2", stem, b["phase"], b["rows"])
