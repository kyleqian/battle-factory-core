#!/usr/bin/env python3
"""Relative-y invariance of NEEDS-KEYS destroy groups. The body-plan classifier calls a destroy group KEYS when its members share a priority word but differ in y
("y is species/position dependent"). The ROM order inside such a group depends only on the y DIFFERENCES between members; when the sprites are placed at fixed
offsets from the battler position the differences are constant and the group order is species-independent. This script checks that on every NEEDS-KEYS body of
the committed + ext + policy-gap probe tables: same plan signature in all scenarios, same relative-y vector in every KEYS group, and counts the distinct absolute-y
fingerprints (the evidence that the order did not just repeat on one geometry).
usage: OUT=/tmp/pgprobe python3 tools/integration/spriteOrderPolicyGapsRelY.py [--write]  -> fixtures/sprite-order-policy-gaps/relative-y-candidates.json"""
import collections, json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P

OUT = Path(os.environ.get("OUT", "/tmp/pgprobe"))
NAMES = ["dt-player", "dt-opponent", "ft-player", "ft-opponent", "ftb-player", "ftb-opponent", "ftc-player", "ftc-opponent", "fd-player", "fd-opponent", "en-player", "en-opponent", "en2-player", "en3-player", "en3-opponent"]


def mine():
    out = []
    for n in NAMES:
        sc = P.extract_scenario("pg", str(OUT / f"rows-{n}-A.json"))
        sc["side"], sc["file"] = n.split("-")[1], f"pg-{n}.json"
        out.append(sc)
    return out


def main(argv):
    base = json.loads(P.TABLE.read_text())["scenarios"]
    ext = json.loads((P.FIX / "sprite-order-body-events-ext.json").read_text())["scenarios"]
    SC = base + ext + mine()
    agg = collections.defaultdict(lambda: {"scen": [], "sigs": collections.Counter(), "rel": collections.Counter(), "abs": set(), "why": collections.Counter()})
    for sc in SC:
        T = P.tokenize_scenario(sc)
        for u, tw in zip(sc["units"], T):
            if u["kind"] != "body" or u["truncated"] or u.get("mv", 0) == 0:
                continue
            key = P.ukey(sc, u)
            a = agg[key]
            a["scen"].append(sc["file"]); a["sigs"][P.sig(tw)] += 1
            rel, absy = [], []
            for w, t in zip(u["windows"], tw):
                if t.get("cls") == "KEYS" and "G" in w and all(g[2] is not None for g in w["G"]):
                    ys = [g[2] for g in w["G"]]
                    rel.append([y - min(ys) for y in ys]); absy.append(min(ys))
                    a["why"][t.get("why", "")] += 1
            a["rel"][json.dumps(rel)] += 1
            a["abs"].add(json.dumps(absy))
    rows = {}
    for key, a in sorted(agg.items()):
        if not a["why"]:
            continue
        only_y = set(a["why"]) == {"equal priority word, different y (y is species/position dependent)"}
        invariant = len(a["sigs"]) == 1 and len(a["rel"]) == 1
        rows[key] = {"scenarios": len(a["scen"]), "keysGroupsPerBody": sum(a["why"].values()) // max(len(a["scen"]), 1), "onlyEqualPwDifferentY": only_y,
                     "distinctPlans": len(a["sigs"]), "distinctRelativeYVectors": len(a["rel"]), "distinctAbsoluteYFingerprints": len(a["abs"]),
                     "verdict": ("REL-Y-STATIC (confirmed: >=2 absolute geometries)" if only_y and invariant and len(a["abs"]) >= 2
                                 else "REL-Y-STATIC (single geometry: unconfirmed)" if only_y and invariant else "NEEDS-KEYS"),
                     "relativeY": json.loads(next(iter(a["rel"]))) if invariant else None}
    summ = collections.Counter(r["verdict"] for r in rows.values())
    res = {"schema": "sprite-order-policy-gaps-rely/v1", "bodiesWithKeysGroups": len(rows), "verdicts": dict(summ), "bodies": rows}
    print(json.dumps(res["verdicts"]))
    for k in ("283:player", "283:opponent", "313:player", "313:opponent"):
        print(k, json.dumps({x: y for x, y in rows.get(k, {}).items() if x != "relativeY"}))
    print([k for k, r in rows.items() if r["verdict"].startswith("REL-Y-STATIC (confirmed")])
    if "--write" in argv:
        (P.FIX / "sprite-order-policy-gaps" / "relative-y-candidates.json").write_text(json.dumps(res, indent=1) + "\n")


if __name__ == "__main__":
    main(sys.argv)
