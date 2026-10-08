#!/usr/bin/env python3
"""prep41: D4 phase measurement from main-loop pass counters (speciesAudit2Counters.py output; two fresh runs per scenario).
usage: prep41Counters.py <counterDir> <moveId> <optionalLagAge> <out.json> <fixture.json>...
Per fixture: the two runs' row digests (must be equal), every animation body of the move in the run (activation .. first inactive,
inclusive = activation .. last gAnimScriptActive frame + 1), its lag ages (playTimeVBlanks pass delta 0, as body ages) and the phase of
the optional lag ("event" = a lag at <optionalLagAge>). Body 0 is the fixture's dense window (asserted: same activation); later bodies are
counter-only measurements. Runs with identical row digests are one measurement (duplicate scenarios are listed, counted once)."""
import hashlib, json, sys
from pathlib import Path

cdir, move, lag_age, out, fixtures = Path(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4]), sys.argv[5:]
windows, seen, tally = [], {}, {"event": 0, "no-event": 0}
for fx in fixtures:
    stem = Path(fx).stem
    d = json.loads(Path(fx).read_text())
    src = json.loads(Path(d["sourceFixture"]).read_text()) if "sourceFixture" in d else {}
    w = {**src, **d}["denseWindow"]
    runs = [json.loads((cdir / f"{stem}.run{r}.json").read_text()) for r in (0, 1)]
    dig = [hashlib.sha256(json.dumps(r["rows"]).encode()).hexdigest()[:16] for r in runs]
    cols, rows = runs[0]["cols"], runs[0]["rows"]
    a, m, pt = cols.index("animActive"), cols.index("animMove"), cols.index("playTimeVBlanks")
    active = {r[0] for r in rows if r[a] == 1 and r[m] == move}
    bodies = []
    for s in sorted(f for f in active if f - 1 not in active):
        e = s
        while e + 1 in active: e += 1
        first_inactive = e + 1
        lags = [i - s for i in range(s, first_inactive + 1) if rows[i][pt] == rows[i - 1][pt]]
        bodies.append({"activation": s, "firstInactive": first_inactive, "rows": first_inactive - s + 1, "lagAges": lags,
                       "phase": "event" if lag_age in lags else "no-event"})
    assert bodies and bodies[0]["activation"] == w["startFrame"], (stem, bodies, w)
    dup = seen.get(dig[0])
    if dup is None:
        seen[dig[0]] = stem
        for b in bodies: tally[b["phase"]] += 1
    windows.append({"fixture": fx, "denseWindow": w, "digests": dig, "identical": dig[0] == dig[1], "duplicateOf": dup, "bodies": bodies})
    print(stem, dig[0] == dig[1], "dup " + dup if dup else "", [(b["rows"], b["lagAges"]) for b in bodies])
res = {"schema": "prep41-counters/v1", "moveId": move, "optionalLagAge": lag_age,
       "method": "tools/integration/speciesAudit2Counters.py via issue151Counters.sh (2 fresh direct-mGBA processes per scenario); lag = playTimeVBlanks pass delta 0",
       "measured": tally, "allIdentical": all(x["identical"] for x in windows), "windows": windows}
out.write_text(json.dumps(res, indent=1) + "\n")
print("measured", tally, "allIdentical", res["allIdentical"])
