#!/usr/bin/env python3
"""flat77: chain fixtures for the flat77 later-body FLATTER 260 scenarios (flat77Probe.py output). audit19Fixtures.py's derivation
unchanged (turns from the ROM's gBattleResults.battleTurnCounter, the kernel payload forms the orchestrator feeds the production hosts,
STATS_CHANGE with the ROM's animArg1, Status_Confusion + its self-hit HIT_ANIMATION, promptShown, pinnedRng2 per history body), with:
  units  FLATTER 260 (power 0, never a hit), TACKLE 33 (35), QUICK_ATTACK 98 (40); batch 2: LIGHT_SCREEN 113, MEGA_DRAIN 72,
         AERIAL_ACE 332, BITE 44, IRON_DEFENSE 334, ACID 51 (+ SHOCK_WAVE 351 / MUD_SLAP 189 from audit 19);
  windows EVERY Flatter body of either battler (the ff-* fast lead's turn-0 body is the first-body control);
  rom    + `at` (activation registers / allocator tags; flat77Check.ts reads the per-row registers from its own fresh probes).
--predict: no probe; one fixture per scenario for the consumer's TURN-0 body from the PREDICTED history (qa / tk: the fast lead's
  move hits the consumer [+ HIT_ANIMATION]; ff: the fast lead's first-body Flatter + STATS_CHANGE on the consumer), so the production
  hosts' lend / first-body / allocator claim can be recorded before any probe (flat77Check.ts FLAT77_PREDICT=1).
usage: flat77Fixtures.py <probe-dir> <fixture-dir>  |  flat77Fixtures.py --predict <fixture-dir>
"""
import json, sys
from pathlib import Path

