#!/usr/bin/env python3
"""gdgeo direct-mGBA sSpriteOrder probes: the Giga Drain body (202) over a species-pair grid (docs/giga-drain-geometry-order.md).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): gdgeoProbe.py <out-dir> [--jobs J=12] [--md]
(--md: the Mega Drain (72) job set MD_JOBS / MD_PREDICTED instead of the Giga Drain grid)
Each job = the prep43 Giga Drain BattleLab scenario of the attacker side with BOTH lead species replaced (player lead, opponent lead;
moves, items and everything else unchanged), written to <out-dir>/scenarios/<id>.json; every job runs twice in separate fresh mGBA
processes (tools/compare/spriteOrderEventProbe.py through tools/run-mgba-probe.py) -> <out-dir>/raw/<id>-A.json / -B.json, exactly as
prep43Probe.py. `PREDICTED` is the model's plan class written BEFORE the probes ran (gdgeoModelCheck.ts compares).
Same JOBS / scenario() interface as prep43Probe.py, so prep43Extract.units_of can read these jobs (gdgeoExtract.py).
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path("tools/battle-lab")
PLY = "mechanic-giga-drain-player-roselia-opponent-onix"
OPP = "mechanic-giga-drain-opponent-roselia-player-onix"
# species ids (include/constants/species.h)
ROSELIA, ONIX, GYARADOS, MAGIKARP, SHUCKLE, GOLBAT, WOBBUFFET, DIGLETT, FLYGON, BULBASAUR, SNORLAX, ZANGOOSE = \
    363, 95, 130, 129, 213, 42, 202, 50, 334, 1, 143, 380
# (unit, id, move, base scenario, ("both", player lead, opponent lead)); comment = Y_PIC_OFFSET player / opponent, d = difference
JOBS = [
    # player attacker (attacker = player lead): the model flips the window-18 pair exactly at d = 48
    ("GD", "gdg-ply-roselia-onix", 202, PLY, ("both", ROSELIA, ONIX)),          # 96 / 42, d 54
    ("GD", "gdg-ply-roselia-gyarados", 202, PLY, ("both", ROSELIA, GYARADOS)),  # 96 / 48, d 48 FLIP
    ("GD", "gdg-ply-magikarp-shuckle", 202, PLY, ("both", MAGIKARP, SHUCKLE)),  # 97 / 49, d 48 FLIP
    ("GD", "gdg-ply-golbat-wobbuffet", 202, PLY, ("both", GOLBAT, WOBBUFFET)),  # 94 / 46, d 48 FLIP
    ("GD", "gdg-ply-roselia-shuckle", 202, PLY, ("both", ROSELIA, SHUCKLE)),    # 96 / 49, d 47
    ("GD", "gdg-ply-magikarp-gyarados", 202, PLY, ("both", MAGIKARP, GYARADOS)),  # 97 / 48, d 49
    ("GD", "gdg-ply-diglett-diglett", 202, PLY, ("both", DIGLETT, DIGLETT)),    # 104 / 58, d 46
    ("GD", "gdg-ply-onix-flygon", 202, PLY, ("both", ONIX, FLYGON)),            # 88 / 34 (elevated), d 54
    ("GD", "gdg-ply-onix-golbat", 202, PLY, ("both", ONIX, GOLBAT)),            # 88 / 35 (elevated), d 53
    ("GD", "gdg-ply-bulbasaur-flygon", 202, PLY, ("both", BULBASAUR, FLYGON)),  # 104 / 34, d 70
    ("GD", "gdg-ply-snorlax-diglett", 202, PLY, ("both", SNORLAX, DIGLETT)),    # 99 / 58, d 41
    ("GD", "gdg-ply-onix-diglett", 202, PLY, ("both", ONIX, DIGLETT)),          # 88 / 58, d 30
    # opponent attacker (attacker = opponent lead): the model flips at d in {27,30,37,38,44,45,52,55,62,63,69,70}
    ("GD", "gdg-opp-diglett-onix", 202, OPP, ("both", ONIX, DIGLETT)),          # 88 / 58, d 30 FLIP (prep43)
    ("GD", "gdg-opp-roselia-onix", 202, OPP, ("both", ONIX, ROSELIA)),          # 88 / 48, d 40
    ("GD", "gdg-opp-roselia-wobbuffet", 202, OPP, ("both", WOBBUFFET, ROSELIA)),  # 100 / 48, d 52 FLIP
    ("GD", "gdg-opp-shuckle-golbat", 202, OPP, ("both", GOLBAT, SHUCKLE)),      # 94 / 49, d 45 FLIP
    ("GD", "gdg-opp-onix-diglett", 202, OPP, ("both", DIGLETT, ONIX)),          # 104 / 42, d 62 FLIP
    ("GD", "gdg-opp-flygon-bulbasaur", 202, OPP, ("both", BULBASAUR, FLYGON)),  # 104 / 34 (elevated), d 70 FLIP
    ("GD", "gdg-opp-snorlax-zangoose", 202, OPP, ("both", ZANGOOSE, SNORLAX)),  # 89 / 45, d 44 FLIP
    ("GD", "gdg-opp-roselia-snorlax", 202, OPP, ("both", SNORLAX, ROSELIA)),    # 99 / 48, d 51
    ("GD", "gdg-opp-golbat-onix", 202, OPP, ("both", ONIX, GOLBAT)),            # 88 / 35 (elevated), d 53
    ("GD", "gdg-opp-flygon-onix", 202, OPP, ("both", ONIX, FLYGON)),            # 88 / 34 (elevated), d 54
    ("GD", "gdg-opp-diglett-golbat", 202, OPP, ("both", GOLBAT, DIGLETT)),      # 94 / 58, d 36
    ("GD", "gdg-opp-bulbasaur-bulbasaur", 202, OPP, ("both", BULBASAUR, BULBASAUR)),  # 104 / 54, d 50
]
# Mega Drain (72), the same orb family (MegaDrainAbsorbEffect): its same-frame orb pair (plan n5 / n6, end age 95) per the model
MPLY = "mechanic-mega-drain-player-skiploom-opponent-onix"
MOPP = "mechanic-mega-drain-opponent-skiploom-player-onix"
SKIPLOOM, SKARMORY = 188, 227
MD_JOBS = [
    ("MD", "mdg-ply-skiploom-onix", 72, MPLY, ("both", SKIPLOOM, ONIX)),        # 101 / 42 (elevated 12 opp. is the target), d 59
    ("MD", "mdg-ply-roselia-gyarados", 72, MPLY, ("both", ROSELIA, GYARADOS)),  # 96 / 48, d 48
    ("MD", "mdg-ply-magikarp-shuckle", 72, MPLY, ("both", MAGIKARP, SHUCKLE)),  # 97 / 49, d 48
    ("MD", "mdg-ply-roselia-shuckle", 72, MPLY, ("both", ROSELIA, SHUCKLE)),    # 96 / 49, d 47
    ("MD", "mdg-ply-onix-flygon", 72, MPLY, ("both", ONIX, FLYGON)),            # 88 / 34, d 54
    ("MD", "mdg-ply-diglett-diglett", 72, MPLY, ("both", DIGLETT, DIGLETT)),    # 104 / 58, d 46
    ("MD", "mdg-opp-skiploom-onix", 72, MOPP, ("both", ONIX, SKIPLOOM)),        # 88 / 43 (elevated), d 45
    ("MD", "mdg-opp-roselia-onix", 72, MOPP, ("both", ONIX, ROSELIA)),          # 88 / 48, d 40
    ("MD", "mdg-opp-diglett-onix", 72, MOPP, ("both", ONIX, DIGLETT)),          # 88 / 58, d 30
    ("MD", "mdg-opp-bulbasaur-bulbasaur", 72, MOPP, ("both", BULBASAUR, BULBASAUR)),  # 104 / 54, d 50
    ("MD", "mdg-opp-shuckle-roselia", 72, MOPP, ("both", ROSELIA, SHUCKLE)),    # 96 / 49, d 47
    ("MD", "mdg-opp-skarmory-diglett", 72, MOPP, ("both", DIGLETT, SKARMORY)),  # 104 / 40, d 64
    ("MD", "mdg-opp-golbat-onix", 72, MOPP, ("both", ONIX, GOLBAT)),            # 88 / 35 (elevated), d 53
    ("MD", "mdg-opp-flygon-bulbasaur", 72, MOPP, ("both", BULBASAUR, FLYGON)),  # 104 / 34 (elevated), d 70
]
_MD_NEWER = ("mdg-ply-roselia-gyarados", "mdg-ply-magikarp-shuckle", "mdg-opp-skiploom-onix", "mdg-opp-diglett-onix",
             "mdg-opp-golbat-onix", "mdg-opp-flygon-bulbasaur")
MD_PREDICTED = {j[1]: ("newer-first (D6,5)" if j[1] in _MD_NEWER else "older-first (D5,6)") for j in MD_JOBS}
_MAJ = "majority"
_FLIP = "flip window 18 (D9,7)"
PREDICTED = {j[1]: (_FLIP if any(s in j[1] for s in ("roselia-gyarados", "magikarp-shuckle", "golbat-wobbuffet", "opp-diglett-onix",
             "roselia-wobbuffet", "shuckle-golbat", "opp-onix-diglett", "flygon-bulbasaur", "snorlax-zangoose")) else _MAJ) for j in JOBS}


def scenario(out: Path, job) -> Path:
    _, ident, _, base, variant = job
    data = json.loads((LAB / f"{base}.json").read_text())
    _, player, opponent = variant
    data["overrides"]["parties"]["player"][0]["species"] = player
    data["overrides"]["parties"]["opponent"][0]["species"] = opponent
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    _, ident, move, _, _ = job
    sc = scenario(out, job)
    dest = out / "raw" / f"{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/compare/spriteOrderEventProbe.py",
                    str(move), str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return ident, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    selected = MD_JOBS if "--md" in argv else JOBS
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
