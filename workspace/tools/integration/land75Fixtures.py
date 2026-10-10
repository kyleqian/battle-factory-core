#!/usr/bin/env python3
"""land75: chain fixtures for every wall body (Barrier 112 / Magic Coat 277 / Light Screen 113) of the land75 wall-route scenarios (land75Stage.py, probed
by audit18Probe.py). audit18Fixtures.py's derivation verbatim (one turn per ROM battleTurnCounter, the kernel payload forms the
orchestrator feeds the production hosts, promptShown false on a PLAYER-locked Dive strike turn, Dive words pinned at the RAM gRng2Value),
with this step's moves added (Signal Beam 324, Psywave 149, Barrier 112 + its STATS_CHANGE 40, Magic Coat 277, Silver Wind 318
+ its all-stats STATS_CHANGE 55, Light Screen 113) and the consumers = every
wall body of either side. The fixtures are read by audit18Check.ts (two fresh direct-mGBA probe processes, CHAIN + ENTRY lends).
usage: land75Fixtures.py <probe-dir> <fixture-dir> <scenario-dir>
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
SCEN = Path(sys.argv[3])
SPECIES = {s["id"]: s["name"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
POWER = {19: 70, 340: 85, 91: 60, 291: 60, 68: 1, 33: 35, 219: 0, 273: 0, 339: 0, 156: 0, 334: 0, 201: 0, 89: 100, 113: 0, 58: 95, 104: 0,
         351: 60, 352: 60, 85: 95, 164: 0, 324: 75, 112: 0, 149: 1, 277: 0, 318: 60, 113: 0}
NAMES = {19: "FLY", 340: "BOUNCE", 91: "DIG", 291: "DIVE", 68: "COUNTER", 33: "TACKLE", 219: "SAFEGUARD", 273: "WISH", 339: "BULK_UP",
         156: "REST", 334: "IRON_DEFENSE", 201: "SANDSTORM", 89: "EARTHQUAKE", 113: "LIGHT_SCREEN", 58: "ICE_BEAM", 104: "DOUBLE_TEAM",
         351: "SHOCK_WAVE", 352: "WATER_PULSE", 85: "THUNDERBOLT", 164: "SUBSTITUTE", 324: "SIGNAL_BEAM", 112: "BARRIER", 149: "PSYWAVE",
         277: "MAGIC_COAT", 318: "SILVER_WIND", 113: "LIGHT_SCREEN"}
MOVES = {f"Move_{v}": k for k, v in NAMES.items()}
UNITS = {19, 340, 91, 291, 351, 68, 33}  # the fast lead's moves (Dig / Shock Wave are also consumers when the slow lead uses them)
RANDOM2 = {273, 352}
STAT_ARG = {104: "21", 334: "40", 339: "55", 112: "40", 318: "55"}  # Barrier: STAT_ANIM_PLUS2 38 + DEF 2; Silver Wind: MULTIPLE_PLUS1
STATUS1 = {"Status_Sleep": (0x1, "SLP"), "Status_Poison": (0x8, "PSN"), "Status_Burn": (0x10, "BRN"), "Status_Freeze": (0x20, "FRZ"),
           "Status_Paralysis": (0x40, "PRZ")}
# production age 0 = ROM activation + 1: Double Team (audit 17 / prep7 framing); Iron Defense (the accepted 101-frame window
# tools/compare/fixtures/iron-defense-*.json; audit 18's ablation: the no-unit controls 31,990 / 33,022 px at offset 0 -> 0 px at -1)
AGE_OFFSET: dict[int, int] = {104: -1, 334: -1}


def anim_name(status: int) -> str | None:
    return ("FRZ" if status == 0x20 else "PSN" if status == 0x8 or status & 0x80 else "BRN" if status == 0x10 else "SLP" if status & 7
            else "PRZ" if status == 0x40 else None)


def shown(status1: int) -> str:
    return ("sleep" if status1 & 7 else "poison" if status1 & 0x88 else "burn" if status1 & 0x10 else "freeze" if status1 & 0x20
            else "paralysis" if status1 & 0x40 else "none")


def message(move: int, b: dict, side: str, mon: dict) -> list[str] | None:
    """The text box during the body when it is not the move-used banner (battle_message.c): Rest's trysetrest string (printed before
    attackanimation: "slept and became healthy" when it cured another status, else "went to sleep"), Dig's charge string."""
    who = ("Foe " if side == "opponent" else "") + SPECIES[mon["species"]]
    if move == 156:
        return [f"{who} slept and", "became healthy!"] if b.get("restCured") else [f"{who} went", "to sleep!"]
    if move == 91 and b["moveTurn"] == 0:
        return [f"{who} dug a hole!", ""]
    return None


def locked(bodies: list[dict], t: int) -> bool:
    """The player is locked in turn t (no action prompt): its two-turn setup body played in turn t - 1."""
    return any(b["at"]["turnCounter"] == t - 1 and b["attacker"] == 0 and b["label"] in ("Move_FLY", "Move_BOUNCE", "Move_DIG", "Move_DIVE")
               and b["moveTurn"] == 0 for b in bodies)


