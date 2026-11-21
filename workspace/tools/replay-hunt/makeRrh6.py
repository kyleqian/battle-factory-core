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
D["R055"] = design("R055", ("R055-baton-pass-carries-lock-on", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The player's faster Alakazam uses Lock-On on a foe whose only move is Baton Pass: the foe passes while the lock is active, so SwitchInClearSetData resets the lock to its two-turn form (battle_main.c:3178-3186)."),
    [mon(ALAKAZAM, [LOCKON, PSYCHIC, PSYCHIC, PSYCHIC], True), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [four(MACHAMP, BATONPASS), four(PRIMEAPE, BATONPASS), four(HERACROSS, BATONPASS)], [{"move": 0}])
D["R068"] = design("R068", ("R068-frozen-flame-wheel-thaw-hit", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. A Growlithe whose only move is Flame Wheel resists the Ice Beams of Water / Ice foes (10 percent freeze each); when it is frozen the 1-in-5 thaw roll fails and Flame Wheel (EFFECT_THAW_HIT) is let through (battle_util.c:2059-2070)."),
    [four(GROWLITHE, FLAMEWHEEL), four(QUILAVA, FLAMEWHEEL), four(NINETALES, FLAMEWHEEL)],
    [four(CLOYSTER, ICEBEAM, True), four(LAPRAS, ICEBEAM, True), four(WALREIN, ICEBEAM, True)], [])
D["R086"] = design("R086", ("R086-skill-swap-lock-on-protect", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The player's Lock-On on a foe that does not Protect that turn, then Skill Swap on the turn the foe Protects (priority +3): the Protect marks the move missed, Lock-On lets the accuracy check pass, and Cmd_tryswapabilities fails on MOVE_RESULT_NO_EFFECT (battle_script_commands.c:9394-9401)."),
    [mon(ALAKAZAM, [LOCKON, SKILLSWAP, PSYCHIC, PSYCHIC], True), four(HERACROSS, ROCKSLIDE), four(MACHAMP, ROCKSLIDE)],
    [mon(MACHAMP, [PROTECT, SPLASH, SPLASH, SPLASH]), mon(PRIMEAPE, [PROTECT, SPLASH, SPLASH, SPLASH]), mon(HERACROSS, [PROTECT, SPLASH, SPLASH, SPLASH])], [{"move": 0}, {"move": 1}])

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".integration/evidence/rrh6/designs")
out.mkdir(parents=True, exist_ok=True)
for rule, d in D.items():
    (out / f"{d['name']}.json").write_text(json.dumps(d, indent=1) + "\n")
    print(out / f"{d['name']}.json")
