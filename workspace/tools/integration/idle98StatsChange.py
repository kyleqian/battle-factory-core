#!/usr/bin/env python3
"""idle98: the ROM's General_StatsChange (B_ANIM_STATS_CHANGE) windows, Scene ON and OFF, from idle94Probe.py outputs.

usage: idle98StatsChange.py <probe-dir-r1> <probe-dir-r2> <compare-r1.json> <out.json>
Every gAnimScriptActive rise that is NOT a move body (its pointer minus 1 was never the script pointer before: a playanimation
general animation) with its active length and screen-change count, per probe, plus r1 == r2 (byte) per probe. Sources: the idle94
Swords Dance (+2 ATK, sharply) / Scary Face (-2 SPEED, sharply) scenarios and the idle98 Bulk Up control (STAT_ANIM_MULTIPLE_PLUS1:
ATK + DEF, one animation) from compare-r1.json.
"""
import glob, hashlib, json, os, sys

d1, d2, cmp_path, out = sys.argv[1:5]
res = {"probes": {}}
for f in sorted(glob.glob(os.path.join(d1, "*.json"))):
    name = os.path.basename(f)
    rows = json.load(open(f))["rows"]
    raw1, raw2 = open(f, "rb").read(), open(os.path.join(d2, name), "rb").read()
    general = []
    for A in [i for i, r in enumerate(rows) if i and r["act"] and not rows[i - 1]["act"]]:
        X = rows[A]["ptr"] - 1
        if any(rows[g]["ptr"] == X for g in range(A)):
            continue
        E = next((r["f"] for r in rows[A:] if not r["act"]), None)
        general.append({"A": A, "activeFrames": None if E is None else E - A, "mv": rows[A]["mv"], "atk": rows[A]["atk"],
                        "screenChanges": sum(rows[g]["scr"] != rows[g - 1]["scr"] for g in range(A + 1, (E or len(rows) - 1) + 1))})
    res["probes"][name] = {"sha256": hashlib.sha256(raw1).hexdigest(), "r1EqualsR2": raw1 == raw2, "generalAnimations": general}
C = json.load(open(cmp_path))["scenarios"]
res["bulkUpControl"] = {k: {"on": v["otherRisesOn"], "off": v["risesOff"]} for k, v in C.items() if "bulk-up" in k}
json.dump(res, open(out, "w"), indent=1)
for k, v in res["probes"].items():
    print(k, v["r1EqualsR2"], [(g["A"], g["activeFrames"], g["screenChanges"]) for g in v["generalAnimations"]])
