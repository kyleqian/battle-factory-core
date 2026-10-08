#!/usr/bin/env python3
"""Deferred-lend Ice Ball (301) live fixtures: counter bodies 1..4 (chain bodies 2..5) from fresh direct-mGBA iceBallProbe.py outputs
(tools/integration/lendIceBallProbes.sh). Window = [activation, activation + rows - 1] through the first inactive row: 76 rows (counters
0..3, + 1 when the body measured a lag row) / 132 rows (counter 4, + 1 with its lag row). timingPhase = the body's measured lag (a 0-step
animationRng stall). Presentation words are pinned per chain body from the scenario's own probed activation values (bodies[k][0].animationRng):
the current body in presentationRngActivation, the earlier ones in iceBallChain.earlier. Post-KO bodies (a replacement battler slot) are not
written: the deferred lend declines after a KO / send-in (not modelled). Body k is written only while every body 0..k has the ROM's
gDynamicBasePower 30 << j (the counter label; a reset chain stops there, as speciesAudit13IceBallFixtures.py).
usage: lendIceBallFixtures.py PROBEDIR   (PROBEDIR holds <scenario>-r1.json)   -> tools/integration/fixtures/lend-live/ice-ball-*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
# (tag, scenario, attacker side, foe's Tackle first each turn): the accepted SPHEAL is slower than REGISTEEL; GLALIE is faster than GOLEM.
CASES = [("player-spheal-opponent-registeel", "mechanic-ice-ball-player-spheal-opponent-onix", "player", True),
         ("opponent-spheal-player-registeel", "mechanic-ice-ball-opponent-spheal-player-onix", "opponent", True),
         ("alt-player-glalie-golem", "prep25-ice-ball-alt-player-glalie-golem", "player", False),
         ("alt-opponent-glalie-golem", "prep25-ice-ball-alt-opponent-glalie-golem", "opponent", False)]
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/lend-live"; out.mkdir(parents=True, exist_ok=True)
for tag, scen, side, foe_first in CASES:
    p = json.loads((D / f"{scen}-r1.json").read_text())
    bodies = p["bodies"]
    for k in range(1, len(bodies)):
        rows = bodies[k]; r0 = rows[0]; A = r0["frame"]
        if r0["animationBattlers"]["spriteIds"][:2] != [6, 8]:
            print(tag, f"b{k + 1}", "post-KO (battler slots", r0["animationBattlers"]["spriteIds"][:2], "): not written, declines"); continue
        # Body k is counter k only while the ROM's chain has not reset (species audit 13: a chain can reset, gDynamicBasePower 30, 60, 30, ..).
        if any(bodies[j][0]["dynamicBasePower"] != 30 << j for j in range(k + 1)):
            print(tag, f"b{k + 1}", "chain reset (gDynamicBasePower", [x[0]["dynamicBasePower"] for x in bodies], "): not written"); break
        lag = [i for i in range(1, len(rows)) if rows[i]["animationRng"] == rows[i - 1]["animationRng"]]
        n = (76 if k < 4 else 132) + len(lag)
        b = r0["battlers"]; foe = "opponent" if side == "player" else "player"
        party = lambda s: r0["parties"][s][b[s]["partyIndex"]]
        name = lambda s: S[b[s]["species"]]["name"].replace("SPECIES_", "")
        fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "ICE_BALL", "probe": "tools/probe/run-battle-lab-rgb.py",
              "scenario": f"tools/battle-lab/{scen}.json", "denseWindow": {"startFrame": A, "endFrame": A + n - 1},
              "windowSource": f"window = [activation, activation + {n - 1}] (counter-{k} body through the first inactive row; lag rows {lag}) from a fresh iceBallProbe.py run",
              "timingPhase": "event" if lag else "no-event", "attacker": {"species": name(side), "geometry": {"side": side}},
              "target": {"species": name(foe), "geometry": {"side": foe}}, "attackerPersonality": party(side)["personality"],
              "fieldProfile": {"playerHp": b["player"]["hp"], "playerMaxHp": b["player"]["maxHp"], "opponentHp": b["opponent"]["hp"],
                               "opponentMaxHp": b["opponent"]["maxHp"], "playerGender": gender(b["player"]["species"], party("player")["personality"]),
                               "opponentGender": gender(b["opponent"]["species"], party("opponent")["personality"])},
              "requestFields": {"turn": 0, "power": 30 << k, "rolloutCounter": k + 1},
              "presentationRngActivation": {"value": r0["animationRng"], "source": f"iceBallProbe.py bodies[{k}][0].animationRng (activation frame {A})"},
              "iceBallChain": {"foeFirst": foe_first, "earlier": [{"value": bodies[j][0]["animationRng"],
                               "source": f"iceBallProbe.py bodies[{j}][0].animationRng (activation frame {bodies[j][0]['frame']})"} for j in range(k)]}}
        (out / f"ice-ball-{tag}-b{k + 1}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(tag, f"b{k + 1}", fx["denseWindow"], "lag", lag, fx["fieldProfile"]["playerHp"], fx["fieldProfile"]["opponentHp"])
