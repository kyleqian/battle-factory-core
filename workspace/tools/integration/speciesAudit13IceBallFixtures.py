#!/usr/bin/env python3
"""speciesAudit13 Ice Ball fixtures: tools/integration/lendIceBallFixtures.py over the speciesAudit13IceBallStage.py scenarios (scenario list and
output dir are arguments; lendIceBallFixtures.py writes the committed lend-live set). Counter bodies 1..4 = chain bodies 2..5 of an UNBROKEN
chain from the battle's first Ice Ball: body k is written only when every body 0..k has the ROM's gDynamicBasePower 30 << j (a chain that
resets, e.g. the opponent GLALIE chains here, stops there), and not after a KO / send-in (a replacement battler slot; the deferred lend
declines there). Window = [activation, activation + 76 (counters 1..3) or 132 (counter 4) + lag rows - 1], as lendIceBallFixtures.py.
usage: speciesAudit13IceBallFixtures.py PROBEDIR SCDIR OUTDIR   -> OUTDIR/<stem>-b<k+1>.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D, SC, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
for line in open(SC / "list.tsv"):
    stem, base, side, target, foe_first = line.rstrip("\n").split("\t"); foe_first = foe_first == "True"
    p = json.loads((D / f"{stem}-r1.json").read_text())
    bodies = p["bodies"]
    for k in range(1, len(bodies)):
        rows = bodies[k]; r0 = rows[0]; A = r0["frame"]
        if any(bodies[j][0]["dynamicBasePower"] != 30 << j for j in range(k + 1)):
            print(stem, f"b{k + 1}", "chain reset (gDynamicBasePower", [b[0]["dynamicBasePower"] for b in bodies], "): not written"); break
        if r0["animationBattlers"]["spriteIds"][:2] != [6, 8]:
            print(stem, f"b{k + 1}", "post-KO (battler slots", r0["animationBattlers"]["spriteIds"][:2], "): not written, declines"); break
        lag = [i for i in range(1, len(rows)) if rows[i]["animationRng"] == rows[i - 1]["animationRng"]]
        n = (76 if k < 4 else 132) + len(lag)
        b = r0["battlers"]; foe = "opponent" if side == "player" else "player"
        party = lambda s: r0["parties"][s][b[s]["partyIndex"]]  # noqa: E731
        name = lambda s: S[b[s]["species"]]["name"].replace("SPECIES_", "")  # noqa: E731
        fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "ICE_BALL", "probe": "tools/probe/run-battle-lab-rgb.py",
              "scenario": f"{SC}/{stem}.json", "denseWindow": {"startFrame": A, "endFrame": A + n - 1},
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
        (out / f"{stem}-b{k + 1}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(stem, f"b{k + 1}", fx["denseWindow"], "lag", lag, fx["fieldProfile"]["playerHp"], fx["fieldProfile"]["opponentHp"])
