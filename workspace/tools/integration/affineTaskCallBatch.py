#!/usr/bin/env python3
"""Run affineTaskCallProbe.py twice (fresh processes) for every S10A allocator-plan-v2 scenario and the Factory route bodies, 8 at a time.

usage: affineTaskCallBatch.py [name ...]
Outputs tools/integration/fixtures/affine-task/calls/<name>.json (run 0); run 1 must be byte-identical or the job fails.
"""
import subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from affineTaskBatch import MOVES, LAB  # noqa: E402

OUT = ROOT / "tools/integration/fixtures/affine-task/calls"
JOBS = [("factory-battle1-turn1-mv104", ["factory", "tools/compare/traces-groundtruth/battle1-turn1.json", "104"]),
        ("factory-battle1-turn1-mv157", ["factory", "tools/compare/traces-groundtruth/battle1-turn1.json", "157"])]
for mid, slugs in MOVES.items():
    for s in slugs:
        name = Path(s).name.lstrip("@")
        JOBS.append((name, ["lab", str(mid), f"{s[1:]}.json" if s[0] == "@" else f"{LAB}{s}.json"]))
only = set(sys.argv[1:])
tmp = Path(tempfile.mkdtemp(prefix="affine-calls-"))


def run(job):
    name, args = job
    outs = []
    for i in (0, 1):
        out = tmp / f"{name}-{i}.json"
        cmd = [sys.executable, "tools/run-mgba-probe.py", "--log", str(out) + ".log", str(out), "--", "python3", "tools/compare/affineTaskCallProbe.py", *args, str(out)]
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            return name, f"FAIL run{i}: {(r.stderr or r.stdout).strip()[-300:]}"
        outs.append(out)
    if outs[0].read_bytes() != outs[1].read_bytes():
        return name, "NOT IDENTICAL"
    (OUT / f"{name}.json").write_bytes(outs[0].read_bytes())
    return name, "ok (2 identical runs)"


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(8) as ex:
        for name, status in ex.map(run, [j for j in JOBS if not only or j[0] in only]):
            print(name, status, flush=True)
