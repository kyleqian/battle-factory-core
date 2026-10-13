#!/usr/bin/env python3
"""sa125: census delta of the Scene ON status-animation command + the SA3 status rule (sa125LiveShareCensus.ts seeds 0..999, ten
--index-from shards per tree; modelled on sc106CensusDelta.py).

usage: sa125CensusDelta.py <base-shard-dir> <final-shard-dir> <sta123-exposure.json> <out.json>
Each dir holds r<k>.json (report), r<k>.jsonl (move / substitute-fade command records) and s<k>.jsonl (per kernel status-animation /
set-battler-status-data event, per segment and per battle rows) for k = 0..9. Checks:
- move / substitute-fade commands: KEY sequence, status, frames and liveFrames identical (the status-animation command is counted
  on its own line below, never as move coverage); the live-share numerators;
- every shard's battleDigestExcludingFrames and every battle's (seed, streak, end, turns) identical;
- per segment: the command type / frames sequence without status-animation commands (status frames excluded) identical, and the
  base has no status-animation command;
- inserted status-animation commands per animation == sta123 exposure.json byAnimation; each presented command's rows ==
  minimumFrames == the table; added frames;
- the status command frames per class (next print, status animation after it) base -> final (the SA3 table);
- per battle: frames(final) - frames(base) == presented status-animation rows + status command deltas;
- gate flags (SA2): inflicted-path receipts after a damaging hit since "X used Y!" (count; frames not modelled).
"""
import collections, json, sys

ROWS = {"PSN": 71, "CONFUSION": 100, "BRN": 39, "INFATUATION": 97, "SLP": 97, "PRZ": 39, "FRZ": 117, "CURSED": 75, "NIGHTMARE": 75}
bdir, fdir, exposure, out = sys.argv[1:5]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
lines = lambda path: [json.loads(l) for l in open(path) if l.strip()]
res = {"shards": {}, "truncatedBattles": [], "truncatedPrefixOk": 0, "moveCommands": 0, "keyMismatches": 0, "statusChanges": 0,
       "frameChanges": 0, "liveFrameChanges": 0, "digestMismatches": 0, "battleMismatches": 0, "battleFrameDeltaMismatches": 0,
       "rowMismatches": 0, "tableMismatches": 0, "segmentKeyMismatches": 0, "baseStatusAnimationCommands": 0, "samples": []}
live = {"base": [0, 0, 0, 0], "final": [0, 0, 0, 0]}
anim = collections.Counter(); anim_frames = collections.Counter(); anim_unpresented = collections.Counter()
by_path = collections.Counter(); by_side = collections.Counter(); flagged = collections.Counter()
status_cls = collections.defaultdict(collections.Counter)
status_delta_total = 0
base_all = collections.Counter(); base_unstalled = collections.Counter(); final_stalled = collections.Counter()
for k in range(10):
    B, F = lines(f"{bdir}/r{k}.jsonl"), lines(f"{fdir}/r{k}.jsonl")
    rb, rf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    sb, sf = lines(f"{bdir}/s{k}.jsonl"), lines(f"{fdir}/s{k}.jsonl")
    sh = {"commands": [len(B), len(F)], "digestSame": rb["battleDigestExcludingFrames"] == rf["battleDigestExcludingFrames"]}
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
            res["truncatedBattles"].append({"battle": b, "baseCommands": len(cb), "finalCommands": len(cf),
                                            "ends": [bat_b[b]["end"], bat_f.get(b, {}).get("end")], "turns": [bat_b[b]["turns"], bat_f.get(b, {}).get("turns")]})
            ok = [key(c) for c in cf[:n]] == [key(c) for c in cb[:n]] and all(
                (x["status"], x["frames"], x["liveFrames"]) == (y["status"], y["frames"], y["liveFrames"]) for x, y in zip(cb[:n - 1], cf[:n - 1]))
            res["truncatedPrefixOk"] += ok
            continue
        if [key(c) for c in cb] != [key(c) for c in cf]:
            res["keyMismatches"] += 1
            res["samples"].append({"battle": b, "keyDiff": True})
        for a, c2 in zip(cb, cf):
            res["moveCommands"] += 1
            res["statusChanges"] += a["status"] != c2["status"]
            res["frameChanges"] += a["frames"] != c2["frames"]
            res["liveFrameChanges"] += a["liveFrames"] != c2["liveFrames"]
    for t, cs in (("base", B), ("final", F)):
        for c in cs:
            if c["kind"] == "move":
                live[t][0] += c["status"] == "live"; live[t][1] += 1; live[t][2] += c["liveFrames"]; live[t][3] += c["frames"]
    # Segments: identical non-status-animation command sequences; the base has none.
    seg_b = {(r["battle"], r["seg"]): r for r in sb if r["kind"] == "segment"}
    seg_f = {(r["battle"], r["seg"]): r for r in sf if r["kind"] == "segment"}
    for s, r in seg_b.items():
        res["baseStatusAnimationCommands"] += len([x for x in r["anims"].split(",") if x])
        if s[0] in stalled:
            continue
        if s not in seg_f or seg_f[s]["keys"] != r["keys"]:
            res["segmentKeyMismatches"] += 1
            if len(res["samples"]) < 20:
                res["samples"].append({"segment": list(s), "segmentKeys": True})
    # Status-animation receipts (final tree) and status commands (base vs final, matched by battle / segment / sequence).
    for r in sb:
        if r["kind"] == "anim":
            base_all[str(r["anim"])] += 1
            if r["battle"] not in stalled:
                base_unstalled[str(r["anim"])] += 1
    for r in sf:
        if r["kind"] == "anim" and r["battle"] in stalled:
            final_stalled[str(r["anim"])] += 1
    rows_by_battle = collections.Counter()
    for r in sf:
        if r["kind"] != "anim" or r["battle"] in stalled:
            continue
        a = r["anim"]
        if not r["presented"]:
            anim_unpresented[str(a)] += 1
            continue
        anim[a] += 1; anim_frames[a] += r["rows"]
        by_side[f"{a}|{'player' if r['battler'] == 0 else 'opponent'}"] += 1
        by_path[f"{a}|{'inflicted' if r['inflicted'] else r['prevMessage']}"] += 1
        rows_by_battle[r["battle"]] += r["rows"]
        res["rowMismatches"] += r["rows"] != r["minimumFrames"]
        res["tableMismatches"] += r["minimumFrames"] != ROWS[a]
        if r["gateFlag"]:
            flagged[a] += 1
    st_b = {(r["battle"], r["seg"], r["sequence"]): r for r in sb if r["kind"] == "status"}
    st_f = {(r["battle"], r["seg"], r["sequence"]): r for r in sf if r["kind"] == "status"}
    for s, r in st_f.items():
        if s[0] in stalled:
            continue
        b = st_b.get(s)
        if b is None:
            res["samples"].append({"statusMissingInBase": list(s)})
            continue
        status_cls[f"{r['nextMessage']}|anim={r['animAfter']}"][f"{b['frames']}->{r['frames']}"] += 1
        rows_by_battle[s[0]] += r["frames"] - b["frames"]
        status_delta_total += r["frames"] - b["frames"]
    for b, rb_ in bat_b.items():
        if b in stalled:
            continue
        rf_ = bat_f.get(b)
        if rf_ is None or any(rb_[x] != rf_[x] for x in ("seed", "streak", "end", "turns")):
            res["battleMismatches"] += 1
            continue
        if rf_["frames"] - rb_["frames"] != rows_by_battle[b]:
            res["battleFrameDeltaMismatches"] += 1
            if len(res["samples"]) < 20:
                res["samples"].append({"battle": b, "delta": rf_["frames"] - rb_["frames"], "expected": rows_by_battle[b]})
    sh["truncated"] = sorted(stalled)
    if not sh["digestSame"] and not stalled:
        res["digestMismatches"] += 1
    res["shards"][k] = sh
