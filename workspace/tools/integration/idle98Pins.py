#!/usr/bin/env python3
"""idle98: the test pins the universal-rows temp patch moves, from `npm test` output of the PATCHED archive copy (its own git repo).

usage: idle98Pins.py <npm-test.log> <out.json>
Parses vitest's failure blocks (" FAIL  <file> > <suite> > <test>" then the first line naming an Error) and the two summary lines.
Each pin gets a kind from its assertion: "row / age sequence" (a deeply-equal array whose length moves), "count" (expected N to be M),
or "other" (listed verbatim for review).
"""
import collections, json, re, sys

log, out = sys.argv[1:3]
text = re.sub(r"\x1b\[[0-9;]*m", "", open(log, errors="replace").read())
lines = text.splitlines()
# The non-generic assertions, reviewed by hand (idle98): each is still an ordinary-route row-count / age-sequence pin.
REVIEWED = {
    "to have a length of 270 but got 275": "row count (a generated Scene ON queue's presented rows: +5)",
    "playableContactAnimationLifecycle.test.ts:9": "row count (Twineedle hits: `hits.every(a => a.ages.length === 37 && ...)`)",
    "playableContactAnimationLifecycle.test.ts:23": "row count (Fury Swipes bodies: `ages.length` per body)",
    "liveDigAdapter.test.ts:147": "row count (`digs.filter((b) => b.ages.length === 195)` finds no later Dig body: its rows moved to 195 + P + T)",
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
res = {"tree": "git archive 3dd2b74b9 + idle98-universal-rows.diff (scratch copy with its own two-commit git repo)",
       "command": "npm test", "totals": totals, "pinCount": len(pins), "files": len(by_file),
       "byKind": dict(collections.Counter(p["kind"] for p in pins)), "byFile": dict(by_file.most_common()), "pins": pins}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("pins", "byFile")}))
