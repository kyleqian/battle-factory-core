#!/usr/bin/env python3
"""prep48: liveAdapterFramebuffer.ts fixtures for every Dig body of the prep48 Dig scenarios (from a prep48Probe.py output).

usage: prep48DigFixtures.py <probe-dir> <fixture-dir> [dig|return]
Return (prefix "return"): every Return body, the default "X used RETURN!" text box, turn 0, the same precedingBodies rule.
Per Dig body: denseWindow = [activation, first inactive frame] (setup 195 rows, unleash 68), fieldProfile HP / maxHP from the ROM's
gBattleMons at activation, genders from the scenario, precedingBodies = every earlier animation body of the battle (move bodies by move
id and attacker side, the Dig unleash as its second-branch key 10091, the Growl stat-down body as statAnimation 22 = B_ANIM_STATS_CHANGE
Attack -1, as the Intimidate triple), requestFields.turn = 1 for the unleash, an empty text box for the setup. `digUnleashAfterSetup` only when the setup was the battle's
first body (production lendLiveSpriteOrder's afterDigSetup case); a later setup's unleash takes the replayed order like any body.
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
SPECIES = {333: "VIBRAVA", 334: "FLYGON", 113: "CHANSEY", 76: "GOLEM", 148: "DRAGONAIR", 95: "ONIX", 143: "SNORLAX"}
MOVES = {"Move_QUICK_ATTACK": 98, "Move_GROWL": 45, "Move_DIG": 91, "Move_SPLASH": 150, "Move_RETURN": 216}
SCEN = Path("tools/integration/fixtures/prep48/scenarios")
written = []
PREFIX = sys.argv[3] if len(sys.argv) > 3 else "dig"
for probe in sorted(probe_dir.glob(f"{PREFIX}-*.json")):
    d = json.loads(probe.read_text())
    scen = json.loads((SCEN / d["scenario"]).read_text())
    genders = {side: scen["overrides"]["parties"][side][0]["gender"] for side in ("player", "opponent")}
    units, dig_seen = [], {}
    first_setup_first = {}
    for b in d["bodies"]:
        side = "player" if b["attacker"] == 0 else "opponent"
        label = b["label"]
        if label == "Move_RETURN" and PREFIX == "return":
            k = dig_seen.get(side, 0); dig_seen[side] = k + 1
            at = b["at"]["battlers"]
            atk, tgt = b["attacker"], 1 - b["attacker"]
            fx = {
                "schema": "prep48-live-adapter-fixture/v1", "move": "RETURN", "bodyIndex": k,
                "probe": "tools/integration/prep48Probe.py", "scenario": str(SCEN / d["scenario"]),
                "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"]},
                "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": side}},
                "target": {"species": SPECIES[at[tgt]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                "attackerPersonality": at[atk]["personality"], "displayedStatus": {"player": "none", "opponent": "none"},
                "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                 "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                "requestFields": {"turn": 0},
            }
            if units:
                fx["precedingBodies"] = list(units)
            name = f"{probe.stem}-return{k}.json"
            (out_dir / name).write_text(json.dumps(fx, indent=1) + "\n")
            written.append(name)
            units.append({"moveId": 216, "side": side})
        elif label == "Move_DIG":
            k = dig_seen.get(side, 0); dig_seen[side] = k + 1
            unleash = k % 2 == 1
            if not unleash:
                first_setup_first[side] = len(units) == 0
            at = b["at"]["battlers"]
            atk, tgt = b["attacker"], 1 - b["attacker"]
            fx = {
                "schema": "prep48-live-adapter-fixture/v1", "move": "DIG", "bodyIndex": k,
                "probe": "tools/integration/prep48Probe.py", "scenario": str(SCEN / d["scenario"]),
                "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"]},
                "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": side}},
                "target": {"species": SPECIES[at[tgt]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                "attackerPersonality": at[atk]["personality"], "displayedStatus": {"player": "none", "opponent": "none"},
                "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                 "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                "requestFields": {"turn": 1 if unleash else 0},
            }
            if not unleash:
                fx["messageLines"] = ["", ""]  # the setup body runs under an empty text box (as the prep18 body0 fixtures)
            if units:
                fx["precedingBodies"] = list(units)
            if unleash and first_setup_first.get(side) and len([u for u in units if "statAnimation" not in u]) <= 2 and units[0]["moveId"] == 91:
                # setup was the battle's first body and at most one body since (lendLiveSpriteOrder's afterDigSetup window)
                fx["digUnleashAfterSetup"] = True
            name = f"{probe.stem}-dig{k}-{'unleash' if unleash else 'setup'}.json"
            (out_dir / name).write_text(json.dumps(fx, indent=1) + "\n")
            written.append(name)
            units.append({"moveId": 10091 if unleash else 91, "side": side})
        elif label == "General_StatsChange":
            units.append({"moveId": 0, "side": side, "statAnimation": 22})
        elif label in MOVES:
            units.append({"moveId": MOVES[label], "side": side})
        else:
            units.append({"moveId": -1, "side": side, "label": label})
print("\n".join(written))
