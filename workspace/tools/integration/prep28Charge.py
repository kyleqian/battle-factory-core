#!/usr/bin/env python3
"""prep28: Sky Attack (143) charge vs strike bodies.  Both emit MOVE_ANIMATION 143 (request.turn 0 = charge turn, 1 = strike; BattleScriptFirstChargingTurn /
BattleScript_TwoTurnMovesSecondTurn set sB_ANIM_TURN), so the (move, side) key conflates them.  Splits every observed 143 body by occurrence parity
(0,2,.. = charge, 1,3,.. = strike) over the committed/ext tables and the prep28 probes (3 geometries x A/B identical) and compares plan signatures.
usage: OUT=/tmp/p28 python3 tools/integration/prep28Charge.py [--write] -> fixtures/prep28/sky-attack-split.json"""
import collections, json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P, spriteOrderRelYConfirm as RY
OUT = Path(os.environ.get("OUT", "/tmp/p28")); res = {}
old = RY.old_facts()
for side in ("player", "opponent"):
    cell = f"143:{side}"; scs = [(sc["file"], sc) for sc in old[cell]]
    for g in ("diglett-chansey", "dragonair-chansey", "onix-pidgeotto"):
        a, b = OUT / f"143-{side}-{g}-A.json", OUT / f"143-{side}-{g}-B.json"
        if a.exists() and b.exists() and a.read_bytes() == b.read_bytes():
            sc = P.extract_scenario("p28", str(a))
            if sc: sc["side"], sc["file"] = side, a.name; scs.append((a.name, sc))
    rows = collections.defaultdict(list)
    for name, sc in scs:
        T = P.tokenize_scenario(sc); occ = 0
        for u, tw in zip(sc["units"], T):
            if u["kind"] == "body" and not u["truncated"] and P.ukey(sc, u) == cell:
                rows["charge" if occ % 2 == 0 else "strike"].append((name, [{k: w[k] for k in ("C", "D") if k in w} for w in tw], P.sig(tw), u["windows"] and any("G" in w for w in u["windows"])))
                occ += 1
    res[cell] = {k: {"bodies": len(v), "distinctPlans": len({x[2] for x in v}), "plan": v[0][1] if v else None, "hasMultiDestroyGroup": any(x[3] for x in v),
                     "scenarios": sorted({x[0] for x in v})} for k, v in rows.items()}
    print(cell, {k: (x["bodies"], x["distinctPlans"], json.dumps(x["plan"])) for k, x in res[cell].items()})
if "--write" in sys.argv: (RY.FIX / "prep28/sky-attack-split.json").write_text(json.dumps(res, indent=1) + "\n")
