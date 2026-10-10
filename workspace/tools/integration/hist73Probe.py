#!/usr/bin/env python3
"""hist73: allocator net-zero probes for the greedy chain units of docs/next-adapters-hist73.md (a copy of prep52Probe.py with a
new UNITS list; direct mGBA only, never the HTTP oracles).

usage: hist73Probe.py <out-dir> [--jobs J=10] [--only <unit,...>]
UNITS = (unit, key, [scenario jobs]) in the census's greedy order (fixtures/hist73/chains-before-seeds0-999.json); key = a move id
(bodies with sAnimMoveIndex == id) or a script label (status / general animations launch with sAnimMoveIndex 0). A scenario job =
(ident, base, variant): an existing tools/battle-lab scenario, or a variant written to <out-dir>/scenarios/<ident>.json:
("turns", N, ...) appends N more FIGHT -> first-move turns (prep45's TURN); ("extend", N, ...) appends N idle frames; (side,
species) replaces that side's party lead species (overrides.parties); ("moves", side, id) gives that side's lead four copies of
move id; ("seed", N) replaces the battle-lab seed. Every scenario runs twice in separate fresh processes
(tools/integration/prep52NetZeroProbe.py through tools/run-mgba-probe.py) -> <out-dir>/raw/<ident>-A.json / -B.json.
Needs PYTHONPATH=<vendor>/libmgba-py and the mGBA venv python.
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path("tools/battle-lab")
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
SNORLAX, GOLBAT = 143, 42


def mech(slug, a, b):  # the accepted mechanic-<slug> pair: attacker a on each side vs b
    return [(f"{slug}-ply", f"mechanic-{slug}-player-{a}-opponent-{b}", None), (f"{slug}-opp", f"mechanic-{slug}-opponent-{a}-player-{b}", None)]


SNORLAX_ALT = 143


def pair(slug, ident, a_ply, b_ply, a_opp=None, b_opp=None, extra=None, alt=SNORLAX):
    """The accepted Scene ON mechanic pair (attacker on each side) plus the same two with the DEFENDER's lead species replaced (alt)."""
    a_opp, b_opp = a_opp or a_ply, b_opp or b_ply
    ply, opp = f"mechanic-{slug}-player-{a_ply}-opponent-{b_ply}", f"mechanic-{slug}-opponent-{a_opp}-player-{b_opp}"
    x = tuple(extra or ())
    return [(f"{ident}-ply", ply, x or None), (f"{ident}-opp", opp, x or None),
            (f"{ident}-ply-alt", ply, x + ("opponent", alt)), (f"{ident}-opp-alt", opp, x + ("player", alt))]


def given(ident, move, extra=()):
    """No Scene ON scenario for this move: the lead gets four copies of it (prep52's ("moves", side, id)) on two neutral pairs
    (Murkrow vs Onix, Eevee vs Onix; both orientations)."""
    x = tuple(extra)
    return [(f"{ident}-ply-murkrow", "mechanic-perish-song-player-murkrow-opponent-onix", ("moves", "player", move) + x),
            (f"{ident}-opp-murkrow", "mechanic-perish-song-opponent-murkrow-player-onix", ("moves", "opponent", move) + x),
            (f"{ident}-ply-eevee", "mechanic-attract-player-eevee-opponent-onix", ("moves", "player", move) + x),
            (f"{ident}-opp-eevee", "mechanic-attract-opponent-eevee-player-onix", ("moves", "opponent", move) + x)]


