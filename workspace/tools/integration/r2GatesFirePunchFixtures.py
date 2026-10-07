#!/usr/bin/env python3
"""r2-gates: Fire Punch (7) BODY-only dense fixtures (docs/next-adapters-prep22.md s0/A). Window = the scenario's own Move_FIRE_PUNCH
activation A .. first inactive (101 rows, ageOffset 0 = live age 0), from the prep22 direct-mGBA probes (fixtures/prep22/fire-punch.json for the
six ONIX/GROVYLE lab scenarios and the r2GatesFirePunchAlt.py alternate-species scenarios), never matched to live output.
usage: r2GatesFirePunchFixtures.py <probe dir>   -> tools/integration/fixtures/r2-gates/fp-*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
out = R / "tools/integration/fixtures/r2-gates"; out.mkdir(exist_ok=True)
P = Path(sys.argv[1])  # prep22Probes.sh output dir (<scenario>-r1.json: prep22Probe.py bodies)
TAGS = {"player-burn": "prep22-fire-punch-player-seed11", "player-noburn": "prep22-fire-punch-player-seed1", "player-faint": "prep22-fire-punch-faint-player",
        "opponent-burn": "prep22-fire-punch-opponent-seed2", "opponent-noburn": "prep22-fire-punch-opponent-seed1", "opponent-faint": "prep22-fire-punch-faint-opponent",
        "p-hitmonchan-golbat": "r2g-fp-p-hitmonchan-golbat", "p-snorlax-alakazam": "r2g-fp-p-snorlax-alakazam",
        "o-golbat-machamp": "r2g-fp-o-golbat-machamp", "o-snorlax-golem": "r2g-fp-o-snorlax-golem"}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
for tag, scen in TAGS.items():
    d = json.loads((P / f"{scen}-r1.json").read_text()); bodies = d["bodies"]
    k = next(i for i, b in enumerate(bodies) if b["move"] == 7); b = bodies[k]; act = b["start"]
    assert b["end"] - act == 101, (tag, b["start"], b["end"])
    m = b["atActivation"]["mons"]; side = "player" if b["atActivation"]["attacker"] == 0 else "opponent"; foe = "opponent" if side == "player" else "player"
    pre = [{"moveId": x["move"], "side": "player" if x["atActivation"]["attacker"] == 0 else "opponent"} for x in bodies[:k]]
    sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    sc = json.loads((R / f"tools/battle-lab/{scen}.json").read_text())["overrides"]["parties"]
    lvl = lambda side: sc[side][0]["level"]
    fx = {"schema": "r2-gates-fire-punch-fixture/v1", "move": "FIRE_PUNCH", "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
          "denseWindow": {"startFrame": act, "endFrame": act + 100, "ageOffset": 0},
          "windowSource": "r2-gates: the scenario's own Move_FIRE_PUNCH body A .. first inactive (101 rows; prep22Probe.py direct-mGBA bodies), never matched to live output",
          "precedingBodies": pre,
          "attacker": {"species": name(sp[side]), "geometry": {"side": side}}, "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
          "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                           "playerLevel": lvl("player"), "opponentLevel": lvl("opponent"),
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])}}
    (out / f"fp-{tag}.json").write_text(json.dumps(fx, indent=1) + "\n"); print(tag, act, [(u["moveId"], u["side"][0]) for u in pre])
