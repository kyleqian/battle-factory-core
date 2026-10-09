#!/usr/bin/env python3
"""geoice receipt (docs/icy-wind-blizzard-geometry.md) from liveAdapterFramebuffer.ts evidence dirs (two fresh direct-mGBA runs each).
usage: geoiceReceipt.py <evidence-dir> <code-commit> -> tools/integration/fixtures/geoice-live-receipt.json
<evidence-dir>/<case>-run{0,1}/live-comparison.json (full live windows) and <evidence-dir>/short/... (the ROM-body windows of the
three cases whose ROM body is one row shorter than the live window)."""
import json, subprocess, sys
from pathlib import Path
EV, CODE = Path(sys.argv[1]), sys.argv[2]
ROOT = Path(__file__).resolve().parents[2]
F = ROOT / "tools/integration/fixtures/geoice"
git = lambda *a: subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
def runs(d, name):
    out = []
    for r in (0, 1):
        p = d / f"{name}-run{r}" / "live-comparison.json"
        if not p.exists(): return None
        c = json.loads(p.read_text())
        out.append({"rows": c["rows"], "exactRows": c["exactRows"], "residualPixels": c["residualPixels"], "digest": c["digest"],
                    "affectedAges": [x["age"] for x in c["comparisons"] if x["residualPixels"]]})
    return out
def grid(fixdir, controls=False):
    rows = []
    for fx in sorted(fixdir.glob("*.json")):
        if fx.name in ("derivation.json", "rom-rows.json") or fx.name.startswith(("census", "slot-check")): continue
        f = json.loads(fx.read_text()); name = fx.stem
        full = runs(EV, name); short = runs(EV / "short", name)
        r = {"case": name, "move": f["move"], "attackerSide": f["attacker"]["geometry"]["side"], "attacker": f["attacker"]["species"],
             "target": f["target"]["species"], "fixture": str(fx.relative_to(ROOT)), "window": f["denseWindow"],
             "romInterval": f["geoice"]["altInterval"]}
        if full:
            r.update({"liveWindow": full, "r1EqualsR2": full[0]["digest"] == full[1]["digest"],
                      "zeroResidualEveryRow": all(x["exactRows"] == x["rows"] for x in full)})
        else:
            r["liveWindow"] = "ROM body shorter than the live window (probe ends at the script's last active row)"
        if short:
            r.update({"romBodyWindow": short, "r1EqualsR2": short[0]["digest"] == short[1]["digest"],
                      "documentedTailAges": short[0]["affectedAges"]})
        rows.append(r)
    return rows
slot = [json.loads((F / n).read_text()) for n in ("slot-check.json", "slot-check-rom-body.json")]
census = json.loads((F / "census-delta-seeds0-299.json").read_text())
sha = lambda p: subprocess.run(["shasum", "-a", "256", str(p)], capture_output=True, text=True).stdout.split()[0]
receipt = {
  "schema": "geoice-live-receipt/v1", "doc": "docs/icy-wind-blizzard-geometry.md",
  "base": {"commit": "5e0b86a42", "srcTree": git("rev-parse", "5e0b86a42:workspace/src")},
  "code": {"commit": CODE, "srcTree": git("rev-parse", f"{CODE}:workspace/src")},
  "evidenceDir": str(EV),
  "grid": grid(F), "controls": grid(F / "controls", True),
  "slotCheck": [{k: c[k] for k in ("move", "side", "attacker", "target", "rows", "slotRows", "orderRows", "divergentRows",
                                   "divergentSlotRows", "divergentOrderRows")} for s in slot for c in s["cases"]],
  "census": {"seeds": "0..299", "before": {"file": "tools/integration/fixtures/geoice/census-before-seeds0-299.json",
             "sha256": sha(F / "census-before-seeds0-299.json")},
             "after": {"file": "tools/integration/fixtures/geoice/census-after-seeds0-299.json", "sha256": sha(F / "census-after-seeds0-299.json")},
             "delta": {k: census[k] for k in census if not isinstance(census[k], (dict, list))}},
}
(ROOT / "tools/integration/fixtures/geoice-live-receipt.json").write_text(json.dumps(receipt, indent=1) + "\n")
for r in receipt["grid"] + receipt["controls"]:
    print(r["case"], r.get("r1EqualsR2"), r.get("zeroResidualEveryRow"), r.get("documentedTailAges", "")[:3] if r.get("documentedTailAges") else "")
