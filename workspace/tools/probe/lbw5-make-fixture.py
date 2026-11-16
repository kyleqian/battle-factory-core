#!/usr/bin/env python3
"""lbw5: pack chosen candidates of lbw5-sweep.py outputs into the Tier-1 fixture tests/fixtures/lbw5/player-npc.json.gz.
usage: python3 tools/probe/lbw5-make-fixture.py OUT.json.gz SWEEP.json:NAME[,NAME...] [SWEEP.json:NAME,...]"""
import gzip, json, sys
from pathlib import Path

out = []
for spec in sys.argv[2:]:
    path, names = spec.split(":")
    by = {c["name"]: c for c in json.loads(Path(path).read_text())}
    out += [by[n] for n in names.split(",")]
Path(sys.argv[1]).write_bytes(gzip.compress(json.dumps(out, separators=(",", ":")).encode(), 9, mtime=0))
print(len(out), "candidates")
