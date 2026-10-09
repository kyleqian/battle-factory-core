#!/usr/bin/env python3
"""prep47 (B) direct-mGBA sSpriteOrder probes of battle-start entry seeds (docs/next-adapters-prep47.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep47SeedProbe.py <out-dir> [--jobs J=12]
Each job = (class, id, {side: (species, abilitySlot, gender)}): the lead(s) of the base scenario
(mechanic-petal-dance-opponent-gloom-player-onix: player Onix / Tackle, opponent Gloom / Petal Dance, one FIGHT turn) replaced
through overrides.parties (moves kept), so the stock ROM runs the leads' ON_SWITCHIN hooks (Intimidate, Trace, Clear Body) at their
real time before the first prompt. Every job runs twice in separate fresh mGBA processes (spriteOrderEventProbe.py through
run-mgba-probe.py) -> <out-dir>/raw/<id>-A.json / -B.json. Abilities (internal species ids): Gyarados 130 / Arcanine 59 / Granbull 210 slot 0 Intimidate,
Porygon2 233 Trace, Tentacruel 73 / Metagross 400 slot 0 Clear Body, Snorlax 143 / Onix 95 / Gloom 44 no entry hook.
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = Path("tools/battle-lab/mechanic-petal-dance-opponent-gloom-player-onix.json")
GYARADOS, ARCANINE, GRANBULL = (130, 0, "male"), (59, 0, "male"), (210, 0, "female")
PORYGON2, TENTACRUEL, METAGROSS, SNORLAX = (233, 0, "genderless"), (73, 0, "male"), (400, 0, "genderless"), (143, 0, "male")
JOBS = [
    # controls: no entry hook (the known entry) and the existing single-Intimidate seed (seedLiveSpriteOrderHostFromBattleStart)
    ("NONE", "none-onix-gloom", {}),
    ("NONE", "none-snorlax-gloom", {"player": SNORLAX}),
    ("INTIMIDATE_1", "int1-gyarados-gloom", {"player": GYARADOS}),
    ("INTIMIDATE_1", "int1-onix-arcanine", {"opponent": ARCANINE}),
    # census unknown-entry classes (seeds 0..299)
    ("TRACE", "trace-porygon2-gloom", {"player": PORYGON2}),
    ("TRACE", "trace-porygon2-snorlax", {"player": PORYGON2, "opponent": SNORLAX}),
    ("TRACE", "trace-onix-porygon2", {"opponent": PORYGON2}),
    ("TRACE", "trace-snorlax-porygon2", {"player": SNORLAX, "opponent": PORYGON2}),
    ("INTIMIDATE_PREVENTED", "intprev-tentacruel-gyarados", {"player": TENTACRUEL, "opponent": GYARADOS}),
    ("INTIMIDATE_PREVENTED", "intprev-metagross-gyarados", {"player": METAGROSS, "opponent": GYARADOS}),
    ("INTIMIDATE_PREVENTED", "intprev-metagross-arcanine", {"player": METAGROSS, "opponent": ARCANINE}),
    ("INTIMIDATE_BOTH", "int2-gyarados-arcanine", {"player": GYARADOS, "opponent": ARCANINE}),
    ("INTIMIDATE_BOTH", "int2-granbull-arcanine", {"player": GRANBULL, "opponent": ARCANINE}),
    ("INTIMIDATE_BOTH", "int2-arcanine-granbull", {"player": ARCANINE, "opponent": GRANBULL}),
    ("INTIMIDATE_TRACE", "inttrace-gyarados-porygon2", {"player": GYARADOS, "opponent": PORYGON2}),
    ("INTIMIDATE_TRACE", "inttrace-arcanine-porygon2", {"player": ARCANINE, "opponent": PORYGON2}),
    ("INTIMIDATE_TRACE", "inttrace-porygon2-arcanine", {"player": PORYGON2, "opponent": ARCANINE}),
]


def scenario(out: Path, job) -> Path:
    _, ident, leads = job
    data = json.loads(BASE.read_text())
    for side, (species, slot, gender) in leads.items():
        lead = data["overrides"]["parties"][side][0]
        lead.update(species=species, abilitySlot=slot, gender=gender)
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    sc = scenario(out, job)
    dest = out / "raw" / f"{job[1]}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/compare/spriteOrderEventProbe.py",
                    "0", str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return job[1], run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in JOBS for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
