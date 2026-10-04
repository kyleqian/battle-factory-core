#!/usr/bin/env python3
"""Manifest for the net-zero audit EXTENSION: live ids absent from allocator-net-zero-manifest.json
(resolved by the original manifest tool) + staged ext scenarios + Fury Swipes opponent orientation."""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures"
sys.path.insert(0, str(Path(__file__).parent))
import allocatorNetZeroManifest as M  # noqa: E402

orig = json.loads((FX / "allocator-net-zero-manifest.json").read_text())
res = subprocess.run([sys.executable, str(Path(__file__).parent / "allocatorNetZeroManifest.py")], capture_output=True, text=True, check=True)
cur = json.loads(res.stdout)
out = {}
for mid in M.IDS:
    if str(mid) not in orig and cur[str(mid)]["fixtures"]:
        out[str(mid)] = cur[str(mid)]
SC = FX / "allocator-net-zero-ext-scenarios"
for mid, slug in ((41, "twineedle"), (44, "bite"), (158, "hyper-fang"), (162, "super-fang"), (325, "shadow-punch")):
    out[str(mid)] = {"name": M.NAMES[mid], "fixtures": [
        {"orientation": o, "integrationFixture": None, "sourceFixture": None, "staged": "allocator-net-zero-ext (new legal ordinary-singles)",
         "scenario": str(p.relative_to(ROOT))} for o in ("player", "opponent") for p in sorted(SC.glob(f"allocator-ext-{slug}-{o}-*.json"))]}
# Fury Swipes: the original manifest tagged both scenarios "player" (filename regex); the -player-onix-opponent-aipom one is the opponent orientation.
out["154"] = {"name": "FURY_SWIPES", "fixtures": [{"orientation": "opponent", "integrationFixture": None, "sourceFixture": None,
    "staged": "existing scenario, opponent Aipom carries 154 (orig manifest mislabelled it player)",
    "scenario": "tools/battle-lab/mechanic-fury-swipes-player-onix-opponent-aipom.json"}]}
missing = [i for i in M.IDS if str(i) not in orig and str(i) not in out]
json.dump({"_idsNotInOriginalManifest": missing, **out}, sys.stdout, indent=1)
