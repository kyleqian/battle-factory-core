#!/usr/bin/env python3
"""Plan-only replay over the union corpus (committed + ext event tables + every two-run-identical probe of spriteOrderRelYConfirm.py) with the body plans
overlaid by (a) policy-gaps relative-y rows (283/313) and (b) the rows of fixtures/sprite-order-body-plans-rely.json; plus weighted EXACT coverage before/after.
Gap plans are the union table's own EXACT gap plans. Pure python3 (needs the raw probe rows in $OUT, default /tmp/rely, from `spriteOrderRelYConfirm.py probe`).
usage: OUT=/tmp/rely python3 tools/integration/spriteOrderRelYReplay.py [--write]  -> fixtures/sprite-order-rely/replay-receipt.json"""
import collections, json, os, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P, spriteOrderPlanCoverageRank as R

OUT = Path(os.environ.get("OUT", "/tmp/rely"))
FIX = P.FIX


def replay(SC, T, brow, grow, over):
    """over: key -> plan (EXACT overlay). -> counters, mismatches"""
    bex = {k for k, r in brow.items() if r["verdict"] == "EXACT-PLAN"} | set(over)
    gex = {k for k, r in grow.items() if r["verdict"] == "EXACT-PLAN"}
    stat, bad, per_move = collections.Counter(), [], collections.Counter()
    for sc, tok in zip(SC, T):
        if not sc["entryMatchesProvider"] and sc["freeAtFirstEdge"] != P.ts_entry()[0]:
            continue
        sim, ok = P.Sim(), True
        U = sc["units"]
        for ui, (u, tw) in enumerate(zip(U, tok)):
            if u["kind"] == "body":
                if u["truncated"]:
                    break
                key = P.ukey(sc, u)
                stat["edges"] += 1
                if ok:
                    stat["known"] += 1
                    if sim.F == u["observedFreeAtEdge"]:
                        stat["exact"] += 1
                        if key in over:
                            per_move[key] += 1
                    else:
                        stat["mismatched"] += 1
                        bad.append({"file": sc["file"], "unit": ui, "key": key})
                plan, valid = over.get(key) or brow[key]["plan"], key in bex
            else:
                if u["last"]:
                    continue
                key = P.gkey(sc, U, ui)
                plan, valid = grow[key]["plan"], key in gex
            if not valid:
                ok = False
                continue
            if not ok:
                continue
            sim.apply_unit([dict(pw, cls=ow.get("cls", "SINGLE")) for pw, ow in zip(plan, tw)], None)
    return dict(stat), bad, per_move


def main(argv):
    base = json.loads(P.TABLE.read_text())["scenarios"]
    ext = json.loads((FIX / "sprite-order-body-events-ext.json").read_text())["scenarios"]
    rely, skipped = [], 0
    for a in sorted(OUT.glob("*-A.json")):
        b = a.with_name(a.name[:-7] + "-B.json")
        if not b.exists() or a.read_bytes() != b.read_bytes():
            skipped += 1
            continue
        m, side = a.name.split("-")[:2]
        sc = P.extract_scenario("rely", str(a))
        if sc is None:
            continue
        sc["side"], sc["file"] = side, a.name
        rely.append(sc)
    corpora = {"ext (committed+ext tables)": base + ext, "union (ext + rely probes)": base + ext + rely}
    pg = json.loads((FIX / "sprite-order-policy-gaps/relative-y-plans.json").read_text())["bodies"]
    rr = json.loads((FIX / "sprite-order-body-plans-rely.json").read_text())["bodies"]
    over_pg = {k: v["plan"] for k, v in pg.items()}
    over_rely = {k: v["plan"] for k, v in rr.items()}
    over_strict = {k: v["plan"] for k, v in rr.items() if v["tier"] == "confirmed"}
    res = {"schema": "sprite-order-rely-replay/v1", "relyScenarios": len(rely), "relyRunsNotIdenticalSkipped": skipped}
    plans_union = None
    for name, SC in corpora.items():
        tmp = Path(tempfile.mkdtemp()) / "events.json"
        tmp.write_text(json.dumps({"schema": "sprite-order-body-events/v1", "scenarios": SC}, separators=(",", ":")))
        P.TABLE, P.PLANS = tmp, tmp.with_name("plans.json")
        import io, contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            P.main(["x", "--write"])
        plans = json.loads(P.PLANS.read_text())
        T = [P.tokenize_scenario(sc) for sc in SC]
        out = {}
        for label, over in (("no overlay", {}), ("+ policy-gaps rows", over_pg), ("+ policy-gaps + rely confirmed tier", {**over_pg, **over_strict}), ("+ policy-gaps + all rely rows", {**over_pg, **over_rely})):
            st, bad, per = replay(SC, T, plans["bodies"], plans["gaps"], over)
            out[label] = {"edges": st["edges"], "known": st.get("known", 0), "exact": st.get("exact", 0), "mismatched": st.get("mismatched", 0), "mismatches": bad[:10],
                          "overlayRowEdgesExact": sum(per.values()), "overlayRowsExercised": len(per)}
        res.setdefault("corpora", {})[name] = {"scenarios": len(SC), "replay": out}
        if name.startswith("union"):
            plans_union = plans
    # weighted EXACT coverage (R.coverage model: every Level-50 move id, both sides, weights of the rental pools)
    ext_plans = json.loads((FIX / "sprite-order-body-plans-ext.json").read_text())
    w = R.weights(); tot = 2 * sum(w.values())

    def cov(extra_rows):
        b = {**ext_plans["bodies"], **{k: {"verdict": "EXACT-PLAN"} for k in extra_rows}}
        c = collections.Counter()
        for m, x in w.items():
            for s in ("opponent", "player"):
                c[R.verdict({"bodies": b}, m, s)] += x
        return {k: round(v / tot * 100, 2) for k, v in sorted(c.items())}, sum(R.verdict({"bodies": b}, m, s) == "EXACT" for m in w for s in ("opponent", "player"))
    res["coverage"] = {n: {"weightedPercent": c[0], "exactCells": c[1]} for n, c in (
        ("before (plans-ext)", cov({})), ("+ policy-gaps rows (283/313)", cov(over_pg)), ("+ policy-gaps + rely confirmed tier", cov({**over_pg, **over_strict})),
        ("+ policy-gaps + all rely rows", cov({**over_pg, **over_rely})))}
    print(json.dumps({k: v for k, v in res.items()}, indent=1)[:6000])
    if "--write" in argv:
        (FIX / "sprite-order-rely" / "replay-receipt.json").write_text(json.dumps(res, indent=1) + "\n")


if __name__ == "__main__":
    main(sys.argv)
