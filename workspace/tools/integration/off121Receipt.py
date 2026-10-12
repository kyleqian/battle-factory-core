#!/usr/bin/env python3
"""off121: the live receipt (docs/off121-status-command.md) from a census run directory.

usage: off121Receipt.py <out-dir> <final-src-tree-sha> <out.json>
Reads <out-dir>/census-delta.json (off121CensusDelta.py: ON byte identity, OFF off108Route windows) and the per-status-command census
<out-dir>/status-{base,final}/off-<k>.jsonl (off121StatusCensus.ts, OFF seeds 0..999), and writes the per-class OFF frame change
(base -> final frames, delta(print) - delta(status), count), the mismatch count and the budget-stalled seeds.
"""
import collections, json, os, sys

out_dir, src, out_path = sys.argv[1:4]
delta = json.load(open(os.path.join(out_dir, "census-delta.json")))


def load(t):
    by = collections.defaultdict(list)
    for k in range(10):
        for line in open(os.path.join(out_dir, f"status-{t}", f"off-{k}.jsonl")):
            if line.strip():
                r = json.loads(line)
                by[r["seed"]].append(r)
    return by


def cls(r):
    lab, msg = r["label"].split(":")[0], (r["follow"][-1][1] if r["follow"] else None)
    if lab.startswith("BattleScript_Faint"):
        return "faint (cleareffectsonfaint)"
    if lab == "BattleScript_MoveEnd":
        return "item cure (moveend)"
    if msg == "STRINGID_PKMNFASTASLEEP":
        return "sleep turn (attackcanceler)"
    if msg == "STRINGID_PKMNWOKEUP":
        return "wake up (attackcanceler)"
    if msg in ("STRINGID_PKMNWASDEFROSTED", "STRINGID_PKMNWASDEFROSTED2"):
        return "thaw (attackcanceler)"
    if msg == "STRINGID_PKMNISFROZEN":
        return "frozen turn (attackcanceler)"
    if lab == "BattleScript_EffectRest":
        return "rest (trysetrest)"
    return "move-inflicted (SetMoveEffect)"


b, f = load("base"), load("final")
classes = collections.defaultdict(collections.Counter)
mismatch, stalled, total, frames = 0, {}, 0, 0
for seed in sorted(set(b) | set(f)):
    if len(b[seed]) != len(f[seed]):
        stalled[seed] = [len(b[seed]), len(f[seed])]
    for x, y in zip(b[seed], f[seed]):
        total += 1
        if x["label"] != y["label"] or x["follow"] != y["follow"] or (x["next"] or [None])[0] != (y["next"] or [None])[0]:
            mismatch += 1
            continue
        classes[cls(x)][f"{x['command'][0]}->{y['command'][0]} (delta {x['follow'][-1][3]})"] += 1
        frames += y["command"][0] - x["command"][0]
receipt = {
    "schema": "off121-live-receipt/v1", "finalSrcTree": src,
    "on": delta["on"],
    "offRouteWindows": {k: delta["off"][k] for k in ("usesCompared", "commandMismatches", "usesWithChangedStatus", "stalledSeeds",
                                                      "statusChangedByFrames", "statusChangedFramesTotal")},
    "offStatusCommands": {"compared": total, "mismatches": mismatch, "stalledSeeds": stalled, "framesDelta": frames,
                          "byClass": {k: dict(sorted(v.items())) for k, v in sorted(classes.items(), key=lambda kv: -sum(kv[1].values()))}},
}
json.dump(receipt, open(out_path, "w"), indent=1)
print(json.dumps({"on": receipt["on"]["identical"], "offMismatch": [delta["off"]["commandMismatches"], mismatch], "statusCommands": total, "framesDelta": frames}))
