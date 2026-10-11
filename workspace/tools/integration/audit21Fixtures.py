#!/usr/bin/env python3
"""Live audit 21: cast83Fixtures.py (below, unchanged) for the audit-21 scenarios (tools/integration/fixtures/audit-21/scenarios/).
Added: QUICK_ATTACK 98 (power 40).
usage: audit21Fixtures.py <probe-dir> <fixture-dir>
"""
"""cast83 (ISSUES #143, docs/cast83-castform-forms.md): audit19Fixtures.py for the cast83 scenarios (tools/integration/fixtures/cast83/
scenarios/), extended by: ICY_WIND 196 (55) / ICE_BEAM 58 (95) / EMBER 52 (40) / FLAMETHROWER 53 (95) / BUBBLEBEAM 61 (65) / AERIAL_ACE 332 (60)
/ SURF 57 (95) / SUPER_FANG 162 (1) / DOUBLE_EDGE 38 (120) / HAIL 258, PROTECT 182, SCARY_FACE 184, THUNDER_WAVE 86 (no hit); Move_HAIL at a non-zero label offset
(General_Hail: goto Move_HAIL) -> animation HAIL_CONTINUES, after which the history is UNMODELLED (the hail damage), so no fixture
follows it; General_CastformChange's form = the latest weather move's (SUNNY_DAY 1 / RAIN_DANCE 2 / HAIL 3). Everything else is
audit19Fixtures.py unchanged (below).
usage: cast83Fixtures.py <probe-dir> <fixture-dir>
"""
"""(audit19Fixtures.py) Live audit 19: chain fixtures for the audit-19 scenarios (audit19Probe.py output). audit18Fixtures.py's derivation (turns from the ROM's
gBattleResults.battleTurnCounter; the kernel payload forms the orchestrator feeds the production hosts), extended to this audit's units:
  Move_X                -> MOVE_ANIMATION [moveId, gAnimMoveTurn, power, dmg>0, 70, 0] (+ [rollout] for Ice Ball 301); power = the RAM
                           gAnimMovePower for Magnitude 222 (the > 99 key) and Ice Ball 301, else the move's base power (audit 18);
                           + HIT_ANIMATION on the target when its HP drops before the next body;
  Move_SUNNY_DAY at a non-zero label offset (the continues script, B_ANIM_SUN_CONTINUES) -> animation SUN_CONTINUES;
  General_Rain          -> animation RAIN_CONTINUES (words: recorded at the pinned gRng2Value of its activation, `pinnedGeneral`);
  General_CastformChange-> animation CASTFORM_CHANGE [form] (1 sun / 2 rain: the plan is "" for every form);
  General_StatsChange   -> STATS_CHANGE [the ROM's gBattleScripting.animArg1 at activation] (Speed Boost 17, Mud-Slap's -1 accuracy 27);
  General_TurnTrap / Status_Whirlpool (its Whirlpool branch) -> TURN_TRAP [wrapped move 250] on the trapped battler;
  Status_*              -> status-animation (audit 17 / 18).
The Dive setup window's text box is empty (BattleScriptFirstChargingTurn's STRINGID_EMPTYSTRING3: messageLines ["", ""]).
Anything else (Special_* switch-ins after a KO, ...) is UNMODELLED: no fixture after it.
promptShown[t] = NOT (the player's status2 at the ROM's turn-counter change to t has STATUS2_MULTIPLETURNS | STATUS2_RECHARGE): the
orchestrator's beginOrderTurn(!playerLocked) input (Ice Ball / Dive / Petal Dance locks).
Windows: every MOVE body of the slow lead (consumer side); every MOVE body of either battler in ice-*, dive-*, wp160-*.
Every MOVE body of the history carries its activation gRng2Value (`pinnedRng2`, flat event index): the check records the words of any
body with a production Random2 plan (Ice Ball, Mud-Slap, Rain Dance, Dive, Water Pulse, ...), prep65's method.
usage: audit19Fixtures.py <probe-dir> <fixture-dir>
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
SCEN = Path("tools/integration/fixtures/audit-21/scenarios")
SPECIES = {s["id"]: s["name"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
POWER = {98: 40, 38: 120, 196: 55, 58: 95, 52: 40, 258: 0, 53: 95, 61: 65, 332: 60, 182: 0, 57: 95, 184: 0, 86: 0, 162: 1, 222: 0, 241: 0, 240: 0, 176: 0, 302: 60, 173: 40, 301: 30, 291: 60, 351: 60, 352: 60, 129: 60, 85: 95, 189: 20, 250: 15}
NAMES = {98: "QUICK_ATTACK", 38: "DOUBLE_EDGE", 196: "ICY_WIND", 58: "ICE_BEAM", 52: "EMBER", 258: "HAIL", 53: "FLAMETHROWER", 61: "BUBBLE_BEAM", 332: "AERIAL_ACE", 182: "PROTECT", 57: "SURF", 184: "SCARY_FACE", 86: "THUNDER_WAVE", 162: "SUPER_FANG", 222: "MAGNITUDE", 241: "SUNNY_DAY", 240: "RAIN_DANCE", 176: "CONVERSION_2", 302: "NEEDLE_ARM", 173: "SNORE", 301: "ICE_BALL",
         291: "DIVE", 351: "SHOCK_WAVE", 352: "WATER_PULSE", 129: "SWIFT", 85: "THUNDERBOLT", 189: "MUD_SLAP", 250: "WHIRLPOOL"}
MOVES = {f"Move_{v}": k for k, v in NAMES.items()}
RAM_POWER = {222, 301}
STATUS1 = {"Status_Sleep": (0x1, "SLP"), "Status_Poison": (0x8, "PSN"), "Status_Burn": (0x10, "BRN"), "Status_Freeze": (0x20, "FRZ"),
           "Status_Paralysis": (0x40, "PRZ")}
LOCK = 0x1000 | 0x400000  # STATUS2_MULTIPLETURNS | STATUS2_RECHARGE


def anim_name(status: int) -> str | None:
    return ("FRZ" if status == 0x20 else "PSN" if status == 0x8 or status & 0x80 else "BRN" if status == 0x10 else "SLP" if status & 7
            else "PRZ" if status == 0x40 else None)


def shown(status1: int) -> str:
    return ("sleep" if status1 & 7 else "poison" if status1 & 0x88 else "burn" if status1 & 0x10 else "freeze" if status1 & 0x20
            else "paralysis" if status1 & 0x40 else "none")


for probe in sorted(probe_dir.glob("*.json")):
    d = json.loads(probe.read_text())
    name = probe.stem
    scen = json.loads((SCEN / d["scenario"]).read_text())
    parties = scen["overrides"]["parties"]
    consumer_side = "player" if parties["player"][0]["ivs"]["speed"] < parties["opponent"][0]["ivs"]["speed"] else "opponent"
    consumer_battler = 0 if consumer_side == "player" else 1
    every_body = name.startswith(("ice-", "dive-", "wp160-"))
    genders = {side: parties[side][0].get("gender", "genderless") for side in ("player", "opponent")}
    locked_at = {t["turnCounter"]: bool(t["playerStatus2"] & LOCK) for t in d["turns"]}
    bodies = d["bodies"]
    turns: list[list[dict]] = []
    pinned: list[list[int]] = []  # [flat event index, gRng2Value at the body's activation]
    pinned_general: list[list[int]] = []  # RAIN_CONTINUES: [flat event index, gRng2Value]
    stopped = None
    k = 0
    for i, b in enumerate(bodies):
        t = b["at"]["turnCounter"]
        while len(turns) <= t:
            turns.append([])
        label, atk = b["label"], b["attacker"]
        at = b["at"]["battlers"]
        nxt = bodies[i + 1]["at"]["battlers"] if i + 1 < len(bodies) else None
        flat = sum(len(x) for x in turns)
        if stopped is not None:
            continue
        if label == "Move_HAIL" and b["labelOffset"] != 0:
            turns[t].append({"kind": "animation", "animationId": "HAIL_CONTINUES", "battler": atk, "target": atk, "arguments": []})
            stopped = f"HAIL_CONTINUES (hail damage unmodelled) at body {i}"
        elif label == "Move_SUNNY_DAY" and b["labelOffset"] != 0:
            turns[t].append({"kind": "animation", "animationId": "SUN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_Rain":
            pinned_general.append([flat, b["at"]["rng2"]])
            turns[t].append({"kind": "animation", "animationId": "RAIN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label in MOVES and b["labelOffset"] == 0:
            move = MOVES[label]
            tgt = b["target"]
            power = b["power"] if move in RAM_POWER else POWER[move]
            hit = move not in (222, 241, 240, 176, 173, 258, 182, 184, 86) or move == 222
            hit = hit and tgt != atk and nxt is not None and nxt[tgt]["hp"] < at[tgt]["hp"]
            args = [str(move), str(b["moveTurn"]), str(power), "1" if hit else "0", "70", "0"] + ([str(b["rollout"])] if move == 301 else [])
            body = {"kind": "animation", "animationId": "MOVE_ANIMATION", "battler": atk, "target": tgt, "arguments": args}
            consumer = every_body or atk == consumer_battler
            if consumer and "endFrame" in b:
                side = "player" if atk == 0 else "opponent"
                other = 1 - atk
                fx = {
                    "schema": "audit19-chain-fixture/v1", "move": NAMES[move], "bodyIndex": k,
                    "probe": "tools/integration/audit19Probe.py", "scenario": str(SCEN / d["scenario"]),
                    "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"]},
                    "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": side}},
                    "target": {"species": SPECIES[at[other]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                    "attackerPersonality": at[atk]["personality"],
                    "displayedStatus": {"player": shown(at[0]["status1"]), "opponent": shown(at[1]["status1"])},
                    "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                     "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                    # BattleScriptFirstChargingTurn prints STRINGID_EMPTYSTRING3 before the Dive setup's attackanimation (flybounce-live /
                    # a13fix charge fixtures: an empty box)
                    **({"messageLines": ["", ""]} if move == 291 and b["moveTurn"] == 0 else {}),
                    "requestFields": {"turn": b["moveTurn"], "target": tgt, "power": power, **({"rolloutCounter": b["rollout"]} if move == 301 else {})},
                    "rom": {"invisible": [s["invisible"] for s in b["at"]["battlerSprites"]], "turn": t, "spriteOrder": b["at"]["spriteOrder"],
                            "power": b["power"]},
                    "presentationRngActivation": {"value": b["at"]["rng2"], "source": f"audit19Probe.py at.rng2 (RAM gRng2Value, activation frame {b['startFrame']})"},
                    "pinnedRng2": [list(x) for x in pinned if x[0] < flat],
                    "pinnedGeneral": [list(x) for x in pinned_general if x[0] < flat],
                    "promptShown": [not locked_at.get(u, False) if u > 0 else True for u in range(t + 1)],
                    "precedingTurns": [{"events": list(ev)} for ev in turns[:-1]] + [{"events": turns[-1] + [body]}],
                }
                (out_dir / f"{name}-c{k}.json").write_text(json.dumps(fx, indent=1) + "\n")
                print(f"{name}-c{k}.json", NAMES[move], "units", sum(len(x["events"]) for x in fx["precedingTurns"]) - 1,
                      "power", b["power"], "otherInvisible", int(fx["rom"]["invisible"][other]))
                k += 1
            pinned.append([flat, b["at"]["rng2"]])
            turns[t].append(body)
            if hit:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": tgt, "target": tgt, "arguments": []})
        elif label == "General_CastformChange":
            weather = [x["label"] for x in bodies[:i] if x["label"] in ("Move_SUNNY_DAY", "Move_RAIN_DANCE", "Move_HAIL")]
            form = {"Move_SUNNY_DAY": "1", "Move_RAIN_DANCE": "2", "Move_HAIL": "3"}[weather[-1]]
            turns[t].append({"kind": "animation", "animationId": "CASTFORM_CHANGE", "battler": atk, "target": atk, "arguments": [form]})
        elif label == "General_StatsChange":
            turns[t].append({"kind": "animation", "animationId": "STATS_CHANGE", "battler": atk, "target": atk, "arguments": [str(b["animArg1"])]})
        elif label in ("General_TurnTrap", "Status_Whirlpool"):  # General_TurnTrap jumps to Status_Whirlpool before the activation frame
            turns[t].append({"kind": "animation", "animationId": "TURN_TRAP", "battler": atk, "target": atk, "arguments": ["250"]})
            if nxt is not None and nxt[atk]["hp"] < at[atk]["hp"]:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": atk, "target": atk, "arguments": []})
        elif label in STATUS1:
            fixed, want = STATUS1[label]
            rom = at[atk]["status1"]
            status = rom if rom and anim_name(rom) == want else fixed
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 0, "status": status})
        elif label == "Status_Confusion":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 1})
            if nxt is not None and nxt[atk]["hp"] < at[atk]["hp"]:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": atk, "target": atk, "arguments": []})
        else:
            print(name, "UNMODELLED", label, "at", b["startFrame"])
            stopped = label
