#!/usr/bin/env python3
"""Stage legal mechanicLab scenarios and run statusAnimationSpriteProbe.py twice fresh per scenario (<=4 concurrent).

usage: statusAnimationSpriteBatch.py <rawdir> [--runs 2] [--only id,id] [--manifest] [--seeds first:count]
Scenarios are existing tools/battle-lab/mechanic-*.json (complete legal parties, four identical opponent slots) with
EXTRA_TURNS additional A,A turns appended so turn-end/next-turn status animations are reachable.  Seeds are the
scenario's own unless a manifest entry sets one.  Nothing is injected.
"""
import hashlib, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PY = "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python"
PYTHONPATH = "/Users/kyle/Developer/pokebench/vendor/libmgba-py"
PROBE = ROOT / "tools/integration/statusAnimationSpriteProbe.py"
BATTLE_LAB = ROOT / "tools/battle-lab"
EXTRA_TURNS = 2
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]

# freeze is a 10% Ice Beam chance: the seed sweep (--seeds 305419955:40) found 9/40 seeds freezing; this one is pinned
SEEDS = {"frz-ice-beam-by-player": 305419958}


def entries():
    pairs = [
        ("psn-toxic", "PSN", "toxic-{o}-clamperl-{x}-onix"),
        ("confusion-confuse-ray", "CONFUSION", "confuse-ray-{o}-chinchou-{x}-onix"),
        ("brn-will-o-wisp", "BRN", "will-o-wisp-{o}-shuppet-{x}-shuckle"),
        ("infatuation-attract", "INFATUATION", "attract-{o}-eevee-{x}-onix"),
        ("slp-hypnosis", "SLP", "hypnosis-{o}-politoed-{x}-onix"),
        ("slp-spore", "SLP", "spore-{o}-parasect-{x}-onix"),
        ("prz-thunder-wave", "PRZ", "thunder-wave-{o}-flaaffy-{x}-shuckle"),
        ("frz-ice-beam", "FRZ", "ice-beam-{o}-delcatty-{x}-shuckle"),
        ("cursed-curse", "CURSED", "curse-ghost-{o}-haunter-{x}-magikarp"),
        ("nightmare", "NIGHTMARE", "nightmare-{o}-haunter-{x}-shuckle"),
        ("wrapped-wrap", "WRAPPED", "wrap-{o}-tentacool-{x}-onix"),
        ("wrapped-fire-spin", "WRAPPED", "fire-spin-{o}-charmeleon-{x}-onix"),
        ("wrapped-bind", "WRAPPED", "bind-{o}-onix-{x}-murkrow"),
    ]
    out = []
    for pid, status, pat in pairs:
        for o, x in (("player", "opponent"), ("opponent", "player")):
            # scenario names are "<move>-<attackerside>-<species>-<otherside>-<species>"; both orientations exist as files
            name = pat.format(o=o, x=x)
            if not (BATTLE_LAB / f"mechanic-{name}.json").is_file():
                # bind names the carrier first, wrap/etc. alphabetical orientation differs: try swapped
                alt = pat.format(o=x, x=o)
                name = alt if (BATTLE_LAB / f"mechanic-{alt}.json").is_file() else name
            e = {"id": f"{pid}-by-{o}", "status": status, "carrierSide": o, "source": f"tools/battle-lab/mechanic-{name}.json"}
            if e["id"] in SEEDS:
                e["seed"] = SEEDS[e["id"]]
            out.append(e)
    return out


def stage(e, rawdir):
    d = json.loads((ROOT / e["source"]).read_text())
    segs = d["trace"]["segments"] + TURN * EXTRA_TURNS
    d["trace"] = {"segments": segs, "captureFrames": [0, sum(s["frames"] for s in segs)]}
    if "seed" in e:
        d["seed"] = e["seed"]
    p = rawdir / "scenarios" / f"{e['id']}.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, separators=(",", ":")) + "\n")
    return p


def main():
    rawdir = Path(sys.argv[1])
    runs = int(sys.argv[sys.argv.index("--runs") + 1]) if "--runs" in sys.argv else 2
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    es = [e for e in entries() if not only or e["id"] in only]
    if "--seeds" in sys.argv:  # seed sweep for chance-driven statuses (freeze): <first>:<count>
        first, count = map(int, sys.argv[sys.argv.index("--seeds") + 1].split(":"))
        es = [{**e, "id": f"{e['id']}-s{sd}", "seed": sd} for e in es for sd in range(first, first + count)]
    if "--manifest" in sys.argv:
        print(json.dumps(es, indent=1)); return
    jobs = []
    for e in es:
        sc = stage(e, rawdir)
        for r in range(runs):
            jobs.append((e["id"], r, sc, rawdir / f"{e['id']}-{r}.json"))
    env = {**os.environ, "PYTHONPATH": PYTHONPATH}
    running = []
    def reap(block):
        for p, j in list(running):
            if p.poll() is None and not block:
                continue
            p.wait()
            running.remove((p, j))
            print(j[0], j[1], "rc", p.returncode, flush=True)
            return
    for j in jobs:
        while len(running) >= 4:
            reap(True)
        log = open(rawdir / "logs" / f"{j[0]}-{j[1]}.log", "wb") if (rawdir / "logs").mkdir(exist_ok=True) is None else None
        p = subprocess.Popen([PY, str(PROBE), str(j[2]), str(j[3])], env=env, stdout=log, stderr=subprocess.STDOUT)
        running.append((p, j))
    while running:
        reap(True)


if __name__ == "__main__":
    main()
