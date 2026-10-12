#!/usr/bin/env python3
"""ord124 (docs/ord124-order-plans.md) rung 3 window routes: the windows AFTER an Odor Sleuth 316 / False Swipe 206 body through the
production live renderer. plans69Probe.scenario's lab envelope (lab seed pinned), the attacker knows only the order-host body move, the
defender only a Factory-live move (Harden 106 / Mega Punch 5), three turns: every defender window and every later body follows the body.
usage: ord124Stage.py <out-dir>   (writes <id>.json lab scenarios; audit20Probes.py takes them as pb-<id>.json)"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import plans69Probe as P69

SIDES = (("player", "opponent", "ply"), ("opponent", "player", "opp"))
JOBS = []
for side, other, tag in SIDES:
    for unit, mv, a, d, dmv, seed in (("os", 316, 345, 95, 106, 7), ("os", 316, 143, 42, 5, 11), ("fs", 206, 345, 95, 106, 7)):
        JOBS.append((unit, f"ord124-w{unit}-{tag}-{a}-{d}-{dmv}-s{seed}", mv, P69.base("mega-punch", side, "cacturne"),
                     (("species", side, a), ("species", other, d), ("moves", side, mv), ("moves", other, dmv), ("seed", seed), ("turns", 2))))

if __name__ == "__main__":
    out = Path(sys.argv[1])
    for job in JOBS:
        src = P69.scenario(out, job)
        (out / f"{job[1]}.json").write_text(src.read_text())
    print(len(JOBS), "scenarios")
