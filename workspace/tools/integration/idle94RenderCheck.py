#!/usr/bin/env python3
"""idle94: compare idle94RouteRender.ts outputs of the base and the patched tree (r1 / r2 each).

usage: idle94RenderCheck.py <render-dir> <routes.txt> <out.json>
<render-dir>/{base,patched}-{r1,r2}-b<battle>-<move>-<side>.json. Per route: r1 == r2 in each tree; patched target rows == base + N;
patched rows 0..N-1 are base row 0's framebuffer (live, age 0); patched row N+k == base row k (sha, age, live) for every k; the next
command's first row equal in both trees; the battle's total frames move by exactly +N per live body of a lead move on the route
(reported, not asserted: other lead moves on the same route add their own N).
"""
import json, os, sys

rdir, routes, out = sys.argv[1:4]
LEAD = {339: 4, 207: 7, 269: 10, 184: 4}
res, ok = {}, 0
for line in open(routes):
    if not line.strip():
        continue
    b, m, side = line.split()
    m = int(m)
    ld = lambda t, r: json.load(open(os.path.join(rdir, f"{t}-{r}-b{b}-{m}-{side}.json")))
    base, pat = ld("base", "r1"), ld("patched", "r1")
    r1r2 = ld("base", "r2") == base and ld("patched", "r2") == pat
    N = LEAD[m]
    bt = [x for x in base["render"] if not x.get("after")]
    pt = [x for x in pat["render"] if not x.get("after")]
    ba = [x for x in base["render"] if x.get("after")]
    pa = [x for x in pat["render"] if x.get("after")]
    lead_ok = all(pt[i]["sha"] == bt[0]["sha"] and pt[i]["age"] == 0 and pt[i]["live"] for i in range(N))
    body_ok = len(pt) == len(bt) + N and all((pt[N + k]["sha"], pt[N + k]["age"], pt[N + k]["live"]) == (bt[k]["sha"], bt[k]["age"], bt[k]["live"])
                                             for k in range(len(bt)))
    after_ok = len(ba) == len(pa) == 1 and ba[0]["sha"] == pa[0]["sha"]
    all_live = all(x["live"] for x in bt) and all(x["live"] for x in pt)
    rec = {"battle": int(b), "move": m, "side": side, "N": N, "baseRows": len(bt), "patchedRows": len(pt), "r1EqualsR2": r1r2,
           "leadRowsAreBaseRow0": lead_ok, "bodyRowsUnchanged": body_ok, "nextCommandFirstRowEqual": after_ok, "allLive": all_live,
           "battleFrames": {"base": base["frames"], "patched": pat["frames"], "delta": pat["frames"] - base["frames"]}}
    rec["pass"] = all((r1r2, lead_ok, body_ok, after_ok, all_live))
    ok += rec["pass"]
    res[f"b{b}-{m}-{side}"] = rec
    print(f"b{b:>4} {m} {side:8s} N {N:2d} rows {len(bt)} -> {len(pt)} lead {lead_ok} body {body_ok} after {after_ok} live {all_live} "
          f"r1==r2 {r1r2} battle frames {base['frames']} -> {pat['frames']} ({pat['frames'] - base['frames']:+d})")
json.dump({"pass": ok, "routes": len(res), "results": res}, open(out, "w"), indent=1)
print(f"{ok} / {len(res)} pass")
