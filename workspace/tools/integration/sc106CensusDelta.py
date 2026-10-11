#!/usr/bin/env python3
"""sc106: census delta of the stats-change command (sc106LiveShareCensus.ts seeds 0..999, ten --index-from shards per tree).

usage: sc106CensusDelta.py <base-shard-dir> <final-shard-dir> <stat101-exposure.json> <out.json>
Each dir holds r<k>.json (report), r<k>.jsonl (move / substitute-fade command records) and s<k>.jsonl (per kernel STATS_CHANGE event
rows + per-battle rows) for k = 0..9. Checks:
- move / substitute-fade commands: the KEY sequence (battle, kind, moveId, side, attacker, target), status, frames and liveFrames are
  identical (the census does not record stats-change commands as move coverage: they are counted separately below);
- every shard's battleDigestExcludingFrames and every battle's (seed, streak, end, turns) are identical;
- per battle: frames(final) - frames(base) == the presented stats-change rows of that battle, and every presented command's rows ==
  its minimumFrames (76 non-sharp / 90 sharply);
- inserted stats-change commands vs stat101's exposure (played = not behind a Substitute by stat101's definition), minus the
  live Double Team exemptions; any event where the doll rule and stat101's definition disagree is listed.
"""
import collections, json, sys

bdir, fdir, exposure, out = sys.argv[1:5]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
lines = lambda path: [json.loads(l) for l in open(path) if l.strip()]
res = {"shards": {}, "truncatedBattles": [], "truncatedPrefixOk": 0, "moveCommands": 0, "keyMismatches": 0, "statusChanges": 0, "frameChanges": 0, "liveFrameChanges": 0,
       "digestMismatches": 0, "battleMismatches": 0, "battleFrameDeltaMismatches": 0, "rowMismatches": 0, "samples": []}
live = {"base": [0, 0, 0, 0], "final": [0, 0, 0, 0]}  # live commands, commands, live frames, frames (move kind)
ev = collections.Counter()
frames_added = 0
dt_status = collections.Counter()
doll_vs_stat101 = []
for k in range(10):
    B, F = lines(f"{bdir}/r{k}.jsonl"), lines(f"{fdir}/r{k}.jsonl")
    rb, rf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    sb, sf = lines(f"{bdir}/s{k}.jsonl"), lines(f"{fdir}/s{k}.jsonl")
    sh = {"commands": [len(B), len(F)], "digestSame": rb["battleDigestExcludingFrames"] == rf["battleDigestExcludingFrames"]}
    bat_b = {r["battle"]: r for r in sb if r["kind"] == "battle"}
    bat_f = {r["battle"]: r for r in sf if r["kind"] == "battle"}
    # A battle that hits the census's 200,000-frame budget in both trees is truncated earlier in the final tree (its added rows):
    # its final commands must be a prefix of the base ones (the last, cut-off command may differ in frames / status only).
    stalled = {b for b in bat_b if bat_b[b]["end"] == "stalled" and bat_f.get(b, {}).get("end") == "stalled"}
    by_b, by_f = collections.defaultdict(list), collections.defaultdict(list)
    for c in B: by_b[c["battle"]].append(c)
    for c in F: by_f[c["battle"]].append(c)
    for b in sorted(set(by_b) | set(by_f)):
        cb, cf = by_b[b], by_f[b]
        if b in stalled:
            res["truncatedBattles"].append({"battle": b, "baseCommands": len(cb), "finalCommands": len(cf),
                                            "turns": [bat_b[b]["turns"], bat_f[b]["turns"]]})
            ok = [key(c) for c in cf] == [key(c) for c in cb[:len(cf)]] and all(
                (x["status"], x["frames"], x["liveFrames"]) == (y["status"], y["frames"], y["liveFrames"]) for x, y in zip(cb[:len(cf) - 1], cf[:-1]))
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
    rows_by_battle = collections.Counter()
    for r in sf:
        if r["kind"] != "stats":
            continue
        ev["events"] += 1
        if r["presented"]:
            ev["presented"] += 1
            ev["presentedSharply" if r["sharply"] else "presentedNonSharp"] += 1
            rows_by_battle[r["battle"]] += r["rows"]
            frames_added += r["rows"]
            if r["rows"] != r["minimumFrames"]:
                res["rowMismatches"] += 1
        else:
            # Production checks the doll first: a Double Team user shown as the doll is a Substitute exemption.
            reason = "substitute-doll" if r["reason"] == "double-team-live" and r["segmentDoll"] else r["reason"]
            ev[f"exempt:{reason}"] += 1
            if reason == "double-team-live":
                dt_status[r.get("dtStatus")] += 1
            r = {**r, "reason": reason}
        if not r["stat101Behind"]:
            ev["stat101Played"] += 1
            ev["stat101PlayedSharply" if r["sharply"] else "stat101PlayedNonSharp"] += 1
        if (r["reason"] == "substitute-doll") != r["stat101Behind"]:
            doll_vs_stat101.append({k2: r[k2] for k2 in ("battle", "seg", "sequence", "battler", "argument", "presented", "reason",
                                                          "stat101Behind", "status2Sub", "segmentDoll")})
    for b, rb_ in bat_b.items():
        if b in stalled:
            continue
        rf_ = bat_f.get(b)
        if rf_ is None or any(rb_[x] != rf_[x] for x in ("seed", "streak", "end", "turns")):
            res["battleMismatches"] += 1
            continue
        if rf_["frames"] - rb_["frames"] != rows_by_battle[b]:
            res["battleFrameDeltaMismatches"] += 1
            if len(res["samples"]) < 10:
                res["samples"].append({"battle": b, "delta": rf_["frames"] - rb_["frames"], "statsRows": rows_by_battle[b]})
    sh["truncated"] = sorted(stalled)
    if not sh["digestSame"] and not stalled:
        res["digestMismatches"] += 1
    res["shards"][k] = sh
