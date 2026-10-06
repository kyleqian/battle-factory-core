#!/usr/bin/env python3
"""x2-history #148: derive ONIX-vs-ONIX copies of the mechanic lab scenarios (both party[0] species = ONIX, 95) so BOTH roles (attacker and target) carry the species rest x2 = 1.
usage: x2HistoryOnixPairs.py <outDir>   (reads tools/battle-lab/mechanic-*-player-*-opponent-onix.json and mechanic-*-opponent-*-player-onix.json; keeps the file name)"""
import json, sys, glob
from pathlib import Path
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); n = 0
for p in sorted(glob.glob("tools/battle-lab/mechanic-*-player-*-opponent-onix.json") + glob.glob("tools/battle-lab/mechanic-*-opponent-*-player-onix.json")):
    d = json.loads(Path(p).read_text())
    for side in ("player", "opponent"): d["overrides"]["parties"][side][0]["species"] = 95
    (out / Path(p).name).write_text(json.dumps(d)); n += 1
print(n)
