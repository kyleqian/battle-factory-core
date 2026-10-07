#!/usr/bin/env python3
"""prep30: summarise the Extrasensory scanout-split sweep (prep30ExtrasensoryPixels.ts --split=S outputs) into one compact receipt.
usage: python3 prep30SplitSummary.py OUT.json s0.json s8.json ...   (each input = one --split run over the same windows)"""
import json, sys
out, ins = sys.argv[1], sys.argv[2:]
runs = sorted(((json.load(open(p))) for p in ins), key=lambda r: r[0]["split"])
res = []
for wi, w in enumerate(runs[0]):
    per = {r[wi]["split"]: r[wi]["perRowPixels"] for r in runs}
    rows = []
    for age in range(w["rows"]):
        if all(per[s][age] == 0 for s in per): continue
        ok = [s for s in per if per[s][age] == 0]
        rows.append({"age": age, "exactSplits": ok, "minPixels": min(per[s][age] for s in per), "pixelsAtS0": per[0][age]})
    res.append({"name": w["name"], "species": w["species"], "rows": w["rows"], "residualBySplit": {str(r[wi]["split"]): r[wi]["residualPixels"] for r in runs},
                "rowsExactBySplit": {str(r[wi]["split"]): r[wi]["pixelRowsExact"] for r in runs}, "splitSensitiveRows": rows,
                "rowsExactWithBestPerRowSplit": w["rows"] - sum(1 for x in rows if not x["exactSplits"])})
json.dump(res, open(out, "w"), indent=1); open(out, "a").write("\n")
for r in res: print(r["name"], "S0", r["residualBySplit"]["0"], "best-const", min(r["residualBySplit"].values()), "rows exact w/ per-row split", r["rowsExactWithBestPerRowSplit"], "/", r["rows"])
