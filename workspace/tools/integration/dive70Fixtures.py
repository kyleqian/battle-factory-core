#!/usr/bin/env python3
"""dive70: Dive (291) ATTACK-body live fixtures from fresh direct-mGBA prep22Probe.py outputs (tools/integration/dive70Probes.sh OUT 1 <scenarios>).
Window = [activation, activation + 92] of the scenario's Dive ATTACK body (the second 291 body: 93 rows, activation .. first inactive age 92).
Words are PINNED through the fixture hook (liveAdapterFramebuffer.ts wordsChain): the setup body's and the attack body's RAM gRng2Value at
their activation frames (prep22Probe atActivation.rng2 == rng2Series[A + 1] stepped back once, asserted) seed pinned hosts whose words
follow the production law under the production body keys. The order lend is NOT pinned: the PRODUCTION order host replays the history
(`turns`, one list per prompt cycle; a player diver's locked attack turn shows no action prompt, so its setup and attack share one cycle) and
lends the setup's word-free deferred marker; the render seam resolves it. ROM sSpriteOrder at the attack activation is kept for the check.
usage: dive70Fixtures.py PROBEDIR [tag=scenario.json[@i,j] ...]   -> tools/integration/fixtures/dive70/<tag>.json
@i,j: the probe body indices that open a new prompt cycle (default: an opponent diver's attack; a player diver none). The attack is the
LAST 291 body (a protected attack plays no body: the next 291 body is a new setup)."""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
LCG_INV = pow(1103515245, -1, 2 ** 32)
DAMAGING = {33, 57, 250}  # Tackle / Surf / Whirlpool: a visible-or-hidden hit animation on the target follows the body
STATUS = {182}  # Protect: no hit
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x]["name"].replace("SPECIES_", "")
out = R / "tools/integration/fixtures/dive70"
out.mkdir(parents=True, exist_ok=True)
for arg in sys.argv[2:]:
    tag, scen = arg.split("=", 1)
    splits = None
    if "@" in scen:
        scen, at = scen.split("@", 1)
        splits = [int(x) for x in at.split(",")]
    key = Path(scen).stem
    p = json.loads((D / f"{key}-r1.json").read_text())
    bodies = p["bodies"]
    dives = [i for i, b in enumerate(bodies) if b["move"] == 291]
    assert len(dives) >= 2, (tag, dives)
    ai = dives[-1]
    si = max(i for i in dives if i < ai)
    setup, attack = bodies[si], bodies[ai]
    A, E = attack["start"], attack["end"]
    assert E - A + 1 == 93, (tag, A, E)
    act = attack["atActivation"]
    side = "player" if act["attacker"] == 0 else "opponent"
    foe = "opponent" if side == "player" else "player"
    m = act["mons"]
    sp = {"player": m[0], "opponent": m[1]}
    r2 = dict((f, v) for f, v in p["rng2Series"])
    for b in [bodies[i] for i in dives if i <= ai]:
        assert ((r2[b["start"] + 1] - 24691) * LCG_INV) & 0xFFFFFFFF == b["atActivation"]["rng2"], (tag, b["start"])
    species = {"player": m[0]["species"], "opponent": m[1]["species"]}
    # order-relevant history: every body before the attack (+ the hit after a damaging one), then the attack; an opponent diver's attack
    # turn opens with the player's action prompt, a player diver's does not
    if splits is None:
        splits = [ai] if side == "opponent" else []
    turns, cur = [], []
    for i, b in enumerate(bodies[:ai + 1]):
        if i in splits:
            turns.append(cur); cur = []
        bs = "player" if b["atActivation"]["attacker"] == 0 else "opponent"
        if b["move"] == 291:
            cur.append(["body", 291, bs, species, 1 if i == ai else 0])
        elif b["move"] in STATUS:
            cur.append(["body", b["move"], bs])
        else:
            assert b["move"] in DAMAGING, (tag, b["move"])
            cur.append(["body", b["move"], bs])
            cur.append(["hit", "opponent" if bs == "player" else "player"])
    turns.append(cur)
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "DIVE", "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": scen,
          "denseWindow": {"startFrame": A, "endFrame": A + 92},
          "windowSource": "dive70: window = [activation, activation + 92] of the scenario's Dive ATTACK body (prep22Probe.py, fresh direct mGBA)",
          "attacker": {"species": name(sp[side]["species"]), "geometry": {"side": side}},
          "target": {"species": name(sp[foe]["species"]), "geometry": {"side": foe}}, "attackerPersonality": sp[side]["personality"],
          "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
          "requestFields": {"turn": 1},
          "wordsChain": {"turns": turns, "words": [{"value": bodies[i]["atActivation"]["rng2"],
                         "source": f"PINNED: prep22Probe.py atActivation.rng2 of the Dive setup body (activation frame {bodies[i]['start']})"}
                         for i in dives if i < ai]},
          "presentationRngActivation": {"value": act["rng2"],
                                        "source": f"PINNED: prep22Probe.py atActivation.rng2 of the Dive attack body (activation frame {A}) == rng2Series[{A + 1}] stepped back once"},
          "dive70": {"romSpriteOrderAtActivation": act["spriteOrder"], "setupWindow": [setup["start"], setup["end"]],
                     "bodies": [[b["move"], b["start"], b["end"], b["atActivation"]["attacker"]] for b in bodies]}}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, side, fx["attacker"]["species"], "->", fx["target"]["species"], fx["denseWindow"], json.dumps(turns))
