#!/usr/bin/env python3
"""rrh7: hand-built Mechanic Lab stage designs for open, not luck-only, rules (markers read from rule-coverage-c-rules.json).
   python3 tools/replay-hunt/makeRrh7.py [OUTDIR]   (default .integration/evidence/rrh7/designs)"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES = {r["id"]: r for r in json.load(open(ROOT / "docs/parity-mac/rule-coverage-c-rules.json"))}
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}

def mon(species, moves, special=False, bulk=False, item=0):
    evs = dict.fromkeys(IV, 0)
    evs["hp"] = 255
    evs["defense" if bulk else ("spAttack" if special else "attack")] = 255
    return {"species": species, "level": 50, "nature": 0, "ivs": dict(IV), "evs": evs, "moves": moves, "item": item, "abilitySlot": 0, "friendship": 0}

def four(species, move, **kw): return mon(species, [move] * 4, **kw)

def design(rule, why, player, opp, actions, seed=90000, cover=None, replacements=None):
    cover = cover if cover is not None else [p["cover"] for p in RULES[rule]["pieces"]]
    d = {"name": why[0], "rules": [rule], "why": why[1], "seed": seed, "challengeNum": 7, "battleNum": 0, "trainerId": 200,
         "playerSetIds": [429, 404, 735], "opponentSetIds": [813, 716, 721], "parties": {"player": player, "opponent": opp},
         "script": {"actions": actions, "then": "census"}, "expect": [], "cover": cover, "coverAny": False}
    if replacements: d["script"]["replacements"] = replacements
    return d

INGRAIN, SANDATTACK, UPROAR, TACKLE, SPLASH, BODYSLAM, FLAMETHROWER = 275, 28, 253, 33, 150, 34, 53
SNORLAX, MACHAMP, HERACROSS, BLISSEY, CHANSEY = 143, 68, 214, 242, 113
CRADILY, TROPIUS, TANGELA, BRELOOM, PARASECT, EXPLOUD = 389, 369, 114, 307, 47, 372
D = {}
D["R049"] = design("R049", ("R049-ai-sand-attack-while-rooted", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. Each AI Pokemon knows Ingrain and three Sand Attacks and the player's Snorlax only Splashes for three turns: after Ingrain the AI's Sand Attack scoring (AI_CV_AccuracyDown, battle_ai_scripts.s:1198) runs its rooted gate (STATUS3_ROOTED, :1217-1219) and the random roll."),
    [mon(SNORLAX, [SPLASH, FLAMETHROWER, FLAMETHROWER, FLAMETHROWER], special=True), four(MACHAMP, FLAMETHROWER, special=True), four(HERACROSS, FLAMETHROWER, special=True)],
    [mon(CRADILY, [INGRAIN, SANDATTACK, SANDATTACK, SANDATTACK]), mon(TROPIUS, [INGRAIN, SANDATTACK, SANDATTACK, SANDATTACK]), mon(TANGELA, [INGRAIN, SANDATTACK, SANDATTACK, SANDATTACK])],
    [{"move": 0}, {"move": 0}, {"move": 0}])
D["R090"] = design("R090", ("R090-uproar-locked-blocked-by-soundproof", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The AI's Breloom knows only Uproar and is locked into it for 2 to 5 turns; the player's Snorlax Splashes, then switches to Exploud (Soundproof) while the Uproar is still running, so the locked Uproar is blocked by Soundproof with HITMARKER_NO_PPDEDUCT (battle_util.c ABILITYEFFECT_MOVES_BLOCK)."),
    [mon(SNORLAX, [SPLASH, BODYSLAM, BODYSLAM, BODYSLAM]), mon(EXPLOUD, [TACKLE] * 4), four(MACHAMP, BODYSLAM)],
    [four(BRELOOM, UPROAR, special=True), four(PARASECT, UPROAR, special=True), four(TROPIUS, UPROAR, special=True)],
    [{"move": 0}, {"switch": 1}])
D["R104"] = design("R104", ("R104-effect-spore-sleep-during-uproar", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The AI's Breloom and Parasect (Effect Spore) know only Uproar and so are almost always in an Uproar; the player's Blissey Tackles them (contact): when Effect Spore rolls sleep, SetMoveEffect's sleep case finds the Uproar and the sleep fails."),
    [mon(BLISSEY, [TACKLE] * 4, bulk=True), mon(SNORLAX, [TACKLE] * 4, bulk=True), mon(CHANSEY, [TACKLE] * 4, bulk=True)],
    [four(BRELOOM, UPROAR, bulk=True), four(PARASECT, UPROAR, bulk=True), four(EXPLOUD, UPROAR, bulk=True)],
    [])

PERISH, CHARGE, ELECTABUZZ, RAICHU, ELECTRODE = 195, 268, 125, 26, 101
D["R059"] = design("R059", ("R059-ai-perish-switch-charged-attacker", "Challenge 7, trainer 200, hand-built Mechanic Lab parties. The AI's Electabuzz knows only Charge (so it is Charged every turn); the player's Snorlax casts Perish Song on turn 0, and when its count reaches 0 the AI switches out voluntarily (ShouldSwitchIfPerishSong, battle_ai_switch_items.c:20-33) and scores the bench with AI_CalcDmg for the Charged attacker (battle_script_commands.c:1306-1319). The Electric branch of that test cannot run: gCurrentMove is 0 at every voluntary switch."),
    [mon(SNORLAX, [PERISH, SPLASH, SPLASH, SPLASH]), four(MACHAMP, BODYSLAM), four(HERACROSS, BODYSLAM)],
    [four(ELECTABUZZ, CHARGE, bulk=True), four(RAICHU, CHARGE, bulk=True), four(ELECTRODE, CHARGE, bulk=True)],
    [{"move": 0}], cover=[RULES["R059"]["pieces"][0]["cover"]])

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".integration/evidence/rrh7/designs")
out.mkdir(parents=True, exist_ok=True)
for rule, d in D.items():
    (out / f"{d['name']}.json").write_text(json.dumps(d, indent=1) + "\n")
    print(out / f"{d['name']}.json")
