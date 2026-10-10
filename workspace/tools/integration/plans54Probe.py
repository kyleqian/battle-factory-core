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
# Hail 258 + HAIL_CONTINUES (General_Hail: goto Move_HAIL, the end-turn WEATHER_VAR 13 animation, mv-0 bodies): both battlers are the
# targets (GenerateHailParticle), so the grid is (player, opponent) species pairs, each with the hail user on both sides; 2 more turns
# (the user's Hail fails while it hails; the end-turn animation plays every turn). Pairs = plans54HailPredict.ts PLANS54_HAIL_PAIRS
# (predictions committed before these probes ran).
HA_P, HA_O = "mechanic-hail-player-delibird-opponent-onix", "mechanic-hail-opponent-delibird-player-onix"
HA_PAIRS = [(225, 95), (143, 42), (42, 143), (347, 76)]
JOBS += [("BODY258", f"ha-ply-{p}-{o}", 258, HA_P, (SEED, ("species", "player", p), ("species", "opponent", o), ("moves", "player", 258),
          ("turns", 2))) for p, o in HA_PAIRS]
JOBS += [("BODY258", f"ha-opp-{p}-{o}", 258, HA_O, (SEED, ("species", "player", p), ("species", "opponent", o), ("moves", "opponent", 258),
          ("turns", 2))) for p, o in HA_PAIRS]
# Blizzard 59: geometry-keyed (attacker / target picOffsetPoint); (attacker, target) pairs = plans54BlizzardPredict.ts PLANS54_BLIZZARD_PAIRS
# (predictions committed before these probes ran); Ice-resisting / bulky targets (a KO'd player lead's party menu truncates the probe);
# one more turn (Blizzard's 70 % accuracy).
BZ_P, BZ_O = "mechanic-blizzard-player-pelipper-opponent-onix", "mechanic-blizzard-opponent-pelipper-player-onix"
BZ_PAIRS = [(310, 208), (87, 91), (131, 143), (215, 131)]  # JYNX 124 / ARTICUNO 144 leads: rejected by the lab (gender)
JOBS += [("BODY59", f"bz-ply-{a}-{t}", 59, BZ_P, (SEED, ("species", "player", a), ("species", "opponent", t), ("moves", "player", 59),
          ("turns", 1))) for a, t in BZ_PAIRS]
JOBS += [("BODY59", f"bz-opp-{a}-{t}", 59, BZ_O, (SEED, ("species", "opponent", a), ("species", "player", t), ("moves", "opponent", 59),
          ("turns", 1))) for a, t in BZ_PAIRS]

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
