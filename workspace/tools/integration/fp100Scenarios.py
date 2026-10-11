#!/usr/bin/env python3
"""fp100: fresh doll-free Focus Punch 264 labs for the age-131 optional-lag phase census (docs/fp100-focus-punch-d4.md). ctl95's lab
format (ctl95Scenarios.py: doll90-ctl-recover-opponent.json lab / trace, 4 turns of A, A, 900 idle, B x 6; the move user is party
slot 0 with Focus Punch in all four slots, the slower foe uses Light Screen 113), on species pairs ctl95 did not measure and on two
explicit lab seeds. Internal species ids; EV totals <= 510.
usage: fp100Scenarios.py <out-dir>   (writes <name>.json + list.tsv)
"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = json.loads((ROOT / "tools/integration/fixtures/doll90/scenarios/doll90-ctl-recover-opponent.json").read_text())
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
SP = {"MACHAMP": 68, "SNORLAX": 143, "HITMONCHAN": 107, "STEELIX": 208, "HERACROSS": 214, "LAPRAS": 131, "SKARMORY": 227}
FAST = {"hp": 252, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0}
SLOW = {"hp": 252, "attack": 0, "defense": 128, "speed": 0, "spAttack": 0, "spDefense": 128}
IV_FAST = {"hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 0, "spDefense": 31}
IV_SLOW = {"hp": 31, "attack": 0, "defense": 31, "speed": 0, "spAttack": 0, "spDefense": 31}
SEED_A, SEED_B = 305419897, 38177486
# name, Focus Punch user side, user, foe, lab seed
CELLS = [
    ("fp100-opponent-machamp-snorlax", "opponent", "MACHAMP", "SNORLAX", SEED_A),
    ("fp100-opponent-hitmonchan-steelix", "opponent", "HITMONCHAN", "STEELIX", SEED_B),
    ("fp100-player-heracross-lapras", "player", "HERACROSS", "LAPRAS", SEED_A),
    ("fp100-player-machamp-skarmory", "player", "MACHAMP", "SKARMORY", SEED_B),
]
rows = []
for name, side, user, foe, seed in CELLS:
    s = copy.deepcopy(BASE)
    s["seed"] = seed
    other = "player" if side == "opponent" else "opponent"
    u, f = s["overrides"]["parties"][side][0], s["overrides"]["parties"][other][0]
    u.update(species=SP[user], moves=[264] * 4, evs=dict(FAST), ivs=dict(IV_FAST))
    f.update(species=SP[foe], moves=[113] * 4, evs=dict(SLOW), ivs=dict(IV_SLOW))
    for m in s["overrides"]["parties"]["player"] + s["overrides"]["parties"]["opponent"]:
        assert sum(m["evs"].values()) <= 510, name
    (out / f"{name}.json").write_text(json.dumps(s) + "\n")
    rows.append(f"{name}\tFOCUS_PUNCH\t264\t{side}\t{user}\t{foe}\t{seed}\n")
(out / "list.tsv").write_text("".join(rows))
print(f"{len(rows)} scenarios -> {out}")
