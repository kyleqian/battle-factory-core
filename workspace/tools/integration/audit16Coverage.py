#!/usr/bin/env python3
"""Live audit 16: coverage grid from <receipt-dir>/check-*.json (audit16Check.ts). One line per (scenario family, consumer, side): the
species pair, "0-px live windows / windows", discr = 0-px windows whose ENTRY-lend control is non-zero (the chain lend is what makes them
exact), and the non-zero chain residuals. Families: the scenario name without the lab-seed suffix (fb-*-s<seed>); the unit is the name's
prefix (conf / slp / prz / psn / frz / brn = the status animation; later-<move>-<predecessor>; fb = FOCUS_BAND; ctl = no-unit control).
usage: audit16Coverage.py <receipt-dir>"""
import json, re, sys
from collections import defaultdict
from pathlib import Path

grid = defaultdict(lambda: {"n": 0, "zero": 0, "discr": 0, "declined": 0, "px": [], "species": set()})
total = {"n": 0, "zero": 0, "discr": 0, "declined": 0, "r1r2": 0}
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    scen = json.loads(p.read_text())["scenario"]
    for r in json.loads(p.read_text())["rows"]:
        fam = re.sub(r"-s\d+$", "", scen)
        g = grid[(fam, r["move"], r["side"])]
        c, e = r["chain"], r["entry"]
        g["n"] += 1; total["n"] += 1
        g["species"].add(r["species"])
        total["r1r2"] += int(c["digests"][0] == c["digests"][1] and e["digests"][0] == e["digests"][1])
        if not c["live"]:
            g["declined"] += 1; total["declined"] += 1
        elif c["px"] == 0:
            g["zero"] += 1; total["zero"] += 1
            if e["px"] > 0:
                g["discr"] += 1; total["discr"] += 1
        else:
            g["px"].append(c["px"])
print("| scenario family | consumer | side | species (attacker/target) | 0-px / windows | discr | non-zero chain px |")
print("|---|---|---|---|---|---|---|")
for (fam, move, side), g in sorted(grid.items()):
    print(f"| {fam} | {move} | {side} | {', '.join(sorted(g['species']))} | {g['zero']}/{g['n']}"
          f"{' (' + str(g['declined']) + ' declined)' if g['declined'] else ''} | {g['discr']} | {', '.join(map(str, sorted(set(g['px'])))) or '-'} |")
print(f"\nTOTAL windows {total['n']}: 0 px {total['zero']} (discr {total['discr']}), declined {total['declined']}, "
      f"non-zero {total['n'] - total['zero'] - total['declined']}; chain and entry r1 == r2 in {total['r1r2']} / {total['n']}")