for probe in sorted(probe_dir.glob("*.json")):
    d = json.loads(probe.read_text())
    name = probe.stem
    scen = json.loads((SCEN / d["scenario"]).read_text())
    parties = scen["overrides"]["parties"]
    # the slow lead (speed IV 0) is the consumer side
    consumer_side = "player" if parties["player"][0]["ivs"]["speed"] == 0 else "opponent"
    consumer_battler = 0 if consumer_side == "player" else 1
    every_body = name.startswith("sub-")
    genders = {side: parties[side][0].get("gender", "genderless") for side in ("player", "opponent")}
    bodies = d["bodies"]
    turns: list[list[dict]] = []
    pinned: list[list[int]] = []  # [flat event index, gRng2Value at the Dive body's activation]
    stopped = None
    k = 0
    sandstorm_left = 0
    last_move = None
    for i, b in enumerate(bodies):
        if b["label"] == "Move_REST":
            prev = next((x for x in reversed(bodies[:i])), None)
            b["restCured"] = bool(prev is not None and prev["at"]["battlers"][b["attacker"]]["status1"] & ~7)
        t = b["at"]["turnCounter"]
        while len(turns) <= t:
            turns.append([])
        label, atk = b["label"], b["attacker"]
        at = b["at"]["battlers"]
        nxt = bodies[i + 1]["at"]["battlers"] if i + 1 < len(bodies) else None
        flat = sum(len(x) for x in turns)
        if label == "Move_SANDSTORM" and sandstorm_left > 0:
            sandstorm_left -= 1
            turns[t].append({"kind": "animation", "animationId": "WEATHER_VAR", "battler": atk, "target": atk, "arguments": ["12"]})
            for v in (0, 1):
                if nxt is not None and nxt[v]["hp"] < at[v]["hp"]:
                    turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": v, "target": v, "arguments": []})
        elif label in MOVES:
            move = MOVES[label]
            last_move = move
            if move == 201:
                sandstorm_left = 4
            tgt = b["target"]
            hit = POWER[move] > 0 and tgt != atk and nxt is not None and nxt[tgt]["hp"] < at[tgt]["hp"]
            body = {"kind": "animation", "animationId": "MOVE_ANIMATION", "battler": atk, "target": tgt,
                    "arguments": [str(move), str(b["moveTurn"]), str(POWER[move]), "1" if hit else "0", "70", "0"]}
            if move == 291:
                pinned.append([flat, b["at"]["rng2"]])
            consumer = move in (112, 277, 113)  # land75: every wall body (Barrier / Magic Coat / Light Screen)
            if consumer and stopped is None and "endFrame" in b:
                side = "player" if atk == 0 else "opponent"
                other = 1 - atk
                fx = {
                    "schema": "land75-wall-route-fixture/v1", "move": NAMES[move], "bodyIndex": k,
                    "probe": "tools/integration/audit18Probe.py", "scenario": str(SCEN / d["scenario"]),
                    "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"], **({"ageOffset": AGE_OFFSET[move]} if move in AGE_OFFSET else {})},
                    "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": side}},
                    "target": {"species": SPECIES[at[other]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                    "attackerPersonality": at[atk]["personality"],
                    "displayedStatus": {"player": shown(at[0]["status1"]), "opponent": shown(at[1]["status1"])},
                    "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                     "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                    "requestFields": {"turn": b["moveTurn"], "target": tgt},
                    **({"messageLines": message(move, b, side, at[atk])} if message(move, b, side, at[atk]) else {}),
                    "rom": {"invisible": [s["invisible"] for s in b["at"]["battlerSprites"]], "turn": t, "spriteOrder": b["at"]["spriteOrder"]},
                    **({"presentationRngActivation": {"value": b["at"]["rng2"], "source": f"audit18Probe.py at.rng2 (RAM gRng2Value, activation frame {b['startFrame']})"}}
                       if move in RANDOM2 else {}),
                    "pinnedRng2": [list(x) for x in pinned if x[0] < flat],
                    "promptShown": [not locked(bodies, u) for u in range(t + 1)],
                    "precedingTurns": [{"events": list(ev)} for ev in turns[:-1]] + [{"events": turns[-1] + [body]}],
                }
                (out_dir / f"{name}-c{k}.json").write_text(json.dumps(fx, indent=1) + "\n")
                print(f"{name}-c{k}.json", "units", sum(len(x["events"]) for x in fx["precedingTurns"]) - 1,
                      "otherInvisible", int(fx["rom"]["invisible"][other]))
                k += 1
            turns[t].append(body)
            if hit:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": tgt, "target": tgt, "arguments": []})
        elif label in STATUS1:
            fixed, want = STATUS1[label]
            rom = at[atk]["status1"]
            status = rom if rom and anim_name(rom) == want else fixed
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 0, "status": status})
        elif label == "Status_Confusion":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 1})
            if nxt is not None and nxt[atk]["hp"] < at[atk]["hp"]:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_StatsChange" and at[atk]["species"] == 193:
            # YANMA's Speed Boost end-of-turn tick: STAT_ANIM_PLUS1 14 + STAT_SPEED 3 (battle_util.c ABILITY_SPEED_BOOST; fold71)
            turns[t].append({"kind": "animation", "animationId": "STATS_CHANGE", "battler": atk, "target": atk, "arguments": ["17"]})
        elif label == "General_StatsChange" and last_move in STAT_ARG:
            turns[t].append({"kind": "animation", "animationId": "STATS_CHANGE", "battler": atk, "target": atk, "arguments": [STAT_ARG[last_move]]})
        elif label == "General_WishHeal":
            turns[t].append({"kind": "animation", "animationId": "WISH_HEAL", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_SubstituteFade":
            turns[t].append({"kind": "animation", "animationId": "SUBSTITUTE_FADE", "battler": atk, "target": atk, "arguments": []})
        else:
            if stopped is None:
                print(name, "UNMODELLED", label, "at", b["startFrame"])
            stopped = label
