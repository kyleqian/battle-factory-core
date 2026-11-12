#!/usr/bin/env python3
"""Order-consumer alternate-carrier stage (docs/order-consumer-prep.md §5): Ember / Flamethrower with an ordinary-rental
carrier species (a different real Factory rental set swapped into the accepted BattleLab scenario; only set 119 HOUNDOUR is assignable to
both sides of the challenge-0 rank-0 ranges, so it carries both moves; the BattleLab mechanic override supplies the move). The window start is
DERIVED from source, never from live output: that scenario's move-script activation frame (issue142ActivationProbe-style
interval probe, Scene ON direct mGBA) + the accepted fixture's own (window start - accepted-scenario activation) offset,
the altSpecies8.py convention; ageOffset is the accepted fixture's. HP/gender come from the source probe rows' battler RAM.
usage: orderConsumerAlt.py   # writes tools/integration/fixtures/altspecies9-<case>.json (live fixtures) + altspecies9-derivation.json
"""
import os
import json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
VENV = Path(os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")
RAW = ROOT / ".integration/validation/altspecies9"; RAW.mkdir(parents=True, exist_ok=True)
SCN = ROOT / "tools/integration/fixtures/altspecies9-scenarios"; SCN.mkdir(exist_ok=True)
SPECIES = {r["id"]: r for r in json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]}
# (case, accepted order-consumer fixture, attacker side, rental set id, move id)
CASES = [
  ("ember-player-houndour-opponent-murkrow", "ember-player", "player", 119, 52),
  ("ember-opponent-houndour-player-murkrow", "ember-opponent", "opponent", 119, 52),
  ("flamethrower-player-houndour-opponent-murkrow", "flamethrower-player", "player", 119, 53),
  ("flamethrower-opponent-houndour-player-murkrow", "flamethrower-opponent", "opponent", 119, 53),
]
def run(args, out):
    for _ in range(3):
        if out.exists(): out.unlink()
        r = subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", str(VENV), *map(str, args)],
                           cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0: return json.loads(out.read_text())
    raise RuntimeError(r.stderr[-800:] or r.stdout[-800:])
def act(scen, tag):
    return run([ROOT / "tools/integration/altSpecies3Activation.py", scen, RAW / f"{tag}.json"], RAW / f"{tag}.json")["intervals"]
deriv = []
for name, base_name, side, set_id, mid in CASES:
    base_path = ROOT / f"tools/integration/fixtures/order-consumer-{base_name}.json"
    base = json.loads(base_path.read_text())
    scen = json.loads((ROOT / base["scenario"]).read_text())
    key = "playerSetIds" if side == "player" else "opponentSetIds"
    scen[key][0] = set_id
    scen["trace"]["segments"][-1]["frames"] += 200; scen["trace"]["captureFrames"][-1] += 200  # the alt activation is later
    path = SCN / f"{name}.json"; path.write_text(json.dumps(scen, indent=1) + "\n")
    w = base["denseWindow"]
    ia = [i for i in act(ROOT / base["scenario"], "base-" + name) if i["move"] == mid]
    ib = [i for i in act(path, "alt-" + name) if i["move"] == mid]
    k = max([j for j, i in enumerate(ia) if i["start"] <= w["startFrame"] + 8], default=0)
    off = w["startFrame"] - ia[k]["start"]
    start = ib[k]["start"] + off
    probe = run([ROOT / "tools/probe/run-battle-lab-rgb.py", path, RAW / f"probe-{name}.json", RAW / f"rgb-{name}"], RAW / f"probe-{name}.json")
    row = next(r for r in probe["frames"] if r["frame"] == start)
    def prof(s, pfx):
        b = row[s]; ratio = SPECIES[b["species"]]["genderRatio"]
        pers = row["playerPersonality" if s == "player" else "opponentPersonality"]
        g = "none" if ratio == 255 else ("female" if ratio == 254 or (ratio != 0 and (pers & 0xFF) < ratio) else "male")
        return {f"{pfx}Hp": b["hp"], f"{pfx}MaxHp": b["maxHp"], f"{pfx}Gender": g}
    fp = {**prof("player", "player"), **prof("opponent", "opponent"), "playerStatus": "none"}
    attacker_species = SPECIES[row[side]["species"]]["name"].replace("SPECIES_", "")
    target_species = SPECIES[row["opponent" if side == "player" else "player"]["species"]]["name"].replace("SPECIES_", "")
    fx = {k2: v for k2, v in base.items() if k2 != "draft"}
    fx.update({"scenario": str(path.relative_to(ROOT)), "attacker": {"species": attacker_species, "geometry": {"side": side}},
               "target": {"species": target_species, "geometry": {"side": "opponent" if side == "player" else "player"}},
               "fieldProfile": fp, "orientation": f"{side} {attacker_species} -> {target_species} (rental set {set_id})",
               "denseWindow": {"startFrame": start, "endFrame": start + w["endFrame"] - w["startFrame"], "ageOffset": w.get("ageOffset", 0)},
               "altCarrier": {"baseFixture": str(base_path.relative_to(ROOT)), "rentalSet": set_id,
                              "acceptedActivation": ia[k]["start"], "altActivation": ib[k]["start"], "offset": off}})
    (ROOT / f"tools/integration/fixtures/altspecies9-{name}.json").write_text(json.dumps(fx, indent=1) + "\n")
    deriv.append({"case": name, "acceptedStart": w["startFrame"], "acceptedActivation": ia[k]["start"], "altActivation": ib[k]["start"],
                  "offset": off, "derivedStart": start, "attacker": attacker_species, "fieldProfile": fp})
    print(json.dumps(deriv[-1]))
(ROOT / "tools/integration/fixtures/altspecies9-derivation.json").write_text(json.dumps(deriv, indent=1) + "\n")
