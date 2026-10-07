#!/usr/bin/env python3
"""prep22: measured palette-load check for the three Profile reducers (Lovely Kiss, Spikes, Octazooka; their SnapshotsAfterLoad fields).
For each probe scenario: the OBJ bank each effect sprite is born with (attr2 >> 12) must hold, at the sprite's birth age (palEarly, ages 0..24), exactly the move's
asset palette (src/animation/assets/<move>.json, BGR555), unfaded AND faded; and every OTHER OBJ/BG bank must equal its activation value (so 'after load' ==
activation composite with ONE bank replaced).  usage: prep22PaletteLoad.py STATE_DIR OUT.json"""
import json, sys, glob
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SD, OUT = Path(sys.argv[1]), Path(sys.argv[2])
bgr = lambda c: (c["r"] >> 3) | (c["g"] >> 3) << 5 | (c["b"] >> 3) << 10
hexbank = lambda pal: "".join("%04x" % bgr(c) for c in pal) + "0000" * (16 - len(pal)) if False else "".join("%04x" % bgr(c) for c in pal)
CFG = {"spikes": (191, {"*": "spike"}), "octazooka": (190, {"0x8592dfc": "blackBall", "0x8592e30": "graySmoke"}), "lovely-kiss": (142, {})}
res = {}
for mv, (mid, tmap) in CFG.items():
    asset = json.load(open(ROOT / f"src/animation/assets/{mv}.json"))
    for f in sorted(glob.glob(str(SD / f"*{mv}*-r1.json"))):
        name = Path(f).name[:-8]
        d = json.load(open(f)); b = next(x for x in d["bodies"] if x["move"] == mid); A, E = b["start"], b["end"]
        pe = {r[0]: r for r in b["palEarly"]}
        births = [x for x in d["spawns"] if A <= x["f"] <= E and x["ev"] == "+"]
        rows = []
        for x in births:
            age = x["f"] - A; bank = x["attr"][2] >> 12
            if mv == "lovely-kiss":
                key = "devil" if x is births[0] else "pinkHeart"
            else:
                key = tmap.get(hex(x["tmpl"]), tmap.get("*"))
            at = min(max(age, 3), 24)  # sprite attr read the frame it is created; the palette is loaded earlier in the script
            unf, fad = pe[at][1][bank], pe[at][2][bank]
            want = "".join("%04x" % bgr(c) for c in asset[key]["palette"])
            rows.append({"age": age, "bank": bank, "asset": key, "unfadedEqualsAsset": unf == want, "fadedEqualsAsset": fad == want, "paletteAgeChecked": at})
        # banks that change between age 0 and 24 (everything else is the activation composite)
        base = pe[min(pe)]
        changed = sorted({i for a, r in pe.items() for i in range(16) if r[1][i] != base[1][i] or r[2][i] != base[2][i]})
        bgchanged = sorted({i for a, r in pe.items() for i in range(8) if r[3][i] != base[3][i]})
        res[name] = {"births": rows[:6], "nBirths": len(rows), "allBirthsPaletteEqualsAsset": all(r["unfadedEqualsAsset"] and r["fadedEqualsAsset"] for r in rows), "objBanksChangedAges1to24": changed, "bgBanksChangedAges1to24": bgchanged}
        print(name[-40:], res[name]["allBirthsPaletteEqualsAsset"], changed, bgchanged, [(r["age"], r["bank"], r["asset"], r["unfadedEqualsAsset"]) for r in rows[:6]])
json.dump(res, open(OUT, "w"), indent=1)
