#!/usr/bin/env python3
"""Random2 R1 live lane: activation frame/value of each Move_<X> body in direct-mGBA random2RouteProbe runs.

usage: activationProbe.py LABEL BODY_LABEL RUN1.json RUN2.json
Prints JSON {label, bodyLabel, runsSha1 (both), bodies: [{activationFrame, activationValue(Hex), plan, words}]}.
Uses prep12Plans.Probe (value reconstruction asserted against every run end value) and its replay(); the two fresh runs
must agree on every per-frame field (finalStateSha1 excluded, prep12 papercut).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prep12Plans import Probe, replay  # noqa: E402

label, body_label, p1, p2 = sys.argv[1:5]
a, b = (json.loads(Path(p).read_text()) for p in (p1, p2))
diff = [k for k in a if a[k] != b[k]]
assert diff in ([], ["finalStateSha1"]), f"fresh runs differ: {diff}"
probe = Probe(Path(p1))
bodies = []
for start, end in probe.bodies(body_label):
    groups = probe.plan(start, end)
    v = probe.val[start]
    bodies.append({
        "activationFrame": start, "lastActiveFrame": end, "activationValue": v, "activationValueHex": f"0x{v:08X}",
        "plan": [{"ageOffset": g["ageOffset"], "count": g["count"], "lagBefore": g["lagBefore"]} for g in groups],
        "words": replay(v, groups),
    })
print(json.dumps({"label": label, "bodyLabel": body_label, "runsSha1": a["runsSha1"], "runsSha1Run2": b["runsSha1"],
                  "frames": a["frames"], "bodies": bodies}))
