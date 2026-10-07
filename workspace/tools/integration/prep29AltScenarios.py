#!/usr/bin/env python3
"""prep29: alternate-species lab scenarios for the prep29 moves (attacker AND target swapped, both orientations); alternates chosen BEFORE probing.
Accepted scenarios = tools/battle-lab/mechanic-<move>-{player,opponent}-*.json (without -off). Writes tools/battle-lab/prep29-<move>-alt-<side>-<attacker>-<target>.json
and tools/integration/fixtures/prep29/accepted-scenarios.txt. usage: prep29AltScenarios.py"""
import itertools, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
ALT = {"bonemerang": "RHYDON", "eruption": "TORKOAL", "rapid-spin": "STARMIE", "spit-up": "SEVIPER", "luster-purge": "LATIAS", "outrage": "FLYGON"}
GENDER = {"STARMIE": "genderless", "LATIAS": "female"}
acc = []
for move, att in ALT.items():
    for side in ("player", "opponent"):
        src = sorted(p for p in LAB.glob(f"mechanic-{move}-{side}-*.json") if not p.stem.endswith("-off"))
        assert src, (move, side)
        for srcp in src:
            acc.append(srcp.stem)
            s = json.loads(srcp.read_text())
            P = s["overrides"]["parties"]
            a, t = (P["player"][0], P["opponent"][0]) if side == "player" else (P["opponent"][0], P["player"][0])
            a["species"], t["species"] = sp[att], sp["GOLEM"]
            a["gender"], t["gender"] = GENDER.get(att, "male"), "male"  # species-legal (the lab probe rejects an impossible gender): Starmie genderless, Latias female-only
            tail = "-" + "-".join(srcp.stem.split("-")[-2:]) if move == "spit-up" else ""  # Stockpile counter in the name
            (LAB / f"prep29-{move}-alt-{side}-{att.lower()}-golem{tail}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
d = ROOT / "tools/integration/fixtures/prep29"; d.mkdir(parents=True, exist_ok=True)
(d / "accepted-scenarios.txt").write_text("\n".join(acc) + "\n")
print(len(acc), "accepted")
