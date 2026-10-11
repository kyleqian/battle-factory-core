#!/usr/bin/env python3
"""Live audit 22: the ROM's Double Team clone phase input per body, from dt60Probe.py outputs (direct mGBA): the ATTACKER battler sprite's
data[3] on the frame before activation (what CloneBattlerSpriteWithBlend copies; dt60) and both clones' data[0] / data[3] after their first
callback (row 1). usage: audit22Data3.py <dt60-probe.json> ...   (prints one JSON line per body)"""
import json, sys
from pathlib import Path

for path in sys.argv[1:]:
    d = json.loads(Path(path).read_text())
    for b in d["bodies"]:
        atk = int(b["attacker"])
        slot = (6, 8)[atk]
        bat = next(x for x in b["pre"]["battlers"] if x["slot"] == slot)
        row1 = next((r for r in b["rows"] if r["clones"]), None)
        print(json.dumps({"scenario": d["scenario"], "activation": b["activation"], "attacker": atk, "species": b["species"],
                          "battlerData3": bat["data"][3],
                          "clonesRow1": None if row1 is None else [[c["slot"], c["data"][0], c["data"][3]] for c in row1["clones"]]}))
