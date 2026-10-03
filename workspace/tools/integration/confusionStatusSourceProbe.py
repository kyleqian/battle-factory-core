#!/usr/bin/env python3
"""Capture stock Status_Confusion palette ownership from legal controller input.

Verification only: this probe never feeds RAM or palette data into production.
It stages three complete legal Golbat/Haunter parties, presses only A through
the stock controller, and records animation starts plus OBJ tag/palette
transitions.  Invoke through tools/run-mgba-probe.py with a fresh output path.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


if len(sys.argv) != 3 or sys.argv[1] not in {"player", "opponent"}:
    raise SystemExit("usage: confusionStatusSourceProbe.py <player|opponent> <output.json>")


ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402


def complete_mon(species: int, move: int, nature: int) -> dict[str, object]:
    # Golbat 42 learns Confuse Ray 109; Haunter 93 learns Shadow Punch 325.
    # Haunter's sole ability slot is Levitate, never Own Tempo.
    return {
        "species": species,
        "level": 50,
        "nature": nature,
        "ivs": {"hp": 31, "attack": 31, "defense": 31, "speed": 31,
                "spAttack": 31, "spDefense": 31},
        "evs": {"hp": 252, "attack": 0, "defense": 252, "speed": 0,
                "spAttack": 0, "spDefense": 6},
        "moves": [move, move, move, move],
        "ppUps": [0, 0, 0, 0],
        "item": 0,
        "abilitySlot": 0,
        "friendship": 70,
        "gender": "male",
        "shiny": False,
    }


def request_for(orientation: str) -> dict[str, object]:
    golbat = [complete_mon(42, 109, 0) for _ in range(3)]
    haunter = [complete_mon(93, 325, 15) for _ in range(3)]
    # Two stock turns: the first applies confusion; the second gives the
    # non-confused carrier another ordinary AI-selected Shadow Punch chance.
    # Each action is selected using only the normal A controller path.
    return {
        "schemaVersion": 1,
        "mode": "mechanicLab",
        "profile": "battle-scene-on",
        "level": 50,
        "challengeNum": 0,
        "battleNum": 0,
        "trainerId": 50,
        "playerSetIds": [156, 149, 180],
        "opponentSetIds": [135, 188, 184],
        "seed": 305419898,
        "overrides": {"parties": {
            "player": golbat if orientation == "player" else haunter,
            "opponent": haunter if orientation == "player" else golbat,
        }},
        "trace": {"segments": [
            {"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
            {"frames": 2, "buttons": ["A"]}, {"frames": 1000, "buttons": []},
            {"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
            {"frames": 2, "buttons": ["A"]}, {"frames": 1000, "buttons": []},
        ], "captureFrames": [0, 2068]},
    }


def main() -> None:
    orientation, output_text = sys.argv[1:]
    output = Path(output_text)
    reference = (ROOT / "reference/pokeemerald").resolve()
    names: dict[str, int] = {}
    for line in subprocess.check_output(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], text=True
    ).splitlines():
        parts = line.split()
        if len(parts) == 3:
            try:
                names[parts[2]] = int(parts[0], 16)
            except ValueError:
                pass
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16

    def words(address: int, length: int) -> list[int]:
        return [u16(address + index * 2) for index in range(length)]

    rows: list[dict[str, object]] = []
    animation_events: list[dict[str, object]] = []
    move_animation_events: list[dict[str, object]] = []
    tick = 0
    last: object | None = None
    last_active = False
    phase = "prepare"

    def capture() -> None:
        nonlocal last, last_active
        active = bool(oracle.read_u8(names["gAnimScriptActive"]))
        if active and not last_active and phase == "move":
            move_id = u16(names["sAnimMoveIndex"])
            if move_id:
                move_animation_events.append({
                    "tick": tick, "moveId": move_id,
                    "attacker": oracle.read_u8(names["gBattleAnimAttacker"]),
                    "target": oracle.read_u8(names["gBattleAnimTarget"]),
                })
            else:
                pointer = u32(names["sBattleAnimScriptPtr"])
                candidates = [(value, key) for key, value in names.items()
                              if key.startswith(("Status_", "General_")) and value <= pointer]
                label_address, label = max(candidates) if candidates else (0, "unknown")
                animation_events.append({
                    "tick": tick, "scriptPtr": pointer, "nearestLabel": label,
                    "offset": pointer - label_address,
                    "attacker": oracle.read_u8(names["gBattleAnimAttacker"]),
                    "target": oracle.read_u8(names["gBattleAnimTarget"]),
                    "activeBattler": oracle.read_u8(names["gActiveBattler"]),
                })
        last_active = active
        tags = words(names["sSpritePaletteTags"], 16)
        unfaded = words(names["gPlttBufferUnfaded"] + 256 * 2, 256)
        key = (tags, unfaded, u32(names["gMain"] + 4))
        if key != last:
            rows.append({
                "tick": tick, "phase": phase, "callback2": u32(names["gMain"] + 4),
                "reserved": oracle.read_u8(names["gReservedSpritePaletteCount"]),
                "tags": tags, "unfadedObj": unfaded,
                "fadedObj": words(names["gPlttBufferFaded"] + 256 * 2, 256),
                "currentMove": u16(names["gCurrentMove"]),
            })
            last = key

    original_advance = oracle.advance

    def advance(buttons: list[str]) -> None:
        nonlocal tick
        original_advance(buttons)
        tick += 1
        capture()

    oracle.advance = advance
    request = validate_request(request_for(orientation), "battle-scene-on")
    setup = lab.prepare(request)
    capture()
    phase = "move"
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
    source_files = [
        "src/battle_gfx_sfx_util.c", "src/battle_anim_status_effects.c",
        "data/battle_anim_scripts.s", "src/battle_anim_normal.c", "src/battle_anim.c",
        "src/data/battle_anim.h", "include/constants/battle_anim.h",
    ]
    source_hashes = {path: hashlib.sha256((reference / path).read_bytes()).hexdigest()
                     for path in source_files}
    output.write_text(json.dumps({
        "schema": "status-confusion-source-probe/v1", "orientation": orientation,
        "request": request, "setup": setup, "rows": rows,
        "nonMoveAnimationEvents": animation_events,
        "moveAnimationEvents": move_animation_events,
        "sourceSha256": source_hashes,
    }, separators=(",", ":")))
    print(json.dumps({"orientation": orientation, "ticks": tick, "rows": len(rows),
                      "nonMoveAnimationEvents": animation_events}))


if __name__ == "__main__":
    main()
