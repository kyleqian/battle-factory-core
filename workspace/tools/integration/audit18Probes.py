#!/usr/bin/env python3
"""Live audit 18: one audit18Probe.py (prep48Probe.py + rng2) run per scenario into <out-dir>/<name>.json (direct mGBA, fresh process each; never the shared HTTP
oracles). The RGB frames and the wrapper log live in a per-job TemporaryDirectory (removed by Python, no shell rm).
run-mgba-probe.py may exit 138/139 on a teardown SIGBUS with complete output; the JSON is validated by the wrapper.
usage: audit18Probes.py <out-dir> [scenario.json ...]   (default: tools/integration/fixtures/audit-18/scenarios/*.json); AUDIT18_JOBS (8)
"""
import os, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
scen = [Path(p) for p in sys.argv[2:]] or sorted(Path("tools/integration/fixtures/audit-18/scenarios").glob("*.json"))
py = os.environ.get("PY", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")
env = {**os.environ, "PYTHONPATH": os.environ.get("PYTHONPATH", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/libmgba-py")}


def one(s: Path) -> str:
    with tempfile.TemporaryDirectory(prefix="audit18-probe-") as tmp:
        p = Path(tmp) / "p.json"
        r = subprocess.run(["python3", "tools/run-mgba-probe.py", str(p), "--", py, "tools/integration/audit18Probe.py", str(s), str(p),
                            str(Path(tmp) / "rgb")], env=env, capture_output=True)
        if not p.exists() or p.stat().st_size == 0:
            return f"PROBE FAILED {s.stem} exit {r.returncode}"
        shutil.copyfile(p, out / f"{s.stem}.json")
        return f"{s.stem} exit {r.returncode}"


with ThreadPoolExecutor(int(os.environ.get("AUDIT18_JOBS", "8"))) as ex:
    for line in ex.map(one, scen):
        print(line)
