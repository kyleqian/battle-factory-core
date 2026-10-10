#!/usr/bin/env python3
"""prep61 direct-mGBA sSpriteOrder probes of the semi-invulnerable two-turn units: Fly 19, Bounce 340, Dive 291
(docs/next-adapters-prep61.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep61Probe.py <out-dir> [--jobs J=12] [--only <unit,...>]
Job format = plans48Probe.py's (unit, id, move, base scenario, ops). ops (in order): ("seed", n) the lab seed (ISSUES #154: every job pins
it); ("swap",) swaps the parties-format scenario's player / opponent parties (the attacker changes side; the trace's FIGHT -> first move
input then drives the other lead); ("species", side, sp) / ("moves", side, mv) / ("turns", N) / ("extend", N) as plans48Probe.scenario.
Every job runs twice in separate fresh mGBA processes through tools/integration/prep61EventProbe.py (spriteOrderEventProbe.py's rows
plus the per-frame gAnimMoveTurn / battler-sprite invisible / STATUS3_SEMI_INVULNERABLE / gRng2Value extra list) ->
raw/<id>-A.json / -B.json. Battle-lab species are INTERNAL ids (SWELLOW 305; Gen 1 / 2 ids are national).
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import plans48Probe as P48


def scenario(out: Path, job) -> Path:
    unit, ident, move, base, ops = job
    swap = [o for o in ops if o[0] == "swap"]
    rest = tuple(o for o in ops if o[0] != "swap")
    path = P48.scenario(out, (unit, ident, move, base, rest))
    if swap:
        data = json.loads(path.read_text())
        parties = data["overrides"]["parties"]
        parties["player"], parties["opponent"] = parties["opponent"], parties["player"]
        path.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return path


P43.scenario = scenario  # prep43Extract resolves the scenario through prep43Probe's module global

# Fly 19: SWELLOW 305 (prep11-fly-alt-swellow, parties format, player Fly vs ONIX 95 Tackle) and PIDGEOT 18; the opponent side by "swap"
# (ONIX's Tackle then misses the airborne Fly user: no attack animation). Gust 16 hits an ON_AIR target (the defender's moves = Gust):
# the hit animation on the hidden battler. One more turn after the unleash.
FL = "prep11-fly-alt-swellow"
SF = ("seed", 305419897)
JOBS = [("FLY", f"fly-ply-{a}", 19, FL, (SF, ("species", "player", a), ("turns", 1))) for a in (305, 18)]
JOBS += [("FLY", f"fly-opp-{a}", 19, FL, (SF, ("species", "player", a), ("turns", 1), ("swap",))) for a in (305, 18)]
JOBS += [("FLY", "fly-ply-305-gust", 19, FL, (SF, ("moves", "opponent", 16), ("turns", 1))),
         ("FLY", "fly-opp-305-gust", 19, FL, (SF, ("moves", "opponent", 16), ("turns", 1), ("swap",)))]
# Bounce 340: PONYTA 77 (prep11-bounce-alt-ponyta) and RAPIDASH 78; Gust vs the ON_AIR Bounce user as for Fly.
BO = "prep11-bounce-alt-ponyta"
SB = ("seed", 305419896)
JOBS += [("BOUNCE", f"bounce-ply-{a}", 340, BO, (SB, ("species", "player", a), ("turns", 1))) for a in (77, 78)]
JOBS += [("BOUNCE", f"bounce-opp-{a}", 340, BO, (SB, ("species", "player", a), ("turns", 1), ("swap",))) for a in (77, 78)]
JOBS += [("BOUNCE", "bounce-ply-77-gust", 340, BO, (SB, ("moves", "opponent", 16), ("turns", 1))),
         ("BOUNCE", "bounce-opp-77-gust", 340, BO, (SB, ("moves", "opponent", 16), ("turns", 1), ("swap",)))]
# Dive 291: CHINCHOU 170 / LANTURN 171 (mechanic-dive-* / prep25-dive-alt-*: both sides as separate scenarios, ONIX / GOLEM Tackle);
# Surf 57 hits an UNDERWATER target (the defender's moves = Surf).
SD = ("seed", 305420547)
JOBS += [("DIVE", "dive-ply-170", 291, "mechanic-dive-player-chinchou-opponent-onix", (SD,)),
         ("DIVE", "dive-ply-171", 291, "prep25-dive-alt-player-lanturn-golem", (SD,)),
         ("DIVE", "dive-opp-170", 291, "mechanic-dive-opponent-chinchou-player-onix", (SD,)),
         ("DIVE", "dive-opp-171", 291, "prep25-dive-alt-opponent-lanturn-golem", (SD,)),
         ("DIVE", "dive-ply-170-surf", 291, "mechanic-dive-player-chinchou-opponent-onix", (SD, ("moves", "opponent", 57))),
         ("DIVE", "dive-opp-170-surf", 291, "mechanic-dive-opponent-chinchou-player-onix", (SD, ("moves", "player", 57)))]
# HIDDENHIT: the moves that hit a semi-invulnerable target with an existing production plan (the census's Sky Uppercut on a hidden Fly user,
# battle 81), so the table plan of the other battler's body is checked with the target invisible: Sky Uppercut 327 vs Fly, Twister 239
# vs Bounce, Whirlpool 250 vs Dive (the defender's moves; the opponent side by "swap" / the opponent-Dive scenario).
JOBS += [("HIDDENHIT", "fly-ply-305-skyup", 19, FL, (SF, ("moves", "opponent", 327), ("turns", 1))),
         ("HIDDENHIT", "fly-opp-305-skyup", 19, FL, (SF, ("moves", "opponent", 327), ("turns", 1), ("swap",))),
         ("HIDDENHIT", "bounce-ply-77-twister", 340, BO, (SB, ("moves", "opponent", 239), ("turns", 1))),
         ("HIDDENHIT", "bounce-opp-77-twister", 340, BO, (SB, ("moves", "opponent", 239), ("turns", 1), ("swap",))),
         ("HIDDENHIT", "dive-ply-170-whirlpool", 291, "mechanic-dive-player-chinchou-opponent-onix", (SD, ("moves", "opponent", 250))),
         ("HIDDENHIT", "dive-opp-170-whirlpool", 291, "mechanic-dive-opponent-chinchou-player-onix", (SD, ("moves", "player", 250)))]
P43.JOBS = JOBS  # prep43Extract.units_of looks the job up in prep43Probe.JOBS


def run(args):
    out, job, run_id = args
    _, ident, move, _, _ = job
    sc = out / "scenarios" / f"{ident}.json"  # written once by main before the runs (A and B share it; no concurrent rewrite)
    dest = out / "raw" / f"{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/prep61EventProbe.py",
                    str(move), str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return ident, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
