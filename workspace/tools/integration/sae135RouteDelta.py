#!/usr/bin/env python3
"""sae135 (S10A, ISSUES #168 slice SA5; sar131RouteDelta.py with the SA5 drawn set): base vs final production route renders
(sar131RouteRender.ts output). Per route: frame count / presented frames / per-frame (frame, command key, type, age) identical; every frame whose render
differs is classified: inside a newly drawn (SLP / BRN / INFATUATION) status-animation command; the first frame of the command right after one (the
elevated opponent's shadow hold, postBodyShadowHiddenAt); inside a move-animation command whose battler x2 input differs base vs final
(none expected: sae135 changes no x2 row; must be 0 too); anything else = unexplained (must be 0). Per drawn status-animation command: frames,
differing ages.
  python3 tools/integration/sae135RouteDelta.py <base.json> <final.json> <out.json>
"""
import json, sys

base = {(r['seed'], r['slot'], r['scene']): r for r in json.load(open(sys.argv[1]))}
final = {(r['seed'], r['slot'], r['scene']): r for r in json.load(open(sys.argv[2]))}
DRAWN = {"SLP", "BRN", "INFATUATION"}
report, ok = {}, True
for key, f in final.items():
    b = base[key]
    name = '%d:%d:%s' % key
    same_timeline = (b['lastFrame'] == f['lastFrame'] and b['presentedFrames'] == f['presentedFrames']
                     and [x[:4] for x in b['frames']] == [x[:4] for x in f['frames']])
    sa_keys = {s['key']: s for s in f['statusAnimations']}
    drawn_keys = {k for k, s in sa_keys.items() if s['animation'] in DRAWN}
    bx2 = {x['key']: x['x2Input'] for x in b['bodies']}
    x2_changed = {x['key'] for x in f['bodies'] if json.dumps(x['x2Input'], sort_keys=True) != json.dumps(bx2.get(x['key']), sort_keys=True)}
    cls = {"statusAnimation": 0, "afterStatusAnimationFirstFrame": 0, "x2RowsBody": 0, "unexplained": 0}
    unexplained = []
    per_cmd = {k: {"animation": sa_keys[k]['animation'], "side": "player" if sa_keys[k]['battler'] == 0 else "opponent",
                   "species": sa_keys[k]['species'], "opponentElevated": sa_keys[k]['opponentElevated'],
                   "path": sa_keys[k]['previousMessage'], "frames": 0, "differingAges": 0} for k in sa_keys}
    prev_key = None
    for i, (x, y) in enumerate(zip(b['frames'], f['frames'])):
        k = y[1]
        if k in per_cmd:
            per_cmd[k]['frames'] += 1
        if x[4] == y[4]:
            prev_key = k if i + 1 < len(f['frames']) and f['frames'][i + 1][1] != k else prev_key
            continue
        if k in drawn_keys:
            cls["statusAnimation"] += 1
            per_cmd[k]['differingAges'] += 1
        elif y[3] == 0 and i > 0 and f['frames'][i - 1][1] in drawn_keys:
            cls["afterStatusAnimationFirstFrame"] += 1
        elif k in x2_changed:
            cls["x2RowsBody"] += 1
        else:
            cls["unexplained"] += 1
            if len(unexplained) < 10:
                unexplained.append(y[:4])
    r = {"sameTimeline": same_timeline, "frames": f['lastFrame'], "presented": f['presentedFrames'], "differing": cls,
         "unexplainedSamples": unexplained, "bodiesWithChangedX2Input": sorted(x2_changed),
         "statusAnimationCommands": list(per_cmd.values())}
    r["ok"] = same_timeline and cls["unexplained"] == 0 and cls["x2RowsBody"] == 0 and not x2_changed
    ok &= r["ok"]
    report[name] = r
    print(name, "OK" if r["ok"] else "FAIL", json.dumps(cls), "x2-changed bodies", len(x2_changed),
          [(c['animation'], c['side'], c['frames'], c['differingAges']) for c in per_cmd.values()])
report["allOk"] = ok
json.dump(report, open(sys.argv[3], "w"), indent=1)
print("routes", sum(1 for k, v in report.items() if k != "allOk" and v["ok"]), "/", len(report) - 1, "OK")
