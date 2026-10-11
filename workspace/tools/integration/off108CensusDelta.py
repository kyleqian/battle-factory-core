#!/usr/bin/env python3
"""off108: census delta of the banked patch (docs/off108-scene-off-pauses.md §5), seeds 0..999, base vs patched archive copies.

usage: off108CensusDelta.py <on-base-shards> <on-patched-shards> <off-base-routes> <off-patched-routes> <out.json>
Scene ON: liveShareCensus.ts shards r0..r9 (.json + .jsonl, --seeds=100k..100k+99 --index-from=100k). Every move / substitute-fade
command must keep its KEY (battle, kind, moveId, side, attacker, target), status and frames; battleDigestExcludingFrames must be equal per
shard; the battle frame totals move only by the used-move holds of (c).
Scene OFF: off108Route.ts --scene=off shards off-0..off-9 (same seeds). The uses (seed, move, attacker, u, receipt path) must be identical;
every command list must be identical once the patch's own changes are removed: an inserted pause command (move-animation at a no-hit attack
receipt's eventSequence) and the used-move message's holdFrames. Inserted commands / frames and widened holds are tallied per class
(the next presented receipt N: message / STATS_CHANGE / status-data / HP bar; holds by the print's source label).
"""
import collections, glob, json, os, sys

on_b, on_p, off_b, off_p, out_path = sys.argv[1:6]
res = {"schema": "off108-census-delta/v1"}

# ---- Scene ON (liveShareCensus) ----
on = {"shards": [], "commandKeyMismatch": 0, "statusChanges": 0, "frameChanges": 0, "commands": 0}
tot_b = tot_p = 0
for k in range(10):
    rb, rp = (json.load(open(os.path.join(d, f"r{k}.json"))) for d in (on_b, on_p))
    cb = [json.loads(l) for l in open(os.path.join(on_b, f"r{k}.jsonl")) if l.strip()]
    cp = [json.loads(l) for l in open(os.path.join(on_p, f"r{k}.jsonl")) if l.strip()]
    key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
    if [key(c) for c in cb] != [key(c) for c in cp]:
        on["commandKeyMismatch"] += 1
    for a, b in zip(cb, cp):
        on["statusChanges"] += a["status"] != b["status"]
        on["frameChanges"] += a["frames"] != b["frames"]
    on["commands"] += len(cb)
    tot_b += rb["battles"]["frames"]; tot_p += rp["battles"]["frames"]
    on["shards"].append({"shard": k, "battleDigestExcludingFramesSame": rb["battleDigestExcludingFrames"] == rp["battleDigestExcludingFrames"],
                         "live": [rb["overall"]["live"], rp["overall"]["live"]], "fallback": [rb["overall"]["fallback"], rp["overall"]["fallback"]],
                         "frames": [rb["battles"]["frames"], rp["battles"]["frames"]],
                         "battlesWithMovedFrames": sum(x != y for x, y in zip(rb["battleFrames"], rp["battleFrames"]))})
on["framesBase"], on["framesPatched"], on["framesDelta"] = tot_b, tot_p, tot_p - tot_b
on["battleDigestExcludingFramesSame"] = sum(s["battleDigestExcludingFramesSame"] for s in on["shards"])
res["sceneOn"] = on


# ---- Scene OFF (off108Route) ----
def load(d):
    return [json.loads(l) for f in sorted(glob.glob(os.path.join(d, "off-*.jsonl")), key=lambda p: int(p.rsplit("-", 1)[1].split(".")[0]))
            for l in open(f) if l.strip()]


ub, up = load(off_b), load(off_p)
off = {"uses": [len(ub), len(up)], "useKeyMismatch": 0, "commandMismatch": 0, "inserted": 0, "insertedFrames": 0, "holds": 0, "holdFrames": 0,
       "insertedByN": collections.Counter(), "insertedFramesByN": collections.Counter(), "holdsByLabel": collections.Counter(),
       "holdFramesByLabel": collections.Counter(), "insertedByMove": collections.Counter(), "noHitWithoutPause": collections.Counter(),
       "mismatchExamples": []}
ukey = lambda u: (u["seed"], u["move"], u["attacker"], u["u"], json.dumps(u["follow"]))
# uses are compared seed by seed: a battle whose frame budget is hit can end at a different point in the two trees
by_seed = lambda us: {s: [u for u in us if u["seed"] == s] for s in sorted({u["seed"] for u in us})}
sb, sp = by_seed(ub), by_seed(up)
off["seedsDiffering"] = []
for seed in sorted(set(sb) | set(sp)):
    a, b = sb.get(seed, []), sp.get(seed, [])
    if [ukey(u) for u in a] != [ukey(u) for u in b]:
        n = 0
        while n < min(len(a), len(b)) and ukey(a[n]) == ukey(b[n]):
            n += 1
        off["seedsDiffering"].append({"seed": seed, "uses": [len(a), len(b)], "commonPrefix": n})
        off["useKeyMismatch"] += 1
        a, b = a[:n], b[:n]
    for x, y in zip(a, b):
        cx, cy = x["commands"], y["commands"]
        att = y["attack"]
        ins = [c for c in cy if att is not None and not y["hit"] and c[0] == att[0] and c[1] == "move-animation"]
        rest = [c for c in cy if c not in ins]
        if cy and cx and cy[0][1] == "message" and cx[0][3] != cy[0][3]:
            off["holds"] += 1
            d = (cy[0][3] or 0) - (cx[0][3] or 0)
            off["holdFrames"] += d
            n = next((r for r in y["follow"] if r[1] == "message"), None)
            lab = n[3].split(":")[0] if n else "?"
            off["holdsByLabel"][lab] += 1; off["holdFramesByLabel"][lab] += d
            rest = [[c[0], c[1], c[2], cx[0][3]] if i == 0 else c for i, c in enumerate(rest)]
        if rest != cx:
            off["commandMismatch"] += 1
            if len(off["mismatchExamples"]) < 5:
                off["mismatchExamples"].append({"seed": x["seed"], "move": x["move"], "base": cx, "patched": cy})
        if ins:
            off["inserted"] += len(ins); off["insertedFrames"] += sum(c[2] for c in ins)
            after = [r for r in y["follow"] if r[0] > att[0] and r[1] not in ("set-battler-pp-data", "play-se")]
            nk = after[0][2] if after and after[0][1] == "animation" else (after[0][1] if after else "?")
            off["insertedByN"][nk] += 1; off["insertedFramesByN"][nk] += sum(c[2] for c in ins)
            off["insertedByMove"][x["move"]] += 1
        elif att is not None and not y["hit"] and att[2] == "SCENE_OFF_ATTACK_PAUSE":
            after = [r for r in y["follow"] if r[0] > att[0] and r[1] not in ("set-battler-pp-data", "play-se")]
            off["noHitWithoutPause"][(after[0][2] or after[0][1]) if after else "(none)"] += 1
for k in ("insertedByN", "insertedFramesByN", "holdsByLabel", "holdFramesByLabel", "noHitWithoutPause"):
    off[k] = dict(off[k].most_common())
off["insertedByMove"] = dict(off["insertedByMove"].most_common(25))
res["sceneOff"] = off
json.dump(res, open(out_path, "w"), indent=1)
print(json.dumps({"on": {k: v for k, v in on.items() if k != "shards"},
                  "off": {k: off[k] for k in ("uses", "useKeyMismatch", "commandMismatch", "inserted", "insertedFrames", "holds", "holdFrames")}}))
