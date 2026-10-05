#!/usr/bin/env python3
"""prep9: palette baseline at activation vs production assets.  usage (workspace root): python3 tools/integration/prep9PaletteAnalysis.py [runTag=r1] > fixtures/prep9-palette-baseline.json
For every probe with an activation: per-bank (BG 0..15 / OBJ 0..15) unfaded/faded/hardware constancy across scenarios; BG banks vs production battleBg.palette (compact rows);
OBJ banks 0/1 (battler palettes) vs the species art palettes of the staged pair (battle-back-sprites / battle-opponent-front-sprites).  Colors are GBA 15-bit; assets are RGB8 (v<<3|v>>2)."""
import json, glob, sys, collections
from pathlib import Path
RUN = sys.argv[1] if len(sys.argv) > 1 else "r1"
FX = Path("tools/integration/fixtures")
NAMES = {95: "ONIX", 363: "ROSELIA", 296: "LOMBRE", 188: "SKIPLOOM", 40: "WIGGLYTUFF", 182: "BELLOSSOM", 3: "VENUSAUR", 114: "TANGELA", 39: "JIGGLYPUFF", 213: "SHUCKLE", 113: "CHANSEY"}
back = json.load(open("src/assets/gen/battle-back-sprites.json")); front = json.load(open("src/assets/gen/battle-opponent-front-sprites.json"))
bg = json.load(open("src/assets/gen/battle-bg.json"))["palette"]
def to15(c): return ((c["r"] >> 3) & 31) | (((c["g"] >> 3) & 31) << 5) | (((c["b"] >> 3) & 31) << 10)
def row15(row): return [to15(c) for c in row]
bg15 = [row15(r) for r in bg]
man = {m["name"]: m for m in json.load(open(FX / "prep9-scenarios/manifest.json"))}
out = {"run": RUN, "scenarios": {}, "banks": {}}
snaps = {}
for n, m in man.items():
    p = FX / f"prep9-probes/{RUN}/{n}.json"
    if not p.exists(): continue
    d = json.load(open(p))
    if d["activation"] is None: out["scenarios"][n] = {"activation": None}; continue
    s = d["snapshots"]["act"]; snaps[n] = s
    scen = json.load(open(m["file"])); P = scen["overrides"]["parties"]
    ps, os_ = NAMES[P["player"][0]["species"]], NAMES[P["opponent"][0]["species"]]
    bank = lambda k, b, obj=False: s[k][(256 if obj else 0) + b * 16:(256 if obj else 0) + b * 16 + 16]
    pb, ob = row15(back[ps]["palette"]), row15(front[os_]["palette"])
    out["scenarios"][n] = {"activation": d["activation"], "end": d["end"], "player": ps, "opponent": os_,
        "obj0UnfadedIsPlayerBackArt": bank("unfaded", 0, True) == pb, "obj1UnfadedIsOpponentFrontArt": bank("unfaded", 1, True) == ob,
        "obj0FadedEqUnfaded": bank("faded", 0, True) == bank("unfaded", 0, True), "obj1FadedEqUnfaded": bank("faded", 1, True) == bank("unfaded", 1, True),
        "hardwareEqFaded": s["hardware"] == s["faded"], "bgBanks123UnfadedEqFaded": all(bank("unfaded", b) == bank("faded", b) for b in (1, 2, 3)),
        "paletteFadeActive": s["paletteFade"][0:6] != [0] * 6, "tags": s["tags"][:8], "reserved": s["reserved"]}
H = lambda x: tuple(x)
for kind, off in (("BG", 0), ("OBJ", 256)):
    for b in range(16):
        r = {}
        for k in ("unfaded", "faded", "hardware"):
            c = collections.Counter(H(s[k][off + b * 16:off + b * 16 + 16]) for s in snaps.values()); r[k] = len(c)
        out["banks"][f"{kind}{b}"] = r
# BG banks vs production battleBg compact rows (which hardware bank each local row equals)
ref = next(iter(snaps.values()))
out["battleBgRows"] = {str(i): [b for b in range(16) if ref["unfaded"][b * 16:b * 16 + 16] == r] for i, r in enumerate(bg15)}
out["constantBgBanksAcrossAll"] = [b for b in range(16) if out["banks"][f"BG{b}"]["unfaded"] == 1 and out["banks"][f"BG{b}"]["faded"] == 1]
out["scenarioCount"] = len(snaps)
out["allObj01AreSpeciesArt"] = all(v.get("obj0UnfadedIsPlayerBackArt") and v.get("obj1UnfadedIsOpponentFrontArt") for v in out["scenarios"].values() if v["activation"] is not None)
print(json.dumps(out, indent=1))
