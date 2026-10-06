#!/usr/bin/env python3
"""BG-register history: non-move units between bodies.  usage: bgHistoryUnits.py PROBE_DIR OUT_JSON
Per scenario family (name keyword) counts of (previous end+30 / end+1 signature == next activation signature) pairs, and the first-body state, using the consumer signature of bgHistoryAnalyze.py.
Intimidate species (first body already after a switch-in stat-drop that ran in BattleLab.prepare) are tagged by the S9 first-body state."""
import json, glob, sys, collections
from pathlib import Path
DROP = {"bg0hofs", "bg0vofs", "var:BG0_X", "var:BG0_Y", "bitmap"}
def cs(s): return json.dumps({k: v for k, v in s.items() if k not in DROP}, sort_keys=True)
FAM = [("faint/ko/replacement", ("postko", "issue84", "faint", "ko", "replacement", "destiny", "perish", "explosion", "selfdestruct", "memento", "healing-wish")), ("switch/baton/pursuit/forced", ("switch", "baton", "pursuit", "roar", "whirlwind", "forced", "u-turn")),
       ("stockpile family", ("stockpile", "spit", "swallow")), ("weather/field", ("hail", "rain", "sandstorm", "sunny", "weather")), ("status/stat bodies", ("growl", "screech", "leer", "swords", "agility", "toxic", "poison", "sleep", "paralyz", "burn", "confus"))]
def fam(n):
    for k, ws in FAM:
        if any(w in n for w in ws): return k
    return "other damaging/mechanic"
out = collections.defaultdict(lambda: collections.Counter()); ex = collections.defaultdict(list)
for f in sorted(glob.glob(sys.argv[1] + "/*.json")):
    d = json.load(open(f)); n = Path(f).stem; bs = d["bodies"]; fm = fam(n)
    if bs: out[fm]["scenarios"] += 1; out[fm]["firstBody"] += 1
    for i in range(1, len(bs)):
        p, b = bs[i - 1], bs[i]
        if p["end"] is None: continue
        gap = b["start"] - p["end"]; ref = p.get("e1" if gap < 30 else "e30")
        if ref is None: continue
        eq = cs(ref) == cs(b["act"]); out[fm]["pairs"] += 1; out[fm]["equal" if eq else "different"] += 1; out[fm]["gap>=1000"] += gap >= 1000 and eq
        if not eq: ex[fm].append([n, p["move"], b["move"], gap])
Path(sys.argv[2]).write_text(json.dumps({"families": {k: dict(v) for k, v in out.items()}, "different": ex}, indent=0, separators=(",", ":")))
for k, v in out.items(): print(k, dict(v))
print(dict(ex))
