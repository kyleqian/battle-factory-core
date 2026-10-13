#!/usr/bin/env python3
"""ord149 B1 join: scan93's committed gate-lifted (patch B) residual age spans of the player later Extrasensory windows
(fixtures/scan93/check-B.json `affectedAges`) against this step's ROM split per row (ord149XsLineProbe.py raw rows of the same scenario):
for every stepped write row inside the span, its age (trace frame - window start), task data[1], entry VCOUNT and split S (the last line
that still shows the previous row's word; data[14] - 1 when none), plus the first body's S at the same write-row index.
usage: ord149XsJoin.py <out.json> <probe-dir>"""
import json, sys
from pathlib import Path

PROBE = {"xs-pla-nuzleaf-shuckle-xs": "xs-pla-xs-A", "xs-pla-nuzleaf-shuckle-qa": "xs-pla-qa-A", "xs-pla-espeon-crobat-xs": "xs-pla-crobat-xs-A"}
check = json.loads(Path("tools/integration/fixtures/scan93/check-B.json").read_text())["rows"]
out = {"schema": "ord149-xs-join/v1", "windows": []}


def S(r):
    return max(r[7]) if r[7] else r[3] - 1


for row in check:
    stem = row["fixture"].rsplit("-", 1)[0]
    if row["move"] != "EXTRASENSORY" or row["side"] != "player" or stem not in PROBE:
        continue
    raw = [r for r in json.loads((Path(sys.argv[2]) / f"{PROBE[stem]}.json").read_text())["rows"] if r[1] == 0 and isinstance(r[7], list)]
    w0, w1 = row["window"]
    body = [r for r in raw if w0 <= r[0] <= w1]
    first = [r for r in raw if r[0] < raw[0][0] + 200]
    lo, hi = map(int, row["affectedAges"].split(" ")[0].split(".."))
    ages = []
    for k, r in enumerate(body):
        age = r[0] - w0
        if lo <= age <= min(hi, 120):
            ages.append({"age": age, "data1": r[2], "window": [r[3], r[4]], "entryVcount": r[5], "split": S(r),
                         "firstBodySplit": S(first[k]) if k < len(first) else None})
    entry = {"fixture": row["fixture"], "window": row["window"], "affectedAges": row["affectedAges"],
             "residualPixels": row["runs"][0]["residualPixels"], "exactRows": row["runs"][0]["exactRows"], "writeRows": ages}
    out["windows"].append(entry)
    print(entry["fixture"], entry["affectedAges"], "px", entry["residualPixels"])
    print("   ", " ".join(f"a{a['age']}:S{a['split']}(first {a['firstBodySplit']})" for a in ages))
Path(sys.argv[1]).write_text(json.dumps(out, indent=1) + "\n")
