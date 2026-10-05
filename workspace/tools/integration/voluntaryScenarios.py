#!/usr/bin/env python3
"""Base parties + stager plans of the voluntary-switch scenarios (docs/voluntary-switch-lend-audit.md s1).
usage: voluntaryScenarios.py <out-dir>   -> writes <out-dir>/base-<name>.json and prints {name: plan} (plain python, no mGBA)
Every staged scenario is tools/battle-lab/voluntary-<name>.json (voluntaryStage.py output: the base + a fixed trace)."""
import json, sys
from pathlib import Path

BASE = {"schemaVersion": 1, "mode": "mechanicLab", "profile": "battle-scene-on", "level": 50, "challengeNum": 4, "battleNum": 0,
        "trainerId": 150, "playerSetIds": [495, 496, 497], "opponentSetIds": [498, 499, 500], "seed": 305419897}


def mon(species, moves, speed=31, level=50, nature=0, gender="male"):
    return {"species": species, "level": level, "nature": nature,
            "ivs": {"hp": 31, "attack": 31, "defense": 31, "speed": speed, "spAttack": 31, "spDefense": 31},
            "evs": {"hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0}, "moves": moves,
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": gender, "shiny": False}




SWIFT, SUNNY, TBOLT, LSCREEN, HEALBELL, GIGA, FLAME, SPLASH = 129, 241, 85, 113, 215, 202, 53, 150
JOLTEON, SNORLAX, MAGIKARP, SLOWBRO, NINETALES, SHEDINJA = 135, 143, 129, 80, 38, 303
slowbro = lambda move: mon(SLOWBRO, [move] * 4, speed=0, nature=2)  # Brave, speed 0: always moves second
SCENARIOS = {
    # A: JOLTEON lead (faster than SLOWBRO); cancel then Sunny Day; voluntary switch to party slot 1 (SNORLAX); Heal Bell; Light Screen.
    "cancel-slot1": ({"player": [mon(JOLTEON, [SUNNY, SWIFT, TBOLT, LSCREEN]), mon(SNORLAX, [HEALBELL, LSCREEN, SWIFT, SUNNY]),
                                 mon(MAGIKARP, [SPLASH] * 4)], "opponent": [slowbro(SWIFT)] * 3},
                     {"turns": [{"cancel": True}, 0, {"switch": 1}, 0, 1], "frames": 5200}),
    # B: NINETALES lead vs fast JOLTEON x3 (Swift first every turn); cancel then Sunny Day; voluntary switch to party slot 2 (SNORLAX);
    # Light Screen; Heal Bell.
    "cancel-slot2": ({"player": [mon(NINETALES, [SUNNY, SWIFT, FLAME, LSCREEN]), mon(MAGIKARP, [SPLASH] * 4),
                                 mon(SNORLAX, [LSCREEN, HEALBELL, SWIFT, SUNNY])], "opponent": [mon(JOLTEON, [SWIFT] * 4, speed=0, nature=2)] * 3},
                     {"turns": [{"cancel": True}, 0, {"switch": 2}, 0, 1], "frames": 5200}),
    # C: player faint -> forced switch-in (NINETALES) -> opponent KO (Flamethrower KOs SHEDINJA) + send-out (SLOWBRO) -> Sunny Day, Swift.
    "faint-ko-sunnyday": ({"player": [mon(MAGIKARP, [SPLASH] * 4, speed=0, level=5), mon(NINETALES, [FLAME, SUNNY, SWIFT, LSCREEN]),
                                      mon(SNORLAX, [SWIFT] * 4)], "opponent": [mon(SHEDINJA, [SWIFT] * 4, speed=0, nature=2, gender="genderless"), slowbro(SWIFT), slowbro(SWIFT)]},
                          {"turns": [0, 0, 1, 2], "forcedDown": 1, "frames": 5200}),
    # D: voluntary switch to slot 1 (NINETALES; a JOLTEON's Volt Absorb skips the animation) into a Thunderbolt opponent (85:opponent has no EXACT plan: the last relied-on edge is its activation).
    "slot1-thunderbolt": ({"player": [mon(SNORLAX, [SWIFT] * 4, speed=0), mon(NINETALES, [SUNNY, SWIFT, FLAME, LSCREEN]), mon(MAGIKARP, [SPLASH] * 4)],
                           "opponent": [slowbro(TBOLT)] * 3},
                          {"turns": [{"switch": 1}, 0], "frames": 2600}),
    # E: voluntary switch to slot 2 into a Giga Drain opponent (202:opponent has no EXACT plan).
    "slot2-gigadrain": ({"player": [mon(JOLTEON, [SWIFT] * 4), mon(MAGIKARP, [SPLASH] * 4), mon(SNORLAX, [SUNNY, SWIFT, LSCREEN, HEALBELL])],
                         "opponent": [slowbro(GIGA)] * 3},
                        {"turns": [{"switch": 2}, 0], "frames": 2600}),
    # F: SNORLAX lead (faster than SLOWBRO); cancel, then Light Screen (allocator consumer as the first body after a cancelled menu),
    # Swift; T2 Heal Bell, Swift.
    "cancel-lightscreen": ({"player": [mon(SNORLAX, [LSCREEN, HEALBELL, SWIFT, SUNNY]), mon(JOLTEON, [SWIFT] * 4), mon(MAGIKARP, [SPLASH] * 4)],
                           "opponent": [slowbro(SWIFT)] * 3},
                          {"turns": [{"cancel": True}, 0, 1], "frames": 2400}),
}

if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    plans = {}
    for name, (parties, plan) in SCENARIOS.items():
        (out / f"base-{name}.json").write_text(json.dumps({**BASE, "overrides": {"parties": parties},
                                                           "trace": {"segments": [{"frames": 1, "buttons": []}]}}) + "\n")
        plans[name] = plan
    print(json.dumps(plans))
