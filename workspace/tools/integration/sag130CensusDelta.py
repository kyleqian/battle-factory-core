#!/usr/bin/env python3
"""sag130: census delta of wiring seg127's IsBattleSEPlaying gate into the Scene ON status-animation command (sag130LiveShareCensus.ts
seeds 0..999, ten --index-from shards per tree; modelled on sa125CensusDelta.py).

usage: sag130CensusDelta.py <base-shard-dir> <final-shard-dir> <seg127-exposure.json> <out.json>
Each dir holds r<k>.json, r<k>.jsonl and s<k>.jsonl for k = 0..9 (sa125LiveShareCensus.ts records + seGate / sePath / seNull). Checks:
- move / substitute-fade commands: KEY sequence, status, frames and liveFrames identical; the live-share numerators;
- every shard's battleDigestExcludingFrames and every battle's (seed, streak, end, turns) identical;
- per segment: the command type / frames sequence without status-animation commands identical, and the status-animation commands'
  animation sequence identical (only their frames may move);
- per status-animation receipt (battle / segment / sequence): presented in both or neither; base minimumFrames == the sa125 table;
  final - base == the receipt's seg127 gate (seGate, from the segment's events) == seg127's census projection (exposure.json
  openReceipts, matched by battle and receipt ordinal); final presented rows == final minimumFrames; null-rule flags (seNull) counted;
- per battle: frames(final) - frames(base) == the added gate frames (within the census driver's dismissal parity).
Budget-truncated battles (the 200,000-frame census budget) are compared on their common prefix only.
"""
import collections, json, sys

ROWS = {"PSN": 71, "CONFUSION": 100, "BRN": 39, "INFATUATION": 97, "SLP": 97, "PRZ": 39, "FRZ": 117, "CURSED": 75, "NIGHTMARE": 75}
bdir, fdir, exposure, out = sys.argv[1:5]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
lines = lambda path: [json.loads(l) for l in open(path) if l.strip()]
expo = json.load(open(exposure))
projected = {(o["seed"], o["k"]): o for o in expo["openReceipts"]}
res = {"truncatedBattles": [], "moveCommands": 0, "keyMismatches": 0, "statusChanges": 0, "frameChanges": 0, "liveFrameChanges": 0,
       "digestMismatches": 0, "battleMismatches": 0, "segmentKeyMismatches": 0, "segmentAnimationMismatches": 0,
       "receipts": 0, "presentedMismatches": 0, "baseTableMismatches": 0, "gateMismatches": 0, "projectionMismatches": 0,
       "rowMismatches": 0, "seNull": 0, "changedCommands": 0, "changedFrames": 0, "battleFrameDeltaMismatches": 0, "samples": []}
