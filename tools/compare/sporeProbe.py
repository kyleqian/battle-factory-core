#!/usr/bin/env python3
"""Complete Scene-ON Spore source/hardware/audio/raw-RGB receipt."""
from __future__ import annotations
import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: sporeProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 147
MOVE_NAME = "Move_SPORE"
END_NAME = "Move_PETAL_DANCE"
TEMPLATE = "gSporeParticleSpriteTemplate"
CALLBACK = "AnimSporeParticle_Step"


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba",
        ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    symbols = oracle.symbols
    sprites = symbols["gSprites"]
    matrices = symbols["gOamMatrices"]
    tasks = symbols["gTasks"]
    active = names["gAnimScriptActive"]
    pointer = names["sBattleAnimScriptPtr"]
    wait = names["sAnimFramesToWait"]
    start = names[MOVE_NAME]
    end = names[END_NAME]
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(size))

    def ident(address: int) -> dict:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1C)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2E + i * 2) for i in range(8)],
        }

    def audio_player(name: str) -> dict:
        info = symbols[f"gMPlayInfo_{name}"]
        track = symbols[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40),
            "songHeader": u32(info),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(track + i * 0x50),
                    "panX": s8(track + i * 0x50 + 0x15),
                    "raw": raw(track + i * 0x50, 0x50),
                }
                for i in range(3)
            ],
        }

    registers = {
        "dispcnt": 0x04000000,
        "bg0cnt": 0x04000008,
        "bg1cnt": 0x0400000A,
        "bg2cnt": 0x0400000C,
        "bg3cnt": 0x0400000E,
        "bldcnt": 0x04000050,
        "bldalpha": 0x04000052,
        "bldy": 0x04000054,
    }
    rows: list[dict] = []
    seen_moves: set[int] = set()
    seen_pointers: set[int] = set()
    frame = 0
    started = False
    done = False

    def take() -> None:
        nonlocal started, done
        if done:
            return
        current_move = lab.snapshot()["engine"]["currentMove"]
        seen_moves.add(current_move)
        script = u32(pointer)
        if current_move == MOVE:
            seen_pointers.add(script)
        if not started:
            if (
                current_move != MOVE
                or not oracle.read_u8(active)
                or not start <= script < end
            ):
                return
            started = True
        elif not oracle.read_u8(active):
            done = True
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        live_sprites = [
            sprite(slot)
            for slot in range(64)
            if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1
        ]
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                live_tasks.append({
                    "slot": slot,
                    "raw": raw(base, 0x28),
                    "func": ident(u32(base)),
                    "data": [s16(base + 8 + i * 2) for i in range(16)],
                })
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": oracle.read_u8(active),
            "script": ident(script),
            "scriptOffset": script - start if start <= script < end else None,
            "scriptWait": s8(wait),
            "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks,
            "sprites": live_sprites,
            "battlers": lab.snapshot()["battlers"],
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)],
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "hardwareMatrices": [
                [s16(0x07000006 + i * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for i in range(32)
            ],
            "fadedPalette": [
                u16(symbols["gPlttBufferFaded"] + i * 2) for i in range(512)
            ],
            "unfadedPalette": [
                u16(symbols["gPlttBufferUnfaded"] + i * 2) for i in range(512)
            ],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)],
            "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "registers": {
                name: u16(address) for name, address in registers.items()
            },
            "se1": audio_player("SE1"),
            "se2": audio_player("SE2"),
        })

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    first = next(
        (
            i for i, row in enumerate(rows)
            if row["gAnimScriptActive"] and row["scriptOffset"] is not None
        ),
        None,
    )
    if first is None:
        raise RuntimeError(
            f"{MOVE_NAME} not observed; moves={sorted(seen_moves)}, "
            f"pointers={[hex(value) for value in sorted(seen_pointers)]}"
        )
    last = next(
        (
            i for i in range(first + 1, len(rows))
            if not rows[i]["gAnimScriptActive"]
        ),
        None,
    )
    if last is None:
        raise RuntimeError(f"{MOVE_NAME} inactive cleanup not observed")
    source = rows[first:last + 1]
    topology = {
        "tasks": sorted({
            item["func"]["symbol"]
            for row in source
            for item in row["tasks"]
            if item["func"]["symbol"]
        }),
        "templates": sorted({
            item["template"]["symbol"]
            for row in source
            for item in row["sprites"]
            if item["template"]["symbol"]
        }),
        "callbacks": sorted({
            item["callback"]["symbol"]
            for row in source
            for item in row["sprites"]
            if item["callback"]["symbol"]
        }),
    }
    starts = 0
    prior: set[int] = set()
    for row in source:
        current = {
            item["slot"]
            for item in row["sprites"]
            if item["template"]["symbol"] == TEMPLATE
        }
        starts += len(current - prior)
        prior = current
    if starts != 9:
        raise RuntimeError(f"{MOVE_NAME} lifecycle changed: spores={starts}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]:
        raise RuntimeError(f"{MOVE_NAME} first cleanup retained animation")
    result = {
        "schema": "spore-dense-evidence/v1",
        "setup": setup,
        "sourceWindow": {
            "startFrame": source[0]["frame"],
            "endFrame": source[-1]["frame"],
            "frameCount": len(source),
        },
        "sourceSymbols": {MOVE_NAME: start, END_NAME: end},
        "templates": {TEMPLATE: names[TEMPLATE]},
        "callbackSymbols": {CALLBACK: names[CALLBACK]},
        "topology": topology,
        "lifecycleCounts": {TEMPLATE: starts},
        "frames": source,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} "
        f"({len(source)} frames), spores {starts}"
    )


if __name__ == "__main__":
    main()
