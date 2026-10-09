#!/usr/bin/env python3
"""prep46 direct-mGBA probes: per-frame sSpriteOrder + gRng2Value (prep46OrderRngProbe.py) for the WORDS-DEPENDENT order units of
docs/next-adapters-prep46.md (Sand-Attack 28, Mud-Slap 189, Rain Dance 240 + its RAIN_CONTINUES end turn). Never the HTTP oracles.

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep46Probe.py <out-dir> [--jobs J=8] [--only <unit,...>]
Scenario variants are prep45Probe.scenario's ("turns", N, ...) / (side, species) / ("set", side, setId). Every job runs twice in
separate fresh mGBA processes (tools/run-mgba-probe.py; exit 138 = the known teardown SIGBUS, output complete) -> raw/<id>-A/B.json.
"""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep45Probe as P45

LICK, NOSE = P45.LICKITUNG_SET, P45.NOSEPASS_SET
T1 = ("turns", 1)
JOBS = [
    # Sand-Attack 28 / Mud-Slap 189: both attacker sides, two defender leads per side, one more FIGHT turn (the next consumers)
    ("BODY28", "sa-opp-onix", 28, "mechanic-sand-attack-pidgeotto-onix", T1),
    ("BODY28", "sa-opp-lickitung", 28, "mechanic-sand-attack-pidgeotto-onix", T1 + ("set", "player", LICK)),
    ("BODY28", "sa-ply-onix", 28, "mechanic-sand-attack-player-pidgeotto-onix", T1),
    ("BODY28", "sa-ply-nosepass", 28, "mechanic-sand-attack-player-pidgeotto-onix", T1 + ("set", "opponent", NOSE)),
    ("BODY189", "ms-opp-onix", 189, "mechanic-mud-slap-pidgeotto-onix", T1),
    ("BODY189", "ms-opp-lickitung", 189, "mechanic-mud-slap-pidgeotto-onix", T1 + ("set", "player", LICK)),
    ("BODY189", "ms-ply-onix", 189, "mechanic-mud-slap-player-pidgeotto-onix", T1),
    ("BODY189", "ms-ply-nosepass", 189, "mechanic-mud-slap-player-pidgeotto-onix", T1 + ("set", "opponent", NOSE)),
    # Rain Dance 240 (+ General_Rain at the end turn): both sides, two defender leads per side, one more FIGHT turn
    ("BODY240", "rd-ply-onix", 240, "mechanic-rain-dance-player-wooper-opponent-onix", T1),
    ("BODY240", "rd-ply-snorlax", 240, "mechanic-rain-dance-player-wooper-opponent-onix", T1 + ("opponent", 143)),
    ("BODY240", "rd-opp-onix", 240, "mechanic-rain-dance-opponent-wooper-player-onix", T1),
    ("BODY240", "rd-opp-snorlax", 240, "mechanic-rain-dance-opponent-wooper-player-onix", T1 + ("player", 143)),
]


def run(args):
    out, job, run_id = args
    _, ident, move, _, _ = job
    sc = P45.scenario(out, job)
    dest = out / "raw" / f"{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/prep46OrderRngProbe.py",
                    str(move), str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return ident, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 8
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        P45.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    same = [i for i, r, ok in results if r == "A" and ok and (out / "raw" / f"{i}-A.json").read_bytes() == (out / "raw" / f"{i}-B.json").read_bytes()]
    print(len(results), "probe runs;", "missing:", missing or "none", ";", len(same), "of", len(selected), "jobs A == B")
