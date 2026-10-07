#!/usr/bin/env python3
"""D4a faithful-timing dense fixtures (Mach Punch 183, Nightmare 171) from fresh direct-mGBA prep22Probe.py outputs (prep22Probes.sh DIR 1 <scenarios>).
Window = [activation, activation + own body rows - 1] of the probed body: each scenario's OWN activation and length (the measured CPU phase); the fixture
records the phase ("event" = the optional late lag is present, "no-event" = not) for the D4 check (zero residual in the policy's phase, documented rows
only in the other). Same recipe as q2Fixtures.py. usage: d4aFixtures.py PROBEDIR [move...]   -> tools/integration/fixtures/d4a-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1]); ONLY = set(sys.argv[2:])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
# move -> (id, rows with the optional lag ("event"), rows without)
MOVES = {"MACH_PUNCH": (183, 110, 109), "NIGHTMARE": (171, 168, 167)}
ACC = {"mach-punch": ("MACH_PUNCH", "hitmonchan-chansey"), "nightmare": ("NIGHTMARE", "haunter-shuckle")}
ALT = {"mach-punch": "machamp-golem", "nightmare": "gengar-golem"}
CASES = []  # (move, tag, scenario, side)
for key, (move, pair) in ACC.items():
    a, t = pair.split("-")
    for side in ("player", "opponent"):
        foe = "opponent" if side == "player" else "player"
        CASES.append((move, f"{key}-{side}-{a}-{foe}-{t}", f"mechanic-{key}-{side}-{a}-{foe}-{t}", side))
        aa, at = ALT[key].split("-")
        CASES.append((move, f"{key}-alt-{side}-{aa}-{at}", f"prep25-{key}-alt-{side}-{aa}-{at}", side))
CASES += [tuple(c) for c in json.loads((Path(__file__).parent / "d4aCases.json").read_text())]
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/d4a-live"
out.mkdir(exist_ok=True)
for move, tag, scen, side in CASES:
    if ONLY and move not in ONLY: continue
    if not (D / f"{scen}-r1.json").exists():
        continue  # a PROBEDIR may hold a subset of the scenarios
    p = json.loads((D / f"{scen}-r1.json").read_text())
    mid, event_rows, none_rows = MOVES[move]
    bodies = p["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == mid)
    body = bodies[idx]
    A, E = body["start"], body["end"]
    rows = E - A
    assert rows in (event_rows, none_rows), (scen, rows)
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {
        "schema": "d4a-live-adapter-fixture/v1", "move": move,
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
        "windowSource": f"window = [activation, activation + {rows} - 1] (this scenario's own body) from a fresh prep22Probes.sh run",
        "timingPhase": "event" if rows == event_rows else "no-event",
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
    }
    pre = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} if b["move"] != 0
           else {"moveId": 0, "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent", "statusAnimation": "SLP"} for b in bodies[:idx]]
    if pre:
        fx["precedingBodies"] = pre
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], rows, fx["timingPhase"], fx["attacker"]["species"], "->", fx["target"]["species"], pre)
