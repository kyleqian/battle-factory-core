#!/usr/bin/env python3
"""prep28: tie-aware relative-y confirmation.  A KEYS group (equal priority word, different y) is *expressible with the existing plan grammar* when
  (1) its observed destroy order obeys  sort by (priority word, -y, creation window, free-order index at creation)   [every member created in the unit, or a
      survivor of an earlier unit with a creation record; `o` (entry occupant) members must have distinct (pw, -y)],
  (2) the dense rank of (priority word, -y) per member is identical in every geometry (relative y static, ties included).
Then the group is written as an FDERIVED window: members listed in canonical token order with SYNTHETIC priority words = those dense ranks
(production applySpriteOrderUnitPlan sorts by (word, creation seq, F index): tied-y members resolve from the lent free order, i.e. history-correct).
Bodies are pooled from the committed+ext event tables and the prep28 probes (tools/integration/prep28Rely.py, 3 species-pair geometries x A/B, identical).
usage: OUT=/tmp/p28 python3 tools/integration/prep28Tie.py [--write]   -> fixtures/prep28/tie-verdicts.json, plan-rows.json"""
import collections, hashlib, json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P, spriteOrderRelYConfirm as RY, spriteOrderPlanCoverageRank as R

OUT = Path(os.environ.get("OUT", "/tmp/p28")); FIX = P.FIX; PREP = FIX / "prep28"


def window_plan(w):
    d = {}
    if "C" in w: d["C"] = [list(c) for c in w["C"]]
    if "D" in w: d["D"] = [list(t) for t in w["D"]]
    if "pw" in w and w.get("cls") == "FDERIVED": d["pw"] = list(w["pw"])
    return d


def convert(tw, units_w):
    """tw: tokenised windows of one body; units_w: raw windows (with G). -> (plan, absfp, fail-reason)"""
    plan, absfp = [], []
    for t, w in zip(tw, units_w):
        t = dict(t)
        if t.get("cls") == "KEYS":
            G = w["G"]
            if any(g[1] is None or g[2] is None for g in G): return None, None, "keys missing"
            rule = sorted(G, key=lambda g: (g[1], -g[2], g[3][0] if g[3][0] is not None else -1, g[3][1] if g[3][1] is not None else -1))
            if [g[0] for g in rule] != [g[0] for g in G]: return None, None, "observed order contradicts (pw, -y, creation, F index)"
            keys = [(g[1], -g[2]) for g in G]
            dense = {k: i for i, k in enumerate(sorted(set(keys)))}
            ranks = [dense[k] for k in keys]
            if len(set(ranks)) == len(ranks):  # no ties: static observed order
                t["cls"] = "STATIC"; t.pop("pw", None)
            else:
                tied_members = [i for i, r in enumerate(ranks) if ranks.count(r) > 1]
                if any(t["D"][i][0] == "o" or G[i][3][0] is None for i in tied_members): return None, None, "tied member has no creation record"
                both = sorted(zip(t["D"], ranks), key=lambda x: json.dumps(x[0]))
                t["D"], t["pw"], t["cls"] = [x[0] for x in both], [x[1] for x in both], "FDERIVED"
            absfp.append(min(g[2] for g in G)); t["rk"] = ranks
        elif t.get("cls") == "FDERIVED":
            both = sorted(zip(t["D"], t["pw"]), key=lambda x: json.dumps(x[0])); t["D"], t["pw"] = [x[0] for x in both], [x[1] for x in both]
        plan.append(window_plan(t))
    return plan, absfp, None


def bodies_of(sc, key):
    T = P.tokenize_scenario(sc); out = []
    for u, tw in zip(sc["units"], T):
        if u["kind"] == "body" and not u["truncated"] and P.ukey(sc, u) == key:
            plan, absfp, bad = convert([w for w in tw], u["windows"])
            out.append((plan, absfp, bad))
    return out


