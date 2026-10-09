#!/usr/bin/env python3
"""geoice stage (docs/icy-wind-blizzard-geometry.md): Icy Wind (196) / Blizzard (59) at species pairs whose geometry the retained
OAM-slot table did NOT cover (tools/integration/geoiceScan.ts at 5e0b86a42). Each case = the accepted prep2 BattleLab scenario of
that attacker side with BOTH lead species replaced (attacker lead, target lead); the target lead gets speed IV 0 + a -Spe nature
(Quiet) and the attacker a +Spe nature (Timid) so the ice body is the scenario's FIRST body (known-entry sprite order; the accepted
scenarios run the target's Tackle first -> a second, different pre-move order history). The window start is DERIVED from source,
never from live output: that scenario's move-script activation (altSpecies3Activation.py, Scene ON direct mGBA) + the accepted
fixture's (window start - accepted activation) offset; HP = the full stat (the ice body precedes any damage), gender from the
override (every species here has a male option). usage: geoiceStage.py [--controls] -> tools/integration/fixtures/geoice[/controls]/<case>.json
+ derivation.json
"""
import json, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
VENV = Path("/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")
RAW = ROOT / ".integration/validation/geoice-stage"; RAW.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "tools/integration/fixtures/geoice"; (OUT / "scenarios").mkdir(parents=True, exist_ok=True)
SPECIES = {r["name"].replace("SPECIES_", ""): r for r in json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]}
BASE = {(196, "player"): "prep2-icy-wind-player", (196, "opponent"): "prep2-icy-wind-opponent",
        (59, "player"): "prep2-blizzard-player", (59, "opponent"): "prep2-blizzard-opponent"}
# (move, attacker side, attacker species, target species): geoiceScan.ts declined geometries at 5e0b86a42, spread over the attacker /
# target picture y (elevated / low / high); Blizzard opponent only where the model's impact start is the live window's (197).
# Blizzard opponent: only 6 declined geometries keep the live window's impact start; ZUBAT -> CHARIZARD / PIDGEY -> DODRIO cannot
# move first here and PIDGEY -> ONIX's Blizzard misses (no body; the BattleLab seed field did not change it) -> 3 cases.
# Optional 5th element = BattleLab seed.
CASES = [
  (196, "player", "ONIX", "GOLBAT"), (196, "player", "FEAROW", "CHARIZARD"), (196, "player", "VENUSAUR", "LUVDISC"),
  (196, "player", "BULBASAUR", "METAPOD"),
  (196, "opponent", "MASQUERAIN", "ONIX"), (196, "opponent", "FEAROW", "WEEDLE"), (196, "opponent", "ZUBAT", "BUTTERFREE"),
  (196, "opponent", "KADABRA", "BULBASAUR"),
  (59, "player", "ONIX", "MASQUERAIN"), (59, "player", "CHARIZARD", "GOLBAT"), (59, "player", "WARTORTLE", "HOPPIP"),
  (59, "player", "BULBASAUR", "HOPPIP"),
  (59, "opponent", "BLASTOISE", "BLASTOISE"), (59, "opponent", "BLASTOISE", "IVYSAUR"),
  (59, "opponent", "ZUBAT", "NIDOKING"),
]
# CONTROLS: geometries the retained table ALREADY covered at 5e0b86a42 (live before this step), incl. Blizzard opponent pairs whose
# model impact start is 196 / 198 (window 359 / 361 rows vs the live 361-row window's 197) -> tools/integration/fixtures/geoice/controls/.
CONTROLS = [
  (196, "player", "ONIX", "MASQUERAIN"), (196, "player", "RATTATA", "CHARIZARD"),
  (196, "opponent", "ZUBAT", "ONIX"), (196, "opponent", "LUVDISC", "BULBASAUR"),
  (59, "player", "CHARIZARD", "WARTORTLE"), (59, "player", "BULBASAUR", "METAPOD"),
  (59, "opponent", "WEEZING", "BLASTOISE"), (59, "opponent", "ARBOK", "CATERPIE"),
]
MOVE_NAME = {196: "icy-wind", 59: "blizzard"}
def run(args, out):
    for _ in range(3):
        if out.exists(): out.unlink()
        r = subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", str(VENV), *map(str, args)],
                           cwd=ROOT, capture_output=True, text=True)
        if out.exists():
            try: return json.loads(out.read_text())
            except json.JSONDecodeError: pass
    raise RuntimeError(r.stderr[-800:] or r.stdout[-800:])
