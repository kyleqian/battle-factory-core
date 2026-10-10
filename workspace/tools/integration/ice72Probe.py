#!/usr/bin/env python3
"""ice72 direct-mGBA probes (docs/ice72-ice-ball-words-unit.md): Ice Ball 301 bodies (both sides, rollout counters 1..5, two species pairs,
a later Ice Ball after a KO + send-in, a first Ice Ball marker at non-entry occupancy after a Mud-Slap chain's KO + send-in), each followed
by NON-Ice-Ball order-dependent consumers (Water Gun 55, Water Pulse 352, Swift 129, Mud-Slap 189) and by the later Ice Ball bodies.
words57Probe.py's scenario / run / A-B machinery, unchanged (per-frame sSpriteOrder + gRng2Value, prep46OrderRngProbe.py; explicit lab seed
in every scenario, ISSUES #154; both runs of a job in one batch); only the job list is ice72's (it replaces words57Probe.JOBS in place).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): ice72Probe.py <out-dir> [--jobs J=16] [--only <id,...>]
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import words57Probe as W
from words57Probe import BENCH_O, BENCH_P, MS, ONIX, PIDGEOTTO, SANDSHREW, SNORLAX, SUNKERN, SWIFT, mon

ICE_BALL, WATER_GUN, WATER_PULSE = 301, 55, 352
GLALIE, SEALEO, WALREIN, LAPRAS = 347, 342, 343, 131  # internal species ids (include/constants/species.h)
IB4, WG4, WP4 = (ICE_BALL,) * 4, (WATER_GUN,) * 4, (WATER_PULSE,) * 4
T6 = [None] * 6
# (id, words unit = 301, side of the Ice Ball user, battle unit, player party, opponent party, turn cursor steps)
JOBS = [
    # pair 1 (Glalie / Snorlax): the faster Ice Ball user rolls counters 1..5; the slower foe's Water Gun after every body
    ("ply-glalie-wg", ICE_BALL, "player", "ko", [mon(GLALIE, moves=IB4)] + BENCH_P, [mon(SNORLAX, moves=WG4, speed_iv=0)] + BENCH_O, T6),
    ("opp-glalie-wg", ICE_BALL, "opponent", "ko", [mon(LAPRAS, moves=WG4, speed_iv=0)] + BENCH_P, [mon(GLALIE, moves=IB4)] + BENCH_O, T6),
    # pair 2 (Sealeo / Walrein): Water Gun consumers; the Ice-resisting foe survives counter 5. (ply-sealeo-wp and ko-ply-glalie-sunkern were
    # dropped: their battles ended inside the trace, whose end-of-battle sprite reset clears the probe rows; ply-glalie-wg's counter-4 body
    # after the Onix send-in is the player's later Ice Ball after a KO + send-in)
    ("opp-sealeo-wg", ICE_BALL, "opponent", "ko", [mon(WALREIN, moves=WG4, speed_iv=0)] + BENCH_P, [mon(SEALEO, moves=IB4)] + BENCH_O, T6),
    # Mud-Slap (opponent lead) -> the player's Swift KO -> send-out of an Ice Ball user: its FIRST Ice Ball body is at non-entry occupancy
    ("ko-opp-ms-sealeo", ICE_BALL, "opponent", "ko", [mon(SNORLAX, moves=(SWIFT,) * 4, speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (MS,) * 4), mon(SEALEO, moves=IB4), mon(GLALIE, moves=IB4)], [None] * 7),
    # Mud-Slap as the consumer of the Ice Ball marker (the slower Walrein's Mud-Slap after every body)
    ("ply-glalie-ms", ICE_BALL, "player", "ko", [mon(GLALIE, moves=IB4)] + BENCH_P,
     [mon(WALREIN, moves=(MS,) * 4, speed_iv=0)] + [mon(LAPRAS, moves=WG4, speed_iv=0), mon(SNORLAX, moves=WG4, speed_iv=0)], T6),
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
