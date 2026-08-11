#!/usr/bin/env python3
"""Dense Scene-ON source/component/hardware/raw-RGB receipt for Hypnosis."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: hypnosisProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 95


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba", ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, tasks = sy["gSprites"], sy["gTasks"]
    matrices = sy["gOamMatrices"]
    active = names["gAnimScriptActive"]
    script_ptr = names["sBattleAnimScriptPtr"]
    faded = sy["gPlttBufferFaded"]
    unfaded = names["gPlttBufferUnfaded"]
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    se1_info, se2_info = sy["gMPlayInfo_SE1"], sy["gMPlayInfo_SE2"]
    se1_tracks, se2_tracks = sy["gMPlayTrack_SE1"], sy["gMPlayTrack_SE2"]
    template = names["gGoldRingSpriteTemplate"]
    start, end = names["Move_HYPNOSIS"], names["Move_PSYWAVE"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def raw(address: int, size: int) -> list[int]:
        return [oracle.read_u8(address + offset) for offset in range(size)]

    def hexraw(address: int, size: int) -> str:
        return "".join(f"{oracle.read_u8(address + offset):02x}" for offset in range(size))

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def ident(address: int) -> dict:
        address &= ~1
        return {"address": address, "symbol": by_address.get(address)}

    def sound_player(info: int, tracks: int) -> dict:
        return {
            "songHeader": oracle.read_u32(info),
            "status": oracle.read_u32(info + 4),
            "tracks": [{
                "flags": oracle.read_u8(tracks + index * 0x50),
                "panX": s8(tracks + index * 0x50 + 0x15),
            } for index in range(3)],
        }

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 0x1f
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "template": ident(oracle.read_u32(base + 0x14)),
            "callback": ident(oracle.read_u32(base + 0x1c)),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "attr": [u16(base), u16(base + 2), u16(base + 4)],
            "matrixNum": matrix_num,
            "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3e) & 4),
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }

    def live_sprites() -> list[dict]:
        return [
            sprite(slot) for slot in range(64)
            if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1
        ]

    def live_tasks() -> list[dict]:
        return [{
            "slot": slot,
            "func": ident(oracle.read_u32(tasks + slot * 0x28)),
            "data": [s16(tasks + slot * 0x28 + 8 + index * 2) for index in range(16)],
        } for slot in range(16) if oracle.read_u8(tasks + slot * 0x28 + 4)]

    rows: list[dict] = []
    saw_active = False
    done = False
    frame = 0

    def take() -> None:
        nonlocal saw_active, done
        if done:
            return
        snapshot = lab.snapshot()
        script_active = bool(oracle.read_u8(active))
        ptr = oracle.read_u32(script_ptr)
        in_body = start <= ptr < end
        if not saw_active:
            if snapshot["engine"]["currentMove"] != MOVE or not (script_active and in_body):
                return
            saw_active = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        effects = [
            item for item in live_sprites()
            if item["template"]["address"] == template
        ]
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": script_active,
            "battleAnimAttacker": oracle.read_u8(sy["gBattleAnimAttacker"]),
            "battleAnimTarget": oracle.read_u8(sy["gBattleAnimTarget"]),
            "scriptOffset": ptr - start if in_body else None,
            "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(sy["gAnimSoundTaskCount"]),
            "goldRings": effects,
            "tasks": live_tasks(),
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "softwareOam": [hexraw(software_oam + index * 8, 8) for index in range(128)],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "se1": sound_player(se1_info, se1_tracks),
            "se2": sound_player(se2_info, se2_tracks),
            "registers": {
                "dispcnt": u16(0x04000000), "bg1hofs": u16(0x04000014),
                "bg1vofs": u16(0x04000016), "bldcnt": u16(0x04000050),
                "bldalpha": u16(0x04000052), "bldy": u16(0x04000054),
            },
            "battlerState": snapshot["battlers"],
        })
        if saw_active and not script_active:
            done = True

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    if not rows or not done:
        raise RuntimeError("complete Hypnosis body through first inactive cleanup not observed")
    starts = 0
    prior: set[int] = set()
    for row in rows:
        current = {item["slot"] for item in row["goldRings"]}
        starts += len(current - prior)
        prior = current
    if starts != 6:
        raise RuntimeError(f"expected six GoldRing lifecycles, got {starts}")
    OUTPUT.write_text(json.dumps({
        "schema": "hypnosis-dense-evidence/v1",
        "move": MOVE,
        "setup": setup,
        "sourceWindow": {
            "startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
            "frameCount": len(rows),
        },
        "sourceSymbols": {"Move_HYPNOSIS": start, "Move_PSYWAVE": end},
        "lifecycleCounts": {"gGoldRingSpriteTemplate": starts},
        "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} "
        f"({len(rows)} frames), GoldRing {starts}"
    )


if __name__ == "__main__":
    main()
