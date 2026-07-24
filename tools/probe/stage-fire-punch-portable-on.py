#!/usr/bin/env python3
"""Construct a tiny deterministic Battle Scene ON move oracle probe.

This is deliberately a *staging probe*, not a game feature or a replacement
for normal Factory party construction.  It replays the canonical bootstrap
through the first battle's action menu, then changes only battler 0's first
already-loaded `struct BattlePokemon` move/PP slot before the normal FIGHT
controller asks for its move list.  The game itself subsequently executes its
ordinary controller, battle script, and selected move animation.

The default portable geometry case is ONIX (player-back) -> GROVYLE
(opponent-front). Passing ``opponent`` as the final argument stages the
opposite attacker side, GROVYLE (opponent-front) -> ONIX (player-back), by
replacing only the AI's known selected move slot. Both routes differ from the
canonical MAGBY -> MURKROW evidence, but are intentionally not presented as
Factory-legal team pairings: they pin the smallest existing presentation-seam
construction while proper arbitrary scenario compilation remains unimplemented.

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


if len(sys.argv) not in (2, 3, 4, 5):
    raise SystemExit(
        f"usage: {sys.argv[0]} <fresh-output.json> [fresh-rgb-dir] "
        "[player|opponent] "
        "[fire-punch|faint-attack|rock-slide|double-team|endeavor]"
    )

OUTPUT_PATH = Path(sys.argv[1])
RGB_DIR = Path(sys.argv[2]) if len(sys.argv) >= 3 else None
ATTACKER_SIDE = sys.argv[3] if len(sys.argv) >= 4 else "player"
if ATTACKER_SIDE not in ("player", "opponent"):
    raise SystemExit(f"attacker side must be player or opponent, got {ATTACKER_SIDE!r}")
MOVE_NAME = sys.argv[4] if len(sys.argv) == 5 else "fire-punch"
MOVE_IDS = {
    "fire-punch": 7,
    "faint-attack": 185,
    "rock-slide": 157,
    "double-team": 104,
    "endeavor": 283,
}
if MOVE_NAME not in MOVE_IDS:
    raise SystemExit(f"unsupported staged move {MOVE_NAME!r}")
STAGED_MOVE = MOVE_IDS[MOVE_NAME]
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

BATTLE_MON_SIZE = 0x58
BATTLE_MON_MOVES = 0x0C
BATTLE_MON_PP = 0x24
PLAYER_BATTLER = 0
OPPONENT_BATTLER = 1
# GROVYLE's slot 3 is the deterministic Battle AI choice in the untouched
# canonical turn. Replacing that one already-loaded slot preserves normal AI
# selection and controller emission while directing the existing choice to
# the staged move; no chosen-action or turn-order state is written.
OPPONENT_AI_SLOT = 3
SPRITE_SIZE = 0x44
SPRITE_TEMPLATE_OFFSET = 0x14
SPRITE_FLAGS_OFFSET = 0x3E
SPRITE_CALLBACK_OFFSET = 0x1C
SPRITE_X2_OFFSET = 0x24
SPRITE_DATA_OFFSET = 0x2E
ROCK_TEMPLATE = 0x08596B04
SPRITE_ORDER = 0x020217F4
# Static symbol from `arm-none-eabi-nm -n --defined-only pokeemerald.elf`;
# Thumb bit included. See dump-doubleteam-sprites.py for the canonical probe.
ANIM_DOUBLE_TEAM_CALLBACK = 0x08102B3D

# These are the decoder corners used by the native compositor's 64x64 battler
# sheets. Centers mirror GetBattlerSpriteCoord(battler, X_2/Y_PIC_OFFSET):
# singles bases are (72, 80)/(176, 40); ONIX's back offset is 0 (+8 for the
# player PIC_OFFSET convention), while GROVYLE's front offset is 4.
BATTLER_GEOMETRY = {
    PLAYER_BATTLER: {
        "species": "ONIX",
        "side": "player-back",
        "spriteCorner": {"x": 40, "y": 48},
        "animationCenter": {"x": 72, "y": 88},
    },
    OPPONENT_BATTLER: {
        "species": "GROVYLE",
        "side": "opponent-front",
        "spriteCorner": {"x": 144, "y": 12},
        "animationCenter": {"x": 176, "y": 44},
    },
}

# `battle1-turn1.json` reaches the action menu at the end of segment 39
# (tick 1886). Segment 40 is the normal FIGHT press, so this is the last
# safe frame to alter the move list that BtlController_EmitChooseMove copies.
STAGE_TICK = 1886
CAPTURE_TICKS = {1886, 1887, 1888, 1918, 1919, 1920, 1921, 1922}
# Dense hashes make the move-owned boundary and complete portable window
# independently bisectable without committing or consulting screenshots.
CAPTURE_TICKS.update(range(1886, 3501))


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def write_u16(oracle: EmeraldOracle, addr: int, value: int) -> None:
    oracle.write_u8(addr, value & 0xFF)
    oracle.write_u8(addr + 1, (value >> 8) & 0xFF)


def s16(oracle: EmeraldOracle, addr: int) -> int:
    value = u16(oracle, addr)
    return value - 0x10000 if value & 0x8000 else value


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


def battler_sprite(oracle: EmeraldOracle, battler: int) -> dict[str, int]:
    sprite_id = oracle.read_u8(oracle.symbols["gBattlerSpriteIds"] + battler)
    # struct Sprite: x/y at +0x20, x2/y2 at +0x24, sizeof 0x44.
    base = oracle.symbols["gSprites"] + sprite_id * 0x44
    return {
        "id": sprite_id,
        "x": s16(oracle, base + 0x20),
        "y": s16(oracle, base + 0x22),
        "x2": s16(oracle, base + 0x24),
        "y2": s16(oracle, base + 0x26),
    }


def frame_record(oracle: EmeraldOracle, tick: int) -> dict[str, object]:
    rgb = oracle.screen_rgb()
    if RGB_DIR is not None:
        (RGB_DIR / f"{tick:05d}.rgb").write_bytes(rgb)
    rocks = []
    double_team_clones = []
    for slot in range(64):
        base = oracle.symbols["gSprites"] + slot * SPRITE_SIZE
        if not oracle.read_u8(base + SPRITE_FLAGS_OFFSET) & 1:
            continue
        if oracle.read_u32(base + SPRITE_TEMPLATE_OFFSET) == ROCK_TEMPLATE:
            rocks.append(slot)
        if oracle.read_u32(base + SPRITE_CALLBACK_OFFSET) == ANIM_DOUBLE_TEAM_CALLBACK:
            double_team_clones.append(
                {
                    "slot": slot,
                    "x2": s16(oracle, base + SPRITE_X2_OFFSET),
                    "phase": s16(oracle, base + SPRITE_DATA_OFFSET + 2),
                    "life": s16(oracle, base + SPRITE_DATA_OFFSET),
                    "subcounter": s16(oracle, base + SPRITE_DATA_OFFSET + 6),
                }
            )
    return {
        "tick": tick,
        "sha256": hashlib.sha256(rgb).hexdigest(),
        "currentMove": u16(oracle, oracle.symbols["gCurrentMove"]),
        "attacker": oracle.read_u8(oracle.symbols["gBattlerAttacker"]),
        "target": oracle.read_u8(oracle.symbols["gBattlerTarget"]),
        "doingBattleAnim": oracle.read_u8(oracle.symbols["gDoingBattleAnim"]),
        "animScriptActive": oracle.read_u8(oracle.symbols["gAnimScriptActive"]),
        "battleAnimAttacker": oracle.read_u8(oracle.symbols["gBattleAnimAttacker"]),
        "battleAnimTarget": oracle.read_u8(oracle.symbols["gBattleAnimTarget"]),
        "player": battle_mon(oracle, 0),
        "opponent": battle_mon(oracle, 1),
        "sprites": {
            "player": battler_sprite(oracle, PLAYER_BATTLER),
            "opponent": battler_sprite(oracle, OPPONENT_BATTLER),
        },
        "rockSlots": rocks,
        "doubleTeamClones": double_team_clones,
        "spriteOrder": [oracle.read_u8(SPRITE_ORDER + slot) for slot in range(64)],
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

    staged_battler = PLAYER_BATTLER if ATTACKER_SIDE == "player" else OPPONENT_BATTLER
    staged_slot = 0 if ATTACKER_SIDE == "player" else OPPONENT_AI_SLOT
    before = battle_mon(oracle, staged_battler)
    battler_base = oracle.symbols["gBattleMons"] + staged_battler * BATTLE_MON_SIZE
    staged_pp = {
        "fire-punch": 15,
        "faint-attack": 20,
        "rock-slide": 10,
        "double-team": 15,
        "endeavor": 5,
    }[MOVE_NAME]
    write_u16(oracle, battler_base + BATTLE_MON_MOVES + staged_slot * 2, STAGED_MOVE)
    oracle.write_u8(battler_base + BATTLE_MON_PP + staged_slot, staged_pp)
    after = battle_mon(oracle, staged_battler)
    if (
        after["moves"][staged_slot] != STAGED_MOVE
        or after["pp"][staged_slot] != staged_pp
    ):
        raise AssertionError(f"move-slot stage failed: {after}")

    # Keep the normal FIGHT press, move confirmation, and controller pacing.
    for segment in segments[40:43]:
        for _ in range(int(segment["frames"])):
            advance(segment.get("buttons", []))
    # A short input-free animation window is enough to include the move text,
    # the full selected visual task, and post-hit presentation onset.
    for _ in range(1480):
        advance([])

    opposing_battler = (
        OPPONENT_BATTLER
        if staged_battler == PLAYER_BATTLER
        else PLAYER_BATTLER
    )
    effect_battler = staged_battler if MOVE_NAME == "double-team" else opposing_battler
    first_move = next(
        capture
        for capture in captures
        if capture["currentMove"] == STAGED_MOVE
        and capture["attacker"] == staged_battler
        and capture["target"] == effect_battler
    )
    staged_pp = after["pp"][staged_slot]
    pp_spent = next(
        capture
        for capture in captures
        if capture["tick"] > STAGE_TICK
        and capture[
            "player" if staged_battler == PLAYER_BATTLER else "opponent"
        ]["pp"][staged_slot]
        < staged_pp
    )
    target_hp_before = battle_mon(oracle, effect_battler)["maxHp"]
    target_start_hp = first_move[
        "player" if effect_battler == PLAYER_BATTLER else "opponent"
    ]["hp"]
    hp_changed = next(
        (
            capture
            for capture in captures
            if capture[
                "player" if effect_battler == PLAYER_BATTLER else "opponent"
            ]["hp"]
            < target_start_hp
        ),
        None,
    )
    status_changed = next(
        (
            capture
            for capture in captures
            if capture["player" if effect_battler == PLAYER_BATTLER else "opponent"]["status1"] != 0
        ),
        None,
    )
    move_cleared = next(
        (
            capture
            for capture in captures
            if capture["tick"] > first_move["tick"] and capture["currentMove"] == 0
        ),
        None,
    )

    output = {
        "schema": "scene-on-portable-stage/v3",
        "oracleProfile": "battle-scene-on",
        "move": {"name": MOVE_NAME, "id": STAGED_MOVE},
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "construction": {
            "stageTick": STAGE_TICK,
            "boundary": "after canonical action-menu settle; before its FIGHT press",
            "patch": {
                "battler": staged_battler,
                "struct": f"gBattleMons[{staged_battler}]",
                "fields": {
                    f"moves[{staged_slot}]": STAGED_MOVE,
                    f"pp[{staged_slot}]": staged_pp,
                },
            },
            "pair": (
                "ONIX (player-back) -> GROVYLE (opponent-front)"
                if ATTACKER_SIDE == "player"
                else "GROVYLE (opponent-front) -> ONIX (player-back)"
            ),
            "geometry": {
                "attacker": BATTLER_GEOMETRY[staged_battler],
                "opposingBattler": BATTLER_GEOMETRY[opposing_battler],
                "effectBattler": BATTLER_GEOMETRY[effect_battler],
            },
            "relativeReducerEpoch": {
                "oracleFrame": None,
                "age": 0,
                "definition": "resolve from the dense gDoingBattleAnim capture boundary",
            },
            "scope": "synthetic presentation-seam probe; not a Factory-legal party claim",
        },
        "before": before,
        "after": after,
        "outcome": {
            "firstMoveDispatch": first_move["tick"],
            "ppSpent": pp_spent["tick"],
            "targetHp": {
                "before": target_start_hp,
                "after": (
                    hp_changed[
                        "player"
                        if effect_battler == PLAYER_BATTLER
                        else "opponent"
                    ]["hp"]
                    if hp_changed is not None
                    else target_start_hp
                ),
                "tick": hp_changed["tick"] if hp_changed is not None else None,
            },
            "targetStatus": {
                "before": 0,
                "after": (
                    status_changed["player" if effect_battler == PLAYER_BATTLER else "opponent"]["status1"]
                    if status_changed is not None
                    else 0
                ),
                "tick": status_changed["tick"] if status_changed is not None else None,
            },
            "moveCleared": move_cleared["tick"] if move_cleared is not None else None,
            "targetMaxHp": target_hp_before,
        },
        "captures": captures,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
