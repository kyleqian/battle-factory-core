#!/usr/bin/env python3
"""Live audit 20: chain fixtures for the audit-20 scenarios (audit20Probe.py output) = audit19Fixtures.py with: every move from
src/data/gen/moves.json (label Move_<NAME>, base power; HIT_ANIMATION only after a damaging move), Fury Cutter 210's kernel 7th argument
(the RAM furyCutterCounter) and its RAM power, Status_Curse -> status-animation (isStatus2, STATUS2_CURSED), consumer = CHANSEY's side;
windows = CHANSEY's allocator-consumer bodies (BARRIER 112, LIGHT_SCREEN 113, REFLECT 115, PROTECT 182, MIRROR_COAT 243, MAGIC_COAT 277)
and every MOVE body of the mm-* / dv-* scenarios (st76); `rom.alloc` = the ROM allocator state on the frame before activation (inUse,
OAM matrix bitmap, palette tags, tile digests), the battle's entry state (the frame before its first body) and the body's `creates`.
audit19Fixtures.py: chain fixtures for the audit-19 scenarios (audit19Probe.py output). audit18Fixtures.py's derivation (turns from the ROM's
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
Anything else (Special_* switch-ins after a KO, ...) is UNMODELLED: no fixture after it; audit 20: so is any body after a species change
(a KO's send-in plays no anim script, so the derivation cannot see its faint / switch-in units).
promptShown[t] = NOT (the player's status2 at the ROM's turn-counter change to t has STATUS2_MULTIPLETURNS | STATUS2_RECHARGE): the
orchestrator's beginOrderTurn(!playerLocked) input (Ice Ball / Dive / Petal Dance locks).
Windows (audit 19): every MOVE body of the slow lead (consumer side); every MOVE body of either battler in ice-*, dive-*, wp160-*.
Every MOVE body of the history carries its activation gRng2Value (`pinnedRng2`, flat event index): the check records the words of any
body with a production Random2 plan (Ice Ball, Mud-Slap, Rain Dance, Dive, Water Pulse, ...), prep65's method.
pb-* (land75 Part B, audit20PartBStage.py): a species change of battler b is its faint + send-in: the postko fixtures' kernel units
[faint-animation, draw-party-status-summary, hide-party-status-summary, switch-in-animation (partyIndex 1)] of b close the turn of the
body before (the hidden user's KO), and the derivation continues with the replacement.
usage: audit20Fixtures.py <probe-dir> <fixture-dir> [<scenario-dir>]
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
SCEN = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("tools/integration/fixtures/audit-20/scenarios")
SPECIES = {s["id"]: s["name"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
_MOVES = json.loads(Path("src/data/gen/moves.json").read_text())["moves"]
POWER = {m["id"]: m["power"] for m in _MOVES}
NAMES = {m["id"]: m["move"].removeprefix("MOVE_") for m in _MOVES if m["id"] > 0}
MOVES = {f"Move_{v}": k for k, v in NAMES.items()}
RAM_POWER = {222, 210}
CONSUMERS = {112, 113, 115, 182, 243, 277}
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
    consumer_side = "player" if parties["player"][0]["species"] == 113 else "opponent"
    consumer_battler = 0 if consumer_side == "player" else 1
    every_body = name.startswith(("mm-", "dv-", "pb-"))
    species_now = [d["bodies"][0]["at"]["battlers"][x]["species"] for x in (0, 1)] if d["bodies"] else []
    entry = d["bodies"][0]["pre"] if d["bodies"] else None
    genders = {side: parties[side][0].get("gender", "genderless") for side in ("player", "opponent")}
    # audit 20: the gender of the party member on the field (a pb-* replacement is member 2; the lead's otherwise)
    gender_of = lambda side, species: next((m.get("gender", "genderless") for m in parties[side] if m["species"] == species), genders[side])
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
        # audit 20: a faint + send-in plays no anim script in the ROM (the faint is a sprite callback, the send-in a ball task), so the
        # history would silently miss its kernel units (faint-animation / switch-in-animation): stop at the first body after a species change
        if name.startswith("pb-") and any(at[x]["species"] != species_now[x] for x in (0, 1)):
            prev_t = bodies[i - 1]["at"]["turnCounter"]
            for x in (0, 1):
                if at[x]["species"] != species_now[x]:
                    turns[prev_t] += [{"kind": "faint-animation", "battler": x}, {"kind": "draw-party-status-summary", "battler": x},
                                      {"kind": "hide-party-status-summary", "battler": x}, {"kind": "switch-in-animation", "battler": x, "partyIndex": 1}]
                    species_now[x] = at[x]["species"]
            flat = sum(len(x) for x in turns)
        if any(at[x]["species"] != bodies[0]["at"]["battlers"][x]["species"] for x in (0, 1)) and not name.startswith("pb-"):
            print(name, "UNMODELLED faint/send-in (species change) at", b["startFrame"])
            stopped = "faint"
            continue
        if label == "Move_SUNNY_DAY" and b["labelOffset"] != 0:
            turns[t].append({"kind": "animation", "animationId": "SUN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_Rain":
            pinned_general.append([flat, b["at"]["rng2"]])
            turns[t].append({"kind": "animation", "animationId": "RAIN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label in MOVES and b["labelOffset"] == 0:
            move = MOVES[label]
            tgt = b["target"]
            power = b["power"] if move in RAM_POWER else POWER[move]
            hit = POWER[move] > 0 and tgt != atk and nxt is not None and (nxt[tgt]["hp"] < at[tgt]["hp"]
                                                                          or (name.startswith("pb-") and nxt[tgt]["species"] != at[tgt]["species"]))
            args = [str(move), str(b["moveTurn"]), str(power), "1" if hit else "0", "70", "0"] + ([str(b["furyCutter"])] if move == 210 else [])
            body = {"kind": "animation", "animationId": "MOVE_ANIMATION", "battler": atk, "target": tgt, "arguments": args}
            consumer = every_body or (atk == consumer_battler and move in CONSUMERS)
            if consumer and "endFrame" in b:
                side = "player" if atk == 0 else "opponent"
                other = 1 - atk
                fx = {
                    "schema": "audit20-chain-fixture/v1", "move": NAMES[move], "bodyIndex": k,
                    "probe": "tools/integration/audit20Probe.py", "scenario": str(SCEN / d["scenario"]),
                    "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["endFrame"]},
                    "attacker": {"species": SPECIES[at[atk]["species"]], "geometry": {"side": side}},
                    "target": {"species": SPECIES[at[other]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                    "attackerPersonality": at[atk]["personality"],
                    "displayedStatus": {"player": shown(at[0]["status1"]), "opponent": shown(at[1]["status1"])},
                    "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                     "playerGender": gender_of("player", at[0]["species"]), "opponentGender": gender_of("opponent", at[1]["species"])},
                    # BattleScriptFirstChargingTurn prints STRINGID_EMPTYSTRING3 before the Dive setup's attackanimation (flybounce-live /
                    # a13fix charge fixtures: an empty box)
                    # audit 20: the same for every two-turn setup body (Fly 19, Dig 91, Bounce 340: BattleScriptFirstChargingTurn too)
                    **({"messageLines": ["", ""]} if move in (291, 19, 91, 340) and b["moveTurn"] == 0 else {}),
                    "requestFields": {"turn": b["moveTurn"], "target": tgt, "power": power},
                    "rom": {"invisible": [s["invisible"] for s in b["at"]["battlerSprites"]], "turn": t, "spriteOrder": b["at"]["spriteOrder"],
                            "power": b["power"],
                            "alloc": {"pre": {k: b["pre"][k] for k in ("inUse", "matrixBitmap", "paletteTags", "tileTagsSha", "tileBitmapSha")},
                                      "entry": {k: entry[k] for k in ("inUse", "matrixBitmap", "paletteTags", "tileTagsSha", "tileBitmapSha")},
                                      "creates": b["creates"][:16]}},
                    "presentationRngActivation": {"value": b["at"]["rng2"], "source": f"audit20Probe.py at.rng2 (RAM gRng2Value, activation frame {b['startFrame']})"},
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
            form = "1" if any(x["label"] == "Move_SUNNY_DAY" for x in bodies[:i]) else "2"
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
        elif label == "Status_Curse":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 0x10000000})
        elif label == "Status_Confusion":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 1})
            if nxt is not None and nxt[atk]["hp"] < at[atk]["hp"]:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": atk, "target": atk, "arguments": []})
        else:
            print(name, "UNMODELLED", label, "at", b["startFrame"])
            stopped = label
