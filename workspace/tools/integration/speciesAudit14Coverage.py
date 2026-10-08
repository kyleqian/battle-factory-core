#!/usr/bin/env python3
"""speciesAudit14: coverage grid of the swap receipts (speciesAudit14SwapRun.sh): per move x side x species, the swap windows
(px-0 count / total) and the doll-free bodies the ROM ran instead (the Substitute broke before the move). SANDSTORM (Sand Stream weather
rows) is not a body of the attacker's move and is omitted.
usage: speciesAudit14Coverage.py <receipt dir> <list.tsv>"""
import json, sys, collections
from pathlib import Path
rec = Path(sys.argv[1]); grid = collections.OrderedDict()
for line in open(sys.argv[2]):
    stem, base, side, move, name, _ = line.rstrip("\n").split("\t")
    res = [x for x in json.loads((rec / f"{stem}.json").read_text())["results"] if x.get("move") == move]
    sw = [x for x in res if x["kind"] == "swap"]; pl = [x for x in res if x["kind"] == "plain"]
    cell = f"{sum(not any(x['prod']['px']) for x in sw)}/{len(sw)}" + (f" +{len(pl)}df" if pl else "")
    grid.setdefault((move, side), {})[name] = cell
names = ["STEELIX", "WAILORD", "TYRANITAR", "PICHU", "ONIX", "RATTATA", "GOLBAT", "FLYGON", "WEEZING"]
print("| move | side | " + " | ".join(names) + " |"); print("|---|---|" + "---|" * len(names))
for (move, side), cells in grid.items():
    print(f"| {move} | {side} | " + " | ".join(cells.get(n, "") for n in names) + " |")
