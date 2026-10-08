#!/usr/bin/env python3
"""speciesAudit14: ATTACKER species swaps of the prep40 attacker-doll evidence scenarios (tools/integration/fixtures/prep40/scenarios,
the widened LIVE_SUBSTITUTE_SWAP_BODY_CELLS cells checked by attdollLiveCheck.ts). The subbed attacker's party[0] species is replaced;
everything else (moves, IVs / EVs, gender "male", trace) is kept. --plain stages the doll-free CONTROL (the same swapped attacker, all
four moves the body move: no Substitute) for the stems given.
usage: speciesAudit14SwapStage.py <outDir> [--plain stem ...]   -> <outDir>/<stem>.json, <outDir>/list.tsv (stem, base, side, move, species, swap|plain)"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SC = R / "tools/integration/fixtures/prep40/scenarios"
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
BASE = {l.split("\t")[0]: l.rstrip("\n").split("\t") for l in (SC / "list.tsv").read_text().splitlines()}
# By Factory use weight (the brief's order) + Bite (the third framing class, 41:-10). Rock Slide's cell is opponent-only.
MOVES = ["earthquake", "surf", "psychic", "ice-beam", "thunderbolt", "double-edge", "attract", "brick-break", "sludge-bomb", "crunch",
         "flamethrower", "toxic", "thunder-wave", "confuse-ray", "rock-slide", "bite"]
# tall / large (STEELIX, WAILORD, TYRANITAR), small (PICHU), idle rest (ONIX: on the player side no front idle exists, so it is the
# player-side idle-rest control), elevated / levitating opponent attackers (GOLBAT, FLYGON, WEEZING), idle-rest opponent (ONIX, RATTATA).
SWAPS = {"player": ["STEELIX", "WAILORD", "TYRANITAR", "PICHU", "ONIX"],
         "opponent": ["STEELIX", "WAILORD", "TYRANITAR", "PICHU", "GOLBAT", "FLYGON", "WEEZING", "ONIX", "RATTATA"]}
def stage(base, name, plain):
    _, move, mid, side = BASE[base][:4]
    sc = json.loads((SC / f"{base}.json").read_text())
    p = sc["overrides"]["parties"][side][0]; p["species"] = SPECIES[name]
    if plain: p["moves"] = [int(mid)] * 4
    stem = f"s14{'plain' if plain else 'swap'}-{name.lower()}-{base.removeprefix('prep40-')}"
    (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    return (stem, base, side, move, name, "plain" if plain else "swap")
rows = []
if "--plain" in sys.argv:
    for stem in sys.argv[sys.argv.index("--plain") + 1:]:
        _, name, *rest = stem.split("-"); rows.append(stage("prep40-" + "-".join(rest), name.upper(), True))
else:
    for m in MOVES:
        for side in ("player", "opponent"):
            base = f"prep40-{m}-{side}"
            if base not in BASE: continue
            rows += [stage(base, name, False) for name in SWAPS[side]]
with open(OUT / "list.tsv", "a") as f: f.write("".join("\t".join(r) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
