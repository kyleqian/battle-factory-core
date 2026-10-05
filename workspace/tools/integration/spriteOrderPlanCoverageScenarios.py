#!/usr/bin/env python3
"""Generate minimal BattleLab scenarios into tools/integration/fixtures/plan-coverage-scenarios/ for NOT-OBSERVED (move, side) pairs that have no
stock mechanic-<move>-*.json for that attacker side. Template = tools/battle-lab/mechanic-quick-attack-{,player-}pidgeotto-onix.json (battler
override of the lead's four moves = [move]*4, same A,A trace) -- the existing generator pattern of spriteOrderBodyPlansCoverageBatch.py's inputs.
usage: spriteOrderPlanCoverageScenarios.py [plans.json]  (--force: also for pairs whose stock scenarios exist but never produced a body edge) [--force]   (pure python3)"""
import copy, glob, json, sys
from pathlib import Path
sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P, spriteOrderPlanCoverageRank as R

OUT = R.ROOT / "tools/integration/fixtures/plan-coverage-scenarios"
TPL = {"opponent": "tools/battle-lab/mechanic-quick-attack-pidgeotto-onix.json", "player": "tools/battle-lab/mechanic-quick-attack-player-pidgeotto-onix.json"}
SKIP = {0: "UNAVAILABLE", 243: "Mirror Coat needs a prior physical hit (no minimal single-trace scenario)"}


def main(argv):
    src = Path(argv[1]) if len(argv) > 1 and not argv[1].startswith("--") else R.FIX / "sprite-order-body-plans.json"
    plans = json.loads(src.read_text()); w = R.weights(); names = {v: k for k, v in R.move_ids().items()}
    OUT.mkdir(exist_ok=True); n = 0
    for m in sorted(w, key=lambda m: -w[m]):
        if m in SKIP:
            continue
        slug = names[m].lower().replace("_", "-")
        for s in ("opponent", "player"):
            if R.verdict(plans, m, s) != "NOT-OBSERVED":
                continue
            fs = glob.glob(f"tools/battle-lab/mechanic-{slug}-*.json") + glob.glob(str(OUT / f"{slug}-*.json"))
            if "--force" not in argv and any(P.side_of({"move": m, "scenario": str(f)}) == s and json.loads(Path(f).read_text()).get("profile") == "battle-scene-on" for f in fs):
                continue
            d = json.loads((R.ROOT / TPL[s]).read_text())
            d["overrides"]["battlers"] = {s: {"moves": [m] * 4, "ppUps": [0, 0, 0, 0]}}
            (OUT / f"{slug}-{s}-generic.json").write_text(json.dumps(d, indent=1) + "\n"); n += 1
    print("generated", n, "scenarios in", OUT)


if __name__ == "__main__":
    main(sys.argv)
