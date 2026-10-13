#!/usr/bin/env python3
"""sa125: the test pins the status-animation command (+ SA3) moves, from `npm test` output of the PATCHED archive copy (its own git repo).

usage: sa125Pins.py <npm-test.log> <tree-description> <out.json>
Parses vitest's failure blocks (" FAIL  <file> > <suite> > <test>" then the first line naming an Error) and the two summary lines
(idle98Pins.py's pattern). Every failure gets a reviewed class: how it moves and whether sc106 moved it.
"""
import collections, json, re, sys

log, tree, out = sys.argv[1:4]
text = re.sub(r"\x1b\[[0-9;]*m", "", open(log, errors="replace").read())
lines = text.splitlines()
# Reviewed by hand (sa125). Keyed by (file, test prefix).
REVIEWED = [
__REVIEWED__
]
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
    review = next(((why, moved) for f, t, why, moved in REVIEWED if f == file and t in test), ("unreviewed", "?"))
    pins.append({"file": file, "test": test, "assertion": assertion[:240], "class": review[0], "sa125": review[1]})
totals = [l.strip() for l in lines if re.match(r"^\s*(Test Files|Tests|Errors)\s", l)]
res = {"tree": tree, "command": "npm test -- --maxWorkers=4", "totals": totals, "pinCount": len(pins),
       "files": dict(collections.Counter(p["file"] for p in pins)), "pins": pins}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: res[k] for k in ("totals", "pinCount", "files")}, indent=1))
