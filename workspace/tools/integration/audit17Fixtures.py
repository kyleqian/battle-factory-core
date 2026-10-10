#!/usr/bin/env python3
"""Live audit 17 (audit16Fixtures.py extended to Fly 19 / Bounce 340 / Sky Uppercut 327 and any species): chain fixtures for every CONSUMER body of the audit-17 scenarios (prep48Probe.py output). Same derivation as
audit15Fixtures.py (one turn per action prompt: prompt cycle t = probe frames [1334 t, 1334 (t+1)); the kernel payload forms the orchestrator
feeds the production hosts), extended to today's units:
  Move_X               -> MOVE_ANIMATION [moveId, gAnimMoveTurn, power, dmg>0, 70, 0] (+ HIT_ANIMATION on the target when its HP drops);
  Status_Sleep / _Poison / _Burn / _Freeze / _Paralysis -> status-animation (status1 = the afflicted battler's ROM status1 at activation
                          when it names the same animation, else 0x1 / 0x8 / 0x10 / 0x20 / 0x40);
  Status_Infatuation   -> status-animation isStatus2 (STATUS2_INFATUATION bit 0x00010000);
  Status_Confusion     -> status-animation isStatus2 (1); + HIT_ANIMATION on the afflicted battler when its HP drops before the next body
                          (the confusion self-hit's hitanimation BS_ATTACKER; no animation script, so the probe records no body);
  General_FocusBand    -> animation FOCUS_BAND on the holder; General_HeldItemEffect -> HELD_ITEM_EFFECT (a berry curing the status);
  General_FutureSightHit -> animation FUTURE_SIGHT_HIT (battler = the probe's attacker, target = its target);
  General_StatsChange  -> STATS_CHANGE: Double Team [21] (STAT_ANIM_PLUS1 14 + STAT_EVASION 7);
  Move_SUNNY_DAY after the scenario's first Sunny Day -> animation SUN_CONTINUES (General_SunlightContinues shares the script).
LATER moves (Outrage, Signal Beam, Bonemerang) are also written as consumers at every body, whichever battler: <name>-cu<k>.
Any other label (Special_SwitchOutOpponentMon, Move_RETURN after a switch, ...) is UNMODELLED: no fixture after it. Window = [activation,
first inactive frame], ageOffset per move as the accepted fixtures frame it; HP / status / personality from gBattleMons at activation.
usage: audit17Fixtures.py <probe-dir> <fixture-dir>
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
SCEN = Path("tools/integration/fixtures/audit-17/scenarios")
TURN = 1334
SPECIES = {s["id"]: s["name"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
MOVES = {"Move_CONFUSE_RAY": 109, "Move_SPORE": 147, "Move_THUNDER_WAVE": 86, "Move_SLUDGE_BOMB": 188, "Move_WILL_O_WISP": 261,
         "Move_SEISMIC_TOSS": 69, "Move_ICE_BALL": 301, "Move_FUTURE_SIGHT": 248, "Move_PURSUIT": 228, "Move_PERISH_SONG": 195,
         "Move_OUTRAGE": 200, "Move_LIGHT_SCREEN": 113, "Move_REFLECT": 115, "Move_PROTECT": 182, "Move_THUNDERBOLT": 85,
         "Move_ICE_BEAM": 58, "Move_DOUBLE_TEAM": 104, "Move_SWIFT": 129, "Move_TACKLE": 33, "Move_BLIZZARD": 59, "Move_SIGNAL_BEAM": 324,
         "Move_BONEMERANG": 155, "Move_SUNNY_DAY": 241, "Move_BLAZE_KICK": 299, "Move_HEAL_BELL": 215, "Move_ATTRACT": 213,
         "Move_FLY": 19, "Move_BOUNCE": 340, "Move_SKY_UPPERCUT": 327}
POWER = {109: 0, 147: 0, 86: 0, 188: 90, 261: 0, 69: 1, 301: 30, 248: 80, 228: 40, 195: 0, 200: 90, 113: 0, 115: 0, 182: 0, 85: 95,
         58: 95, 104: 0, 129: 60, 33: 35, 59: 120, 324: 75, 155: 50, 241: 0, 299: 85, 215: 0, 213: 0, 19: 70, 340: 85, 327: 85}
CONSUMERS = {113: "LIGHT_SCREEN", 115: "REFLECT", 182: "PROTECT", 85: "THUNDERBOLT", 58: "ICE_BEAM", 104: "DOUBLE_TEAM", 129: "SWIFT", 59: "BLIZZARD", 299: "BLAZE_KICK", 215: "HEAL_BELL", 327: "SKY_UPPERCUT"}
STATUS1 = {"Status_Sleep": (0x1, "SLP"), "Status_Poison": (0x8, "PSN"), "Status_Burn": (0x10, "BRN"), "Status_Freeze": (0x20, "FRZ"),
           "Status_Paralysis": (0x40, "PRZ")}
# later58 moves rendered at their own (first and LATER) bodies, whichever battler uses them: fixtures <name>-cu<k>, request turn = gAnimMoveTurn
LATER = {200: "OUTRAGE", 324: "SIGNAL_BEAM", 155: "BONEMERANG"}
AGE_OFFSET: dict[int, int] = {104: -1, 299: -10}  # Double Team: production age 0 = ROM activation + 1 (the accepted prep7 framing; the ONIX route is 0 px only there); Blaze Kick -10 (audit 15)


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
    consumer_side = "player" if parties["player"][0]["moves"][0] in CONSUMERS else "opponent"
    consumer_battler = 0 if consumer_side == "player" else 1
    genders = {side: parties[side][0]["gender"] for side in ("player", "opponent")}
    bodies = d["bodies"]
    turns: list[list[dict]] = []
    hidden_unmodelled = None
    k = ku = 0
    seen_sunny = False
    later_scenario = name.startswith("later-")
    for i, b in enumerate(bodies):
        t = b["startFrame"] // TURN
        while len(turns) <= t:
            turns.append([])
        label, atk = b["label"], b["attacker"]
        at = b["at"]["battlers"]
        nxt = bodies[i + 1]["at"]["battlers"] if i + 1 < len(bodies) else None
        if label == "Move_SUNNY_DAY" and seen_sunny:
            # General_SunlightContinues shares Move_SUNNY_DAY's script (the probe's nearest symbol); the move itself fails while the sun is up
            turns[t].append({"kind": "animation", "animationId": "SUN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label in MOVES:
            move = MOVES[label]
            seen_sunny = seen_sunny or move == 241
            tgt = b["target"]
            hit = POWER[move] > 0 and nxt is not None and nxt[tgt]["hp"] < at[tgt]["hp"]
            body = {"kind": "animation", "animationId": "MOVE_ANIMATION", "battler": atk, "target": tgt,
                    "arguments": [str(move), str(b["moveTurn"]), str(POWER[move]), "1" if hit else "0", "70", "0"]}
            # fb-* (plans51 bases: 1234-frame prompt cycles, and the locked Outrage turn has no prompt) render only the holder's consumer
            as_later = move in LATER and hidden_unmodelled is None and "endFrame" in b and not name.startswith("fb-")
            if as_later or (move in CONSUMERS and atk == consumer_battler and hidden_unmodelled is None and "endFrame" in b and not later_scenario):
                side = "player" if atk == 0 else "opponent"
                fx = {
                    "schema": "audit17-chain-fixture/v1", "move": LATER[move] if as_later else CONSUMERS[move], "bodyIndex": ku if as_later else k,
                    "probe": "tools/integration/prep48Probe.py", "scenario": str(SCEN / d["scenario"]),
                    "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"], **({"ageOffset": AGE_OFFSET[move]} if move in AGE_OFFSET else {})},
                    "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": side}},
                    "target": {"species": SPECIES[at[1 - atk]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                    "attackerPersonality": at[atk]["personality"],
                    "displayedStatus": {"player": shown(at[0]["status1"]), "opponent": shown(at[1]["status1"])},
                    "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                     "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                    "requestFields": {"turn": b["moveTurn"] if as_later else 0},
                    # Bonemerang hit 2: the message box is blank (later58's fixtures carry messageLines ["", ""])
                    **({"messageLines": ["", ""]} if move == 155 and b["moveTurn"] == 1 else {}),
                    "precedingTurns": [{"events": list(ev)} for ev in turns[:-1]] + [{"events": turns[-1] + [body]}],
                }
                out = f"{name}-cu{ku}.json" if as_later else f"{name}-c{k}.json"
                (out_dir / out).write_text(json.dumps(fx, indent=1) + "\n")
                print(out, "units", sum(len(x["events"]) for x in fx["precedingTurns"]) - 1)
                if as_later:
                    ku += 1
                else:
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
        elif label == "Status_Infatuation":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 0x00010000})
        elif label == "General_FutureSightHit":
            turns[t].append({"kind": "animation", "animationId": "FUTURE_SIGHT_HIT", "battler": atk, "target": b["target"], "arguments": []})
        elif label == "General_HeldItemEffect":
            turns[t].append({"kind": "animation", "animationId": "HELD_ITEM_EFFECT", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_FocusBand":
            turns[t].append({"kind": "animation", "animationId": "FOCUS_BAND", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_StatsChange":
            turns[t].append({"kind": "animation", "animationId": "STATS_CHANGE", "battler": atk, "target": atk, "arguments": ["21"]})
        else:
            if hidden_unmodelled is None:
                print(name, "UNMODELLED", label, "at", b["startFrame"])
            hidden_unmodelled = label
