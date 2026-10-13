#!/usr/bin/env python3
"""sar131: the live receipt tools/integration/fixtures/sar131-live-receipt.json from a sar131Run.sh output dir (or the scratch dirs).
usage: sar131Receipt.py <run-dir> <out.json>
<run-dir>: probes/done (r1 == r2 line), rom-r1.json, rom-r2.json, cmp/{r1,r2,neg-*}.json, next-body.json, routes-delta.json,
[census-delta.json]. Every verdict is a boolean; the numbers are the evidence.
"""
import json, os, sys, collections

d, out = sys.argv[1:3]
J = lambda p: json.load(open(os.path.join(d, p)))
rom1, rom2 = J("rom-r1.json"), J("rom-r2.json")
cmp1, cmp2 = J("cmp/r1.json"), J("cmp/r2.json")
done = open(os.path.join(d, "probes/done")).read().strip()
wins = collections.Counter()
for stem, v in rom1.items():
    for w in v["windows"]:
        wins[f"{w['animation']}|{'player' if w['battler'] == 0 else 'opponent'}|{w['label'].split('+')[0].replace('BattleScript_', '')}"] += 1
per = {}
for k, v in cmp1.items():
    if k == "summary":
        continue
    per[k] = {"animation": v["animation"], "side": v["side"], "path": v["path"], "rows": v["rows"]["compared"], "px": v["fullScreen"]["px"],
              "nextRowsBoxPx": [r["boxPx"] for r in v["nextCommandRows"]], "x2History": v["x2History"]}
controls = {}
for n in ("age+1", "no-shake", "no-blend", "no-sparks", "wrong-side", "base-x2"):
    s = J(f"cmp/neg-{n}.json")["summary"]
    fails = sorted(k for k, v in J(f"cmp/neg-{n}.json").items() if k != "summary" and not v["zeroPx"])
    controls[n] = {"zeroPxWindows": s["zeroPxWindows"], "windows": s["windows"], "failingWindows": fails}
nb = J("next-body.json")
routes = J("routes-delta.json")
r = {
    "schema": "sar131-live-receipt/v1",
    "rom": {"probes": done, "romR1EqualsR2": rom1 == rom2, "windowsByAnimationSideAndPath": dict(sorted(wins.items())),
            "windows": sum(wins.values())},
    "productionCompare": {"summary": cmp1["summary"], "r1EqualsR2": cmp1 == cmp2, "perWindow": per,
                          "ageOffset": "command age a == ROM row X + 1 + a (X = the statusanimation instruction row; a = 0 = the first gAnimScriptActive row)"},
    "controls": controls,
    "nextBodyX2": nb["summary"],
    "routes": {k: {kk: v[kk] for kk in ("sameTimeline", "frames", "presented", "differing", "ok")} | {
        "statusAnimationCommands": [(c["animation"], c["side"], c["frames"], c["differingAges"]) for c in v["statusAnimationCommands"]]}
        for k, v in routes.items() if k != "allOk"},
}
verdicts = {
    "probesR1EqualsR2": done.endswith(f"{len(rom1)} / {len(rom1)}"),
    "romR1EqualsR2": rom1 == rom2,
    "productionZeroPxEveryWindow": cmp1["summary"]["zeroPxWindows"] == cmp1["summary"]["windows"] == r["rom"]["windows"],
    "comparatorR1EqualsR2": cmp1 == cmp2,
    "controlsFail": all(c["zeroPxWindows"] < c["windows"] for c in controls.values()),
    "nextBodyAtPredictedX2": nb["summary"]["predictedExact"] == nb["summary"]["windowsWithNextBody"] >= 4,
    "routesOk": routes["allOk"],
}
if os.path.exists(os.path.join(d, "census-delta.json")):
    c = J("census-delta.json")
    r["census"] = {k: c[k] for k in ("moveRecords", "keyMismatches", "frameChanges", "liveFrameChanges", "declineChanges", "battleMismatches",
                                     "segmentMismatches", "allShardDigestsSame", "totals")} | {"statusChanges": len(c["statusChanges"])}
    verdicts["censusZeroFrameChanges"] = c["verdict"]["zeroFrameChanges"]
r["verdicts"] = verdicts
json.dump(r, open(out, "w"), indent=1)
open(out, "a").write("\n")
print(json.dumps(verdicts))
