#!/usr/bin/env python3
"""plans54 direct-mGBA sSpriteOrder probes (docs/next-adapters-plans54.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): plans54Probe.py <out-dir> [--jobs J=12] [--only <unit,...>]
plans48Probe.py's job format and scenario ops (imported unchanged: species / moves / item / seed / extend / turns); only the job list is
new. Every job pins its lab seed ("seed" op, ISSUES #154) and runs twice in separate fresh mGBA processes (prep43Probe.run) ->
raw/<id>-A.json / -B.json; a batch (--only) always runs both runs of each of its jobs. Battle-lab species are INTERNAL ids
(CAMERUPT 340; plans51's "camerupt" Eruption scenarios stage 323 = BARBOACH, tools/integration/s10aLiveFixtures.py).
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans48Probe as P48  # installs its scenario() as prep43Probe.scenario

scenario = P48.scenario  # prep43Extract resolves the scenario through J.scenario
SEED = ("seed", 7)

# Eruption 284 (ISSUES #155 fail-closed key): CAMERUPT 340, the only Factory Eruption user, as the attacker on both sides, two defenders.
ER_P, ER_O = "mechanic-eruption-player-camerupt-opponent-onix", "mechanic-eruption-opponent-camerupt-player-onix"
JOBS = [("BODY284", f"er-ply-{a}-{d}", 284, ER_P, (SEED, ("species", "player", a), ("species", "opponent", d), ("moves", "player", 284)))
        for a, d in [(340, 95), (340, 143)]]
JOBS += [("BODY284", f"er-opp-{a}-{d}", 284, ER_O, (SEED, ("species", "opponent", a), ("species", "player", d), ("moves", "opponent", 284)))
         for a, d in [(340, 95), (340, 143)]]
# Fury Cutter 210: consecutive hits on a Splash-only Blissey raise furyCutterCounter 1, 2, 3, 4, 5, 5, ... (Cmd_furycuttercalc caps at 5);
# the k-th body of an unbroken chain carries counter min(k, 5). Attackers GROVYLE 278 / SCYTHER 123 per side; 7 turns.
FC_P, FC_O = "mechanic-fury-cutter-player-grovyle-opponent-blissey", "mechanic-fury-cutter-opponent-grovyle-player-blissey"
JOBS += [("BODY210", f"fc-ply-{a}", 210, FC_P, (SEED, ("species", "player", a), ("moves", "player", 210), ("turns", 3), ("extend", 300)))
         for a in (278, 123)]
# Opponent side: the defender is SKARMORY 227 (Bug 0.25x): a KO'd player lead opens the party menu, whose ResetSpriteData truncates the
# probe (the first fc-opp batch against Blissey kept only its tail).
JOBS += [("BODY210", f"fc-opp-{a}", 210, FC_O, (SEED, ("species", "opponent", a), ("species", "player", 227), ("turns", 3), ("extend", 300)))
         for a in (278, 123)]

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        P48.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
