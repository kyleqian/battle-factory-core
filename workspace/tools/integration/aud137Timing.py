#!/usr/bin/env python3
"""aud137 (docs/aud137-live-audit-28.md §2): fold the seg127Probe.py timing probes (Scene ON, direct mGBA) of aud137's timing routes and
pixel scenarios into one receipt. Per status-animation instruction run, seg127Rom.py --one's receipt (label, X, gate = the ROM's
IsBattleSEPlaying TRUE polls, rule = clamp(L - age, 0, 29), act = gAnimScriptActive rows, ctl = controller rows, the last SE before the
poll). Checks per receipt: gate == rule (the production rule seg127StatusSeGate.ts, 0 residual); ctl == gate + act + 1; act + 1 ==
STATUS_ANIMATION_ADDED_ROWS[animation] (the production table; FRZ act 115 = seg127's FRZ 133 / 134 phase, reported); a run with no
controller emission (gate None, act 0) = no status animation (Substitute / semi-invulnerable). r1 == r2 is checked on the probe bytes.
usage: aud137Timing.py <timing-dir with r1/ r2/> <out.json>
"""
import filecmp, glob, json, os, re, subprocess, sys

d, out = sys.argv[1:3]
TABLE = {"PSN": 71, "CONFUSION": 100, "BRN": 39, "INFATUATION": 97, "SLP": 97, "PRZ": 39, "FRZ": 117, "CURSED": 75, "NIGHTMARE": 75}
HERE = os.path.dirname(os.path.abspath(__file__))
res = {"schema": "aud137-timing/v1", "routes": {}, "summary": {}}
same = n = 0
for f in sorted(glob.glob(os.path.join(d, "r1", "*-on.json"))):
    name = os.path.basename(f)[:-8]
    n += 1
    same += filecmp.cmp(f, os.path.join(d, "r2", os.path.basename(f)), shallow=False)
    txt = subprocess.run([sys.executable, os.path.join(HERE, "seg127Rom.py"), "--one", f], capture_output=True, text=True, check=True).stdout
    recs = []
    for line in txt.splitlines():
        m = re.match(r"(\S+) X (\d+) gate (\S+) rule (\d+) act (\d+) ctl (\d+) mrf (\d+) mv (\d+) se (\S+) L (\S+) age (\S+) drain (\S+) fixed (\S+)", line)
        if not m:
            continue
        lab, X, gate, rule, act, ctl, mrf, mv, se, L, age = m.groups()[:11]
        gate = None if gate == "None" else int(gate)
        r = {"label": lab, "X": int(X), "gate": gate, "rule": int(rule), "act": int(act), "ctl": int(ctl), "mrf": int(mrf), "mv": int(mv),
             "se": se, "L": L, "age": age}
        if gate is None:
            r["check"] = "no status animation (no controller emission)"
        else:
            anim = next((a for a, rows in TABLE.items() if rows == int(act) + 1), None)
            r["tableAnimation"] = anim
            r["ruleResidual"] = gate - int(rule)
            r["ctlIdentity"] = int(ctl) == gate + int(act) + 1
            r["check"] = "ok" if r["ruleResidual"] == 0 and r["ctlIdentity"] and anim is not None else (
                "FRZ act 115 phase" if int(act) == 115 else "CHECK")
        recs.append(r)
    res["routes"][name] = recs
allr = [r for v in res["routes"].values() for r in v]
res["summary"] = {"probes": n, "r1EqualsR2": same, "receipts": len(allr),
                  "gated": sum(1 for r in allr if r["gate"]), "gateFrames": sum(r["gate"] or 0 for r in allr),
                  "ruleResidualNonZero": sum(1 for r in allr if r["gate"] is not None and r["ruleResidual"] != 0),
                  "noAnimation": sum(1 for r in allr if r["gate"] is None),
                  "checks": {c: sum(1 for r in allr if r["check"] == c) for c in sorted({r["check"] for r in allr})}}
json.dump(res, open(out, "w"), indent=1)
open(out, "a").write("\n")
print(json.dumps(res["summary"]))
