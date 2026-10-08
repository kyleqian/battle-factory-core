#!/usr/bin/env python3
"""S10A live dense fixtures for scoped-exact adapters without a CPU phase (Spit Up 255, all three Stockpile counters) from TWO fresh direct-mGBA
prep22Probe.py runs per scenario (prep22Probes.sh DIR 2 <scenarios>; the runs must agree on every body). Window = [activation, end] of the
scenario's FIRST body of the move (its own activation and length); request.turn = the Stockpile counter (prep29 / prep31: animTurn - 1 at
activation); precedingBodies = every unit before it (Growl's stat-change unit = statAnimation 21). Same recipe as d4aFixtures.py.
Superpower 276 (D4 faithful timing): the monbg write row T (10 | 11) is the prep31 measurement (first monbg HOFS change; prep22Probe records
BGnCNT only, and the WEEZING player window holds bg2cnt at the monbg value from row 0): tools/integration/fixtures/prep31/superpower-pixels.json.
Skill Swap 285 (D4 faithful timing, prep35): optional-lag-age 176 ("event" = 196 rows) measured from the body length; palette-transfer-row
("event" = the bank-2 restore on row 176) = the prep35 measurement tools/integration/fixtures/prep35/skillswap-check-pixels.json windows[].T.restoreRow.
Flatter 260 (D3 faithful random, prep32 / prep35): 219 rows; the presentation host is pinned to the ROM gRng2Value at the activation frame
(rng2Series[A + 1] stepped back once, as d4aFixtures.py Meteor Mash).
Eruption 284 (scoped exact, prep36): window = [activation, first inactive row] = endAge + 1 rows (476 / 482 / 494 / 500, attacker geometry).
usage: s10aLiveFixtures.py PROBEDIR [SPIT_UP|SUPERPOWER|SKILL_SWAP|FLATTER|ERUPTION]   -> tools/integration/fixtures/s10a-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
COUNTERS = {"one": 1, "two": 2, "three": 3}
ONLY = set(sys.argv[2:])
CASES = []
PREP31_MONBG_ROW = {"mechanic-superpower-player-nidoqueen-opponent-onix": 10, "mechanic-superpower-opponent-registeel-player-regirock": 11,
                    "prep25-superpower-alt-player-machamp-golem": 11, "prep25-superpower-alt-opponent-machamp-golem": 11,
                    "prep31-superpower-alt-player-machamp-weezing": 10, "prep31-superpower-alt-opponent-weezing-snorlax": 11}
SP_CASES = [("superpower-player-nidoqueen-opponent-onix", "mechanic-superpower-player-nidoqueen-opponent-onix", "player"),
            ("superpower-opponent-registeel-player-regirock", "mechanic-superpower-opponent-registeel-player-regirock", "opponent"),
            ("superpower-alt-player-machamp-golem", "prep25-superpower-alt-player-machamp-golem", "player"),
            ("superpower-alt-opponent-machamp-golem", "prep25-superpower-alt-opponent-machamp-golem", "opponent"),
            ("superpower-alt-player-machamp-weezing", "prep31-superpower-alt-player-machamp-weezing", "player"),
            ("superpower-alt-opponent-weezing-snorlax", "prep31-superpower-alt-opponent-weezing-snorlax", "opponent")]
PREP35_RESTORE_ROW = {"mechanic-skill-swap-player-girafarig-opponent-shuckle": 175, "mechanic-skill-swap-opponent-girafarig-player-shuckle": 175,
                      "prep22-skill-swap-alt-player-alakazam-golem": 176, "prep22-skill-swap-alt-opponent-alakazam-golem": 175,
                      "prep33-skill-swap-alt-player-espeon-weezing": 175, "prep33-skill-swap-alt-opponent-weezing-snorlax": 175}
SS_CASES = [("skill-swap-player-girafarig-opponent-shuckle", "mechanic-skill-swap-player-girafarig-opponent-shuckle", "player"),
            ("skill-swap-opponent-girafarig-player-shuckle", "mechanic-skill-swap-opponent-girafarig-player-shuckle", "opponent"),
            ("skill-swap-alt-player-alakazam-golem", "prep22-skill-swap-alt-player-alakazam-golem", "player"),
            ("skill-swap-alt-opponent-alakazam-golem", "prep22-skill-swap-alt-opponent-alakazam-golem", "opponent"),
            ("skill-swap-alt-player-espeon-weezing", "prep33-skill-swap-alt-player-espeon-weezing", "player"),
            ("skill-swap-alt-opponent-weezing-snorlax", "prep33-skill-swap-alt-opponent-weezing-snorlax", "opponent")]
FL_CASES = [("flatter-player-nidorina-opponent-onix", "mechanic-flatter-player-nidorina-opponent-onix", "player"),
            ("flatter-opponent-nidorina-player-onix", "mechanic-flatter-opponent-nidorina-player-onix", "opponent"),
            ("flatter-alt-player-hypno-golem", "prep25-flatter-alt-player-hypno-golem", "player"),
            ("flatter-alt-opponent-hypno-golem", "prep25-flatter-alt-opponent-hypno-golem", "opponent"),
            # extra pinned activation values (the accepted / prep25 scenarios with 13 / 29 idle frames before the first input: still the first body)
            ("flatter-pin-player-nidorina-opponent-onix-pad13", "sf-flatter-pin-player-nidorina-opponent-onix-pad13", "player"),
            ("flatter-pin-opponent-hypno-golem-pad29", "sf-flatter-pin-opponent-hypno-golem-pad29", "opponent")]
# Eruption: the accepted "camerupt" scenarios stage species 323 (BARBOACH, prep36 s0.1); prep36 CAMERUPT is internal 340. The ONIX idle-rest
# attacker window (prep36-eruption-alt-opponent-onix-golem) declines by the attacker idle-rest gate and has no dense fixture.
ER_CASES = [("eruption-player-barboach-opponent-onix", "mechanic-eruption-player-camerupt-opponent-onix", "player"),
            ("eruption-opponent-barboach-player-onix", "mechanic-eruption-opponent-camerupt-player-onix", "opponent"),
            ("eruption-alt-player-torkoal-golem", "prep29-eruption-alt-player-torkoal-golem", "player"),
            ("eruption-alt-opponent-torkoal-golem", "prep29-eruption-alt-opponent-torkoal-golem", "opponent"),
            ("eruption-alt-player-camerupt-golem", "prep36-eruption-alt-player-camerupt-golem", "player"),
            ("eruption-alt-opponent-camerupt-golem", "prep36-eruption-alt-opponent-camerupt-golem", "opponent"),
            ("eruption-alt-player-steelix-golem", "prep36-eruption-alt-player-steelix-golem", "player"),
            ("eruption-alt-player-camerupt-weezing", "prep36-eruption-alt-player-camerupt-weezing", "player"),
            ("eruption-alt-opponent-weezing-golem", "prep36-eruption-alt-opponent-weezing-golem", "opponent")]
LCG_INV = pow(1103515245, -1, 2 ** 32)
for side in ("player", "opponent"):
    for word, counter in COUNTERS.items():
        CASES.append((f"spit-up-{side}-{counter}", f"mechanic-spit-up-{side}-swalot-{word}-stockpile", side, counter))
        CASES.append((f"spit-up-alt-{side}-seviper-golem-{counter}", f"prep29-spit-up-alt-{side}-seviper-golem-{word}-stockpile", side, counter))
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
side_of = lambda b: "player" if b["atActivation"]["attacker"] == 0 else "opponent"
out = R / "tools/integration/fixtures/s10a-live"
out.mkdir(exist_ok=True)
ALL = ([("SPIT_UP", 255, *c) for c in CASES] if not ONLY or "SPIT_UP" in ONLY else []) + \
      ([("SUPERPOWER", 276, t, sc, sd, None) for t, sc, sd in SP_CASES] if not ONLY or "SUPERPOWER" in ONLY else []) + \
      ([("SKILL_SWAP", 285, t, sc, sd, None) for t, sc, sd in SS_CASES] if not ONLY or "SKILL_SWAP" in ONLY else []) + \
      ([("FLATTER", 260, t, sc, sd, None) for t, sc, sd in FL_CASES] if not ONLY or "FLATTER" in ONLY else []) + \
      ([("ERUPTION", 284, t, sc, sd, None) for t, sc, sd in ER_CASES] if not ONLY or "ERUPTION" in ONLY else [])
for move, mid, tag, scen, side, counter in ALL:
    p1, p2 = (json.loads((D / f"{scen}-r{r}.json").read_text()) for r in (1, 2))
    key = lambda p: [(b["move"], b["start"], b["end"], b["atActivation"]["attacker"]) for b in p["bodies"]]
    assert key(p1) == key(p2), (scen, "fresh runs disagree")
    bodies = p1["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == mid)
    body = bodies[idx]
    assert side_of(body) == side, (scen, "side")
    A, E = body["start"], body["end"]
    rows = E - A + 1
    assert rows == {"SPIT_UP": 109 if counter == 3 else 108, "SUPERPOWER": 248, "SKILL_SWAP": rows if rows in (195, 196) else -1, "FLATTER": 219,
                    "ERUPTION": rows if rows in (476, 482, 494, 500) else -1}[move], (scen, rows)
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    fx = {
        "schema": "d4a-live-adapter-fixture/v1", "move": move,
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": E},
        "windowSource": f"window = [activation, first inactive row] of this scenario's first {move} body ({rows} rows) from 2 fresh prep22Probes.sh runs (bodies agree)",
        **({"requestFields": {"turn": counter}} if move == "SPIT_UP" else
           {"timingPhase": "event" if rows == 196 else "no-event", "timingPhases": {"optional-lag-age": "event" if rows == 196 else "no-event",
            "palette-transfer-row": "event" if PREP35_RESTORE_ROW[scen] == 176 else "no-event"}, "restoreRow": PREP35_RESTORE_ROW[scen]} if move == "SKILL_SWAP" else
           {"presentationRngActivation": {"value": ((dict((f, v) for f, v in p1["rng2Series"])[A + 1] - 24691) * LCG_INV) & 0xFFFFFFFF,
            "source": f"prep22Probe.py rng2Series[{A + 1}] stepped back once (activation frame {A})"}} if move == "FLATTER" else
           {} if move == "ERUPTION" else
           {"timingPhase": "event" if PREP31_MONBG_ROW[scen] == 11 else "no-event", "timingPhases": {"bg-write-row": "event" if PREP31_MONBG_ROW[scen] == 11 else "no-event"},
            "monbgCntRow": PREP31_MONBG_ROW[scen]}),
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
    }
    pre = []
    for i, b in enumerate(bodies[:idx]):
        if b["move"] != 0: pre.append({"moveId": b["move"], "side": side_of(b)})
        else:
            assert i > 0 and bodies[i - 1]["move"] == 45, (scen, "unexpected non-move unit")  # Growl's stat-change unit
            pre.append({"moveId": 0, "side": side_of(b), "statAnimation": 21})
    if pre: fx["precedingBodies"] = pre
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, A, E, rows, fx["attacker"]["species"], "->", fx["target"]["species"], [b["moveId"] for b in pre])
