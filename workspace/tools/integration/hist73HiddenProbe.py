#!/usr/bin/env python3
"""hist73 PART B: direct-mGBA sSpriteOrder / inUse / invisible-bit probes of a HIDDEN (Fly-charging) battler's faint and of a forced
send-out reshow while the opponent is hidden (docs/next-adapters-hist73.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout, the mGBA venv python): hist73HiddenProbe.py <out-dir> [--jobs J=10]
Every scenario is written from tools/battle-lab/prep11-fly-alt-swellow.json (mechanicLab, Scene ON, lab seed pinned: ISSUES #154)
with both leads replaced (species, level, IVs, EVs, four copies of one move, no item); benched members unchanged. Each runs twice in
separate fresh processes through tools/integration/hist73EventProbe.py (prep61EventProbe rows + per-frame invisible bits /
STATUS3_SEMI_INVULNERABLE bits) -> raw/<ident>-A.json / -B.json.
  hf-*  HIDDEN faint: the Fly user (L6 Swellow 305 / L5 Pidgeot 18, IVs/EVs 0 -> HP 23, floor(23/16) = 1) is badly poisoned by a
        faster L50 Onix's Toxic on a grounded (odd) turn; Toxic ticks 1,2,..,7 (cum 28 >= 23) KO it at the end of the 7th tick,
        an odd turn = a Fly CHARGE turn: the faint of the invisible battler (census battle 533's path: BattleScript_PoisonTurnDmg ->
        BattleScript_FaintAttacker while ON_AIR).
  vf-*  CONTROL, the same staging one level lower (L5 Swellow HP 21 / L4 Pidgeot HP 20): the KO lands on the 6th tick, an even
        (strike) turn: the faint of a VISIBLE battler.
  rs-*  RESHOW: a slower L50 Golem 76 uses Explosion 153 while the faster L50 Fly user charges (ON_AIR: the blast misses, Golem
        faints anyway) -> forced party menu (DOWN, A, A) -> reshow with the opponent hidden (census battle 713's shape).
Sides: "opp" = the Fly user is the opponent; "ply" = the player (the forced party menu inputs follow the faint).
"""
import copy, json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = Path("tools/battle-lab/prep11-fly-alt-swellow.json")
FLY, TOXIC, EXPLOSION, TACKLE = 19, 92, 153, 33
SWELLOW, PIDGEOT, ONIX, GOLEM = 305, 18, 95, 76
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
# playerfaint-protect-thunderbolt.json's forced-replacement inputs (message A presses, then DOWN to slot 1, A, A = SHIFT).
MENU = [s for _ in range(6) for s in ({"frames": 2, "buttons": ["A"]}, {"frames": 28, "buttons": []})] + [
    {"frames": 2, "buttons": ["A"]}, {"frames": 89, "buttons": []}, {"frames": 2, "buttons": ["DOWN"]}, {"frames": 28, "buttons": []},
    {"frames": 2, "buttons": ["A"]}, {"frames": 38, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 269, "buttons": []}]

# Reshow staging: the party menu opens ~40 frames after the 8th A (the faint / message presses); DOWN ~230 frames after it opens.
RS_MENU = [s for _ in range(7) for s in ({"frames": 2, "buttons": ["A"]}, {"frames": 28, "buttons": []})] + [
    {"frames": 2, "buttons": ["A"]}, {"frames": 270, "buttons": []}] + MENU[14:]


def mon(species, level, move, ivs):
    return {"species": species, "level": level, "nature": 0, "ivs": {k: ivs for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {k: 0 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}, "moves": [move] * 4,
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": False}


def job(ident, flyer_side, flyer, level, other, other_move, segments):
    return (ident, flyer_side, flyer, level, other, other_move, segments)


def toxic_turns(n_before, player_flyer):
    segs = [dict(s) for _ in range(n_before) for s in TURN]
    if player_flyer:
        segs += MENU
    return segs + [dict(s) for _ in range(2) for s in TURN] + [{"frames": 600, "buttons": []}]


JOBS = [
    job("hf-opp-swellow", "opponent", SWELLOW, 6, ONIX, TOXIC, toxic_turns(7, False)),
    job("hf-opp-pidgeot", "opponent", PIDGEOT, 5, ONIX, TOXIC, toxic_turns(7, False)),
    job("vf-opp-swellow", "opponent", SWELLOW, 5, ONIX, TOXIC, toxic_turns(6, False)),
    job("vf-opp-pidgeot", "opponent", PIDGEOT, 4, ONIX, TOXIC, toxic_turns(6, False)),
    job("hf-ply-swellow", "player", SWELLOW, 6, ONIX, TOXIC, toxic_turns(7, True)),
    job("hf-ply-pidgeot", "player", PIDGEOT, 5, ONIX, TOXIC, toxic_turns(7, True)),
    job("vf-ply-swellow", "player", SWELLOW, 5, ONIX, TOXIC, toxic_turns(6, True)),
    job("vf-ply-pidgeot", "player", PIDGEOT, 4, ONIX, TOXIC, toxic_turns(6, True)),
    # A first pass with MENU stayed in the menu (DOWN came before the menu was ready): RS_MENU.
    job("rs-opp-swellow", "opponent", SWELLOW, 50, GOLEM, EXPLOSION, [dict(s) for s in TURN[:3]] + [{"frames": 400, "buttons": []}] + RS_MENU
        + [dict(s) for _ in range(2) for s in TURN] + [{"frames": 600, "buttons": []}]),
    job("rs-opp-pidgeot", "opponent", PIDGEOT, 50, GOLEM, EXPLOSION, [dict(s) for s in TURN[:3]] + [{"frames": 400, "buttons": []}] + RS_MENU
        + [dict(s) for _ in range(2) for s in TURN] + [{"frames": 600, "buttons": []}]),
]


def scenario(out: Path, j) -> Path:
    ident, flyer_side, flyer, level, other, other_move, segments = j
    data = json.loads(BASE.read_text())
    parties = data["overrides"]["parties"]
    other_side = "player" if flyer_side == "opponent" else "opponent"
    parties[flyer_side][0] = mon(flyer, level, FLY, 31 if level == 50 else 0)
    parties[other_side][0] = mon(other, 50, other_move, 31 if other != GOLEM else 0)
    data["trace"] = {"segments": copy.deepcopy(segments), "captureFrames": [0]}
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, j, run_id = args
    sc = scenario(out, j)
    dest = out / "raw" / f"{j[0]}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/hist73EventProbe.py",
                    str(FLY), str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return j[0], run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    n = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 10
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    jobs = [j for j in JOBS if only is None or j[0] in only]
    for j in jobs:
        scenario(out, j)
    with ThreadPoolExecutor(n) as ex:
        results = list(ex.map(run, [(out, j, r) for j in jobs for r in ("A", "B")]))
    print(len(results), "probe runs;", "missing:", [f"{i}-{r}" for i, r, ok in results if not ok] or "none")
