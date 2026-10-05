#!/usr/bin/env python3
"""Generate gap-cause BattleLab scenarios, run the call-stream probe on them (direct mGBA) and summarise.

usage: spriteOrderGapCauses.py gen                 write tools/integration/fixtures/gap-cause-scenarios/*.json
       spriteOrderGapCauses.py run [names...]      run tools/compare/spriteOrderGapCallProbe.py on each (outputs under $OUT, default /tmp/gapcalls)
       spriteOrderGapCauses.py summarize [names..] print per-scenario origin summary from $OUT
Summaries classify every allocator call by its source origin (symbolized caller LR) and list the transient blips
(DoHitAnimHealthboxEffect) and cursor pairs (DoBounceEffect) with the battle context at creation.
"""
from __future__ import annotations
import copy, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCEN = ROOT / "tools/integration/fixtures/gap-cause-scenarios"
OUT = Path(os.environ.get("OUT", "/tmp/gapcalls"))
BASE = ROOT / "tools/battle-lab/mechanic-night-shade-opponent-ariados-player-onix.json"
PROBE = ROOT / "tools/compare/spriteOrderGapCallProbe.py"
PY = os.environ.get("PY", "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")

# name: (player species, player move, opponent species, opponent move, seed, frames)
VARIANTS = {
    "tackle-both": (95, 33, 168, 33, 305419897, 700),
    "tackle-vs-ghost": (95, 33, 92, 33, 305419897, 700),
    "growl-leer": (95, 45, 168, 43, 305419897, 700),
    "thunderwave-vs-ground": (95, 86, 168, 43, 305419897, 700),
    "splash-tackle": (129, 150, 168, 33, 305419897, 700),
    "substitute-then-tackle": (168, 164, 95, 33, 305419897, 700),
    "swords-dance-tackle": (168, 14, 95, 33, 305419897, 700),
    "tackle-vs-substitute-faster": (95, 33, 168, 164, 305419897, 700),
}
for seed in (1, 2, 3, 4, 5, 6):
    VARIANTS[f"thunder-seed{seed}"] = (95, 87, 168, 33, seed, 700)


def gen() -> None:
    base = json.loads(BASE.read_text())
    SCEN.mkdir(parents=True, exist_ok=True)
    for name, (ps, pm, os_, om, seed, frames) in VARIANTS.items():
        d = copy.deepcopy(base)
        d["seed"] = seed
        p, o = d["overrides"]["parties"]["player"][0], d["overrides"]["parties"]["opponent"][0]
        p["species"], p["moves"] = ps, [pm] * 4
        o["species"], o["moves"] = os_, [om] * 4
        d["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
                                   {"frames": 2, "buttons": ["A"]}, {"frames": frames, "buttons": []}],
                      "captureFrames": [0, frames + 34]}
        (SCEN / f"{name}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
    print(f"wrote {len(VARIANTS)} scenarios to {SCEN}")


def scenario_path(name: str) -> Path:
    for c in (SCEN / f"{name}.json", ROOT / "tools/battle-lab" / f"{name}.json"):
        if c.is_file():
            return c
    raise SystemExit(f"no scenario {name}")


def run(names: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PYTHONPATH="/Users/kyle/Developer/pokebench/vendor/libmgba-py")
    for n in names:
        r = subprocess.run([PY, str(PROBE), str(scenario_path(n)), str(OUT / f"{n}.json")], env=env,
                           capture_output=True, text=True)
        print(n, (r.stdout.strip().splitlines() or ["<none>"])[-1][-120:], "rc", r.returncode, flush=True)


INTERNAL = ("CreateSprite", "CreateSpriteAt", "CreateSpriteAtEnd")


def origin(c: dict) -> str:
    return c["caller"].split("+")[0]


def summarize(names: list[str], quiet: bool = False) -> dict:
    """Per scenario: hit-anim blips (create/destroy frame, target battler, move, result flags, hp) and cursor-pair cycles."""
    result = {}
    for n in names:
        d = json.loads((OUT / f"{n}.json").read_text())
        calls = [c for c in d["calls"] if c["n"] > d["resetFrame"]]
        blips, cursors, other = [], [], {}
        open_blips = []
        for c in calls:
            k = c["kind"]
            if k == "marker:DoHitAnimHealthboxEffect":
                blips.append({"create": c["n"], "caller": c["caller"], "battler": c["r0"], "move": c["ctx"]["curMove"],
                              "resultFlags": c["ctx"]["resultFlags"], "attacker": c["ctx"]["attacker"], "target": c["ctx"]["target"],
                              "hpBefore": c["ctx"]["hp"], "mainFunc": c["ctx"]["mainFunc"], "destroy": None})
                open_blips.append(blips[-1])
            elif k == "DestroySprite" and "SpriteCB_HitAnimHealthoxEffect" in c["victim"]["cb"]:
                b = open_blips.pop(0)
                b["destroy"], b["destroyCaller"], b["life"] = c["n"], c["caller"], c["n"] - b["create"]
            elif k == "marker:DoBounceEffect":
                cursors.append({"n": c["n"], "caller": c["caller"], "battler": c["r0"], "mainFunc": c["ctx"]["mainFunc"]})
            elif k != "DestroySprite" and not k.startswith("marker:") and c["caller"].split("+")[0] not in INTERNAL:
                key = c["caller"].split("+")[0]
                other[key] = other.get(key, 0) + 1
        result[n] = {"resetFrame": d["resetFrame"], "blips": blips, "cursorCalls": cursors, "creatorsByFunction": other}
        if not quiet:
            print("==", n, "blips", len(blips), "cursorCalls", len(cursors))
            for b in blips:
                print("  blip", b["create"], "->", b["destroy"], "life", b.get("life"), "btl", b["battler"], "mv", b["move"], "rf", b["resultFlags"], b["caller"], b["hpBefore"])
    return result


if __name__ == "__main__":
    cmd, names = sys.argv[1], sys.argv[2:]
    if cmd == "gen":
        gen()
    elif cmd == "run":
        run(names or list(VARIANTS))
    elif cmd == "summarize":
        summarize(names or list(VARIANTS))
