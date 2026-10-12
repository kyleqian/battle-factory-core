#!/usr/bin/env python3
"""olnd113 (ISSUES #167 land, docs/olnd113-scene-off-pauses-live.md): the off108 rule check on the LANDED production, with the decided
lead(STATS_CHANGE) = 1, plus the joint target (pause + sc106 stats-change command -> the first stat message's first glyph).

usage: olnd113Verify.py <rom-r1.json> <off108-verify-off.json> <off108-verify-on.json> <final-off-route-dir> <out.json>
1. Rule check. off108Verify.py's romAnchor encodes lead(STATS_CHANGE) = 0 (the playanimation / gAnimScriptActive rise row A). The
   landed lead is 1: sc106's stats-change command age 0 is stat101 rel 1 (stat102 frame mapping, "command age a == reducer rel a + 1"),
   so its command must start on A + 1. Adjusted anchor = romAnchor + 1 for the classes whose N is STATS_CHANGE; every other class keeps
   off108's anchor. Final residuals must be [0] on every checked class (OFF) and on every checked pause-path class (ON).
2. Joint target (Scene OFF, off108 Bulk Up / Double Team / Sand-Attack routes): from the final tree's off108Route.ts uses of moves 339 /
   104 / 28 with an attack receipt, the first message command's start after G + 1 (opener holdFrames + every command between) vs the
   ROM's first glyph of the first stat message (rom-r1: the first run with glyph changes after the 77 / 91-row stats-change run).
"""
import glob, json, os, sys

rom_path, vo_path, von_path, route_dir, out_path = sys.argv[1:6]
rom = json.load(open(rom_path))["scenarios"]
res = {"schema": "olnd113-verify/v1", "leadStatsChange": 1}


def adjust(v):
    rows = []
    for c in v["classes"]:
        if not c["checked"]:
            rows.append({"class": c["class"], "checked": False})
            continue
        sc = c["class"].startswith("stat ")
        anchor = c["romAnchor"] + (1 if sc else 0)
        rows.append({"class": c["class"], "checked": True, "off108Anchor": c["romAnchor"], "anchor": anchor, "N": "STATS_CHANGE" if sc else "other",
                     "baseResiduals": [s - c["romAnchor"] for s in c["base"]["starts"]],
                     "finalResidualsOff108Anchor": c["patched"]["residuals"],
                     "finalResiduals": [s - anchor for s in c["patched"]["starts"]]})
    ok = [r for r in rows if r["checked"] and r["finalResiduals"] == [0]]
    # ON: only the pause-path classes (miss / failed / Protect-blocked) have a production use on the OFF signature (off108 §1)
    measured = [r for r in rows if r["checked"] and r["finalResiduals"]]
    return {"classes": rows, "checked": len(measured), "finalZeroResidual": len(ok)}


res["off"] = adjust(json.load(open(vo_path)))
res["on"] = adjust(json.load(open(von_path)))

SCEN = {339: "off108-bulk-up-ply-primeape-onix", 104: "off108-double-team-ply-primeape-onix", 28: "off108-sand-attack-ply-primeape-snorlax"}


def rom_glyph(name):
    u = rom[name]["off"][0]
    runs = u["runs"]
    i = next(k for k, r in enumerate(runs) if r[2] in (77, 91))
    nxt = next(r for r in runs[i + 1:] if r[5])
    return {"G": u["G"], "statsChangeRow": runs[i][1], "glyphRow": nxt[5][0]}


uses = [json.loads(l) for f in sorted(glob.glob(os.path.join(route_dir, "off-*.jsonl"))) for l in open(f) if l.strip()]
joint = []
for move, name in SCEN.items():
    g = rom_glyph(name)
    starts = set()
    for u in uses:
        if u["move"] != move or u["attack"] is None or u["hit"]:
            continue
        c = u["commands"]
        i = next((k for k, x in enumerate(c) if k > 0 and x[1] == "message"), None)
        if i is None or not any(x[1] == "stats-change" for x in c[1:i]):
            continue
        starts.add(1 + (c[0][3] or 0) + sum((x[2] or 0) + (x[3] or 0) for x in c[1:i]))
    joint.append({"move": move, "scenario": name, "romFirstGlyph": g["glyphRow"], "romStatsChangeRow": g["statsChangeRow"],
                  "finalMessageStarts": sorted(starts), "residuals": [s - g["glyphRow"] for s in sorted(starts)]})
res["jointTarget"] = joint
json.dump(res, open(out_path, "w"), indent=1)
for side in ("off", "on"):
    for r in res[side]["classes"]:
        if r["checked"]:
            print(f"{side:3s} {r['class']:40s} anchor {r['anchor']:3d} (off108 {r['off108Anchor']:3d})  base {r['baseResiduals']}  final {r['finalResiduals']}")
for j in joint:
    print(f"joint {j['scenario']:42s} ROM glyph G+{j['romFirstGlyph']}  final G+{j['finalMessageStarts']}  residual {j['residuals']}")
print(json.dumps({"off": [res["off"]["finalZeroResidual"], res["off"]["checked"]], "on": [res["on"]["finalZeroResidual"], res["on"]["checked"]],
                  "joint": {j["move"]: j["residuals"] for j in joint}}))
