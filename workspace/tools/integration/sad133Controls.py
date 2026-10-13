#!/usr/bin/env python3
"""sad133 (docs/sad133-status-animation-render-2.md): the comparator's negative controls in one receipt. Per control: the summary and
per window (zeroPx over every row, command-row px). Each control must fail exactly where its component is drawn.
  python3 tools/integration/sad133Controls.py <out.json> <name>=<sad133ProductionCompare.ts --neg=<name> output> ...
"""
import json, sys

out = {}
for arg in sys.argv[2:]:
    name, path = arg.split("=", 1)
    d = json.load(open(path))
    s = d.pop("summary")
    out[name] = {"windows": s["windows"], "zeroPxWindows": s["zeroPxWindows"], "zeroPxCommandRowWindows": s["zeroPxCommandRowWindows"],
                 "perRowDigest": s["perRowDigest"],
                 "failingCommandRowWindows": sorted(k for k, v in d.items() if v["commandRows"]["px"]),
                 "perWindow": {k: {"animation": v["animation"], "side": v["side"], "zeroPx": v["zeroPx"], "commandPx": v["commandRows"]["px"]}
                               for k, v in sorted(d.items())}}
    print(f"control {name}: command rows 0 px {s['zeroPxCommandRowWindows']} / {s['windows']}, all rows 0 px {s['zeroPxWindows']} / {s['windows']}")
open(sys.argv[1], "w").write(json.dumps(out, indent=1, sort_keys=True) + "\n")
