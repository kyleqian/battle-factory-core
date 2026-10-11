#!/usr/bin/env python3
"""sc106: the live receipt from a run directory (sc106Run.sh): route anchors base vs final, the census delta, the soak divergence.

usage: sc106Receipt.py <run-dir> <out.json>
<run-dir>/routes-{base,final}/*.json (sc106RouteScan.ts --route), <run-dir>/census-delta.json, <run-dir>/soak-{base,final}.json.
"""
import json, os, sys

run, out = sys.argv[1:3]
routes = []
for f in sorted(os.listdir(f"{run}/routes-final")):
    b, n = json.load(open(f"{run}/routes-base/{f}")), json.load(open(f"{run}/routes-final/{f}"))
    cum, anchors = 0, []
    for ba, na in zip(b["anchors"], n["anchors"]):
        assert (ba["seg"], ba["sequence"]) == (na["seg"], na["sequence"])
        added = na["statsChange"]["frames"] if na["statsChange"] else 0
        cum += added
        anchors.append({"path": na["path"], "argument": na["argument"], "battler": na["battler"], "prevEvent": na["prevEvent"],
                        "statsChange": na["statsChange"], "following": na["following"]["type"],
                        "baseFollowingFrame": ba["following"]["frame"], "finalFollowingFrame": na["following"]["frame"],
                        "baseGlyph": ba["following"]["glyph"], "finalGlyph": na["following"]["glyph"],
                        "delta": na["following"]["frame"] - ba["following"]["frame"], "crossedStatsChangeFrames": cum,
                        "commandStartsOnBaseFollowingFrame": na["statsChange"] is None or na["statsChange"]["frame"] - (cum - added) == ba["following"]["frame"]})
    routes.append({"route": f[:-5], "scene": n["scene"], "baseFrames": b["frames"], "finalFrames": n["frames"],
                   "allDeltasEqualCrossedFrames": all(a["delta"] == a["crossedStatsChangeFrames"] for a in anchors),
                   "anchors": anchors})
delta = json.load(open(f"{run}/census-delta.json"))
soak = {}
sb, sf = json.load(open(f"{run}/soak-base.json")), json.load(open(f"{run}/soak-final.json"))
for k in sb:
    bn, fn = sb[k]["notes"], sf[k]["notes"]
    i = next((i for i, (x, y) in enumerate(zip(bn, fn)) if x != y), None)
    keys = ("frames", "outcome", "endState", "battle", "turn")
    soak[k] = {"base": {x: sb[k]["result"].get(x) for x in keys}, "final": {x: sf[k]["result"].get(x) for x in keys},
               "notesIdenticalPrefix": i, "firstDivergence": None if i is None else {"base": bn[i], "final": fn[i]}}
receipt = {
    "schema": "sc106-live-receipt/v1",
    "rule": "stats-change command at each kernel STATS_CHANGE event; minimumFrames = statsChangeSpan(statsChangeParams(arg)).addedRows "
            "(76 / 90); none when params are null; none while the battler is shown as the Substitute doll at the command start; none "
            "right after a Double Team (104) body of the same battler with a live duration (Scene ON only: OFF has no such body)",
    "routes": routes,
    "census": {k: delta[k] for k in ("verdict", "statsChange", "expectedInserted", "insertedMinusExpected", "liveShare", "truncatedBattles",
                                      "stat101", "moveCommands")},
    "soakDivergence": soak,
}
json.dump(receipt, open(out, "w"), indent=1)
print(json.dumps({"routesOk": all(r["allDeltasEqualCrossedFrames"] for r in routes), "census": delta["verdict"]}, indent=1))
