#!/usr/bin/env python3
"""ret80: lab scenarios with an ORDER-SENSITIVE consumer body after a friendship-255 Return 216 (docs/ret80-return-order.md), from audit
20's Part B scenario pb-fly-wingull-opp-s2 (3 FIGHT -> first move turns; lab seed pinned explicitly, ISSUES #154):
  pb-ret80-opp-<consumer>: the opponent leads with its Return user (Shelgon 372, friendship 255, 4x Return); the player's lead (Ampharos
    181) has 4x the consumer;
  pb-ret80-ply-<consumer>: the player leads with that Return user; the opponent's lead becomes Snorlax 143 (slower; survives the Return) with 4x the consumer.
Consumers: Swift 129, Shock Wave 351, Water Pulse 352 (live adapters whose sprites take slots from the lent order).
The pb- prefix makes audit20Fixtures.py window EVERY body and model a KO's faint + send-in (its pb-* rules).
usage: ret80ConsumerStage.py <out-dir>"""
import copy, json, sys
from pathlib import Path

SRC = Path("tools/integration/fixtures/audit-20/partb/scenarios/pb-fly-wingull-opp-s2.json")
CONSUMERS = (("swift", 129), ("shock-wave", 351), ("water-pulse", 352))
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
base = json.loads(SRC.read_text())
base["seed"] = 305420351
ret = next(m for m in base["overrides"]["parties"]["opponent"] if m["moves"] == [216] * 4 and m["friendship"] == 255)
for name, move in CONSUMERS:
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    o = P["opponent"]; i = o.index(next(m for m in o if m["species"] == ret["species"]))
    o[0], o[i] = o[i], o[0]
    P["player"][0]["moves"] = [move] * 4
    (out / f"pb-ret80-opp-{name}.json").write_text(json.dumps(s, indent=1) + "\n")
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    P["player"][0] = copy.deepcopy(ret)
    P["opponent"][0].update(species=143, gender="male", moves=[move] * 4)  # Snorlax: slower than Shelgon and survives its Return
    (out / f"pb-ret80-ply-{name}.json").write_text(json.dumps(s, indent=1) + "\n")
print(len(CONSUMERS) * 2, "scenarios")
