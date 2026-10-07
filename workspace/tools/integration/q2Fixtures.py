#!/usr/bin/env python3
"""Generate the Q2 live-adapter dense fixtures (Snore 173, Smog 123, Sand Tomb 328, Hyper Voice 304, Sky Attack 143 charge + strike) from fresh
direct-mGBA prep22Probe.py outputs (prep22Probes.sh DIR 1 <scenarios> -> DIR/<scenario>-r1.json).  Window = [activation, activation + rows - 1]
of the probed body (activation from the scenario's own source activation frame).
usage: q2Fixtures.py PROBEDIR   -> tools/integration/fixtures/q2-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVES = {"SNORE": (173, 69), "SMOG": (123, 305), "SAND_TOMB": (328, 123), "HYPER_VOICE": (304, 104), "SKY_ATTACK": (143, None)}
ACC = {"snore": ("SNORE", "sealeo-venomoth"), "smog": ("SMOG", "magby-onix"), "sand-tomb": ("SAND_TOMB", "dugtrio-onix"),
       "hyper-voice": ("HYPER_VOICE", "exploud-slowking"), "sky-attack": ("SKY_ATTACK", "fearow-shuckle")}
ALT = {"snore": "snorlax-golem", "smog": "weezing-golem", "sand-tomb": "sandslash-golem", "hyper-voice": "loudred-golem", "sky-attack": "pidgeot-golem"}
CASES = []  # (move, tag, scenario, side)
for key, (move, _) in ACC.items():
    a, t = ACC[key][1].split("-")
    for side in ("player", "opponent"):
        foe = "opponent" if side == "player" else "player"
        CASES.append((move, f"{key}-{side}-{a}-{foe}-{t}", f"mechanic-{key}-{side}-{a}-{foe}-{t}", side))
        aa, at = ALT[key].split("-")
        CASES.append((move, f"{key}-alt-{side}-{aa}-{at}", f"prep25-{key}-alt-{side}-{aa}-{at}", side))
extra = Path(__file__).parent / "q2ExtraCases.json"
if extra.exists():
    CASES += [tuple(c) for c in json.loads(extra.read_text())]
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/q2-live"
out.mkdir(exist_ok=True)
for move, tag, scen, side in CASES:
    if not (D / f"{scen}-r1.json").exists():
        continue  # a PROBEDIR may hold a subset of the scenarios
    p = json.loads((D / f"{scen}-r1.json").read_text())
    mid, rows = MOVES[move]
    bodies = p["bodies"]
    idxs = [i for i, b in enumerate(bodies) if b["move"] == mid]
    if move == "SNORE":
        continue  # not wired: no exact order lend after the sleep-inducing body (docs in the final report)
    for n, idx in enumerate(idxs[:2] if move == "SKY_ATTACK" else idxs[:1]):  # Sky Attack: charge + strike (prep28: strike keyed 10143)
        body = bodies[idx]
        A = body["start"]
        rows_ = rows if rows is not None else (148 if n == 0 else 180)
        m = body["atActivation"]["mons"]
        foe = "opponent" if side == "player" else "player"
        sp = {"player": m[0], "opponent": m[1]}
        name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
        suffix = "" if move != "SKY_ATTACK" else ("-charge" if n == 0 else "-strike")
        fx = {
            "schema": "q2-live-adapter-fixture/v1", "move": move,
            "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
            "denseWindow": {"startFrame": A, "endFrame": A + rows_ - 1},
            "windowSource": f"window = [activation, activation + {rows_} - 1] from a fresh prep22Probes.sh run",
            "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
            "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
            "attackerPersonality": sp[side]["personality"],
            "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
            "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                             "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
        }
        pre = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} for b in bodies[:idx] if b["move"] != 0]
        if pre:
            fx["precedingBodies"] = pre
        if move == "SKY_ATTACK":
            fx["requestFields"] = {"turn": 0 if n == 0 else 1}
            if n == 0:
                fx["messageLines"] = ["", ""]  # the charge turn's text box is blank during the body (as the Solar Beam setup fixtures)
        (out / f"{tag}{suffix}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(tag + suffix, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"], pre)
