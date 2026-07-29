#!/usr/bin/env python3
"""Dense Scene-ON software/hardware evidence for legal MOVE_LIGHT_SCREEN."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: lightScreenProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle


def main() -> None:
    request = validate_request(
        json.loads(SCENARIO.read_text()), "battle-scene-on"
    )
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba",
        ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    symbols = oracle.symbols
    sprites = symbols["gSprites"]
    tasks = symbols["gTasks"]
    matrices = symbols["gOamMatrices"]
    battler_ids = symbols["gBattlerSpriteIds"]
    visual_count = symbols["gAnimVisualTaskCount"]
    sound_count = symbols["gAnimSoundTaskCount"]
    faded = symbols["gPlttBufferFaded"]
    unfaded = symbols["gPlttBufferUnfaded"]
    se1 = symbols["gMPlayInfo_SE1"]
    se1_tracks = symbols["gMPlayTrack_SE1"]
    songs = symbols["gSongTable"]
    nm = subprocess.run(
        ["arm-none-eabi-nm", str(ref / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    names = {
        parts[2]: int(parts[0], 16) | 1
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
    }
    palette_tags = names["sSpritePaletteTags"] & ~1
    wall = symbols["gLightScreenWallSpriteTemplate"]
    sparkle = symbols["gSpecialScreenSparkleSpriteTemplate"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 65536 if value >= 32768 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 256 if value >= 128 else value

    def audio_player() -> dict:
        return {
            "songHeader": oracle.read_u32(se1),
            "status": oracle.read_u32(se1 + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(se1_tracks + index * 0x50),
                    "panX": s8(se1_tracks + index * 0x50 + 0x15),
                }
                for index in range(3)
            ],
        }

    def sprite(index: int) -> dict:
        base = sprites + index * 0x44
        matrix = ((u16(base + 2) >> 9) & 31) * 8
        return {
            "slot": index,
            "template": oracle.read_u32(base + 0x14),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "attr": [u16(base), u16(base + 2), u16(base + 4)],
            "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
            "matrix": [s16(matrices + matrix + offset) for offset in (0, 2, 4, 6)],
        }

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []

    def capture(frame: int) -> None:
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != 113:
            return
        active = [
            sprite(index)
            for index in range(64)
            if oracle.read_u8(sprites + index * 0x44 + 0x3E) & 1
        ]
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "effectSprites": [
                item for item in active
                if item["template"] in (wall, sparkle)
            ],
            "activeSpriteSlots": [item["slot"] for item in active],
            "activeTaskSlots": [
                index for index in range(16)
                if oracle.read_u8(tasks + index * 0x28 + 4)
            ],
            "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count),
            "battlers": [
                sprite(oracle.read_u8(battler_ids + index))
                for index in range(2)
            ],
            "oam": [
                [u16(0x07000000 + index * 8 + offset) for offset in (0, 2, 4)]
                for index in range(128)
            ],
            "matrices": [
                [s16(0x07000006 + index * 0x20 + offset)
                 for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "registers": {
                "dispcnt": u16(0x04000000),
                "bldcnt": u16(0x04000050),
                "bldalpha": u16(0x04000052),
            },
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "se1": audio_player(),
            "battle": {
                "player": snapshot["battlers"]["player"],
                "opponent": snapshot["battlers"]["opponent"],
            },
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    if not rows or not any(row["effectSprites"] for row in rows):
        raise RuntimeError("MOVE_LIGHT_SCREEN body not reached")
    OUTPUT.write_text(json.dumps({
        "schema": "light-screen-dense-evidence/v1",
        "setup": setup,
        "songHeader": oracle.read_u32(songs + 207 * 8),
        "templates": {"wall": wall, "sparkle": sparkle},
        "frames": rows,
    }) + "\n")
    print(
        f"wrote {OUTPUT} ({len(rows)} move frames; "
        f"{rows[0]['frame']}..{rows[-1]['frame']})"
    )


if __name__ == "__main__":
    main()
