#!/usr/bin/env python3
"""prep38 summary: one line per TEST body (defender shown as the doll) from the receipt dirs written by prep38Run.sh: Factory use weight of
(move, attacker side) (spriteOrderPlanCoverageRank.py weight model, % of all Level-50 (move, side) uses), window rows, age shift, the doll-free
CONTROL body of the same scenario (production as is), the production fallback (decline -> static field), and each patch variant (v1 / v2 / v3,
with production's order input and with drop-164) + the two negative controls. Cells are run-1 px; `!` marks a fixture whose two fresh runs differ,
`d` a declined (not engaged) live view, `-` no receipt (no live adapter for that orientation / pair). usage: prep38Summary.py <REC>"""
import importlib.util, json, sys
from pathlib import Path
REC = Path(sys.argv[1]); ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("rank", ROOT / "tools/integration/spriteOrderPlanCoverageRank.py")
rank = importlib.util.module_from_spec(spec); spec.loader.exec_module(rank)
w = rank.weights(); tot = sum(w.values())
COLS = ["control", "fallback", "env-prodorder", "env", "assets-env", "assets-palette-env", "neg-center", "neg-rest"]
def cell(sub, name):
    p = REC / sub / name
    if not p.exists(): return None
    r = json.loads(p.read_text())[0]
    return r
rows = []
for f in sorted((REC / "derived").glob("*-test.json")):
    fx = json.loads(f.read_text())
    out = {"stem": fx["stem"].removeprefix("prep38-"), "move": fx["move"], "side": fx["attacker"]["geometry"]["side"],
           "attacker": fx["attacker"]["species"], "defender": fx["target"]["species"],
           "weight": round(w.get(fx["moveId"], 0) / tot * 50, 3), "rows": fx["denseWindow"]["endFrame"] - fx["denseWindow"]["startFrame"] + 1}
    for c in COLS:
        r = cell(c, f.name.replace("-test", "-control") if c == "control" else f.name)
        if r is None: out[c] = "-"; continue
        if c == "fallback": out["shift"] = r["shift"]
        out[c] = f"{r['runs'][0]['residualPixels']}{'' if r['identical'] else '!'}{'' if r['liveEngaged'] else 'd'}"
        if c in ("assets-palette-env",): out["v3ages"] = r["affectedAges"][:40]
    rows.append(out)
hdr = ["stem", "weight", "rows", "shift"] + COLS + ["v3ages"]
print("\t".join(hdr))
for r in rows: print("\t".join(str(r.get(k, "")) for k in hdr).rstrip())
(REC / "summary.json").write_text(json.dumps(rows, indent=1) + "\n")
