#!/usr/bin/env python3
"""Cross-body corpus: run affineTaskProbe.py twice (fresh processes) on every scenario of allocator-net-zero-manifest.json.

usage: affineTaskCorpusBatch.py [--workers N]
Both runs must be byte-identical; only the analyzer summary of run 0 is stored (no raw files, keeps the fixtures small):
tools/integration/fixtures/affine-task/corpus-summary.json = {"<move>/<scenario stem>": {"identical": bool, "bodies": [...analyze rows...]}}
"""
import json, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from affineTaskAnalyze import analyse  # noqa: E402

manifest = json.loads((ROOT / "tools/integration/fixtures/allocator-net-zero-manifest.json").read_text())
jobs, seen = [], set()
for mid, e in manifest.items():
    for fx in e["fixtures"]:
        if fx["scenario"] not in seen:
            seen.add(fx["scenario"]); jobs.append((mid, e["name"], fx["scenario"]))
tmp = Path(tempfile.mkdtemp(prefix="affine-corpus-"))


def run(job):
    mid, name, sc = job
    outs = []
    for i in (0, 1):
        out = tmp / f"{mid}-{Path(sc).stem}-{i}.json"
        r = subprocess.run([sys.executable, "tools/run-mgba-probe.py", "--log", str(out) + ".log", str(out), "--", "python3",
                            "tools/compare/affineTaskProbe.py", "lab", mid, sc, str(out)], cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            return job, {"error": (r.stderr or r.stdout)[-300:]}
        outs.append(out)
    a, b = outs[0].read_bytes(), outs[1].read_bytes()
    raw = json.loads(a)
    bodies = analyse(raw)
    for x in bodies:  # keep it compact: drop per-event lists beyond counts
        x["eventCount"] = len(x.pop("events")); x["postFallEventCount"] = len(x["postFallEvents"])
    return job, {"identical": a == b, "name": name, "scenario": sc, "bodies": bodies}


if __name__ == "__main__":
    workers = int(sys.argv[sys.argv.index("--workers") + 1]) if "--workers" in sys.argv else 4
    res = {}
    with ThreadPoolExecutor(workers) as ex:
        for job, r in ex.map(run, jobs):
            res[f"{job[0]}/{Path(job[2]).stem}"] = r
            print(job[0], job[1], "ok" if "error" not in r and r["identical"] else r, flush=True)
    Path(ROOT / "tools/integration/fixtures/affine-task/corpus-summary.json").write_text(json.dumps(res, separators=(",", ":")) + "\n")
