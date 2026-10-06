#!/usr/bin/env python3
"""prep13: alternate-species lab scenarios for Ice Beam / Water Spout / Hidden Power / Hyper Beam, both orientations (attacker and target species
swapped in party[0] of each side; INTERNAL ids from species.h; chosen BEFORE any probe, never by matching output). Hidden Power additionally gets
a different `seed` (personality) alternate with the Unown attacker kept. Writes tools/battle-lab/prep13-<move>-alt-<side>-<attacker>-<target>[-seedN].json."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
# move: (player-attacker scenario, opponent-attacker scenario, new attacker, new target)
ALT = {
    "ice-beam": ("mechanic-ice-beam-player-delcatty-opponent-shuckle.json", "mechanic-ice-beam-opponent-delcatty-player-shuckle.json", "LAPRAS", "GOLEM"),
    "water-spout": ("mechanic-water-spout-player-wailmer-opponent-shuckle.json", "mechanic-water-spout-opponent-wailmer-player-shuckle.json", "KINGDRA", "GOLEM"),
    "hidden-power": ("mechanic-hidden-power-player-unown-opponent-onix.json", "mechanic-hidden-power-opponent-unown-player-onix.json", "GENGAR", "GOLEM"),
    "hyper-beam": ("mechanic-hyper-beam-player-aerodactyl-opponent-onix.json", "mechanic-hyper-beam-opponent-aerodactyl-player-onix.json", "SNORLAX", "GOLEM"),
}
def legal(s, who, species):
    for g in ("male", "female", "genderless"):
        s["overrides"]["parties"][who][0]["gender"] = g
        try: validate_request(json.loads(json.dumps(s)), "battle-scene-on"); return
        except ValueError as e:
            if "gender" not in str(e): raise
    raise SystemExit(f"no legal gender {who} {species}")
for move, (psrc, osrc, att, tgt) in ALT.items():
    for side, src in (("player", psrc), ("opponent", osrc)):
        s = json.loads((LAB / src).read_text()); P = s["overrides"]["parties"]
        a, t = (side, "opponent" if side == "player" else "player")
        before = (P[a][0]["species"], P[t][0]["species"])
        P[a][0]["species"], P[t][0]["species"] = sp[att], sp[tgt]
        legal(s, a, att); legal(s, t, tgt)
        out = LAB / f"prep13-{move}-alt-{side}-{att.lower()}-{tgt.lower()}.json"
        out.write_text(json.dumps(s, separators=(",", ":")) + "\n"); print(move, side, before, "->", (sp[att], sp[tgt]), out.name)
# Hidden Power personality alternate: the accepted UNOWN attacker with another battle seed (personality/form), same trace
for side, src in (("player", ALT["hidden-power"][0]), ("opponent", ALT["hidden-power"][1])):
    s = json.loads((LAB / src).read_text()); s["seed"] = s["seed"] + 1000
    validate_request(json.loads(json.dumps(s)), "battle-scene-on")
    out = LAB / f"prep13-hidden-power-alt-{side}-unown-seed{s['seed']}.json"; out.write_text(json.dumps(s, separators=(",", ":")) + "\n"); print("hp seed alt", out.name)
# Hidden Power disambiguation (is the 8th scatter's age-118 init status attacker- or target-dependent?): Unown attacker vs GOLEM target, and GENGAR attacker vs the accepted ONIX target
for side, src in (("player", ALT["hidden-power"][0]), ("opponent", ALT["hidden-power"][1])):
    for att, tgt in (("UNOWN", "GOLEM"), ("GENGAR", "ONIX")):
        s = json.loads((LAB / src).read_text()); P = s["overrides"]["parties"]; a, t = (side, "opponent" if side == "player" else "player")
        if att != "UNOWN": P[a][0]["species"] = sp[att]; legal(s, a, att)
        if tgt != "ONIX": P[t][0]["species"] = sp[tgt]; legal(s, t, tgt)
        out = LAB / f"prep13-hidden-power-alt-{side}-{att.lower()}-{tgt.lower()}.json"; out.write_text(json.dumps(s, separators=(",", ":")) + "\n"); print("hp disambiguation", out.name)
