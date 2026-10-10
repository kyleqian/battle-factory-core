#!/usr/bin/env python3
"""ret80 direct-mGBA sSpriteOrder probes of Return 216 by power level (docs/ret80-return-order.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): ret80Probe.py <out-dir> [--jobs J=12]
Move_RETURN branches on gAnimFriendship (AnimTask_GetReturnPowerLevel, battle_anim_effects_3.c:5060-5073). The Strongest jobs (the
Factory's friendship 255: mechanic-return-<side>-dragonair-<other>-onix) run both sides at the scenario's own pair (Dragonair 148 vs
Onix 95) and two swapped pairs (Snorlax 143 / Golbat 42), each at two explicit lab seeds; the Medium / Strong / Weak scenarios (friendship
61 / 200-range / < 61) are controls (Medium = plan 117's branch). plans69Probe.scenario rewrites each base with the lab seed ALWAYS
pinned (ISSUES #154); every job runs twice in separate fresh mGBA processes in this one batch (prep43Probe.run) -> raw/<id>-A/-B.json.
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans69Probe as P69  # scenario() (its import sets P43.scenario = P69.scenario)

SIDES = P69.SIDES
scenario = P69.scenario
JOBS = []
for side, other, tag in SIDES:
    for a, d in ((148, 95), (143, 42), (42, 143)):
        for seed in (305420349, 7):
            JOBS.append(("RETURN_STRONGEST", f"return-strongest-{tag}-{a}-{d}-s{seed}", 216, P69.base("return", side, "dragonair"),
                         (("species", side, a), ("species", other, d), ("seed", seed))))
    for level in ("medium", "strong", "weak"):
        JOBS.append((f"RETURN_{level.upper()}", f"return-{level}-{tag}-148-95", 216, P69.base(f"return-{level}", side, "dragonair"), ()))

P43.scenario = P69.scenario

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
