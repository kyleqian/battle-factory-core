#!/usr/bin/env python3
"""lsbz (B) stage: the Blizzard opponent grid pairs (tools/integration/fixtures/lsbz/blizzard-grid-predictions.json, committed before any
probe) staged exactly as geoiceStage.py stages its cases (the accepted prep2 opponent BattleLab scenario with both leads replaced, Timid
attacker / Quiet speed-IV-0 target so Blizzard is the FIRST body; the window start = that scenario's direct-mGBA activation + the accepted
offset), except the window length: activation .. activation + impact + 163 (impact + 164 rows, the rule under test). A case whose Blizzard
does not run (miss / no activation) is reported and skipped. usage: python3 tools/integration/lsbzBlizzardStage.py -> tools/integration/
fixtures/lsbz/blizzard/<case>.json + derivation.json"""
import importlib.util, json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("geoiceStage", ROOT / "tools/integration/geoiceStage.py")
geo = importlib.util.module_from_spec(spec); spec.loader.exec_module(geo)
OUT = ROOT / "tools/integration/fixtures/lsbz/blizzard"; OUT.mkdir(parents=True, exist_ok=True)
grid = json.loads((ROOT / "tools/integration/fixtures/lsbz/blizzard-grid-predictions.json").read_text())["grid"]
def one(g):
    c = (59, "opponent", g["attacker"], g["target"])
    try:
        d = geo.stage(c, OUT)
    except (IndexError, RuntimeError) as e:
        return {"case": geo.case_id(c), "skipped": f"{type(e).__name__}: {str(e)[:200]}"}
    path = OUT / f"{d['case']}.json"; fx = json.loads(path.read_text())
    start = fx["denseWindow"]["startFrame"]
    fx["denseWindow"] = {"startFrame": start, "endFrame": start + g["impactStartAge"] + 163, "ageOffset": 0}
    fx["lsbz"] = {"impactStartAge": g["impactStartAge"], "prediction": g["prediction"], "geometry": g["geometry"]}
    fx["schema"] = "lsbz-blizzard-fixture/v1"
    path.write_text(json.dumps(fx, indent=1) + "\n")
    return {**d, "impactStartAge": g["impactStartAge"], "denseWindow": fx["denseWindow"]}
with ThreadPoolExecutor(int(sys.argv[1]) if len(sys.argv) > 1 else 8) as pool:
    deriv = list(pool.map(one, grid))
for d in deriv: print(json.dumps({k: d[k] for k in d if k in ("case", "impactStartAge", "altActivation", "altInterval", "skipped")}))
(OUT / "derivation.json").write_text(json.dumps(deriv, indent=1) + "\n")
