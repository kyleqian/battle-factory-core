#!/usr/bin/env python3
"""prep49 Scene-ON direct-mGBA probes of the census's order-host stop classes (docs/next-adapters-prep49.md).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep49Probe.py <out-dir> [--jobs J=6]
Classes (two lead species each, every job twice fresh, A / B):
  BP_PLY  the player's Baton Pass (BattleScript_EffectBatonPass: attackanimation; openpartyscreen BS_ATTACKER; returntoball
          BS_ATTACKER; switchinanim BS_ATTACKER, TRUE): base mechanic-baton-pass-player-aipom-opponent-onix (Baton Pass x4 vs Tackle x4),
          re-timed so the party menu's slot 1 is chosen (RIGHT, A, A after the menu is up); lead Aipom 190 / Jolteon 135.
  BP_OPP  the opponent's Baton Pass (the AI picks; no menu): mechanic-baton-pass-opponent-aipom-player-onix; lead Aipom / Jolteon.
  EXP_PLY the player's Explosion KOs both battlers (forced party menu with neither battler sprite: "reshow without the opponent
          battler"): mechanic-explosion-player-glalie-opponent-shuckle with the foe lead Abra 63 (Tackle x4); lead Glalie 347 / Electrode 101.
  EXP_OPP the opponent's Explosion KOs both: the mirrored scenario (player lead Abra, foe lead Glalie / Electrode).
The probe is tools/compare/spriteOrderEventProbe.py (rows from the battle's last ResetSpriteData = the party-menu exit when one opens).
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path("tools/battle-lab")
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}]
MENU = [{"frames": 2, "buttons": ["RIGHT"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
        {"frames": 2, "buttons": ["A"]}]
BP_PLY_TRACE = TURN + [{"frames": 700, "buttons": []}] + MENU + [{"frames": 1500, "buttons": []}]
BP_OPP_TRACE = TURN + [{"frames": 1500, "buttons": []}]
# The first two MENU blocks only dismiss the Explosion / faint messages (their RIGHT is ignored); the third answers the forced party menu.
EXP_TRACE = TURN + [{"frames": 1100, "buttons": []}] + MENU + [{"frames": 1200, "buttons": []}] + MENU + [{"frames": 1000, "buttons": []}] + MENU \
    + [{"frames": 1800, "buttons": []}]
ABRA = dict(species=63, gender="male", abilitySlot=0, moves=[33, 33, 33, 33])
JOBS = [
    ("BP_PLY", "bp-ply-aipom-onix", "mechanic-baton-pass-player-aipom-opponent-onix", BP_PLY_TRACE, {}, {}),
    ("BP_PLY", "bp-ply-jolteon-onix", "mechanic-baton-pass-player-aipom-opponent-onix", BP_PLY_TRACE, dict(species=135, gender="male"), {}),
    ("BP_OPP", "bp-opp-aipom-onix", "mechanic-baton-pass-opponent-aipom-player-onix", BP_OPP_TRACE, {}, {}),
    ("BP_OPP", "bp-opp-jolteon-onix", "mechanic-baton-pass-opponent-aipom-player-onix", BP_OPP_TRACE, {}, dict(species=135, gender="male")),
    ("EXP_PLY", "exp-ply-glalie-abra", "mechanic-explosion-player-glalie-opponent-shuckle", EXP_TRACE, {}, ABRA),
    ("EXP_PLY", "exp-ply-electrode-abra", "mechanic-explosion-player-glalie-opponent-shuckle", EXP_TRACE,
     dict(species=101, gender="genderless"), ABRA),
    ("EXP_OPP", "exp-opp-glalie-abra", "mechanic-explosion-opponent-glalie-player-shuckle", EXP_TRACE, ABRA, {}),
    ("EXP_OPP", "exp-opp-electrode-abra", "mechanic-explosion-opponent-glalie-player-shuckle", EXP_TRACE, ABRA,
     dict(species=101, gender="genderless")),
]


def scenario(out: Path, job) -> Path:
    _, ident, base, trace, player, opponent = job
    data = json.loads((LAB / f"{base}.json").read_text())
    assert data["profile"] == "battle-scene-on"
    data["trace"] = {"segments": [dict(seg) for seg in trace]}
    data["overrides"]["parties"]["player"][0].update(player)
    data["overrides"]["parties"]["opponent"][0].update(opponent)
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id = args
    sc = scenario(out, job)
    dest = out / "raw" / f"{job[1]}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/compare/spriteOrderEventProbe.py",
                    "226", str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log = Path(str(dest) + ".log")
    if log.exists():
        log.unlink()
    return job[1], run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 6
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r) for j in JOBS for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
