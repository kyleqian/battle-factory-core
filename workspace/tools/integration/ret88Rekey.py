#!/usr/bin/env python3
"""ret88: ret80Rekey.py (every Return 216 MOVE_ANIMATION's friendship argument = the attacker side's staged party friendship), plus:
  default: a fixture whose OWN body is a Return is dropped (the consumer windows);
  --returns: ONLY the Return-body fixtures are kept, with requestFields.friendship = the attacker side's staged friendship (the ReturnWeak
    body windows; liveAdapterFramebuffer.ts otherwise assumes a friendship-255 Return fixture).
usage: ret88Rekey.py <fixture-dir> <out-dir> [--returns]   (prints: kept / dropped fixtures, friendship values)"""
import json, sys
from collections import Counter
from pathlib import Path

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
returns = "--returns" in sys.argv[3:]
dst.mkdir(parents=True, exist_ok=False)
used, kept, dropped = Counter(), 0, 0
for p in sorted(src.glob("*.json")):
    f = json.loads(p.read_text())
    if (f.get("move") == "RETURN") != returns:
        dropped += 1
        continue
    parties = json.loads(Path(f["scenario"]).read_text())["overrides"]["parties"]
    if returns:
        side = f["attacker"]["geometry"]["side"]
        values = {m["friendship"] for m in parties[side] if 216 in m["moves"]}
        if len(values) != 1:
            raise SystemExit(f"{p.name}: {side} Return users' friendship {sorted(values)}")
        f["requestFields"] = {**(f.get("requestFields") or {}), "friendship": values.pop()}
    for t in f["precedingTurns"]:
        for e in t["events"]:
            if e.get("animationId") == "MOVE_ANIMATION" and e["arguments"][0] == "216":
                side = "player" if e["battler"] == 0 else "opponent"
                values = {m["friendship"] for m in parties[side] if 216 in m["moves"]}
                if len(values) != 1:
                    raise SystemExit(f"{p.name}: {side} Return users' friendship {sorted(values)}")
                e["arguments"][4] = str(values.pop())
                used[e["arguments"][4]] += 1
    (dst / p.name).write_text(json.dumps(f, indent=1) + "\n")
    kept += 1
print(kept, "fixtures kept;", dropped, "dropped (" + ("non-Return" if returns else "Return") + " bodies);", sum(used.values()), "Return events rekeyed; friendship", dict(used))
