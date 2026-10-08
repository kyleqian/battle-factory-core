#!/usr/bin/env python3
"""speciesAudit13: ATTACKER species swaps of the accepted Substitute-swap scenarios (tools/battle-lab/subswap-on-*.json, substSwapProbes.sh):
the subbed attacker's party[0] species (and optionally its shiny flag) is replaced; everything else (moves, IVs / EVs, trace) is kept.
substSwapLiveCheck.ts assumes male battlers, so only species with a male form are used.
usage: speciesAudit13SwapStage.py <outDir>   -> <outDir>/<stem>.json, <outDir>/list.tsv (stem, base scenario, side, species, shiny | "plain")"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
BASES = {  # base scenario -> attacker side; the move is the accepted body (Headbutt 29 / Body Slam 34 / Leech Seed 73)
    "subswap-on-opponent-persian-slowbro-bodyslam": "opponent", "subswap-on-player-persian-slowbro-bodyslam": "player",
    "subswap-on-opponent-persian-slowbro-leechseed": "opponent", "subswap-on-player-persian-slowbro-leechseed": "player",
    "subswap-on-opponent-golem-onix-headbutt": "opponent", "subswap-on-player-zigzagoon-onix-headbutt": "player"}
# elevated opponent attackers other than GOLBAT (AERODACTYL, FLYGON), tall / large (STEELIX, WAILORD, TYRANITAR), small (PICHU),
# idle rest (ONIX, RATTATA: the player side has no front idle, the opponent side is the accepted ONIX Headbutt), shiny STEELIX.
SWAPS = ["AERODACTYL", "FLYGON", "STEELIX", "WAILORD", "TYRANITAR", "PICHU", "ONIX", "RATTATA"]
rows = []
for base, side in BASES.items():
    for sp in SWAPS + ["STEELIX*"]:
        name, shiny = sp.rstrip("*"), sp.endswith("*")
        sc = json.loads((R / "tools/battle-lab" / f"{base}.json").read_text())
        p = sc["overrides"]["parties"][side][0]; p["species"] = SPECIES[name]; p["shiny"] = shiny
        stem = f"s13swap-{('shiny' if shiny else '') + name.lower()}-{base.removeprefix('subswap-')}"
        (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
        rows.append((stem, base, side, name, shiny))
# Doll-free CONTROLS (substSwapLiveCheck.ts --plain --attribute): the same attacker without Substitute (its moves all the body move), for the
# swapped rows with a body residual; the swap row's body residual is the attacker's own when bodyPerRowDigest equals the control's.
CTRL = {"subswap-ctrl-player-golem-onix-headbutt": ("player", None, ["GOLEM", "AERODACTYL", "FLYGON", "STEELIX", "WAILORD", "TYRANITAR", "ONIX"]),
        "subswap-on-opponent-golem-onix-headbutt": ("opponent", [29, 29, 29, 29], ["GOLEM", "AERODACTYL", "STEELIX", "TYRANITAR"]),
        "subswap-on-player-persian-slowbro-leechseed": ("player", [73, 73, 73, 73], ["PERSIAN", "FLYGON"])}
for base, (side, moves, names) in CTRL.items():
    for name in names:
        sc = json.loads((R / "tools/battle-lab" / f"{base}.json").read_text())
        p = sc["overrides"]["parties"][side][0]; p["species"] = SPECIES[name]
        if moves: p["moves"] = moves
        stem = f"s13plain-{name.lower()}-{base.removeprefix('subswap-').removeprefix('ctrl-').removeprefix('on-')}"
        (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
        rows.append((stem, base, side, name, "plain"))
(OUT / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