UNITS = [
    # Greedy order of fixtures/hist73/chains-before-seeds0-999.json (master ff4baec48). Fury Cutter: 3 more turns so the
    # furyCutterCounter branches 1..4 (FuryCutterContinue2 / Medium / Strong / Strongest) all run.
    ("FURY CUTTER", 210, pair("fury-cutter", "fc", "grovyle", "blissey", extra=("turns", 3))),
    ("PSYWAVE", 149, pair("psywave", "pw", "spoink", "onix", "chimecho", "onix")),
    # Curse: the stat branch (non-Ghost user) and the Ghost branch (Move_CURSE: AnimTask_IsAttackerGhost -> CurseGhost).
    ("CURSE", 174, pair("curse-stat", "cs", "snorlax", "magikarp", alt=GOLBAT) + pair("curse-ghost", "cg", "haunter", "magikarp")),
    ("FEATHERDANCE", 297, given("fd", 297)),
    ("SILVER WIND", 318, pair("silver-wind", "sw", "butterfree", "onix")),
    ("HEAL BELL", 215, pair("heal-bell", "hb", "chimecho", "onix")),
    ("SWEET SCENT", 230, pair("sweet-scent", "ss", "weepinbell", "onix")),
    # Magnitude: both script branches (AnimTask_IsPowerOver99: regular / MagnitudeIntense), two attacker species.
    ("MAGNITUDE", 222, pair("magnitude-regular", "mr", "graveler", "onix")[:2] + pair("magnitude-intense", "mi", "camerupt", "onix")[:2]
     + pair("magnitude-regular", "mr", "graveler", "onix")[2:]),
    ("METEOR MASH", 309, pair("meteor-mash", "mm", "metang", "onix", extra=("turns", 1))),  # +1 turn: the 85 % move missed once
    ("TRI ATTACK", 161, pair("tri-attack", "ta", "porygon", "shuckle")),
    # Softboiled / Endeavor fail at full HP (no body): one more turn so the user has taken a hit first.
    ("SOFTBOILED", 135, given("sb", 135, ("turns", 2))),
    ("TRICK", 271, given("tr", 271)),
    ("SUBSTITUTE", 164, pair("substitute", "su", "golem", "onix")),
    ("GRUDGE", 288, pair("grudge", "gr", "haunter", "onix")),
    ("THRASH", 37, pair("thrash", "th", "tauros", "onix", extra=("turns", 2))),
    ("EXTRASENSORY", 326, pair("extrasensory", "ex", "nuzleaf", "shuckle")),
    ("SLEEP TALK", 214, pair("sleep-talk", "st", "seaking", "onix")),
    ("DESTINY BOND", 194, pair("destiny-bond", "db", "wobbuffet", "onix")),
    ("MUDDY WATER", 330, pair("muddy-water", "mw", "marshtomp", "onix")),
    ("CRABHAMMER", 152, pair("crabhammer", "ch", "krabby", "onix")),
    ("ASTONISH", 310, pair("astonish", "as", "loudred", "onix", alt=GOLBAT)),  # Ghost move: no body vs a Normal-type Snorlax
    ("WATER SPOUT", 323, pair("water-spout", "ws", "wailmer", "shuckle")),
    ("OCTAZOOKA", 190, pair("octazooka", "oz", "octillery", "onix")),
    ("GLARE", 137, pair("glare", "gl", "dunsparce", "shuckle")),
    ("SKY UPPERCUT", 327, pair("sky-uppercut", "su2", "hitmonchan", "onix")),
    ("DRAGON DANCE", 349, pair("dragon-dance", "dd", "dragonair", "onix")),
    ("FLATTER", 260, pair("flatter", "fl", "nidorina", "onix")),
    ("DIZZY PUNCH", 146, pair("dizzy-punch", "dp", "spinda", "onix")),
    ("SIGNAL BEAM", 324, pair("signal-beam", "sb2", "ariados", "chansey")),
    ("TEETER DANCE", 298, given("td", 298)),
    ("RETURN", 216, pair("return", "re", "dragonair", "onix")),
    ("REVENGE", 279, pair("revenge", "rv", "machamp", "shuckle", "qwilfish", "shuckle")),
    ("ROCK BLAST", 350, pair("rock-blast", "rb", "rhyhorn", "shuckle", extra=("turns", 1))),  # +1 turn: the 80 % move missed once
    ("ENDEAVOR", 283, given("en", 283, ("turns", 4))),  # Endeavor fails while the user's HP >= the target's
    ("SKILL SWAP", 285, pair("skill-swap", "sk", "girafarig", "shuckle")),
    ("BULK UP", 339, pair("bulk-up", "bu", "primeape", "onix")),
    ("FOCUS ENERGY", 116, pair("focus-energy", "fe", "taillow", "onix")),
]


def jobs_of(unit):  # every job of every UNITS entry with this name; a string job list borrows another unit's scenarios
    ref = unit[2] if isinstance(unit[2], str) else unit[0]
    return [j for u in UNITS if u[0] == ref and not isinstance(u[2], str) for j in u[2]]


def unique_units():
    seen = set()
    return [u for u in UNITS if not (u[0] in seen or seen.add(u[0]))]


def scenario(out: Path, job) -> Path:
    ident, base, variant = job
    path = LAB / f"{base}.json"
    if variant is None:
        return path
    data = json.loads(path.read_text())
    v = list(variant)
    while v:
        if v[0] == "turns":
            data["trace"]["segments"] += [dict(seg) for _ in range(v[1]) for seg in TURN]; v = v[2:]
        elif v[0] == "extend":
            data["trace"]["segments"].append({"frames": v[1], "buttons": []}); v = v[2:]
        elif v[0] == "moves":
            data["overrides"]["parties"][v[1]][0]["moves"] = [v[2]] * 4; v = v[3:]
        elif v[0] == "seed":
            data["seed"] = v[1]; v = v[2:]
        else:
            data["overrides"]["parties"][v[0]][0]["species"] = v[1]; v = v[2:]
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    sc = scenario(out, job)
    dest = out / "raw" / f"{job[0]}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/prep52NetZeroProbe.py",
                    str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return job[0], run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    n = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 10
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    seen, selected = set(), []
    for u in unique_units():
        if only is None or u[0] in only:
            for j in jobs_of(u):
                if j[0] not in seen:
                    seen.add(j[0]); selected.append(j)
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(n) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
