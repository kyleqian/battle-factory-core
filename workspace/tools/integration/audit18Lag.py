#!/usr/bin/env python3
"""Live audit 18: LAG-FRAME counters for every consumer window. issue151Counters.sh's method (speciesAudit2Counters.py: main-loop pass
counter = playTimeVBlanks with PlayTimeCounter forced on; a lag frame = a frame with no pass), but 2 fresh direct-mGBA processes per
SCENARIO (not per fixture); each window's lag ages are read from that scenario's run. Prints one line per window: r1 == r2 and lag ages.
usage: audit18Lag.py <fixture-dir> <out-dir>   (AUDIT18_JOBS, default 8)"""
import hashlib, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

fx_dir, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
py = os.environ.get("PY", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")
env = {**os.environ, "PYTHONPATH": os.environ.get("PYTHONPATH", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/libmgba-py")}
fixtures = {p.stem: json.loads(p.read_text()) for p in sorted(fx_dir.glob("*.json"))}
scenarios = sorted({f["scenario"] for f in fixtures.values()})


def run(job: tuple[str, int]) -> None:
    scen, r = job
    dst = out / f"{Path(scen).stem}.run{r}.json"
    subprocess.run(["python3", "tools/run-mgba-probe.py", str(dst), "--", py, "tools/integration/speciesAudit2Counters.py", scen, str(dst)],
                   env=env, capture_output=True)


with ThreadPoolExecutor(int(os.environ.get("AUDIT18_JOBS", "8"))) as ex:
    list(ex.map(run, [(s, r) for s in scenarios for r in (0, 1)]))
runs = {}
for s in scenarios:
    rs = [json.loads((out / f"{Path(s).stem}.run{r}.json").read_text()) for r in (0, 1)]
    runs[s] = (rs[0], hashlib.sha256(json.dumps(rs[0]["rows"]).encode()).hexdigest()[:16] == hashlib.sha256(json.dumps(rs[1]["rows"]).encode()).hexdigest()[:16])
for name, f in fixtures.items():
    rows, same = runs[f["scenario"]]
    c = rows["cols"].index("playTimeVBlanks"); r = rows["rows"]
    a, b = f["denseWindow"]["startFrame"], f["denseWindow"]["endFrame"]
    lag = [i - a for i in range(a, b + 2) if r[i][c] == r[i - 1][c]]
    print(f"{name} r1==r2={int(same)} lag ages {lag}")
