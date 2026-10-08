#!/usr/bin/env python3
"""prep37: compress a prep37Probe output into a timeline of state runs (anim script, tasks, battler gfx/bs flags)."""
import json, sys
d = json.load(open(sys.argv[1]))
fr = d["frames"]
def key(r):
    bs = r["battlers"]
    return (r["currentMove"], r["script"], tuple(sorted(set(r["tasks"]) - {"Task_UpdateMonBg"})),
            tuple((b["behindSubstitute"], b["flagX8"], b["specialAnimActive"], b["animFromTableActive"], b["tileDigest"],
                   b["sprite"]["invisible"], b["hp"], b["substituteHP"], b["status2"] & 0x01000000 != 0) for b in bs))
prev, start = None, 0
for r in fr + [None]:
    k = key(r) if r else None
    if k != prev:
        if prev is not None:
            print(f"{start:5d}-{r['frame']-1 if r else fr[-1]['frame']:5d} mv={prev[0]} script={prev[1]} tasks={','.join(prev[2])[:90]}")
            for i, b in enumerate(prev[3]):
                print(f"      b{i} bs={int(b[0])} x8={int(b[1])} spec={int(b[2])} tbl={int(b[3])} gfx={b[4]} inv={int(b[5])} hp={b[6]} subHP={b[7]} S2sub={int(b[8])}")
        prev, start = k, (r["frame"] if r else 0)
