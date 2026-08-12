#!/usr/bin/env python3
"""Capture the complete Scene-ON MOVE_METEOR_MASH source window."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: meteorMashProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 309


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
    output = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in output.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    symbols = oracle.symbols
    sprites, matrices, tasks = symbols["gSprites"], symbols["gOamMatrices"], symbols["gTasks"]
    active = names["gAnimScriptActive"]
    pointer = names["sBattleAnimScriptPtr"]
    wait = names["sAnimFramesToWait"]
    start = names["Move_METEOR_MASH"]
    end = names["Move_REVENGE"]
    tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software = names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)

    def u8(address: int) -> int:
        return oracle.read_u8(address)

    def u16(address: int) -> int:
        return u8(address) | u8(address + 1) << 8

    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, count: int) -> str:
        return "".join(f"{u8(address + index):02x}" for index in range(count))

    def ident(address: int) -> dict[str, int | str | None]:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict[str, object]:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1c)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "subpriority": u8(base + 0x2B),
            "invisible": (u8(base + 0x3E) >> 2) & 1,
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }

    def mplay(name: str) -> dict[str, object]:
        info, track = symbols[f"gMPlayInfo_{name}"], symbols[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40),
            "songHeader": u32(info),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": u8(track + index * 0x50),
                    "pan": s8(track + index * 0x50 + 0x14),
                    "panX": s8(track + index * 0x50 + 0x15),
                    "raw": raw(track + index * 0x50, 0x50),
                }
                for index in range(3)
            ],
        }

    regs = {
        "dispcnt": 0x04000000,
        "bg0cnt": 0x04000008,
        "bg1cnt": 0x0400000A,
        "bg2cnt": 0x0400000C,
        "bg3cnt": 0x0400000E,
        "bg0hofs": 0x04000010,
        "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014,
        "bg1vofs": 0x04000016,
        "bg2hofs": 0x04000018,
        "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C,
        "bg3vofs": 0x0400001E,
        "bldcnt": 0x04000050,
        "bldalpha": 0x04000052,
        "bldy": 0x04000054,
    }

    rows: list[dict[str, object]] = []
    seen_moves: set[int] = set()
    frame = 0

    def take() -> None:
        nonlocal frame
        snapshot = lab.snapshot()
        current_move = snapshot["engine"]["currentMove"]
        seen_moves.add(current_move)
        if current_move != MOVE:
            return
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(pointer)
        live = [
            sprite(slot)
            for slot in range(64)
            if u8(sprites + slot * 0x44 + 0x3e) & 1
        ]
        live_tasks = [
            {
                "slot": slot,
                "raw": raw(base, 0x28),
                "func": ident(u32(base)),
                "data": [s16(base + 8 + index * 2) for index in range(16)],
            }
            for slot in range(16)
            if u8((base := tasks + slot * 0x28) + 4)
        ]
        row = {
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": bool(u8(active)),
            "script": ident(script),
            "scriptOffset": script - start if start <= script < end else None,
            "scriptWait": s8(wait),
            "visualTaskCount": u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks,
            "sprites": live,
            "battlers": snapshot["battlers"],
            "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "immutableState": {
                key: snapshot[key]
                for key in ("battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")
            },
            "animationRng": u32(names["gRng2Value"]),
            "softwareOam": [raw(software + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "softwareMatrices": [
                [s16(matrices + index * 8 + offset) for offset in (0, 2, 4, 6)]
                for index in range(32)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "fadedPalette": [u16(symbols["gPlttBufferFaded"] + index * 2) for index in range(512)],
            "unfadedPalette": [u16(symbols["gPlttBufferUnfaded"] + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in regs.items()},
            "se1": mplay("SE1"),
            "se2": mplay("SE2"),
        }
        rows.append(row)

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()

    first = next(
        (
            index
            for index, row in enumerate(rows)
            if row["gAnimScriptActive"] and row["scriptOffset"] is not None
        ),
        None,
    )
    if first is None:
        raise RuntimeError(f"Meteor Mash source pointer not observed; saw {sorted(seen_moves)}")
    last = next(
        (index for index in range(first + 1, len(rows)) if not rows[index]["gAnimScriptActive"]),
        None,
    )
    if last is None:
        raise RuntimeError("Meteor Mash inactive cleanup not observed")
    source = rows[first : last + 1]
    topology = {
        "tasks": sorted({task["func"]["symbol"] for row in source for task in row["tasks"] if task["func"]["symbol"]}),
        "templates": sorted({sprite["template"]["symbol"] for row in source for sprite in row["sprites"] if sprite["template"]["symbol"]}),
        "callbacks": sorted({sprite["callback"]["symbol"] for row in source for sprite in row["sprites"] if sprite["callback"]["symbol"]}),
    }
    def starts(template: str) -> int:
        count, prior = 0, set()
        for row in source:
            current = {
                item["slot"] for item in row["sprites"]
                if item["template"]["symbol"] == template
            }
            count += len(current - prior)
            prior = current
        return count

    lifecycle = {
        "meteorMashStars": starts("gMeteorMashStarSpriteTemplate"),
        "miniTwinklingStars": starts("gMiniTwinklingStarSpriteTemplate"),
        "spinningHands": starts("gSpinningHandOrFootSpriteTemplate"),
        "basicHitsplats": starts("gBasicHitSplatSpriteTemplate"),
    }
    if lifecycle != {
        "meteorMashStars": 3,
        "miniTwinklingStars": 48,
        "spinningHands": 1,
        "basicHitsplats": 1,
    }:
        raise RuntimeError(f"Meteor Mash lifecycle changed: {lifecycle}")
    required = {"AnimTask_ShakeMon2_Step", "AnimMeteorMashStar_Step", "AnimSpinningKickOrPunchFinish"}
    if not required <= set(topology["tasks"]) | set(topology["callbacks"]):
        raise RuntimeError(f"Meteor Mash topology changed: {topology}")
    result = {
        "schema": "meteor-mash-dense-evidence/v1",
        "setup": setup,
        "sourceWindow": {
            "startFrame": source[0]["frame"],
            "endFrame": source[-1]["frame"],
            "frameCount": len(source),
        },
        "sourceSymbols": {"Move_METEOR_MASH": start, "Move_REVENGE": end},
        "topology": topology,
        "lifecycle": lifecycle,
        "frames": source,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")


if __name__ == "__main__":
    main()