def main(argv):
    rows = json.loads((PREP / "ranked-gaps-weight.json").read_text())["rows"]
    w = R.weights(); tot = 2 * sum(w.values()); old = RY.old_facts(); names = {v: k for k, v in R.move_ids().items()}
    verdicts, confirmed = [], {}
    for r in rows:
        cell = f"{r['move']}:{r['side']}"; facts = []
        for sc in old.get(cell, []): facts += [("old:" + sc["file"], *b) for b in bodies_of(sc, cell)]
        n_old = len(facts); ident = {}
        for g in sorted(p.name[len(cell.replace(':', '-')) + 1:-7] for p in OUT.glob(cell.replace(":", "-") + "-*-A.json")):
            a = OUT / f"{cell.replace(':', '-')}-{g}-A.json"; b = OUT / f"{cell.replace(':', '-')}-{g}-B.json"
            ident[g] = a.exists() and b.exists() and a.read_bytes() == b.read_bytes()
            if not ident[g]: continue
            sc = P.extract_scenario("p28", str(a))
            if sc is None: ident[g] = "no body"; continue
            sc["side"], sc["file"] = r["side"], a.name
            facts += [("new:" + g, *b_) for b_ in bodies_of(sc, cell)]
        row = {"cell": cell, "move": r["move"], "name": r["name"], "weight": r["weight"] / tot, "extVerdict": r["verdict"], "runsIdentical": ident,
               "bodies": len(facts), "newBodies": len(facts) - n_old}
        good = [f for f in facts if f[3] is None]; bad = [f for f in facts if f[3] is not None]
        if len(facts) == n_old: row.update(verdict="INCONCLUSIVE", why="no complete identical new body")
        elif bad: row.update(verdict="NEEDS-KEYS", why=sorted({f[3] for f in bad})[0], badGeometries=sorted({f[0] for f in bad})[:4])
        else:
            sigs = {json.dumps(f[1], separators=(",", ":")) for f in good}; absf = {json.dumps(f[2]) for f in good}
            row.update(distinctPlans=len(sigs), distinctAbsFingerprints=len(absf), geometries=sorted({f[0] for f in good}))
            if len(sigs) > 1: row.update(verdict="NEEDS-KEYS", why="plan (with tie-normalised words) differs across geometries (%d plans)" % len(sigs))
            elif len(absf) < 2 and len({f[0] for f in good}) < 3: row.update(verdict="INCONCLUSIVE", why="one absolute-y fingerprint")
            else:
                row.update(verdict="CONFIRMED", why="same plan + same (pw,-y) rank vectors over %d absolute-y fingerprints" % len(absf))
                plan = json.loads(next(iter(sigs)))
                confirmed[cell] = {"verdict": "EXACT-PLAN", "rule": "relative-y static, ties by free-order index (FDERIVED words)", "tier": "confirmed",
                                   "plan": plan, "census": {"weight": row["weight"], "geometries": row["geometries"], "distinctAbsoluteYFingerprints": len(absf)}}
        verdicts.append(row)
    cnt = collections.Counter(v["verdict"] for v in verdicts)
    print(dict(cnt), "confirmed weight %.4f" % sum(v["weight"] for v in verdicts if v["verdict"] == "CONFIRMED"))
    for v in verdicts[:45]: print(v["cell"], v["name"], round(v["weight"] * 100, 3), v["verdict"], v["why"][:100])
    if "--write" in argv:
        (PREP / "tie-verdicts.json").write_text(json.dumps({"schema": "prep28-tie-verdicts/v1", "counts": dict(cnt), "cells": verdicts}, indent=1) + "\n")
        (PREP / "plan-rows.json").write_text(json.dumps({"schema": "sprite-order-body-plans/rows-v1", "note": "paste-ready EXACT-PLAN rows (same shape as sprite-order-body-plans-rely.json bodies); pw = synthetic ranks, see prep28Tie.py", "bodies": confirmed}, indent=1) + "\n")


if __name__ == "__main__":
    main(sys.argv)
