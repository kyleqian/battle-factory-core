#!/usr/bin/env python3
"""#143 diagnosis driver: ROM RAM/VRAM evidence for CASTFORM (and MINUN controls), two fresh direct-mGBA runs each, asserted identical.
The CASTFORM scenarios are the committed MINUN alt-species scenarios with species 354 -> 385 (byte-identical to the retained
.integration/.../castform-alt/scenarios). Writes tools/integration/fixtures/castform-diag/rom-evidence.json (no VRAM dumps for controls).
usage: castformDiagRun.py [frame=79]
"""
import json, subprocess, sys, tempfile
from pathlib import Path
FRAME = sys.argv[1] if len(sys.argv) > 1 else "79"
ROOT = Path(__file__).resolve().parents[2]
VENV = "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python"
SCN = ROOT / "tools/integration/fixtures/altspecies11-scenarios"
FIX = ROOT / "tools/integration/fixtures/castform-diag"; FIX.mkdir(exist_ok=True)
tmp = Path(tempfile.mkdtemp(prefix="castform-diag-"))
def dump(scenario, tag):
    out = tmp / f"{tag}.json"
    r = subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(out), "--", VENV,
                        str(ROOT / "tools/integration/castformDiagRom.py"), str(scenario), str(out), FRAME],
                       cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0: raise SystemExit(r.stderr[-800:] or r.stdout[-800:])
    return json.loads(out.read_text())
def rgb(c): return [((c >> s) & 31) << 3 | ((c >> s) & 31) >> 2 for s in (0, 5, 10)]  # the app's 5->8 bit expansion
app_pal = [[p["r"], p["g"], p["b"]] for p in json.loads((ROOT / "src/assets/gen/battle-back-sprites.json").read_text())["CASTFORM"]["palette"]]
cases = {}
for side in ("player", "opponent"):
    other = "opponent" if side == "player" else "player"
    for species, sid in (("castform", 385), ("minun", 354)):
        name = f"thunderbolt-{side}-{species}-{other}-shuckle"
        scn = json.loads((SCN / f"thunderbolt-{side}-minun-{other}-shuckle.json").read_text())
        for mon in scn["overrides"]["parties"][side]: mon["species"] = sid
        p = tmp / f"{name}.scenario.json"; p.write_text(json.dumps(scn))
        runs = [dump(p, f"{name}-run{i}") for i in range(2)]
        for r in runs: r.pop("scenario")
        assert runs[0] == runs[1], f"{name}: two fresh runs differ"
        b = runs[0]["battlers"][side]
        entry = {"frame": runs[0]["frame"], "species": b["species"], "gBattleMonForms": b["gBattleMonForms"], "sprite": b["sprite"],
                 "objPaletteRgb": [rgb(c) for c in b["objPalette"]], "twoFreshRunsIdentical": True}
        if species == "castform":
            entry["objPaletteEqualsAppPalette"] = entry["objPaletteRgb"] == app_pal
            entry["vramVsAppPic"] = b["vramPixelMismatchVsAppPic"]
        cases[name] = entry
        print(name, entry["sprite"]["oamX"], entry["sprite"]["oamY"], entry.get("objPaletteEqualsAppPalette"), entry.get("vramVsAppPic"))
(FIX / "rom-evidence.json").write_text(json.dumps({"schema": "castform-diag-rom/v1", "frame": int(FRAME), "cases": cases}, indent=1) + "\n")
