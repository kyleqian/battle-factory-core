#!/usr/bin/env python3
"""phy1m: join hpd2Probe ROM windows (lse1/an.py analyze, window 1) with hpd4Cmds app rows for each lab in <evidence dir> (ram/, app/).
usage: phy1mJoin.py <evidence-dir>   (prints a markdown table; d = ROM R->H - app rows, ROM longer = positive)"""
import re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "lse1"))
from an import analyze

ev = Path(sys.argv[1])
print("| lab | ROM L | R->A | len | H-(A+len) | R->H | app rows | app breakdown | d |\n|---|---|---|---|---|---|---|---|---|")
for ram in sorted((ev / "ram").glob("*.json")):
    if ram.name.endswith(".log"): continue
    n = ram.stem
    w = analyze(str(ram))[0]
    lines = (ev / "app" / f"{n}.txt").read_text().split("\n")
    starts = [(int(l.split()[0]), l) for l in lines if l and l.split()[0].isdigit()]
    rows, brk = None, ""
    for i, (s, l) in enumerate(starts):
        if "move-animation" in l and "move=" in l:
            rows = starts[i + 1][0] - s
            m = re.search(r"bodyLead=(\d+) pre=(\S+) idle=(\S+) live=(\S+) post=(\S+) tail=(\S+) tailRows=(\S+)", l)
            brk = "bodyLead %s pre %s idle %s live %s post %s tail %s tailRows %s" % m.groups() if m else ""
            break
    gap = w["H"] - (w["A"] + w["len"]) if w["H"] else None
    d = w["RtoH"] - rows if rows is not None and w["RtoH"] else None
    print(f"| {n} | {w['lead']} | {w['RtoA']} | {w['len']} | {gap} | {w['RtoH']} | {rows} | {brk} | {d:+d} |" if d is not None else f"| {n} | {w} | {rows} | {brk} | ? |")