PREDICT = sys.argv[1] == "--predict"
probe_dir, out_dir = (None, Path(sys.argv[2])) if PREDICT else (Path(sys.argv[1]), Path(sys.argv[2]))
out_dir.mkdir(parents=True, exist_ok=True)
SCEN = Path("tools/integration/fixtures/flat77/scenarios")
SPECIES = {s["id"]: s["name"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
POWER = {260: 0, 33: 35, 98: 40, 113: 0, 72: 20, 332: 60, 44: 60, 334: 0, 51: 40, 222: 0, 241: 0, 240: 0, 176: 0, 302: 60, 173: 40, 301: 30, 291: 60, 351: 60, 352: 60, 129: 60, 85: 95, 189: 20, 250: 15}
NAMES = {260: "FLATTER", 33: "TACKLE", 98: "QUICK_ATTACK", 113: "LIGHT_SCREEN", 72: "MEGA_DRAIN", 332: "AERIAL_ACE", 44: "BITE",
         334: "IRON_DEFENSE", 51: "ACID", 222: "MAGNITUDE", 241: "SUNNY_DAY", 240: "RAIN_DANCE", 176: "CONVERSION_2", 302: "NEEDLE_ARM", 173: "SNORE", 301: "ICE_BALL",
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


def predicted(scen_path: Path) -> dict:
    """A probe-shaped record of the PREDICTED turn-0 history (no RAM): the fast lead acts first (speed 31 vs 0 / Quick Attack +1)."""
    sc = json.loads(scen_path.read_text())
    pa = sc["overrides"]["parties"]
    slow = 0 if pa["player"][0]["ivs"]["speed"] < pa["opponent"][0]["ivs"]["speed"] else 1
    fast = 1 - slow
    mon = lambda p, hp: {"species": p["species"], "hp": hp, "maxHP": 200, "personality": 0, "status1": 0}
    lead = [pa["player"][0], pa["opponent"][0]]
    full = [mon(lead[0], 200), mon(lead[1], 200)]
    hurt = [dict(x) for x in full]; hurt[slow]["hp"] = 150
    at = lambda bs: {"battlers": bs, "turnCounter": 0, "rng2": 0, "spriteOrder": [], "battlerSprites": [{"invisible": False}] * 2,
                     "registers": {}, "paletteTags": [], "tileBitmapSha": "", "tileTagsSha": "", "matrixBitmap": 0}
    fm = lead[fast]["moves"][0]
    body = lambda i, label, a, t, bs: {"index": i, "startFrame": i, "endFrame": i + 1, "label": label, "attacker": a, "target": t, "moveTurn": 0,
                                       "power": 0, "labelOffset": 0, "animArg1": 0, "rollout": 0, "pre": {"registers": {}}, "at": at(bs)}
    if fm == 260:  # ff: the first-body Flatter on the consumer, its Sp. Atk +1 STATS_CHANGE (animArg1 per the probe; 0 predicted)
        bodies = [body(0, "Move_FLATTER", fast, slow, full), body(1, "General_StatsChange", slow, slow, full), body(2, "Move_FLATTER", slow, fast, full)]
    else:
        bodies = [body(0, f"Move_{NAMES[fm]}", fast, slow, full), body(1, "Move_FLATTER", slow, fast, hurt)]
    return {"scenario": scen_path.name, "bodies": bodies, "turns": [{"turnCounter": 0, "playerStatus2": 0}]}


SOURCES = [(p.stem, predicted(p)) for p in sorted(SCEN.glob("*.json"))] if PREDICT else [(p.stem, json.loads(p.read_text())) for p in sorted(probe_dir.glob("*.json"))]
for name, d in SOURCES:
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
        if label == "Move_SUNNY_DAY" and b["labelOffset"] != 0:
            turns[t].append({"kind": "animation", "animationId": "SUN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label == "General_Rain":
            pinned_general.append([flat, b["at"]["rng2"]])
            turns[t].append({"kind": "animation", "animationId": "RAIN_CONTINUES", "battler": atk, "target": atk, "arguments": []})
        elif label in MOVES and b["labelOffset"] == 0:
            move = MOVES[label]
            tgt = b["target"]
            power = b["power"] if move in RAM_POWER else POWER[move]
            hit = move not in (222, 241, 240, 176, 173, 260) or move == 222
            hit = hit and tgt != atk and nxt is not None and nxt[tgt]["hp"] < at[tgt]["hp"]
            args = [str(move), str(b["moveTurn"]), str(power), "1" if hit else "0", "70", "0"] + ([str(b["rollout"])] if move == 301 else [])
            body = {"kind": "animation", "animationId": "MOVE_ANIMATION", "battler": atk, "target": tgt, "arguments": args}
            consumer = move == 260
            if consumer and "endFrame" in b:
                side = "player" if atk == 0 else "opponent"
                other = 1 - atk
                fx = {
                    "schema": "flat77-chain-fixture/v1", "move": NAMES[move], "bodyIndex": k,
                    "probe": "tools/integration/flat77Probe.py", "scenario": str(SCEN / d["scenario"]),
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
                            "power": b["power"], "at": {"registers": b["at"]["registers"], "paletteTags": b["at"]["paletteTags"],
                            "tileBitmapSha": b["at"]["tileBitmapSha"], "tileTagsSha": b["at"]["tileTagsSha"], "matrixBitmap": b["at"]["matrixBitmap"],
                            "pre": b["pre"]["registers"]}},
                    "presentationRngActivation": {"value": b["at"]["rng2"], "source": f"flat77Probe.py at.rng2 (RAM gRng2Value, activation frame {b['startFrame']})"},
                    "pinnedRng2": [list(x) for x in pinned if x[0] < flat],
                    "pinnedGeneral": [list(x) for x in pinned_general if x[0] < flat],
                    "promptShown": [not locked_at.get(u, False) if u > 0 else True for u in range(t + 1)],
                    "precedingTurns": [{"events": list(ev)} for ev in turns[:-1]] + [{"events": turns[-1] + [body]}],
                }
                if not PREDICT or (atk == consumer_battler and t == 0):
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
        elif label == "Status_Confusion":
            turns[t].append({"kind": "status-animation", "battler": atk, "isStatus2": 1, "status": 1})
            if nxt is not None and nxt[atk]["hp"] < at[atk]["hp"]:
                turns[t].append({"kind": "animation", "animationId": "HIT_ANIMATION", "battler": atk, "target": atk, "arguments": []})
        else:
            print(name, "UNMODELLED", label, "at", b["startFrame"])
            stopped = label
