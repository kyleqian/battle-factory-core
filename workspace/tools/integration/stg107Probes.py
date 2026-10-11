#!/usr/bin/env python3
"""stg107: run stg107Probe.py once per scenario (fresh direct mGBA process each; never the shared HTTP oracles) into <out-dir>/<name>.json.
run-mgba-probe.py may exit 138 / 139 on teardown with complete output (it validates the JSON); a job without output is retried once.
usage: stg107Probes.py <out-dir> <scenario.json> ...   (STG107_JOBS, default 11)
"""
import os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
scen = [Path(p) for p in sys.argv[2:]]
py = os.environ.get("PY", "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")
env = {**os.environ, "PYTHONPATH": os.environ.get("PYTHONPATH", "/Users/kyle/Developer/pokebench/vendor/libmgba-py")}


def one(s: Path) -> str:
    for attempt in (1, 2):
        with tempfile.TemporaryDirectory(prefix="stg107-probe-") as tmp:
            p = Path(tmp) / "p.json"
            r = subprocess.run(["python3", "tools/run-mgba-probe.py", str(p), "--", py, "tools/integration/stg107Probe.py", str(s), str(p)],
                               env=env, capture_output=True)
            if p.exists() and p.stat().st_size > 0:
                (out / f"{s.stem}.json").write_bytes(p.read_bytes())
                return f"{s.stem} exit {r.returncode} attempt {attempt}"
    return f"PROBE FAILED {s.stem}"


with ThreadPoolExecutor(int(os.environ.get("STG107_JOBS", "11"))) as ex:
    for line in ex.map(one, scen):
        print(line)
