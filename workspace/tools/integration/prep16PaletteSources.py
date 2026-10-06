#!/usr/bin/env python3
"""prep16: which production palette source equals which ROM hardware/unfaded/faded bank, per scenario and age (ROM = prep16Probe.py output, direct mGBA).
Sources (BGR555 from the 8-bit RGB assets, v>>3): battle-bg palette[0..2], battle-back-sprites[species] (player battler), battle-opponent-front-sprites[species] (opponent battler),
small-ember / hitsplat / silver-wind sparkle6 / psych-up spiral resource palettes, plus the species' `shinyPalette` if an asset has one.
usage: prep16PaletteSources.py PROBE_DIR OUT_JSON"""
import json, re, sys
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2]); ROOT = Path(__file__).resolve().parents[2]
G = ROOT / "src/assets/gen"; A = ROOT / "src/animation/assets"
sp = {int(m.group(2)): m.group(1) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
def w(c): return (c["r"] >> 3) | (c["g"] >> 3) << 5 | (c["b"] >> 3) << 10
def hexp(p): return "".join("%04x" % w(c) for c in p)
J = lambda p: json.loads(p.read_text())
bg, back, front = J(G / "battle-bg.json"), J(G / "battle-back-sprites.json"), J(G / "battle-opponent-front-sprites.json")
ember, hit = J(G / "battle-anim-small-ember.json"), J(G / "battle-anim-hitsplat.json")
sw, pu = J(A / "silver-wind.json"), J(A / "psych-up.json")
src = {"battle-bg[0]": hexp(bg["palette"][0]), "battle-bg[1]": hexp(bg["palette"][1]), "battle-bg[2]": hexp(bg["palette"][2]),
       "small-ember": hexp(ember["palette"]), "hitsplat-impact": hexp(hit["palette"]), "silver-wind.sparkle6": hexp(sw["resources"]["sparkle6"]["palette"]),
       "silver-wind.bugBackground": hexp(sw["resources"]["bugBackground"]["palette"])}
def spiral():
    a = pu["art"]; k = next(iter(a)) if isinstance(a, dict) else None
    return a
try:
    a = pu["art"]; p = a["palette"] if "palette" in a else next(v["palette"] for v in a.values() if isinstance(v, dict) and "palette" in v); src["psych-up.spiral"] = hexp(p)
except Exception as e: print("psych-up palette:", e)
def bank(h, b): return h[b * 64:(b + 1) * 64]
res = {}
for f in sorted(D.glob("prep16-*-r1.json") if False else D.glob("prep16-*.json")):
    n = f.stem[7:]
    if not re.match(r"(overheat|silverwind|psychup)-(acc|alt|shiny)", n): continue
    j = json.loads(f.read_text()); mv = {"overheat": 315, "silverwind": 318, "psychup": 244}[n.split("-")[0]]
    b = next(x for x in j["bodies"] if x["move"] == mv)
    m = b["mons"]; names = [sp.get(x, "?%d" % x) for x in m]
    srcs = dict(src); has = {}
    pn, on = names[0], names[1]
    pb, ob = back.get(pn), front.get(on)
    if pb: srcs["player-back:" + pn] = hexp(pb["palette"])
    if ob: srcs["opponent-front:" + on] = hexp(ob["palette"])
    has = {"playerBack": bool(pb), "opponentFront": bool(ob), "playerSpecies": pn, "opponentSpecies": on}
    rows = {}
    for age, p in sorted(b["palFull"].items(), key=lambda kv: int(kv[0])):
        r = {}
        for kind in ("hw", "unfaded", "faded"):
            r[kind] = {s: [i for i in range(32) if bank(p[kind], i) == v] for s, v in srcs.items()}
            r[kind] = {s: v for s, v in r[kind].items() if v}
        rows[age] = r
    res[n] = {"species": has, "act": b["start"], "battlerPalNum": b["battlerPalNum"], "bankMatches": rows}
OUT.write_text(json.dumps(res, indent=0, separators=(",", ":")))
for n, r in res.items(): print(n, r["species"], {a: r["bankMatches"][a]["hw"] for a in ("0", "5", "12")})
