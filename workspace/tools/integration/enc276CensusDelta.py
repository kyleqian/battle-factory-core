#!/usr/bin/env python3
"""enc276: compare two lsd194Census arms (base tree vs the forced-turn-no-menu tree) seed by seed.

  python3 tools/integration/enc276CensusDelta.py <base-arm-dir> <final-arm-dir> [out.json]

An arm dir holds r0..r9.jsonl (tools/integration/lsd194Census.sh). Per seed it compares the kernel events digest
(`eventsDigest`: gameplay / RNG), the error field and the presentation command rows. enc276 changes only the move-menu
step of a forced turn (Encore / Struggle), which no resolution command row records, so the expected result is zero moved
rows and identical digests; a seed that ends on the census frame budget on both trees is reported separately because the
cut lands on a different turn once frame counts change (check its common prefix with per-segment digests).
"""
import glob
import json
import sys


def load(arm):
    rows = {}
    for path in sorted(glob.glob(f"{arm}/r[0-9].jsonl")):
        for line in open(path):
            row = json.loads(line)
            rows[row["seed"]] = row
    return rows


def main():
    base, final = load(sys.argv[1]), load(sys.argv[2])
    out = {"seeds": len(base), "sameSeedSet": set(base) == set(final), "digestMoved": [], "frameBudgetBoth": [],
           "commandRowsMoved": [], "errorsMoved": []}
    for seed in sorted(base):
        b, f = base[seed], final[seed]
        if b["error"] != f["error"]:
            out["errorsMoved"].append(seed)
        if b["error"] == f["error"] == "Error: frame budget":
            out["frameBudgetBoth"].append(seed)
            continue
        if b["eventsDigest"] != f["eventsDigest"]:
            out["digestMoved"].append(seed)
        if b["commands"] != f["commands"]:
            out["commandRowsMoved"].append(seed)
    print(json.dumps(out))
    if len(sys.argv) > 3:
        json.dump(out, open(sys.argv[3], "w"), indent=1)
    sys.exit(1 if out["digestMoved"] or out["errorsMoved"] or not out["sameSeedSet"] else 0)


main()
