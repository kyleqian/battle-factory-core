#!/usr/bin/env python3
"""Run a checked-in Battle Lab scenario locally and capture dense raw RGB.

This is the mGBA-backed fallback for oracle services started before the
additive ``/v1/battle-lab/run`` route was installed. Run it only through
``tools/run-mgba-probe.py`` so a validated JSON result distinguishes the
known mGBA teardown crash from a failed probe.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


if len(sys.argv) != 4:
    raise SystemExit(
        f"usage: {sys.argv[0]} <scenario.json> <fresh-output.json> <fresh-rgb-dir>"
    )

SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
RGB_DIR = Path(sys.argv[3])
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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    profile = scenario.get("profile", "battle-scene-on")
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    bootstrap = ORACLE_DIR / "bootstrap" / (
        "factory.json"
        if profile == "battle-scene-on"
        else "factory-battle-scene-off.json"
    )
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        bootstrap,
    )
    request = validate_request(scenario, profile)
    lab = BattleLab(oracle, profile)
    setup = lab.prepare(request)
    RGB_DIR.mkdir()

    records = []
    sprites = oracle.symbols["gSprites"]
    oam_matrices = oracle.symbols["gOamMatrices"]
    feather_template = oracle.symbols["gFallingFeatherSpriteTemplate"]
    battle_mons = oracle.symbols["gBattleMons"]
    battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]

    def s16(addr: int) -> int:
        value = oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)
        return value - 0x10000 if value >= 0x8000 else value

    def feather_record(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (oracle.read_u8(base + 3) >> 1) & 0x1F
        matrix_base = oam_matrices + matrix_num * 8
        return {
            "slot": slot,
            "tileNum": oracle.read_u8(base + 4)
            | ((oracle.read_u8(base + 5) & 0x3) << 8),
            "paletteNum": (oracle.read_u8(base + 5) >> 4) & 0xF,
            "priority": (oracle.read_u8(base + 5) >> 2) & 0x3,
            "animNum": oracle.read_u8(base + 0x2A),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "a": s16(matrix_base),
            "b": s16(matrix_base + 2),
            "c": s16(matrix_base + 4),
            "d": s16(matrix_base + 6),
        }

    def battler_sprite_record(battler: int) -> dict:
        slot = oracle.read_u8(battler_sprite_ids + battler)
        base = sprites + slot * 0x44
        return {
            "slot": slot,
            "tileNum": oracle.read_u8(base + 4)
            | ((oracle.read_u8(base + 5) & 0x3) << 8),
            "paletteNum": (oracle.read_u8(base + 5) >> 4) & 0xF,
            "priority": (oracle.read_u8(base + 5) >> 2) & 0x3,
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
        }

    def capture(frame: int) -> None:
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        snapshot = lab.snapshot()
        feather_sprites = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if (
                oracle.read_u8(base + 0x3E) & 1
                and oracle.read_u32(base + 0x14) == feather_template
            ):
                feather_sprites.append(feather_record(slot))
        records.append(
            {
                "frame": frame,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "currentMove": snapshot["engine"]["currentMove"],
                "controllerExecFlags": snapshot["engine"]["controllerExecFlags"],
                "playerControllerCommand": snapshot["engine"]["playerControllerCommand"],
                "opponentControllerCommand": snapshot["engine"]["opponentControllerCommand"],
                "player": snapshot["battlers"]["player"],
                "opponent": snapshot["battlers"]["opponent"],
                "playerPersonality": oracle.read_u32(battle_mons + 0x48),
                "opponentPersonality": oracle.read_u32(battle_mons + 0x58 + 0x48),
                "playerSprite": battler_sprite_record(0),
                "opponentSprite": battler_sprite_record(1),
                "featherSprites": feather_sprites,
            }
        )

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "schema": "battle-lab-dense-rgb/v1",
                "profile": profile,
                "setup": setup,
                "frames": records,
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