def act(scen, tag):
    return run([ROOT / "tools/integration/altSpecies3Activation.py", scen, RAW / f"{tag}.json"], RAW / f"{tag}.json")["intervals"]
def max_hp(species, mon):
    return (2 * SPECIES[species]["baseHp"] + mon["ivs"]["hp"] + mon["evs"]["hp"] // 4) * 50 // 100 + 60
def case_id(c): return f"{MOVE_NAME[c[0]]}-{c[1]}-{c[2].lower()}-{c[3].lower()}"
def stage(c, out=OUT):
    move, side, att, tgt = c[:4]; name = case_id(c); target_side = "opponent" if side == "player" else "player"
    base_path = ROOT / f"tools/integration/fixtures/{BASE[(move, side)]}.json"; base = json.loads(base_path.read_text())
    scen = json.loads((ROOT / base["scenario"]).read_text())
    a, t = scen["overrides"]["parties"][side][0], scen["overrides"]["parties"][target_side][0]
    a["species"], t["species"] = SPECIES[att]["id"], SPECIES[tgt]["id"]
    a["nature"], t["nature"] = 10, 17  # Timid (+Spe), Quiet (-Spe): the ice body moves first
    t["ivs"]["speed"] = 0
    a["gender"] = t["gender"] = "male"
    if len(c) > 4: scen["seed"] = c[4]
    (out / "scenarios").mkdir(parents=True, exist_ok=True)
    path = out / "scenarios" / f"{name}.json"; path.write_text(json.dumps(scen, indent=1) + "\n")
    w = base["denseWindow"]
    ia = [i for i in act(ROOT / base["scenario"], "base-" + name) if i["move"] == move]
    ib = [i for i in act(path, "alt-" + name) if i["move"] == move]
    off = w["startFrame"] - ia[0]["start"]; start = ib[0]["start"] + off
    hp = {side: max_hp(att, a), target_side: max_hp(tgt, t)}
    fp = {"playerHp": hp["player"], "playerMaxHp": hp["player"], "opponentHp": hp["opponent"], "opponentMaxHp": hp["opponent"],
          "playerGender": "male", "opponentGender": "male"}
    fx = {k: v for k, v in base.items() if k not in ("draft", "schema")}
    fx.update({"schema": "geoice-live-fixture/v1", "scenario": str(path.relative_to(ROOT)),
               "attacker": {"species": att, "geometry": {"side": side}}, "target": {"species": tgt, "geometry": {"side": target_side}},
               "fieldProfile": fp, "orientation": f"{side} {att} -> {tgt}",
               "denseWindow": {"startFrame": start, "endFrame": start + w["endFrame"] - w["startFrame"], "ageOffset": w.get("ageOffset", 0)},
               "geoice": {"baseFixture": str(base_path.relative_to(ROOT)), "acceptedActivation": ia[0]["start"],
                          "altActivation": ib[0]["start"], "altInterval": ib[0], "offset": off}})
    (out / f"{name}.json").write_text(json.dumps(fx, indent=1) + "\n")
    return {"case": name, "move": move, "side": side, "attacker": att, "target": tgt, "acceptedStart": w["startFrame"],
            "acceptedActivation": ia[0]["start"], "altActivation": ib[0]["start"], "altInterval": ib[0], "derivedStart": start,
            "fieldProfile": fp}
if __name__ == "__main__":
    import sys
    controls = "--controls" in sys.argv; out = OUT / "controls" if controls else OUT
    with ThreadPoolExecutor(8) as pool: deriv = list(pool.map(lambda c: stage(c, out), CONTROLS if controls else CASES))
    for d in deriv: print(json.dumps(d))
    (out / "derivation.json").write_text(json.dumps(deriv, indent=1) + "\n")
