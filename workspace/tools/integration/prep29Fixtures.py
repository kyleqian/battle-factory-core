#!/usr/bin/env python3
"""Generate the prep29 R1 live-adapter dense fixtures (Bonemerang 155 hit 1 + hit 2, Rapid Spin 229, Outrage 200, Luster Purge 295) from fresh
direct-mGBA prep22Probes.sh outputs (DIR/<scenario>-r1.json). Window = [activation, activation + rows - 1] of each probed body.
usage: prep29Fixtures.py PROBEDIR -> tools/integration/fixtures/prep29-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVES = {"BONEMERANG": (155, 71, 2), "RAPID_SPIN": (229, 130, 1), "OUTRAGE": (200, 119, 1), "LUSTER_PURGE": (295, 332, 1)}
ACC = {"bonemerang": ("BONEMERANG", "marowak-chansey", "rhydon-golem"), "rapid-spin": ("RAPID_SPIN", "wartortle-onix", "starmie-golem"),
       "outrage": ("OUTRAGE", "dragonite-onix", "flygon-golem"), "luster-purge": ("LUSTER_PURGE", "latios-onix", "latias-golem")}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/prep29-live"
out.mkdir(exist_ok=True)
for key, (move, acc, alt) in ACC.items():
    mid, rows, nbody = MOVES[move]
    for kind, pair, pre in (("", acc, "mechanic"), ("alt-", alt, "prep29")):
        a, t = pair.split("-")
        for side in ("player", "opponent"):
            foe = "opponent" if side == "player" else "player"
            scen = f"{pre}-{key}-{kind}{side}-{a}-{t}" if kind else f"{pre}-{key}-{side}-{a}-{foe}-{t}"
            if not (D / f"{scen}-r1.json").exists():
                continue
            p = json.loads((D / f"{scen}-r1.json").read_text())
            bodies = p["bodies"]
            idxs = [i for i, b in enumerate(bodies) if b["move"] == mid][:nbody]
            for n, idx in enumerate(idxs):
                body = bodies[idx]; A = body["start"]; m = body["atActivation"]["mons"]
                sp = {"player": m[0], "opponent": m[1]}
                name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
                fx = {
                    "schema": "prep29-live-adapter-fixture/v1", "move": move, "probe": "tools/probe/run-battle-lab-rgb.py",
                    "scenario": f"tools/battle-lab/{scen}.json", "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
                    "windowSource": f"window = [activation, activation + {rows} - 1] from a fresh prep22Probes.sh run",
                    "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
                    "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
                    "attackerPersonality": sp[side]["personality"],
                    "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
                    "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                                     "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
                }
                pre_b = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} for b in bodies[:idx] if b["move"] != 0]
                if pre_b: fx["precedingBodies"] = pre_b
                if nbody > 1: fx["requestFields"] = {"turn": body["atActivation"]["animTurn"] - 1}
                if move == "RAPID_SPIN": fx["requestFields"] = {"power": body["atActivation"]["gAnimMovePower"], "damage": body["atActivation"]["gAnimMoveDmg"]}
                if move == "LUSTER_PURGE": fx["presentationRngActivation"] = {"value": body["atActivation"]["rng2"], "source": "pinned: the probed gRng2Value at the body's activation frame (prep22Probe atActivation.rng2; docs/next-adapters-prep29.md B.5)"}
                if n > 0: fx["messageLines"] = ["", ""]  # the later hit's text box is blank during the body (as the Sky Attack charge fixtures)
                tag = f"{key}-{kind}{side}-{a}-{foe}-{t}" + (f"-hit{n + 1}" if nbody > 1 else "")
                (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
                print(tag, fx["denseWindow"], pre_b)
