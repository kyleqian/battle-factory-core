#!/usr/bin/env python3
"""prep22: alternate-species lab scenarios (attacker AND target species swapped, both orientations); alternates chosen BEFORE probing, never by output.
Writes tools/battle-lab/prep22-<move>-alt-<side>-<attacker>-<target>.json (new files). INTERNAL species ids from species.h."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
ALT = {  # move: (player-attacker scenario, opponent-attacker scenario, new attacker, new target)
    "signal-beam": ("mechanic-signal-beam-player-ariados-opponent-chansey", "mechanic-signal-beam-opponent-ariados-player-chansey", "VENOMOTH", "GOLEM"),
    "lovely-kiss": ("mechanic-lovely-kiss-player-jynx-opponent-onix", "mechanic-lovely-kiss-opponent-jynx-player-onix", "HYPNO", "GOLEM"),
    "sheer-cold": ("mechanic-sheer-cold-player-dewgong-opponent-chansey", "mechanic-sheer-cold-opponent-dewgong-player-chansey", "CLOYSTER", "GOLEM"),
    "spikes": ("mechanic-spikes-player-qwilfish-opponent-onix", "mechanic-spikes-opponent-qwilfish-player-onix", "FORRETRESS", "GOLEM"),
    "octazooka": ("mechanic-octazooka-player-octillery-opponent-onix", "mechanic-octazooka-opponent-octillery-player-onix", "KINGLER", "GOLEM"),
    "skill-swap": ("mechanic-skill-swap-player-girafarig-opponent-shuckle", "mechanic-skill-swap-opponent-girafarig-player-shuckle", "ALAKAZAM", "GOLEM"),
    "shock-wave": ("mechanic-shock-wave-player-flaaffy-opponent-corsola", "mechanic-shock-wave-opponent-flaaffy-player-corsola", "MANECTRIC", "WAILMER"),
}
for move, (ps, os_, att, tgt) in ALT.items():
    for side, src in (("player", ps), ("opponent", os_)):
        s = json.loads((LAB / f"{src}.json").read_text())
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
        if (move, side) == ("sheer-cold", "opponent"): s["seed"] = 2  # OHKO accuracy miss (no animation body) at the accepted seed; seed 2 is the first seed (1..8) with a body
        out = LAB / f"prep22-{move}-alt-{side}-{att.lower()}-{tgt.lower()}.json"
        out.write_text(json.dumps(s, separators=(",", ":")) + "\n")
        print(out.name)
