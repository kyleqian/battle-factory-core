#!/usr/bin/env python3
"""Run affineTaskProbe.py twice (fresh processes) for the factory traces and every S10A allocator-plan-v2 scenario, 4 at a time.

usage: affineTaskBatch.py [name ...]     (default: all jobs)
Raw outputs: tools/integration/fixtures/affine-task/raw/<name>-{0,1}.json (via tools/run-mgba-probe.py, direct mGBA).
"""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/affine-task/raw"
LAB = "tools/battle-lab/mechanic-"
MOVES = {62: ["aurora-beam-player-seadra-opponent-onix", "aurora-beam-opponent-seadra-player-onix"],
         218: ["frustration-player-furret-opponent-onix", "frustration-opponent-furret-player-onix"],
         32: ["horn-drill-player-seaking-opponent-onix", "horn-drill-opponent-seaking-player-onix"],
         13: ["razor-wind-player-nuzleaf-opponent-onix", "razor-wind-opponent-nuzleaf-player-onix"],
         350: ["rock-blast-player-rhyhorn-opponent-shuckle", "rock-blast-opponent-rhyhorn-player-shuckle"],
         69: ["seismic-toss-player-kecleon-opponent-onix", "seismic-toss-opponent-kecleon-player-onix"],
         254: ["stockpile-player-pelipper-opponent-delcatty", "stockpile-opponent-pelipper-player-delcatty"],
         129: ["swift-player-staryu-opponent-onix", "swift-opponent-staryu-player-onix"],
         85: ["thunderbolt-player-delcatty-opponent-shuckle", "thunderbolt-opponent-delcatty-player-shuckle"],
         271: ["@tools/compare/fixtures/trick-player-furret-opponent-chansey", "@tools/compare/fixtures/trick-opponent-furret-player-chansey"],
         253: ["uproar-player-vigoroth-opponent-onix", "uproar-opponent-vigoroth-player-onix"],
         192: ["zap-cannon-player-forretress-opponent-shuckle", "zap-cannon-opponent-forretress-player-shuckle"]}
JOBS = [("factory-battle1-turn1", ["factory", "tools/compare/traces-groundtruth/battle1-turn1.json"]),
        ("factory-battle1-turn1-varB", ["factory", "tools/integration/fixtures/sprite-order-factory-traces/battle1-turn1-varB.json"])]
for mid, slugs in MOVES.items():
    for s in slugs:
        JOBS.append((Path(s).name if s[0] == "@" else s, ["lab", str(mid), f"{s[1:]}.json" if s[0] == "@" else f"{LAB}{s}.json"]))
only = set(sys.argv[1:])


def run(job):
    name, args = job
    for i in (0, 1):
        out = RAW / f"{name}-{i}.json"
        cmd = [sys.executable, "tools/run-mgba-probe.py", "--log", f"/tmp/affine-task-logs/{name}-{i}.log", str(out), "--", "python3", "tools/compare/affineTaskProbe.py", *args, str(out)]
        if args[0] == "factory":
            cmd.append(name)
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            return name, f"FAIL run{i}: {(r.stderr or r.stdout).strip()[-300:]}"
    return name, "ok"


if __name__ == "__main__":
    RAW.mkdir(parents=True, exist_ok=True)
    Path("/tmp/affine-task-logs").mkdir(exist_ok=True)
    jobs = [j for j in JOBS if not only or j[0] in only]
    with ThreadPoolExecutor(4) as ex:
        for name, status in ex.map(run, jobs):
            print(name, status, flush=True)
