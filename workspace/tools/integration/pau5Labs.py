#!/usr/bin/env python3
"""pau5: generate the mid-battle switch-in labs (Intimidate / Trace send-in after a faint, voluntary switch, opponent replacement).

usage: pau5Labs.py <labdir> [<tracedir>]   writes pau5-<case>-<off|on>.json (mechanicLab, overrides.parties; the stock ROM runs the entry hooks)
and, with <tracedir>, the compare traces over the ROM frame window of each ability block (WINDOWS, from tools/integration/hpd2Probe.py rows).
Species ids are internal (Mightyena 287, Porygon 137). Every move slot is one move so the Factory AI has one legal choice.
"""
import json
import sys
from pathlib import Path

STATS = ("hp", "attack", "defense", "speed", "spAttack", "spDefense")
SEISMIC_TOSS, TACKLE = 69, 33
MIGHTYENA, PORYGON, RATTATA = 287, 137, 19


def mon(species, level=50, move=SEISMIC_TOSS):
    return {"species": species, "level": level, "nature": 0, "ivs": {k: 31 for k in STATS}, "evs": {k: 0 for k in STATS},
            "moves": [move] * 4, "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0}


SPLASH = 150
RECORDS = json.loads((Path(__file__).with_name("pau5Records.json")).read_text())
# exact personality per record: the nature index (+25 where the parity must give ability slot 0) so the app's rental record and the ROM mon are the same mon
PERSONALITY = {"39": 14, "307": 24, "273": 42, "432": 2}


def record(set_id, move=SPLASH):
    r = RECORDS[str(set_id)]
    return {"species": r["species"], "level": 50, "nature": r["nature"], "personality": PERSONALITY[str(set_id)], "ivs": r["ivs"], "evs": r["evs"],
            "moves": [move] * 4, "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0}


A = {"buttons": ["A"], "frames": 2}
IDLE = lambda n: {"buttons": [], "frames": n}
FIGHT = [A, IDLE(18), A]  # action menu A (Fight), move menu A (move 1)
DOWN = {"buttons": ["DOWN"], "frames": 2}
TURN1 = FIGHT + [IDLE("@TURN1@")]
FAINT_PICK = [IDLE("@WAIT@"), A, IDLE(200), DOWN, IDLE(20), A, IDLE(40), A, IDLE(700)]  # past the faint print, party menu: slot 1, SEND OUT
SWITCH_PICK = [DOWN, IDLE(38), A, IDLE(80), DOWN, IDLE(20), A, IDLE(30), A, IDLE(1100)]
OPP_FAINT = [IDLE("@WAIT@"), A, IDLE(1100)]
CASES = {
    # lead faints to the opponent's Seismic Toss; the forced party menu opens; slot 1 (benched, ability mon) is sent in
    # (Diglett lead, 85 HP: two Seismic Tosses; real Factory records so the app's forced party menu validates against its rental records)
    "faint-intimidate": ([record(39), record(307), record(432)], [mon(RATTATA)] * 3, TURN1 + FIGHT + FAINT_PICK),
    "faint-trace": ([record(39), record(273), record(432)], [mon(RATTATA)] * 3, TURN1 + FIGHT + FAINT_PICK),
    # voluntary switch: Pokemon (DOWN, A), party menu slot 1 (DOWN, A), SHIFT (A); the opponent's Seismic Toss then hits the send-in
    "switch-intimidate": ([mon(RATTATA), mon(MIGHTYENA), mon(RATTATA)], [mon(RATTATA)] * 3, SWITCH_PICK),
    "switch-trace": ([mon(RATTATA), mon(PORYGON), mon(RATTATA)], [mon(RATTATA)] * 3, SWITCH_PICK),
    # the opponent's lead faints to the player's Seismic Toss; the AI replacement is the ability mon (slot 1)
    "opp-intimidate": ([mon(RATTATA)] * 3, [mon(RATTATA, 5, TACKLE), mon(MIGHTYENA, 50, TACKLE), mon(RATTATA, 50, TACKLE)], FIGHT + OPP_FAINT),
    "opp-trace": ([mon(RATTATA)] * 3, [mon(RATTATA, 5, TACKLE), mon(PORYGON, 50, TACKLE), mon(RATTATA, 50, TACKLE)], FIGHT + OPP_FAINT),
}


def build(name, mode, base):
    player, opponent, segments = CASES[name]
    request = dict(base)
    request["profile"] = "battle-scene-" + mode
    request["overrides"] = {"parties": {"player": player, "opponent": opponent}}
    wait = {"off": 430, "on": 700}[mode]  # the faint print waits for a press; the ON scene prints it later
    turn1 = {"off": 380, "on": 640}[mode]  # the first (Splash / Seismic Toss) turn, up to the next action menu
    segments = [{**seg, "frames": {"@WAIT@": wait, "@TURN1@": turn1}[seg["frames"]]} if isinstance(seg["frames"], str) else seg for seg in segments]
    request["trace"] = {"segments": segments, "captureFrames": [0]}
    return request


# ROM frame (after prepare) of the ability script's first row; the compare window is [start - 160, start + 410]
BLOCK_START = {
    ("faint", "off"): 1347, ("faint", "on"): 1877, ("switch", "off"): 483, ("switch", "on"): 483, ("opp", "off"): 717, ("opp", "on"): 1008,
}
BLOCK_START_TRACE = {("opp", "on"): 995}


def trace(name, mode, request):
    kind, ability = name.split("-")
    start = (BLOCK_START_TRACE if ability == "trace" else {}).get((kind, mode), BLOCK_START[(kind, mode)])
    return {
        "appRoute": "generated-orchestrator",
        "oracleProfile": "battle-scene-" + mode,
        "appStage": {"id": f"pau5-{name}-{mode}", "frame": 0, "opponentTrainerId": 110},
        "oracleBattleLab": {"scenario": f"../../battle-lab/pau5-{name}-{mode}.json"},
        "segments": request["trace"]["segments"],
        "captureWindow": {"start": start - 160, "end": start + 410},
    }


if __name__ == "__main__":
    out = Path(sys.argv[1])
    root = Path(__file__).resolve().parents[2]
    base = json.loads((root / "tools/battle-lab/aud241b-player-faint-off.json").read_text())
    base.pop("overrides"), base.pop("trace")
    for name in CASES:
        for mode in ("off", "on"):
            request = build(name, mode, base)
            (out / f"pau5-{name}-{mode}.json").write_text(json.dumps(request, indent=1))
            if len(sys.argv) > 2:
                (Path(sys.argv[2]) / f"pau5-{name}-{mode}.json").write_text(json.dumps(trace(name, mode, request), indent=1))
