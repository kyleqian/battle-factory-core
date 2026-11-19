#!/usr/bin/env python3
"""hpf4m: the ROM's battle-script pointer per frame (RLE) around a bar, as BattleScript_<label>+offset from the linker map.
usage: hpf4mPtrs.py <ram.json> <fromFrame> <toFrame>      (ram.json from hpf4mShape.py / hpd2Probe.py)
"""
import bisect, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
labels = sorted((int(m.group(1), 16), m.group(2)) for m in re.finditer(r"^\s+0x([0-9a-f]{8})\s+(BattleScript_\w+)\s*$", (ROOT / "reference/pokeemerald/pokeemerald.map").read_text(), re.M))
addrs = [a for a, _ in labels]
def name(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{labels[i][1]}+{p - labels[i][0]:#x}" if i >= 0 and p - labels[i][0] < 0x400 else hex(p)
rows = json.load(open(sys.argv[1]))["rows"]
lo, hi = int(sys.argv[2]), int(sys.argv[3])
last = None; start = None
for r in rows:
    if not lo <= r["f"] <= hi: continue
    key = (r["ptr"], r["exec"] != 0)
    if key != last:
        if last is not None: print(f"  f{start}-{r['f']-1} ({r['f']-start}) {name(last[0])} exec={int(last[1])}")
        last, start = key, r["f"]
print(f"  f{start}-{hi} ({hi-start+1}) {name(last[0])} exec={int(last[1])}")
