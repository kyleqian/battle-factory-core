#!/usr/bin/env python3
"""S10A Ice Ball (301) counter-0 live fixtures (the first body of a chain) from fresh direct-mGBA iceBallProbe.py outputs.
Window = [activation, activation + 75] (76 rows: 75 steps + the first inactive row; no lag row in any counter-0 body, prep26 s1.4). The presentation
host is pinned to the ROM's animationRng at the activation row (row 0; the reducer / prep26 shardWords replay 37 steps then 2 words per shard).
usage: s10aIceBallFixtures.py PROBEDIR   (PROBEDIR holds <scenario>-r1.json)   -> tools/integration/fixtures/s10a-live/ice-ball-*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
# (tag, scenario, attacker side, preceding units): the accepted pair's Ice Ball follows the faster REGISTEEL's Tackle (+ its hit blip).
CASES = [("ice-ball-player-spheal-opponent-registeel", "mechanic-ice-ball-player-spheal-opponent-onix", "player", [{"moveId": 33, "side": "opponent"}]),
         ("ice-ball-opponent-spheal-player-registeel", "mechanic-ice-ball-opponent-spheal-player-onix", "opponent", [{"moveId": 33, "side": "player"}]),
         ("ice-ball-alt-player-glalie-golem", "prep25-ice-ball-alt-player-glalie-golem", "player", []),
         ("ice-ball-alt-opponent-glalie-golem", "prep25-ice-ball-alt-opponent-glalie-golem", "opponent", [])]
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/s10a-live"
for tag, scen, side, pre in CASES:
    p = json.loads((D / f"{scen}-r1.json").read_text())
    rows = p["bodies"][0]
    r0 = rows[0]; A = r0["frame"]
    assert len(rows) == 76 and r0["age"] == 0, (scen, len(rows))
    b = r0["battlers"]; foe = "opponent" if side == "player" else "player"
    party = lambda s: r0["parties"][s][b[s]["partyIndex"]]
    name = lambda s: S[b[s]["species"]]["name"].replace("SPECIES_", "")
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "ICE_BALL", "probe": "tools/probe/run-battle-lab-rgb.py",
          "scenario": f"tools/battle-lab/{scen}.json", "denseWindow": {"startFrame": A, "endFrame": A + 75},
          "windowSource": "window = [activation, activation + 75] (counter-0 body, 76 rows) from a fresh iceBallProbe.py run",
          "timingPhase": "no-event", "attacker": {"species": name(side), "geometry": {"side": side}},
          "target": {"species": name(foe), "geometry": {"side": foe}}, "attackerPersonality": party(side)["personality"],
          "fieldProfile": {"playerHp": b["player"]["hp"], "playerMaxHp": b["player"]["maxHp"], "opponentHp": b["opponent"]["hp"],
                           "opponentMaxHp": b["opponent"]["maxHp"], "playerGender": gender(b["player"]["species"], party("player")["personality"]),
                           "opponentGender": gender(b["opponent"]["species"], party("opponent")["personality"])},
          "requestFields": {"turn": 0, "power": 30, "rolloutCounter": 1},
          "presentationRngActivation": {"value": r0["animationRng"], "source": f"iceBallProbe.py bodies[0][0].animationRng (activation frame {A})"}}
    if pre: fx["precedingBodies"] = pre
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], fx["presentationRngActivation"]["value"], fx["fieldProfile"])
