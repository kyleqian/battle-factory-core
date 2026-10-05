#!/usr/bin/env python3
"""prep10: derive alternate-species BattleLab scenarios (attacker party species swapped, everything else the accepted scenario) into tools/integration/fixtures/prep10-scenarios/.
Species are INTERNAL ids resolved by name from reference/pokeemerald/include/constants/species.h (Hoenn internal ids != national dex numbers: 356 is MEDITITE, not DUSCLOPS).
usage (workspace root): python3 tools/integration/prep10Scenarios.py"""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SP = {k: int(v) for k, v in re.findall(r"#define SPECIES_(\w+)\s+(\d+)\b", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
OUT = ROOT / "tools/integration/fixtures/prep10-scenarios"; OUT.mkdir(exist_ok=True)
for f in OUT.glob("*.json"): f.unlink()
B = ROOT / "tools/battle-lab/mechanic-"
JOBS = [  # (source stem, new stem, attacker side, species)
 ("pain-split-player-misdreavus-opponent-gengar", "pain-split-player-dusclops-opponent-gengar", "player", "DUSCLOPS"),
 ("pain-split-opponent-misdreavus-player-gengar", "pain-split-opponent-dusclops-player-gengar", "opponent", "DUSCLOPS"),
 ("spark-player-minun-opponent-shuckle", "spark-player-plusle-opponent-shuckle", "player", "PLUSLE"),
 ("spark-opponent-minun-player-shuckle", "spark-opponent-plusle-player-shuckle", "opponent", "PLUSLE"),
 ("spark-player-minun-opponent-shuckle", "spark-player-chinchou-opponent-shuckle", "player", "CHINCHOU"),
 ("reversal-player-delcatty-opponent-vigoroth", "reversal-player-raichu-opponent-vigoroth", "player", "RAICHU"),
 ("reversal-player-vigoroth-opponent-delcatty", "reversal-player-medicham-opponent-delcatty", "player", "MEDICHAM"),
 ("flail-player-krabby-opponent-onix", "flail-player-kingler-opponent-onix", "player", "KINGLER"),
 ("flail-opponent-krabby-player-onix", "flail-opponent-kingler-player-onix", "opponent", "KINGLER"),
 ("rock-blast-player-rhyhorn-opponent-shuckle", "rock-blast-player-octillery-opponent-shuckle", "player", "OCTILLERY"),
 ("rock-blast-opponent-rhyhorn-player-shuckle", "rock-blast-opponent-octillery-player-shuckle", "opponent", "OCTILLERY"),
 ("razor-wind-player-nuzleaf-opponent-onix", "razor-wind-player-absol-opponent-onix", "player", "ABSOL"),
 ("razor-wind-opponent-nuzleaf-player-onix", "razor-wind-opponent-absol-player-onix", "opponent", "ABSOL"),
 ("magnitude-intense-player-camerupt-opponent-onix", "magnitude-intense-player-realcamerupt-opponent-onix", "player", "CAMERUPT"),  # the accepted file's id 323 is BARBOACH (national-dex id used as internal)
 ("magnitude-intense-opponent-camerupt-player-onix", "magnitude-intense-opponent-realcamerupt-player-onix", "opponent", "CAMERUPT"),
]
for src, dst, side, sp in JOBS:
    d = json.loads(Path(f"{B}{src}.json").read_text())
    for m in d["overrides"]["parties"][side]: m["species"] = SP[sp]
    (OUT / f"{dst}.json").write_text(json.dumps(d, indent=1) + "\n")
print(len(JOBS), "scenarios")
