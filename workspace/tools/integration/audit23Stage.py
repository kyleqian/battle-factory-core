#!/usr/bin/env python3
"""Live audit 23 (docs/live-audit-23.md): battle-lab scenarios for tonight's folds, on audit 22's base (audit 20 Part B
pb-fly-wingull-opp-s2; the pb- prefix makes audit20Fixtures.py window EVERY body), lab seed pinned explicitly (ISSUES #154), the trace
extended to TURNS turns of [A, 30 idle, A, 1300 idle]. Species are INTERNAL ids (all < 252, = national). EV totals <= 510. Leads:
  gw  pb-a23gw-<side>-<user>-<target>: GrassWhistle 320 x4 (ctl95's restore blend after the last note + the elevated-opponent shadow rows
      221..224); the foe knows Splash 150 (no adapter: never a claim) so every later GrassWhistle body follows foe bodies; 8 turns so the
      target wakes and is put to sleep again (later bodies). Pairs: elevated attacker BUTTERFREE 12 (opp) -> SNORLAX 143 (big);
      small PICHU 172 (opp) -> STEELIX 208 (big); player SNORLAX -> elevated target AERODACTYL 142; player PICHU -> KANGASKHAN 115
      (Early Bird: short sleeps).
  it  pb-a23it-<side>-<user>-<target>: Iron Tail 231 x4 (ctl95's band masked by the attacker): player STEELIX -> PIDGEOT 18 (elevated
      target); opponent PICHU -> SNORLAX. Foe: Splash.
  fc  pb-a23fc-<side>-<user>-<target>-<between>: Fury Cutter 210 x4, 7 turns (counters 1..5+) with ANOTHER body between every pair of
      Fury Cutter bodies: SCIZOR 212 (ply) -> RATTATA 19 (front idle rest x2 1) using Tackle 33 (a damaging body ON the cutter);
      PINSIR 127 (opp) -> SNORLAX using Extrasensory 326 (a scanline body); SANDSLASH 28 (ply) -> a L16 CLEFFA 173 (opponent; KO'd by the
      chain) then the send-out MILTANK 241 / LAPRAS 131 using Growl 45 (the counter continues across the target's switch; a L8 Static
      PICHU paralysed the cutter and reset the chain in the first try). SCIZOR's chain also KOs RATTATA: its counter-5 body hits the
      send-out EXPLOUD (the base party's) -- a second switch case.
  mm  pb-a23mm-<memento side>-<user>-after-<predecessor>: Memento 262 (slow) as a LATER body after the faster foe's body:
      Extrasensory 326 (GIRAFARIG 203 -> opp MISDREAVUS 200, elevated; opp XATU 178 -> player DROWZEE 96; NOT a Dark-type Memento user:
      Extrasensory does not affect it, so no body) or a non-scanline body (player RAICHU 26 Growl -> opp MURKROW 198; opp JOLTEON 135
      Swift 129 -> player HOUNDOUR 228). Front idle rests all 0 (land96's gate).
usage: audit23Stage.py <out-dir>"""
import copy, json, sys
from pathlib import Path

SRC = Path("tools/integration/fixtures/audit-20/partb/scenarios/pb-fly-wingull-opp-s2.json")
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
base = json.loads(SRC.read_text())
base["seed"] = 305420351
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
FAST = ({"hp": 252, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0},
        {"hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 31, "spDefense": 31})
SLOW = ({"hp": 252, "attack": 0, "defense": 128, "speed": 0, "spAttack": 0, "spDefense": 128},
        {"hp": 31, "attack": 31, "defense": 31, "speed": 0, "spAttack": 31, "spDefense": 31})
GENDERLESS = {}
FEMALE = {113, 241, 115}
NAMES = {12: "butterfree", 143: "snorlax", 172: "pichu", 208: "steelix", 142: "aerodactyl", 115: "kangaskhan", 18: "pidgeot",
         212: "scizor", 19: "rattata", 127: "pinsir", 28: "sandslash", 203: "girafarig", 198: "murkrow", 178: "xatu", 197: "umbreon",
         26: "raichu", 200: "misdreavus", 135: "jolteon", 228: "houndour", 173: "cleffa", 96: "drowzee"}


def mon(m, species, move, fast, level=50):
    evs, ivs = FAST if fast else SLOW
    m.update(species=species, moves=[move] * 4, evs=dict(evs), ivs=dict(ivs), level=level, friendship=70, item=0, abilitySlot=0,
             gender="female" if species in FEMALE else "male")
    assert sum(m["evs"].values()) <= 510


def scenario(turns):
    s = copy.deepcopy(base)
    s["trace"] = {"segments": [dict(x) for _ in range(turns) for x in TURN]}
    return s


def write(name, s):
    (out / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


n = 0
# (family, user side, user, user move, user fast, target, target move, turns)
CELLS = [("gw", "opp", 12, 320, True, 143, 150, 8), ("gw", "opp", 172, 320, True, 208, 150, 8), ("gw", "ply", 143, 320, True, 142, 150, 8),
         ("gw", "ply", 172, 320, True, 115, 150, 8),
         ("it", "ply", 208, 231, True, 18, 150, 4), ("it", "opp", 172, 231, True, 143, 150, 4),
         ("fc", "ply", 212, 210, True, 19, 33, 7), ("fc", "opp", 127, 210, True, 143, 326, 7), ("fc", "ply", 28, 210, True, 173, 45, 7),
         ("mm", "opp", 200, 262, False, 203, 326, 3), ("mm", "ply", 96, 262, False, 178, 326, 3), ("mm", "opp", 198, 262, False, 26, 45, 3),
         ("mm", "ply", 228, 262, False, 135, 129, 3)]
BETWEEN = {33: "tackle", 326: "extrasensory", 45: "growl", 129: "swift", 150: "splash"}
for fam, side, user, move, fast, tgt, tmove, turns in CELLS:
    s = scenario(turns); P = s["overrides"]["parties"]
    u, t = (P["player"][0], P["opponent"][0]) if side == "ply" else (P["opponent"][0], P["player"][0])
    mon(u, user, move, fast)
    mon(t, tgt, tmove, not fast, level=16 if (fam == "fc" and tgt == 173) else 50)
    if fam == "fc" and tgt == 173:  # the KO'd target's replacements (two DISTINCT species: the derivation sees a send-out by species)
        mon(P["opponent"][1], 241, 45, False); mon(P["opponent"][2], 131, 45, False)
    if fam == "fc":
        name = f"pb-a23fc-{side}-{NAMES[user]}-{NAMES[tgt]}-{BETWEEN[tmove]}"
    elif fam == "mm":
        name = f"pb-a23mm-{side}-{NAMES[user]}-after-{BETWEEN[tmove]}"
    else:
        name = f"pb-a23{fam}-{side}-{NAMES[user]}-{NAMES[tgt]}"
    write(name, s)
    n += 1
print(n, "scenarios")
