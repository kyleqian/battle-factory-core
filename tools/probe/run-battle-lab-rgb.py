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
    sand_attack_dirt_template = oracle.symbols["gSandAttackDirtSpriteTemplate"]
    mud_slap_mud_template = oracle.symbols["gMudSlapMudSpriteTemplate"]
    fly_ball_up_template = oracle.symbols["gFlyBallUpSpriteTemplate"]
    fly_ball_attack_template = oracle.symbols["gFlyBallAttackSpriteTemplate"]
    bounce_ball_shrink_template = oracle.symbols["gBounceBallShrinkSpriteTemplate"]
    bounce_ball_land_template = oracle.symbols["gBounceBallLandSpriteTemplate"]
    basic_hitsplat_template = oracle.symbols["gBasicHitSplatSpriteTemplate"]
    dragon_breath_fire_template = oracle.symbols["gDragonBreathFireSpriteTemplate"]
    flamethrower_flame_template = oracle.symbols["gFlamethrowerFlameSpriteTemplate"]
    speed_dust_template = oracle.symbols["gSpeedDustSpriteTemplate"]
    battle_mons = oracle.symbols["gBattleMons"]
    battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    pltt_unfaded = oracle.symbols["gPlttBufferUnfaded"]
    pltt_faded = oracle.symbols["gPlttBufferFaded"]
    oam_buffer = oracle.symbols["gMain"] + 0x38
    sprite_order = 0x020217F4  # EWRAM static sSpriteOrder (ELF symbol)

    def s16(addr: int) -> int:
        value = oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)
        return value - 0x10000 if value >= 0x8000 else value

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def feather_record(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (oracle.read_u8(base + 3) >> 1) & 0x1F
        matrix_base = oam_matrices + matrix_num * 8
        return {
            "slot": slot,
            "oamX": u16(base + 2) & 0x1FF,
            "oamY": u16(base) & 0xFF,
            "subpriority": oracle.read_u8(base + 0x43),
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

    def sand_attack_dirt_record(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {
            "slot": slot,
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def battler_sprite_record(battler: int) -> dict:
        slot = oracle.read_u8(battler_sprite_ids + battler)
        base = sprites + slot * 0x44
        attr0 = u16(base)
        attr1 = u16(base + 2)
        matrix_num = (attr1 >> 9) & 0x1F
        matrix_base = oam_matrices + matrix_num * 8
        palette_num = (oracle.read_u8(base + 5) >> 4) & 0xF
        return {
            "slot": slot,
            "tileNum": oracle.read_u8(base + 4)
            | ((oracle.read_u8(base + 5) & 0x3) << 8),
            "paletteNum": palette_num,
            "priority": (oracle.read_u8(base + 5) >> 2) & 0x3,
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "affineMode": (attr0 >> 8) & 0x3,
            "matrixNum": matrix_num,
            "matrix": {
                "a": s16(matrix_base),
                "b": s16(matrix_base + 2),
                "c": s16(matrix_base + 4),
                "d": s16(matrix_base + 6),
            },
            "paletteUnfaded": [
                u16(pltt_unfaded + (0x100 + palette_num * 16 + index) * 2)
                for index in range(16)
            ],
            "paletteFaded": [
                u16(pltt_faded + (0x100 + palette_num * 16 + index) * 2)
                for index in range(16)
            ],
        }

    def capture(frame: int) -> None:
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        snapshot = lab.snapshot()
        feather_sprites = []
        sand_attack_dirt_sprites = []
        mud_slap_mud_sprites = []
        fly_sprites = []
        bounce_sprites = []
        basic_hitsplat_sprites = []
        dragon_breath_fire_sprites = []
        flamethrower_flame_sprites = []
        speed_dust_sprites = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if not (oracle.read_u8(base + 0x3E) & 1):
                continue
            template = oracle.read_u32(base + 0x14)
            if template == feather_template:
                feather_sprites.append(feather_record(slot))
            elif template == sand_attack_dirt_template:
                sand_attack_dirt_sprites.append(sand_attack_dirt_record(slot))
            elif template == mud_slap_mud_template:
                mud_slap_mud_sprites.append(sand_attack_dirt_record(slot))
            elif template in (fly_ball_up_template, fly_ball_attack_template):
                fly_sprites.append({
                    **feather_record(slot),
                    "kind": (
                        "charge"
                        if template == fly_ball_up_template
                        else "strike"
                    ),
                })
            elif template in (bounce_ball_shrink_template, bounce_ball_land_template):
                bounce_sprites.append({
                    **feather_record(slot),
                    "kind": (
                        "charge"
                        if template == bounce_ball_shrink_template
                        else "strike"
                    ),
                })
            elif template == basic_hitsplat_template:
                basic_hitsplat_sprites.append(feather_record(slot))
            elif template == dragon_breath_fire_template:
                dragon_breath_fire_sprites.append(feather_record(slot))
            elif template == flamethrower_flame_template:
                flamethrower_flame_sprites.append(feather_record(slot))
            elif template == speed_dust_template:
                speed_dust_sprites.append(feather_record(slot))
        sand_attack_dirt_oam = []
        if sand_attack_dirt_sprites:
            dirt_base = sprites + sand_attack_dirt_sprites[0]["slot"] * 0x44
            dirt_tile = u16(dirt_base + 4) & 0x3FF
            dirt_palette = (u16(dirt_base + 4) >> 12) & 0xF
            for index in range(128):
                base = oam_buffer + index * 8
                a0 = u16(base)
                a1 = u16(base + 2)
                a2 = u16(base + 4)
                if (a2 & 0x3FF) != dirt_tile or ((a2 >> 12) & 0xF) != dirt_palette:
                    continue
                sand_attack_dirt_oam.append({
                    "index": index,
                    "x": a1 & 0x1FF,
                    "y": a0 & 0xFF,
                })
        mud_slap_mud_oam = []
        if mud_slap_mud_sprites:
            mud_base = sprites + mud_slap_mud_sprites[0]["slot"] * 0x44
            mud_tile = u16(mud_base + 4) & 0x3FF
            mud_palette = (u16(mud_base + 4) >> 12) & 0xF
            for index in range(128):
                base = oam_buffer + index * 8
                a0 = u16(base)
                a1 = u16(base + 2)
                a2 = u16(base + 4)
                if (a2 & 0x3FF) != mud_tile or ((a2 >> 12) & 0xF) != mud_palette:
                    continue
                mud_slap_mud_oam.append({
                    "index": index,
                    "x": a1 & 0x1FF,
                    "y": a0 & 0xFF,
                })
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
                "sandAttackDirtSprites": sand_attack_dirt_sprites,
                "sandAttackDirtOam": sand_attack_dirt_oam,
                "mudSlapMudSprites": mud_slap_mud_sprites,
                "mudSlapMudOam": mud_slap_mud_oam,
                "flySprites": fly_sprites,
                "bounceSprites": bounce_sprites,
                "basicHitsplatSprites": basic_hitsplat_sprites,
                "dragonBreathFireSprites": dragon_breath_fire_sprites,
                "flamethrowerFlameSprites": flamethrower_flame_sprites,
                "speedDustSprites": speed_dust_sprites,
                "bg3X": s16(oracle.symbols["gBattle_BG3_X"]),
                "bg3Y": s16(oracle.symbols["gBattle_BG3_Y"]),
                "bg3cnt": u16(0x0400000E),
                "bg3hofs": u16(0x0400001C),
                "bg3vofs": u16(0x0400001E),
                "bgPalette2Faded": [
                    u16(pltt_faded + (2 * 16 + index) * 2)
                    for index in range(16)
                ],
                "bldcnt": oracle.read_u8(0x04000050)
                | (oracle.read_u8(0x04000051) << 8),
                "bldalpha": oracle.read_u8(0x04000052)
                | (oracle.read_u8(0x04000053) << 8),
                "bldy": oracle.read_u8(0x04000054)
                | (oracle.read_u8(0x04000055) << 8),
                "spriteOrder": [
                    oracle.read_u8(sprite_order + index) for index in range(64)
                ],
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
