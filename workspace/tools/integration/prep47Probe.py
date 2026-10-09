#!/usr/bin/env python3
"""prep47 (A) direct-mGBA sSpriteOrder probes of the retained locked-action continuation (docs/next-adapters-prep47.md; never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep47Probe.py <out-dir> [--jobs J=12] [--only <class,...>]
Each job = (class, id, move, base scenario, variant), variants as prep45Probe.scenario: ("turns", N, ...) appends N more FIGHT ->
first-move turns; (side, species) replaces that side's party lead species. Opponent-locked classes (the census's retained
continuation: the player is prompted while the opponent's locked action continues) vary the PLAYER lead (Snorlax 143; Golbat 42 / Skarmory 227 where Onix would be KO'd, as the forced party menu's
ResetSpriteData would drop the earlier rows; Magnemite 81 for the genderless Ice Ball lead, whose trace keeps its first 3 turns:
("first", N)); the
player-locked controls (no player prompt) vary the opponent lead. Every job runs twice in separate fresh mGBA processes
(tools/compare/spriteOrderEventProbe.py through tools/run-mgba-probe.py, prep43Probe.run) -> <out-dir>/raw/<id>-A.json / -B.json.
"""
import json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Probe as P43
import prep45Probe as P45

LAB = Path("tools/battle-lab")


def scenario(out: Path, job) -> Path:
    """prep45Probe.scenario, plus ("first", N, ...): keep only the base trace's first N FIGHT turns (4 segments each)."""
    unit, ident, move, base, variant = job
    if variant is None or variant[0] != "first":
        return P45.scenario(out, job)
    data = json.loads((LAB / f"{base}.json").read_text())
    data["trace"]["segments"] = data["trace"]["segments"][:4 * variant[1]]
    if variant[2:]:
        side, species = variant[2:]
        data["overrides"]["parties"][side][0]["species"] = species
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


P43.scenario = scenario  # prep43Probe.run resolves the scenario through its module global

T2 = ("turns", 2)
JOBS = [
    # ---- retained OPPONENT locked action (census classes, by first-unit frames) ----
    ("OPP_DIG", "dig-opp", 91, "mechanic-dig-opponent-vibrava-player-chansey", None),
    ("OPP_DIG", "dig-opp-snorlax", 91, "mechanic-dig-opponent-vibrava-player-chansey", ("player", 143)),
    ("OPP_PETAL_DANCE", "pd-opp-golbat", 80, "mechanic-petal-dance-opponent-gloom-player-onix", T2 + ("player", 42)),
    ("OPP_PETAL_DANCE", "pd-opp-snorlax", 80, "mechanic-petal-dance-opponent-gloom-player-onix", T2 + ("player", 143)),
    ("OPP_ROLLOUT", "ro-opp", 205, "mechanic-rollout-opponent-voltorb-player-onix", T2),
    ("OPP_ROLLOUT", "ro-opp-snorlax", 205, "mechanic-rollout-opponent-voltorb-player-onix", T2 + ("player", 143)),
    ("OPP_SOLAR_BEAM", "sb-opp", 76, "mechanic-solar-beam-opponent-gloom-player-chansey", None),
    ("OPP_SOLAR_BEAM", "sb-opp-snorlax", 76, "mechanic-solar-beam-opponent-gloom-player-chansey", ("player", 143)),
    ("OPP_ICE_BALL", "ib-opp", 301, "mechanic-ice-ball-opponent-spheal-player-onix", ("first", 3)),
    ("OPP_ICE_BALL", "ib-opp-magnemite", 301, "mechanic-ice-ball-opponent-spheal-player-onix", ("first", 3, "player", 81)),
    # census involvement only (Dive / Outrage / Razor Wind) and the remaining lock kinds (recharge, Uproar, Thrash)
    ("OPP_DIVE", "dv-opp", 291, "mechanic-dive-opponent-chinchou-player-onix", None),
    ("OPP_DIVE", "dv-opp-snorlax", 291, "mechanic-dive-opponent-chinchou-player-onix", ("player", 143)),
    ("OPP_OUTRAGE", "ou-opp-skarmory", 200, "mechanic-outrage-opponent-dragonite-player-onix", T2 + ("player", 227)),
    ("OPP_OUTRAGE", "ou-opp-snorlax", 200, "mechanic-outrage-opponent-dragonite-player-onix", T2 + ("player", 143)),
    ("OPP_RAZOR_WIND", "rw-opp", 13, "mechanic-razor-wind-opponent-nuzleaf-player-onix", ("turns", 1)),
    ("OPP_RAZOR_WIND", "rw-opp-snorlax", 13, "mechanic-razor-wind-opponent-nuzleaf-player-onix", ("turns", 1, "player", 143)),
    ("OPP_HYPER_BEAM", "hb-opp", 63, "mechanic-hyper-beam-opponent-aerodactyl-player-onix", T2),
    ("OPP_HYPER_BEAM", "hb-opp-snorlax", 63, "mechanic-hyper-beam-opponent-aerodactyl-player-onix", T2 + ("player", 143)),
    ("OPP_UPROAR", "up-opp", 253, "mechanic-uproar-opponent-vigoroth-player-onix", T2),
    ("OPP_UPROAR", "up-opp-snorlax", 253, "mechanic-uproar-opponent-vigoroth-player-onix", T2 + ("player", 143)),
    ("OPP_THRASH", "th-opp", 37, "mechanic-thrash-opponent-tauros-player-onix", T2),
    ("OPP_THRASH", "th-opp-snorlax", 37, "mechanic-thrash-opponent-tauros-player-onix", T2 + ("player", 143)),
    # ---- PLAYER locked (controls: no player prompt at the locked turn) ----
    ("PLY_PETAL_DANCE", "pd-ply", 80, "mechanic-petal-dance-player-gloom-opponent-onix", T2),
    ("PLY_PETAL_DANCE", "pd-ply-snorlax", 80, "mechanic-petal-dance-player-gloom-opponent-onix", T2 + ("opponent", 143)),
    ("PLY_DIG", "dig-ply", 91, "mechanic-dig-player-vibrava-opponent-chansey", None),
    ("PLY_DIG", "dig-ply-snorlax", 91, "mechanic-dig-player-vibrava-opponent-chansey", ("opponent", 143)),
]

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        P43.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(P43.run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
