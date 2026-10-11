#!/usr/bin/env python3
"""sp103: fresh doll-free Shadow Punch 325 labs for the age-90 optional-lag phase census (docs/next-adapters-sp103.md). fp100's lab
format (fp100Scenarios.py: doll90-ctl-recover-opponent.json lab / trace, 4 turns of A, A, 900 idle, B x 6; the move user is party
slot 0 with Shadow Punch in all four slots). The user is HAUNTER (the only Factory frontier mon with Shadow Punch), on both sides.
"fast" labs: HAUNTER moves first and the slower foe uses Light Screen 113 (the predecessor of bodies 1.. is the foe's Light Screen);
"slow" labs: the faster foe uses Harden 106 first every turn (the predecessor of every body is the foe's Harden). Foes: STEELIX (big
picture), CROBAT (an elevated opponent target), QUAGSIRE, AERODACTYL (fast; elevated only as an enemy, here the player); none is Normal (Ghost immune). Two explicit lab seeds.
Internal species ids; EV totals <= 510.
usage: sp103Scenarios.py <out-dir>   (writes <name>.json + list.tsv)
"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = json.loads((ROOT / "tools/integration/fixtures/doll90/scenarios/doll90-ctl-recover-opponent.json").read_text())
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
SP = {"HAUNTER": 93, "STEELIX": 208, "CROBAT": 169, "QUAGSIRE": 195, "AERODACTYL": 142}
FAST = {"hp": 252, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0}
SLOW = {"hp": 252, "attack": 0, "defense": 128, "speed": 0, "spAttack": 0, "spDefense": 128}
IV_FAST = {"hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 0, "spDefense": 31}
IV_SLOW = {"hp": 31, "attack": 0, "defense": 31, "speed": 0, "spAttack": 0, "spDefense": 31}
SEED_A, SEED_B = 305419897, 38177486
LIGHT_SCREEN, HARDEN, SHADOW_PUNCH = 113, 106, 325
# name, Shadow Punch user side, foe, speed order (fast = HAUNTER first), lab seed
CELLS = [
    ("sp103-player-haunter-steelix", "player", "STEELIX", "fast", SEED_A),
    ("sp103-player-haunter-crobat", "player", "CROBAT", "fast", SEED_B),
    ("sp103-opponent-haunter-quagsire", "opponent", "QUAGSIRE", "fast", SEED_A),
    ("sp103-opponent-haunter-steelix", "opponent", "STEELIX", "fast", SEED_B),
    ("sp103-player-haunter-crobat-slow", "player", "CROBAT", "slow", SEED_A),
    ("sp103-opponent-haunter-aerodactyl-slow", "opponent", "AERODACTYL", "slow", SEED_B),
]
rows = []
for name, side, foe, order, seed in CELLS:
    s = copy.deepcopy(BASE)
    s["seed"] = seed
    other = "player" if side == "opponent" else "opponent"
    u, f = s["overrides"]["parties"][side][0], s["overrides"]["parties"][other][0]
    fast = order == "fast"
    u.update(species=SP["HAUNTER"], moves=[SHADOW_PUNCH] * 4, evs=dict(FAST if fast else SLOW), ivs=dict(IV_FAST if fast else IV_SLOW))
    f.update(species=SP[foe], moves=[LIGHT_SCREEN if fast else HARDEN] * 4, evs=dict(SLOW if fast else FAST),
             ivs=dict(IV_SLOW if fast else IV_FAST))
    for m in s["overrides"]["parties"]["player"] + s["overrides"]["parties"]["opponent"]:
        assert sum(m["evs"].values()) <= 510, name
    (out / f"{name}.json").write_text(json.dumps(s) + "\n")
    rows.append(f"{name}\tSHADOW_PUNCH\t325\t{side}\tHAUNTER\t{foe}\t{order}\t{seed}\n")
(out / "list.tsv").write_text("".join(rows))
print(f"{len(rows)} scenarios -> {out}")
