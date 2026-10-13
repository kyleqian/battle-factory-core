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
    ("tests/off121StatusCommand.test.ts", "Scene ON is untouched",
     "SA3 itself: the Scene ON guard 'every status command stays 32' now reads 'stays 32 unless its battler's status animation runs in "
     "the same execution (then off121's delta(print) - delta(status))' on the same seeds 11 / 12; every OFF assertion unchanged", "moved"),
    ("tests/stl109Struggle.test.ts", "opponent first, then the player (turn 58)",
     "frame budget: the turn-58 route (seed 60 / streak 23) crosses 34 Scene ON status animations (+3,298 frames) and 34 SA3 status "
     "commands (-1,044): 27,992 -> 30,246 frames (base / final measured), past generatedCommandAnimationReplay's 30,000-frame budget; "
     "the route now passes 40,000 explicitly (new optional frameBudget parameter, default 30,000); Scene OFF 22,806 both trees", "moved"),
    ("tests/appDifferential.test.ts", "",
     "ENVIRONMENT, not a pin: the archive copy is a one-commit git repo (the CLI guard tests need history); passes in the worktree", "env"),
    ("tests/liveBattlerX2History.test.ts", "seed 110",
     "command index: body key '1:0:17' -> '1:0:18' (requestId:segment:commandIndex): one Scene ON status-animation command now precedes "
     "the body in segment 1:0 (the only command sa125 inserts); 14 bodies / 10 ONIX / 3 inputs changed and ON / OFF parity unchanged "
     "(base and final replays measured); seed 134 unchanged", "moved"),
    ("tests/sc106StatsChangeCommand.test.ts", "playstatchangeanimation (seed 13",
     "frames: the route total 9177 -> 9625 = + 4 CONFUSION (100) + 2 PRZ (39) status-animation commands - 30 (one SA3 status 32 -> 2), "
     "all after the Tickle anchor (base / final replays measured; the anchor frames and every other sc106 assertion unchanged)", "moved"),
    ("tests/liveSpriteOrderHost.test.ts", "host tracker == pure transform",
     "count: compared 882 -> 895 / hostKnown 788 -> 798 = + the 20-battle sweep's 13 status-animation command edges (10 host-known), "
     "each equal to the pure transform (0 mismatches; measured on the final tree); declines 0 and laterAfter 72 unchanged", "moved"),

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
