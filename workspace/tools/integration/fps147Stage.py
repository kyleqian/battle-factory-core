#!/usr/bin/env python3
"""fps147 (docs/fps147-focus-punch-setup.md): stage the Scene ON Focus Punch set-up scenarios from rcp143's R4 card
(tools/probe/rcp143/r4-focuspunch-breloom-jolteon-on.json: same lab header, seed, IVs / EVs / nature / benches).

The Focus Punch user is a legal carrier (src/data/gen/battle-frontier-mons.json entry, its four moves). Player-side windows: the player
selects Focus Punch from its slot; the opponent is JOLTEON with Sand-Attack x4 (MOVE_TARGET_SELECTED, no damage). Opponent-side windows:
the carrier species with Focus Punch in all four slots (the documented way to constrain the Factory AI to one legal choice); the player is
JOLTEON with Sand-Attack x4 and selects slot 0. No legal Focus Punch carrier is an elevated species (battle-enemy-shadow.json).
`p-machamp-sub`: turn 1 the player's MACHAMP uses Substitute (Sand-Attack is blocked by it), turn 2 Focus Punch from behind the
substitute (TryHandleLaunchBattleTableAnimation skips B_ANIM_FOCUS_PUNCH_SETUP for a battler behind a substitute).

usage: fps147Stage.py <out-dir>
"""
from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1])
TEMPLATE = json.loads((ROOT / "tools/probe/rcp143/r4-focuspunch-breloom-jolteon-on.json").read_text())
MOVES = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define (MOVE_\w+) (\d+)\n",
                                                         (ROOT / "reference/pokeemerald/include/constants/moves.h").read_text())}
SPECIES = {s["name"]: s["id"] for s in json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]}
GENDERLESS = {"SPECIES_REGISTEEL", "SPECIES_REGIROCK"}
ENTRIES = json.loads((ROOT / "src/data/gen/battle-frontier-mons.json").read_text())["entries"]
# slot -> menu presses from the top-left cursor
SLOT_KEYS = {0: [], 1: ["RIGHT"], 2: ["DOWN"], 3: ["DOWN", "RIGHT"]}
# (stem, focus side, frontier entry index)
CASES = [
    ("p-breloom", "player", 480),
    ("p-machamp", "player", 810),
    ("p-electabuzz", "player", 503),
    ("o-golem", "opponent", 498),
    ("o-aggron", "opponent", 546),
    ("o-registeel", "opponent", 840),
    ("p-machamp-sub", "player-substitute", 810),
]


def mon(base: dict, species: str, moves: list[int]) -> dict:
    out = copy.deepcopy(base)
    out["species"] = SPECIES[species]
    out["moves"] = moves
    if species in GENDERLESS:
        out["gender"] = "genderless"
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jolteon = TEMPLATE["overrides"]["parties"]["opponent"][0]
    breloom = TEMPLATE["overrides"]["parties"]["player"][0]
    for stem, side, index in CASES:
        entry = ENTRIES[index]
        assert entry["index"] == index and "MOVE_FOCUS_PUNCH" in entry["moves"], (stem, entry)
        scen = copy.deepcopy(TEMPLATE)
        parties = scen["overrides"]["parties"]
        if side == "player-substitute":
            parties["player"][0] = mon(breloom, entry["species"], [MOVES[m] for m in entry["moves"]])
            sub = SLOT_KEYS[entry["moves"].index("MOVE_SUBSTITUTE")]
            keys = SLOT_KEYS[entry["moves"].index("MOVE_FOCUS_PUNCH")]
            segments = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
            for k in sub:
                segments += [{"frames": 2, "buttons": [k]}, {"frames": 30, "buttons": []}]
            # turn 1 runs to the next action menu, which waits for input
            segments += [{"frames": 2, "buttons": ["A"]}, {"frames": 1500, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                         {"frames": 30, "buttons": []}]
            # back at the move menu the cursor sits on the last move used (Substitute): return to slot 0
            for k in sub:
                segments += [{"frames": 2, "buttons": [{"RIGHT": "LEFT", "DOWN": "UP"}[k]]}, {"frames": 30, "buttons": []}]
            for k in keys:
                segments += [{"frames": 2, "buttons": [k]}, {"frames": 30, "buttons": []}]
            segments += [{"frames": 2, "buttons": ["A"]}, {"frames": 400, "buttons": []}]
            total = sum(seg["frames"] for seg in segments)
            scen["trace"] = {"segments": segments, "captureFrames": [0, total]}
            scen["fps147"] = {"focusSide": "player", "behindSubstitute": True, "frontierEntry": index, "species": entry["species"],
                              "legalMoves": entry["moves"]}
            (OUT / f"{stem}.json").write_text(json.dumps(scen, indent=1) + "\n")
            print(stem, side, entry["species"], sub, keys)
            continue
        if side == "player":
            moves = [MOVES[m] for m in entry["moves"]]
            parties["player"][0] = mon(breloom, entry["species"], moves)
            keys = SLOT_KEYS[entry["moves"].index("MOVE_FOCUS_PUNCH")]
        else:
            parties["opponent"][0] = mon(jolteon, entry["species"], [MOVES["MOVE_FOCUS_PUNCH"]] * 4)
            parties["player"][0] = mon(breloom, "SPECIES_JOLTEON", [MOVES["MOVE_SAND_ATTACK"]] * 4)
            keys = []
        segments = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
        for k in keys:
            segments += [{"frames": 2, "buttons": [k]}, {"frames": 30, "buttons": []}]
        segments += [{"frames": 2, "buttons": ["A"]}, {"frames": 400, "buttons": []}]
        total = sum(s["frames"] for s in segments)
        scen["trace"] = {"segments": segments, "captureFrames": [0, total]}
        scen["fps147"] = {"focusSide": side, "frontierEntry": index, "species": entry["species"], "legalMoves": entry["moves"]}
        (OUT / f"{stem}.json").write_text(json.dumps(scen, indent=1) + "\n")
        print(stem, side, entry["species"], keys)


if __name__ == "__main__":
    main()
