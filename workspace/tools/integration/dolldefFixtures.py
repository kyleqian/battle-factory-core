#!/usr/bin/env python3
"""dolldef-live dense fixtures: a prep38Fixtures.py TEST fixture (defender shown as the Substitute doll at activation, each scenario's
own activation frame) + the per-row ROM RGB sha256 of both fresh prep38Probe.py runs (which must agree) + the live age shift of the
move's calibrated doll-free CONTROL bodies (prep38 s4: the smallest-residual control receipt of the move, as prep38Check.ts --shifts).
Row i of [startFrame, endFrame] is shown at live age i + shift. The RGB itself is not committed (the sha256 pins it).
usage: dolldefFixtures.py PROBEDIR DERIVEDDIR SHIFTSDIR OUTDIR stem...   -> OUTDIR/<stem>.json"""
import json, sys
from pathlib import Path
D, DER, SH, OUT = (Path(p) for p in sys.argv[1:5]); OUT.mkdir(parents=True, exist_ok=True)
controls = [json.load(open(p))[0] for p in sorted(SH.glob("*-control.json"))]
for stem in sys.argv[5:]:
    f = json.load(open(DER / f"{stem}-test.json"))
    best = sorted((c for c in controls if c["move"] == f["move"]), key=lambda c: c["runs"][0]["residualPixels"])
    shift = best[0]["shift"] if best else 0
    a, b = f["denseWindow"]["startFrame"], f["denseWindow"]["endFrame"]
    runs = [json.load(open(D / f"{stem}-r{r}.json"))["frames"] for r in (1, 2)]
    shas = [[fr[i]["sha256"] for i in range(a, b + 1)] for fr in runs]
    if shas[0] != shas[1]: raise SystemExit(f"{stem}: the two fresh runs disagree")
    assert all(fr[i]["frame"] == i for fr in runs for i in range(a, b + 1))
    f["schema"] = "dolldef-live-dense-fixture/v1"
    f["shift"] = shift
    f["shiftSource"] = "the move's calibrated doll-free CONTROL body (tools/integration/fixtures/prep38/receipts/control, smallest residual)"
    f["rows"] = [[i + shift, a + i, s] for i, s in enumerate(shas[0])]
    (OUT / f"{stem}.json").write_text(json.dumps(f, separators=(",", ":")) + "\n")
    print(stem, f["move"], f"{a}..{b}", len(f["rows"]), "shift", shift)