expo = json.load(open(exposure))
pct = lambda a, b: round(100 * a / b, 2) if b else 0
res["liveShare"] = {t: {"liveCommands": v[0], "commands": v[1], "liveFrames": v[2], "frames": v[3],
                        "byCount": pct(v[0], v[1]), "byFrames": pct(v[2], v[3])} for t, v in live.items()}
res["statsChange"] = dict(ev)
res["statsChange"]["framesAdded"] = frames_added
res["statsChange"]["doubleTeamExemptByDtStatus"] = dict(dt_status)
res["stat101"] = {"statsChangeEvents": expo["statsChangeEvents"], "played": expo["played"], "substitute": expo["substitute"],
                  "addedFramesPlayed": expo["addedFramesPlayed"]}
dte = ev["exempt:double-team-live"]
res["expectedInserted"] = ev["stat101Played"] - dte
res["insertedMinusExpected"] = ev["presented"] - res["expectedInserted"]
res["dollRuleVsStat101Definition"] = doll_vs_stat101
res["verdict"] = {
    "moveKeysIdentical": res["keyMismatches"] == 0, "zeroStatusChanges": res["statusChanges"] == 0, "truncatedBattlesArePrefixes": res["truncatedPrefixOk"] == len(res["truncatedBattles"]),
    "moveFramesIdentical": res["frameChanges"] == 0 and res["liveFrameChanges"] == 0,
    "digestsIdentical": res["digestMismatches"] == 0 and res["battleMismatches"] == 0,
    "battleFrameDeltaIsStatsChangeRows": res["battleFrameDeltaMismatches"] == 0 and res["rowMismatches"] == 0,
    "eventsEqualStat101": ev["events"] == expo["statsChangeEvents"], "insertedEqualsExpected": ev["presented"] == ev["stat101Played"] - dte,
}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k2: res[k2] for k2 in ("verdict", "statsChange", "expectedInserted", "insertedMinusExpected", "liveShare")}, indent=1))
print("doll vs stat101 definition:", len(doll_vs_stat101))
