#!/usr/bin/env python3
"""S10A Dive (291) SETUP-body live fixtures from fresh direct-mGBA prep22Probe.py outputs (prep22Probes.sh DIR 1 <scenarios>).
Window = [activation, activation + first inactive] of the scenario's first Dive body (118 rows player attacker / 115 opponent attacker). The
presentation host is pinned to the ROM's gRng2Value at the activation frame (the d4aFixtures.py Meteor Mash recipe: rng2Series[A + 1] stepped
back once). The attack body is not a fixture: it declines (docs/s10a-random2-order-lend-blocker.md).
usage: s10aDiveFixtures.py PROBEDIR   -> tools/integration/fixtures/s10a-live/dive-*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
LCG_INV = pow(1103515245, -1, 2 ** 32)
CASES = [("dive-player-chinchou-opponent-onix", "mechanic-dive-player-chinchou-opponent-onix", "player"),
         ("dive-opponent-chinchou-player-onix", "mechanic-dive-opponent-chinchou-player-onix", "opponent"),
         ("dive-alt-player-lanturn-golem", "prep25-dive-alt-player-lanturn-golem", "player"),
         ("dive-alt-opponent-lanturn-golem", "prep25-dive-alt-opponent-lanturn-golem", "opponent"),
         # one more pair each side: an elevated opponent target (GOLBAT) and a larger player target (GOLEM)
         ("dive-extra-player-chinchou-golbat", "species-audit-golbat-order-consumer-dive-player", "player"),
         ("dive-extra-opponent-chinchou-golem", "species-audit-pgolem-order-consumer-dive-opponent", "opponent"),
         # D4 phase measurement (the player setup row-68 OAM source): more player-attacker windows
         ("dive-extra-player-chinchou-golem", "species-audit-golem-order-consumer-dive-player", "player"),
         ("dive-extra-player-chinchou-shuckle", "species-audit-shuckle-order-consumer-dive-player", "player"),
         ("dive-extra-player-chinchou-golem-prep11", "prep11-audit-golem-order-consumer-dive-player", "player")]
# Player setup row-68 OAM source (D4 oam-transfer-row, liveMoveTimingPolicy.ts 291): measured per window by rendering ROM row 68 against the live
# rows of source 66 / 67 (the policy phase renders 66; "event"). Opponent attackers have no such row.
ROW68_SOURCE = {"mechanic-dive-player-chinchou-opponent-onix": 66, "prep25-dive-alt-player-lanturn-golem": 66,
                "species-audit-shuckle-order-consumer-dive-player": 66, "prep11-audit-golem-order-consumer-dive-player": 66,
                "species-audit-golbat-order-consumer-dive-player": 67, "species-audit-golem-order-consumer-dive-player": 67}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/s10a-live"
for tag, scen, side in CASES:
    p = json.loads((D / f"{scen}-r1.json").read_text())
    bodies = p["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == 291)
    body = bodies[idx]
    A, E = body["start"], body["end"]
    rows = E - A + 1
    assert rows == (118 if side == "player" else 115), (scen, rows)
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    r2 = dict((f, v) for f, v in p["rng2Series"])
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "DIVE", "probe": "tools/probe/run-battle-lab-rgb.py",
          "scenario": f"tools/battle-lab/{scen}.json", "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
          "windowSource": f"window = [activation, activation + {rows} - 1] (the setup body + its first inactive row) from a fresh prep22Probes.sh run",
          "timingPhase": None if side == "opponent" else "event" if ROW68_SOURCE[scen] == 66 else "no-event",
          **({} if side == "opponent" else {"timingPhases": {"oam-transfer-row": "event" if ROW68_SOURCE[scen] == 66 else "no-event"},
                                            "row68Source": ROW68_SOURCE[scen]}),
          "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
          "target": {"species": name(sp[foe]), "geometry": {"side": foe}}, "attackerPersonality": sp[side]["personality"],
          "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
          "requestFields": {"turn": 0},
          # The first (charge) turn prints an empty string before the setup body (two-turn script; the Solar Beam setup precedent).
          "messageLines": ["", ""],
          "presentationRngActivation": {"value": ((r2[A + 1] - 24691) * LCG_INV) & 0xFFFFFFFF,
                                        "source": f"prep22Probe.py rng2Series[{A + 1}] stepped back once (activation frame {A})"}}
    pre = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} for b in bodies[:idx]]
    if pre: fx["precedingBodies"] = pre
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], rows, pre, fx["displayedStatus"])
