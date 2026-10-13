#!/usr/bin/env python3
"""inv142 (docs/inv142-status-animation-invisible-battler.md): stage the ROM scenarios for a status animation whose battler's sprite is
INVISIBLE: a Dig charge turn (the battler underground, its sprite hidden by Move_DIG's first-turn script), then a check that clears
STATUS3_SEMI_INVULNERABLE (CancelMultiTurnMoves) BEFORE the status animation, so Cmd_status(2)animation emits the receipt:
  love-ply / love-opp: CANCELER_IN_LOVE immobilizes the digger on its Dig strike turn (BattleScript_MoveUsedIsInLove's status2animation);
    the other side (faster) uses Attract on turn 1; the digger (male SANDSLASH, 4 x Dig) is in love with a female PIDGEOT (Dig cannot
    touch the Flying target, so nobody faints). The 50 % love rolls come from the pinned lab "seed" (searched: the first seed whose rolls
    give "pass, then immobilized on the next turn").
  yawn-ply / yawn-opp: ENDTURN_YAWN puts the digger to sleep at the end of its Dig charge turn (BattleScript_YawnMakesAsleep's
    statusanimation): the digger (SANDSLASH, faster) digs on turns 1 / 3, the SLOWBRO (4 x Yawn) Yawns it on turn 2 (turns 1 and 3 miss
    the underground target), the drowsy counter reaches 0 at the end of turn 3.
Parties of three (benches from stq132-attract-ply-primeape-onix.json), EV totals <= 510, opposite genders for Attract, Scene ON, the
explicit lab seed kept. Trace: per turn A, 30 idle, A (FIGHT, slot 0), 1400 idle (stq132's turn shape).
usage: inv142Stage.py <out-dir> [<seed overrides json: {"love-ply": seed, ...}>]
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
seeds = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
os.makedirs(out, exist_ok=True)
base = json.load(open(os.path.join(ROOT, "tools/integration/fixtures/stq132/scenarios/stq132-attract-ply-primeape-onix.json")))
IV = lambda v: {k: v for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
DIG, ATTRACT, YAWN = 91, 213, 281


def mon(species, move, gender, nature, evs, speed_iv):
    ivs = IV(15)
    ivs["speed"] = speed_iv
    return {"species": species, "level": 50, "nature": nature, "ivs": ivs, "evs": evs, "moves": [move] * 4, "ppUps": [0, 0, 0, 0],
            "item": 0, "abilitySlot": 0, "friendship": 0, "gender": gender, "shiny": False}


SLOW = {"hp": 252, "attack": 0, "defense": 128, "speed": 0, "spAttack": 0, "spDefense": 128}
FAST = {"hp": 252, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0}
# natures: 2 Brave (-Spe), 13 Jolly (+Spe), 17 Quiet (-Spe)
SCEN = {
    "love-ply": ("player", mon(28, DIG, "male", 2, SLOW, 0), mon(18, ATTRACT, "female", 13, FAST, 31), 6, 305419897),
    "love-opp": ("opponent", mon(28, DIG, "male", 2, SLOW, 0), mon(18, ATTRACT, "female", 13, FAST, 31), 6, 305419897),
    "yawn-ply": ("player", mon(28, DIG, "male", 13, FAST, 31), mon(80, YAWN, "female", 17, SLOW, 0), 5, 305419897),
    "yawn-opp": ("opponent", mon(28, DIG, "male", 13, FAST, 31), mon(80, YAWN, "female", 17, SLOW, 0), 5, 305419897),
}
index = {}
for name, (digger_side, digger, other, turns, seed) in SCEN.items():
    d = copy.deepcopy(base)
    seed = seeds.get(name, seed)
    d["seed"] = seed
    other_side = "opponent" if digger_side == "player" else "player"
    d["overrides"]["parties"][digger_side][0] = digger
    d["overrides"]["parties"][other_side][0] = other
    for s in ("player", "opponent"):
        for p in d["overrides"]["parties"][s]:
            assert sum(p["evs"].values()) <= 510, p
    seg = []
    for _ in range(turns):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1400, "buttons": []}]
    d["trace"] = {"segments": seg, "captureFrames": [0, sum(s["frames"] for s in seg)]}
    fn = f"inv142-{name}.json"
    open(os.path.join(out, fn), "w").write(json.dumps(d, indent=1) + "\n")
    index[fn] = {"digger": digger_side, "path": "CANCELER_IN_LOVE" if name.startswith("love") else "ENDTURN_YAWN", "seed": seed, "turns": turns}
    print(fn, digger_side, seed)
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=1)
open(os.path.join(out, "index.json"), "a").write("\n")
