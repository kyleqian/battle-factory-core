#!/usr/bin/env python3
# NOTE: superseded for new work by tools/integration/labCompare.sh (one ROM probe + engine + aligned SE table tool); kept because receipts reference it.
"""gsp3: ENG - ROM per sound effect and per script step of a lab probed by bdt1Run.sh.
usage: gsp3Cmp.py DIR NAME [--labels A,B,...]   prints the ROM / ENG SE sequences aligned by id (LCS), each with the diff and the ROM script label it falls in,
then, for every ROM label in --labels (substring match), the label's first row, its animation start (A0) and the next ROM label's row against the engine's command starts."""
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path

d, name = Path(sys.argv[1]), sys.argv[2]
want = sys.argv[sys.argv.index("--labels") + 1].split(",") if "--labels" in sys.argv else []
rom = json.load(open(d / f"{name}.rom.json"))
se = json.load(open(d / f"{name}.se.json"))
eng = json.load(open(d / f"{name}.eng.json"))
names = rom["names"]
lab = lambda p: names.get(hex(p), hex(p))
edges = []  # (frame, label) at each label change with ex>0 rows
last = None
a0s = []
prev_anim = 0
for f, ptr, ex, anim, *_ in rom["rows"]:
    if ptr >= 0x08000000:
        key = lab(ptr).split("+")[0]
        if key != last:
            edges.append((f, key))
            last = key
    if anim and not prev_anim:
        a0s.append(f)
    prev_anim = anim
def label_at(f):
    r = None
    for ef, k in edges:
        if ef <= f:
            r = k
        else:
            break
    return r
romse = [(e["frame"], e["id"]) for e in se["events"] if e["kind"] == "se" and not e.get("noop")]
engse = [(f, i) for f, i, _ in eng["se"]]
sm = SequenceMatcher(None, [i for _, i in romse], [i for _, i in engse], autojunk=False)
print(f"== {name}  ROM SE {len(romse)}  ENG SE {len(engse)}")
miss = []
for tag, a, b, c, dd, n in [(t, *x) for t, *x in [(o[0], o[1], o[2], o[3], o[4], 0) for o in sm.get_opcodes()]]:
    if tag == "equal":
        for k in range(b - a):
            rf, i = romse[a + k]
            ef, _ = engse[c + k]
            print(f"  SE {i:3d} ROM {rf:5d} ENG {ef:5d} {ef - rf:+4d}  {label_at(rf)}")
    else:
        for k in range(a, b):
            print(f"  SE {romse[k][1]:3d} ROM {romse[k][0]:5d} ENG   --        {label_at(romse[k][0])}  (ROM only)")
        for k in range(c, dd):
            print(f"  SE {engse[k][1]:3d} ROM   --  ENG {engse[k][0]:5d}        (ENG only)")
cmds = [(c[0], f"{c[1]}.{c[2]} {c[3]}") for c in eng["cmds"]]
for w in want:
    print(f"-- script label {w}")
    for idx, (f, k) in enumerate(edges):
        if w in k:
            nxt = next(((nf, nk) for nf, nk in edges[idx + 1:] if nk != k), None)
            a0 = next((x for x in a0s if f <= x < (nxt[0] if nxt else 10**9)), None)
            ec = [c for c in cmds if f - 4 <= c[0] <= (nxt[0] if nxt else f) + 8]
            print(f"  ROM {k} first row {f}  A0 {a0}  next {nxt}   ENG cmds " + ", ".join(f"{c[0]}:{c[1]}" for c in ec))
