#!/usr/bin/env python3
"""gaf140 (docs/gaf140-status-gate-age.md; sae135RouteDelta.py's shape): base vs final production route renders (sar131RouteRender.ts
output, one file per route and tree). Per route: frame count / presented frames / per-frame (frame, command key, type, age) identical;
every frame whose render differs is classified: inside an IsBattleSEPlaying-GATED status-animation command (minimumFrames >
STATUS_ANIMATION_ADDED_ROWS[animation]; the gate = the difference); the first frame of the command right after one (an elevated
opponent's shadow hold); anything else = unexplained (must be 0). Ungated status-animation commands must not differ.
  python3 tools/integration/gaf140RouteDelta.py <out.json> <base1.json> <final1.json> [<base2.json> <final2.json> ...]
"""
import json, sys

ADD = dict(PSN=71, CONFUSION=100, BRN=39, INFATUATION=97, SLP=97, PRZ=39, FRZ=117, CURSED=75, NIGHTMARE=75)
out, files = sys.argv[1], sys.argv[2:]
report, ok = {}, True
for bp, fp in zip(files[0::2], files[1::2]):
    (b,), (f,) = json.load(open(bp)), json.load(open(fp))
    name = "%d:%d:%s" % (f["seed"], f["slot"], f["scene"])
    same_timeline = (b["lastFrame"] == f["lastFrame"] and b["presentedFrames"] == f["presentedFrames"]
                     and [x[:4] for x in b["frames"]] == [x[:4] for x in f["frames"]] and b["statusAnimations"] == f["statusAnimations"])
    sa = {s["key"]: s for s in f["statusAnimations"]}
    gated = {k: s for k, s in sa.items() if s["frames"] > ADD[s["animation"]]}
    per = {k: {"animation": s["animation"], "battler": s["battler"], "species": s["species"], "frames": s["frames"],
               "gate": s["frames"] - ADD[s["animation"]], "previousMessage": s["previousMessage"], "differingAges": []} for k, s in gated.items()}
    ungated_diff, after, unexplained = 0, 0, []
    prev_key = None
    for i, (x, y) in enumerate(zip(b["frames"], f["frames"])):
        key, typ, age = y[1], y[2], y[3]
        if x[4] != y[4]:
            if key in gated:
                per[key]["differingAges"].append(age)
            elif typ == "status-animation":
                ungated_diff += 1
            elif i > 0 and f["frames"][i - 1][1] in gated and f["frames"][i - 1][1] != key:
                after += 1
            else:
                unexplained.append(y[:4])
    for v in per.values():
        a = v["differingAges"]
        v["differingAges"] = {"count": len(a), "min": min(a) if a else None, "max": max(a) if a else None}
    route_ok = same_timeline and not unexplained and ungated_diff == 0 and all(v["differingAges"]["count"] > 0 for v in per.values()) and per
    ok = ok and bool(route_ok)
    report[name] = {"sameTimeline": same_timeline, "lastFrame": f["lastFrame"], "presentedFrames": f["presentedFrames"], "stalled": f["stalled"],
                    "statusAnimationCommands": len(sa), "gatedCommands": per, "ungatedStatusAnimationDiffering": ungated_diff,
                    "firstFrameAfterGated": after, "unexplained": len(unexplained), "unexplainedFirst": unexplained[:5],
                    "verdict": "OK" if route_ok else "FAIL"}
    print(name, report[name]["verdict"], "timeline", same_timeline, "gated", {k: (v["animation"], v["gate"], v["differingAges"]) for k, v in per.items()},
          "ungated differing", ungated_diff, "after", after, "unexplained", len(unexplained))
report["verdict"] = "OK" if ok else "FAIL"
json.dump(report, open(out, "w"), indent=1)
open(out, "a").write("\n")
sys.exit(0 if ok else 1)
