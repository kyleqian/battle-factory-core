#!/usr/bin/env python3
"""Draft dense fixtures tools/integration/fixtures/voluntary-<move>-<side>[-<variant>].json (docs/voluntary-switch-lend-audit.md s3/s4).
Window = activation + the accepted offset/length of the move's existing playerfaint fixture (never chosen by matching); field HP from the
committed state fixture's row before the rise.  `precedingTurns` is filled afterwards by voluntaryLendHistory.ts --write.  Plain python."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools" / "integration" / "fixtures"
# name, scenario key, edge rise frame, reference fixture, attacker, target, note
DRAFTS = [
    ("sunny-day-player", "cancel-slot1", 322, "sunny-day-player", "JOLTEON", "SLOWBRO", "first body after a cancelled voluntary party menu"),
    ("swift-opponent", "cancel-slot1", 1606, "swift-opponent", "SLOWBRO", "SNORLAX", "first body after a voluntary switch to party slot 1"),
    ("heal-bell-player", "cancel-slot1", 2118, "heal-bell-player", "SNORLAX", "SLOWBRO", "turn after a voluntary switch to party slot 1"),
    ("light-screen-player", "cancel-slot1", 3153, "light-screen-player", "SNORLAX", "SLOWBRO", "two turns after a voluntary switch to party slot 1"),
    ("thunderbolt-opponent", "slot1-thunderbolt", 575, "thunderbolt-opponent", "SLOWBRO", "NINETALES", "first body after a voluntary switch to party slot 1"),
    ("giga-drain-opponent", "slot2-gigadrain", 578, "giga-drain-player", "SLOWBRO", "SNORLAX", "first body after a voluntary switch to party slot 2"),
    ("swift-opponent-cancel", "cancel-slot2", 326, "swift-opponent", "JOLTEON", "NINETALES", "first body after a cancelled voluntary party menu (opponent first)"),
    ("sunny-day-player-cancel2", "cancel-slot2", 516, "sunny-day-player", "NINETALES", "JOLTEON", "second body after a cancelled voluntary party menu"),
    ("swift-opponent-slot2", "cancel-slot2", 1614, "swift-opponent", "JOLTEON", "SNORLAX", "first body after a voluntary switch to party slot 2"),
    ("light-screen-player-slot2", "cancel-slot2", 2432, "light-screen-player", "SNORLAX", "JOLTEON", "turn after a voluntary switch to party slot 2"),
    ("heal-bell-player-slot2", "cancel-slot2", 3187, "heal-bell-player", "SNORLAX", "JOLTEON", "two turns after a voluntary switch to party slot 2"),
    ("light-screen-player-cancel", "cancel-lightscreen", 325, "light-screen-player", "SNORLAX", "SLOWBRO", "first body after a cancelled voluntary party menu"),
    ("heal-bell-player-cancel", "cancel-lightscreen", 835, "heal-bell-player", "SNORLAX", "SLOWBRO", "turn after a cancelled voluntary party menu"),
    ("sunny-day-player-faintko", "faint-ko-sunnyday", 2197, "sunny-day-player", "NINETALES", "SLOWBRO", "player faint -> forced switch-in -> opponent KO + send-out"),
]
MOVES = {"sunny-day": "SUNNY_DAY", "swift": "SWIFT", "heal-bell": "HEAL_BELL", "light-screen": "LIGHT_SCREEN", "thunderbolt": "THUNDERBOLT", "giga-drain": "GIGA_DRAIN"}

for name, key, rise, ref, attacker, target, note in DRAFTS:
    reference = json.loads((FX / f"playerfaint-{ref}.json").read_text())
    window, offset = reference["denseWindow"], reference["windowOffsetFromActivation"]
    rows = window["endFrame"] - window["startFrame"] + 1
    state_path = f"tools/integration/fixtures/voluntary/state-voluntary-{key}.json"
    state = json.loads((ROOT / state_path).read_text())
    act = next(a for a in state["activations"] if a["riseFrame"] == rise)
    (php, pmax), (ohp, omax) = [act["before"]["mons"][b][1:3] for b in (0, 1)]
    side = "player" if "-player" in name else "opponent"
    move = MOVES[next(m for m in MOVES if name.startswith(m))]
    draft = {"schema": "voluntary-adapter-draft/v1", "draft": True, "move": move, "probe": "tools/integration/postkoStateProbe.py",
             "scenario": f"tools/battle-lab/voluntary-{key}.json", "stateFixture": state_path,
             "modelCheck": f"tools/integration/fixtures/voluntary/model-check-voluntary-{key}.json",
             "attacker": {"species": attacker, "geometry": {"side": side}},
             "target": {"species": target, "geometry": {"side": "opponent" if side == "player" else "player"}},
             "fieldProfile": {"playerHp": php, "playerMaxHp": pmax, "opponentHp": ohp, "opponentMaxHp": omax, "playerGender": "male",
                              "opponentGender": "male", "playerStatus": "none"},
             "edgeRiseFrame": rise, "windowOffsetFromActivation": offset,
             "denseWindow": {"startFrame": rise + offset, "endFrame": rise + offset + rows - 1, "ageOffset": window.get("ageOffset", 0)},
             "note": f"accepted window offset/length of playerfaint-{ref}.json ({rows} rows); {note}"}
    path = FX / f"voluntary-{name}.json"
    if path.exists():
        draft["precedingTurns"] = json.loads(path.read_text()).get("precedingTurns")
    path.write_text(json.dumps(draft, indent=1) + "\n")
    print(path.name, move, side, rise, rows, (php, pmax, ohp, omax))
