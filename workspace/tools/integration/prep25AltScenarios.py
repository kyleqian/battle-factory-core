#!/usr/bin/env python3
"""prep25: alternate-species lab scenarios for the prep25 moves (attacker AND target swapped, both orientations); alternates chosen BEFORE probing.
Accepted scenarios = tools/battle-lab/mechanic-<move>-{player,opponent}-*.json (without -off). Writes tools/battle-lab/prep25-<move>-alt-<side>-<attacker>-<target>.json
and tools/integration/fixtures/prep25/accepted-scenarios.txt. usage: prep25AltScenarios.py"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
ALT = {"dive": "LANTURN", "mach-punch": "MACHAMP", "extrasensory": "ALAKAZAM", "ice-ball": "GLALIE", "flatter": "HYPNO", "nightmare": "GENGAR", "psywave": "ALAKAZAM",
       "revenge": "MACHOKE", "snore": "SNORLAX", "smog": "WEEZING", "sand-tomb": "SANDSLASH", "hyper-voice": "LOUDRED", "sky-attack": "PIDGEOT", "superpower": "MACHAMP"}
acc = []
for move, att in ALT.items():
    for side in ("player", "opponent"):
        src = sorted(p for p in LAB.glob(f"mechanic-{move}-{side}-*.json") if not p.stem.endswith("-off"))
        assert len(src) == 1, (move, side, src)
        acc.append(src[0].stem)
        s = json.loads(src[0].read_text())
        P = s["overrides"]["parties"]
        a, t = (P["player"][0], P["opponent"][0]) if side == "player" else (P["opponent"][0], P["player"][0])
        a["species"], t["species"] = sp[att], sp["GOLEM"]
        for mon in (a, t):
            for g in ("male", "female", "none"):
                mon["gender"] = g
                try: validate_request(json.loads(json.dumps(s)), "battle-scene-on"); break
                except ValueError as e:
                    if "gender" not in str(e): raise
            else: raise SystemExit(f"{move}: no legal gender")
        (LAB / f"prep25-{move}-alt-{side}-{att.lower()}-golem.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
d = ROOT / "tools/integration/fixtures/prep25"; d.mkdir(parents=True, exist_ok=True)
(d / "accepted-scenarios.txt").write_text("\n".join(acc) + "\n")
print(len(acc), "accepted")
