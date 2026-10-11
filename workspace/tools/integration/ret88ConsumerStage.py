#!/usr/bin/env python3
"""ret88: lab scenarios with a consumer body after a friendship-0 Return 216 (ReturnWeak; docs/ret88-return-weak.md), ret80ConsumerStage.py's
shape from audit 20's Part B scenario pb-fly-wingull-opp-s2 (3 FIGHT -> first move turns; lab seed pinned explicitly, ISSUES #154):
  pb-ret88-opp-<consumer>: the opponent leads with its Return user (Shelgon 372, 4x Return); the player's lead (Ampharos 181) has 4x the
    consumer;
  pb-ret88-ply-<consumer>: the player leads with that Return user; the opponent's lead becomes Snorlax 143 (slower; survives) with 4x the
    consumer.
EVERY party member that knows Return is staged at friendship 0 (the kernel's value for every ordinary-play Return; ret80).
Consumers: the census's top consumers after a Return -- Dragon Dance 349, Curse 174, Double Team 104, Ice Beam 58, Thunderbolt 85,
Air Cutter 314. The pb- prefix makes audit20Fixtures.py window EVERY body and model a KO's faint + send-in (its pb-* rules).
usage: ret88ConsumerStage.py <out-dir>"""
import copy, json, sys
from pathlib import Path

SRC = Path("tools/integration/fixtures/audit-20/partb/scenarios/pb-fly-wingull-opp-s2.json")
CONSUMERS = (("dragon-dance", 349), ("curse", 174), ("double-team", 104), ("ice-beam", 58), ("thunderbolt", 85), ("air-cutter", 314))
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
base = json.loads(SRC.read_text())
base["seed"] = 305420351
ret = next(m for m in base["overrides"]["parties"]["opponent"] if m["moves"] == [216] * 4 and m["species"] == 372)


def weak(s):
    for side in s["overrides"]["parties"].values():
        for m in side:
            if 216 in m["moves"]:
                m["friendship"] = 0
    return s


for name, move in CONSUMERS:
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    o = P["opponent"]; i = o.index(next(m for m in o if m["species"] == ret["species"]))
    o[0], o[i] = o[i], o[0]
    P["player"][0]["moves"] = [move] * 4
    (out / f"pb-ret88-opp-{name}.json").write_text(json.dumps(weak(s), indent=1) + "\n")
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    P["player"][0] = copy.deepcopy(ret)
    P["opponent"][0].update(species=143, gender="male", moves=[move] * 4)  # Snorlax: slower than Shelgon and survives its Return
    (out / f"pb-ret88-ply-{name}.json").write_text(json.dumps(weak(s), indent=1) + "\n")
print(len(CONSUMERS) * 2, "scenarios")
