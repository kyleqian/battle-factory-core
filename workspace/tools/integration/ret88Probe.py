#!/usr/bin/env python3
"""ret88 direct-mGBA sSpriteOrder probes of Return 216 at friendship 0 = ReturnWeak (docs/ret88-return-weak.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): ret88Probe.py <out-dir> [--jobs J=12]
The kernel sends friendship 0 for every ordinary-play Return (ret80); AnimTask_GetReturnPowerLevel (battle_anim_effects_3.c:5060-5073)
then selects ReturnWeak. Base scenarios mechanic-return-weak-<side>-dragonair-<other>-onix (friendship 60: also level 0) with the
attacker lead's friendship set to 0, both sides, three (attacker, defender) pairs -- Dragonair 148 / Onix 95 (idle-rest target),
Snorlax 143 / Golbat 42 (elevated target), Golbat 42 / Snorlax 143 (elevated attacker) -- at two explicit lab seeds (always pinned,
ISSUES #154), plus one extra FIGHT turn so each job has a first AND a later Return body. Every job runs twice in separate fresh mGBA
processes in this one batch (prep43Probe.run) -> raw/<id>-A/-B.json.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans69Probe as P69

SIDES = P69.SIDES
JOBS = []
for side, other, tag in SIDES:
    for a, d in ((148, 95), (143, 42), (42, 143)):
        for seed in (305420349, 7):
            JOBS.append(("RETURN_WEAK", f"ret88-weak-{tag}-{a}-{d}-s{seed}", 216, P69.base("return-weak", side, "dragonair"),
                         (("species", side, a), ("species", other, d), ("seed", seed), ("turns", 1), ("friendship", side, 0))))


def scenario(out: Path, job) -> Path:
    unit, ident, move, base_name, ops = job
    target = P69.scenario(out, (unit, ident, move, base_name, tuple(o for o in ops if o[0] != "friendship")))
    data = json.loads(target.read_text())
    for op in ops:
        if op[0] == "friendship":
            data["overrides"]["parties"][op[1]][0]["friendship"] = op[2]
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    for job in JOBS:
        scenario(out, job)
    # prep43Probe.run resolves the scenario through its module global; the A / B threads only read the file written above
    P43.scenario = lambda out_dir, job: out_dir / "scenarios" / f"{job[1]}.json"
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in JOBS for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
