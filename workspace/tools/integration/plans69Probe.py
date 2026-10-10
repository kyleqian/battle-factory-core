#!/usr/bin/env python3
"""plans69 direct-mGBA sSpriteOrder probes of the remaining sprite-order host stops (docs/next-adapters-plans69.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): plans69Probe.py <out-dir> [--jobs J=12] [--only <unit,...>]
Each job = (unit, id, move, base scenario, ops): an existing tools/battle-lab scenario rewritten to <out-dir>/scenarios/<id>.json with
the lab seed ALWAYS pinned (ISSUES #154; the base's own seed unless a ("seed", n) op is given). ops: ("species", side, sp) replaces that
side's lead species and sets its gender to one the species allows (sw67Probe.GENDER, species_info.h genderRatio); ("moves", side, mv)
4x mv; ("turns", n) n more FIGHT -> first move turns (plans48Probe.TURN); ("extend", n) n idle frames. Every job runs twice in separate
fresh mGBA processes within this one batch (prep43Probe.run) -> raw/<id>-A.json / -B.json.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import sw67Probe as S67  # GENDER only (its import sets P43.scenario; reassigned below)
import plans48Probe as P48  # TURN only

LAB = Path("tools/battle-lab")
SIDES = (("player", "opponent", "ply"), ("opponent", "player", "opp"))


def base(move_slug: str, side: str, attacker: str, defender: str = "onix") -> str:
    other = "opponent" if side == "player" else "player"
    return f"mechanic-{move_slug}-{side}-{attacker}-{other}-{defender}"


JOBS = []
# (unit, move, scenario slug, attacker slug, (attacker, defender) species pairs, extra ops). The base pair keeps the scenario's own
# species; the second pair swaps both leads (attacker Snorlax 143 / Golbat 42 and defender Golbat 42 / Snorlax 143: elevated and not).
GRID = [
    ("FLATTER", 260, "flatter", "nidorina", [(30, 95), (143, 42), (42, 143)], ()),
    ("NEEDLE_ARM", 302, "needle-arm", "cacnea", [(344, 95), (143, 42), (42, 143)], ()),
    # Astonish is Ghost-type: no Normal-type defender (Snorlax would be immune: no body)
    ("ASTONISH", 310, "astonish", "loudred", [(371, 95), (143, 42), (42, 95)], ()),
    # Odor Sleuth / Conversion 2: the Mega Punch scenarios with the attacker's moves replaced
    ("ODOR_SLEUTH", 316, "mega-punch", "cacturne", [(345, 95), (42, 143), (143, 42)], ()),
    # Conversion 2 fails until the target has landed a move (gLastLandedMoves): one more turn
    ("CONVERSION_2", 176, "mega-punch", "cacturne", [(345, 95), (42, 143), (143, 42)], (("turns", 1),)),
]
for unit, move, slug, atk, pairs, extra in GRID:
    for side, other, tag in SIDES:
        for a, d in pairs:
            JOBS.append((unit, f"{unit.lower().replace('_', '-')}-{tag}-{a}-{d}", move, base(slug, side, atk),
                         (("species", side, a), ("species", other, d), ("moves", side, move)) + extra))

# CASTFORM_CHANGE (General_CastformChange: monbg + tasks only): Castform 385 (Forecast) sets the weather itself (Sunny Day / Rain Dance
# scenarios with the user's lead replaced), against Onix 95 / Golbat 42, both sides
for side, other, tag in SIDES:
    for weather, move, slug, atk in (("sun", 241, "sunny-day", "bellossom"), ("rain", 240, "rain-dance", "wooper")):
        for d in (95, 42):
            JOBS.append(("CASTFORM_CHANGE", f"castform-{tag}-{weather}-{d}", move, base(slug, side, atk),
                         (("species", side, 385), ("species", other, d))))

# Magnitude 222 (AnimTask_IsPowerOver99 on gAnimMovePower: MagnitudeRegular = tasks only; MagnitudeIntense = two
# complex_palette_blend sprites). The regular / intense scenarios (seed-staged magnitude) with the defender varied (no Flying / Levitate)
for side, other, tag in SIDES:
    for kind, atk, sp in (("regular", "graveler", 75), ("intense", "camerupt", 323)):
        for d in (95, 143):
            JOBS.append(("MAGNITUDE", f"magnitude-{tag}-{kind}-{sp}-{d}", 222, base(f"magnitude-{kind}", side, atk),
                         (("species", other, d),)))
# more Magnitude instances: the regular scenarios over lab seeds 2..9 with two more turns (the magnitude roll varies with the seed)
for side, other, tag in SIDES:
    for seed in range(2, 10):
        JOBS.append(("MAGNITUDE", f"magnitude-{tag}-sweep-s{seed}", 222, base("magnitude-regular", side, "graveler"),
                     (("seed", seed), ("turns", 2))))


# ---- batch 2 (negatives; no plan derived from them) ----
# Hyper Beam 63 (AnimHyperBeamOrb: Random2 speed -> lifetime, attacker -> target distance): 2 (attacker, defender) pairs per side, plus a
# lab-seed sweep at the scenario's own pair
for side, other, tag in SIDES:
    for a, d in ((142, 95), (143, 42)):
        JOBS.append(("HYPER_BEAM", f"hyper-beam-{tag}-{a}-{d}", 63, base("hyper-beam", side, "aerodactyl"),
                     (("species", side, a), ("species", other, d), ("moves", side, 63))))
    for seed in (1, 2, 3):
        JOBS.append(("HYPER_BEAM", f"hyper-beam-{tag}-142-95-s{seed}", 63, base("hyper-beam", side, "aerodactyl"), (("seed", seed),)))
# Random2 vs geometry: lab-seed sweeps at a FIXED (attacker, defender) pair (Astonish droplets / Flatter confetti draw Random2; Odor Sleuth's
# clones do not), and an Odor Sleuth target sweep (player attacker Cacturne 345)
SWEEPS = [("ASTONISH", 310, "astonish", "loudred", (371, 95), (1, 2, 3, 4, 5)), ("FLATTER", 260, "flatter", "nidorina", (30, 95), (1, 2, 3)),
          ("ODOR_SLEUTH", 316, "mega-punch", "cacturne", (345, 95), (1, 2, 3))]
for unit, move, slug, atk, (a, d), seeds in SWEEPS:
    for side, other, tag in SIDES:
        for seed in seeds:
            JOBS.append((unit, f"{unit.lower().replace('_', '-')}-{tag}-{a}-{d}-s{seed}", move, base(slug, side, atk),
                         (("species", side, a), ("species", other, d), ("moves", side, move), ("seed", seed))))
for d in (169, 202, 213, 80, 149, 131):
    JOBS.append(("ODOR_SLEUTH", f"odor-sleuth-ply-345-{d}", 316, base("mega-punch", "player", "cacturne"),
                 (("species", "player", 345), ("species", "opponent", d), ("moves", "player", 316))))
# Speed Boost (BattleScript_SpeedBoostActivates: playanimation B_ANIM_STATS_CHANGE sB_ANIM_ARG1 = STAT_ANIM_PLUS1 + STAT_SPEED,
# battle_util.c:2646): Ninjask 302 (ability slot 0) leading with Dig 91 (underground at the end of turn 1) or Mega Punch 5, both sides
for side, other, tag in SIDES:
    for move in (91, 5):
        JOBS.append(("SPEED_BOOST", f"speed-boost-{tag}-302-{move}", move, base("mega-punch", side, "cacturne"),
                     (("species", side, 302), ("moves", side, move), ("turns", 1))))


def scenario(out: Path, job) -> Path:
    _, ident, _, base_name, ops = job
    data = json.loads((LAB / f"{base_name}.json").read_text())
    data["seed"] = int(data["seed"])  # pinned explicitly (the base's own seed unless an op sets it)
    for op in ops:
        if op[0] == "seed":
            data["seed"] = op[1]
        elif op[0] == "extend":
            data["trace"]["segments"].append({"frames": op[1], "buttons": []})
            data["trace"].pop("captureFrames", None)
        elif op[0] == "turns":
            data["trace"]["segments"] += [dict(seg) for _ in range(op[1]) for seg in P48.TURN]
            data["trace"].pop("captureFrames", None)
        else:
            lead = data["overrides"]["parties"][op[1]][0]
            if op[0] == "species":
                lead["species"] = op[2]
                forced = S67.GENDER.get(op[2])
                if forced is not None:
                    lead["gender"] = forced
                elif lead["gender"] == "genderless":
                    lead["gender"] = "male"
            elif op[0] == "moves":
                lead["moves"] = [op[2]] * 4
            else:
                raise ValueError(op)
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


P43.scenario = scenario  # prep43Probe.run resolves the scenario through its module global

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
