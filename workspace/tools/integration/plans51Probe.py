#!/usr/bin/env python3
"""plans51 direct-mGBA sSpriteOrder probes for the next tail of sprite-order host stops (docs/next-adapters-plans51.md; never the
HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): plans51Probe.py <out-dir> [--jobs J=12] [--only <unit,...>]
plans48Probe.py's job format and scenario ops (imported unchanged); only the job list is new. Every job runs twice in separate fresh
mGBA processes (prep43Probe.run) -> raw/<id>-A.json / -B.json.
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans48Probe as P48  # installs its scenario() (ops: species / moves / item / seed / extend) as prep43Probe.scenario

scenario = P48.scenario  # prep43Extract resolves the scenario through J.scenario

# Outrage 200 (Move_OUTRAGE: fixed-argument create_outrage_flame_sprite flames, TranslateSpriteLinearAndFlicker, duration 30; no
# Random2). (attacker, defender) per side; the attacker's lead moves are set to 4x Outrage. The locked 2nd / 3rd turns play more bodies.
OU_P, OU_O = "mechanic-outrage-player-dragonite-opponent-onix", "mechanic-outrage-opponent-dragonite-player-onix"
OU_PAIRS = [(149, 95), (149, 143), (42, 95), (143, 42)]
JOBS = [("BODY200", f"ou-ply-{a}-{d}", 200, OU_P, (("species", "player", a), ("species", "opponent", d), ("moves", "player", 200)))
        for a, d in OU_PAIRS]
JOBS += [("BODY200", f"ou-opp-{a}-{d}", 200, OU_O, (("species", "opponent", a), ("species", "player", d), ("moves", "opponent", 200)))
         for a, d in OU_PAIRS]

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
