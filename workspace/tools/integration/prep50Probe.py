#!/usr/bin/env python3
"""prep50: status-animation allocator net-zero probes (docs/next-adapters-prep50.md).

usage: prep50Probe.py <out-dir> [--jobs N]
Runs tools/integration/prep50StatusProbe.py twice in fresh processes per (status label, scenario) into
<out-dir>/raw/<label>-<scenario-stem>-{0,1}.json. Scenarios are EXISTING accepted Scene ON battle-lab scenarios (no staging);
the afflicted battler (side, species) is named per row. Direct mGBA only (never the HTTP oracles). Needs the mGBA venv:
PYTHONPATH=<vendor>/libmgba-py, run with <vendor>/mgba-venv/bin/python.
"""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "tools/battle-lab"
# Census greedy order (fixtures/prep50/chains-before-seeds0-299.json): SLP, CONFUSION, PSN, (FUTURE SIGHT), PRZ, BRN.
JOBS = [
    ("Status_Sleep", "mechanic-lovely-kiss-player-jynx-opponent-onix"), ("Status_Sleep", "mechanic-lovely-kiss-opponent-jynx-player-onix"),
    ("Status_Sleep", "mechanic-hypnosis-player-politoed-opponent-onix"), ("Status_Sleep", "mechanic-hypnosis-opponent-politoed-player-onix"),
    ("Status_Sleep", "mechanic-snore-player-sealeo-opponent-venomoth"), ("Status_Sleep", "mechanic-snore-opponent-sealeo-player-venomoth"),
    ("Status_Sleep", "mechanic-rest-player-teddiursa-opponent-onix"), ("Status_Sleep", "mechanic-rest-opponent-teddiursa-player-onix"),
    ("Status_Confusion", "mechanic-confuse-ray-player-chinchou-opponent-onix"), ("Status_Confusion", "mechanic-confuse-ray-opponent-chinchou-player-onix"),
    ("Status_Confusion", "mechanic-petal-dance-player-gloom-opponent-onix"), ("Status_Confusion", "mechanic-petal-dance-opponent-gloom-player-onix"),
    ("Status_Confusion", "mechanic-outrage-player-dragonite-opponent-onix"), ("Status_Confusion", "mechanic-outrage-opponent-dragonite-player-onix"),
    ("Status_Confusion", "mechanic-supersonic-player-loudred-opponent-onix"), ("Status_Confusion", "mechanic-supersonic-opponent-loudred-player-onix"),
    ("Status_Confusion", "mechanic-sweet-kiss-player-luvdisc-opponent-onix"), ("Status_Confusion", "mechanic-sweet-kiss-opponent-luvdisc-player-onix"),
    ("Status_Confusion", "prep11-audit-golem-next-teeter-dance-player"), ("Status_Confusion", "prep12-thrash-alt-snorlax-golem"),
    ("Status_Poison", "mechanic-toxic-player-clamperl-opponent-onix"), ("Status_Poison", "mechanic-toxic-opponent-clamperl-player-onix"),
    ("Status_Poison", "mechanic-water-spout-tiers-player-wailmer-opponent-shuckle-toxic"),
    ("Status_Poison", "mechanic-water-spout-tiers-opponent-wailmer-player-shuckle-toxic"),
    ("Status_Poison", "mechanic-sludge-player-grimer-opponent-onix"), ("Status_Poison", "mechanic-sludge-opponent-grimer-player-onix"),
    ("Status_Paralysis", "mechanic-stun-spore-player-hoppip-opponent-onix"), ("Status_Paralysis", "mechanic-stun-spore-opponent-hoppip-player-onix"),
    ("Status_Paralysis", "mechanic-thunder-wave-player-flaaffy-opponent-shuckle"), ("Status_Paralysis", "mechanic-thunder-wave-opponent-flaaffy-player-shuckle"),
    ("Status_Paralysis", "mechanic-glare-player-dunsparce-opponent-shuckle"), ("Status_Paralysis", "mechanic-glare-opponent-dunsparce-player-shuckle"),
    ("Status_Burn", "mechanic-will-o-wisp-player-shuppet-opponent-shuckle"), ("Status_Burn", "mechanic-will-o-wisp-opponent-shuppet-player-shuckle"),
    ("Status_Burn", "prep18-will-o-wisp-alt-banette-golem"),
]


def run(job):
    label, stem = job
    out = []
    for k in (0, 1):
        path = Path(sys.argv[1]) / "raw" / f"{label}-{stem}-{k}.json"
        rc = subprocess.run([sys.executable, str(ROOT / "tools/integration/prep50StatusProbe.py"), label, str(LAB / f"{stem}.json"),
                             str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode
        out.append(f"{rc}" if path.is_file() else f"{rc} missing")
    return f"{label} {stem}: rc {out} " + ("ok" if all(o in ("0", "138", "139") for o in out) else "FAIL")


if __name__ == "__main__":
    jobs = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 8
    with ThreadPoolExecutor(jobs) as ex:
        for line in ex.map(run, JOBS):
            print(line, flush=True)
