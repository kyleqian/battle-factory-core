#!/usr/bin/env python3
"""Live audit 16: per-row IO vs buffered BLDCNT / BLDALPHA and the waiting list from audit16Vblank.sh output, both runs (r1 == r2 checked).
Row = frame - activation; the screen of row r is drawn with the IO latched at the end of frame r-1's VBlank.
usage: audit16VblankTable.py <dir>"""
import json, sys
from pathlib import Path

d = Path(sys.argv[1])
for act in sorted(d.glob("*.activation")):
    stem = act.stem
    a = int(act.read_text())
    runs = [json.loads((d / f"{stem}-r{r}.json").read_text())["rows"] for r in (1, 2)]
    same = [{k: v for k, v in x.items() if k != "screen"} for x in runs[0]] == [{k: v for k, v in x.items() if k != "screen"} for x in runs[1]]
    print(f"{stem} (activation {a}) r1==r2={int(same)}")
    for x in runs[0]:
        io, bf = x["io"], x["buffer"]
        print(f"  row {x['frame'] - a:>3}  io bldcnt {io['bldcnt']:04x} alpha {io['bldalpha']:04x}  buf bldcnt {bf['bldcnt']:04x} alpha {bf['bldalpha']:04x}"
              f"  waiting {x['waiting']}  vbl1 {x['vblank1']} vbl2 {x['vblank2']} tasks {x['visualTasks']}")
