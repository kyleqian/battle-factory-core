#!/usr/bin/env python3
"""prep38: compact copy of a prep38Run.sh receipt dir for the repo: every receipt with perRow cut to its first 12 residual rows (the full
receipts are byte-reproducible with prep38Run.sh), plus summary / fixtures listings and the derived fixtures. usage: prep38Compact.py <REC> <DEST>"""
import json, shutil, sys
from pathlib import Path
REC, DEST = Path(sys.argv[1]), Path(sys.argv[2])
if DEST.exists(): shutil.rmtree(DEST)
for p in sorted(REC.rglob("*.json")):
    rel = p.relative_to(REC); out = DEST / rel; out.parent.mkdir(parents=True, exist_ok=True)
    d = json.loads(p.read_text())
    if isinstance(d, list):
        for r in d:
            if "perRow" in r: r["perRowTotal"] = len(r["perRow"]); r["perRow"] = r["perRow"][:12]
    out.write_text(json.dumps(d, separators=(",", ":")) + "\n")
for n in ("summary.txt", "fixtures.txt"): shutil.copy(REC / n, DEST / n)
