#!/usr/bin/env python3
"""Run spriteOrderProbe.py twice (fresh processes) per job, 4 at a time.

usage: spriteOrderBatch.py [--shard i/n] [--list]
Jobs = every (move, scenario) of allocator-net-zero-manifest.json (audited scenarios) plus the
"needs order" moves of NEEDS below. Needs the mGBA venv (PYTHONPATH=<vendor>/libmgba-py, vendor python).
Raw: tools/integration/fixtures/sprite-order-raw/<move>-<scenario-stem>-{0,1}.json
"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/sprite-order-raw"
B = "tools/battle-lab/mechanic-"
# move id -> scenarios of moves whose adapters need sSpriteOrder (accepted source fixtures' scenarios)
NEEDS = {
    53: [B + "flamethrower-player-onix-opponent-murkrow.json", B + "flamethrower-opponent-onix-player-murkrow.json"],
    299: [B + "blaze-kick-player-onix-opponent-murkrow.json", B + "blaze-kick-opponent-onix-player-murkrow.json"],
    189: [B + "mud-slap-pidgeotto-onix.json", B + "mud-slap-player-pidgeotto-onix.json"],
    88: [B + "rock-throw-player-graveler-opponent-onix.json", B + "rock-throw-opponent-graveler-player-onix.json"],
    28: [B + "sand-attack-pidgeotto-onix.json", B + "sand-attack-player-pidgeotto-onix.json"],
    241: [B + "sunny-day-player-bellossom-opponent-onix.json", B + "sunny-day-opponent-bellossom-player-onix.json"],
    222: [B + "magnitude-regular-player-graveler-opponent-onix.json", B + "magnitude-regular-opponent-graveler-player-onix.json",
          B + "magnitude-intense-player-camerupt-opponent-onix.json", B + "magnitude-intense-opponent-camerupt-player-onix.json"],
    291: [B + "dive-player-chinchou-opponent-onix.json", B + "dive-opponent-chinchou-player-onix.json"],
    62: [B + "aurora-beam-player-seadra-opponent-onix.json", B + "aurora-beam-opponent-seadra-player-onix.json"],
    63: [B + "hyper-beam-player-aerodactyl-opponent-onix.json", B + "hyper-beam-opponent-aerodactyl-player-onix.json"],
    161: [B + "tri-attack-player-porygon-opponent-shuckle.json", B + "tri-attack-opponent-porygon-player-shuckle.json"],
    323: [B + "water-spout-player-wailmer-opponent-shuckle.json", B + "water-spout-opponent-wailmer-player-shuckle.json"],
    72: [B + "mega-drain-player-skiploom-opponent-onix.json", B + "mega-drain-opponent-skiploom-player-onix.json"],
    138: [B + "dream-eater-player-wigglytuff-opponent-onix.json", B + "dream-eater-opponent-wigglytuff-player-onix.json"],
    202: [B + "giga-drain-player-roselia-opponent-onix.json", B + "giga-drain-opponent-roselia-player-onix.json"],
    288: [B + "grudge-player-haunter-opponent-onix.json", B + "grudge-opponent-haunter-player-onix.json"],
    228: [B + "pursuit-player-beedrill-opponent-shuckle.json", B + "pursuit-opponent-beedrill-player-shuckle.json"],
    229: [B + "rapid-spin-player-wartortle-opponent-onix.json", B + "rapid-spin-opponent-wartortle-player-onix.json"],
    253: [B + "uproar-player-vigoroth-opponent-onix.json", B + "uproar-opponent-vigoroth-player-onix.json"],
}


def jobs():
    manifest = json.loads((ROOT / "tools/integration/fixtures/allocator-net-zero-manifest.json").read_text())
    out, seen = [], set()
    def add(mid, sc):
        if (mid, sc) not in seen and (ROOT / sc).is_file():
            seen.add((mid, sc)); out.append((str(mid), sc))
    for mid, entry in manifest.items():
        for fx in entry["fixtures"]:
            add(int(mid), fx["scenario"])
    for mid, scs in NEEDS.items():
        for sc in scs:
            add(mid, sc)
    return out


def run(job):
    mid, scenario = job
    stem = Path(scenario).stem
    for i in (0, 1):
        out = RAW / f"{mid}-{stem}-{i}.json"
        r = subprocess.run([sys.executable, str(ROOT / "tools/compare/spriteOrderProbe.py"), mid, scenario, str(out)],
                           cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            return job, f"FAIL run{i}: {r.stderr.strip().splitlines()[-1:]}"
    return job, "ok"


if __name__ == "__main__":
    js = jobs()
    if "--list" in sys.argv:
        print(len(js)); sys.exit(0)
    if "--shard" in sys.argv:
        i, n = map(int, sys.argv[sys.argv.index("--shard") + 1].split("/"))
        js = js[i::n]
    RAW.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(4) as ex:
        for job, status in ex.map(run, js):
            print(job[0], Path(job[1]).stem, status, flush=True)
