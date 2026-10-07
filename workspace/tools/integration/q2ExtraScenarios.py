#!/usr/bin/env python3
"""q2 batch: extra species pairs with a different target picture size / elevation (GOLBAT elevated, SNORLAX large), both orientations,
chosen BEFORE probing.  Writes tools/battle-lab/q2-<move>-extra-<side>-<attacker>-<target>.json and tools/integration/q2ExtraCases.json."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
SRC = {
    "snore": ("SNORE", "mechanic-snore-player-sealeo-opponent-venomoth", "mechanic-snore-opponent-sealeo-player-venomoth"),
    "smog": ("SMOG", "mechanic-smog-player-magby-opponent-onix", "mechanic-smog-opponent-magby-player-onix"),
    "sand-tomb": ("SAND_TOMB", "mechanic-sand-tomb-player-dugtrio-opponent-onix", "mechanic-sand-tomb-opponent-dugtrio-player-onix"),
    "hyper-voice": ("HYPER_VOICE", "mechanic-hyper-voice-player-exploud-opponent-slowking", "mechanic-hyper-voice-opponent-exploud-player-slowking"),
    "sky-attack": ("SKY_ATTACK", "mechanic-sky-attack-player-fearow-opponent-shuckle", "mechanic-sky-attack-opponent-fearow-player-shuckle"),
}
PAIRS = {"snore": [("SEALEO", "GOLBAT"), ("SNORLAX", "SNORLAX")], "smog": [("WEEZING", "GOLBAT"), ("MAGBY", "SNORLAX")],
         "sand-tomb": [("DUGTRIO", "GOLBAT"), ("SANDSLASH", "SNORLAX")], "hyper-voice": [("EXPLOUD", "GOLBAT"), ("LOUDRED", "SNORLAX")],
         "sky-attack": [("FEAROW", "GOLBAT"), ("PIDGEOT", "SNORLAX")]}
cases = []
for move, (label, ps, os_) in SRC.items():
    for att, tgt in PAIRS[move]:
        for side, src in (("player", ps), ("opponent", os_)):
            s = json.loads((LAB / f"{src}.json").read_text())
            P = s["overrides"]["parties"]
            a, t = (P["player"][0], P["opponent"][0]) if side == "player" else (P["opponent"][0], P["player"][0])
            changed = [m for m, new in ((a, att), (t, tgt)) if m["species"] != sp[new]]
            a["species"], t["species"] = sp[att], sp[tgt]
            for mon in changed:
                for g in ("male", "female", "none"):
                    mon["gender"] = g
                    try:
                        validate_request(json.loads(json.dumps(s)), "battle-scene-on"); break
                    except ValueError as e:
                        if "gender" not in str(e): raise
                else: raise SystemExit(f"{move}: no legal gender")
            name = f"q2-{move}-extra-{side}-{att.lower()}-{tgt.lower()}"
            (LAB / f"{name}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
            cases.append([label, f"{move}-extra-{side}-{att.lower()}-{tgt.lower()}", name, side])
            print(name)
(ROOT / "tools/integration/q2ExtraCases.json").write_text(json.dumps(cases, indent=1) + "\n")
