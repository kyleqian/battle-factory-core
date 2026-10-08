#!/usr/bin/env python3
"""a13fix ROM row pins: for each speciesAudit13Check.ts receipt (window [A, E], age shift) take a few rows' ROM sha256 (raw RGB888) from BOTH
fresh probe runs (they must agree) so a Tier-1 test can render the production live view at `row + shift` and compare its RGB sha256 with the
ROM's, without the emulator. Rows: 0, every `step`, and the last one.
usage: a13fixRomRows.py PROBEDIR OUT.json [step=25] RECEIPT.json...   (receipt fixture paths are recorded relative to the workspace)"""
import json, sys
from pathlib import Path
probes, out, step = Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3])
pins = []
for rp in sys.argv[4:]:
    for e in json.load(open(rp)):
        a, b = e["window"]; key = e["stem"]
        runs = [{f["frame"]: f["sha256"] for f in json.load(open(probes / f"{key}-r{r}.json"))["frames"]} for r in (1, 2)]
        rows = sorted(set(list(range(0, b - a + 1, step)) + [b - a]))
        hashes = []
        for i in rows:
            h1, h2 = runs[0][a + i], runs[1][a + i]
            if h1 != h2: raise SystemExit(f"runs disagree {key} {a + i}")
            hashes.append([i + e["shift"], h1])
        pins.append({"stem": key, "kind": e["kind"], "fixture": e["fixture"], "window": [a, b], "shift": e["shift"],
                     "orderInput": e["orderInput"], "residualPixels": [r["residualPixels"] for r in e["runs"]], "ageRomSha256": hashes})
out.write_text(json.dumps(pins, indent=1) + "\n")
print(f"{len(pins)} windows -> {out}")
