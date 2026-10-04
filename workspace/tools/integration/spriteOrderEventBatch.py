#!/usr/bin/env python3
"""Run spriteOrderEventProbe.py twice (fresh processes) per job, 4 at a time.

usage: spriteOrderEventBatch.py [--list]
Needs the mGBA venv (PYTHONPATH=<vendor>/libmgba-py, vendor python).
Raw: tools/integration/fixtures/sprite-order-event-raw/<move>-<scenario-stem>-{0,1}.json
"""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/sprite-order-event-raw"
sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderBatch as B  # noqa: E402

M = "tools/battle-lab/mechanic-"
PRIMARY = [(m, s) for m in (53, 299, 189, 88, 28, 291, 288) for s in B.NEEDS[m]]
EXTRA = [(m, M + n + ".json") for m, n in (
    (2, "karate-chop-opponent-primeape-player-onix"), (101, "night-shade-opponent-ariados-player-onix"),
    (101, "night-shade-player-ariados-opponent-onix"), (103, "screech-opponent-voltorb-player-onix"),
    (105, "recover-player-kadabra-opponent-onix"), (108, "smokescreen-player-koffing-opponent-onix"),
    (109, "confuse-ray-opponent-chinchou-player-onix"), (112, "barrier-opponent-drowzee-player-onix"))]
JOBS = [(str(m), s) for m, s in PRIMARY + EXTRA if (ROOT / s).is_file()]


def run(job):
    mid, scenario = job
    stem = Path(scenario).stem
    for i in (0, 1):
        out = RAW / f"{mid}-{stem}-{i}.json"
        subprocess.run([sys.executable, str(ROOT / "tools/compare/spriteOrderEventProbe.py"), mid, scenario, str(out)],
                       cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return job


if __name__ == "__main__":
    if "--list" in sys.argv:
        print(len(JOBS)); [print(*j) for j in JOBS]; raise SystemExit
    RAW.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(4) as ex:
        for j in ex.map(run, JOBS):
            print("done", *j, flush=True)
