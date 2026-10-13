#!/usr/bin/env python3
"""ord149 direct-mGBA sSpriteOrder probes of Astonish 310 bodies (docs/ord149-astonish-extrasensory.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): ord149Probe.py <out-dir> [--jobs J=12]
The attacker knows only Astonish, so every turn is a body (first + later bodies; the defender's scenario move moves the lend in between).
Both sides, three (attacker, target) pairs, three lab seeds ALWAYS pinned (plans69Probe.scenario). Every job runs twice in separate fresh
mGBA processes within this one batch (prep43Probe.run) -> raw/<id>-A.json / -B.json (spriteOrderEventProbe keys carry each slot's oam.y).
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans69Probe as P69  # scenario() (sets P43.scenario)

SIDES = (("player", "opponent", "ply"), ("opponent", "player", "opp"))
scenario = P69.scenario
JOBS = []
for side, other, tag in SIDES:
    for a, d in ((371, 95), (143, 42), (42, 143)):
        for seed in (0, 7, 11):
            JOBS.append(("ASTONISH", f"ord149-as-{tag}-{a}-{d}-s{seed}", 310, P69.base("astonish", side, "loudred"),
                         (("species", side, a), ("species", other, d), ("moves", side, 310), ("seed", seed), ("turns", 2))))

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    for job in JOBS:
        P69.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in JOBS for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