expo = json.load(open(exposure))
pct = lambda a, b: round(100 * a / b, 2) if b else 0
res["liveShare"] = {t: {"liveCommands": v[0], "commands": v[1], "liveFrames": v[2], "frames": v[3],
                        "byCount": pct(v[0], v[1]), "byFrames": pct(v[2], v[3])} for t, v in live.items()}
res["statusAnimation"] = {"inserted": sum(anim.values()), "byAnimation": dict(sorted(anim.items())), "framesByAnimation": dict(sorted(anim_frames.items())),
                          "framesAdded": sum(anim_frames.values()), "notPresented": dict(anim_unpresented), "bySide": dict(sorted(by_side.items())),
                          "byPath": dict(sorted(by_path.items())), "gateFlagged": dict(sorted(flagged.items())), "gateFlaggedTotal": sum(flagged.values())}
res["statusCommandClasses"] = {k2: dict(v) for k2, v in sorted(status_cls.items())}
res["statusFramesDelta"] = status_delta_total
res["sta123"] = {"total": expo["total"], "byAnimation": expo["byAnimation"]}
res["kernelReceipts"] = {"baseAll": dict(sorted(base_all.items())), "baseAllTotal": sum(base_all.values()),
                         "baseUntruncated": dict(sorted(base_unstalled.items())), "finalTruncatedBattles": dict(sorted(final_stalled.items()))}
res["verdict"] = {
    "moveKeysIdentical": res["keyMismatches"] == 0, "zeroStatusChanges": res["statusChanges"] == 0,
    "moveFramesIdentical": res["frameChanges"] == 0 and res["liveFrameChanges"] == 0,
    "liveNumeratorsUnchanged": live["base"][0] == live["final"][0] and live["base"][2] == live["final"][2],
    "digestsIdentical": res["digestMismatches"] == 0 and res["battleMismatches"] == 0,
    "segmentKeysIdenticalWithoutStatusAnimation": res["segmentKeyMismatches"] == 0 and res["baseStatusAnimationCommands"] == 0,
    "rowsEqualTable": res["rowMismatches"] == 0 and res["tableMismatches"] == 0,
    "battleFrameDeltaIsAnimationRowsPlusStatusDelta": res["battleFrameDeltaMismatches"] == 0,
    "truncatedBattlesArePrefixes": res["truncatedPrefixOk"] == len(res["truncatedBattles"]),
    # The base tree's kernel receipts (every battle, truncated prefixes included) are sta123's exposure; the final tree presents one
    # command per receipt on every untruncated battle (a truncated battle's final prefix is shorter: the added rows).
    "baseReceiptsEqualSta123PerAnimation": {a: base_all[a] for a in ROWS} == {a: expo["byAnimation"].get(a, 0) for a in ROWS},
    "insertedEqualsReceiptsPerAnimation": {a: anim[a] for a in ROWS} == {a: base_unstalled[a] for a in ROWS},
}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k2: res[k2] for k2 in ("verdict", "statusAnimation", "kernelReceipts", "statusCommandClasses", "statusFramesDelta", "liveShare",
                                          "truncatedBattles")}, indent=1))
