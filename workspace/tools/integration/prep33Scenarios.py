#!/usr/bin/env python3
"""prep33: fresh species-pair lab scenarios for Shock Wave and Skill Swap (geometry chosen BEFORE probing, never by output).
Player-attacker: <attacker> -> WEEZING (elevated opponent target); opponent-attacker: WEEZING (elevated attacker) -> SNORLAX (tall player target).
Writes tools/battle-lab/prep33-<move>-alt-<side>-<attacker>-<target>.json (new files). INTERNAL species ids from species.h."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
ALT = {  # move: (player-attacker scenario, opponent-attacker scenario, [(side, attacker, target)])
    "shock-wave": ("mechanic-shock-wave-player-flaaffy-opponent-corsola", "mechanic-shock-wave-opponent-flaaffy-player-corsola", [("player", "RAICHU", "WEEZING"), ("opponent", "WEEZING", "SNORLAX")]),
    "skill-swap": ("mechanic-skill-swap-player-girafarig-opponent-shuckle", "mechanic-skill-swap-opponent-girafarig-player-shuckle", [("player", "ESPEON", "WEEZING"), ("opponent", "WEEZING", "SNORLAX")]),
}
for move, (ps, os_, pairs) in ALT.items():
    for side, att, tgt in pairs:
        s = json.loads((LAB / f"{ps if side == 'player' else os_}.json").read_text())
        P = s["overrides"]["parties"]
        a, t = (P["player"][0], P["opponent"][0]) if side == "player" else (P["opponent"][0], P["player"][0])
        a["species"], t["species"] = sp[att], sp[tgt]
        for mon in (a, t):
            for g in ("male", "female", "none"):
                mon["gender"] = g
                try:
                    validate_request(json.loads(json.dumps(s)), "battle-scene-on"); break
                except ValueError as e:
                    if "gender" not in str(e): raise
            else: raise SystemExit(f"{move}: no legal gender")
        out = LAB / f"prep33-{move}-alt-{side}-{att.lower()}-{tgt.lower()}.json"
        out.write_text(json.dumps(s, separators=(",", ":")) + "\n")
        print(out.name)
