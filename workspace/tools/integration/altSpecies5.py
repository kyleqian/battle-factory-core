#!/usr/bin/env python3
"""next5 alternate-species stage: Scary Face / Glare with a different attacker species. Window start is DERIVED
from source: alt activation (tools/integration/altSpecies3Activation.py on the staged alt scenario, Scene ON mGBA)
+ the accepted fixture's own (window start - accepted-scenario activation) offset. Never chosen from live output.
usage: altSpecies5.py            # derive + write fixtures (tools/compare/fixtures/altspecies3-<case>.json and live twin)
"""
import os
import json, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import altSpecies3Stage as st
ROOT = st.ROOT
VENV = Path(os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")
RAW = ROOT / ".integration/validation/altspecies5"; RAW.mkdir(parents=True, exist_ok=True)
CASES = [
  {"name": "scary-face-player-arbok-opponent-shuckle", "baseSource": "tools/compare/fixtures/scary-face-player-rhyhorn-opponent-shuckle.json",
   "swap": {"player": "ARBOK"}, "move": "SCARY_FACE", "moveId": 184},
  {"name": "glare-opponent-seviper-player-shuckle", "baseSource": "tools/integration/fixtures/next-glare-opponent.json",
   "swap": {"opponent": "SEVIPER"}, "move": "GLARE", "moveId": 137},
]
def act(scen, tag):
    out = RAW / f"{tag}.json"
    for attempt in range(3):  # the probe wrapper occasionally exits 2 on a teardown race; the JSON is validated below
        r = subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", str(VENV),
            str(ROOT / "tools/integration/altSpecies3Activation.py"), str(scen), str(out)], cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0: break
    else: raise RuntimeError(r.stderr[-800:] or r.stdout[-800:])
    return json.loads(out.read_text())["intervals"]
deriv = []
ONLY = sys.argv[1:]
for c in CASES:
    if ONLY and c['name'] not in ONLY: continue
    base = json.loads((ROOT / c["baseSource"]).read_text())
    w = base["denseWindow"]
    st.CASES["cases"].append(c)
    _, path = st.stage(c)
    ia = [i for i in act(ROOT / base["scenario"], "base-" + c["name"]) if i["move"] == c["moveId"]]
    ib = [i for i in act(path, "alt-" + c["name"]) if i["move"] == c["moveId"]]
    k = max([j for j, i in enumerate(ia) if i["start"] <= w["startFrame"] + 8], default=0)
    off = w["startFrame"] - ia[k]["start"]
    r = {"case": c["name"], "acceptedStart": w["startFrame"], "acceptedActivations": [i["start"] for i in ia],
         "acceptedIntervalIndex": k, "offset": off, "altIntervals": ib, "derivedStart": ib[k]["start"] + off}
    deriv.append(r); print(json.dumps(r))
    st.DERIV[c["name"]] = r
    st.write(c)
out = ROOT / "tools/integration/fixtures/altspecies5-derivation.json"
old = [r for r in (json.loads(out.read_text()) if out.exists() else []) if r["case"] not in {d["case"] for d in deriv}]
out.write_text(json.dumps(old + deriv, indent=1) + "\n")
