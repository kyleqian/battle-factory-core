#!/usr/bin/env python3
"""ret80: copy audit-20 style fixtures with every Return 216 MOVE_ANIMATION's friendship argument (arguments[4]) set to the attacker's
staged party friendship (audit19Fixtures / audit20Fixtures derive the 6 arguments with friendship "70", audit 19's convention; the
Factory and every audit-20 Return user are staged at 255). The friendship is read from the fixture's lab scenario: every party member of
the attacker's side that knows 216 must share one value (else the fixture is rejected). Nothing else changes; the source dir is never
edited. usage: ret80Rekey.py <fixture-dir> <out-dir>   (prints: fixtures, rekeyed events, the friendship values used)"""
import json, sys
from collections import Counter
from pathlib import Path

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=False)
used, files = Counter(), 0
for p in sorted(src.glob("*.json")):
    f = json.loads(p.read_text())
    parties = json.loads(Path(f["scenario"]).read_text())["overrides"]["parties"]
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
    files += 1
print(files, "fixtures;", sum(used.values()), "Return events rekeyed; friendship", dict(used))
