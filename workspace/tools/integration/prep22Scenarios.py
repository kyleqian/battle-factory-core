#!/usr/bin/env python3
"""prep22: Fire Punch lab scenarios (Scene ON lab, accepted megahorn trace shape: A, 30 idle, A, 900 idle). Player GROVYLE -> opponent ONIX and the
mirror (opponent GROVYLE -> player ONIX), all four slots Fire Punch (7); seed sweeps decide burn / no-burn (see prep22FirePunch.sh).
usage: prep22Scenarios.py  -> tools/battle-lab/prep22-fire-punch-{player,opponent}-seed<N>.json (new files)"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "tools/battle-lab"
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
seeds = [int(x) for x in sys.argv[1:]] or list(range(1, 25))
for side in ("player", "opponent"):
    base = json.loads((LAB / ("mechanic-megahorn-%s-seaking-%s-onix.json" % (("player", "opponent") if side == "player" else ("opponent", "player")))).read_text())
    a, t = ("player", "opponent") if side == "player" else ("opponent", "player")
    for seed in seeds:
        s = json.loads(json.dumps(base)); s["seed"] = seed
        P = s["overrides"]["parties"]
        P[a][0]["species"], P[a][0]["moves"] = sp["GROVYLE"], [7, 7, 7, 7]
        P[t][0]["species"], P[t][0]["moves"] = sp["ONIX"], [33, 33, 33, 33]
        (LAB / f"prep22-fire-punch-{side}-seed{seed}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
# faint variants (target level 3 -> Fire Punch KOs it; no burn is applied), seed 1
for side in ("player", "opponent"):
    d = json.loads((LAB / f"prep22-fire-punch-{side}-seed1.json").read_text())
    d["overrides"]["parties"]["opponent" if side == "player" else "player"][0]["level"] = 3
    (LAB / f"prep22-fire-punch-faint-{side}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
