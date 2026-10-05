#!/usr/bin/env python3
"""prep7 alternate-species stage: Ice Punch (GENGAR rental carrier; no accepted species ever carries it) and Aerial Ace (CHARIZARD
carrier). Window start is DERIVED from source, never from live output (altSpecies9.py recipe): alt activation
(tools/integration/altSpecies3Activation.py on the staged alt scenario, Scene ON direct mGBA) + the base fixture's own
(window start - base-scenario activation) offset. Both bases' live windows start AT the activation (offset 0). Ice Punch's base is the
first-body Dragonair lab scenario (prep7-scenarios; accepted-species staged windows use a different harness); its Dragonair
control is staged too.
usage: altSpecies10.py [case...]   # derive + write fixtures (tools/compare/fixtures/altspecies3-<case>.json and live twin)
"""
import json, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import altSpecies3Stage as st
ROOT = st.ROOT
VENV = Path("/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")
RAW = ROOT / ".integration/validation/altspecies10"; RAW.mkdir(parents=True, exist_ok=True)
FX = "tools/integration/fixtures"
# (move id, live duration) of the first-body Dragonair lab bases (the ice-punch lab scenarios with the attacker's moves replaced; the
# attacker is the faster side, so the move is the battle's first body). The window = source activation .. + duration - 1 (live age 0 =
# activation), the activation measured by altSpecies3Activation.py on the base scenario itself.
LABMOVES = {"ice-punch": (8, 184), "aerial-ace": (332, 50)}
VENV = Path("/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python")
def act(scen, tag):
    out = RAW / f"{tag}.json"
    for attempt in range(3):  # the probe wrapper occasionally exits 2 on a teardown race; the JSON is validated below
        r = subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", str(VENV),
            str(ROOT / "tools/integration/altSpecies3Activation.py"), str(scen), str(out)], cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0: break
    else: raise RuntimeError(r.stderr[-800:] or r.stdout[-800:])
    return json.loads(out.read_text())["intervals"]
def make_lab_bases():
    for name, (mid, dur) in LABMOVES.items():
        for side in ("player", "opponent"):
            scen = json.loads((ROOT / f"{FX}/prep7-scenarios/mechanic-ice-punch-{side}-dragonair-onix.json").read_text())
            scen["overrides"]["parties"][side][0]["moves"] = [mid] * 4
            total = sum(s["frames"] for s in scen["trace"]["segments"])
            scen["trace"]["captureFrames"] = [0, total]
            p = ROOT / FX / "altspecies3-scenarios" / f"_prep7-{name}-{side}-base.json"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(scen, indent=1) + "\n")
            ia = [i for i in act(p, f"labbase-{name}-{side}") if i["move"] == mid]
            a = ia[0]["start"]
            base = json.loads((ROOT / f"{FX}/prep7-ice-punch-{side}.json").read_text())
            base = {k: base[k] for k in ("fieldProfile",)}
            base.update({"schema": "prep7-adapter-draft/v1", "move": name.upper().replace("-", "_"), "probe": "tools/probe/run-battle-lab-rgb.py",
                         "scenario": str(p.relative_to(ROOT)), "denseWindow": {"startFrame": a, "endFrame": a + dur - 1, "ageOffset": 0},
                         "attacker": {"species": "DRAGONAIR", "geometry": {"side": side}},
                         "target": {"species": "ONIX", "geometry": {"side": "opponent" if side == "player" else "player"}}})
            (ROOT / FX / f"prep7-{name}-lab-{side}.json").write_text(json.dumps(base, indent=1) + "\n")
make_lab_bases()
CASES = [
  {"name": "ice-punch-player-gengar-opponent-onix", "baseSource": f"{FX}/prep7-ice-punch-lab-player.json",
   "swap": {"player": "GENGAR"}, "move": "ICE_PUNCH", "moveId": 8, "extraFrames": 0},
  {"name": "ice-punch-opponent-gengar-player-onix", "baseSource": f"{FX}/prep7-ice-punch-lab-opponent.json",
   "swap": {"opponent": "GENGAR"}, "move": "ICE_PUNCH", "moveId": 8, "extraFrames": 0},
  # Control: the first-body lab context with its own Dragonair carrier (no species swap).
  {"name": "ice-punch-player-dragonair-opponent-onix", "baseSource": f"{FX}/prep7-ice-punch-lab-player.json",
   "swap": {}, "move": "ICE_PUNCH", "moveId": 8, "extraFrames": 0},
  {"name": "ice-punch-opponent-dragonair-player-onix", "baseSource": f"{FX}/prep7-ice-punch-lab-opponent.json",
   "swap": {}, "move": "ICE_PUNCH", "moveId": 8, "extraFrames": 0},
  {"name": "aerial-ace-player-dragonair-opponent-onix", "baseSource": f"{FX}/prep7-aerial-ace-lab-player.json",
   "swap": {}, "move": "AERIAL_ACE", "moveId": 332, "extraFrames": 0},
  {"name": "aerial-ace-opponent-dragonair-player-onix", "baseSource": f"{FX}/prep7-aerial-ace-lab-opponent.json",
   "swap": {}, "move": "AERIAL_ACE", "moveId": 332, "extraFrames": 0},
  {"name": "aerial-ace-opponent-delibird-player-onix", "baseSource": f"{FX}/prep7-aerial-ace-lab-opponent.json",
   "swap": {"opponent": "DELIBIRD"}, "move": "AERIAL_ACE", "moveId": 332, "extraFrames": 0},
  {"name": "aerial-ace-player-charizard-opponent-onix", "baseSource": f"{FX}/prep7-aerial-ace-lab-player.json",
   "swap": {"player": "CHARIZARD"}, "move": "AERIAL_ACE", "moveId": 332, "extraFrames": 0},
  {"name": "aerial-ace-opponent-charizard-player-onix", "baseSource": f"{FX}/prep7-aerial-ace-lab-opponent.json",
   "swap": {"opponent": "CHARIZARD"}, "move": "AERIAL_ACE", "moveId": 332, "extraFrames": 0},
]
deriv = []
ONLY = sys.argv[1:]
for c in CASES:
    if ONLY and c['name'] not in ONLY: continue
    base = json.loads((ROOT / c["baseSource"]).read_text())
    w = base["denseWindow"]
    st.CASES["cases"].append(c)
    _, path = st.stage(c)
    ib = [i for i in act(path, "alt-" + c["name"]) if i["move"] == c["moveId"]]
    ia = [i for i in act(ROOT / base["scenario"], "base-" + c["name"]) if i["move"] == c["moveId"]]
    k = max([j for j, i in enumerate(ia) if i["start"] <= w["startFrame"] + 8], default=0)
    off = w["startFrame"] - ia[k]["start"]
    start = ib[k]["start"] + off
    n = w["endFrame"] - w["startFrame"] + 1
    scen = json.loads(path.read_text())  # the staged scenario must record every window frame
    scen["trace"]["captureFrames"] = list(range(start - 8, start + n + 8))
    path.write_text(json.dumps(scen, indent=1) + "\n")
    r = {"case": c["name"], "acceptedStart": w["startFrame"], "acceptedActivations": [i["start"] for i in ia],
         "acceptedIntervalIndex": k, "offset": off, "altIntervals": ib, "derivedStart": start}
    deriv.append(r); print(json.dumps(r))
    st.DERIV[c["name"]] = r
    st.write(c)
out = ROOT / FX / "altspecies10-derivation.json"
old = [r for r in (json.loads(out.read_text()) if out.exists() else []) if r["case"] not in {d["case"] for d in deriv}]
out.write_text(json.dumps(old + deriv, indent=1) + "\n")
