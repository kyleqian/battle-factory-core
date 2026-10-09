#!/usr/bin/env python3
"""Live audit 15: liveAdapterFramebuffer.ts fixtures for every CONSUMER body of the audit-15 chain / control scenarios (prep48Probe.py output).

usage: audit15Fixtures.py <probe-dir> <fixture-dir>
Each consumer body (the consumer lead's move; Flamethrower / Light Screen / Reflect / Thunderbolt) becomes one fixture whose `precedingTurns`
is the battle's semantic event history up to and including that body, one turn per action prompt (prompt cycle t = probe frames
[1334 t, 1334 (t+1)), the scenario trace's turn length), in the kernel payload forms the orchestrator feeds the PRODUCTION hosts
(postkoHostReplay.ts: liveSpriteOrderHost + the allocator seam; liveBattlerX2EventsOf for the x2 history):
  Move_X               -> animation MOVE_ANIMATION battler / target [moveId, gAnimMoveTurn, power, dmg>0, 70, 0], then HIT_ANIMATION on the
                          target when the target's HP drops by the next recorded activation (the visible damage blink);
  Status_Burn / _Paralysis -> status-animation (status1 0x10 / 0x40); Status_Confusion -> status-animation isStatus2 (1);
  Status_FireSpin      -> animation TURN_TRAP [83] on the trapped battler (General_TurnTrap's Fire Spin branch);
  General_StatsChange  -> animation STATS_CHANGE on the changed battler: Double Team [21] (STAT_ANIM_PLUS1 14 + STAT_EVASION 7), Icy Wind [24]
                          (STAT_ANIM_MINUS1 21 + STAT_SPEED 3), keyed by the latest move body.
Any other label is UNMODELLED: no fixture is written after it (reported on stdout). Window = [activation, first inactive frame]; HP / status /
personality from the ROM's gBattleMons at activation; genders from the scenario. Flamethrower rows carry ageOffset -15 (row 0 = the ROM
activation = production age -15, the accepted order-consumer fixtures' framing).
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
SCEN = Path("tools/integration/fixtures/audit-15/scenarios")
TURN = 1334
SPECIES = {113: "CHANSEY", 143: "SNORLAX", 102: "EXEGGCUTE", 95: "ONIX"}
MOVES = {"Move_WILL_O_WISP": 261, "Move_FLAMETHROWER": 53, "Move_HYDRO_PUMP": 56, "Move_FIRE_SPIN": 83, "Move_PETAL_DANCE": 80, "Move_DIG": 91,
         "Move_DOUBLE_TEAM": 104, "Move_LIGHT_SCREEN": 113, "Move_ICE_BEAM": 58, "Move_REFLECT": 115, "Move_FAINT_ATTACK": 185,
         "Move_SWIFT": 129, "Move_THUNDERBOLT": 85, "Move_ICY_WIND": 196, "Move_TACKLE": 33}
POWER = {261: 0, 53: 95, 56: 120, 83: 15, 80: 70, 91: 60, 104: 0, 113: 0, 58: 95, 115: 0, 185: 60, 129: 60, 85: 95, 196: 55, 33: 35}
CONSUMERS = {53: "FLAMETHROWER", 113: "LIGHT_SCREEN", 115: "REFLECT", 85: "THUNDERBOLT"}
STATUS1 = {"Status_Burn": 0x10, "Status_Paralysis": 0x40}
# production age 0 relative to the ROM activation row (the accepted fixtures' framing: Flamethrower denseWindow activation+4 / ageOffset -11)
AGE_OFFSET = {53: -15}


def shown(status1: int) -> str:
    return ("sleep" if status1 & 7 else "poison" if status1 & 0x88 else "burn" if status1 & 0x10 else "freeze" if status1 & 0x20
            else "paralysis" if status1 & 0x40 else "none")


for probe in sorted(probe_dir.glob("*.json")):
    d = json.loads(probe.read_text())
    name = probe.stem
    scen = json.loads((SCEN / d["scenario"]).read_text())
    parties = scen["overrides"]["parties"]
    consumer_side = "player" if parties["player"][0]["moves"][0] in CONSUMERS else "opponent"
    consumer_battler = 0 if consumer_side == "player" else 1
    genders = {side: parties[side][0]["gender"] for side in ("player", "opponent")}
    bodies = d["bodies"]
    turns: list[list[dict]] = []
    hidden_unmodelled = None
    k = 0
    last_move = None
    for i, b in enumerate(bodies):
        t = b["startFrame"] // TURN
        while len(turns) <= t:
            turns.append([])
        label, atk = b["label"], b["attacker"]
        nxt = bodies[i + 1]["at"]["battlers"] if i + 1 < len(bodies) else None
        if label in MOVES:
            move = MOVES[label]
            last_move = move
            tgt = b["target"]
            hit = POWER[move] > 0 and nxt is not None and nxt[tgt]["hp"] < b["at"]["battlers"][tgt]["hp"]
            body = {"kind": "animation", "animationId": "MOVE_ANIMATION", "battler": atk, "target": tgt,
                    "arguments": [str(move), str(b["moveTurn"]), str(POWER[move]), "1" if hit else "0", "70", "0"]}
            if move in CONSUMERS and atk == consumer_battler and hidden_unmodelled is None:
                at = b["at"]["battlers"]
                fx = {
                    "schema": "audit15-chain-fixture/v1", "move": CONSUMERS[move], "bodyIndex": k,
                    "probe": "tools/integration/prep48Probe.py", "scenario": str(SCEN / d["scenario"]),
                    "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"], **({"ageOffset": AGE_OFFSET[move]} if move in AGE_OFFSET else {})},
                    "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": consumer_side}},
                    "target": {"species": SPECIES[at[1 - atk]["species"]], "geometry": {"side": "opponent" if consumer_side == "player" else "player"}},
                    "attackerPersonality": at[atk]["personality"],
                    "displayedStatus": {"player": shown(at[0]["status1"]), "opponent": shown(at[1]["status1"])},
                    "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                     "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                    "requestFields": {"turn": 0},
                    "precedingTurns": [{"events": list(ev)} for ev in turns[:-1]] + [{"events": turns[-1] + [body]}],
                }
                # empty prompt cycles (a turn with no recorded event) stay in the history: the prompt cycle still ran
                out = f"{name}-c{k}.json"
                (out_dir / out).write_text(json.dumps(fx, indent=1) + "\n")
                print(out, "units", sum(len(x["events"]) for x in fx["precedingTurns"]) - 1)
                k += 1
            turns[t].append(body)
            if hit:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": tgt, "target": tgt, "arguments": []})
        elif label in STATUS1:
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 0, "status": STATUS1[label]})
        elif label == "Status_Confusion":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 1})
        elif label == "Status_FireSpin":
            turns[t].append({"kind": "animation", "animationId": "TURN_TRAP", "battler": atk, "target": atk, "arguments": ["83"]})
        elif label == "General_StatsChange":
            turns[t].append({"kind": "animation", "animationId": "STATS_CHANGE", "battler": atk, "target": atk,
                             "arguments": [{104: "21", 196: "24"}[last_move]]})
        else:
            hidden_unmodelled = label
            print(name, "UNMODELLED", label, "at", b["startFrame"])
