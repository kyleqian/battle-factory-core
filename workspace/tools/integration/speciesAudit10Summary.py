#!/usr/bin/env python3
"""speciesAudit10 summary: coverage grid + residual list from d4aTimingCheck receipts (speciesAudit10Run.sh); speciesAudit9Summary.py's cells, plus
moves without a CPU phase (Shock Wave / Spit Up receipts carry no measuredPhase). usage: speciesAudit10Summary.py <receiptsDir> > grid 2> residuals
Cell: ok = 0 px on every row (2 fresh runs, identical digests); TP(rows,maxPx/row) = other measured phase, residual only on the documented
alternatePhaseResidual ages; X(px,ages) = anything else. Stem = <species>[A]-<fixture> (A = attacker swap, no letter = target swap)."""
import json, glob, os, sys, re, collections
g = collections.defaultdict(dict); n = bad = 0; res = []
for f in sorted(glob.glob(sys.argv[1] + "/*.json")):
    k = os.path.basename(f)[:-5]; e = json.load(open(f))[0]; n += 1
    sp, rest = k.split("-", 1); role = "attacker" if sp.endswith("A") else "target"; sp = re.sub(r"A$", "", sp)
    mv = e["move"]; side = re.search(r"-(player|opponent)-", "-" + rest + "-").group(1); r0 = e["runs"][0]
    ident = all(r["digest"] == r0["digest"] for r in e["runs"]) and len(e["runs"]) == 2
    if not ident: bad += 1
    ag = r0["affectedAges"]; span = f"{ag[0]}..{ag[-1]}" if ag else "-"
    if r0["residualPixels"] == 0: cell = "ok"
    elif not e["selectedPhase"] and not e["violations"]: cell = f"TP({len(ag)}r,{r0['maxPixelsPerRow']})"
    else: cell = f"X({r0['residualPixels']},{span})"
    if not e["selectedPhase"] or r0["residualPixels"]:
        res.append(f"{k}\t{mv}\tmeasured={e.get('measuredPhases', e.get('measuredPhase'))}\tselected={e['selectedPhase']}\trows={r0['rows']}/{e['expectedDuration']}\tpx={r0['residualPixels']}\tages={span}({len(ag)})\tmaxPxRow={r0['maxPixelsPerRow']}\tidentical={ident}\tviolations={len(e['violations'])}")
    fx = re.sub(r"^(spit-up)-(player|opponent)-(\d)$", r"\1-\2-c\3", rest)
    g[(mv, role, side)][sp + ("" if mv != "SPIT_UP" else "/c" + rest[-1])] = cell
for (mv, role, side), d in sorted(g.items()): print(f"| {mv} | {role} swap | {side} attacker | " + ", ".join(f"{k} {v}" for k, v in sorted(d.items())) + " |")
print("rows:", n, "non-identical receipts:", bad); print("\n".join(res), file=sys.stderr)
