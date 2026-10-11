#!/usr/bin/env python3
"""stg107 (docs/stg107-struggle.md): REAL forced-Struggle 165 scenarios for the semantic battle lab (`overrides.parties`, three complete
party members per side, no transient-state injection; the stock ROM decides every outcome). Lab seed ALWAYS pinned (ISSUES #154).
Species are INTERNAL ids (Shedinja 303, Dusclops 362; Kanto / Johto ids equal the national dex).

Routes (no RNG in the forcing condition):
  TAUNT  the Taunt user is FASTER than the struggler, whose four slots are all Harden 106 (power 0: CheckMoveLimitations' taunt bit;
         Harden, not Splash: every body of the battle then has a production live adapter for the audit-20 render check).
         T1 Taunt lands first (tauntTimer 2) -> the struggler's Harden fails; ENDTURN_TAUNT -> 1; T2 the struggler has no usable move ->
         the selection script BattleScript_NoMovesLeft -> MOVE_STRUGGLE; ENDTURN_TAUNT -> 0; T3 Taunt again; T4 Struggle again, ...
         Player struggler: FIGHT (A) prints "<mon> has no moves left!" and the turn runs (no move menu). Opponent struggler: the same
         selection state (HandleTurnActionSelectionState is battler-agnostic; the opponent controller skips the selection string).
  PP     PP exhaustion: the struggler knows ONE 5-PP move (Mean Look 212) against a Pressure target (Dusclops 362, ability slot 0; it knows Harden x4): two
         PP per use (5 -> 3 -> 1 -> 0), Struggle from T4 on, every later turn too.
Jobs: (id, struggler side, struggler, target, route, extra player inputs, turns). Turn input = FIGHT -> first move (plans48Probe.TURN with 1500 idle frames: a
Taunt turn runs ~1360 frames);
`sub` jobs: the player (the Taunt user) uses Substitute (slot 2: RIGHT) on T2 so the opponent's first Struggle hits the doll.
A Taunt turn runs past the next input group (its A presses land before the turn ends and start nothing): input groups 1 / 3 / 4 / 6
are turns T1 / T2 / T3 / T4 (measured: turn-counter changes at frames 1610 / ~3590 / 6212 / ~8190).
usage: stg107Stage.py <out-dir> [--off]   (--off: Scene OFF copies, profile battle-scene-off, for the OFF parity controls)
"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import sw67Probe as S67  # GENDER only

SEED = 305420349
BASE = Path("tools/battle-lab/mechanic-taunt-player-murkrow-opponent-shuckle.json")
HARDEN, TAUNT, SUBSTITUTE, MEAN_LOOK, TACKLE = 106, 269, 164, 212, 33
FAST = dict(nature=13, ivs=dict(hp=31, attack=31, defense=31, speed=31, spAttack=31, spDefense=31),
            evs=dict(hp=252, attack=0, defense=0, speed=252, spAttack=0, spDefense=0))
SLOW = dict(nature=2, ivs=dict(hp=31, attack=31, defense=31, speed=0, spAttack=31, spDefense=31),
            evs=dict(hp=252, attack=252, defense=0, speed=0, spAttack=0, spDefense=0))
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1500, "buttons": []}]
SUB_TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["RIGHT"]}, {"frames": 20, "buttons": []},
            {"frames": 2, "buttons": ["A"]}, {"frames": 1500, "buttons": []}]
BACK_TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["LEFT"]}, {"frames": 20, "buttons": []},
             {"frames": 2, "buttons": ["A"]}, {"frames": 1500, "buttons": []}]

# id, struggler side, struggler species, target species, route, player turn plan ("t" = TURN, "s" = SUB_TURN, "b" = BACK_TURN)
JOBS = [
    ("stg107-ply-95-42", "player", 95, 42, "taunt", "tttttt"),      # player Onix -> elevated opponent Golbat; T2 + T4 Struggle
    ("stg107-ply-213-143", "player", 213, 143, "taunt", "tttttt"),  # player Shuckle -> big-picture opponent Snorlax
    ("stg107-ply-143-303", "player", 143, 303, "taunt", "tttt"),    # player Snorlax Struggle KOs opponent Shedinja 303 (1 HP)
    ("stg107-ply-303-42", "player", 303, 42, "taunt", "tttt"),      # player Shedinja faints from its own Struggle recoil
    ("stg107-opp-42-135", "opponent", 42, 135, "taunt", "tttttt"),  # elevated opponent Golbat struggles -> player Jolteon
    ("stg107-opp-143-95", "opponent", 143, 95, "taunt", "tttttt"),  # big-picture opponent Snorlax -> player Onix
    ("stg107-opp-143-42-sub", "opponent", 143, 42, "taunt", "ttsbtst"),  # T2 opponent Struggle hits the player's Substitute doll
    ("stg107-opp-303-42", "opponent", 303, 42, "taunt", "tttt"),    # opponent Shedinja faints from its own Struggle recoil
    ("stg107-opp-143-303", "opponent", 143, 303, "taunt", "tttt"),  # opponent Snorlax Struggle KOs player Shedinja
    ("stg107-ply-pp-95-362", "player", 95, 362, "pp", "tttttt"),   # PP route: player Onix Mean Look x3 vs Pressure, T4 + T5 Struggle
    ("stg107-opp-pp-95-362", "opponent", 95, 362, "pp", "tttttt"), # PP route: opponent Onix Mean Look x3 vs Pressure, T4 + T5 Struggle
]


def member(species: int, moves: list[int], speed: dict) -> dict:
    gender = S67.GENDER.get(species) or "male"
    return {"species": species, "level": 50, **json.loads(json.dumps(speed)), "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0,
            "abilitySlot": 0, "friendship": 70, "gender": gender, "shiny": False}


def scenario(job, profile: str) -> dict:
    ident, side, struggler, target, route, plan = job
    other = "opponent" if side == "player" else "player"
    data = json.loads(BASE.read_text())
    data["profile"] = profile
    data["seed"] = SEED
    if route == "taunt":
        s_moves = [HARDEN] * 4
        t_moves = [TAUNT, SUBSTITUTE, TAUNT, TAUNT] if other == "player" else [TAUNT] * 4
        s_speed, t_speed = SLOW, FAST
    else:  # pp: one 5-PP move vs Pressure; the Pressure target only uses Harden (its four slots constrain the AI)
        s_moves, t_moves = [MEAN_LOOK, 0, 0, 0], [HARDEN] * 4
        s_speed, t_speed = FAST, SLOW
    bench = [member(113, [TACKLE] * 4, SLOW), member(95, [TACKLE] * 4, SLOW)]
    data["overrides"] = {"parties": {side: [member(struggler, s_moves, s_speed)] + bench,
                                     other: [member(target, t_moves, t_speed)] + json.loads(json.dumps(bench))}}
    segs = []
    for c in plan:
        segs += TURN if c == "t" else SUB_TURN if c == "s" else BACK_TURN
    segs.append({"frames": 600, "buttons": []})
    data["trace"] = {"segments": json.loads(json.dumps(segs))}
    return data


if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
    off = "--off" in sys.argv
    for job in JOBS:
        name = job[0] + ("-off" if off else "")
        (out / f"{name}.json").write_text(json.dumps(scenario(job, "battle-scene-off" if off else "battle-scene-on"), indent=1, sort_keys=True) + "\n")
    print(len(JOBS), "scenarios")
