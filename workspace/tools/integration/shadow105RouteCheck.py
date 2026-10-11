#!/usr/bin/env python3
"""shadow105 (docs/next-adapters-shadow105.md): compare shadow105RouteRender.ts on the base and the patched copy, per census route
(the FIRST move-animation command of <move> by <side>; its rows rendered through production's createBattleResolutionPresentationRenderView
+ renderBattleResolutionLiveView). Per route: base lead Lb and patched lead Lp (rows with age 0 before the first age-1 row), then
  patched row 0 carries preActivationRow; patched rows 1 .. Lp-1 == base row 0 when Lb == 0 (the age-0 image) or == base rows 1 .. Lb-1;
  patched row Lp + k == base row Lb + k for every body row k; the next command's first row is equal;
  patched row 0 vs row 1: the px and bbox (an elevated opponent: the 32x8 enemy shadow, inside x 160..191 y 65..72).
usage: shadow105RouteCheck.py <dir with {base,patched}-b<seed>-<move>-<side>.json> <out.json> <seed:move:side>...
"""
import json, sys
d, out, routes = sys.argv[1], sys.argv[2], sys.argv[3:]
res = {}
for r in routes:
    seed, move, side = r.split(":")
    b, p = (json.load(open(f"{d}/{t}-b{seed}-{move}-{side}.json")) for t in ("base", "patched"))
    tb, tp = [x for x in b["render"] if not x.get("after")], [x for x in p["render"] if not x.get("after")]
    lead = lambda rows: next((i for i, x in enumerate(rows) if x["age"] not in (0, None)), len(rows)) - 1
    lb, lp = lead(tb), lead(tp)
    body_b, body_p = tb[lb:], tp[lp:]
    mid_ok = all(tp[j]["sha"] == (tb[0]["sha"] if lb == 0 else tb[j]["sha"]) and tp[j]["age"] == 0 for j in range(1, lp))
    bb = (p["row0VsRow1"] or {}).get("bbox")
    res[r] = {"framesBase": b["frames"], "framesPatched": p["frames"], "rowsBase": len(tb), "rowsPatched": len(tp), "leadBase": lb, "leadPatched": lp,
              "patchedRow0PreActivation": tp[0].get("pre") is True and not any(x.get("pre") for x in tp[1:]),
              "patchedRow0EqualsBaseRow0": tp[0]["sha"] == tb[0]["sha"],
              "patchedLeadRows1ToLEqualAge0Image": mid_ok,
              "bodyRowsIdentical": [x["sha"] for x in body_b] == [x["sha"] for x in body_p] and [x["age"] for x in body_b] == [x["age"] for x in body_p],
              "afterRowEqual": [x["sha"] for x in b["render"] if x.get("after")] == [x["sha"] for x in p["render"] if x.get("after")],
              "patchedRow0VsRow1": p["row0VsRow1"], "baseRow0VsRow1": b["row0VsRow1"],
              "row0DiffInsideShadowBox": bb is not None and bb[0] >= 160 and bb[1] >= 65 and bb[2] <= 191 and bb[3] <= 72,
              "commandKeysIdentical": [(x["type"], x.get("moveId"), x.get("attacker")) for x in b["rows"]] == [(x["type"], x.get("moveId"), x.get("attacker")) for x in p["rows"]]}
json.dump({"schema": "shadow105-route-check/v1", "routes": res}, open(out, "w"), indent=1); open(out, "a").write("\n")
for r, v in res.items():
    print(r, {k: v[k] for k in ("framesBase", "framesPatched", "leadBase", "leadPatched", "patchedRow0PreActivation", "patchedLeadRows1ToLEqualAge0Image",
                                "bodyRowsIdentical", "afterRowEqual", "patchedRow0VsRow1", "row0DiffInsideShadowBox", "commandKeysIdentical")})
