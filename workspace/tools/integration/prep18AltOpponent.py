#!/usr/bin/env python3
"""prep18: opponent-side alternate-species lab scenarios (attacker = the OPPONENT party[0]; the player party[0] is the target). Chosen before probing, never by output:
the accepted opponent scenario with opponent -> the same alternate attacker as prep18AltScenarios.py, player -> GOLEM.  Writes tools/battle-lab/prep18-<move>-altopp-<att>-<tgt>.json."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
ALT = {"dig": ("mechanic-dig-opponent-vibrava-player-chansey.json", "FLYGON", "GOLEM"),
       "megahorn": ("mechanic-megahorn-opponent-seaking-player-onix.json", "HERACROSS", "GOLEM"),
       "will-o-wisp": ("mechanic-will-o-wisp-opponent-shuppet-player-shuckle.json", "BANETTE", "GOLEM"),
       "fury-cutter": ("mechanic-fury-cutter-opponent-grovyle-player-blissey.json", "SCYTHER", "GOLEM"),
       "return": ("mechanic-return-opponent-dragonair-player-onix.json", "SNORLAX", "GOLEM"),
       "pursuit": ("mechanic-pursuit-opponent-beedrill-player-shuckle.json", "UMBREON", "GOLEM")}
for move, (src, att, tgt) in ALT.items():
    s = json.loads((LAB / src).read_text()); parties = s["overrides"]["parties"]
    b = (parties["opponent"][0]["species"], parties["player"][0]["species"])
    parties["opponent"][0]["species"], parties["player"][0]["species"] = sp[att], sp[tgt]
    for side in ("player", "opponent"):
        for g in ("male", "female", "none"):
            parties[side][0]["gender"] = g
            try:
                validate_request(json.loads(json.dumps(s)), "battle-scene-on"); break
            except ValueError as e:
                if "gender" not in str(e): raise
        else: raise SystemExit(f"{move}: no legal gender for {side}")
    out = LAB / f"prep18-{move}-altopp-{att.lower()}-{tgt.lower()}.json"
    out.write_text(json.dumps(s, separators=(",", ":")) + "\n"); print(move, src, b, "->", (sp[att], sp[tgt]), out.name)
