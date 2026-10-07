#!/usr/bin/env python3
"""Later-body dense fixtures for MOVE_SILVER_WIND (318) and MOVE_PSYCH_UP (244, player) after distinct predecessors.
Window = the scenario's own body window from its direct-mGBA repeated-body probe (tools/compare/<move>BodiesProbe.py, bodyWindows[i]:
activation + 0 .. first inactive cleanup), never matched to live output. precedingBodies = every move body before it in the scenario
(tools/integration/fixtures/bg-register-history/bodies-table.json order, attacker side), so the verifier replays the production lends.
usage: laterBodiesBgFixtures.py <probe-output-dir>   (one dir per scenario, named by the tag without its -sw / -sw-splash suffix, holding out.json)
       -> tools/integration/fixtures/later-bodies-bg/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
P, O = "player", "opponent"
# tag: (move, probe, scenario, attacker side, bodyIndex in the probe's bodyWindows, preceding units [(moveId, side[, STATS_CHANGE arg])]).
# Not relied on (the replayed production order lend is unknown after a Hyper Beam -> production declines): *-after-hyperbeam.
SCEN = {
  "sw-o-tackle": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-opp-after-tackle", O, 0, [(33, P)]),
  "sw-o-splash": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-opp-after-splash", O, 0, [(150, P)]),
  "sw-o-psychic": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-opp-after-psychic", O, 0, [(94, P)]),
  "sw-o-tackle-sw": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-opp-after-tackle", O, 1, [(33, P), (318, O)]),
  "sw-o-splash-sw-splash": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-opp-after-splash", O, 1, [(150, P), (318, O), (150, P)]),
  "sw-p-tackle": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-player-after-tackle", P, 1, [(318, P), (33, O)]),
  "sw-p-splash": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-player-after-splash", P, 1, [(318, P), (150, O), (150, O)]),
  # Psychic's SpDef -1 on the player: STATS_CHANGE argument STAT_ANIM_MINUS1 (21) + STAT_SPDEF (5) = 26 (moveId 0 unit).
  "sw-p-psychic": ("SILVER_WIND", "silverWindBodiesProbe", "prep16-hist-silverwind-player-after-psychic", P, 1, [(318, P), (94, O), (0, P, 26)]),
  "pu-p-tackle": ("PSYCH_UP", "psychUpBodiesProbe", "prep16-hist-psychup-player-after-tackle", P, 0, [(33, O)]),
  "pu-p-splash": ("PSYCH_UP", "psychUpBodiesProbe", "prep16-hist-psychup-player-after-splash", P, 0, [(150, O)]),
  "pu-p-psychic": ("PSYCH_UP", "psychUpBodiesProbe", "prep16-hist-psychup-player-after-psychic", P, 0, [(94, O)]),
}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/later-bodies-bg"; out.mkdir(exist_ok=True)
src = Path(sys.argv[1])
for tag, (move, probe, scen, side, index, preceding) in SCEN.items():
    d = json.loads((src / tag.split("-sw")[0] / "out.json").read_text()); w = d["bodyWindows"][index]
    frame = next(f for f in d["frames"] if f["frame"] == w["startFrame"])
    m = [frame["parties"]["player"][0], frame["parties"]["opponent"][0]]
    foe = O if side == P else P; sp = {P: m[0], O: m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {"schema": "later-bodies-bg-fixture/v1", "move": move, "probe": f"tools/compare/{probe}.py", "scenario": f"tools/battle-lab/{scen}.json",
          "bodyIndex": index, "denseWindow": {"startFrame": w["startFrame"], "endFrame": w["endFrame"]},
          "windowSource": "later-bodies-bg: window = the scenario's own bodyWindows[bodyIndex] from its direct-mGBA repeated-body probe (activation + 0 .. first inactive)",
          "precedingBodies": [{"moveId": u[0], "side": u[1], **({"statAnimation": u[2]} if len(u) > 2 else {})} for u in preceding],
          "attacker": {"species": name(sp[side]), "geometry": {"side": side}}, "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
          "attackerPersonality": sp[side]["personality"], "displayedStatus": {P: status(m[0]["status1"]), O: status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHp"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHp"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])}}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n"); print(tag, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"], fx["fieldProfile"])
