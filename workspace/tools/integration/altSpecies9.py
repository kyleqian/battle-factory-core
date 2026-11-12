#!/usr/bin/env python3
"""prep6 alternate-species stage: Knock Off (SABLEYE / BANETTE), Safeguard (WOBBUFFET), Rock Tomb (RHYDON) and Faint Attack
(MURKROW attacker). Window start is DERIVED from source, never from live output: alt activation
(tools/integration/altSpecies3Activation.py on the staged alt scenario, Scene ON direct mGBA) + the accepted fixture's own
(window start - accepted-scenario activation) offset (prep6 draft.activationFrame / denseWindow). Faint Attack has no battle-lab
scenario: the alt scenario is the Knock Off battle-lab scenario with the player's lead MURKROW knowing FAINT_ATTACK; the offset is
the accepted +4 (window 2344 vs activation 2340, prep6 s2.4). The live twin keeps the accepted fixture's ageOffset.
usage: altSpecies9.py [case...]   # derive + write fixtures (tools/compare/fixtures/altspecies3-<case>.json and live twin)
"""
import os
import json, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import altSpecies3Stage as st
ROOT = st.ROOT
VENV = Path(os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")
RAW = ROOT / ".integration/validation/altspecies9"; RAW.mkdir(parents=True, exist_ok=True)
FX = "tools/integration/fixtures"
FA_BASE_SCEN = ROOT / FX / "altspecies3-scenarios/_prep6-faint-attack-base.json"
FA_BASE_FIXTURE = ROOT / FX / "prep6-faint-attack-alt-base.json"
CASES = [
  {"name": "knock-off-player-sableye-opponent-onix", "baseSource": f"{FX}/prep6-knock-off-player.json",
   "swap": {"player": "SABLEYE"}, "move": "KNOCK_OFF", "moveId": 282, "extraFrames": 0, "ageOffset": -11},
  {"name": "knock-off-opponent-banette-player-onix", "baseSource": f"{FX}/prep6-knock-off-opponent.json",
   "swap": {"opponent": "BANETTE"}, "move": "KNOCK_OFF", "moveId": 282, "extraFrames": 0, "ageOffset": -11},
  {"name": "safeguard-player-wobbuffet-opponent-onix", "baseSource": f"{FX}/prep6-safeguard-player.json",
   "swap": {"player": "WOBBUFFET"}, "move": "SAFEGUARD", "moveId": 219, "extraFrames": 0},
  {"name": "rock-tomb-opponent-rhydon-player-onix", "baseSource": f"{FX}/prep6-rock-tomb-opponent.json",
   "swap": {"opponent": "RHYDON"}, "move": "ROCK_TOMB", "moveId": 317, "extraFrames": 0},
  {"name": "faint-attack-player-murkrow-opponent-onix", "baseSource": str(FA_BASE_FIXTURE.relative_to(ROOT)),
   "swap": {"player": "MURKROW"}, "move": "FAINT_ATTACK", "moveId": 185, "extraFrames": 0, "fixedOffset": 4,
   "baseScenario": str(FA_BASE_SCEN.relative_to(ROOT))},
  # Control: the ACCEPTED species pair in the same battle-lab context (attributes any Faint Attack tail residual to the context, not the species).
  {"name": "faint-attack-player-onix-opponent-grovyle", "baseSource": str(FA_BASE_FIXTURE.relative_to(ROOT)),
   "swap": {"player": "ONIX", "opponent": "GROVYLE"}, "move": "FAINT_ATTACK", "moveId": 185, "extraFrames": 0, "fixedOffset": 4,
   "baseScenario": str(FA_BASE_SCEN.relative_to(ROOT))},
]
def make_fa_base():
    scen = json.loads((ROOT / "tools/battle-lab/mechanic-knock-off-shuppet-onix.json").read_text())
    scen["overrides"]["parties"]["player"][0]["moves"] = [185, 185, 185, 185]
    scen["trace"]["captureFrames"] = list(range(60, 140))
    FA_BASE_SCEN.parent.mkdir(parents=True, exist_ok=True)
    FA_BASE_SCEN.write_text(json.dumps(scen, indent=1) + "\n")
    ko = json.loads((ROOT / f"{FX}/prep6-knock-off-player.json").read_text())
    ko.update({"move": "FAINT_ATTACK", "scenario": str(FA_BASE_SCEN.relative_to(ROOT)), "denseWindow": {"startFrame": 2344, "endFrame": 2564}})
    ko.pop("draft", None)
    FA_BASE_FIXTURE.write_text(json.dumps(ko, indent=1) + "\n")
def act(scen, tag):
    out = RAW / f"{tag}.json"
    for attempt in range(3):  # the probe wrapper occasionally exits 2 on a teardown race; the JSON is validated below
        r = subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", str(VENV),
            str(ROOT / "tools/integration/altSpecies3Activation.py"), str(scen), str(out)], cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0: break
    else: raise RuntimeError(r.stderr[-800:] or r.stdout[-800:])
    return json.loads(out.read_text())["intervals"]
make_fa_base()
deriv = []
ONLY = sys.argv[1:]
for c in CASES:
    if ONLY and c['name'] not in ONLY: continue
    base = json.loads((ROOT / c["baseSource"]).read_text())
    w = base["denseWindow"]
    st.CASES["cases"].append(c)
    _, path = st.stage(c)
    ib = [i for i in act(path, "alt-" + c["name"]) if i["move"] == c["moveId"]]
    if "fixedOffset" in c:
        ia, k, off = [], 0, c["fixedOffset"]
    else:
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
    if "ageOffset" in c:  # the live twin keeps the accepted fixture's age base (Knock Off: accepted presentation age -11)
        tw = ROOT / FX / f"altspecies3-{c['name']}.json"
        t = json.loads(tw.read_text())
        t["denseWindow"] = {"startFrame": start, "endFrame": start + n - 1, "ageOffset": c["ageOffset"]}
        tw.write_text(json.dumps(t) + "\n")
out = ROOT / FX / "altspecies9-derivation.json"
old = [r for r in (json.loads(out.read_text()) if out.exists() else []) if r["case"] not in {d["case"] for d in deriv}]
out.write_text(json.dumps(old + deriv, indent=1) + "\n")
