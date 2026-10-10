#!/usr/bin/env python3
"""Live audit 20: coverage by the MOVE body immediately before the consumer (the history's last MOVE_ANIMATION before the window, `entry`
when none) and by the number of distinct hist73 Part A bodies in the history (the chain depth), from <receipt-dir>/check/*.json and
the committed fixtures. ZERO = live 0 px (chain lend); RESID = live with a residual; FB = production's decline; alloc= / alloc! =
production allocator input == / != the ROM (wall + sparkle slots and the pre-activation allocator state); order= = the window's order
lend == ROM (AUDIT20_ALLOC_ONLY receipt alloc.txt; a deferred lend counts as unresolved here, see lends.txt).
usage: audit20Coverage.py <receipt-dir> <fixture-dir>"""
import json, sys
from collections import Counter, defaultdict
from pathlib import Path

rec, fx = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = {m["id"]: m["move"].removeprefix("MOVE_") for m in json.loads(Path("src/data/gen/moves.json").read_text())["moves"]}
PART_A = {210, 149, 174, 297, 318, 215, 230, 222}  # hist73's top-8 by census exposure
by_unit, by_depth = defaultdict(Counter), defaultdict(Counter)
for p in sorted((rec / "check").glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        f = json.loads((fx / r["fixture"]).read_text())
        events = [e for t in f["precedingTurns"] for e in t["events"]][:-1]
        moves = [e for e in events if e.get("animationId") == "MOVE_ANIMATION"]
        last = moves[-1] if moves else None
        unit = "entry" if last is None else f"{NAMES[int(last['arguments'][0])]}@{'ply' if last['battler'] == 0 else 'opp'}"
        depth = len([e for e in moves if int(e["arguments"][0]) in PART_A])
        c = r["chain"]
        v = "FB" if not c["live"] else "ZERO" if c["px"] == 0 else "RESID"
        a = "alloc-" if r["alloc"]["equal"] is None else "alloc=" if r["alloc"]["equal"] else "alloc!"
        fam = r["fixture"].split("-")[0]
        for d, k in ((by_unit, (fam, unit, r["move"])), (by_depth, (fam, f"partA-bodies={min(depth, 3)}{'+' if depth > 3 else ''}"))):
            d[k]["windows"] += 1; d[k][v] += 1; d[k][a] += 1
cols = ("windows", "ZERO", "RESID", "FB", "alloc=", "alloc!", "alloc-")
for title, d in (("by the body before the consumer (family, unit@side, consumer)", by_unit), ("by Part A chain depth", by_depth)):
    print(title)
    for k in sorted(d):
        print(" ", " / ".join(k), " ".join(f"{x}={d[k][x]}" for x in cols if d[k][x]))
