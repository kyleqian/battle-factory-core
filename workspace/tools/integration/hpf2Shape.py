#!/usr/bin/env python3
"""hpf2: per hp bar of a battle-lab scenario, the ROM's bar (exec RISE -> fall) and the next exec RISE vs the app's hp command (start, length, next command).

usage: hpf2Shape.py <lab-name> <on|off> <evidence-dir>   e.g. hpf2Shape.py aud242e-doubleedge-player-on on .integration/evidence/hpf2
Writes <dir>/ram/<lab>.json (hpd2Probe) and <dir>/trace/<lab>.json (compare trace, hpf1 template) when missing; prints one line per ROM hp change.
"""
import json, subprocess, sys
from pathlib import Path

lab, mode, ev = sys.argv[1], sys.argv[2], Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
scn = ROOT / "tools/battle-lab" / f"{lab}.json"
(ev / "ram").mkdir(parents=True, exist_ok=True); (ev / "trace").mkdir(parents=True, exist_ok=True)
ram = ev / "ram" / f"{lab}-{mode}.json"
if not ram.exists():
    subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(ram), "--", "python3", str(ROOT / "tools/integration/hpd2Probe.py"), str(scn), mode, str(ram)],
                   check=True, capture_output=True, cwd=ROOT)
rows = json.load(open(ram))["rows"]
trace = ev / "trace" / f"{lab}.json"
if not trace.exists():
    t = json.load(open(ROOT / "tools/compare/traces/hpf1-rollingkick-on.json"))
    t["appStage"]["id"] = lab; t["oracleBattleLab"]["scenario"] = f"../../battle-lab/{lab}.json"
    t["segments"] = json.load(open(scn))["trace"]["segments"]; t.pop("captureFrames", None)
    trace.write_text(json.dumps(t))
app = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", str(ROOT / "tools/integration/hpf1Cmds.ts"), str(trace)], capture_output=True, text=True, cwd=ROOT).stdout.splitlines()
cmds = []
for line in app:
    p = line.split(" ")
    if len(p) > 3 and p[0].isdigit(): cmds.append((int(p[0]), p[2], p[3], line))
print("ROM", lab, mode)
runs = []; start = None
for r in rows:
    if r["exec"] and start is None: start = (r["f"], r["ptr"])
    if not r["exec"] and start is not None: runs.append((start[0], r["f"], start[1])); start = None
hp = [(a["f"], a["hp"]) for a, b in zip(rows[1:], rows) if a["hp"] != b["hp"]]
for f, h in hp:
    bar = [x for x in runs if x[1] <= f + 1 and x[1] >= f - 3]
    if not bar: print("  hp change", f, h, "no bar run"); continue
    rise, fall, ptr = bar[-1]
    nxt = [x for x in runs if x[0] > fall]
    prev = [r["hp"] for r in rows if r["f"] == f - 1][0]
    ptrs = []
    last = None
    for r in rows:
        if fall <= r["f"] <= (nxt[0][0] if nxt else fall + 40) and r["ptr"] != last: ptrs.append(hex(r["ptr"])[-3:]); last = r["ptr"]
    print(f"  ROM hp {prev}->{h} change@{f} bar rise {rise} exec {fall - rise} next rise +{(nxt[0][0] - rise) if nxt else None} (exec {(nxt[0][1]-nxt[0][0]) if nxt else None}) ptrs {' '.join(ptrs)}")
print("APP")
for i, c in enumerate(cmds):
    if c[1] == "hp": print(f"  APP @{c[0]} len {cmds[i+1][0]-c[0] if i+1 < len(cmds) else None} -> {cmds[i+1][1] if i+1 < len(cmds) else None} | {c[3][:140]}")
