#!/usr/bin/env python3
"""ord124 direct-mGBA sSpriteOrder probes (docs/ord124-order-plans.md; never the HTTP oracles): Odor Sleuth 316 first AND later bodies,
both sides, new targets and pinned lab seeds (the computed plan's ROM check), plus Hyper Beam 63 with its recharge turn.

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): ord124Probe.py <out-dir> [--jobs J=12]
Scenario rewriting = plans69Probe.scenario (the lab seed ALWAYS pinned; ("turns", n) = n more FIGHT -> first move turns). Every job runs
twice in separate fresh mGBA processes within this one batch (prep43Probe.run) -> raw/<id>-A.json / -B.json.
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans69Probe as P69  # scenario() (sets P43.scenario)

SIDES = (("player", "opponent", "ply"), ("opponent", "player", "opp"))
scenario = P69.scenario  # prep43Extract.units_of resolves the scenario through J.scenario
JOBS = []
# Odor Sleuth: the attacker knows only Odor Sleuth, so every turn is a body (first + later bodies; the defender's Mega Punch scenario moves
# in between move the lend). (attacker, target) pairs: plans69's two classes (Cacturne -> Onix, Snorlax <-> Golbat) and new targets
# (Charizard 6, Pikachu 25, Gengar 94, Tyranitar 248), lab seeds pinned 0 / 7 / 11.
for side, other, tag in SIDES:
    for a, d, seed in ((345, 95, 7), (143, 42, 11), (345, 6, 0), (345, 25, 7), (143, 94, 11), (345, 248, 0)):
        JOBS.append(("ODOR_SLEUTH", f"ord124-os-{tag}-{a}-{d}-s{seed}", 316, P69.base("mega-punch", side, "cacturne"),
                     (("species", side, a), ("species", other, d), ("moves", side, 316), ("seed", seed), ("turns", 2))))
# Hyper Beam 63 + its recharge turn (no body): the Aerodactyl scenarios, one more turn, pinned seed 5
for side, other, tag in SIDES:
    JOBS.append(("HYPER_BEAM", f"ord124-hb-{tag}-142-95-s5", 63, P69.base("hyper-beam", side, "aerodactyl"), (("seed", 5), ("turns", 1))))

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
