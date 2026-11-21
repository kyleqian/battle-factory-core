#!/usr/bin/env python3
"""Extract per-species base friendship from the pinned pokeemerald species_info.h.

Writes tools/compare/labSpeciesFriendship.json ({SPECIES_NAME: friendship}); the generic lab stage
(tools/compare/appTrace.ts labBackedStage) uses it for labs that omit `friendship` (the oracle then writes
the species' source friendship, battle_lab.py `species_info[0x12]`).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "reference/pokeemerald/src/data/pokemon/species_info.h"
STANDARD_FRIENDSHIP = 70  # include/pokemon.h

text = SRC.read_text()
start = text.index("const struct SpeciesInfo gSpeciesInfo[]")
body = text[start:]
parts = re.split(r"^\s*\[(SPECIES_[A-Z0-9_]+)\]\s*=", body, flags=re.M)
out: dict[str, int] = {}
for name, block in zip(parts[1::2], parts[2::2]):
    m = re.search(r"\.friendship\s*=\s*([A-Za-z0-9_]+)", block)
    if m:
        v = m.group(1)
        out[name] = STANDARD_FRIENDSHIP if v == "STANDARD_FRIENDSHIP" else int(v)
    elif "OLD_UNOWN_SPECIES_INFO" in block:
        out[name] = 0
    elif name != "SPECIES_NONE":
        sys.exit(f"no friendship for {name}")
dest = ROOT / "tools/compare/labSpeciesFriendship.json"
dest.write_text(json.dumps(out, indent=0, sort_keys=False) + "\n")
print(f"{len(out)} species -> {dest}")
