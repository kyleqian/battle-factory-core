#!/usr/bin/env python3
"""reseed85 direct-mGBA probes (docs/next-adapters-reseed85.md): a words-dependent order unit (Sand-Attack 28, Mud-Slap 189, Rain Dance 240
+ RAIN_CONTINUES) by a fast, frail opponent lead; the slower player's Swift 129 KOs it in the same turn; the opponent's faint + summary +
send-out; then an ALLOCATOR consumer (Protect 182 / Reflect 115 / Light Screen 113) on either side and an ORDER consumer (the player's
Swift). Controls (ctl-*) replace the words unit by an allocator-net-zero non-words body of the same shape (Leer 43 / Sunny Day 241).
words57Probe.py's scenario machinery (base, explicit lab seed 305419897 = ISSUES #154, mon(), turn inputs: A, cursor step, A, idle) unchanged.

Per scenario TWO probes, each twice in separate fresh mGBA processes (tools/run-mgba-probe.py; exit 138 = the known teardown SIGBUS, output
complete), all four runs of a scenario in one batch:
  ord-<id>-A/B.json  tools/integration/prep46OrderRngProbe.py: per-frame sSpriteOrder + inUse + keys + gRng2Value (the occupancy proof);
  win-<id>-A/B.json  tools/integration/flat77Probe.py: every body's activation RAM + RGB888 frames (<out>/rgb-<id>-A/B) for the windows.
usage (from workspace/, PYTHONPATH = the libmgba-py checkout): reseed85Probe.py <out-dir> [--jobs J=16] [--only <id,...>]
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import words57Probe as W
from words57Probe import mon

PIDGEOTTO, DIGLETT, SNORLAX, LICKITUNG, CHIKORITA, MACHOKE, GRAVELER, POLIWAG, HORSEA = 18, 50, 143, 108, 152, 67, 75, 60, 116
SA, MS, RD, SD, SWIFT, LEER, PROTECT, REFLECT, LSCREEN = 28, 189, 240, 241, 129, 43, 182, 115, 113
BENCH_P = [mon(MACHOKE), mon(GRAVELER)]
PLAYER = [mon(SNORLAX, moves=(SWIFT,) * 4, speed_iv=0)] + BENCH_P  # slow (speed 35): the frail opponent lead acts first, Swift KOs it


def ply(move):  # the player's lead with the allocator consumer in slot 1 (turn 3: RIGHT)
    return [mon(SNORLAX, moves=(SWIFT, move, move, move), speed_iv=0)] + BENCH_P


def opp(lead, consumer_species, consumer_move):  # both bench slots hold the consumer mon: the Factory AI's send-out choice is that mon
    return [lead, mon(consumer_species, moves=(consumer_move,) * 4), mon(consumer_species, moves=(consumer_move,) * 4)]


# The KO's "fainted" text waits for an A press: turn 2's first A advances it (its other inputs are consumed), so the consumer turn is 3.
OPP_STEPS, PLY_STEPS = [None, None], [None, None, "RIGHT"]
# (id, words unit (or the control's body), side of the unit user, battle unit, player party, opponent party, turn cursor steps)
JOBS = [
    # opponent-side allocator consumer (the send-out mon); the player's Swift after a Reflect / Light Screen = order consumer
    ("sa-opp-pidgeotto-protect", SA, "opponent", "ko", PLAYER, opp(mon(PIDGEOTTO, 18, (SA,) * 4), LICKITUNG, PROTECT), OPP_STEPS),
    ("sa-opp-diglett-reflect", SA, "opponent", "ko", PLAYER, opp(mon(DIGLETT, 20, (SA,) * 4), CHIKORITA, REFLECT), OPP_STEPS),
    ("ms-opp-pidgeotto-lightscreen", MS, "opponent", "ko", PLAYER, opp(mon(PIDGEOTTO, 18, (MS,) * 4), CHIKORITA, LSCREEN), OPP_STEPS),
    ("ms-opp-diglett-protect", MS, "opponent", "ko", PLAYER, opp(mon(DIGLETT, 20, (MS,) * 4), LICKITUNG, PROTECT), OPP_STEPS),
    ("rd-opp-poliwag-reflect", RD, "opponent", "ko", PLAYER, opp(mon(POLIWAG, 18, (RD,) * 4), CHIKORITA, REFLECT), OPP_STEPS),
    ("rd-opp-horsea-protect", RD, "opponent", "ko", PLAYER, opp(mon(HORSEA, 22, (RD,) * 4), LICKITUNG, PROTECT), OPP_STEPS),
    # player-side allocator consumer
    ("sa-ply-snorlax-protect", SA, "opponent", "ko", ply(PROTECT), opp(mon(PIDGEOTTO, 18, (SA,) * 4), LICKITUNG, LEER), PLY_STEPS),
    ("ms-ply-snorlax-lightscreen", MS, "opponent", "ko", ply(LSCREEN), opp(mon(DIGLETT, 20, (MS,) * 4), LICKITUNG, LEER), PLY_STEPS),
    ("rd-ply-snorlax-reflect", RD, "opponent", "ko", ply(REFLECT), opp(mon(POLIWAG, 18, (RD,) * 4), LICKITUNG, LEER), PLY_STEPS),
    # controls: the same routes with a non-words allocator-net-zero body in place of the words unit
    ("ctl-leer-pidgeotto-protect", LEER, "opponent", "ko", PLAYER, opp(mon(PIDGEOTTO, 18, (LEER,) * 4), LICKITUNG, PROTECT), OPP_STEPS),
    ("ctl-leer-pidgeotto-lightscreen", LEER, "opponent", "ko", PLAYER, opp(mon(PIDGEOTTO, 18, (LEER,) * 4), CHIKORITA, LSCREEN), OPP_STEPS),
    ("ctl-sunny-poliwag-reflect", SD, "opponent", "ko", PLAYER, opp(mon(POLIWAG, 18, (SD,) * 4), CHIKORITA, REFLECT), OPP_STEPS),
    ("ctl-leer-snorlax-protect", LEER, "opponent", "ko", ply(PROTECT), opp(mon(PIDGEOTTO, 18, (LEER,) * 4), LICKITUNG, LEER), PLY_STEPS),
]


def run(args):
    out, job, kind, run_id = args
    ident, move = job[0], job[1]
    sc = out / "scenarios" / f"{ident}.json"
    dest = out / "raw" / f"{kind}-{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    probe = (["tools/integration/prep46OrderRngProbe.py", str(move), str(sc), str(dest)] if kind == "ord"
             else ["tools/integration/flat77Probe.py", str(sc), str(dest), str(out / f"rgb-{ident}-{run_id}")])
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, *probe],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return ident, kind, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 16
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        W.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, k, r) for j in selected for k in ("ord", "win") for r in ("A", "B")]))
    missing = [f"{k}-{i}-{r}" for i, k, r, ok in results if not ok]
    same = [f"{k}-{i}" for i, k, r, ok in results if r == "A" and ok
            and (out / "raw" / f"{k}-{i}-A.json").read_bytes() == (out / "raw" / f"{k}-{i}-B.json").read_bytes()]
    print(len(results), "probe runs;", "missing:", missing or "none", ";", len(same), "of", 2 * len(selected), "probe pairs A == B")
