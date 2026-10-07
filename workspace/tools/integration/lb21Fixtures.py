#!/usr/bin/env python3
"""lb21 later-body dense fixtures (later-bodies-bg shape) for OVERHEAT 315 (both sides) and PSYCH UP 244 (opponent attacker).
Window = the scenario's own bodyWindows[k] from its direct-mGBA bodies probe (tools/compare/{overheat,psychUp}BodiesProbe.py via lb21Probe.sh),
never matched to live output. precedingBodies = every body before it in the scenario (bgHistoryProbe.py body list, attacker side),
STATS_CHANGE units (move 0) as statAnimation (class only matters: plan key 0:any; -1 = 21+idx, -2 = 45+idx, +2 = 39+idx, +1 15+idx).
usage: lb21Fixtures.py <probe dir (lb21Probe.sh output, e.g. /tmp/lb21/a)> <bgHistoryProbe dir (e.g. /tmp/lb21/h)>
       -> tools/integration/fixtures/later-bodies-bg-2/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
P, O = "player", "opponent"
A, H = Path(sys.argv[1]), Path(sys.argv[2])
# fixture tag -> (probe tag, target move body index within bodyWindows)
PICK = {"pu-o-first-b0": ("pu-o-first", 0), "pu-o-tackle-b1-ownpsychup": ("pu-o-tackle", 1)}
for p in ("tackle", "splash", "psychic", "growl", "swordsdance"):
    for s in "po": PICK[f"oh2-{s}-{p}-b0"] = (f"oh2-{s}-{p}", 0)
    PICK[f"pu-o-{p}-b0"] = (f"pu-o-{p}", 0)
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
def stat(args, move):  # args0[:2] of the STATS_CHANGE script: [minus?, stat]; Overheat/Swords Dance = +-2 class
    minus, idx = args
    big = move == 315 or move == 14   # class 2 (+-2): the unit that follows an Overheat / Swords Dance
    return (45 if minus else 39) + idx if big else (21 if minus else 15) + idx
out = R / "tools/integration/fixtures/later-bodies-bg-2"; out.mkdir(exist_ok=True)
for tag, (pt, k) in PICK.items():
    move = "OVERHEAT" if tag.startswith("oh2") else "PSYCH_UP"; mid = 315 if move == "OVERHEAT" else 244
    d = json.loads((A / pt / "out.json").read_text())
    if k >= len(d["bodyWindows"]): print("SKIP (probe found no body window)", tag); continue
    w = d["bodyWindows"][k]
    scen = f"lb21-{pt}"; h = json.loads((H / f"{scen}.json").read_text())["bodies"]
    n = k  # k-th body of the target move
    idxs = [i for i, b in enumerate(h) if b["move"] == mid]; bi = idxs[k]
    pre = []; prev = None
    for b in h[:bi]:
        side = P if b["attacker"] == 0 else O
        if b["move"] == 0: pre.append({"moveId": 0, "side": side, "statAnimation": stat(b["args0"][:2], prev)})
        else: pre.append({"moveId": b["move"], "side": side})
        prev = b["move"]
    side = P if h[bi]["attacker"] == 0 else O; foe = O if side == P else P
    frame = next(f for f in d["frames"] if f["frame"] == w["startFrame"])
    m = [frame["parties"]["player"][0], frame["parties"]["opponent"][0]]; sp = {P: m[0], O: m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    probe = "overheatBodiesProbe" if move == "OVERHEAT" else "psychUpBodiesProbe"
    fx = {"schema": "later-bodies-bg-fixture/v1", "move": move, "probe": f"tools/compare/{probe}.py", "scenario": f"tools/battle-lab/{scen}.json",
          "bodyIndex": k, "denseWindow": {"startFrame": w["startFrame"], "endFrame": w["endFrame"]},
          "windowSource": "lb21: window = the scenario's own bodyWindows[bodyIndex] from its direct-mGBA repeated-body probe (activation + 0 .. first inactive)",
          "precedingBodies": pre,
          "attacker": {"species": name(sp[side]), "geometry": {"side": side}}, "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
          "attackerPersonality": sp[side]["personality"], "displayedStatus": {P: status(m[0]["status1"]), O: status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHp"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHp"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])}}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n"); print(tag, fx["denseWindow"], [(u["moveId"], u["side"][0]) for u in pre][-4:])
