#!/usr/bin/env python3
"""Run issue142ActivationProbe.py for every job in <resolved.json>.jobs (4 parallel fresh mGBA processes) and write
tools/integration/fixtures/issue142-activation-probes.json  {"scenario|probeMoveId": [intervals]}.
usage (repo root): PYTHONPATH=vendor/libmgba-py vendor/mgba-venv/bin/python tools/integration/issue142ActivationRun.py /tmp/i142-resolved.json"""
import json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
VENDOR = "/Users/kyle/Developer/pokebench/vendor"
jobs = json.load(open(sys.argv[1] + ".jobs"))
env = {**os.environ, "PYTHONPATH": VENDOR + "/libmgba-py"}
def run(j):
    out = tempfile.mktemp(suffix=".json")
    cmd = [VENDOR + "/mgba-venv/bin/python", ROOT + "/tools/integration/issue142ActivationProbe.py", ROOT + "/" + j["scenario"], out] + ([str(j["probeMoveId"])] if j["probeMoveId"] else [])
    r = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
    try: return j, json.load(open(out))
    except Exception: return j, {"error": (r.stderr or r.stdout)[-400:], "rc": r.returncode}
with ThreadPoolExecutor(4) as ex: res = list(ex.map(run, jobs))
json.dump({f'{j["scenario"]}|{j["probeMoveId"]}': v for j, v in res}, open(ROOT + "/tools/integration/fixtures/issue142-activation-probes.json", "w"), indent=1)
print(sum("error" in v for _, v in res), "errors of", len(res))
