#!/usr/bin/env python3
"""later58: liveAdapterFramebuffer.ts fixtures for every target body of the later58 scenarios (from a prep48Probe.py output dir).

usage: later58Fixtures.py <probe-dir> <fixture-dir>
Per body of Signal Beam 324 / Sheer Cold 329 / Mach Punch 183 / Extrasensory 326 / Sky Attack 143 / Bonemerang 155 / Memento 262 / Outrage 200
(the prep48DigFixtures.py recipe):
  denseWindow = [activation, activation + rows - 1] of the probed body (the scenario's own activation and length). rows = the probe's
  first-inactive frame - activation (+1 for Extrasensory / Fury Cutter, whose live duration includes the first inactive row; the d4aFixtures.py
  convention). fieldProfile HP / maxHP from the ROM gBattleMons at activation; species / personality from the probe; precedingBodies = every
  earlier animation unit of the battle (move bodies by move id + attacker side, General_StatsChange = statAnimation 22 (Growl, Attack -1),
  Status_Confusion = statusAnimation CONFUSION). Bodies after a faint + send-in (a lead species changed) or after a unit precedingBodies cannot
  carry (Special_ switch, General_ held-item animations) are not fixtured. Sky Attack: the charge bodies only (the strike is a 10143 unit), empty text box.
  Bonemerang: hit 2 = the side's odd hit body (turn 1, empty text box). Fury Cutter: request power = 10 << own-body index (SWARM x 1.5). D4 moves carry the measured phase(s) for d4aTimingCheck.ts: Mach Punch / Sheer Cold /
  Extrasensory optional-lag-age from the window length; Extrasensory scanline-split-line = the first-body label of the same species pair /
  side (PREP30_SPLIT in d4aFixtures.py: "event" for the player-attacker ALAKAZAM -> GOLEM pair, else "no-event").
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
NAMES = [s["species"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-names.json").read_text())["species"]]
TARGETS = {"Move_SIGNAL_BEAM": ("SIGNAL_BEAM", 324, 0), "Move_SHEER_COLD": ("SHEER_COLD", 329, 0),
           "Move_MACH_PUNCH": ("MACH_PUNCH", 183, 0), "Move_EXTRASENSORY": ("EXTRASENSORY", 326, 1),
           "Move_SKY_ATTACK": ("SKY_ATTACK", 143, 0), "Move_BONEMERANG": ("BONEMERANG", 155, 0), "Move_MEMENTO": ("MEMENTO", 262, 0),
           "Move_OUTRAGE": ("OUTRAGE", 200, 0), "Move_FURY_CUTTER": ("FURY_CUTTER", 210, 1)}
# D4 optional-lag-age: rows with the lag ("event") / without (liveMoveTimingPolicy.ts bodyRows).
LAG_ROWS = {"MACH_PUNCH": (110, 109), "SHEER_COLD": (191, 190), "EXTRASENSORY": (162, 161)}
MOVES = {"Move_QUICK_ATTACK": 98, "Move_GROWL": 45, "Move_SPLASH": 150, "Move_ROCK_SLIDE": 157, "Move_TACKLE": 33, "Move_SANDSTORM": 201,
         **{k: v[1] for k, v in TARGETS.items()}}
SCEN = Path("tools/integration/fixtures/later58/scenarios")
written = []
for probe in sorted(probe_dir.glob("*.json")):
    d = json.loads(probe.read_text())
    scen = json.loads((SCEN / d["scenario"]).read_text()) if (SCEN / d["scenario"]).exists() else json.loads((SCEN / f"{probe.stem}.json").read_text())
    genders = {side: scen["overrides"]["parties"][side][0]["gender"] for side in ("player", "opponent")}
    units, seen = [], {}
    leads = [scen["overrides"]["parties"][side][0]["species"] for side in ("player", "opponent")]
    for b in d["bodies"]:
        # A body after a faint + replacement send-in is not fixtured (precedingBodies cannot carry the faint / send-in units).
        if [x["species"] for x in b["at"]["battlers"]] != leads:
            break
        side = "player" if b["attacker"] == 0 else "opponent"
        label = b["label"]
        if label in TARGETS:
            move, move_id, inclusive = TARGETS[label]
            k = seen.get(side, 0); seen[side] = k + 1
            if move == "SKY_ATTACK" and k % 2 == 1:
                # The strike (turn bit 1) is already live at any known lend: a predecessor unit only (order plan key 10143).
                units.append({"moveId": 10143, "side": side})
                continue
            at = b["at"]["battlers"]
            atk, tgt = b["attacker"], 1 - b["attacker"]
            rows = b["endFrame"] - b["startFrame"] + inclusive
            fx = {
                "schema": "later58-live-adapter-fixture/v1", "move": move, "bodyIndex": k,
                "probe": "tools/integration/prep48Probe.py", "scenario": str(SCEN / f"{probe.stem}.json"),
                "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["startFrame"] + rows - 1},
                "attacker": {"species": NAMES[at[atk]["species"]], "geometry": {"side": side}},
                "target": {"species": NAMES[at[tgt]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                "attackerPersonality": at[atk]["personality"], "displayedStatus": {"player": "none", "opponent": "none"},
                "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                 "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                "requestFields": {"turn": 0},
            }
            if move == "SKY_ATTACK":
                fx["messageLines"] = ["", ""]  # the charge runs under an empty text box (the q2 / species-audit charge fixtures)
            if move == "BONEMERANG" and k % 2 == 1:
                fx["requestFields"] = {"turn": 1}  # hit 2 (the prep29-live hit2 fixtures)
                fx["messageLines"] = ["", ""]
            if move == "FURY_CUTTER" and k > 0:
                # After its own Fury Cutter body the order host has no plan (census: "order host: no EXACT plan: body 210"): production's
                # lend is unknown there, so no later counter-2+ body is fixtured.
                break
            if move == "FURY_CUTTER":
                # gBattleMovePower = 10 << (counter - 1) (x 1.5 under SWARM at <= 1/3 HP): the MOVE_ANIMATION power argument. Every body of the
                # side is a successful Fury Cutter of the same battler (no switch), so counter = own body index + 1 unless a miss intervened.
                hp, max_hp = at[atk]["hp"], at[atk]["maxHP"]
                power = 10 << min(k, 4)
                fx["requestFields"] = {"turn": 0, "power": power * 3 // 2 if at[atk]["species"] == 123 and hp * 3 <= max_hp else power}
            if move in LAG_ROWS:
                lag, nolag = LAG_ROWS[move]
                fx["timingPhase"] = "event" if rows == lag else "no-event" if rows == nolag else f"unclassified rows {rows}"
                if move == "EXTRASENSORY":
                    split = "event" if side == "player" and fx["target"]["species"] == "GOLEM" and fx["attacker"]["species"] == "ALAKAZAM" else "no-event"
                    fx["timingPhases"] = {"optional-lag-age": fx["timingPhase"], "scanline-split-line": split}
            if units:
                fx["precedingBodies"] = list(units)
            name = f"{probe.stem}-{k}.json"
            (out_dir / name).write_text(json.dumps(fx, indent=1) + "\n")
            written.append(name)
            units.append({"moveId": move_id, "side": side})
        elif label == "General_StatsChange":
            units.append({"moveId": 0, "side": side, "statAnimation": 22})
        elif label == "Status_Confusion":
            units.append({"moveId": 0, "side": side, "statusAnimation": "CONFUSION"})
        elif label in MOVES:
            units.append({"moveId": MOVES[label], "side": side})
        else:
            # A unit the fixture's precedingBodies cannot carry (a switch / general animation): no later body of this battle is fixtured.
            break
print("\n".join(written))
