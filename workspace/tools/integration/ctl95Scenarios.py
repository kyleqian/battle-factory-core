#!/usr/bin/env python3
"""ctl95: clean-history doll-free labs (docs/ctl95-doll-free-controls.md), in doll90's control format (lab seed 305419897, the
doll90-ctl-recover-opponent.json lab / trace: 4 turns of A, A, 900 idle, B x 6): the move user is party slot 0 with the move in all
four slots; the foe uses a non-damaging move (Light Screen 113) for Focus Punch / Iron Tail, or Tackle 33 (faster) for Recover so
the user is damaged before each Recover. Internal species ids; EV totals <= 510.
usage: ctl95Scenarios.py <out-dir>   (writes <name>.json + list.tsv)
"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = json.loads((ROOT / "tools/integration/fixtures/doll90/scenarios/doll90-ctl-recover-opponent.json").read_text())
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
SP = {"PERSIAN": 53, "SLOWBRO": 80, "GOLBAT": 42, "LAPRAS": 131, "GENGAR": 94, "BRELOOM": 307, "STARMIE": 121}
MV = {"FOCUS_PUNCH": 264, "IRON_TAIL": 231, "RECOVER": 105, "LIGHT_SCREEN": 113, "TACKLE": 33}
FAST = {"hp": 252, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0}
SLOW = {"hp": 252, "attack": 0, "defense": 128, "speed": 0, "spAttack": 0, "spDefense": 128}
IV_FAST = {"hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 0, "spDefense": 31}
IV_SLOW = {"hp": 31, "attack": 0, "defense": 31, "speed": 0, "spAttack": 0, "spDefense": 31}
# name, move, user side, user, foe, foe move, user is the faster mon
CELLS = [
    ("ctl95-fp-opponent-persian", "FOCUS_PUNCH", "opponent", "PERSIAN", "SLOWBRO", "LIGHT_SCREEN", True),
    ("ctl95-fp-opponent-golbat", "FOCUS_PUNCH", "opponent", "GOLBAT", "LAPRAS", "LIGHT_SCREEN", True),
    ("ctl95-fp-opponent-breloom", "FOCUS_PUNCH", "opponent", "BRELOOM", "STARMIE", "LIGHT_SCREEN", True),
    ("ctl95-fp-player-persian", "FOCUS_PUNCH", "player", "PERSIAN", "SLOWBRO", "LIGHT_SCREEN", True),
    ("ctl95-fp-player-gengar", "FOCUS_PUNCH", "player", "GENGAR", "SLOWBRO", "LIGHT_SCREEN", True),
    ("ctl95-it-opponent-persian", "IRON_TAIL", "opponent", "PERSIAN", "SLOWBRO", "LIGHT_SCREEN", True),
    ("ctl95-it-opponent-golbat", "IRON_TAIL", "opponent", "GOLBAT", "LAPRAS", "LIGHT_SCREEN", True),
    ("ctl95-it-player-persian", "IRON_TAIL", "player", "PERSIAN", "SLOWBRO", "LIGHT_SCREEN", True),
    ("ctl95-it-player-gengar", "IRON_TAIL", "player", "GENGAR", "SLOWBRO", "LIGHT_SCREEN", True),
    ("ctl95-recover-player-persian", "RECOVER", "player", "PERSIAN", "SLOWBRO", "TACKLE", False),
    ("ctl95-recover-player-golbat", "RECOVER", "player", "GOLBAT", "LAPRAS", "TACKLE", False),
]
rows = []
for name, move, side, user, foe, foe_move, user_fast in CELLS:
    s = copy.deepcopy(BASE)
    other = "player" if side == "opponent" else "opponent"
    u, f = s["overrides"]["parties"][side][0], s["overrides"]["parties"][other][0]
    u.update(species=SP[user], moves=[MV[move]] * 4, evs=dict(FAST if user_fast else SLOW), ivs=dict(IV_FAST if user_fast else IV_SLOW))
    f.update(species=SP[foe], moves=[MV[foe_move]] * 4, evs=dict(SLOW if user_fast else FAST), ivs=dict(IV_SLOW if user_fast else IV_FAST))
    if foe == "STARMIE":
        f["gender"] = "genderless"
    for m in s["overrides"]["parties"]["player"] + s["overrides"]["parties"]["opponent"]:
        assert sum(m["evs"].values()) <= 510, name
    (out / f"{name}.json").write_text(json.dumps(s) + "\n")
    rows.append(f"{name}\t{move}\t{MV[move]}\t{side}\t{user}\t{foe}\n")
(out / "list.tsv").write_text("".join(rows))
print(f"{len(rows)} scenarios -> {out}")
