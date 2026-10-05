#!/usr/bin/env python3
"""prep11: is Task_UpdateMonBg's data (the 'monbg' input of Foresight/Petal Dance/Air Cutter/Sky Uppercut/Spider Web/Roar/Rollout/Recycle) derivable from the battler anchors?
Formula under test (data[] of the first Task_UpdateMonBg of each body): [bgId = 6 (player target) / 8 (opponent target), x, y, 32-x, 32-y, inBg2 = (target is the player), battlerId = target, 0],
(x, y) = target battler sprite x/y at the activation (+ the species front idle x2, 1 for ONIX). usage: prep11MonbgCheck.py (needs fixtures/prep11/prep11-analysis.json)"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
A = json.loads((ROOT / "tools/integration/fixtures/prep11/prep11-analysis.json").read_text())
rows, bad = [], []
for sc, rs in A.items():
    for r in rs:
        m = r["monbgData"]
        if not m or r["animTurn"] != 1: continue
        d = m[2]; b = d[6]; xy = r["battlerXY"][b]
        ok = (d[0] == (6 if b == 0 else 8) and d[3] == 32 - d[1] and d[4] == 32 - d[2] and d[5] == (1 if b == 0 else 0) and d[2] == xy[1] and d[1] - xy[0] in (0, 1))
        rows.append({"scenario": sc, "move": r["move"], "createdAge": m[0], "slot": m[1], "data": d, "targetBattlerXYatActivation": xy, "xDelta": d[1] - xy[0], "formulaHolds": ok})
        if not ok: bad.append(rows[-1])
(ROOT / "tools/integration/fixtures/prep11/prep11-monbg-formula.json").write_text(json.dumps({"rows": rows, "violations": bad}, indent=1))
print(len(rows), "bodies;", len(bad), "violations"); [print(" ", v["scenario"], v["move"], v["data"], v["targetBattlerXYatActivation"]) for v in bad]
print("xDelta by target species side:", sorted({(r["data"][6], r["xDelta"]) for r in rows}))
