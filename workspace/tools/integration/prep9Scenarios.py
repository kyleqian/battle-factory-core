#!/usr/bin/env python3
"""prep9: derive BattleLab scenario variants (different species / preceding body / first-body history) from the accepted lab scenarios of the five
palette-snapshot moves.  Everything not named in the variant is the accepted scenario.  usage (workspace root): python3 tools/integration/prep9Scenarios.py
Variants: fb = attacker made the faster side (first body of the battle; EV cap kept by trimming HP/def EVs); spV = attacker species -> V (Venusaur 3, Tangela 114; Jigglypuff 39 for Dream Eater);
tgS = target species -> S (Shuckle 213, Chansey 113); tmM = target's move slots -> M (Growl 45: a status body precedes instead of Tackle)."""
import json, copy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/integration/fixtures/prep9-scenarios"; OUT.mkdir(exist_ok=True)
SRC = {  # move -> (stem pair as in tools/battle-lab/mechanic-<stem>.json)
    "giga-drain": ("giga-drain-%s-roselia-%s-onix", 202), "sunny-day": ("sunny-day-%s-bellossom-%s-onix", 241), "mega-drain": ("mega-drain-%s-skiploom-%s-onix", 72),
    "absorb": ("absorb-%s-lombre-%s-onix", 71), "dream-eater": ("dream-eater-%s-wigglytuff-%s-onix", 138)}
manifest = []
def write(name, d, move_id, side):
    p = OUT / f"{name}.json"; p.write_text(json.dumps(d, indent=1) + "\n"); manifest.append({"name": name, "move": move_id, "side": side, "file": str(p.relative_to(ROOT))})
for key, (pat, mid) in SRC.items():
    for side in ("player", "opponent"):
        other = "opponent" if side == "player" else "player"
        base = json.loads((ROOT / "tools/battle-lab" / f"mechanic-{pat % (side, other)}.json").read_text())
        manifest.append({"name": f"{key}-{side}-accepted", "move": mid, "side": side, "file": f"tools/battle-lab/mechanic-{pat % (side, other)}.json"})
        def variant(tag, fn):
            d = copy.deepcopy(base); a, t = d["overrides"]["parties"][side], d["overrides"]["parties"][other]; fn(a, t); write(f"{key}-{side}-{tag}", d, mid, side)
        def fb(a, t):
            a[0]["evs"]["speed"] = 252; a[0]["ivs"]["speed"] = 31; t[0]["evs"]["speed"] = 0; t[0]["ivs"]["speed"] = 0
            over = sum(a[0]["evs"].values()) - 510
            for k in ("hp", "defense", "spDefense"):
                cut = max(0, min(over, a[0]["evs"][k])); a[0]["evs"][k] -= cut; over -= cut
        def sp(v):
            def g(a, t):
                for m in a: m["species"] = v
            return g
        def tg(s):
            def g(a, t):
                for m in t: m["species"] = s
            return g
        def tm(mv):
            def g(a, t):
                for m in t: m["moves"] = [mv] * 4
            return g
        if key != "dream-eater":
            variant("firstbody", fb); variant("sp3", sp(3)); variant("sp114", sp(114)); variant("tg213", tg(213)); variant("tm45", tm(45))
        else:  # Sing (47) precedes Dream Eater; keep the sleep setup, vary species / target
            variant("sp39", sp(39)); variant("tg213", tg(213)); variant("tg113", tg(113))
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
print(len(manifest), "scenarios")
