#!/usr/bin/env python3
"""flat84 KO chain probes (docs/next-adapters-flat84.md): ice72Probe.py with flat84's job list. A Flatter 260 body (the words unit) by a
fast, frail opponent NIDORINO; the slower player SLOWBRO's Water Pulse 352 KOs it; the opponent's faint + summary + send-out (LICKITUNG);
then the next Water Pulse (and the bench Tackles) consume the Flatter order unit PAST the battle units. words57Probe.py's scenario / run / A-B
machinery and ice72OrderRngProbe.py (per-frame sSpriteOrder + gRng2Value + battler species) unchanged; explicit lab seed (ISSUES #154);
both runs of a job in one batch.

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): flat84KoProbe.py <out-dir> [--jobs J=16] [--only <id,...>]
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import words57Probe as W
from words57Probe import BENCH_O, BENCH_P, mon

FLATTER, WATER_PULSE = 260, 352
NIDORINO, SLOWBRO = 33, 80  # internal species ids (include/constants/species.h)
T6 = [None] * 6
# (id, words unit = 260, side of the Flatter user, battle unit, player party, opponent party, turn cursor steps)
JOBS = [
    ("ko-flatter-opp-slowbro-wp", FLATTER, "opponent", "ko", [mon(SLOWBRO, moves=(WATER_PULSE,) * 4, speed_iv=0)] + BENCH_P,
     [mon(NIDORINO, 25, (FLATTER,) * 4)] + BENCH_O, T6),
]
W.JOBS[:] = JOBS


def run(args):
    """words57Probe.run with ice72OrderRngProbe.py (prep46OrderRngProbe.py + per-frame battler species)."""
    out, job, run_id = args
    ident, move = job[0], job[1]
    sc = W.scenario(out, job)
    dest = out / "raw" / f"{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    W.subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/ice72OrderRngProbe.py",
                      str(move), str(sc), str(dest)], stdout=W.subprocess.DEVNULL, stderr=W.subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return ident, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 16
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        W.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    same = [i for i, r, ok in results if r == "A" and ok and (out / "raw" / f"{i}-A.json").read_bytes() == (out / "raw" / f"{i}-B.json").read_bytes()]
    print(len(results), "probe runs;", "missing:", missing or "none", ";", len(same), "of", len(selected), "jobs A == B")
