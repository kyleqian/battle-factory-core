#!/usr/bin/env python3
"""sc106: the test pins the stats-change command moves, from `npm test` output of the PATCHED archive copy (its own git repo).

usage: sc106Pins.py <npm-test.log> <tree-description> <out.json>
Parses vitest's failure blocks (" FAIL  <file> > <suite> > <test>" then the first line naming an Error) and the two summary lines
(idle98Pins.py's pattern). Every failure gets a reviewed class: how it moves and whether sc106 moved it.
"""
import collections, json, re, sys

log, tree, out = sys.argv[1:4]
text = re.sub(r"\x1b\[[0-9;]*m", "", open(log, errors="replace").read())
lines = text.splitlines()
# Reviewed by hand (sc106). Keyed by (file, test prefix).
REVIEWED = [
    ("tests/battleTurnPortability.test.ts", "preserves kernel receipt identity",
     "command vector: + exactly one stats-change command {eventSequence 13, battler 0, argument 27, minimumFrames 76} at the Sand-Attack "
     "STATS_CHANGE event, between the move-animation (seq 12) and the accuracy message (seq 14); every other command identical", "moved"),
    ("tests/liveSpriteOrderHost.test.ts", "host tracker == pure transform",
     "count: compared 863 -> 882 / hostKnown 772 -> 788 = + the 20-battle sweep's 19 stats-change command edges (16 host-known), each "
     "equal to the pure transform (0 mismatches); without them 863 / 772 (.integration sweep attribution)", "moved"),
    ("tests/randomRoundSoak.test.ts", "",
     "NOT a stats-change offset: the soak's RandomPlayer presses A with an rng.gap cooldown on every resolution frame, so the 76 / 90 "
     "added rows draw extra rng values and every later random choice shifts (action logs identical up to the first stats-change "
     "command, then a different random game; e.g. seed 27 no longer reaches its Baton Pass halt). Left unmoved: reported", "not moved"),
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
    pins.append({"file": file, "test": test, "assertion": assertion[:240], "class": review[0], "sc106": review[1]})
totals = [l.strip() for l in lines if re.match(r"^\s*(Test Files|Tests|Errors)\s", l)]
res = {"tree": tree, "command": "npm test -- --maxWorkers=4", "totals": totals, "pinCount": len(pins),
       "files": dict(collections.Counter(p["file"] for p in pins)), "pins": pins}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: res[k] for k in ("totals", "pinCount", "files")}, indent=1))
