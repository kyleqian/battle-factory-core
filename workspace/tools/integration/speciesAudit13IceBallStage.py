#!/usr/bin/env python3
"""speciesAudit13: Ice Ball (301) TARGET species swaps of the deferred-lend chains (tools/battle-lab/{mechanic-ice-ball-player-spheal-opponent-onix,
prep25-ice-ball-alt-{player,opponent}-glalie-golem}.json, lendIceBallProbes.sh). The target's party[0] species is replaced. Ice is special in
Gen 3, so the swapped target's EVs move from Defense to Sp. Def. and the attacker's Sp. Atk is IV 0 / EV 0 (the chain must survive to the
counter-4 body); everything else is kept. Turn order is kept: GLALIE (speed 100) outruns every GLALIE-chain target (foe second, as the alt
chains); the elevated GOLBAT (110) outruns SPHEAL (45), as REGISTEEL does (foe first).
usage: speciesAudit13IceBallStage.py <outDir>   -> <outDir>/<stem>.json, <outDir>/list.tsv (stem, base scenario, attacker side, target, foeFirst)"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SPECIES = {s["name"].replace("SPECIES_", ""): s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
# (base, attacker side, foeFirst, targets): elevated opponent targets (LUNATONE levitates, WEEZING, GOLBAT), tall / large (STEELIX, WAILORD,
# TYRANITAR), idle rest (RATTATA, ONIX); both orientations where the target side matters.
CASES = [("prep25-ice-ball-alt-player-glalie-golem", "player", False, ["LUNATONE", "WEEZING", "STEELIX", "WAILORD", "TYRANITAR", "RATTATA", "ONIX"]),
         ("prep25-ice-ball-alt-opponent-glalie-golem", "opponent", False, ["STEELIX", "WAILORD", "TYRANITAR", "RATTATA"]),
         ("mechanic-ice-ball-player-spheal-opponent-onix", "player", True, ["GOLBAT"])]
rows = []
for base, side, foe_first, targets in CASES:
    foe = "opponent" if side == "player" else "player"
    for name in targets:
        sc = json.loads((R / "tools/battle-lab" / f"{base}.json").read_text())
        t = sc["overrides"]["parties"][foe][0]; a = sc["overrides"]["parties"][side][0]
        t["species"] = SPECIES[name]["id"]; t["gender"] = "genderless" if SPECIES[name]["genderRatio"] == 255 else "male"
        t["evs"] = {**t["evs"], "defense": 0, "spDefense": 252}
        a["ivs"] = {**a["ivs"], "spAttack": 0}; a["evs"] = {**a["evs"], "spAttack": 0}
        stem = f"s13ib-{name.lower()}-{base}"
        (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
        rows.append((stem, base, side, name, foe_first))
(OUT / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
