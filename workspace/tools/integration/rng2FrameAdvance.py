#!/usr/bin/env python3
"""Summarise gRng2Value per-frame advance from a doubleKickProbe.py output JSON.

usage: rng2FrameAdvance.py <probe.json>   (prints JSON receipt: draws between rows)
"""
import json, sys
f = lambda x: (x * 1103515245 + 24691) & 0xFFFFFFFF  # ISO_RANDOMIZE1
d = json.load(open(sys.argv[1]))
rows = [v for v in d.values() if isinstance(v, list) and v and isinstance(v[0], dict) and "animationRng" in v[0]][0]
steps = []
for a, b in zip(rows, rows[1:]):
    n, z = 0, a["animationRng"]
    while z != b["animationRng"] and n < 64:
        z, n = f(z), n + 1
    steps.append({"from": a["frame"], "to": b["frame"], "gRng2Steps": n,
                  "scriptOffset": b.get("scriptOffset")})
print(json.dumps({"firstRng2": rows[0]["animationRng"], "steps": steps}, indent=1))
