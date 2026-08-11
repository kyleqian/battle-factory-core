#!/usr/bin/env python3
"""Dense Scene-ON software/hardware/audio/RGB evidence for legal SLAM bodies."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: bodySlamProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    p for p in (ROOT, *ROOT.parents)
    if (p / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_BODY_SLAM = 34
MOVE_SLAM = 21
MOVE_SECRET_POWER = 290


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba", reference / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    script_active = oracle.symbols["gAnimScriptActive"]
    anim_attacker = oracle.symbols["gBattleAnimAttacker"]
    anim_target = oracle.symbols["gBattleAnimTarget"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se2_info = oracle.symbols["gMPlayInfo_SE2"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    se2_tracks = oracle.symbols["gMPlayTrack_SE2"]
    song_table = oracle.symbols["gSongTable"]
    nm = subprocess.run(
        ["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    symbols = {
        parts[2]: int(parts[0], 16) | 1
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
    }
    names = {
        parts[2]: int(parts[0], 16)
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(c in "0123456789abcdefABCDEF" for c in parts[0])
    }
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    unfaded = names["gPlttBufferUnfaded"]
    templates = {
        name: oracle.symbols[name]
        for name in (
            "gVerticalDipSpriteTemplate", "gSlideMonToOffsetSpriteTemplate",
            "gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate",
            "gSlamHitSpriteTemplate",
        )
    }
    is_secret_power = any(
        mon["moves"][0] == MOVE_SECRET_POWER
        for party in request["overrides"]["parties"].values()
        for mon in party
    )
    task_names = ["AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step"]
    if is_secret_power:
        task_names.extend((
            "AnimTask_ShakeAndSinkMon", "AnimTask_ShakeAndSinkMon_Step",
            "AnimTask_TranslateMonEllipticalRespectSide",
            "AnimTask_TranslateMonElliptical",
            "AnimTask_TranslateMonElliptical_Step",
            "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        ))
    task_funcs = {
        name: symbols[name]
        for name in task_names
    }

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(size))

    def sound_player(info: int, tracks: int) -> dict:
        return {
            "songHeader": oracle.read_u32(info),
            "status": oracle.read_u32(info + 4),
            "tracks": [{
                "flags": oracle.read_u8(tracks + i * 0x50),
                "panX": s8(tracks + i * 0x50 + 0x15),
            } for i in range(3)],
        }

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 0x1f
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot, "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1c),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "attr0": u16(base), "attr1": u16(base + 2), "attr2": u16(base + 4),
            "matrixNum": matrix_num, "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3e) & 4),
            "matrix": {
                "a": s16(matrix), "b": s16(matrix + 2),
                "c": s16(matrix + 4), "d": s16(matrix + 6),
            },
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                result.append({
                    "slot": slot, "func": oracle.read_u32(base),
                    "data": [s16(base + 8 + i * 2) for i in range(16)],
                })
        return result

    RGB_DIR.mkdir(parents=True)
    frames = []
    observed_move = None

    def capture(frame: int) -> None:
        nonlocal observed_move
        snapshot = lab.snapshot()
        current_move = snapshot["engine"]["currentMove"]
        if current_move not in (MOVE_SLAM, MOVE_BODY_SLAM, MOVE_SECRET_POWER):
            return
        if observed_move is not None and observed_move != current_move:
            raise RuntimeError(
                f"probe crossed move boundary {observed_move}->{current_move}"
            )
        observed_move = current_move
        effects = []
        for slot in range(64):
            if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1:
                item = sprite(slot)
                if item["template"] in templates.values():
                    effects.append(item)
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        frames.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "battleAnimAttacker": oracle.read_u8(anim_attacker),
            "battleAnimTarget": oracle.read_u8(anim_target),
            "player": snapshot["battlers"]["player"],
            "opponent": snapshot["battlers"]["opponent"],
            "playerSprite": battler(0), "opponentSprite": battler(1),
            "sprites": effects, "tasks": active_tasks(),
            "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count),
            "animScriptActive": bool(oracle.read_u8(script_active)),
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "softwareOam": [
                raw(software_oam + i * 8, 8) for i in range(128)
            ],
            "hardwareOam": [
                [u16(0x07000000 + i * 8 + offset) for offset in (0, 2, 4)]
                for i in range(128)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + i * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for i in range(32)
            ],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)],
            "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "se1": sound_player(se1_info, se1_tracks),
            "se2": sound_player(se2_info, se2_tracks),
            "dispcnt": u16(0x04000000), "bldcnt": u16(0x04000050),
            "bldalpha": u16(0x04000052), "bldy": u16(0x04000054),
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    if not frames:
        raise RuntimeError(
            "stock ROM did not reach MOVE_SLAM/MOVE_BODY_SLAM/MOVE_SECRET_POWER"
        )
    schema = {
        MOVE_SLAM: "slam-dense-evidence/v2",
        MOVE_BODY_SLAM: "body-slam-dense-evidence/v2",
        MOVE_SECRET_POWER: "secret-power-strength-dense-evidence/v1",
    }[observed_move]
    OUTPUT.write_text(json.dumps({
        "schema": schema, "move": observed_move, "setup": setup,
        "templates": templates, "taskFuncs": task_funcs,
        "songHeaders": {
            "SE_M_COMET_PUNCH": oracle.read_u32(song_table + 139 * 8),
            "SE_M_TAKE_DOWN": oracle.read_u32(song_table + 152 * 8),
            "SE_M_MEGA_KICK2": oracle.read_u32(song_table + 141 * 8),
        },
        "frames": frames,
    }) + "\n")
    print(
        f"wrote {OUTPUT} ({len(frames)} current-move frames; "
        f"{frames[0]['frame']}..{frames[-1]['frame']})"
    )


main()
