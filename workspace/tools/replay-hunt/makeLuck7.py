#!/usr/bin/env python3
"""luck7: hand-built Mechanic Lab designs for two of the three luck-only rules the day hunt could not reach (R040, R110; R063 is retired, see rule-coverage.md luck7); markers read from rule-coverage-c-rules.json.
   python3 tools/replay-hunt/makeLuck7.py [OUTDIR]   (default tools/replay-hunt/luck-designs)"""
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

def design(rule, name, why, player, opp, actions, covers, chance, seeds=200):
    return {"name": name, "rules": [rule], "why": why, "seed": 0, "challengeNum": 7, "battleNum": 0, "trainerId": 200,
            "playerSetIds": [429, 404, 735], "opponentSetIds": [813, 716, 721], "parties": {"player": player, "opponent": opp},
            "script": {"actions": actions, "then": "census"}, "expect": [], "cover": [RULES[rule]["pieces"][i]["cover"] for i in covers],
            "coverAny": True, "chance": chance, "seeds": seeds}

TAUNT, MIRROR_COAT, BRICK_BREAK, SPLASH = 269, 243, 280, 150
DISABLE, TRANSFORM, FLAMETHROWER, BODY_SLAM, SURF, THUNDERBOLT = 50, 144, 53, 34, 57, 85
ROAR, WHIRLWIND, SPIKES = 46, 18, 191
CLEFABLE, CHANSEY, WIGGLYTUFF, MACHAMP, HERACROSS, SNORLAX, BLISSEY = 36, 113, 40, 68, 214, 143, 242
DITTO, SKARMORY, JOLTEON, GENGAR, SHEDINJA = 132, 227, 135, 94, 303
D = {}

D["R040"] = design("R040", "R040-ai-taunts-then-scores-mirror-coat", (
    "Challenge 7, trainer 200, hand-built Mechanic Lab parties (luck7). Each AI Pokemon (Clefable, Chansey, Wigglytuff) knows Taunt x3 and Mirror Coat, no Counter: it picks "
    "Taunt on most turns, and the turn after, the player's Machamp is still taunted (timer 2, one turn-end tick) when AI_CV_MirrorCoat scores the Mirror Coat slot "
    "(battle_ai_scripts.s:2132 / :2144, the `if_target_not_taunted` gates, then the random +1). Machamp Splashes on turn 0 (so the first branch, a status last move, "
    "and later turns' attack last moves reach the two gates), then Brick Breaks (physical: a Mirror Coat user cannot hurt it, a Normal-type foe takes 2x). "
    "Metronome -> Taunt (the old design, 1 call in ~330) reaches the same gate; here the AI's own Taunt does."),
    [mon(MACHAMP, [SPLASH, BRICK_BREAK, BRICK_BREAK, BRICK_BREAK]), four(HERACROSS, BRICK_BREAK), four(SNORLAX, BRICK_BREAK)],
    [mon(CLEFABLE, [TAUNT, TAUNT, TAUNT, MIRROR_COAT]), mon(CHANSEY, [TAUNT, TAUNT, TAUNT, MIRROR_COAT]), mon(WIGGLYTUFF, [TAUNT, TAUNT, TAUNT, MIRROR_COAT])],
    [{"move": 0}], [0, 1], 0.8)

D["R110"] = design("R110", "R110-roar-drags-shedinja-onto-spikes", (
    "Challenge 7, trainer 200, hand-built Mechanic Lab parties (luck7). Each AI Pokemon (Skarmory, Jolteon, Gengar: all faster than the player's) knows Spikes and Roar x3: "
    "Spikes on turn 0 (Spikes scores 100, Roar -3), then Roar every turn (Spikes -10 once up, AI_CBM_Spikes). The player's Pokemon all use Whirlwind (priority -6, the same as Roar, "
    "so the faster AI is the first mover and the player the second): the lead Snorlax, bench Shedinja (1 HP) and Machamp. Each Roar drags a random bench Pokemon in, and when it is "
    "Shedinja the Spikes faint it with Machamp or Snorlax left: the AI's action stops at the player's forced replacement (reduceFactoryFullTurnDecision, pendingSecondAction). "
    "After the script the census player attacks with Flamethrower (the AI never attacks)."),
    [mon(SNORLAX, [WHIRLWIND, FLAMETHROWER, FLAMETHROWER, FLAMETHROWER], special=True), mon(SHEDINJA, [WHIRLWIND, FLAMETHROWER, FLAMETHROWER, FLAMETHROWER], special=True), mon(MACHAMP, [WHIRLWIND, FLAMETHROWER, FLAMETHROWER, FLAMETHROWER], special=True)],
    [mon(SKARMORY, [SPIKES, ROAR, ROAR, ROAR]), mon(JOLTEON, [SPIKES, ROAR, ROAR, ROAR]), mon(GENGAR, [SPIKES, ROAR, ROAR, ROAR])],
    [{"prefer": 0}] * 10, [0, 1], 0.9)

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "tools/replay-hunt/luck-designs")
out.mkdir(parents=True, exist_ok=True)
for rule, d in D.items():
    (out / f"{d['name']}.json").write_text(json.dumps(d, indent=1) + "\n")
    print(out / f"{d['name']}.json")
