#!/usr/bin/env python3
"""iu120: census delta of the landed universal rows (idle98CensusDelta.py on the fold; docs/iu120-universal-rows.md).

usage: iu120CensusDelta.py <base-shard-dir> <patched-shard-dir> <patched battleResolutionPresentationRender.ts> <out.json>
The masks are read from the LANDED source (LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS -> 0 / 0); land97's N is in both trees, so a moved
command moves by P + T. A battle whose command count differs (a census FRAME_BUDGET stall) must be a key PREFIX of the other tree's.
Checks: the command KEY sequence (battle, kind, moveId, side, attacker, target) and every shard's battleDigestExcludingFrames are
identical (a shard whose key sequence differs is reported with its first difference); no status change; per command,
frames(patched) - frames(base) == P + T for a move command whose adapter duration is defined (P = 3 unless the patch's
LIVE_MOVE_NO_PRE_ROW_SIDES masks the side, T = 2 if LIVE_MOVE_POST_ROW_SIDES does; this includes presentation-stage fallbacks, which
present the field for the command's duration) and 0 for every other command (a Substitute swap composite keeps 0).
"""
import collections, json, re, sys

bdir, pdir, diff, out = sys.argv[1:5]
text = open(diff).read()


def mask(name):
    body = text.split(f"const {name}: ReadonlyMap<number, number> = new Map([", 1)[1].split("]);", 1)[0]
    return {int(a): int(b) for a, b in re.findall(r"\[(\d+), (\d+)\]", body)}


NOPRE, POST = mask("LIVE_MOVE_NO_PRE_ROW_SIDES"), mask("LIVE_MOVE_POST_ROW_SIDES")
UNMEASURED = {int(x) for x in re.findall(r"\d+", text.split("LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS: ReadonlySet<number> = new Set([", 1)[1].split("]", 1)[0])}
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
shard = lambda d, k: [json.loads(l) for l in open(f"{d}/r{k}.jsonl") if l.strip()]
res = {"shards": {}, "statusChanges": collections.Counter(), "frameDeltaMismatches": 0, "mismatchSamples": [], "perMoveSide": {}}
per = collections.defaultdict(lambda: [0, 0, 0])
tot = {"commands": [0, 0], "frames": [0, 0], "liveFrames": [0, 0], "live": [0, 0], "moved": 0, "liveMoved": 0, "framesAdded": 0, "swapsKept0": 0}
for k in range(10):
    B, P = shard(bdir, k), shard(pdir, k)
    db, dp = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{pdir}/r{k}.json"))
    same_keys = [key(c) for c in B] == [key(c) for c in P]
    sh = {"commands": [len(B), len(P)], "keySequenceIdentical": same_keys,
          "battleDigestExcludingFramesIdentical": db["battleDigestExcludingFrames"] == dp["battleDigestExcludingFrames"]}
    if not same_keys:
        i = next((i for i, (b, p) in enumerate(zip(B, P)) if key(b) != key(p)), min(len(B), len(P)))
        sh["firstKeyDifference"] = {"index": i, "base": B[i] if i < len(B) else None, "patched": P[i] if i < len(P) else None}
        bb = collections.Counter(c["battle"] for c in B); pb = collections.Counter(c["battle"] for c in P)
        sh["battlesWithDifferentCommandCounts"] = {b: [bb[b], pb[b]] for b in sorted(set(bb) | set(pb)) if bb[b] != pb[b]}
        kb = lambda X, b: [key(c) for c in X if c["battle"] == b]
        sh["differentBattlesArePrefixes"] = all(
            (lambda x, y: x[:len(y)] == y if len(x) >= len(y) else y[:len(x)] == x)(kb(B, b), kb(P, b)) for b in sh["battlesWithDifferentCommandCounts"])
    res["shards"][k] = sh
    for t, X in ((0, B), (1, P)):
        tot["commands"][t] += len(X); tot["frames"][t] += sum(c["frames"] for c in X)
        tot["liveFrames"][t] += sum(c["liveFrames"] for c in X); tot["live"][t] += sum(c["status"] == "live" for c in X)
    bad_battles = set(sh.get("battlesWithDifferentCommandCounts", {}))
    pb = collections.defaultdict(list)
    for c in P:
        pb[c["battle"]].append(c)
    bbm = collections.defaultdict(list)
    for c in B:
        bbm[c["battle"]].append(c)
    for battle, bl in bbm.items():
        if battle in bad_battles:
            continue
        for b, p in zip(bl, pb[battle]):
            if b["status"] != p["status"]:
                res["statusChanges"][f'{b["status"]}->{p["status"]}'] += 1
            bit = 1 if b["side"] == "player" else 2
            n = 0
            if b["kind"] == "move" and b.get("duration") is not None and b.get("moveId") not in UNMEASURED:
                n = (0 if NOPRE.get(b.get("moveId"), 0) & bit else 3) + (2 if POST.get(b.get("moveId"), 0) & bit else 0)
                if b.get("swapFrames", 0) > 0:
                    tot["swapsKept0"] += 1
                    n = 0
            d = p["frames"] - b["frames"]
            if d != n:
                res["frameDeltaMismatches"] += 1
                if len(res["mismatchSamples"]) < 5:
                    res["mismatchSamples"].append({"base": b, "patched": p, "expected": n})
            if n:
                m = per[f'{b["moveId"]} {b["move"]} {b["side"]}']
                m[0] += 1; m[1] += d; m[2] = n
                tot["moved"] += 1; tot["framesAdded"] += d; tot["liveMoved"] += b["status"] == "live"
res["statusChanges"] = dict(res["statusChanges"])
res.update(tot)
res["perMoveSide"] = {k: {"commands": v[0], "framesAdded": v[1], "rows": v[2]} for k, v in sorted(per.items())}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("perMoveSide", "mismatchSamples", "shards")}))
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "firstKeyDifference"} for k, v in res["shards"].items() if not (v["keySequenceIdentical"] and v["battleDigestExcludingFramesIdentical"])}))
