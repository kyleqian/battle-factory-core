#!/usr/bin/env python3
"""speciesAudit14: species swaps of the Substitute fade evidence scenarios (fadeLiveRun.sh; tools/battle-lab prep37 / prep39). The FADING
battler (the Substitute user, party[0] of its side) or the OTHER battler (the side whose move breaks the doll) is replaced; everything
else (moves, IVs / EVs, gender "male", trace) is kept.
usage: speciesAudit14FadeStage.py <outDir>   -> <outDir>/<stem>.json, <outDir>/list.tsv (stem, base, swapped side, role, species)"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
STAGES = [  # (base, side swapped, role, species): fading = the Substitute user, other = the doll breaker
    *[("prep37-on-player-persian-slowbro", "player", "fading", s) for s in ["STEELIX", "WAILORD", "TYRANITAR", "PICHU", "ONIX"]],
    *[("prep39-on-player-persian-onix", "player", "fading", s) for s in ["STEELIX", "PICHU"]],  # other = idle-rest ONIX (opponent)
    *[("prep37-on-player-persian-slowbro", "opponent", "other", s) for s in ["GOLBAT", "FLYGON", "RATTATA"]],  # elevated / idle-rest other
    *[("prep37-on-opponent-golbat-slowbro", "opponent", "fading", s) for s in ["FLYGON", "WEEZING", "AERODACTYL", "STEELIX", "WAILORD", "TYRANITAR", "PICHU", "ONIX"]],
    *[("prep37-off-player-persian-slowbro", "player", "fading", s) for s in ["STEELIX", "PICHU"]],  # Scene OFF
]
# Rock / Steel fading battlers resist the base breaker's Tackle (no fade in the trace): the breaker uses Earthquake 89 (Surf 57 on the
# Flying / Rock AERODACTYL), as prep39-on-player-golem-onix's ONIX Earthquake breaker.
BREAKER = [(base, side, role, name, mv) for base, side, role, name, mv in [
    ("prep37-on-player-persian-slowbro", "player", "fading", "STEELIX", 89), ("prep37-on-player-persian-slowbro", "player", "fading", "TYRANITAR", 89),
    ("prep37-on-player-persian-slowbro", "player", "fading", "ONIX", 89), ("prep37-on-opponent-golbat-slowbro", "opponent", "fading", "STEELIX", 89),
    ("prep37-on-opponent-golbat-slowbro", "opponent", "fading", "TYRANITAR", 89), ("prep37-on-opponent-golbat-slowbro", "opponent", "fading", "ONIX", 89),
    ("prep37-on-opponent-golbat-slowbro", "opponent", "fading", "AERODACTYL", 57), ("prep37-off-player-persian-slowbro", "player", "fading", "STEELIX", 89)]]
rows = []
for base, side, role, name, mv in [(*x, None) for x in STAGES] + BREAKER:
    sc = json.loads((R / "tools/battle-lab" / f"{base}.json").read_text())
    sc["overrides"]["parties"][side][0]["species"] = SPECIES[name]
    if mv: sc["overrides"]["parties"]["opponent" if side == "player" else "player"][0]["moves"] = [mv] * 4
    stem = f"s14fade-{role}-{name.lower()}{f'-m{mv}' if mv else ''}-{base}"
    (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    rows.append((stem, base, side, role, name + (f"+breaker{mv}" if mv else "")))
(OUT / "list.tsv").write_text("".join("\t".join(r) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
