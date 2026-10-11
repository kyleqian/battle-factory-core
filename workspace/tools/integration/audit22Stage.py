#!/usr/bin/env python3
"""Live audit 22 (docs/live-audit-22.md): battle-lab scenarios for the ret88 families, on ret88ConsumerStage.py's base (audit 20 Part B
pb-fly-wingull-opp-s2: 3 FIGHT -> first-move turns; lab seed pinned explicitly, ISSUES #154; the pb- prefix makes audit20Fixtures.py window
EVERY body). EVERY party member that knows Return 216 is staged at friendship 0 (the kernel's value; ret80 / ret88 -> ReturnWeak).
Species are INTERNAL ids (the ones chosen here are < 252, = national; EXPLOUD 372 / the benches are the base's). Leads:
  dt  pb-a22dt-<side>-<dt user>: Double Team 104 after a ReturnWeak, the census's newly live Double Team users (ret88 census flips: player
      PONYTA 77 seed 487, opponent BLISSEY 242 seed 978) on BOTH sides. <side> = the Double Team user's side. Return users PIDGEOT 18 /
      LAPRAS 131 (no entry-hook ability: an Intimidate entry runs inside BattleLab.prepare, outside the fixture history; dt60 section 4).
      Player natures: PONYTA 3 (production step counter 2), BLISSEY 5 (1) -- the one-call-ahead class; opponent PONYTA 0, BLISSEY 120.
  rw  pb-a22rw-<side>-<attacker>-<target>: ReturnWeak BODIES (3 Return turns: a first and two later bodies) with other species: a big
      attacker (SNORLAX 143, STEELIX 208), a small picture (PICHU 172), an elevated opponent (CROBAT 169) as target and as attacker, and the
      only non-ONIX idle-rest species (RATTATA 19, front idle rest x2 1) as the opponent target and as the opponent attacker. The other lead
      knows only Splash 150. ply-crobat-rattata: the faster CROBAT's first Return reaches RATTATA before RATTATA's own first body.
  dc  pb-a22dc-<opp|ply>-<consumer>: ret88ConsumerStage.py's two shapes (opp-: the opponent's EXPLOUD 372 leads with Return, the player's
      AMPHAROS 181 has 4x the consumer; ply-: the player's EXPLOUD leads with Return, the opponent's SNORLAX 143 has 4x the consumer) with
      deep-free-list consumers beyond ret88's set: Swift 129, Shock Wave 351, Water Pulse 352.
usage: audit22Stage.py <out-dir>"""
import copy, json, sys
from pathlib import Path

SRC = Path("tools/integration/fixtures/audit-20/partb/scenarios/pb-fly-wingull-opp-s2.json")
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
base = json.loads(SRC.read_text())
base["seed"] = 305420351
RETURN_USER = next(m for m in base["overrides"]["parties"]["opponent"] if m["moves"] == [216] * 4 and m["species"] == 372)


def weak(s):
    for side in s["overrides"]["parties"].values():
        for m in side:
            if 216 in m["moves"]:
                m["friendship"] = 0
    return s


def lead(mon, species, moves, nature=None):
    mon.update(species=species, moves=[moves] * 4, gender="female" if species == 242 else "male")
    if nature is not None:
        mon["nature"] = nature
    if moves == 216:
        mon["friendship"] = 0


def write(name, s):
    (out / f"{name}.json").write_text(json.dumps(weak(s), indent=1) + "\n")


n = 0
# dt: (dt user, its player nature, the Return user)
for name, species, nature, ret in (("ponyta", 77, 3, 18), ("blissey", 242, 5, 131)):
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    lead(P["player"][0], species, 104, nature); lead(P["opponent"][0], ret, 216)
    write(f"pb-a22dt-ply-{name}", s)
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    lead(P["player"][0], ret, 216); lead(P["opponent"][0], species, 104)
    write(f"pb-a22dt-opp-{name}", s)
    n += 2
# rw: (attacker side, attacker, target)
NAMES = {143: "snorlax", 172: "pichu", 208: "steelix", 169: "crobat", 19: "rattata"}
for side, atk, tgt in (("ply", 143, 172), ("opp", 172, 143), ("ply", 208, 169), ("opp", 169, 208), ("ply", 172, 19), ("opp", 19, 172),
                       ("ply", 169, 19)):
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    a, t = (P["player"][0], P["opponent"][0]) if side == "ply" else (P["opponent"][0], P["player"][0])
    lead(a, atk, 216); lead(t, tgt, 150)
    write(f"pb-a22rw-{side}-{NAMES[atk]}-{NAMES[tgt]}", s)
    n += 1
# dc: ret88ConsumerStage.py's shapes
for name, move in (("swift", 129), ("shock-wave", 351), ("water-pulse", 352)):
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    o = P["opponent"]; i = o.index(next(m for m in o if m["species"] == RETURN_USER["species"]))
    o[0], o[i] = o[i], o[0]
    P["player"][0]["moves"] = [move] * 4
    write(f"pb-a22dc-opp-{name}", s)
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    P["player"][0] = copy.deepcopy(RETURN_USER)
    P["opponent"][0].update(species=143, gender="male", moves=[move] * 4)
    write(f"pb-a22dc-ply-{name}", s)
    n += 2
print(n, "scenarios")
