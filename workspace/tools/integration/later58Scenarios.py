#!/usr/bin/env python3
"""later58: later-body scenarios for the S10A first-body consumers (Signal Beam 324, Sheer Cold 329, Mach Punch 183, Extrasensory 326).

The prep48 / later48 method: the accepted lab scenarios of each move (both attacker sides, the mechanic-* pair and the prep2x alternate
pair), with only the FOE lead's move list replaced and the trace lengthened to three turns; the ROM computes every outcome. Variants:
  qa:     the foe uses Quick Attack x4 (priority +1): every body of the move follows a damaging body + hit.
  growl:  Growl x4: a later body follows the own earlier body and/or the Growl body + its stat-down body.
  splash: Splash x4: a later body follows the own earlier body and/or the Splash body.
Every scenario carries an EXPLICIT lab "seed" (the base scenario's own; ISSUES #154). Writes tools/integration/fixtures/later58/scenarios/.
"""
import json
from pathlib import Path

BASES = {
    "signal-beam": [("tools/battle-lab/mechanic-signal-beam-player-ariados-opponent-chansey.json", "opponent"),
                    ("tools/battle-lab/mechanic-signal-beam-opponent-ariados-player-chansey.json", "player"),
                    ("tools/battle-lab/prep22-signal-beam-alt-player-venomoth-golem.json", "opponent"),
                    ("tools/battle-lab/prep22-signal-beam-alt-opponent-venomoth-golem.json", "player")],
    "sheer-cold": [("tools/battle-lab/mechanic-sheer-cold-player-dewgong-opponent-chansey.json", "opponent"),
                   ("tools/battle-lab/mechanic-sheer-cold-opponent-dewgong-player-chansey.json", "player"),
                   ("tools/battle-lab/prep22-sheer-cold-alt-player-cloyster-golem.json", "opponent"),
                   ("tools/battle-lab/prep22-sheer-cold-alt-opponent-cloyster-golem.json", "player")],
    "mach-punch": [("tools/battle-lab/mechanic-mach-punch-player-hitmonchan-opponent-chansey.json", "opponent"),
                   ("tools/battle-lab/mechanic-mach-punch-opponent-hitmonchan-player-chansey.json", "player"),
                   ("tools/battle-lab/prep25-mach-punch-alt-player-machamp-golem.json", "opponent"),
                   ("tools/battle-lab/prep25-mach-punch-alt-opponent-machamp-golem.json", "player")],
    "extrasensory": [("tools/battle-lab/mechanic-extrasensory-player-nuzleaf-opponent-shuckle.json", "opponent"),
                     ("tools/battle-lab/mechanic-extrasensory-opponent-nuzleaf-player-shuckle.json", "player"),
                     ("tools/battle-lab/prep25-extrasensory-alt-player-alakazam-golem.json", "opponent"),
                     ("tools/battle-lab/prep25-extrasensory-alt-opponent-alakazam-golem.json", "player")],
}
VARIANTS = (("qa", [98, 98, 98, 98]), ("growl", [45, 45, 45, 45]), ("splash", [150, 150, 150, 150]))
OUT = Path("tools/integration/fixtures/later58/scenarios")
OUT.mkdir(parents=True, exist_ok=True)
for move, bases in BASES.items():
    for path, foe in bases:
        base = json.loads(Path(path).read_text())
        assert "seed" in base, path
        atk = "player" if foe == "opponent" else "opponent"
        stem = Path(path).stem
        parts = stem.split("-")
        tag = f"{atk[:3]}-{parts[-3]}-{parts[-1]}" if stem.startswith("mechanic-") else f"{atk[:3]}-{parts[-2]}-{parts[-1]}"
        for variant, moves in VARIANTS:
            s = json.loads(json.dumps(base))
            s["seed"] = base["seed"]  # explicit lab seed (ISSUES #154)
            s["overrides"]["parties"][foe][0]["moves"] = moves
            seg = []
            for turn in range(3):
                seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                        {"frames": 1300 if turn == 2 else 1100, "buttons": []}]
            s["trace"] = {"segments": seg}
            (OUT / f"{move}-{tag}-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
print(len(list(OUT.glob("*.json"))))
# Sheer Cold (OHKO, 30 % accuracy): more later bodies. The splash / growl variants of the four bases under six further explicit lab seeds
# (base seed + 1..6): a turn-1 miss makes a turn-2 / turn-3 hit a later body after the foe's Splash / Growl (+ stat) bodies.
for path, foe in BASES["sheer-cold"]:
    base = json.loads(Path(path).read_text())
    atk = "player" if foe == "opponent" else "opponent"
    parts = Path(path).stem.split("-")
    tag = f"{atk[:3]}-{parts[-3]}-{parts[-1]}" if Path(path).stem.startswith("mechanic-") else f"{atk[:3]}-{parts[-2]}-{parts[-1]}"
    for variant, moves in VARIANTS[1:]:
        for k in range(1, 7):
            s = json.loads(json.dumps(base))
            s["seed"] = base["seed"] + k  # explicit lab seed (ISSUES #154)
            s["overrides"]["parties"][foe][0]["moves"] = moves
            seg = []
            for turn in range(3):
                seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                        {"frames": 1300 if turn == 2 else 1100, "buttons": []}]
            s["trace"] = {"segments": seg}
            (OUT / f"sheer-cold-{tag}-{variant}-s{k}.json").write_text(json.dumps(s, indent=1) + "\n")
# A non-zero idle rest (x2 history, ISSUES #148): the player-attacker Signal Beam base with the opponent lead replaced by ONIX (rest x2 1).
for variant, moves in (("qa", [98, 98, 98, 98]), ("splash", [150, 150, 150, 150])):
    s = json.loads(Path("tools/battle-lab/mechanic-signal-beam-player-ariados-opponent-chansey.json").read_text())
    s["seed"] = s["seed"]
    s["overrides"]["parties"]["opponent"][0]["species"] = 95
    s["overrides"]["parties"]["opponent"][0]["moves"] = moves
    seg = []
    for turn in range(3):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                {"frames": 1300 if turn == 2 else 1100, "buttons": []}]
    s["trace"] = {"segments": seg}
    (OUT / f"signal-beam-pla-ariados-onix-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
print(len(list(OUT.glob("*.json"))))
