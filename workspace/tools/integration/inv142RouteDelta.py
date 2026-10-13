#!/usr/bin/env python3
"""inv142 (docs/inv142-status-animation-invisible-battler.md): sar131RouteRender.ts outputs of the same Scene ON routes in the base tree
and the inv142-patched copy. Per route: identical frame count and per-frame (command key, type, age); every frame whose sha256 differs
must lie inside a status-animation command; per such command: its battler / animation / species and the differing ages. Exit 1 on any
timeline change or a differing frame outside a status-animation command.
usage: inv142RouteDelta.py <out.json> <base1.json> <patched1.json> [<base2.json> <patched2.json> ...]
"""
import json, sys

out_path, pairs = sys.argv[1], sys.argv[2:]
result, bad = {}, 0
for i in range(0, len(pairs), 2):
    base, fin = (json.load(open(p)) for p in pairs[i:i + 2])
    for rb, rf in zip(base["routes"] if "routes" in base else base, fin["routes"] if "routes" in fin else fin):
        fb, ff = rb["frames"], rf["frames"]
        same_timeline = len(fb) == len(ff) and all(a[:4] == b[:4] for a, b in zip(fb, ff))
        diff = [b for a, b in zip(fb, ff) if a[4] != b[4]]
        anims = {s["key"].rsplit(":", 1)[0]: s for s in rf["statusAnimations"]}
        per, outside = {}, 0
        for f in diff:
            k = f[1].rsplit(":", 1)[0]
            if f[2] != "status-animation" or k not in anims:
                outside += 1
                continue
            per.setdefault(k, []).append(f[3])
        name = f"{rb['seed']}:{rb['slot']}:{rb['scene']}"
        ok = same_timeline and outside == 0
        bad += not ok
        result[name] = {"frames": len(ff), "sameTimeline": same_timeline, "differingFrames": len(diff), "outsideStatusAnimation": outside,
                        "statusAnimationCommands": len(anims),
                        "changedCommands": {k: {"battler": anims[k]["battler"], "animation": anims[k]["animation"], "species": anims[k]["species"],
                                                "previousMessage": anims[k]["previousMessage"], "differingAges": [min(v), max(v)], "count": len(v)}
                                            for k, v in sorted(per.items())},
                        "verdict": "OK" if ok else "DIFF"}
        print(name, result[name]["verdict"], len(diff), "differing frames;", {k: (v["animation"], v["species"], v["count"]) for k, v in result[name]["changedCommands"].items()})
json.dump(result, open(out_path, "w"), indent=1)
open(out_path, "a").write("\n")
sys.exit(1 if bad else 0)