by_cls = collections.defaultdict(lambda: [0, 0]); by_anim_side = collections.defaultdict(lambda: [0, 0])
proj_seen = 0; parity = collections.Counter(); live = {"base": [0, 0, 0, 0], "final": [0, 0, 0, 0]}
for k in range(10):
    B, F = lines(f"{bdir}/r{k}.jsonl"), lines(f"{fdir}/r{k}.jsonl")
    rb, rf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    sb, sf = lines(f"{bdir}/s{k}.jsonl"), lines(f"{fdir}/s{k}.jsonl")
    bat_b = {r["battle"]: r for r in sb if r["kind"] == "battle"}
    bat_f = {r["battle"]: r for r in sf if r["kind"] == "battle"}
    stalled = {b for b in bat_b if bat_b[b]["end"] == "stalled" or bat_f.get(b, {}).get("end") == "stalled"}
    by_b, by_f = collections.defaultdict(list), collections.defaultdict(list)
    for c in B: by_b[c["battle"]].append(c)
    for c in F: by_f[c["battle"]].append(c)
    for b in sorted(set(by_b) | set(by_f)):
        cb, cf = by_b[b], by_f[b]
        if b in stalled:
            n = min(len(cb), len(cf))
            ok = [key(c) for c in cf[:n]] == [key(c) for c in cb[:n]] and all(
                (x["status"], x["frames"], x["liveFrames"]) == (y["status"], y["frames"], y["liveFrames"]) for x, y in zip(cb[:n - 1], cf[:n - 1]))
            res["truncatedBattles"].append({"battle": b, "baseCommands": len(cb), "finalCommands": len(cf), "prefixOk": ok})
            continue
        if [key(c) for c in cb] != [key(c) for c in cf]:
            res["keyMismatches"] += 1
        for a, c2 in zip(cb, cf):
            res["moveCommands"] += 1
            res["statusChanges"] += a["status"] != c2["status"]
            res["frameChanges"] += a["frames"] != c2["frames"]
            res["liveFrameChanges"] += a["liveFrames"] != c2["liveFrames"]
    for t, cs in (("base", B), ("final", F)):
        for c in cs:
            if c["kind"] == "move" and c["battle"] not in stalled:
                live[t][0] += c["status"] == "live"; live[t][1] += 1; live[t][2] += c["liveFrames"]; live[t][3] += c["frames"]
    if rb["battleDigestExcludingFrames"] != rf["battleDigestExcludingFrames"] and not stalled:
        res["digestMismatches"] += 1
    seg_b = {(r["battle"], r["seg"]): r for r in sb if r["kind"] == "segment"}
    seg_f = {(r["battle"], r["seg"]): r for r in sf if r["kind"] == "segment"}
    names = lambda r: [x.split(":")[0] for x in r["anims"].split(",") if x]
    for s, r in seg_b.items():
        if s[0] in stalled and s not in seg_f:
            continue
        if s not in seg_f or seg_f[s]["keys"] != r["keys"]:
            res["segmentKeyMismatches"] += 1
        elif names(seg_f[s]) != names(r):
            res["segmentAnimationMismatches"] += 1
    an_b = {(r["battle"], r["seg"], r["sequence"]): r for r in sb if r["kind"] == "anim"}
    ordinal = collections.Counter(); added = collections.Counter()
    for r in sf:
        if r["kind"] != "anim":
            continue
        kth = ordinal[r["battle"]]; ordinal[r["battle"]] += 1
        s = (r["battle"], r["seg"], r["sequence"])
        b = an_b.get(s)
        if b is None:
            if r["battle"] not in stalled:
                res["presentedMismatches"] += 1
            continue
        res["receipts"] += 1
        res["seNull"] += bool(r["seNull"])
        if b["presented"] != r["presented"] or b["anim"] != r["anim"]:
            res["presentedMismatches"] += 1
            continue
        if not r["presented"]:
            continue
        res["baseTableMismatches"] += b["minimumFrames"] != ROWS[b["anim"]]
        d = r["minimumFrames"] - b["minimumFrames"]
        res["gateMismatches"] += d != r["seGate"]
        if r["battle"] not in stalled or r["rows"] > 0:
            res["rowMismatches"] += r["rows"] != r["minimumFrames"] and r["battle"] not in stalled
        p = projected.get((r["battle"], kth))
        if p is not None:
            proj_seen += 1
            if p["gate"] != d or p["anim"] != r["anim"]:
                res["projectionMismatches"] += 1
                if len(res["samples"]) < 20:
                    res["samples"].append({"battle": r["battle"], "k": kth, "projected": p["gate"], "delta": d, "anim": r["anim"]})
        elif d != 0:
            res["projectionMismatches"] += 1
            if len(res["samples"]) < 20:
                res["samples"].append({"battle": r["battle"], "k": kth, "projected": None, "delta": d, "anim": r["anim"]})
        if d != 0:
            res["changedCommands"] += 1; res["changedFrames"] += d
            by_cls[r["sePath"]][0] += 1; by_cls[r["sePath"]][1] += d
            side = "player" if r["battler"] == 0 else "opponent"
            by_anim_side[f"{r['sePath']}|{r['anim']}|{side}"][0] += 1; by_anim_side[f"{r['sePath']}|{r['anim']}|{side}"][1] += d
            added[r["battle"]] += d
    for b, rb_ in bat_b.items():
        if b in stalled:
            continue
        rf_ = bat_f.get(b)
        if rf_ is None or any(rb_[x] != rf_[x] for x in ("seed", "streak", "end", "turns")):
            res["battleMismatches"] += 1
            continue
        r_ = rf_["frames"] - rb_["frames"] - added[b]
        parity[r_] += 1
        if abs(r_) > 3:
            res["battleFrameDeltaMismatches"] += 1
expected_open = sum(1 for o in expo["openReceipts"])
res["projectionReceiptsMatched"] = proj_seen
res["projectionTotal"] = expo["projectionTotal"]
res["byClass"] = {k2: {"commands": v[0], "frames": v[1]} for k2, v in sorted(by_cls.items(), key=lambda x: str(x[0]))}
res["byClassAnimationSide"] = {k2: {"commands": v[0], "frames": v[1]} for k2, v in sorted(by_anim_side.items())}
res["battleFrameResidualDistribution"] = {str(k2): v for k2, v in sorted(parity.items())}
res["liveShareUntruncated"] = live
res["verdict"] = {
    "moveKeysIdentical": res["keyMismatches"] == 0, "zeroStatusChanges": res["statusChanges"] == 0,
    "moveFramesIdentical": res["frameChanges"] == 0 and res["liveFrameChanges"] == 0, "liveNumeratorsUnchanged": live["base"] == live["final"],
    "digestsIdentical": res["digestMismatches"] == 0 and res["battleMismatches"] == 0,
    "segmentKeysIdenticalWithoutStatusAnimation": res["segmentKeyMismatches"] == 0 and res["segmentAnimationMismatches"] == 0,
    "receiptsPresentedIdentically": res["presentedMismatches"] == 0, "baseRowsEqualTable": res["baseTableMismatches"] == 0,
    "deltaEqualsSeg127Gate": res["gateMismatches"] == 0, "deltaEqualsSeg127Projection": res["projectionMismatches"] == 0,
    "rowsEqualMinimumFrames": res["rowMismatches"] == 0, "zeroNullRuleFlags": res["seNull"] == 0,
    "battleFrameDeltaIsGateFramesWithinDismissalParity": res["battleFrameDeltaMismatches"] == 0,
    "truncatedBattlesArePrefixes": all(t["prefixOk"] for t in res["truncatedBattles"]),
    "changed72Commands729Frames": [res["changedCommands"], res["changedFrames"]] == [72, 729],
}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k2: res[k2] for k2 in ("verdict", "changedCommands", "changedFrames", "byClass", "receipts", "seNull", "projectionReceiptsMatched",
                                          "battleFrameResidualDistribution", "truncatedBattles", "samples")}, indent=1))
sys.exit(0 if all(res["verdict"].values()) else 1)
