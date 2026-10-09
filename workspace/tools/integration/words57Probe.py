#!/usr/bin/env python3
"""words57 direct-mGBA probes: a words-dependent order unit (Sand-Attack 28, Mud-Slap 189, Rain Dance 240 + RAIN_CONTINUES) followed by
a BATTLE unit (an opponent KO + next-mon summary + send-out, a Roar / Whirlwind forced switch-out + send-in) and then a consumer body
(docs/next-adapters-words57.md). Per-frame sSpriteOrder + gRng2Value through tools/integration/prep46OrderRngProbe.py (unchanged).
Never the HTTP oracles.

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): words57Probe.py <out-dir> [--jobs J=16] [--only <id,...>]
Every job runs twice in separate fresh mGBA processes (tools/run-mgba-probe.py; exit 138 = the known teardown SIGBUS, output complete)
-> <out-dir>/raw/<id>-A.json / -B.json. Scenarios are complete Mechanics Lab parties (overrides.parties) with an explicit lab seed
(ISSUES #154), written to <out-dir>/scenarios/<id>.json. Turn inputs pick the move slot from the remembered cursor (A, RIGHT/LEFT, A).
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = Path("tools/battle-lab/mechanic-sand-attack-pidgeotto-onix.json")
LAB_SEED = 305419897
IDLE = 2400
# species ids
PIDGEOTTO, SANDSHREW, WOOPER, SNORLAX, SLOWPOKE, ONIX, LICKITUNG, CHIKORITA, SUNKERN, HOUNDOUR, MACHOKE, GRAVELER = (
    18, 27, 194, 143, 79, 95, 108, 152, 191, 228, 67, 75)
MR_MIME, ELECTRODE, LAPRAS = 122, 101, 131  # Mr. Mime / Electrode ability slot 0 = Soundproof (Perish Song does not affect them)
# moves
SA, MS, RD, SD, SWIFT, TACKLE, ROAR, WHIRLWIND, PERISH = 28, 189, 240, 241, 129, 33, 46, 18, 195


def mon(species, level=50, moves=(TACKLE,) * 4, speed_iv=31):
    ivs = {"hp": 31, "attack": 31, "defense": 31, "speed": speed_iv, "spAttack": 31, "spDefense": 31}
    return {"species": species, "level": level, "moves": list(moves), "ivs": ivs}


BENCH_P = [mon(MACHOKE), mon(GRAVELER)]
BENCH_O = [mon(LICKITUNG), mon(ONIX)]


def turn(step=None):
    """One FIGHT turn: A (fight menu), optional cursor step (RIGHT / LEFT), A (move), idle."""
    segs = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
    if step:
        segs += [{"frames": 2, "buttons": [step]}, {"frames": 20, "buttons": []}]
    return segs + [{"frames": 2, "buttons": ["A"]}, {"frames": IDLE, "buttons": []}]


# (id, words unit, side of the words user, battle unit, player party, opponent party, turn cursor steps)
JOBS = [
    # words unit (player) -> next turn Swift KO -> opponent faint + summary + send-out -> consumer
    ("ko-sa-ply-pidgeotto", 28, "player", "ko", [mon(PIDGEOTTO, moves=(SA, SWIFT, SWIFT, SWIFT))] + BENCH_P,
     [mon(ONIX, 5)] + BENCH_O, [None, "RIGHT", None]),
    ("ko-sa-ply-sandshrew", 28, "player", "ko", [mon(SANDSHREW, moves=(SA, SWIFT, SWIFT, SWIFT))] + BENCH_P,
     [mon(LICKITUNG, 5)] + [mon(ONIX), mon(SNORLAX)], [None, "RIGHT", None]),
    ("ko-ms-ply-pidgeotto", 189, "player", "ko", [mon(PIDGEOTTO, moves=(MS, SWIFT, SWIFT, SWIFT))] + BENCH_P,
     [mon(SUNKERN, 10)] + BENCH_O, [None, "RIGHT", None]),
    ("ko-ms-ply-wooper", 189, "player", "ko", [mon(WOOPER, moves=(MS, SWIFT, SWIFT, SWIFT))] + BENCH_P,
     [mon(CHIKORITA, 10)] + [mon(ONIX), mon(SNORLAX)], [None, "RIGHT", None]),
    # words unit (opponent, faster and frail) -> the slower player's Swift KO in the same turn -> faint + summary + send-out -> consumer
    ("ko-sa-opp-pidgeotto", 28, "opponent", "ko", [mon(SNORLAX, moves=(SWIFT,) * 4, speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (SA,) * 4)] + BENCH_O, [None, None]),
    ("ko-sa-opp-sandshrew", 28, "opponent", "ko", [mon(SLOWPOKE, moves=(SWIFT,) * 4, speed_iv=0)] + BENCH_P,
     [mon(SANDSHREW, 20, (SA,) * 4)] + [mon(ONIX), mon(SNORLAX)], [None, None]),
    ("ko-ms-opp-pidgeotto", 189, "opponent", "ko", [mon(SNORLAX, moves=(SWIFT,) * 4, speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (MS,) * 4)] + BENCH_O, [None, None]),
    ("ko-ms-opp-sandshrew", 189, "opponent", "ko", [mon(SLOWPOKE, moves=(SWIFT,) * 4, speed_iv=0)] + BENCH_P,
     [mon(SANDSHREW, 20, (MS,) * 4)] + [mon(ONIX), mon(SNORLAX)], [None, None]),
    # words unit -> Roar / Whirlwind forced switch-out (priority -6) + send-in -> consumer
    ("fs-sa-ply-roar", 28, "player", "forced-opponent", [mon(PIDGEOTTO, moves=(SA, ROAR, ROAR, ROAR))] + BENCH_P,
     [mon(ONIX)] + BENCH_O, [None, "RIGHT", None]),
    ("fs-ms-ply-roar", 189, "player", "forced-opponent", [mon(WOOPER, moves=(MS, ROAR, ROAR, ROAR))] + BENCH_P,
     [mon(SNORLAX)] + [mon(LICKITUNG), mon(ONIX)], [None, "RIGHT", None]),
    ("fs-sa-opp-whirlwind", 28, "opponent", "forced-opponent", [mon(SNORLAX, moves=(WHIRLWIND,) * 4)] + BENCH_P,
     [mon(PIDGEOTTO, moves=(SA,) * 4)] + BENCH_O, [None, None]),
    ("fs-ms-opp-whirlwind", 189, "opponent", "forced-opponent", [mon(SLOWPOKE, moves=(WHIRLWIND,) * 4)] + BENCH_P,
     [mon(SANDSHREW, moves=(MS,) * 4)] + [mon(ONIX), mon(SNORLAX)], [None, None]),
    ("fs-sa-ply-roared", 28, "player", "forced-player", [mon(PIDGEOTTO, moves=(SA,) * 4)] + BENCH_P,
     [mon(HOUNDOUR, moves=(ROAR,) * 4)] + BENCH_O, [None, None]),
    ("fs-ms-ply-roared", 189, "player", "forced-player", [mon(WOOPER, moves=(MS,) * 4)] + BENCH_P,
     [mon(HOUNDOUR, moves=(ROAR,) * 4)] + [mon(ONIX), mon(SNORLAX)], [None, None]),
    # Rain Dance (player) with the faster opponent's Sunny Day: RAIN_CONTINUES at the end of turn 1; turn 2 Sunny Day replaces the rain, the
    # player's Swift KOs, SUN_CONTINUES, summary + send-out -> consumer (the RAIN_CONTINUES marker's units hold the KO chain)
    # words unit -> the Factory AI's voluntary recall (ShouldSwitchIfPerishSong: the AI active's perish timer 0 at the turn-4 command
    # boundary; the Soundproof player is unaffected) + summary + send-out -> consumer (the player's turn-4 body)
    ("ai-sa-ply-mrmime", 28, "player", "ai-switch", [mon(MR_MIME, moves=(PERISH, SA, SA, SA))] + BENCH_P,
     [mon(SNORLAX)] + BENCH_O, [None, "RIGHT", None, None]),
    ("ai-ms-ply-electrode", 189, "player", "ai-switch", [mon(ELECTRODE, moves=(PERISH, MS, MS, MS))] + BENCH_P,
     [mon(LAPRAS)] + [mon(ONIX), mon(SNORLAX)], [None, "RIGHT", None, None]),
    ("ai-sa-opp-snorlax", 28, "opponent", "ai-switch", [mon(MR_MIME, moves=(PERISH, SWIFT, SWIFT, SWIFT))] + BENCH_P,
     [mon(SNORLAX, moves=(SA,) * 4)] + BENCH_O, [None, "RIGHT", None, None]),
    ("ai-ms-opp-lapras", 189, "opponent", "ai-switch", [mon(ELECTRODE, moves=(PERISH, SWIFT, SWIFT, SWIFT))] + BENCH_P,
     [mon(LAPRAS, moves=(MS,) * 4)] + [mon(ONIX), mon(SNORLAX)], [None, "RIGHT", None, None]),
    # Rain Dance -> RAIN_CONTINUES, then a battler replacement without a KO: the player's Roar (turn 2), the opponent's Whirlwind on the
    # rain user (turn 1, priority -6), the Factory AI's perish recall (turn 4) -> consumer
    ("rain-roar-snorlax", 240, "player", "forced-opponent", [mon(SNORLAX, moves=(RD, ROAR, ROAR, ROAR))] + BENCH_P,
     [mon(ONIX)] + BENCH_O, [None, "RIGHT", None]),
    ("rain-whirlwinded-slowpoke", 240, "player", "forced-player", [mon(SLOWPOKE, moves=(RD,) * 4)] + BENCH_P,
     [mon(PIDGEOTTO, moves=(WHIRLWIND,) * 4)] + [mon(ONIX), mon(SNORLAX)], [None, None]),
    ("rain-ai-mrmime", 240, "player", "ai-switch", [mon(MR_MIME, moves=(PERISH, RD, SWIFT, SWIFT))] + BENCH_P,
     [mon(SNORLAX)] + BENCH_O, [None, "RIGHT", "DOWN", None]),
    ("rain-sun-ko-snorlax", 240, "player", "ko", [mon(SNORLAX, moves=(RD, SWIFT, SWIFT, SWIFT), speed_iv=0)] + BENCH_P,
     [mon(PIDGEOTTO, 18, (SD,) * 4)] + BENCH_O, [None, "RIGHT", None]),
    # Rain Dance (player) -> RAIN_CONTINUES; turn 2 Swift KO + summary + send-out, then RAIN_CONTINUES again (its activation = the first
    # marker's chain through the KO) -> consumer
    ("rain-ko-slowpoke", 240, "player", "ko", [mon(SLOWPOKE, moves=(RD, SWIFT, SWIFT, SWIFT), speed_iv=0)] + BENCH_P,
     [mon(SANDSHREW, 20)] + [mon(ONIX), mon(SNORLAX)], [None, "RIGHT", None]),
]


def scenario(out: Path, job) -> Path:
    ident, _, _, _, player, opponent, steps = job
    data = json.loads(BASE.read_text())
    data["seed"] = LAB_SEED
    data["overrides"] = {"parties": {"player": player, "opponent": opponent}}
    data["trace"] = {"segments": [seg for step in [*steps, None] for seg in turn(step)]}
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    ident, move = job[0], job[1]
    sc = scenario(out, job)
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
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 16
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    same = [i for i, r, ok in results if r == "A" and ok and (out / "raw" / f"{i}-A.json").read_bytes() == (out / "raw" / f"{i}-B.json").read_bytes()]
    print(len(results), "probe runs;", "missing:", missing or "none", ";", len(same), "of", len(selected), "jobs A == B")
