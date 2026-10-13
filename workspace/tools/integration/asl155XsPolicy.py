#!/usr/bin/env python3
"""asl155 B: the D4 policy for a player attacker's LATER Extrasensory body (opponent SHUCKLE-class target), chosen from ord149's instruction-stepped
per-row split S (fixtures/ord149/xs). Display class of a write row: S <= 26 (== S = 0: SHUCKLE's first monbg line is 27, prep30 s1.4) or S itself.
Per (stage, data[1]) over the measured later bodies: the dominant class, a tie -> S <= 26 (the policy's tie rule: no optional event).
Then the residual rows each measured body shows under (a) the chosen policy, (b) scan93 patch B (the first-body fitted row: lines <= 28 at stage
index 2 data[1] 4), (c) every other measured body's S as the rendered phase (the alternate phases); the ord149XsPredict rule decides a row.
usage: asl155XsPolicy.py <out.json> [<probe-dir>]"""
import json, sys
from collections import Counter
from pathlib import Path

V = 27
XS = Path(sys.argv[2] if len(sys.argv) > 2 else "tools/integration/fixtures/ord149/xs")
LATER = [("xs-pla-xs-A", 1, "xs-pla-nuzleaf-shuckle-xs-1.json"), ("xs-pla-xs-A", 2, "xs-pla-nuzleaf-shuckle-xs-2.json"),
         ("xs-pla-qa-A", 0, "xs-pla-nuzleaf-shuckle-qa-0.json"), ("xs-pla-qa-A", 1, "xs-pla-nuzleaf-shuckle-qa-1.json"),
         ("xs-pla-qa-A", 2, "xs-pla-nuzleaf-shuckle-qa-2.json")]
FIRST = ("xs-pla-xs-A", 0)


def bodies(name):
    rows = [r for r in json.loads((XS / f"{name}.json").read_text())["rows"] if r[1] == 0 and isinstance(r[7], list)]
    out, prev = [], None
    for r in rows:
        if prev is None or r[0] - prev > 5:
            out.append([])
        prev = r[0]; out[-1].append(r)
    return out


def table(body):  # (stage, data[1]) -> [S, lo - 1 (no split), trace frame]
    t, stage = {}, -1
    for r in body:
        stage += r[2] == 0
        t[(stage, r[2])] = [max(r[7]) if r[7] else r[3] - 1, r[3] - 1, r[0]]
    return t


cls = lambda s: 0 if s < V else s  # 0 = the S <= 26 class (displayed as S = 0)
later = [(fixture, table(bodies(name)[i])) for name, i, fixture in LATER]
first = table(bodies(FIRST[0])[FIRST[1]])
keys = [k for k in sorted(later[0][1]) if k[1] != 0]  # stage-start rows excluded (data[1] 0: the previous word is the stop state)
policy, rows_out, ties = {}, [], 0
for k in keys:
    c = Counter(cls(t[k][0]) for _, t in later)
    top = max(c.values()); best = sorted(v for v, n in c.items() if n == top)
    tie = len(best) > 1
    choice = 0 if 0 in best else best[0]
    ties += tie
    policy[k] = choice
    rows_out.append({"stage": k[0], "data1": k[1], "classes": {str(v): n for v, n in sorted(c.items())}, "chosen": choice, "tie": tie,
                     "firstBody": cls(first[k][0])})
patch_b = {k: (28 if k == (2, 4) else 0) for k in keys}


def residual(t, render):  # rows whose displayed class differs between the ROM S and the rendered split
    return [k for k in keys if cls(t[k][0]) != cls(render[k])]


windows = []
for fixture, t in later:
    under = {"policy": residual(t, policy), "patchB": residual(t, patch_b)}
    alts = {f2: len(residual(t, {k: t2[k][0] for k in keys})) for f2, t2 in later if f2 != fixture}
    windows.append({"fixture": fixture, "policyRows": len(under["policy"]), "patchBRows": len(under["patchB"]),
                    "policyKeys": [list(k) for k in under["policy"]], "policyAges": [94 + k[1] for k in under["policy"]],
                    "patchBKeys": [list(k) for k in under["patchB"]], "asAlternatePhaseRows": alts})
out = {"schema": "asl155-xs-policy/v1", "visibleLine": V, "laterBodies": len(later), "rowKeys": len(keys),
       "dominantNoEvent": sum(1 for k in keys if policy[k] == 0), "ties": ties,
       "fittedRow": {"stage": 2, "data1": 4, "laterClasses": {str(v): n for v, n in sorted(Counter(cls(t[(2, 4)][0]) for _, t in later).items())},
                     "firstBody": cls(first[(2, 4)][0])},
       "rows": rows_out, "windows": windows,
       "totals": {"policyRows": sum(w["policyRows"] for w in windows), "patchBRows": sum(w["patchBRows"] for w in windows)}}
Path(sys.argv[1]).write_text(json.dumps(out, indent=1) + "\n")
print(f"policy: S = 0 class dominant on {out['dominantNoEvent']} / {len(keys)} rows ({ties} tie); fitted row later classes {out['fittedRow']['laterClasses']}"
      f" (first body {out['fittedRow']['firstBody']})")
for w in windows:
    print(f"  {w['fixture']}: residual rows policy {w['policyRows']} {w["policyKeys"]} vs patch B {w['patchBRows']} {w['patchBKeys']}")
print(f"total residual split rows: policy {out['totals']['policyRows']} vs patch B {out['totals']['patchBRows']}")
