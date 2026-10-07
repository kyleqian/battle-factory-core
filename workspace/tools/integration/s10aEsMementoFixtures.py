#!/usr/bin/env python3
"""S10A live dense fixtures for Extreme Speed 245 and Memento 262 (docs/next-adapters-prep34.md; scoped exact, no CPU phase) from TWO fresh
direct-mGBA prep22Probe.py runs per scenario (prep22Probes.sh DIR 2 <scenarios>; the runs must agree on every body). Window = [activation, end]
of the scenario's FIRST body of the move (its own activation and length); precedingBodies = every unit before it. Recipe of s10aLiveFixtures.py.
usage: s10aEsMementoFixtures.py PROBEDIR   -> tools/integration/fixtures/s10a-live/{extreme-speed,memento}-*.json (+ s10a-live-declines/memento-later-*.json)"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
CASES = [  # (move, id, tag, scenario, attacker side, rows or None = the body's own length)
    ("EXTREME_SPEED", 245, "extreme-speed-player-arcanine-opponent-dugtrio", "mechanic-extreme-speed-player-arcanine-dugtrio", "player", 321),
    ("EXTREME_SPEED", 245, "extreme-speed-opponent-arcanine-player-dugtrio", "mechanic-extreme-speed-arcanine-dugtrio", "opponent", 321),
    ("EXTREME_SPEED", 245, "extreme-speed-alt-player-smeargle-golem", "prep34-extreme-speed-alt-player-smeargle-golem", "player", 321),
    ("EXTREME_SPEED", 245, "extreme-speed-alt-opponent-smeargle-golem", "prep34-extreme-speed-alt-opponent-smeargle-golem", "opponent", 321),
    ("EXTREME_SPEED", 245, "extreme-speed-alt-player-smeargle-golbat", "s10a-extreme-speed-player-smeargle-opponent-golbat", "player", 321),
    ("MEMENTO", 262, "memento-player-weezing-opponent-onix", "mechanic-memento-player-weezing-opponent-onix", "player", None),
    ("MEMENTO", 262, "memento-opponent-weezing-player-onix", "mechanic-memento-opponent-weezing-player-onix", "opponent", None),
    ("MEMENTO", 262, "memento-alt-player-weezing-golem", "prep34-memento-alt-player-weezing-golem", "player", None),
    ("MEMENTO", 262, "memento-alt-opponent-weezing-golem", "prep34-memento-alt-opponent-weezing-golem", "opponent", None),
    ("MEMENTO", 262, "memento-alt-player-weezing-golbat", "s10a-memento-player-weezing-opponent-golbat", "player", None),
    ("MEMENTO", 262, "memento-later-player-weezing-chimecho", "prep34-memento-after-psywave-player-weezing-chimecho", "player", None),
]
ONLY = set(sys.argv[2:])
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
side_of = lambda b: "player" if b["atActivation"]["attacker"] == 0 else "opponent"
out = R / "tools/integration/fixtures/s10a-live"
out.mkdir(exist_ok=True)
for move, mid, tag, scen, side, want in CASES:
    if ONLY and move not in ONLY: continue
    p1, p2 = (json.loads((D / f"{scen}-r{r}.json").read_text()) for r in (1, 2))
    key = lambda p: [(b["move"], b["start"], b["end"], b["atActivation"]["attacker"]) for b in p["bodies"]]
    assert key(p1) == key(p2), (scen, "fresh runs disagree")
    bodies = p1["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == mid)
    body = bodies[idx]
    assert side_of(body) == side, (scen, "side")
    A, E = body["start"], body["end"]
    rows = E - A + 1
    assert want is None or rows == want, (scen, rows)
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    fx = {
        "schema": "d4a-live-adapter-fixture/v1", "move": move,
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": E},
        "windowSource": f"window = [activation, first inactive row] of this scenario's first {move} body ({rows} rows) from 2 fresh prep22Probes.sh runs (bodies agree)",
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
    }
    pre = [{"moveId": b["move"], "side": side_of(b)} for b in bodies[:idx]]
    assert all(b["moveId"] != 0 for b in pre), (scen, "unexpected non-move unit")
    if pre: fx["precedingBodies"] = pre
    # A later-body window is a decline control (the first-body gate), kept apart from the exact fixtures.
    dest = out.parent / "s10a-live-declines" if "-later-" in tag else out
    dest.mkdir(exist_ok=True)
    (dest / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, A, E, rows, fx["attacker"]["species"], "->", fx["target"]["species"], [b["moveId"] for b in pre], m[0]["hp"], m[1]["hp"])
