#!/usr/bin/env python3
"""r2-gates: alternate-species OPPONENT-attacker Psych Up scenarios (lb21-pu-o-first with the lead species swapped; same seed/moves/items).
Writes tools/battle-lab/r2g-pua-<tag>.json. GOLBAT = elevated (flier) target; HYPNO / CLAYDOL / MR_MIME = other attacker sizes."""
import json
from pathlib import Path
S = {s["id"]: s for s in json.loads((Path(__file__).resolve().parents[2] / "src/data/gen/species-stats.json").read_text())["species"]}
def gender(sp):
    r = S[sp]["genderRatio"]
    return "genderless" if r == 255 else "female" if r == 254 else "male"
L = Path(__file__).resolve().parents[2] / "tools/battle-lab"
ALT = {"hypno-golbat": (97, 42), "claydol-golem": (319, 76), "mrmime-magneton": (122, 82)}  # tag: (opponent attacker, player target)
for tag, (opp, plr) in ALT.items():
    d = json.loads((L / "lb21-pu-o-first.json").read_text())
    d["overrides"]["parties"]["opponent"][0]["species"] = opp
    d["overrides"]["parties"]["player"][0]["species"] = plr
    for side, sp in (("opponent", opp), ("player", plr)): d["overrides"]["parties"][side][0]["gender"] = gender(sp)
    (L / f"r2g-pua-{tag}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
    print(tag, opp, plr)
