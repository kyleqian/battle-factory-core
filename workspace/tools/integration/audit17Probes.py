#!/usr/bin/env python3
"""Live audit 17: one prep48Probe.py run per scenario into <out-dir>/<name>.json (direct mGBA, fresh process each; never the shared HTTP
oracles). The RGB frames and the wrapper log live in a per-job TemporaryDirectory (removed by Python, no shell rm).
run-mgba-probe.py may exit 138/139 on a teardown SIGBUS with complete output; the JSON is validated by the wrapper.
usage: audit17Probes.py <out-dir> [scenario.json ...]   (default: tools/integration/fixtures/audit-17/scenarios/*.json); AUDIT17_JOBS (12)
"""
import os, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
scen = [Path(p) for p in sys.argv[2:]] or sorted(Path("tools/integration/fixtures/audit-17/scenarios").glob("*.json"))
py = os.environ.get("PY", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")
env = {**os.environ, "PYTHONPATH": os.environ.get("PYTHONPATH", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/libmgba-py")}


def one(s: Path) -> str:
    with tempfile.TemporaryDirectory(prefix="audit17-probe-") as tmp:
        p = Path(tmp) / "p.json"
        r = subprocess.run(["python3", "tools/run-mgba-probe.py", str(p), "--", py, "tools/integration/prep48Probe.py", str(s), str(p),
                            str(Path(tmp) / "rgb")], env=env, capture_output=True)
        if not p.exists() or p.stat().st_size == 0:
            return f"PROBE FAILED {s.stem} exit {r.returncode}"
        shutil.copyfile(p, out / f"{s.stem}.json")
        return f"{s.stem} exit {r.returncode}"


with ThreadPoolExecutor(int(os.environ.get("AUDIT17_JOBS", "12"))) as ex:
    for line in ex.map(one, scen):
        print(line)
