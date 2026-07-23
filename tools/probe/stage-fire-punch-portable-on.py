#!/usr/bin/env python3
"""Construct a tiny deterministic Battle Scene ON FIRE_PUNCH oracle probe.

This is deliberately a *staging probe*, not a game feature or a replacement
for normal Factory party construction.  It replays the canonical bootstrap
through the first battle's action menu, then changes only battler 0's first
already-loaded `struct BattlePokemon` move/PP slot before the normal FIGHT
controller asks for its move list.  The game itself subsequently executes its
ordinary controller, battle script, and `Move_FIRE_PUNCH` animation.

The resulting portable geometry case is ONIX (player-back) -> GROVYLE
(opponent-front).  It differs from the canonical MAGBY -> MURKROW evidence,
but is intentionally not presented as a Factory-legal team pairing: it pins
the smallest existing presentation-seam construction while proper arbitrary
scenario compilation remains unimplemented.

Run via the validation wrapper (from repository root):

  python3 tools/run-mgba-probe.py /tmp/fire-punch-onix-grovyle.json -- \
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/stage-fire-punch-portable-on.py /tmp/fire-punch-onix-grovyle.json

The output includes raw-RGB frame hashes and RAM snapshots sufficient to
reproduce the stage boundary without saving pixels or using them at runtime.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


if len(sys.argv) not in (2, 3):
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json> [fresh-rgb-dir]")

OUTPUT_PATH = Path(sys.argv[1])
RGB_DIR = Path(sys.argv[2]) if len(sys.argv) == 3 else None
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-turn1.json"

FIRE_PUNCH = 7
BATTLE_MON_SIZE = 0x58
BATTLE_MON_MOVES = 0x0C
BATTLE_MON_PP = 0x24
PLAYER_BATTLER = 0

# `battle1-turn1.json` reaches the action menu at the end of segment 39
# (tick 1886). Segment 40 is the normal FIGHT press, so this is the last
# safe frame to alter the move list that BtlController_EmitChooseMove copies.
STAGE_TICK = 1886
CAPTURE_TICKS = {1886, 1887, 1888, 1918, 1919, 1920, 1921, 1922}
# Dense hashes make the move-owned boundary and complete portable window
# independently bisectable without committing or consulting screenshots.
CAPTURE_TICKS.update(range(2080, 2701))


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def write_u16(oracle: EmeraldOracle, addr: int, value: int) -> None:
    oracle.write_u8(addr, value & 0xFF)
    oracle.write_u8(addr + 1, (value >> 8) & 0xFF)


def battle_mon(oracle: EmeraldOracle, battler: int) -> dict[str, object]:
    base = oracle.symbols["gBattleMons"] + battler * BATTLE_MON_SIZE
    return {
        "species": u16(oracle, base),
        "moves": [u16(oracle, base + BATTLE_MON_MOVES + slot * 2) for slot in range(4)],
        "pp": [oracle.read_u8(base + BATTLE_MON_PP + slot) for slot in range(4)],
        "hp": u16(oracle, base + 0x28),
        "maxHp": u16(oracle, base + 0x2C),
        "status1": oracle.read_u8(base + 0x4C)
        | (oracle.read_u8(base + 0x4D) << 8)
        | (oracle.read_u8(base + 0x4E) << 16)
        | (oracle.read_u8(base + 0x4F) << 24),
    }


def frame_record(oracle: EmeraldOracle, tick: int) -> dict[str, object]:
    rgb = oracle.screen_rgb()
    if RGB_DIR is not None:
        (RGB_DIR / f"{tick:05d}.rgb").write_bytes(rgb)
    return {
        "tick": tick,
        "sha256": hashlib.sha256(rgb).hexdigest(),
        "currentMove": u16(oracle, oracle.symbols["gCurrentMove"]),
        "attacker": oracle.read_u8(oracle.symbols["gBattlerAttacker"]),
        "target": oracle.read_u8(oracle.symbols["gBattlerTarget"]),
        "player": battle_mon(oracle, 0),
        "opponent": battle_mon(oracle, 1),
    }


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    segments = trace["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    if RGB_DIR is not None:
        if not RGB_DIR.is_dir() or any(RGB_DIR.iterdir()):
            raise AssertionError(f"RGB output directory must exist and be empty: {RGB_DIR}")
    tick = 0
    captures: list[dict[str, object]] = []

    def advance(buttons: list[str]) -> None:
        nonlocal tick
        oracle.advance(buttons)
        tick += 1
        if tick in CAPTURE_TICKS:
            captures.append(frame_record(oracle, tick))

    # Replay the accepted canonical prefix through the settled action menu.
    for segment in segments[:40]:
        for _ in range(int(segment["frames"])):
            advance(segment.get("buttons", []))
    if tick != STAGE_TICK:
        raise AssertionError(f"expected stage tick {STAGE_TICK}, got {tick}")

    before = battle_mon(oracle, PLAYER_BATTLER)
    player_base = oracle.symbols["gBattleMons"] + PLAYER_BATTLER * BATTLE_MON_SIZE
    write_u16(oracle, player_base + BATTLE_MON_MOVES, FIRE_PUNCH)
    oracle.write_u8(player_base + BATTLE_MON_PP, 15)
    after = battle_mon(oracle, PLAYER_BATTLER)
    if after["moves"][0] != FIRE_PUNCH or after["pp"][0] != 15:
        raise AssertionError(f"move-slot stage failed: {after}")

    # Keep the normal FIGHT press, move confirmation, and controller pacing.
    for segment in segments[40:43]:
        for _ in range(int(segment["frames"])):
            advance(segment.get("buttons", []))
    # A short input-free animation window is enough to include the move text,
    # the full Move_FIRE_PUNCH visual task, and post-hit presentation onset.
    for _ in range(680):
        advance([])

    output = {
        "schema": "fire-punch-portable-stage/v1",
        "oracleProfile": "battle-scene-on",
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "construction": {
            "stageTick": STAGE_TICK,
            "boundary": "after canonical action-menu settle; before its FIGHT press",
            "patch": {
                "battler": PLAYER_BATTLER,
                "struct": "gBattleMons[0]",
                "fields": {"moves[0]": FIRE_PUNCH, "pp[0]": 15},
            },
            "pair": "ONIX (player-back) -> GROVYLE (opponent-front)",
            "scope": "synthetic presentation-seam probe; not a Factory-legal party claim",
        },
        "before": before,
        "after": after,
        "captures": captures,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
