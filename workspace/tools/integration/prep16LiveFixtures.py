#!/usr/bin/env python3
"""Generate the prep16 live-adapter dense fixtures (Overheat, Silver Wind: both orientations + one alternate species each).
Window = the scenario's own source window as reported by its direct-mGBA probe run (activation + 0, prep14 s2); never chosen by
matching live output. Every scenario is a first body (no preceding body declared).
usage: prep16LiveFixtures.py <probe-output-dir>   (dirs named oh-p oh-o oh-a sw-p sw-o sw-a each holding out.json)
       -> tools/integration/fixtures/prep16-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
SCEN = {
  "oh-p": ("OVERHEAT", "overheatProbe", "mechanic-overheat-player-solrock-opponent-shuckle", "player", "overheat-player-solrock-opponent-shuckle"),
  "oh-o": ("OVERHEAT", "overheatProbe", "mechanic-overheat-opponent-magcargo-player-shuckle", "opponent", "overheat-opponent-magcargo-player-shuckle"),
  "oh-a": ("OVERHEAT", "overheatProbe", "prep14-overheat-alt-charizard-golem", "player", "overheat-alt-player-charizard-golem"),
  "sw-p": ("SILVER_WIND", "silverWindProbe", "mechanic-silver-wind-player-butterfree-opponent-onix", "player", "silver-wind-player-butterfree-opponent-onix"),
  "sw-o": ("SILVER_WIND", "silverWindProbe", "prep16-swopp-first-onix", "opponent", "silver-wind-opponent-butterfree-player-onix-first-body"),
  "sw-a": ("SILVER_WIND", "silverWindProbe", "prep14-silver-wind-alt-beautifly-golem", "player", "silver-wind-alt-player-beautifly-golem"),
}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/prep16-live"; out.mkdir(exist_ok=True)
src = Path(sys.argv[1])
for key, (move, probe, scen, side, tag) in SCEN.items():
    d = json.loads((src / key / "out.json").read_text()); w = d["sourceWindow"]; m = [d["frames"][0]["parties"]["player"][0], d["frames"][0]["parties"]["opponent"][0]]
    foe = "opponent" if side == "player" else "player"; sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {"schema": "prep16-live-adapter-fixture/v1", "move": move, "probe": f"tools/compare/{probe}.py", "scenario": f"tools/battle-lab/{scen}.json",
          "bodyIndex": 0, "denseWindow": {"startFrame": w["startFrame"], "endFrame": w["endFrame"]},
          "windowSource": "prep16: window = the scenario's own source window from its direct-mGBA probe run (activation + 0); first body (no preceding unit)",
          "attacker": {"species": name(sp[side]), "geometry": {"side": side}}, "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
          "attackerPersonality": sp[side]["personality"], "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
          "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHp"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHp"],
                           "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])}}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n"); print(tag, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"])
