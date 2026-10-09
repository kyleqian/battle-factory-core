#!/usr/bin/env python3
"""aud56 (ISSUES #156): direct-mGBA allocator net-zero probes for every general / hit / stat animation unit reachable in Factory play
(docs/aud56-general-animation-allocator.md). Never the HTTP oracles.

usage: aud56Probe.py <out-dir> [--jobs J=12] [--only <unit,...>]
JOBS = (unit, ident, base, ops): base = a tools/battle-lab scenario; ops (applied in order, as plans48Probe.py's scenario()):
("turns", N) appends N more FIGHT -> first-move turns (prep45's TURN segment); ("extend", N) appends N idle frames; ("species",
side, id) / ("moves", side, id) / ("item", side, id) edit that side's party lead; ("seed", N) sets the battle-lab seed. EVERY job
is written as a variant with an EXPLICIT lab "seed" (the base scenario's own seed unless an op replaces it; ISSUES #154). Every job
runs twice in separate fresh processes in this one batch (tools/integration/aud56NetZeroProbe.py through tools/run-mgba-probe.py)
-> <out-dir>/raw/<ident>-A.json / -B.json. The unit name is only the job's purpose: aud56Extract.py tallies EVERY script interval
and hit window of every job by its own key. Needs PYTHONPATH=<vendor>/libmgba-py and the mGBA venv python.
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path("tools/battle-lab")
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
SNORLAX, GOLBAT = 143, 42
OU_P, OU_O = "mechanic-outrage-player-dragonite-opponent-onix", "mechanic-outrage-opponent-dragonite-player-onix"


def pair(unit, slug, base_p, base_o, ops=(), extra=()):
    return [(unit, f"{slug}-ply", base_p, tuple(ops)), (unit, f"{slug}-opp", base_o, tuple(ops))] + [
        (unit, f"{slug}-{tag}", base, tuple(ops) + tuple(more)) for tag, base, more in extra]


def mech(unit, slug, move, a, b, move_id, turns=2, defender_variants=False):
    """Both orientations of the accepted pair, the user swapped to Snorlax / Golbat, and (traps: the animation's battler is the
    TRAPPED one) the defender swapped to Snorlax / Golbat."""
    p, o = f"mechanic-{move}-player-{a}-opponent-{b}", f"mechanic-{move}-opponent-{a}-player-{b}"
    return pair(unit, slug, p, o, (("turns", turns),),
                [("ply-snorlax", p, (("species", "player", SNORLAX), ("moves", "player", move_id))),
                 ("opp-golbat", o, (("species", "opponent", GOLBAT), ("moves", "opponent", move_id)))]
                + ([("ply-def-snorlax", p, (("species", "opponent", SNORLAX),)),
                    ("opp-def-golbat", o, (("species", "player", GOLBAT),))] if defender_variants else []))


JOBS = (
    # STATS_CHANGE (General_StatsChange): the raiser (Swords Dance) and the lowered target (Leer), both sides, 3 species.
    pair("STATS_CHANGE", "st-sd", "mechanic-swords-dance-player-ledian-opponent-onix", "mechanic-swords-dance-opponent-ledian-player-onix",
         (("turns", 1),), [("ply-snorlax", "mechanic-swords-dance-player-ledian-opponent-onix", (("species", "player", SNORLAX),))])
    + pair("STATS_CHANGE", "st-leer", "mechanic-leer-player-dragonair-opponent-onix", "mechanic-leer-opponent-dragonair-player-onix",
           (("turns", 1),), [("opp-snorlax", "mechanic-leer-opponent-dragonair-player-onix", (("species", "player", SNORLAX),))])
    # Weather continuing (General_Hail / General_Sandstorm -> goto Move_*; General_Rain; General_Sun -> goto Move_SUNNY_DAY)
    + mech("HAIL_CONTINUES", "hail", "hail", "delibird", "onix", 258)
    + mech("SANDSTORM_CONTINUES", "sand", "sandstorm", "phanpy", "onix", 201)
    + mech("RAIN_CONTINUES", "rain", "rain-dance", "wooper", "onix", 240)
    + mech("SUN_CONTINUES", "sun", "sunny-day", "bellossom", "onix", 241)
    # Weather continuing on the OPPONENT battler: DoFieldEndTurnEffects plays it on the first non-absent battler, so the player's lead
    # (Onix) uses Selfdestruct 120 first and faints; the opponent setter (Snorlax / Skarmory 227) survives and sets the weather.
    + [(unit, f"{slug}-opp-sd-{sp}", base, (("species", "opponent", sp), ("moves", "opponent", mv), ("moves", "player", 120), ("extend", 900)))
       for unit, slug, base, mv in (("HAIL_CONTINUES", "hail", "mechanic-hail-opponent-delibird-player-onix", 258),
                                    ("SANDSTORM_CONTINUES", "sand", "mechanic-sandstorm-opponent-phanpy-player-onix", 201),
                                    ("RAIN_CONTINUES", "rain", "mechanic-rain-dance-opponent-wooper-player-onix", 240))
       for sp in (SNORLAX, 227)]
    # LEECH_SEED_DRAIN (General_LeechSeedDrain -> goto Move_ABSORB), WISH_HEAL, INGRAIN_HEAL
    + mech("LEECH_SEED_DRAIN", "ls", "leech-seed", "exeggcute", "onix", 73)
    + mech("WISH_HEAL", "wish", "wish", "illumise", "onix", 273)
    + mech("INGRAIN_HEAL", "ig", "ingrain", "lileep", "onix", 275)
    # TURN_TRAP family (General_TurnTrap -> Status_Whirlpool / Status_FireSpin / Status_SandTomb / Status_BindWrap / Status_Clamp)
    + mech("TURN_TRAP_WHIRLPOOL", "wp", "whirlpool", "wailmer", "onix", 250, defender_variants=True)
    + mech("TURN_TRAP_FIRE_SPIN", "fs", "fire-spin", "charmeleon", "onix", 83, defender_variants=True)
    + mech("TURN_TRAP_SAND_TOMB", "stb", "sand-tomb", "dugtrio", "onix", 328, defender_variants=True)
    + mech("TURN_TRAP_BIND", "wr", "wrap", "tentacool", "onix", 35, defender_variants=True)
    + pair("TURN_TRAP_CLAMP", "cl", "mechanic-wrap-player-tentacool-opponent-onix", "mechanic-wrap-opponent-tentacool-player-onix",
           (("moves", "player", 128), ("moves", "opponent", 128), ("turns", 2)))
    # ITEM_KNOCKOFF (plans48's staging: the target holds Leftovers 200) -- the item bag is known to survive the script `end`.
    + pair("ITEM_KNOCKOFF", "ko", "mechanic-knock-off-shuppet-onix", "mechanic-knock-off-opponent-shuppet-player-onix", (("extend", 600),),
           [("ply-snorlax", "mechanic-knock-off-shuppet-onix", (("item", "opponent", 200), ("species", "opponent", SNORLAX))),
            ("opp-golbat", "mechanic-knock-off-opponent-shuppet-player-onix", (("item", "player", 200), ("species", "player", GOLBAT)))])
    # FOCUS_BAND: plans51's four activating lab seeds (holder Caterpie 10 / Magikarp 129 on both sides, Dragonite's Outrage).
    + [("FOCUS_BAND", f"fb-{tag}-{sp}-s{seed}", base, (("species", side, sp), ("item", side, 196), ("seed", seed)))
       for tag, side, base, sp, seed in (("opp", "opponent", OU_P, 10, 12), ("opp", "opponent", OU_P, 129, 2),
                                         ("pla", "player", OU_O, 10, 12), ("pla", "player", OU_O, 129, 13))]
    # ITEM_STEAL (General_ItemSteal, Covet / Thief) and FOCUS_PUNCH_SETUP: reachable in Factory; probed for the record.
    + pair("ITEM_STEAL", "cv", "mechanic-covet-player-linoone-opponent-shuckle", "mechanic-covet-opponent-linoone-player-shuckle", (("extend", 600),))
    + pair("ITEM_STEAL", "cv2", "mechanic-covet-player-linoone-opponent-shuckle", "mechanic-covet-opponent-linoone-player-shuckle",
           (("item", "player", 0), ("item", "opponent", 0), ("item", "opponent", 200), ("extend", 600)))
    + [("ITEM_STEAL", "cv2-opp-items", "mechanic-covet-opponent-linoone-player-shuckle", (("item", "opponent", 0), ("item", "player", 200), ("extend", 600))),
       ("ITEM_STEAL", "cv2-ply-snorlax", "mechanic-covet-player-linoone-opponent-shuckle",
        (("item", "player", 0), ("item", "opponent", 200), ("species", "opponent", SNORLAX), ("extend", 600)))]
    # FUTURE_SIGHT_HIT (General_FutureSightHit; prep52 audited it too): prep52's four Future Sight stagings, re-run fresh here.
    + pair("FUTURE_SIGHT_HIT", "fsh", "mechanic-future-sight-kadabra-onix", "mechanic-future-sight-opponent-kadabra-player-onix", (("turns", 2),),
           [("ply-snorlax", "mechanic-future-sight-kadabra-onix", (("species", "opponent", SNORLAX),)),
            ("ply-user-snorlax", "mechanic-future-sight-kadabra-onix", (("species", "player", SNORLAX), ("moves", "player", 248))),
            ("opp-golbat", "mechanic-future-sight-opponent-kadabra-player-onix", (("species", "player", GOLBAT),))])
    # CASTFORM_CHANGE (Forecast; Castform 385 is a Factory species): Castform on the other side of a Sunny Day / Rain Dance setter.
    + [("CASTFORM_CHANGE", "cf-sun-opp", "mechanic-sunny-day-player-bellossom-opponent-onix", (("species", "opponent", 385), ("turns", 1))),
       ("CASTFORM_CHANGE", "cf-sun-ply", "mechanic-sunny-day-opponent-bellossom-player-onix", (("species", "player", 385), ("turns", 1))),
       ("CASTFORM_CHANGE", "cf-rain-opp", "mechanic-rain-dance-player-wooper-opponent-onix", (("species", "opponent", 385), ("turns", 1))),
       ("CASTFORM_CHANGE", "cf-rain-ply", "mechanic-rain-dance-opponent-wooper-player-onix", (("species", "player", 385), ("turns", 1)))]
    + pair("FOCUS_PUNCH_SETUP", "fp", "mechanic-focus-punch-player-breloom-opponent-starmie", "mechanic-focus-punch-opponent-breloom-player-starmie",
           (("extend", 300),), [("ply-staryu", "mechanic-focus-punch-player-breloom-opponent-staryu", ()),
                                 ("ply-user-snorlax", "mechanic-focus-punch-player-breloom-opponent-starmie",
                                  (("species", "player", SNORLAX), ("moves", "player", 264)))])
)
ITEM_KNOCKOFF_DEFAULT_ITEM = {"ko-ply": ("opponent", 200), "ko-opp": ("player", 200)}


def scenario(out: Path, job) -> Path:
    unit, ident, base, ops = job
    data = json.loads((LAB / f"{base}.json").read_text())
    data["seed"] = data["seed"]  # explicit lab seed (ISSUES #154); an op may replace it
    if ident in ITEM_KNOCKOFF_DEFAULT_ITEM:
        side, item = ITEM_KNOCKOFF_DEFAULT_ITEM[ident]
        data["overrides"]["parties"][side][0]["item"] = item
    for op in ops:
        if op[0] == "turns":
            data["trace"]["segments"] += [dict(seg) for _ in range(op[1]) for seg in TURN]
            data["trace"].pop("captureFrames", None)
        elif op[0] == "extend":
            data["trace"]["segments"].append({"frames": op[1], "buttons": []})
            data["trace"].pop("captureFrames", None)
        elif op[0] == "seed":
            data["seed"] = op[1]
        else:
            lead = data["overrides"]["parties"][op[1]][0]
            if op[0] == "species":
                lead["species"] = op[2]
            elif op[0] == "moves":
                lead["moves"] = [op[2]] * 4
            elif op[0] == "item":
                lead["item"] = op[2]
            else:
                raise SystemExit(f"unknown op {op}")
    assert isinstance(data.get("seed"), int)
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    sc = out / "scenarios" / f"{job[1]}.json"
    dest = out / "raw" / f"{job[1]}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/aud56NetZeroProbe.py",
                    str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return job[1], run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    n = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    selected = [j for j in JOBS if only is None or j[0] in only or j[1] in only]
    assert len({j[1] for j in JOBS}) == len(JOBS), "duplicate job ident"
    for job in selected:
        scenario(out, job)
    (out / "jobs.json").write_text(json.dumps([list(j) for j in selected], indent=1) + "\n")
    with ThreadPoolExecutor(n) as ex:
        results = list(ex.map(run, [(out, j, r) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
