#!/usr/bin/env python3
"""r2-gates: alternate-species Fire Punch lab scenarios (prep22-fire-punch-{player,opponent}-seed1 with the lead species swapped; same moves/seed).
Writes tools/battle-lab/r2g-fp-<tag>.json. GOLBAT = elevated; HITMONCHAN / SNORLAX / MACHAMP / ALAKAZAM = other sizes."""
import json
from pathlib import Path
R = Path(__file__).resolve().parents[2]; L = R / "tools/battle-lab"
S = {s["name"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
def gender(name):
    r = S[name]["genderRatio"]; return "genderless" if r == 255 else "female" if r == 254 else "male"
ALT = {  # tag: (source scenario, player lead, opponent lead)
  "p-hitmonchan-golbat": ("prep22-fire-punch-player-seed1", "SPECIES_HITMONCHAN", "SPECIES_GOLBAT"),
  "p-snorlax-alakazam": ("prep22-fire-punch-player-seed1", "SPECIES_SNORLAX", "SPECIES_ALAKAZAM"),
  "o-golbat-machamp": ("prep22-fire-punch-opponent-seed1", "SPECIES_MACHAMP", "SPECIES_GOLBAT"),
  "o-snorlax-golem": ("prep22-fire-punch-opponent-seed1", "SPECIES_GOLEM", "SPECIES_SNORLAX"),
}
for tag, (src, plr, opp) in ALT.items():
    d = json.loads((L / f"{src}.json").read_text()); pa = d["overrides"]["parties"]
    for side, sp in (("player", plr), ("opponent", opp)):
        pa[side][0]["species"] = S[sp]["id"]; pa[side][0]["gender"] = gender(sp)
    (L / f"r2g-fp-{tag}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n"); print(tag)
