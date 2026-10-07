#!/usr/bin/env python3
"""Return (216, strongest) live-adapter fixtures from direct-mGBA probe outputs (window = the scenario's own sourceWindow:
activation .. first inactive). usage: returnLiveFixtures.py <probeDir> <outDir>   (probeDir holds <scenario>.json from tools/compare/returnProbe.py)"""
import json, sys, os
probe_dir, out_dir = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
species = {s["id"]: s["name"].replace("SPECIES_", "") for s in json.load(open(f"{root}/src/data/gen/species-stats.json"))["species"]}
SCENARIOS = [
    ("accepted-player-dragonair-opponent-onix", "mechanic-return-player-dragonair-opponent-onix", "player"),
    ("accepted-opponent-dragonair-player-onix", "mechanic-return-opponent-dragonair-player-onix", "opponent"),
    ("alt-player-snorlax-opponent-golem", "prep18-return-alt-snorlax-golem", "player"),
    ("alt-opponent-snorlax-player-golem", "prep18-return-altopp-snorlax-golem", "opponent"),
    ("alt2-player-snorlax-opponent-pidgeot", "prep24-return-alt-snorlax-pidgeot", "player"),
    ("alt2-opponent-snorlax-player-pidgeot", "prep24-return-altopp-snorlax-pidgeot", "opponent"),
    ("alt3-player-scyther-opponent-golbat", "int-return-alt-scyther-golbat", "player"),
    ("alt3-opponent-scyther-player-golbat", "int-return-altopp-scyther-golbat", "opponent"),
]
os.makedirs(out_dir, exist_ok=True)
for name, scenario, side in SCENARIOS:
    p = f"{probe_dir}/{scenario}.json" if os.path.exists(f"{probe_dir}/{scenario}.json") else f"{probe_dir}/{scenario}-r1.json"
    j = json.load(open(p)); f0 = j["frames"][0]; w = j["sourceWindow"]
    pl, op = f0["parties"]["player"][0], f0["parties"]["opponent"][0]
    other = "opponent" if side == "player" else "player"
    fixture = {
        "schema": "return-live-adapter-fixture/v1", "move": "RETURN",
        "probe": "tools/compare/returnProbe.py", "scenario": f"tools/battle-lab/{scenario}.json",
        "denseWindow": {"startFrame": w["startFrame"], "endFrame": w["endFrame"]},
        "windowSource": "window = the scenario's own sourceWindow (activation .. first inactive row, 282 rows) from its direct-mGBA returnProbe.py run",
        "attacker": {"species": species[(pl if side == "player" else op)["species"]], "geometry": {"side": side}},
        "target": {"species": species[(op if side == "player" else pl)["species"]], "geometry": {"side": other}},
        "attackerPersonality": (pl if side == "player" else op)["personality"],
        "displayedStatus": {"player": "none", "opponent": "none"},
        "fieldProfile": {"playerHp": pl["hp"], "playerMaxHp": pl["maxHp"], "opponentHp": op["hp"], "opponentMaxHp": op["maxHp"],
                         "playerGender": pl["gender"], "opponentGender": op["gender"]},
        "requestFields": {"turn": 0},
    }
    json.dump(fixture, open(f"{out_dir}/{name}.json", "w"), indent=1); open(f"{out_dir}/{name}.json", "a").write("\n")
    print(name, w["startFrame"], fixture["attacker"]["species"], fixture["target"]["species"])
