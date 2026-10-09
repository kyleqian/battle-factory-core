#!/usr/bin/env python3
"""prep52: allocator net-zero probes for the greedy chain units of docs/next-adapters-prep52.md (direct mGBA only, never the
HTTP oracles).

usage: prep52Probe.py <out-dir> [--jobs J=10] [--only <unit,...>]
UNITS = (unit, key, [scenario jobs]) in the census's greedy order (fixtures/prep52/chains-before-seeds0-299.json); key = a move id
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


UNITS = [
    # FUTURE SIGHT: the setup body is the move-animation command (sAnimMoveIndex 248); the hit two turns later is the GENERAL
    # animation B_ANIM_FUTURE_SIGHT_HIT (battle_scripts_1.s BattleScript_MonTookFutureAttack: playanimation BS_ATTACKER) -> key
    # General_FutureSightHit. Same scenarios for both keys.
    ("FUTURE SIGHT", 248, [("fs-ply", "mechanic-future-sight-kadabra-onix", ("turns", 2)),
                           ("fs-ply-snorlax", "mechanic-future-sight-kadabra-onix", ("turns", 2, "opponent", SNORLAX)),
                           ("fs-opp", "mechanic-future-sight-opponent-kadabra-player-onix", ("turns", 2)),
                           ("fs-opp-golbat", "mechanic-future-sight-opponent-kadabra-player-onix", ("turns", 2, "player", GOLBAT))]),
    ("FUTURE SIGHT hit", "General_FutureSightHit", "FUTURE SIGHT"),
    ("SEISMIC TOSS", 69, mech("seismic-toss", "kecleon", "onix") + [
        ("st-ply-golbat", "species-audit-golbat-prep8-seismic-toss-player", None),
        ("st-opp-pgolem", "species-audit-pgolem-prep8-seismic-toss-opponent", None)]),
    ("ICE BALL", 301, mech("ice-ball", "spheal", "onix") + [
        ("ib-ply-glalie", "prep25-ice-ball-alt-player-glalie-golem", None), ("ib-opp-glalie", "prep25-ice-ball-alt-opponent-glalie-golem", None)]),
    # FRZ (Status_Freeze; InitAndLaunchChosenStatusAnimation STATUS1_FREEZE): the accepted Ice Beam scenarios with a battle-lab seed
    # at which the 10 % freeze lands (seeds found by a 20-seed search per orientation, docs/next-adapters-prep52.md), 3 more turns.
    ("FRZ", "Status_Freeze", [
        ("frz-ply-shuckle", "mechanic-ice-beam-player-delcatty-opponent-shuckle", ("seed", 12, "turns", 3)),
        ("frz-opp-shuckle", "mechanic-ice-beam-opponent-delcatty-player-shuckle", ("seed", 1, "turns", 3)),
        ("frz-ply-snorlax", "mechanic-ice-beam-player-delcatty-opponent-shuckle", ("seed", 8, "turns", 3, "opponent", SNORLAX)),
        ("frz-opp-snorlax", "mechanic-ice-beam-opponent-delcatty-player-shuckle", ("seed", 13, "turns", 3, "player", SNORLAX))]),
    ("PURSUIT", 228, mech("pursuit", "beedrill", "shuckle") + [
        ("pu-ply-umbreon", "prep18-pursuit-alt-umbreon-golem", None), ("pu-opp-umbreon", "prep18-pursuit-altopp-umbreon-golem", None)]),
    ("PERISH SONG", 195, mech("perish-song", "murkrow", "onix") + [("ps-ply-golem", "prep11-audit-golem-prep5-perish-song-player", None)]),
    ("LEAF BLADE", 348, mech("leaf-blade", "sceptile", "onix") + [("lb-ply-ninetales", "prep11-leaf-blade-player-ninetales-opponent-golem", None)]),
    ("ICE PUNCH", 8, [("ip-ply-golbat", "species-audit-golbat-prep7-ice-punch-lab-player", None),
                      ("ip-opp-pgolem", "species-audit-pgolem-prep7-ice-punch-lab-opponent", None),
                      ("ip-opp-pidgeot", "elevated-postbody-pidgeot-prep7-ice-punch-lab-opponent", None)]),
    ("FRUSTRATION", 218, mech("frustration", "furret", "onix") + [("fr-ply-golem", "prep11-audit-golem-prep8-frustration-player", None)]),
    ("FORESIGHT", 193, mech("foresight", "machoke", "onix") + [("fo-ply-hitmonlee", "prep11-foresight-alt-hitmonlee", None)]),
    ("SWAGGER", 207, [("sw-ply", "mechanic-perish-song-player-murkrow-opponent-onix", ("moves", "player", 207)),
                      ("sw-opp", "mechanic-perish-song-opponent-murkrow-player-onix", ("moves", "opponent", 207)),
                      ("sw-ply-snorlax", "mechanic-perish-song-player-murkrow-opponent-onix", ("moves", "player", 207, "opponent", SNORLAX))]),
    ("MINIMIZE", 107, mech("minimize", "grimer", "onix") + [
        ("mi-ply-snorlax", "mechanic-minimize-player-grimer-opponent-onix", ("opponent", SNORLAX))]),
    ("FAKE OUT", 252, mech("fake-out", "makuhita", "shuckle") + [
        ("fo2-ply-snorlax", "mechanic-fake-out-player-makuhita-opponent-shuckle", ("opponent", SNORLAX))]),
    ("MEGA DRAIN", 72, mech("mega-drain", "skiploom", "onix") + [("md-ply-golbat", "species-audit-golbat-prep9-mega-drain-player", None)]),
    ("BIND", 20, mech("bind", "onix", "murkrow")),
    ("RAPID SPIN", 229, mech("rapid-spin", "wartortle", "onix") + [("rs-ply-starmie", "prep29-rapid-spin-alt-player-starmie-golem", None)]),
    ("RECYCLE", 278, [("rc-ply", "mechanic-recycle-player-porygon-opponent-gyarados", None),
                      ("rc-opp", "mechanic-recycle-opponent-porygon-player-gyarados", None),
                      ("rc-ply-tauros", "prep11-recycle-alt-tauros-player", None)]),
    ("AURORA BEAM", 62, mech("aurora-beam", "seadra", "onix") + [("ab-ply-golbat", "species-audit-golbat2b-prep8-aurora-beam-player", None)]),
    ("SOLARBEAM", 76, [("sb-ply", "mechanic-solar-beam-player-gloom-opponent-chansey", None),
                       ("sb-opp", "mechanic-solar-beam-opponent-gloom-player-chansey", None),
                       ("sb-ply-snorlax", "mechanic-solar-beam-player-gloom-opponent-chansey", ("opponent", SNORLAX))]),
    ("SUNNY DAY", 241, mech("sunny-day", "bellossom", "onix") + [("sd-ply-golbat", "species-audit-golbat2b-prep9-sunny-day-player", None)]),
    ("DREAM EATER", 138, mech("dream-eater", "wigglytuff", "onix") + [("de-ply-golbat", "species-audit-golbat2b-prep9-dream-eater-player", None)]),
    ("SPARK", 209, mech("spark", "minun", "shuckle") + [("sp-ply-snorlax", "mechanic-spark-player-minun-opponent-shuckle", ("opponent", SNORLAX))]),
    ("ROLLOUT", 205, mech("rollout", "voltorb", "onix") + [("ro-ply-wailmer", "prep11-rollout-alt-wailmer", None)]),
    ("DEFENSE CURL", 111, mech("defense-curl", "phanpy", "onix") + [("dc-ply-golbat", "species-audit-golbat-prep4-defense-curl-player", None)]),
    ("THUNDER", 87, [("th-ply", "mechanic-thunder-player-magneton-opponent-shuckle", None),
                     ("th-opp", "mechanic-thunder-opponent-magneton-player-shuckle", None),
                     ("th-ply-snorlax", "mechanic-thunder-player-magneton-opponent-shuckle", ("opponent", SNORLAX))]),
    ("FIRE BLAST", 126, mech("fire-blast", "octillery", "onix") + [("fb-ply-golbat", "species-audit-golbat-prep7-fire-blast-player", None)]),
    ("DOUBLESLAP", 3, mech("double-slap", "poliwhirl", "onix") + [("ds-ply-golbat", "species-audit-golbat-multihit-double-slap-player-hit2", None)]),
    ("ABSORB", 71, mech("absorb", "lombre", "onix") + [("as-ply-golbat", "species-audit-golbat2b-prep9-absorb-player", None)]),
    ("MEGAHORN", 224, mech("megahorn", "seaking", "onix") + [("mh-ply-heracross", "prep18-megahorn-alt-heracross-golem", None)]),
    ("FIRE PUNCH", 7, [("fp-ply", "prep22-fire-punch-player-seed1", None), ("fp-opp", "prep22-fire-punch-opponent-seed1", None),
                       ("fp-ply-11", "prep22-fire-punch-player-seed11", None)]),
    # Tail: bodies whose chains also hold an order-host unit (command party-summary / switch-in), so they never unlock alone.
    ("STOCKPILE", 254, [("sk-ply", "mechanic-swallow-player-pelipper-one-stockpile", None),
                        ("sk-opp", "mechanic-swallow-opponent-pelipper-one-stockpile", None),
                        ("sk-opp-delcatty", "mechanic-stockpile-opponent-pelipper-player-delcatty", None),
                        ("sk-ply-swalot", "mechanic-spit-up-player-swalot-one-stockpile", None)]),
    ("SWALLOW", 256, [("sk-ply", "mechanic-swallow-player-pelipper-one-stockpile", None),
                      ("sk-opp", "mechanic-swallow-opponent-pelipper-one-stockpile", None),
                      ("sw3-ply", "mechanic-swallow-player-pelipper-three-stockpile", None),
                      ("sw3-opp", "mechanic-swallow-opponent-pelipper-three-stockpile", None)]),
    ("TAUNT", 269, mech("taunt", "murkrow", "shuckle") + [
        ("ta-ply-snorlax", "mechanic-taunt-player-murkrow-opponent-shuckle", ("opponent", SNORLAX))]),
    ("METRONOME", 118, mech("metronome", "chansey", "onix") + [("me-ply-golbat", "species-audit-golbat-prep5-metronome-player", None)]),
    ("INGRAIN", 275, mech("ingrain", "lileep", "onix") + [("ig-ply-golbat", "species-audit-golbat-prep4-ingrain-player", None)]),
    ("RAZOR WIND", 13, mech("razor-wind", "nuzleaf", "onix") + [
        ("rw-ply-absol", "species-audit-golbat2-razor-wind-player-razor-wind-player-absol-opponent-onix-b1", None)]),
    ("GUST", 16, [("gu-ply", "mechanic-perish-song-player-murkrow-opponent-onix", ("moves", "player", 16)),
                  ("gu-opp", "mechanic-perish-song-opponent-murkrow-player-onix", ("moves", "opponent", 16)),
                  ("gu-ply-eevee", "mechanic-attract-player-eevee-opponent-onix", ("moves", "player", 16))]),
    ("TRANSFORM", 144, [("tf-ply", "mechanic-perish-song-player-murkrow-opponent-onix", ("moves", "player", 144)),
                        ("tf-opp", "mechanic-perish-song-opponent-murkrow-player-onix", ("moves", "opponent", 144)),
                        ("tf-ply-eevee", "mechanic-attract-player-eevee-opponent-onix", ("moves", "player", 144))]),
    ("MACH PUNCH", 183, mech("mach-punch", "hitmonchan", "chansey") + [
        ("mp-ply-breloom", "d4a-mach-punch-extra-player-breloom-golbat", None)]),
    ("SHOCK WAVE", 351, mech("shock-wave", "flaaffy", "corsola") + [
        ("sh-ply-manectric", "prep22-shock-wave-alt-player-manectric-wailmer", None)]),
    ("WILL-O-WISP", 261, mech("will-o-wisp", "shuppet", "shuckle") + [("wo-ply-banette", "prep18-will-o-wisp-alt-banette-golem", None)]),
    ("EXTREMESPEED", 245, [("es-ply", "mechanic-extreme-speed-player-arcanine-dugtrio", None),
                           ("es-opp", "mechanic-extreme-speed-arcanine-dugtrio", None),
                           ("es-opp-smeargle", "prep34-extreme-speed-alt-opponent-smeargle-golem", None)]),
    ("OUTRAGE", 200, mech("outrage", "dragonite", "onix") + [("ou-ply-flygon", "prep29-outrage-alt-player-flygon-golem", None)]),
    # status2 animations never in the census chains (0 involvement on seeds 0..299), audited for completeness. WRAPPED has no
    # script (battle_gfx_sfx_util.c ~:450 "this animation doesn't actually exist"; no battle script emits status2animation WRAPPED).
    ("INFATUATION", "Status_Infatuation", [
        ("in-ply", "mechanic-attract-player-eevee-opponent-onix", ("turns", 2)),
        ("in-opp", "mechanic-attract-opponent-eevee-player-onix", ("turns", 2)),
        ("in-ply-snorlax", "mechanic-attract-player-eevee-opponent-onix", ("turns", 2, "opponent", SNORLAX)),
        ("in-opp-snorlax", "mechanic-attract-opponent-eevee-player-onix", ("turns", 2, "player", SNORLAX))]),
    ("CURSED", "Status_Curse", [
        ("cu-ply", "mechanic-curse-ghost-player-haunter-opponent-magikarp", ("turns", 1)),
        ("cu-opp", "mechanic-curse-ghost-opponent-haunter-player-magikarp", ("turns", 1)),
        ("cu-ply-gengar", "prep14-curse-ghost-alt-gengar-golem", ("turns", 1)),
        ("cu-opp-gengar", "prep23-curse-ghost-altopp-gengar-golem", ("turns", 1))]),
    ("NIGHTMARE", "Status_Nightmare", [
        ("nm-ply", "mechanic-nightmare-player-haunter-opponent-shuckle", ("turns", 1)),
        ("nm-opp", "mechanic-nightmare-opponent-haunter-player-shuckle", ("turns", 1)),
        ("nm-ply-gengar", "d4a-nightmare-extra-player-gengar-golbat", ("turns", 1)),
        ("nm-opp-haunter", "d4a-nightmare-extra-opponent-haunter-snorlax", ("turns", 1))]),
    # second-orientation / second-species rows added after the first pass (Fire Blast opponent body absent; Bind one species).
    # The accepted opponent-orientation Fire Blast scenarios run no animation script in their 934 frames (recorded, excluded).
    ("FIRE BLAST", 126, [("fb-opp-pgolem", "species-audit-pgolem-prep7-fire-blast-opponent", None),
                         ("fb-opp-murkrow", "mechanic-perish-song-opponent-murkrow-player-onix", ("moves", "opponent", 126)),
                         ("fb-opp-eevee", "mechanic-attract-opponent-eevee-player-onix", ("moves", "opponent", 126))]),
    ("BIND", 20, [("bi-ply-murkrow", "mechanic-perish-song-player-murkrow-opponent-onix", ("moves", "player", 20)),
                  ("bi-opp-murkrow", "mechanic-perish-song-opponent-murkrow-player-onix", ("moves", "opponent", 20))]),
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
