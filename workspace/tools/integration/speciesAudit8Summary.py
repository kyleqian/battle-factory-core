#!/usr/bin/env python3
"""speciesAudit8 summary: coverage grid + residual list from receipts. usage: speciesAudit8Summary.py <receiptsDir>
(ok = 0 px with identical digests over 2 fresh runs, X = residual px). Stem = <species>[A|AH|T]-<fixture>; A = attacker swap, AH = attacker swap + target HP EV (Endeavor), no letter = target swap."""
import json, glob, os, sys, re, collections
g = collections.defaultdict(dict); bad = 0; n = 0
for f in sorted(glob.glob(sys.argv[1] + "/*.json")):
    k = os.path.basename(f)[:-5]; r = json.load(open(f)); n += 1
    sp, rest = k.split("-", 1)
    role = "attacker" if sp.endswith("AH") or sp.endswith("A") else "target"; sp = re.sub(r"(AH|A|T)$", "", sp)
    mv = "baton" if rest.startswith("baton") else "endeavor" if rest.startswith("endeavor") else "fire-punch"
    side = "opponent" if re.search(r"(opponent|-o-)", rest) else "player"
    ok = (not r.get("error")) and r["residualPixels"] == 0 and r["identical"]
    if not r.get("identical", False): bad += 1
    g[(mv, role, side)][sp] = "ok" if ok else f"X({r['residualPixels']})"
for (mv, role, side), d in sorted(g.items()): print(f"| {mv} | {role} swap | {side} fixture | " + ", ".join(f"{k} {v}" for k, v in sorted(d.items())) + " |")
print("rows:", n, "non-identical receipts:", bad)
