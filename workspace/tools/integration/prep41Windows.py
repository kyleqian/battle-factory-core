#!/usr/bin/env python3
"""prep41: D4 check fixtures from a counters receipt (prep41Counters.py). usage: prep41Windows.py <counters.json> <prefix> <outDir>
File name = <prefix>-[lb26-]<banked fixture stem>.
One wrapper fixture per non-duplicate window: the banked fixture as sourceFixture, the dense window = the scenario's OWN body 0
(activation .. first inactive, from the counters run, never from live output) and the measured timingPhase of the optional lag."""
import json, sys
from pathlib import Path

rec, prefix, out = json.loads(Path(sys.argv[1]).read_text()), sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
for w in rec["windows"]:
    if w["duplicateOf"]: continue
    b = w["bodies"][0]
    fx = {"sourceFixture": w["fixture"], "denseWindow": {"startFrame": b["activation"], "endFrame": b["firstInactive"]},
          "timingPhase": b["phase"],
          "timingEvidence": f"{sys.argv[1].split('/')[-1]}: body 0 lag ages {b['lagAges']} ({b['rows']} rows), counters r0 == r1 {w['identical']}"}
    stem = Path(w["fixture"]).stem
    for p in ("pursuit-", "hidden-power-"): stem = stem[len(p):] if stem.startswith(p) else stem
    (out / f"{prefix}-{'lb26-' if 'later-bodies-lb26' in w['fixture'] else ''}{stem}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(prefix, Path(w["fixture"]).stem, b["phase"], b["rows"])
