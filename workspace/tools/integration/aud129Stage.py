#!/usr/bin/env python3
"""aud129 (docs/aud129-live-audit-27.md, live audit 27): lab scenarios (lab seed pinned in every one; INTERNAL species ids) written as
pb-<id>.json (audit20Fixtures.py: every body of a pb-* scenario is a window).
  flag  ord124Stage.py's two `wos-*-143-42-5-s11` routes, unchanged (Snorlax 143 Odor Sleuth x4 vs Golbat 42 Mega Punch x4, seed 11, 3 turns):
        window c0 = GOLBAT's Mega Punch at SNORLAX before any Odor Sleuth (ord124 §3 FINDING: 287,402 / 17,984 px).
  iso   plans69Probe's mega-punch envelope, the attacker knows only Mega Punch 5, the defender only Harden 106 (live, aud110Align), seed 11,
        3 turns, both sides: Golbat -> Snorlax (control: no Odor Sleuth), Snorlax -> Golbat (roles swapped), Cacturne 345 -> Snorlax
        (non-elevated attacker), Golbat -> Onix 95 (non-Snorlax target).
  wide  ELEVATED parties (enemy-mon-elevations.json) with Factory-legal (species, move) pairs from battle-frontier-mons.json, each battle
        both ways (the elevated species is the attacker on the opponent side or the target on the player side): Flygon 334 Crunch 242 (bite) /
        Ninjask 302 Slash 163 (contact), Voltorb 100 Spark 209 (contact) / Electrode 101 Swift 129 (projectile), Crobat 169 Screech 103 /
        Koffing 109 Smokescreen 108 (status, target sprite); seed 11, 2 turns.
  ordl  ordl126's newly live bodies after an order-host body, species other than CHANSEY / WOBBUFFET:
        Struggle 165: stg107Stage's taunt route, elevated opponent GOLBAT struggles vs player JOLTEON 135, whose slot 2 is False Swipe 206
        (plan "sbtttt" as aud118's rain job: T1 False Swipe, T2 Taunt, then Struggle on the taunted turns);
        Stockpile 254 (ordl126's `254:opponent` "Swallow" class): elevated opponent PELIPPER 310 Stockpile x4 vs player Cacturne Odor Sleuth.
  iso2  the wide residuals isolated (defender Harden 106, seed 11, 2 turns, both sides): Spark 209 by Voltorb 100 at Snorlax 143 / Shuckle 213
        (spark62's accepted targets) / Electrode 101; Smokescreen 108 by Koffing 109 at Snorlax / Onix 95, by Weezing 110 at Crobat 169.
  phase the committed mechanic-{mega-punch,crunch,smokescreen} scenarios (own species / sets), lab seeds 0..3, 2 turns, both sides.
usage: aud129Stage.py <fresh-out-dir>"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import plans69Probe as P69
import stg107Stage as G

SIDES = (("player", "opponent", "ply"), ("opponent", "player", "opp"))
P69_JOBS = []  # (id, attacker side, attacker, defender, attacker move, defender move, seed, extra turns)
for side, other, tag in SIDES:
    # flag: ord124Stage.py's route (the "attacker" there is Snorlax with Odor Sleuth; Golbat's Mega Punch is the first body)
    P69_JOBS.append((f"aud129-flag-{tag}-143-42-5-s11", side, 143, 42, 316, 5, 11, 2))
    for a, d in ((42, 143), (143, 42), (345, 143), (42, 95)):
        P69_JOBS.append((f"aud129-iso-{tag}-{a}-{d}-5", side, a, d, 5, 106, 11, 2))
    for a, am, d, dm in ((334, 242, 302, 163), (302, 163, 334, 242), (100, 209, 101, 129), (101, 129, 100, 209), (169, 103, 109, 108),
                         (109, 108, 169, 103)):
        if side == "player":  # each battle has both orientations already: one copy per pair
            P69_JOBS.append((f"aud129-wide-{a}-{am}-{d}-{dm}", side, a, d, am, dm, 11, 1))
P69_JOBS.append(("aud129-ordl-ply-345-310-254", "player", 345, 310, 316, 254, 11, 2))
# iso2: the wide residuals (Spark 209 at Electrode, Smokescreen 108 from an elevated opponent Koffing), defender Harden 106, seed 11
for side, other, tag in SIDES:
    for a, am, d in ((100, 209, 143), (100, 209, 213), (100, 209, 101), (109, 108, 143), (110, 108, 169), (109, 108, 95)):
        P69_JOBS.append((f"aud129-iso2-{tag}-{a}-{am}-{d}", side, a, d, am, 106, 11, 1))
# phase: the committed mechanic scenarios of the three one-frame-phase moves (their own species / sets), lab seeds 0..3, 2 turns, both sides:
# the ROM body length per body (Mega Punch 160 / 159, Crunch 142 / 141, Smokescreen 125 / 124) = the measured CPU phase
PHASE_JOBS = [(f"aud129-phase-{slug}-{tag}-s{seed}", P69.base(slug, side, atk), seed)
              for slug, atk in (("mega-punch", "cacturne"), ("crunch", "houndour"), ("smokescreen", "koffing"))
              for side, other, tag in SIDES for seed in range(4)]

if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
    tmp = out / "_p69"
    for ident, side, a, d, am, dm, seed, turns in P69_JOBS:
        other = "opponent" if side == "player" else "player"
        src = P69.scenario(tmp, ("AUD129", ident, am, P69.base("mega-punch", side, "cacturne"),
                                 (("species", side, a), ("species", other, d), ("moves", side, am), ("moves", other, dm), ("seed", seed),
                                  ("turns", turns))))
        (out / f"pb-{ident}.json").write_text(src.read_text())
    for ident, base_name, seed in PHASE_JOBS:
        src = P69.scenario(tmp, ("AUD129", ident, 0, base_name, (("seed", seed), ("turns", 1))))
        (out / f"pb-{ident}.json").write_text(src.read_text())
    d = G.scenario(("aud129-ordl-opp-42-135-fs", "opponent", 42, 135, "taunt", "sbtttt"), "battle-scene-on")
    d["overrides"]["parties"]["player"][0]["moves"] = [G.TAUNT, 206, G.TAUNT, G.TAUNT]
    (out / "pb-aud129-ordl-opp-42-135-fs.json").write_text(json.dumps(d, indent=1, sort_keys=True) + "\n")
    for p in sorted(tmp.glob("scenarios/*.json")):
        p.unlink()
    (tmp / "scenarios").rmdir(); tmp.rmdir()
    print(len(P69_JOBS) + len(PHASE_JOBS) + 1, "scenarios")
