#!/usr/bin/env python3
"""stq132: single-constant perturbation experiments on src/animation/statusConditionAnimations.ts (docs/stq132-status-condition-render-prep.md).
Each mutation edits ONE constant of the stq132 section, runs tests/stq132StatusConditionReducer.test.ts (and, with a raw dir, the comparator),
records the failing test count / dirty windows, and restores the file byte-for-byte (verified). Run from workspace/.
usage: stq132Perturb.py <out.json> [<raw-dir>]
"""
import json, os, re, subprocess, sys

P = "src/animation/statusConditionAnimations.ts"
MUTATIONS = [
    ("SLP second create row 35 -> 36", "SLP: [3, 35],", "SLP: [3, 36],"),
    ("BRN third create row 15 -> 16", "BRN: [3, 9, 15],", "BRN: [3, 9, 16],"),
    ("INFATUATION third create row 37 -> 38", "INFATUATION: [3, 20, 37],", "INFATUATION: [3, 20, 38],"),
    ("SLEEP_LETTER_LAST_CALL 60 -> 59", "const SLEEP_LETTER_LAST_CALL = 60;", "const SLEEP_LETTER_LAST_CALL = 59;"),
    ("letter Z create-row matrix b 2200 -> 2201", "{ a: 2427, b: 2200 }", "{ a: 2427, b: 2201 }"),
    ("letter Z x offset 4 -> 5", "x: center.x + dir * 4,", "x: center.x + dir * 5,"),
    ("letter Z y offset -10 -> -11", "y: center.y - 10,", "y: center.y - 11,"),
    ("letter Z subpriority target - 2 -> - 1", "subpriority: battlerSubpriority(target.side) - 2, animCmdIndex: 0, tileOffset: 0, size: 32,",
     "subpriority: battlerSubpriority(target.side) - 1, animCmdIndex: 0, tileOffset: 0, size: 32,"),
    ("burn flame x offset 24 -> 25", "{ x: 24, y: 24, duration: 20, lastCall: 22 }", "{ x: 25, y: 24, duration: 20, lastCall: 22 }"),
    ("burn flame y offset 24 -> 25", "{ x: 24, y: 24, duration: 20, lastCall: 22 }", "{ x: 24, y: 25, duration: 20, lastCall: 22 }"),
    ("burn flame duration 20 -> 21", "{ x: 24, y: 24, duration: 20, lastCall: 22 }", "{ x: 24, y: 24, duration: 21, lastCall: 22 }"),
    ("burn flame lastCall 22 -> 21", "{ x: 24, y: 24, duration: 20, lastCall: 22 }", "{ x: 24, y: 24, duration: 20, lastCall: 21 }"),
    ("BURN_FLAME_FRAME_TICKS 4 -> 5", "const BURN_FLAME_FRAME_TICKS = 4;", "const BURN_FLAME_FRAME_TICKS = 5;"),
    ("DestroyAnimSprite data[6] 0x3bfd -> 0x3bfc", "[0x3bfd, 0x080a]", "[0x3bfc, 0x080a]"),
    ("heart y offset 20 -> 21", "{ y: 20, lastCall: 59, subpriorityOffset: 3 }", "{ y: 21, lastCall: 59, subpriorityOffset: 3 }"),
    ("heart lastCall 59 -> 58", "{ y: 20, lastCall: 59, subpriorityOffset: 3 }", "{ y: 20, lastCall: 58, subpriorityOffset: 3 }"),
    ("heart subpriority target - 3 -> - 2", "{ y: 20, lastCall: 59, subpriorityOffset: 3 }", "{ y: 20, lastCall: 59, subpriorityOffset: 2 }"),
    ("BATTLER_COORD_Y player 80 -> 81", "player: { x: 72, y: 80 },", "player: { x: 72, y: 81 },"),
    ("BATTLER_COORD_X opponent 176 -> 175", "opponent: { x: 176, y: 40 },", "opponent: { x: 175, y: 40 },"),
    ("SLP controllerRows 97 -> 98", "SLP: { activeRows: 96, controllerRows: 97,", "SLP: { activeRows: 96, controllerRows: 98,"),
    ("BRN activeRows 38 -> 37", "BRN: { activeRows: 38, controllerRows: 39,", "BRN: { activeRows: 37, controllerRows: 39,"),
    ("display: show on the row after create (k >= 0)", ".filter((p) => p.k >= 1)", ".filter((p) => p.k >= 0)"),
    ("display: SortSprites y rule reversed", "wrappedOamY(a.top) - wrappedOamY(b.top) ||", "wrappedOamY(b.top) - wrappedOamY(a.top) ||"),
    ("display: equal-y tie to the later slot", "wrappedOamY(a.top) - wrappedOamY(b.top) || b.index - a.index", "wrappedOamY(a.top) - wrappedOamY(b.top) || a.index - b.index"),
]
out, raw = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
orig = open(P, "rb").read()
src = orig.decode()
results = []
try:
    for name, old, new in MUTATIONS:
        assert src.count(old) == 1, (name, src.count(old))
        open(P, "w").write(src.replace(old, new))
        t = subprocess.run(["npx", "vitest", "run", "--no-watch", "tests/stq132StatusConditionReducer.test.ts"], capture_output=True, text=True)
        m = re.search(r"Tests\s+(?:(\d+) failed)?", t.stdout)
        failed = int(m.group(1)) if m and m.group(1) else 0
        row = {"mutation": name, "failingTests": failed}
        if raw:
            c = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "tools/integration/stq132Compare.ts", raw, "/dev/null"],
                               capture_output=True, text=True)
            row["dirtyWindows"] = sum(1 for line in c.stdout.splitlines() if "fullPx" in line and " fullPx 0 " not in line)
        results.append(row)
        print(json.dumps(row), flush=True)
finally:
    open(P, "wb").write(orig)
assert open(P, "rb").read() == orig
json.dump({"schema": "stq132-perturbation/v1", "results": results}, open(out, "w"), indent=1)
open(out, "a").write("\n")
