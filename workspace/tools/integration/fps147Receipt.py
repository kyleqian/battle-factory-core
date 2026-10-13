#!/usr/bin/env python3
"""fps147 (docs/fps147-focus-punch-setup.md): fold the r1 / r2 probe outputs of fps147Probes.sh into the committed fixtures.

usage: fps147Receipt.py <probe-out-dir> <fixture-dir>
Writes <fixture-dir>/rom-windows.json (every r1 window row, fps147Probe.py's per-row keys; `windows` = the animated windows,
`noAnimationWindows` = the windows whose animation never launched: behind a substitute) and <fixture-dir>/probe-sha256.json
(sha256 of each r1 / r2 output and the raw dump; r1 == r2 required).
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

OUT, FIX = Path(sys.argv[1]), Path(sys.argv[2])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
windows, skipped, shas = {}, {}, {}
for r1 in sorted((OUT / "probes/r1").glob("*.json")):
    r2 = OUT / "probes/r2" / r1.name
    stem = r1.stem
    probe = json.loads(r1.read_text())
    scen = json.loads((FIX / "scenarios" / probe["scenario"]).read_text())
    w = probe["window"]
    (windows if w["R"] is not None else skipped)[stem] = {"scenario": probe["scenario"], "seed": probe["seed"], "side": scen["fps147"]["focusSide"],
                     "species": scen["fps147"]["species"], "frontierEntry": scen["fps147"]["frontierEntry"], **w}
    shas[stem] = {"r1": sha(r1), "r2": sha(r2), "equal": sha(r1) == sha(r2), "dumpRgb": sha(OUT / "dump" / f"{stem}.rgb")}
    assert shas[stem]["equal"], stem
(FIX / "rom-windows.json").write_text(json.dumps({"schema": "fps147-rom-windows/v1", "windows": windows, "noAnimationWindows": skipped}, separators=(",", ":")) + "\n")
(FIX / "probe-sha256.json").write_text(json.dumps({"schema": "fps147-probe-sha256/v1", "jobs": shas}, indent=1) + "\n")
print(f"windows {len(windows)} (+ {len(skipped)} without animation), r1 == r2 {sum(v['equal'] for v in shas.values())} / {len(shas)}")
