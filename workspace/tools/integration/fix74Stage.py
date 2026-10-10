#!/usr/bin/env python3
"""fix74: battle-lab scenarios for the five Factory Bulk Up users (PRIMEAPE, SLAKING, HERACROSS, MACHAMP, URSARING) x both
sides x two slow targets (SNORLAX, SHUCKLE). The user is faster (speed IV 31 / EV 255 vs the target's 0 / 0), so Bulk Up is the
battle's first body. Explicit lab seed (ISSUES #154). Species ids are internal ids (species-stats.json).
  python3 tools/integration/fix74Stage.py <out-dir>"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SPECIES = {s["name"].removeprefix("SPECIES_"): s["id"] for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
USERS = ["PRIMEAPE", "SLAKING", "HERACROSS", "MACHAMP", "URSARING"]
TARGETS = ["SNORLAX", "SHUCKLE"]
SEED = 305420349

def mon(species: str, moves: list[int], fast: bool) -> dict:
    iv = 31 if fast else 0
    return {"species": SPECIES[species], "level": 50, "nature": 0,
            "ivs": {"hp": 31, "attack": 31, "defense": 31, "speed": iv, "spAttack": 31, "spDefense": 31},
            "evs": {"hp": 0, "attack": 0, "defense": 255, "speed": 255 if fast else 0, "spAttack": 0, "spDefense": 0},
            "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}

def filler(species: str) -> dict:
    return mon(species, [33, 33, 33, 33], False)

base = json.loads(Path("tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json").read_text())
names = []
for user in USERS:
    for target in TARGETS:
        for side in ("player", "opponent"):
            u, t = mon(user, [339, 339, 339, 339], True), mon(target, [33, 33, 33, 33], False)
            parties = {"player": [u, filler("ONIX"), filler("GOLEM")], "opponent": [t, filler("ONIX"), filler("GOLEM")]} if side == "player" \
                else {"player": [t, filler("ONIX"), filler("GOLEM")], "opponent": [u, filler("ONIX"), filler("GOLEM")]}
            scenario = {**base, "seed": SEED, "overrides": {"parties": parties}}
            name = f"fix74-{user.lower()}-{side[:3] if side == 'player' else 'opp'}-{target.lower()}"
            name = name.replace("-pla-", "-ply-")
            (OUT / f"{name}.json").write_text(json.dumps(scenario, indent=1) + "\n")
            names.append(name)
print("\n".join(names))
