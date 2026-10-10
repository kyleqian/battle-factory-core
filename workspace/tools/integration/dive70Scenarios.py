#!/usr/bin/env python3
"""dive70: the Dive attack-body variant scenarios (plans48Probe.scenario ops over the accepted mechanic-dive-* lab scenarios, lab seed pinned
to prep61's SD 305420547, ISSUES #154): the defender's moves = Surf 57 / Whirlpool 250 (hit the UNDERWATER diver during the hidden turn) and
Protect 182 (the attack turn: a protected target -> the attack misses). -> tools/integration/fixtures/dive70/scenarios/<ident>.json
usage: dive70Scenarios.py"""
import sys
from pathlib import Path
sys.path.insert(0, "tools/integration")
import plans48Probe as P48
OUT = Path("tools/integration/fixtures/dive70")
SD = ("seed", 305420547)
P, O = "mechanic-dive-player-chinchou-opponent-onix", "mechanic-dive-opponent-chinchou-player-onix"
# The opponent-diver traces get one more FIGHT -> first move turn (the attack follows the player's turn-2 prompt). Protect: the turn-2 Protect is a
# consecutive use (1/2 success): lab seeds SD + k, k = 1..6, are probed and dive70Fixtures.py reports which ones protect.
JOBS = [("DIVE", f"{v}-{s}", 291, base, (SD, ("moves", foe, mv), *((("turns", 1), ("extend", 600)) if s == "opp" else ())))
        for v, mv in (("surf", 57), ("whirlpool", 250))
        for s, base, foe in (("ply", P, "opponent"), ("opp", O, "player"))]
# whirlpool-opp at SD: the player's turn-1 Whirlpool misses (accuracy 70) and the attack moves first in turn 2 -> no hidden hit; more seeds
JOBS += [("DIVE", f"whirlpool-opp-s{k}", 291, O, (("seed", SD[1] + k), ("moves", "player", 250), ("turns", 1), ("extend", 600))) for k in range(1, 5)]
JOBS += [("DIVE", f"protect-{s}-s{k}", 291, base, (("seed", SD[1] + k), ("moves", foe, 182), ("turns", 1), ("extend", 600)))
         for k in range(1, 7) for s, base, foe in (("ply", P, "opponent"), ("opp", O, "player"))]
for job in JOBS:
    print(P48.scenario(OUT, job))
