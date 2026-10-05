#!/usr/bin/env python3
"""forced-switch: change-point summary of forcedSwitchProdRender output (relative to production E = switch-out start)."""
import json, sys
from pathlib import Path
for p in sorted(Path(sys.argv[1]).glob("*.json")):
    d = json.loads(p.read_text()); print("==", p.name, d["species"], "moveStart", d["moveStart"], "E", d["E"], "liveBody", d["bodyDuration"])
    prev = None; rows = d["rows"]; ks = [r["k"] for r in rows]
    missing = [k for k in range(0, max(ks) + 1) if k not in ks]
    print("  frames with no presenting-phase row:", missing[:20], "n=%d" % len(missing))
    for r in rows:
        cur = (r["cmd"], r["vis"], bool(r["out"]) and (r["out"][1], r["out"][3]), r["forced"] and r["forced"][1], r["in"] and tuple(r["in"][1:5]) + (r["in"][6] is not None,), r["particles"], r["opp"], r["player"], r["msg"] and r["msg"][0])
        if cur != prev:
            print("  +%d cmd=%s el=%s vis(pS,pH,oS,oH)=%s out=%s in=%s particles=%s opp=%s plr=%s msg=%s" % (r["k"], r["cmd"], r["el"], r["vis"], r["out"], r["in"], r["particles"], r["opp"], r["player"], r["msg"])); prev = cur
