#!/usr/bin/env python3
"""iu120: the test pins the landed universal rows move, from the two `npm test` shard logs of the fold (idle98Pins.py pattern).

usage: iu120Pins.py <out.json> <shard-1.log> <shard-2.log>
Parses vitest's failure blocks (" FAIL  <file> > <suite> > <test>" then the first line naming an Error) and the two summary lines.
Each pin gets a kind from its assertion: "row / age sequence" (a deeply-equal array whose length moves), "count" (expected N to be M),
or "other" (listed verbatim for review).
"""
import collections, json, re, sys

out, logs = sys.argv[1], sys.argv[2:]
text = "\n".join(re.sub(r"\x1b\[[0-9;]*m", "", open(log, errors="replace").read()) for log in logs)
lines = text.splitlines()
# The non-generic assertions, reviewed by hand (idle98; iu120 adds its own below): each is still an ordinary-route row-count / age-sequence pin.
REVIEWED = {
    "to have a length of 270 but got 275": "row count (a generated Scene ON queue's presented rows: +5)",
    "playableContactAnimationLifecycle.test.ts:9": "row count (Twineedle hits: `hits.every(a => a.ages.length === 37 && ...)`)",
    "playableContactAnimationLifecycle.test.ts:23": "row count (Fury Swipes bodies: `ages.length` per body)",
    "liveDigAdapter.test.ts:147": "row count (`digs.filter((b) => b.ages.length === 195)` finds no later Dig body: its rows moved to 195 + P + T)",
    # iu120 (on top of land97 / shp116 / sc106):
    "to have a length of 108 but got 113": "row count (land97's Bulk Up route b154: 104 + N 4 rows, + P 3 + T 2)",
    "to have a length of 36 but got 39": "row count (shp116's Bite route b38: 26 + N 10 rows, + P 3)",
    "to have a length of 1 but got 4": "row count (shp116's preActivationRow rows: the activation row + the P 3 pre rows showing it)",
    "sc106StatsChangeCommand.test.ts:": "anchor frame (a stats-change command's first frame: + P + T per earlier live body on the route; its own frames unchanged)",
}
pins, seen = [], set()
for i, line in enumerate(lines):
    m = re.match(r"^\s*FAIL\s+(\S+\.test\.ts)\s+>\s+(.*)$", line)
    if not m:
        continue
    file, test = m.group(1), m.group(2).strip()
    if (file, test) in seen:
        continue
    seen.add((file, test))
    assertion = next((l.strip() for l in lines[i + 1:i + 40] if re.search(r"(Error|expected)", l)), "")
    where = next((l.strip() for l in lines[i + 1:i + 60] if re.search(r"❯ \S+\.test\.ts:\d+", l)), "")
    kind = ("row / age sequence" if re.search(r"deeply equal \[", assertion) else
            "count" if re.search(r"expected -?\d+ to (be|equal|deeply equal) -?\d+", assertion) else "other")
    if kind == "other":
        kind = next((v for k, v in REVIEWED.items() if k in assertion or k in where), "other")
    pins.append({"file": file, "test": test, "assertion": assertion[:240], "kind": kind})
totals = [l.strip() for l in lines if re.match(r"^\s*(Test Files|Tests)\s", l)]
by_file = collections.Counter(p["file"] for p in pins)
res = {"tree": "the iu120 fold 008c485a4 (production; tests at 3cad94b88, before any pin moved)",
       "command": "npm test -- --maxWorkers=4 --shard=1/2 and --shard=2/2", "totals": totals, "pinCount": len(pins), "files": len(by_file),
       "byKind": dict(collections.Counter(p["kind"] for p in pins)), "byFile": dict(by_file.most_common()), "pins": pins}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("pins", "byFile")}))
