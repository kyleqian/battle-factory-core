#!/usr/bin/env python3
"""S10A live dense fixtures for scoped-exact adapters without a CPU phase (Spit Up 255, all three Stockpile counters) from TWO fresh direct-mGBA
prep22Probe.py runs per scenario (prep22Probes.sh DIR 2 <scenarios>; the runs must agree on every body). Window = [activation, end] of the
scenario's FIRST body of the move (its own activation and length); request.turn = the Stockpile counter (prep29 / prep31: animTurn - 1 at
activation); precedingBodies = every unit before it (Growl's stat-change unit = statAnimation 21). Same recipe as d4aFixtures.py.
usage: s10aLiveFixtures.py PROBEDIR   -> tools/integration/fixtures/s10a-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
COUNTERS = {"one": 1, "two": 2, "three": 3}
CASES = []
for side in ("player", "opponent"):
    for word, counter in COUNTERS.items():
        CASES.append((f"spit-up-{side}-{counter}", f"mechanic-spit-up-{side}-swalot-{word}-stockpile", side, counter))
        CASES.append((f"spit-up-alt-{side}-seviper-golem-{counter}", f"prep29-spit-up-alt-{side}-seviper-golem-{word}-stockpile", side, counter))
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
side_of = lambda b: "player" if b["atActivation"]["attacker"] == 0 else "opponent"
out = R / "tools/integration/fixtures/s10a-live"
out.mkdir(exist_ok=True)
for tag, scen, side, counter in CASES:
    p1, p2 = (json.loads((D / f"{scen}-r{r}.json").read_text()) for r in (1, 2))
    key = lambda p: [(b["move"], b["start"], b["end"], b["atActivation"]["attacker"]) for b in p["bodies"]]
    assert key(p1) == key(p2), (scen, "fresh runs disagree")
    bodies = p1["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == 255)
    body = bodies[idx]
    assert side_of(body) == side, (scen, "side")
    A, E = body["start"], body["end"]
    rows = E - A + 1
    assert rows == (109 if counter == 3 else 108), (scen, rows)
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    fx = {
        "schema": "d4a-live-adapter-fixture/v1", "move": "SPIT_UP",
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": E},
        "windowSource": f"window = [activation, first inactive row] of this scenario's first Spit Up body ({rows} rows) from 2 fresh prep22Probes.sh runs (bodies agree)",
        "requestFields": {"turn": counter},
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
    }
    pre = []
    for i, b in enumerate(bodies[:idx]):
        if b["move"] != 0: pre.append({"moveId": b["move"], "side": side_of(b)})
        else:
            assert i > 0 and bodies[i - 1]["move"] == 45, (scen, "unexpected non-move unit")
            pre.append({"moveId": 0, "side": side_of(b), "statAnimation": 21})
    if pre: fx["precedingBodies"] = pre
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, A, E, rows, fx["attacker"]["species"], "->", fx["target"]["species"], [b["moveId"] for b in pre])
