#!/usr/bin/env python3
"""prep64: SUBSTITUTE_FADE stagings, every job twice in separate fresh mGBA processes (never the HTTP oracles).

usage (from workspace/, PYTHONPATH = the libmgba-py checkout): prep64Probes.py <out-dir> [--jobs J=10] [--only <id,...>] [--netzero]
Job = (id, profile, base tools/battle-lab scenario, ops). ops (in order): ("species", side, sp) the side's lead species;
("moves", side, mv) the lead's moves = 4x mv; ("seed", n) the lab seed (explicit on every job, ISSUES #154); ("extend", N) N idle
frames; ("presses", K) K x (B for 2 frames, 120 idle frames): advances battle messages that wait for a button.
Variants are written to <out-dir>/scenarios/<id>.json; raw/<id>-A.json and -B.json come from prep64Probe.py (sprite order +
Substitute / battle-script state), or with --netzero raw-nz/<id>-A.json / -B.json from prep64NetZeroProbe.py (aud56's allocator
net-zero probe: OBJ slots, tile allocator, palette tags, matrices per script interval).
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LAB = Path("tools/battle-lab")
ON, OFF = "battle-scene-on", "battle-scene-off"
OU_O = "mechanic-outrage-opponent-dragonite-player-onix"  # plans51's player-side sf-* base (opponent Dragonite's Outrage)
P37_PLY, P37_OPP = "prep37-on-player-persian-slowbro", "prep37-on-opponent-persian-slowbro"
P37_GOLBAT = "prep37-on-opponent-golbat-slowbro"
SEED37 = 305419897  # prep37's pinned lab seed
JOBS = [
    # plans51's sf-ply-169 staging unchanged (Crobat 169 subs, Dragonite's Outrage breaks it; no button input after the menu),
    # then the same staging with B presses after the turn: does the fade follow once the waiting message is advanced?
    ("s51-ply-169", ON, OU_O, (("species", "player", 169), ("moves", "player", 164), ("seed", 305420202), ("extend", 1200))),
    ("s51b-ply-169", ON, OU_O, (("species", "player", 169), ("moves", "player", 164), ("seed", 305420202), ("presses", 16))),
    # prep37's stagings (the doll breaks on Slowbro / Persian's 3rd Tackle; four B presses after every turn), both scenes
]
for prof in (ON, OFF):
    tag = prof.split("-")[-1]
    JOBS += [
        (f"ply-persian-{tag}", prof, P37_PLY, (("seed", SEED37),)),
        (f"ply-golbat-{tag}", prof, P37_PLY, (("species", "player", 42), ("seed", SEED37))),
        (f"opp-persian-{tag}", prof, P37_OPP, (("seed", SEED37),)),
        (f"opp-golbat-{tag}", prof, P37_GOLBAT, (("seed", SEED37),)),
    ]


def scenario(out: Path, job) -> Path:
    ident, profile, base, ops = job
    data = json.loads((LAB / f"{base}.json").read_text())
    data["profile"] = profile
    for op in ops:
        if op[0] == "species":
            data["overrides"]["parties"][op[1]][0]["species"] = op[2]
        elif op[0] == "moves":
            data["overrides"]["parties"][op[1]][0]["moves"] = [op[2]] * 4
        elif op[0] == "seed":
            data["seed"] = op[1]
        elif op[0] == "extend":
            data["trace"]["segments"].append({"frames": op[1], "buttons": []})
        elif op[0] == "presses":
            for _ in range(op[1]):
                data["trace"]["segments"] += [{"frames": 2, "buttons": ["B"]}, {"frames": 120, "buttons": []}]
        else:
            raise SystemExit(f"unknown op {op}")
    target = out / "scenarios" / f"{ident}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    return target


def run(args):
    out, job, run_id, netzero = args
    ident, profile = job[0], job[1]
    sc = scenario(out, job)
    dest = out / ("raw-nz" if netzero else "raw") / f"{ident}-{run_id}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        raise SystemExit(f"{dest} exists: use a fresh <out-dir>")
    subprocess.run([sys.executable, "tools/run-mgba-probe.py", str(dest), "--", sys.executable, "tools/integration/" + ("prep64NetZeroProbe.py" if netzero else "prep64Probe.py"),
                    profile, str(sc), str(dest)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return ident, run_id, dest.exists()


if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 10
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    netzero = "--netzero" in argv
    selected = [j for j in JOBS if only is None or j[0] in only]
    for job in selected:
        scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(run, [(out, j, r, netzero) for j in selected for r in ("A", "B")]))
    missing = [f"{i}-{r}" for i, r, ok in results if not ok]
    print(len(results), "probe runs;", "missing:", missing or "none")
