#!/usr/bin/env python3
"""olnd113: the live receipt (tools/integration/fixtures/olnd113-live-receipt.json) from an olnd113Run.sh --census out-dir.

usage: olnd113Receipt.py <out-dir> <final-sha> <out.json>
Collects: the lead-adjusted rule check + joint target (olnd113-verify.json); the ROM receipt digests (rom-r1.json sha256, == off108's);
Scene ON census (liveShareCensus 0..999, base bce86a4b0 vs final; hist73Merge overall live share per tree; off108CensusDelta.py
sceneOn: status / frame changes, KEY mismatches, digests); Scene OFF census (off108Route 0..999: inserted pauses / holds per class)
compared with off108's banked patched-copy delta (fixtures/off108/census-delta.json, base 52c181d54 without sc106) adjusted for the
landed lead(STATS_CHANGE) = 1: + 1 frame per STATS_CHANGE-next pause, counts unchanged.
"""
import hashlib, json, os, sys

out_dir, final_sha, out_path = sys.argv[1:4]
J = lambda *p: json.load(open(os.path.join(out_dir, *p)))
v, cd = J("olnd113-verify.json"), J("census-delta.json")
off108 = json.load(open("tools/integration/fixtures/off108/census-delta.json"))
merged = {t: J(f"census-{t}", "merged.json") for t in ("base", "final")}


def share(m):
    o = m.get("overall", m)
    return {k: o[k] for k in o if k in ("live", "fallback", "commands", "frames", "liveFrames", "liveShare", "liveFrameShare")}


on, off = cd["sceneOn"], cd["sceneOff"]
o108 = off108["sceneOff"]
adjusted = dict(o108["insertedFramesByN"])
adjusted["STATS_CHANGE"] = adjusted.get("STATS_CHANGE", 0) + o108["insertedByN"].get("STATS_CHANGE", 0)
per_class = {}
for k in sorted(set(o108["insertedByN"]) | set(off["insertedByN"])):
    per_class[k] = {"off108": [o108["insertedByN"].get(k, 0), o108["insertedFramesByN"].get(k, 0)],
                    "off108AdjustedLead1": [o108["insertedByN"].get(k, 0), adjusted.get(k, 0)],
                    "final": [off["insertedByN"].get(k, 0), off["insertedFramesByN"].get(k, 0)]}
holds = {}
for k in sorted(set(o108["holdsByLabel"]) | set(off["holdsByLabel"])):
    holds[k] = {"off108": [o108["holdsByLabel"].get(k, 0), o108["holdFramesByLabel"].get(k, 0)],
                "final": [off["holdsByLabel"].get(k, 0), off["holdFramesByLabel"].get(k, 0)]}
res = {
    "schema": "olnd113-live-receipt/v1",
    "base": "bce86a4b0", "final": final_sha,
    "leadStatsChange": 1,
    "romR1Sha256": hashlib.sha256(open(os.path.join(out_dir, "rom-r1.json"), "rb").read()).hexdigest(),
    "ruleCheck": {"off": [v["off"]["finalZeroResidual"], v["off"]["checked"]], "on": [v["on"]["finalZeroResidual"], v["on"]["checked"]],
                  "classes": {s: {c["class"]: {"anchor": c["anchor"], "base": c["baseResiduals"], "final": c["finalResiduals"]}
                                  for c in v[s]["classes"] if c["checked"]} for s in ("off", "on")}},
    "jointTarget": v["jointTarget"],
    "censusOn": {"statusChanges": on["statusChanges"], "frameChanges": on["frameChanges"], "commands": on["commands"],
                 "battlesKeyMismatch": on["battlesKeyMismatch"], "battleDigestExcludingFramesSame": on["battleDigestExcludingFramesSame"],
                 "framesBase": on["framesBase"], "framesFinal": on["framesPatched"], "framesDelta": on["framesDelta"],
                 "stalls": on["stalls"], "liveShare": {t: share(m) for t, m in merged.items()}},
    "censusOff": {"uses": off["uses"], "useKeyMismatch": off["useKeyMismatch"], "seedsDiffering": off["seedsDiffering"],
                  "commandMismatch": off["commandMismatch"], "mismatchExamples": off["mismatchExamples"],
                  "inserted": [off["inserted"], off["insertedFrames"]], "holds": [off["holds"], off["holdFrames"]],
                  "off108": {"inserted": [o108["inserted"], o108["insertedFrames"]], "holds": [o108["holds"], o108["holdFrames"]]},
                  "insertedByN": per_class, "holdsByLabel": holds, "noHitWithoutPause": off["noHitWithoutPause"]},
}
json.dump(res, open(out_path, "w"), indent=1)
print(json.dumps({"ruleCheck": {k: res["ruleCheck"][k] for k in ("off", "on")}, "joint": {j["move"]: j["residuals"] for j in v["jointTarget"]},
                  "on": {k: res["censusOn"][k] for k in ("statusChanges", "frameChanges", "battleDigestExcludingFramesSame", "framesDelta")},
                  "off": {k: res["censusOff"][k] for k in ("useKeyMismatch", "commandMismatch", "inserted", "holds")}}))
