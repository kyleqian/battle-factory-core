#!/usr/bin/env python3
"""prep47 (C) Scene-ON direct-mGBA probes of the Factory AI's voluntary switch ("return to ball"; docs/next-adapters-prep47.md).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep47AiSwitchProbe.py <out-dir> [--jobs J=4]
Base: mechanic-factory-ai-switch-receipt-c2-perish-off (opponent lead with Perish Song x4, Jolteon bench), re-profiled to Scene ON with
re-timed multi-turn inputs: 5 x (A, 30, A, 900 idle) FIGHT -> first-move turns. The player lead is a Soundproof Voltorb / Electrode
(slot 0, Splash x4) so Perish Song never counts the player down and no player faint / forced party menu (ResetSpriteData, which drops
the probe's earlier rows) follows; the opponent's own count reaches 0 at the turn-4 selection, where ShouldSwitchIfPerishSong
(battle_ai_switch_items.c:20-28) switches. Variants: the perished opponent lead Misdreavus 200 / Lapras 131. Every job twice fresh.
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = Path("tools/battle-lab/mechanic-factory-ai-switch-receipt-c2-perish-off.json")
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
JOBS = [
    ("AI_SWITCH", "aisw-voltorb-misdreavus", (100, "genderless"), (200, "female")),
    ("AI_SWITCH", "aisw-electrode-misdreavus", (101, "genderless"), (200, "female")),
    ("AI_SWITCH", "aisw-voltorb-lapras", (100, "genderless"), (131, "female")),
]


def scenario(out: Path, job) -> Path:
    _, ident, (pspecies, pgender), (ospecies, ogender) = job
    data = json.loads(BASE.read_text())
    data["profile"] = "battle-scene-on"
    data["trace"] = {"segments": [dict(seg) for _ in range(5) for seg in TURN]}
    data["overrides"]["parties"]["player"][0].update(species=pspecies, gender=pgender, abilitySlot=0)
    data["overrides"]["parties"]["opponent"][0].update(species=ospecies, gender=ogender)
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
                    "195", str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
