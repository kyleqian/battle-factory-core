#!/usr/bin/env python3
"""D4a (faithful timing, docs/faithful-timing.md): extra species pairs for the Mach Punch (183) / Nightmare (171) optional-lag tie-break and the extra
alternate pixel windows, both orientations, chosen BEFORE probing (SNORLAX large target, GOLBAT elevated target). Same recipe as q2ExtraScenarios.py.
Writes tools/battle-lab/d4a-<move>-extra-<side>-<attacker>-<target>.json and tools/integration/d4aCases.json. usage: d4aScenarios.py"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
SRC = {
    "mach-punch": ("MACH_PUNCH", "mechanic-mach-punch-player-hitmonchan-opponent-chansey", "mechanic-mach-punch-opponent-hitmonchan-player-chansey"),
    "nightmare": ("NIGHTMARE", "mechanic-nightmare-player-haunter-opponent-shuckle", "mechanic-nightmare-opponent-haunter-player-shuckle"),
    # D4b: Megahorn bg-write-row tie-break (3:3 in prep24) + extra windows; the Tackle predecessor of the accepted scenarios is kept.
    "megahorn": ("MEGAHORN", "mechanic-megahorn-player-seaking-opponent-onix", "mechanic-megahorn-opponent-seaking-player-onix"),
}
PAIRS = {"mach-punch": [("HITMONCHAN", "SNORLAX"), ("BRELOOM", "GOLBAT")], "nightmare": [("HAUNTER", "SNORLAX"), ("GENGAR", "GOLBAT")],
         "megahorn": [("RHYDON", "GOLBAT"), ("NIDOKING", "SNORLAX")]}
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
            name = f"d4a-{move}-extra-{side}-{att.lower()}-{tgt.lower()}"
            (LAB / f"{name}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
            cases.append([label, f"{move}-extra-{side}-{att.lower()}-{tgt.lower()}", name, side])
            print(name)
(ROOT / "tools/integration/d4aCases.json").write_text(json.dumps(cases, indent=1) + "\n")
