#!/usr/bin/env python3
"""prep28: run the REL-Y-STATIC confirmation method (spriteOrderRelYConfirm.py, reused unchanged) over EVERY (move, side) cell absent from
SPRITE_ORDER_PRODUCTION_BODIES (ranked-gaps-weight.json). 3 species-pair geometries x runs A and B, direct mGBA, never the HTTP oracles.
usage (from workspace/): python3 tools/integration/prep28Rely.py gen | probe [--jobs N] | analyze        (OUT=/tmp/p28 default for raw probe rows)
outputs under tools/integration/fixtures/prep28/rely/: scenarios/, verdicts.json, confirmed-plans.json"""
import json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderRelYConfirm as RY, spriteOrderPlanCoverageRank as R

RY.RELY = RY.FIX / "prep28/rely"; (RY.RELY / "scenarios").mkdir(parents=True, exist_ok=True)
RY.OUT = Path(os.environ.get("OUT", "/tmp/p28"))


def cells():
    rk = json.loads((RY.FIX / "prep28/ranked-gaps-weight.json").read_text())["rows"]
    w = R.weights(); tot = 2 * sum(w.values()); old = RY.old_facts(); rows = []
    for r in rk:
        c = f"{r['move']}:{r['side']}"
        rows.append({"cell": c, "move": r["move"], "name": r["name"], "side": r["side"], "weight": r["weight"] / tot,
                     "oldScenarios": len(old.get(c, [])), "oldAbsFingerprints": 0, "relativeY": [], "ext": r["verdict"]})
    return rows


if __name__ == "__main__":
    rows = cells(); cmd = sys.argv[1]
    if cmd == "gen": RY.gen(rows)
    elif cmd == "probe": RY.probe(rows, int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 12, len(rows))
    elif cmd == "analyze": RY.analyze(rows, True)
