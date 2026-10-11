#!/usr/bin/env python3
"""idle98: compare idle94RouteRender.ts outputs of the base and the idle98-patched tree (r1 / r2 each) for the universal rows.

usage: idle98RenderCheck.py <render-dir> <routes.txt> <patch.diff> <out.json>
<render-dir>/{base,patched}-{r1,r2}-b<battle>-<move>-<side>.json. P (pre) / T (post) per move and side come from the patch's
LIVE_MOVE_NO_PRE_ROW_SIDES / LIVE_MOVE_POST_ROW_SIDES masks (1 player, 2 opponent): P = 0 if masked else 3, T = 2 if masked else 0.
Per route: r1 == r2 in each tree; patched rows == base rows + P + T; patched rows 0..P-1 are base row 0 (sha, age 0, live); patched row
P+k == base row k (sha, age, live) for every k; patched rows after the body repeat base's LAST row (sha, age, live); the next
command's first row is equal in both trees; battle frames reported (other live bodies on the route add their own rows).
A Random2 adapter (presentation-RNG words drawn at its activation; the host advances every frame, presentationRngHost.ts) on a route
whose EARLIER live bodies gained rows draws different faithful-random words: its body rows must then keep (age, live) everywhere and
the sha below the plan's first draw age (src/engine/liveMovePresentationRng.ts plans: Double Kick 24 ageOffset 10, Water Pulse 352 86).
"""
import json, os, re, sys

rdir, routes, diff, out = sys.argv[1:5]
text = open(diff).read()


def mask(name):
    body = text.split(f"const {name}: ReadonlyMap<number, number> = new Map([", 1)[1].split("]);", 1)[0]
    return {int(a): int(b) for a, b in re.findall(r"\[(\d+), (\d+)\]", body)}


NOPRE, POST = mask("LIVE_MOVE_NO_PRE_ROW_SIDES"), mask("LIVE_MOVE_POST_ROW_SIDES")
RANDOM2_FIRST_DRAW_AGE = {24: 10, 352: 86}
res, ok = {}, 0
for line in open(routes):
    if not line.strip():
        continue
    b, m, side = line.split()
    m, bit = int(m), 1 if side == "player" else 2
    P = 0 if NOPRE.get(m, 0) & bit else 3
    T = 2 if POST.get(m, 0) & bit else 0
    ld = lambda t, r: json.load(open(os.path.join(rdir, f"{t}-{r}-b{b}-{m}-{side}.json")))
    base, pat = ld("base", "r1"), ld("patched", "r1")
    r1r2 = ld("base", "r2") == base and ld("patched", "r2") == pat
    bt = [x for x in base["render"] if not x.get("after")]
    pt = [x for x in pat["render"] if not x.get("after")]
    ba = [x for x in base["render"] if x.get("after")]
    pa = [x for x in pat["render"] if x.get("after")]
    key = lambda x: (x["sha"], x["age"], x["live"])
    n = len(bt)
    rows_ok = len(pt) == n + P + T
    pre_ok = rows_ok and all(key(pt[i]) == (bt[0]["sha"], 0, True) for i in range(P))
    body_ok = rows_ok and all(key(pt[P + k]) == key(bt[k]) for k in range(n))
    words = None
    if not body_ok and rows_ok and m in RANDOM2_FIRST_DRAW_AGE:
        diff_ages = [bt[k]["age"] for k in range(n) if pt[P + k]["sha"] != bt[k]["sha"]]
        words = {"firstDrawAge": RANDOM2_FIRST_DRAW_AGE[m], "firstDifferingAge": min(diff_ages), "differingRows": len(diff_ages),
                 "ageLiveEqual": all((pt[P + k]["age"], pt[P + k]["live"]) == (bt[k]["age"], bt[k]["live"]) for k in range(n))}
        body_ok = words["ageLiveEqual"] and words["firstDifferingAge"] >= words["firstDrawAge"]
    post_ok = rows_ok and all(key(pt[P + n + j]) == key(bt[-1]) and bt[-1]["live"] for j in range(T))
    after_ok = len(ba) == len(pa) == 1 and ba[0]["sha"] == pa[0]["sha"]
    all_live = all(x["live"] for x in bt) and all(x["live"] for x in pt)
    rec = {"battle": int(b), "move": m, "side": side, "P": P, "T": T, "baseRows": n, "patchedRows": len(pt), "r1EqualsR2": r1r2,
           "preRowsAreBaseRow0": pre_ok, "bodyRowsUnchanged": body_ok, "postRowsRepeatBaseLastRow": post_ok,
           "nextCommandFirstRowEqual": after_ok, "allLive": all_live, "random2WordsDiffer": words,
           "battleFrames": {"base": base["frames"], "patched": pat["frames"], "delta": pat["frames"] - base["frames"]}}
    rec["pass"] = all((r1r2, rows_ok, pre_ok, body_ok, post_ok, after_ok, all_live))
    ok += rec["pass"]
    res[f"b{b}-{m}-{side}"] = rec
    print(f"b{b:>4} {m:3d} {side:8s} P {P} T {T} rows {n} -> {len(pt)} pre {pre_ok} body {body_ok} post {post_ok} after {after_ok} "
          f"live {all_live} r1==r2 {r1r2}{' (Random2 words differ from age ' + str(words['firstDifferingAge']) + ')' if words else ''} battle frames {base['frames']} -> {pat['frames']} ({pat['frames'] - base['frames']:+d})")
json.dump({"pass": ok, "routes": len(res), "results": res}, open(out, "w"), indent=1)
print(f"{ok} / {len(res)} pass")
