#!/usr/bin/env python3
"""rrh6: hand-built Mechanic Lab stage designs for open, not luck-only, rules (markers read from rule-coverage-c-rules.json).
   python3 tools/replay-hunt/makeRrh6.py [OUTDIR]   (default .integration/evidence/rrh6/designs)"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES = {r["id"]: r for r in json.load(open(ROOT / "docs/parity-mac/rule-coverage-c-rules.json"))}
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}

def mon(species, moves, special=False):
    evs = dict.fromkeys(IV, 0)
    evs["hp"] = 255
    evs["spAttack" if special else "attack"] = 255
    return {"species": species, "level": 50, "nature": 0, "ivs": dict(IV), "evs": evs, "moves": moves, "item": 0, "abilitySlot": 0, "friendship": 0}

def design(rule, why, player, opp, actions, seed=90000, cover=None):
    cover = cover if cover is not None else [p["cover"] for p in RULES[rule]["pieces"]]
    return {"name": why[0], "rules": [rule], "why": why[1], "seed": seed, "challengeNum": 7, "battleNum": 0, "trainerId": 200,
            "playerSetIds": [429, 404, 735], "opponentSetIds": [813, 716, 721], "parties": {"player": player, "opponent": opp},
            "script": {"actions": actions, "then": "census"}, "expect": [], "cover": cover, "coverAny": False}

CONV2, FLY, LOCKON, BATONPASS, SKILLSWAP, PROTECT = 176, 19, 199, 226, 285, 182
DRAGONCLAW, ROCKSLIDE, PSYCHIC, FLAMEWHEEL, ICEBEAM, SPLASH = 337, 157, 94, 172, 58, 150
AGGRON, DRAGONITE, SALAMENCE, ALTARIA, PIDGEOT, FEAROW, DODRIO = 384, 149, 397, 359, 18, 22, 85
ALAKAZAM, MACHAMP, PRIMEAPE, HERACROSS, GROWLITHE, QUILAVA, NINETALES = 65, 68, 57, 214, 58, 156, 38
CLOYSTER, LAPRAS, WALREIN = 91, 131, 343

def four(species, move, special=False): return mon(species, [move] * 4, special)
D = {}
D["R062"] = design("R062", ("R062-conversion-2-steel-user-dragon-hit", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The player's Aggron (Steel / Rock) is hit by Dragonite's Dragon Claw (only Steel resists Dragon) and uses Conversion 2: the 1000 random picks cannot find a type it lacks, so the second scan runs (Cmd_settypetorandomresistance, battle_script_commands.c:8108-8128)."),
    [mon(AGGRON, [CONV2, ROCKSLIDE, ROCKSLIDE, ROCKSLIDE]), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [four(DRAGONITE, DRAGONCLAW), four(SALAMENCE, DRAGONCLAW), four(ALTARIA, DRAGONCLAW)], [{"move": 0}])
D["R061"] = design("R061", ("R061-conversion-2-two-turn-charging", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. Pidgeot (faster) uses Fly every turn: turn 1 charges, turn 2 hits the player's Aggron, turn 3 charges again while Aggron's Conversion 2 runs: the last landed move is a two-turn move and its user is still charging, so Conversion 2 fails (battle_script_commands.c:8081-8085)."),
    [mon(AGGRON, [CONV2, ROCKSLIDE, ROCKSLIDE, ROCKSLIDE]), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [four(PIDGEOT, FLY), four(FEAROW, FLY), four(DODRIO, FLY)], [{"move": 0}, {"move": 0}, {"move": 0}])
D["R055"] = design("R055", ("R055-baton-pass-by-lock-on-user", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The player's Alakazam uses Lock-On on a Splash-only Snorlax, then Baton Pass while the lock is active: SwitchInClearSetData resets the foe's sure-hit lock to its two-turn form when the Lock-On user passes (battle_main.c:3178-3186)."),
    [mon(ALAKAZAM, [LOCKON, BATONPASS, PSYCHIC, PSYCHIC], True), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [four(143, SPLASH), four(PRIMEAPE, SPLASH), four(AGGRON, SPLASH)], [{"move": 0}, {"move": 1}])
D["R055"]["script"]["replacements"] = [1, 2]
D["R068"] = design("R068", ("R068-frozen-flame-wheel-thaw-hit", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. A Growlithe whose only move is Flame Wheel resists the Ice Beams of Water / Ice foes (10 percent freeze each); when it is frozen the 1-in-5 thaw roll fails and Flame Wheel (EFFECT_THAW_HIT) is let through (battle_util.c:2059-2070)."),
    [four(GROWLITHE, FLAMEWHEEL), four(QUILAVA, FLAMEWHEEL), four(NINETALES, FLAMEWHEEL)],
    [four(CLOYSTER, ICEBEAM, True), four(LAPRAS, ICEBEAM, True), four(WALREIN, ICEBEAM, True)], [])
D["R086"] = design("R086", ("R086-skill-swap-lock-on-protect", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. Foes whose only move is Protect (priority +3): turn 1 Protect blocks the player's Lock-On, turn 2 the second Protect fails (1 in 2) so Lock-On lands, turn 3 Protect works again (the counter was reset) and the Skill Swap is marked missed, Lock-On lets the accuracy check pass, and Cmd_tryswapabilities fails on MOVE_RESULT_NO_EFFECT (battle_script_commands.c:9394-9401)."),
    [mon(ALAKAZAM, [LOCKON, SKILLSWAP, PSYCHIC, PSYCHIC], True), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [four(MACHAMP, PROTECT), four(PRIMEAPE, PROTECT), four(HERACROSS, PROTECT)], [{"move": 0}, {"move": 0}, {"move": 1}])

BEATUP, TOXIC, SPLASH_, CHARM, MEMENTO, OVERHEAT = 251, 92, 150, 204, 262, 315
BLISSEY, ARCANINE, MAGMAR, SNORLAX = 242, 59, 126, 143
D["R056"] = design("R056", ("R056-beat-up-all-poisoned", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. Foes whose only move is Toxic poison each player Pokemon in turn as it comes in (turns 1 to 4: Splash, switch, switch, switch back); on turn 5 the Beat Up user is poisoned and so are both teammates, so Cmd_trydobeatup finds no party member that can attack and fails (battle_script_commands.c:9001-9004)."),
    [mon(MACHAMP, [BEATUP, SPLASH_, ROCKSLIDE, ROCKSLIDE]), four(HERACROSS, ROCKSLIDE), four(PRIMEAPE, ROCKSLIDE)],
    [four(SNORLAX, TOXIC), four(AGGRON, TOXIC), four(BLISSEY, TOXIC)], [{"move": 1}, {"switch": 1}, {"switch": 2}, {"switch": 0}, {"move": 0}])
D["R056"]["script"]["replacements"] = [1, 2]
D["R081"] = design("R081", ("R081-memento-target-at-minimum", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The player's Blissey Charms Arcanine three times (Attack -6) while Arcanine's only move is Overheat (Sp. Atk -2 per use, -6 after three), then uses Memento: Cmd_trymemento fails against a target at minimum Attack and Sp. Atk (battle_script_commands.c:9074-9080)."),
    [mon(BLISSEY, [CHARM, MEMENTO, SPLASH_, SPLASH_]), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [four(ARCANINE, OVERHEAT, True), four(MAGMAR, OVERHEAT, True), four(NINETALES, OVERHEAT, True)], [{"move": 0}, {"move": 0}, {"move": 0}, {"move": 1}])

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".integration/evidence/rrh6/designs")
out.mkdir(parents=True, exist_ok=True)
for rule, d in D.items():
    (out / f"{d['name']}.json").write_text(json.dumps(d, indent=1) + "\n")
    print(out / f"{d['name']}.json")
