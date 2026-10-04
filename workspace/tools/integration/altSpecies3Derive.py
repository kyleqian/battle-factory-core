#!/usr/bin/env python3
"""Derive altspecies3 window starts from source activation frames.
usage: altSpecies3Derive.py <out.json>   (cases = those with an altspecies2 live fixture)
offset(move) = accepted window start - accepted-scenario activation of the interval at/just before it;
alt start = alt activation (same interval index/move) + offset.
"""
import json, subprocess, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parents[2]
VENV = ROOT.parents[2] / "vendor/mgba-venv/bin/python" if False else Path("/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")
RAW = ROOT / ".integration/validation/altspecies3-20261004/activation"; RAW.mkdir(parents=True, exist_ok=True)
moves = {m["name"].replace(" ", "_").replace("-", "_").replace("'", ""): m["id"] for m in json.loads((ROOT / "src/data/gen/moves.json").read_text())["moves"]} if False else None
import re
txt = (ROOT / "src/data/gen/moves.json").read_text()
MID = {m.group(1)[5:]: int(m.group(2)) for m in re.finditer(r'"(MOVE_[A-Z_0-9]+)","id":(\d+)', txt)}
cases = json.loads((ROOT / "tools/integration/altSpecies2Cases.json").read_text())["cases"]
have = {p.stem[len("altspecies2-"):] for p in (ROOT / "tools/integration/fixtures").glob("altspecies2-*.json") if p.stem != "altspecies2-before"}
def run(scen, tag, pm=None):
    out = RAW / f"{tag}.json"
    subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", str(VENV), str(ROOT / "tools/integration/altSpecies3Activation.py"), str(scen), str(out), *([str(pm)] if pm else [])], check=True, cwd=ROOT, capture_output=True)
    return json.loads(out.read_text())
def one(c):
    try: return one_(c)
    except Exception as e: return {"case": c["name"], "error": repr(e)}
def one_(c):
    n = c["name"]
    if n not in have: return None
    base = json.loads((ROOT / c["baseSource"]).read_text())
    w = base.get("denseWindow") or base.get("sourceWindow")
    mid = MID[c["move"]]
    a = run(ROOT / base["scenario"], "base-" + n, c.get("probeMoveId")); b = run(ROOT / "tools/integration/fixtures/altspecies2-scenarios" / f"{n}.json", "alt-" + n, c.get("probeMoveId"))
    ia = [i for i in a["intervals"] if i["move"] == mid]; ib = [i for i in b["intervals"] if i["move"] == mid]
    # accepted interval: the last activation <= accepted start (+ small slack), else the first after
    k = max([j for j, i in enumerate(ia) if i["start"] <= w["startFrame"] + 8], default=0)
    off = w["startFrame"] - ia[k]["start"]
    live = c.get("liveWindow")
    r = {"case": n, "move": c["move"], "moveId": mid, "acceptedStart": w["startFrame"], "acceptedCount": w["endFrame"] - w["startFrame"] + 1,
         "acceptedActivations": [i["start"] for i in ia], "acceptedIntervalIndex": k, "offset": off,
         "altActivations": [i["start"] for i in ib], "altIntervals": ib, "acceptedIntervals": ia, "liveWindow": live}
    r["derivedStart"] = ib[k]["start"] + off if len(ib) > k else None
    return r
with ThreadPoolExecutor(6) as ex: res = [r for r in ex.map(one, cases) if r]
Path(sys.argv[1]).write_text(json.dumps(res, indent=1))
for r in res:
    if "error" in r: print(r); continue
    print(r["case"], "acc", r["acceptedStart"], "actAcc", r["acceptedActivations"], "off", r["offset"], "actAlt", r["altActivations"], "->", r["derivedStart"])
