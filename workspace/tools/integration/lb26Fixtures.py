#!/usr/bin/env python3
"""lb26 later-body dense fixtures (later-bodies shape) for CURSE 174 (non-Ghost stats body), WILL_O_WISP 261, PURSUIT 228 (normal body).
Window = the scenario's own bodyWindows[0] from its direct-mGBA bodies probe (lb26Probe.sh), never matched to live output.
precedingBodies = every body/unit before the move in the scenario (bgHistoryProbe.py list, attacker side); STATS_CHANGE units (move 0) as statAnimation.
usage: lb26Fixtures.py <probe dir (e.g. /tmp/lb26/a)> <bgHistoryProbe dir (e.g. /tmp/lb26/h)> -> tools/integration/fixtures/later-bodies-lb26/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
P, O = "player", "opponent"
A, H = Path(sys.argv[1]), Path(sys.argv[2])
MV = {"curse": ("CURSE", 174, "curse-live-adapter-fixture/v1", {"turn": 1, "power": 0}),
      "wisp": ("WILL_O_WISP", 261, "oam1-live-adapter-fixture/v1", {"turn": 0}),
      "pursuit": ("PURSUIT", 228, "oam1-live-adapter-fixture/v1", {"turn": 0, "power": 40})}
PROBE = {"curse": "curseBodiesProbe", "wisp": "willOWispBodiesProbe", "pursuit": "pursuitBodiesProbe"}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
def stat(args, move):  # [minus?, stat]; Swords Dance / Overheat = +-2 class (plan class only matters)
    minus, idx = args; big = move in (315, 14)
    return (45 if minus else 39) + idx if big else (21 if minus else 15) + idx
out = R / "tools/integration/fixtures/later-bodies-lb26"; out.mkdir(exist_ok=True)
for pdir in sorted(A.glob("*")):
    tag = pdir.name; mv, s, pred = tag.split("-"); name, mid, schema, rf = MV[mv]
    d = json.loads((pdir / "out.json").read_text()); w = d["bodyWindows"][0]
    h = json.loads((H / f"{tag}.json").read_text())["bodies"]
    bi = next(i for i, b in enumerate(h) if b["move"] == mid)
    pre = []; prev = None
    for b in h[:bi]:
        side = P if b["attacker"] == 0 else O
        pre.append({"moveId": 0, "side": side, "statAnimation": stat(b["args0"][:2], prev)} if b["move"] == 0 else {"moveId": b["move"], "side": side})
        prev = b["move"]
    side = P if h[bi]["attacker"] == 0 else O; foe = O if side == P else P
    assert side == (P if s == "p" else O), tag
    frame = next(f for f in d["frames"] if f["frame"] == w["startFrame"])
    m = [frame["parties"]["player"][0], frame["parties"]["opponent"][0]]; sp = {P: m[0], O: m[1]}
    nm = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {"schema": schema, "move": name, "probe": f"tools/compare/{PROBE[mv]}.py", "scenario": f"tools/battle-lab/lb26-{tag}.json",
          "denseWindow": {"startFrame": w["startFrame"], "endFrame": w["endFrame"]},
          "windowSource": "lb26: window = the scenario's own bodyWindows[0] from its direct-mGBA repeated-body probe (activation + 0 .. first inactive)",
          "attacker": {"species": nm(sp[side]), "geometry": {"side": side}}, "target": {"species": nm(sp[foe]), "geometry": {"side": foe}},
          "attackerPersonality": sp[side]["personality"], "displayedStatus": {P: status(m[0]["status1"]), O: status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHp"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHp"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
          "requestFields": rf, "precedingBodies": pre}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n"); print(tag, fx["denseWindow"], [(u["moveId"], u["side"][0]) for u in pre])
