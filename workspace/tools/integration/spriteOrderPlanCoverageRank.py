#!/usr/bin/env python3
"""Rank real Factory Level-50 move uses by (move, side) body-plan verdict (pure python3).

Weight model (documented in docs/sprite-order-plan-coverage.md s1): the engine's set pools are the Level-50 rental ranges of
src/data/gen/factory-round-policy.json (rentalSelection.ranges.level50, as used by src/engine/factoryRentalGeneration.ts
getLevel50FactoryRentalRange and factoryBrainOpponentGeneration.ts) over src/data/gen/battle-frontier-mons.json. Ordinary play =
battles 0..6 (ranges 0..6, equal weight per battle), every set in a range equally likely, each of a set's 4 moves = 1 use, for
BOTH orientations (opponent sets drawn from the range of that battle; the player's rentals come from the same ranges, one range up
when "better"; modelled as the same distribution). Weight of (move, side) = mean over battles of (uses of the move per set).
usage: spriteOrderPlanCoverageRank.py [plans.json=sprite-order-body-plans.json] [--json OUT] [--top N]
"""
import json, re, sys, collections
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tools/integration/fixtures"


def move_ids():
    return {n: int(v) for n, v in re.findall(r"#define MOVE_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/moves.h").read_text())}


def weights():
    mons = json.loads((ROOT / "src/data/gen/battle-frontier-mons.json").read_text())["entries"]
    ranges = json.loads((ROOT / "src/data/gen/factory-round-policy.json").read_text())["rentalSelection"]["ranges"]["level50"][:7]
    ids = move_ids()
    w = collections.Counter()
    for r in ranges:
        sets = [m for m in mons if r["start"] <= m["index"] <= r["end"]]
        for m in sets:
            for mv in m["moves"]:
                w[ids[mv[5:]]] += 1 / len(sets) / len(ranges)
    return w  # expected uses per set-slot-average; per side identical


def verdict(plans, mid, side):
    b = plans["bodies"]
    r = b.get(f"{mid}:{side}")
    return "NOT-OBSERVED" if r is None else ("EXACT" if r["verdict"] == "EXACT-PLAN" else "NEEDS-KEYS")


def coverage(plans, w, live):
    tot = collections.Counter(); wt = 0
    for mid, x in w.items():
        for side in ("opponent", "player"):
            v = verdict(plans, mid, side)
            tot[v] += x; wt += x
    return {k: v / wt for k, v in tot.items()}


def main(argv):
    src = Path(argv[1]) if len(argv) > 1 and not argv[1].startswith("--") else FIX / "sprite-order-body-plans.json"
    plans = json.loads(src.read_text())
    w = weights(); live = set(plans["liveIds"]); names = {v: k for k, v in move_ids().items()}
    cov = coverage(plans, w, live)
    print(json.dumps({"plans": src.name, "coverageByVerdict": {k: round(v, 4) for k, v in sorted(cov.items())},
                      "moveIdsInSets": len(w), "liveMovesInSets": sum(m in live for m in w)}, indent=1))
    rows = []
    for mid, x in sorted(w.items(), key=lambda t: -t[1]):
        for side in ("opponent", "player"):
            rows.append({"move": mid, "name": names[mid], "side": side, "weight": x, "verdict": verdict(plans, mid, side)})
    n = int(argv[argv.index("--top") + 1]) if "--top" in argv else 20
    for v in ("NOT-OBSERVED", "NEEDS-KEYS"):
        print(v, "top by weight:", [(r["move"], r["name"], r["side"][0], round(r["weight"] / sum(w.values()) * 50, 3)) for r in rows if r["verdict"] == v][:n])
    if "--json" in argv:
        Path(argv[argv.index("--json") + 1]).write_text(json.dumps({"coverage": cov, "rows": rows}, indent=1) + "\n")


if __name__ == "__main__":
    main(sys.argv)
