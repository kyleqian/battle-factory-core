#!/usr/bin/env python3
"""Live audit 22 (docs/live-audit-22.md) ablation: copies of reseed85Fixtures.py-style window fixtures whose fieldProfile carries the
displayed battlers' LEVELS (playerLevel / opponentLevel, read by liveAdapterFramebuffer.ts; absent -> 50). The level is the staged party
member's of the displayed species (the scenario file the fixture names); a side with two members of one species at different levels is
refused. reseed85Fixtures.py writes no level: a send-out mon below 50 then renders "Lv50" in its healthbox (audit 22 target 3).
usage: audit22Level.py <fixture-dir> <out-dir>"""
import json, sys
from pathlib import Path

SPECIES = {s["name"].removeprefix("SPECIES_"): s["id"] for s in json.loads(Path("src/data/gen/species-stats.json").read_text())["species"]}
src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
for p in sorted(src.glob("*.json")):
    f = json.loads(p.read_text())
    parties = json.loads(Path(f["scenario"]).read_text())["overrides"]["parties"]
    side = f["attacker"]["geometry"]["side"]
    shown = {side: f["attacker"]["species"], "opponent" if side == "player" else "player": f["target"]["species"]}
    for s, name in shown.items():
        levels = {m.get("level", 50) for m in parties[s] if m["species"] == SPECIES[name]}
        if len(levels) != 1:
            sys.exit(f"{p.name}: {s} {name} levels {sorted(levels)}")
        f["fieldProfile"][f"{s}Level"] = levels.pop()
    (out / p.name).write_text(json.dumps(f, indent=1) + "\n")
