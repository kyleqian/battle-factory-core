#!/usr/bin/env python3
"""Extension of allocatorNetZeroBatch.py (raw -> allocator-net-zero-ext-raw/, skips "_" keys).
Runs allocatorNetZeroProbe.py twice (fresh processes) per job, 4 at a time.

usage: allocatorNetZeroExtBatch.py <manifest.json> [move-id ...]
Needs the mGBA venv: PYTHONPATH=<vendor>/libmgba-py <vendor>/mgba-venv/bin/python (see doc).
Raw outputs: tools/integration/fixtures/allocator-net-zero-ext-raw/<move>-<scenario-stem>-{0,1}.json
"""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/allocator-net-zero-ext-raw"
manifest = json.loads(Path(sys.argv[1]).read_text())
only = set(sys.argv[2:])
jobs, seen = [], set()
for mid, entry in manifest.items():
    if mid.startswith("_"):
        continue
    if only and mid not in only:
        continue
    for fx in entry["fixtures"]:
        key = (mid, fx["scenario"])
        if key not in seen:
            seen.add(key)
            jobs.append((mid, fx["scenario"]))
RAW.mkdir(parents=True, exist_ok=True)


def run(job):
    mid, scenario = job
    stem = Path(scenario).stem
    for i in (0, 1):
        out = RAW / f"{mid}-{stem}-{i}.json"
        r = subprocess.run([sys.executable, str(ROOT / "tools/compare/allocatorNetZeroProbe.py"), mid, scenario, str(out)],
                           cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            (RAW / f"{mid}-{stem}-{i}.error.txt").write_text(r.stderr[-1500:])
            return job, f"FAIL run{i}: {r.stderr.strip().splitlines()[-1:]}"
    return job, "ok"


with ThreadPoolExecutor(4) as ex:
    for job, status in ex.map(run, jobs):
        print(job[0], Path(job[1]).stem, status, flush=True)
