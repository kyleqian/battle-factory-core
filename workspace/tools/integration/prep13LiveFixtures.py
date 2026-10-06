#!/usr/bin/env python3
"""Generate the prep13 live-adapter dense fixtures (accepted + alternates) from prep13-analysis.json.
Window = the scenario's own activation + 0 (prep13 s0.2), never chosen by matching live output.
usage: prep13LiveFixtures.py   -> tools/integration/fixtures/prep13-live/*.json"""
import json, re
from pathlib import Path
R = Path(__file__).resolve().parents[2]
A = json.loads((R / "tools/integration/fixtures/prep13/prep13-analysis.json").read_text())
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
PROBE = {"ICE_BEAM": "iceBeamProbe", "WATER_SPOUT": "waterSpoutProbe", "HIDDEN_POWER": "hiddenPowerProbe", "HYPER_BEAM": "hyperBeamProbe"}
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/prep13-live"
for scen, bodies in A.items():
    for i, b in enumerate(bodies):
        if b["move"] not in PROBE: continue
        m = b["monsAtAct"]
        # side from the scenario name: mechanic-<move>(-tiers)?-<side>-... / prep13-<move>-alt-<side>-...
        mm = re.match(r"(?:mechanic-[a-z-]+?(?:-tiers)?-(player|opponent)-|prep13-[a-z-]+-alt-(player|opponent)-)", scen)
        side = mm.group(1) or mm.group(2)
        foe = "opponent" if side == "player" else "player"
        sp = {"player": m[0], "opponent": m[1]}
        name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
        fx = {
            "schema": "prep13-live-adapter-fixture/v1",
            "move": b["move"],
            "probe": f"tools/compare/{PROBE[b['move']]}.py",
            "scenario": f"tools/battle-lab/{scen}.json",
            "bodyIndex": i,
            "denseWindow": {"startFrame": b["act"], "endFrame": b["act"] + b["rows"] - 1},
            "windowSource": "prep13 s0.2: window start = the scenario's own activation frame + the accepted offset 0; rows = the probed first-inactive minus activation",
            "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
            "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
            "attackerPersonality": sp[side]["personality"],
            "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                             "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
        }
        tag = scen.replace("mechanic-", "").replace("prep13-", "") + (f"-body{i}" if len(bodies) > 1 else "")
        (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(tag, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"], fx["fieldProfile"])
