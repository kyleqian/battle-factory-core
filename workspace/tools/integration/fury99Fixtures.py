#!/usr/bin/env python3
"""fury99: liveAdapterFramebuffer.ts fixtures for every Fury Cutter 210 body of the fury99 scenarios (from a fury99Probes.sh output dir).

usage: fury99Fixtures.py <probe-dir> <fixture-dir>
The later58Fixtures.py recipe (docs/next-adapters-later58.md), Fury Cutter only and at every counter:
  denseWindow = [activation, first inactive frame] (43 rows; the live duration includes the first inactive row).
  requestFields: turn 0, power = 10 << (counter - 1) and rolloutCounter = the RAM furyCutterCounter at activation (plans54's payload).
  precedingBodies: every earlier unit; an earlier Fury Cutter body is its order-plan key 210 / 10210 / 20210 / 30210 by its RAM counter
  (liveSpriteOrderHost FURY_CUTTER_ORDER_KEYS), Growl's stat-down = statAnimation 22.
  precedingX2Events: the same move bodies as move-body events by their real move ids (the x2 tracker production feeds).
Bodies after a faint + send-in or after a unit the fixture cannot carry are not fixtured.
"""
import json, sys
from pathlib import Path

probe_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
NAMES = [s["species"].removeprefix("SPECIES_") for s in json.loads(Path("src/data/gen/species-names.json").read_text())["species"]]
MOVES = {"Move_GROWL": 45, "Move_SPLASH": 150}
KEYS = [210, 10210, 20210, 30210]
SCEN = Path("tools/integration/fixtures/fury99/scenarios")
written = []
for probe in sorted(probe_dir.glob("*.json")):
    d = json.loads(probe.read_text())
    scen = json.loads((SCEN / f"{probe.stem}.json").read_text())
    genders = {side: scen["overrides"]["parties"][side][0]["gender"] for side in ("player", "opponent")}
    leads = [scen["overrides"]["parties"][side][0]["species"] for side in ("player", "opponent")]
    units, x2, k = [], [], 0
    for b in d["bodies"]:
        if [x["species"] for x in b["at"]["battlers"]] != leads:
            break
        side = "player" if b["attacker"] == 0 else "opponent"
        label = b["label"]
        if label == "Move_FURY_CUTTER":
            at = b["at"]["battlers"]
            atk, tgt = b["attacker"], 1 - b["attacker"]
            counter = b["furyCutterCounter"][atk]
            rows = b["endFrame"] - b["startFrame"] + 1
            fx = {
                "schema": "later58-live-adapter-fixture/v1", "move": "FURY_CUTTER", "bodyIndex": k, "furyCutterCounter": counter,
                "probe": "tools/integration/prep48Probe.py", "scenario": str(SCEN / f"{probe.stem}.json"),
                "denseWindow": {"startFrame": b["startFrame"], "endFrame": b["startFrame"] + rows - 1},
                "attacker": {"species": NAMES[at[atk]["species"]], "geometry": {"side": side}},
                "target": {"species": NAMES[at[tgt]["species"]], "geometry": {"side": "opponent" if side == "player" else "player"}},
                "attackerPersonality": at[atk]["personality"], "displayedStatus": {"player": "none", "opponent": "none"},
                "fieldProfile": {"playerHp": at[0]["hp"], "playerMaxHp": at[0]["maxHP"], "opponentHp": at[1]["hp"], "opponentMaxHp": at[1]["maxHP"],
                                 "playerGender": genders["player"], "opponentGender": genders["opponent"]},
                "requestFields": {"turn": 0, "power": 10 << (counter - 1), "rolloutCounter": counter},
            }
            if units:
                fx["precedingBodies"] = list(units)
                fx["precedingX2Events"] = list(x2)
            name = f"{probe.stem}-{k}.json"
            (out_dir / name).write_text(json.dumps(fx, indent=1) + "\n")
            written.append(name)
            units.append({"moveId": KEYS[min(counter, 4) - 1], "side": side})
            x2.append({"kind": "move-body", "moveId": 210, "attackerSide": side})
            k += 1
        elif label == "General_StatsChange":
            units.append({"moveId": 0, "side": side, "statAnimation": 22})
        elif label in MOVES:
            units.append({"moveId": MOVES[label], "side": side})
            x2.append({"kind": "move-body", "moveId": MOVES[label], "attackerSide": side})
        else:
            break
print("\n".join(written))
