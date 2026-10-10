#!/usr/bin/env python3
"""st76: live-adapter fixtures for statused Dive (291 setup + attack) and Meteor Mash (309) bodies from fresh direct-mGBA prep22Probe.py
outputs (tools/integration/dive70Probes.sh OUT 2 tools/integration/fixtures/st76/scenarios/*.json). displayedStatus = the ROM's status1
of each battler at the body's activation (gBattleMons, prep22Probe atActivation.mons).
Dive: window = [activation, end] (setup 118 / 115 rows, attack 93); the order lend is the PRODUCTION order host replaying the history
(wordsChain.turns, one list per prompt cycle, the status / held-item animations included); every Dive body's words are PINNED to its RAM
gRng2Value at activation (asserted == rng2Series[A + 1] stepped back once), as dive70.
Meteor Mash: window = [activation, end] (215 rows == the production duration); 96 words from the pinned activation value; no order input (case 309
takes none).
usage: st76Fixtures.py PROBEDIR   -> tools/integration/fixtures/st76/<id>-{setup,attack,body}.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
LCG_INV = pow(1103515245, -1, 2 ** 32)
SCEN = "tools/integration/fixtures/st76/scenarios"
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
name = lambda x: S[x]["name"].replace("SPECIES_", "")
side = lambda a: "player" if a == 0 else "opponent"
# Per Dive scenario: the prompt cycles over the probe's bodies (index -> step); a player diver's locked attack turn has no prompt.
# "B" = the body itself (move, attacker side), "H<side>" a visible hit on <side>, "S<side>" a status1 animation on <side>
# (the bits = that battler's status1 at the next body), "I<side>" HELD_ITEM_EFFECT (Leftovers) on <side>.
DIVE = {
    # 92 opp Toxic, PSN(ply), 291 setup, 291 attack
    "dive-ply-psn-atk": [[(0, "B"), (1, "Splayer"), (2, "B"), (3, "B")]],
    # 261 ply WoW, BRN(opp), 291 setup | 291 attack
    "dive-opp-brn-atk": [[(0, "B"), (1, "Sopponent"), (2, "B")], [(3, "B")]],
    # 92 ply Toxic, PSN(opp), 33 opp Tackle + hit, PSN(opp) end turn | 291 setup, Leftovers(opp), PSN(opp), 291 attack
    "dive-ply-psn-tgt": [[(0, "B"), (1, "Sopponent"), (2, "B"), (2, "Hplayer"), (3, "Sopponent")],
                         [(4, "B"), (5, "Iopponent"), (6, "Sopponent"), (7, "B")]],
    # 291 setup | 291 attack + hit, Leftovers(ply) | 156 ply Rest, 291 setup | SLP(ply), 291 attack
    "dive-opp-slp-tgt": [[(0, "B")], [(1, "B"), (1, "Hplayer"), (2, "Iplayer")], [(3, "B"), (4, "B")], [(5, "Splayer"), (6, "B")]],
}
MM = ["mm-ply-prz-atk", "mm-opp-brn-atk", "mm-ply-psn-tgt", "mm-opp-slp-tgt"]
out = R / "tools/integration/fixtures/st76"
def load(key):
    p1, p2 = (json.loads((D / f"{key}-r{k}.json").read_text()) for k in (1, 2))
    assert p1["bodies"] == p2["bodies"], key
    r2 = dict((f, v) for f, v in p1["rng2Series"])
    for b in p1["bodies"]:
        if b["move"] in (291, 309):
            assert ((r2[b["start"] + 1] - 24691) * LCG_INV) & 0xFFFFFFFF == b["atActivation"]["rng2"], (key, b["start"])
    return p1
def common(key, body, move, window, extra):
    act = body["atActivation"]
    s, foe = side(act["attacker"]), side(1 - act["attacker"])
    m = act["mons"]
    sp = {"player": m[0], "opponent": m[1]}
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": move, "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"{SCEN}/{key}.json",
          "denseWindow": {"startFrame": window[0], "endFrame": window[1]},
          "windowSource": f"st76: the scenario's {move} body (prep22Probe.py, two fresh direct-mGBA runs, identical bodies)",
          "attacker": {"species": name(sp[s]["species"]), "geometry": {"side": s}},
          "target": {"species": name(sp[foe]["species"]), "geometry": {"side": foe}}, "attackerPersonality": sp[s]["personality"],
          "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])}}
    fx.update(extra)
    fx["st76"] = {"status1": [m[0]["status1"], m[1]["status1"]], "bodies": [[b["move"], b["start"], b["end"], b["atActivation"]["attacker"]] for b in load.cache[key]["bodies"]]}
    return fx
load.cache = {}
written = []
for key, cycles in DIVE.items():
    p = load.cache[key] = load(key)
    bodies = p["bodies"]
    dives = [i for i, b in enumerate(bodies) if b["move"] == 291]
    for ai in dives:
        if ai not in (dives[-2], dives[-1]):
            continue
        b = bodies[ai]
        turn_bit = 1 if ai == dives[-1] else 0
        rows = b["end"] - b["start"] + 1
        assert rows == (93 if turn_bit else 118 if b["atActivation"]["attacker"] == 0 else 115), (key, ai, rows)
        turns = []
        for cyc in cycles:
            steps = []
            for i, kind in cyc:
                if i > ai:
                    break
                bb = bodies[i]
                bs = side(bb["atActivation"]["attacker"])
                if kind == "B":
                    if bb["move"] == 291:
                        mm = bb["atActivation"]["mons"]
                        nth = dives.index(i)
                        steps.append(["body", 291, bs, {"player": mm[0]["species"], "opponent": mm[1]["species"]}, nth & 1])
                    else:
                        steps.append(["body", bb["move"], bs])
                    if i == ai:
                        break
                elif kind[0] == "H":
                    steps.append(["hit", kind[1:]])
                elif kind[0] == "S":
                    nxt = bodies[i + 1]["atActivation"]["mons"]
                    steps.append(["status", kind[1:], nxt[0 if kind[1:] == "player" else 1]["status1"]])
                elif kind[0] == "I":
                    steps.append(["general", "HELD_ITEM_EFFECT", kind[1:]])
            if steps:
                turns.append(steps)
            if any(i >= ai for i, _ in cyc):
                break
        # the alternating setup / attack bit per Dive body (the body list starts with a setup)
        assert all(dives.index(i) % 2 == (1 if i == dives[-1] or (dives.index(i) % 2) else 0) for i in dives)
        fx = common(key, b, "DIVE", (b["start"], b["end"]), {
            "requestFields": {"turn": turn_bit},
            # the setup turn prints STRINGID_EMPTYSTRING3 before its attackanimation (BattleScriptFirstChargingTurn), as the accepted setup fixtures
            **({} if turn_bit else {"messageLines": ["", ""]}),
            "wordsChain": {"turns": turns, "words": [{"value": bodies[i]["atActivation"]["rng2"],
                           "source": f"PINNED: prep22Probe.py atActivation.rng2 of the earlier Dive body (activation frame {bodies[i]['start']})"}
                           for i in dives if i < ai]},
            "presentationRngActivation": {"value": b["atActivation"]["rng2"],
                                          "source": f"PINNED: prep22Probe.py atActivation.rng2 of this Dive body (activation frame {b['start']})"}})
        fx["st76"]["romSpriteOrderAtActivation"] = b["atActivation"]["spriteOrder"]
        tag = f"{key}-{'attack' if turn_bit else 'setup'}"
        (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
        written.append(tag)
        print(tag, fx["attacker"]["species"], "->", fx["target"]["species"], fx["displayedStatus"], fx["denseWindow"], json.dumps(turns))
for key in MM:
    p = load.cache[key] = load(key)
    b = next(b for b in p["bodies"] if b["move"] == 309 and any(m["status1"] for m in b["atActivation"]["mons"]))
    assert b["end"] - b["start"] + 1 == 215, (key, b["start"], b["end"])
    fx = common(key, b, "METEOR_MASH", (b["start"], b["end"]), {
        "timingPhase": "no-event",
        "presentationRngActivation": {"value": b["atActivation"]["rng2"],
                                      "source": f"PINNED: prep22Probe.py atActivation.rng2 of the Meteor Mash body (activation frame {b['start']})"}})
    tag = f"{key}-body"
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    written.append(tag)
    print(tag, fx["attacker"]["species"], "->", fx["target"]["species"], fx["displayedStatus"], fx["denseWindow"])
