#!/usr/bin/env python3
"""Runs tools/compare/spriteOrderEventProbe.py (direct mGBA, Scene ON, single fresh run each) for the order-consumer target scenarios that
have no committed raw rows in sprite-order-event-raw/ (Ember, Dragon Rage, Heal Bell, Perish Song, Leaf Blade, Magnitude, Rock Throw/Flamethrower... already committed are skipped).
usage (from workspace/, mGBA venv): orderConsumerEventBatch.py   -> tools/integration/fixtures/order-consumer-raw/<move>-<stem>-0.json"""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/integration/fixtures/order-consumer-raw"; OUT.mkdir(exist_ok=True)
EXIST = ROOT / "tools/integration/fixtures/sprite-order-event-raw"
M = "tools/battle-lab/mechanic-"
JOBS = [(52, "ember-player-onix-opponent-murkrow"), (52, "ember-opponent-onix-player-murkrow"),
        (82, "dragon-rage-charmeleon-onix"), (82, "dragon-rage-onix-charmeleon"),
        (215, "heal-bell-player-chimecho-opponent-onix"), (215, "heal-bell-opponent-chimecho-player-onix"),
        (195, "perish-song-player-murkrow-opponent-onix"), (195, "perish-song-opponent-murkrow-player-onix"),
        (348, "leaf-blade-player-sceptile-opponent-onix"), (348, "leaf-blade-opponent-sceptile-player-onix"),
        (222, "magnitude-regular-player-graveler-opponent-onix"), (222, "magnitude-regular-opponent-graveler-player-onix"),
        (222, "magnitude-intense-player-camerupt-opponent-onix"), (222, "magnitude-intense-opponent-camerupt-player-onix")]
def run(j):
    mid, stem = j
    out = OUT / f"{mid}-mechanic-{stem}-0.json"
    if (EXIST / out.name).exists() or out.exists(): return
    subprocess.run([sys.executable, "tools/compare/spriteOrderEventProbe.py", str(mid), f"{M}{stem}.json", str(out)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, JOBS))
print(sorted(p.name for p in OUT.glob("*.json")))
