#!/usr/bin/env python3
"""words59 direct-mGBA probes (docs/next-adapters-words59.md): a dirt words unit (Sand-Attack 28 / Mud-Slap 189) + an opponent KO + next-mon
summary + send-out, then ORDER-DEPENDENT consumers (Water Pulse 352, Silver Wind 318) for the dense production windows.
words57Probe.py's scenario / run / A-B machinery, unchanged; only the job list is words59's (it replaces words57Probe.JOBS in place, so
words59Extract.py runs words57Extract.py over these jobs).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): words59Probe.py <out-dir> [--jobs J=16] [--only <id,...>]
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import words57Probe as W
from words57Probe import BENCH_O, BENCH_P, MS, PIDGEOTTO, SA, SLOWPOKE, SNORLAX, mon

SILVER_WIND, WATER_PULSE = 318, 352
JOBS = [
    # the opponent's (faster, frail) dirt body every turn; the slower player's consumer move (all four slots) KOs it -> opponent faint +
    # summary + send-out; the player's next bodies of the same move are the consumers after the battle unit
    ("wp-ms-opp-pidgeotto", 189, "opponent", "ko", [mon(SLOWPOKE, moves=(WATER_PULSE,) * 4, speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (MS,) * 4)] + BENCH_O, [None, None, None, None]),
    ("wp-sa-opp-pidgeotto", 28, "opponent", "ko", [mon(SLOWPOKE, moves=(WATER_PULSE,) * 4, speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (SA,) * 4)] + BENCH_O, [None, None, None]),
    ("sw-ms-opp-pidgeotto", 189, "opponent", "ko", [mon(SNORLAX, moves=(SILVER_WIND,) * 4, speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (MS,) * 4)] + BENCH_O, [None, None, None, None, None]),
]
W.JOBS[:] = JOBS

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 16
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        W.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(W.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    same = [i for i, r, ok in results if r == "A" and ok and (out / "raw" / f"{i}-A.json").read_bytes() == (out / "raw" / f"{i}-B.json").read_bytes()]
    print(len(results), "probe runs;", "missing:", missing or "none", ";", len(same), "of", len(selected), "jobs A == B")
