#!/usr/bin/env python3
"""Per move: which dense-state sprites carry the `matrixNum` values the accepted reducers consume, and are they real allocations?

usage: affineTaskOwned.py [--json out.json]
Reads tools/compare/evidence/<move>-<side>-dense-state.json.gz (accepted reducer input).  For every in-use sprite whose template symbol is not
a battler/healthbox/MonBg base (symbol starts with `g`, i.e. a move template), reports template, whether the sprite is affine
(attr[0] bit 8) and its matrixNum.  matrixNum of a NON-affine sprite is just OAM attr1 bits 9-13 (flip bits), not an AllocOamMatrix result.
"""
import gzip, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
NAMES = {62: "aurora-beam", 218: "frustration", 32: "horn-drill", 13: "razor-wind", 350: "rock-blast", 69: "seismic-toss",
         254: "stockpile", 129: "swift", 85: "thunderbolt", 271: "trick", 253: "uproar", 192: "zap-cannon"}
res = {}
for mid, name in NAMES.items():
    for side in ("player", "opponent"):
        d = json.load(gzip.open(ROOT / f"tools/compare/evidence/{name}-{side}-dense-state.json.gz"))
        seen = {}
        for f in d["frames"]:
            for s in f["sprites"]:
                sym = (s["template"] or {}).get("symbol") or ""
                if not sym.startswith("g"):
                    continue
                a = bool(s["attr"][0] >> 8 & 1)
                seen.setdefault(sym, {"affine": set(), "matrixNum": set(), "slots": set()})
                seen[sym]["affine"].add(a); seen[sym]["matrixNum"].add(s["matrixNum"]); seen[sym]["slots"].add(s["slot"])
        res[f"{name}/{side}"] = {k: {"affine": sorted(v["affine"]), "matrixNum": sorted(v["matrixNum"]), "slots": sorted(v["slots"])} for k, v in seen.items()}
        print(f"{name}/{side}")
        for k, v in res[f"{name}/{side}"].items():
            print(f"   {k:34s} affine={v['affine']} matrixNum={v['matrixNum']} slots={v['slots']}")
if sys.argv[1:2] == ["--json"]:
    Path(sys.argv[2]).write_text(json.dumps(res, separators=(",", ":")) + "\n")
