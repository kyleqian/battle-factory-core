#!/usr/bin/env python3
"""prep37: compact receipt of the twice-fresh probes (r1 == r2 checked by prep37Probes.sh): sha256 + frame count per scenario.
usage: prep37ProbeDigest.py <probe-dir> <out.json>"""
import hashlib, json, sys
from pathlib import Path
d = Path(sys.argv[1])
rows = {}
for f in sorted(d.glob("*-r1.json")):
    r2 = f.with_name(f.name[:-8] + "-r2.json")
    data = json.loads(f.read_text())
    rows[f.name[:-8]] = {"sha256": hashlib.sha256(f.read_bytes()).hexdigest(), "r1EqualsR2": f.read_bytes() == r2.read_bytes(),
                         "frames": len(data["frames"]), "profile": data["profile"], "bootstrap": data.get("bootstrap")}
Path(sys.argv[2]).write_text(json.dumps({"schema": "prep37-probes/v1", "probes": rows}, indent=1) + "\n")
