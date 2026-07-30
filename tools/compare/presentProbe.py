#!/usr/bin/env python3
"""Complete Scene-ON Present source/hardware/audio/raw-RGB receipt."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) not in (4, 5):
    raise SystemExit("usage: presentProbe.py <scenario> <output.json> <rgb-dir> [occurrence]")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:4])
OCCURRENCE = int(sys.argv[4]) if len(sys.argv) == 5 else 1
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 217
MOVE_NAME = "Move_PRESENT"
END_NAME = "Move_BATON_PASS"
BAG = "gPresentSpriteTemplate"
PARTICLE = "gPresentHealParticleSpriteTemplate"
EXPLOSION = "gExplosionSpriteTemplate"
HEALING_STAR = "gHealingBlueStarSpriteTemplate"
CALLBACKS = (
    "AnimPresent", "AnimItemSteal_Step1", "AnimItemSteal_Step2",
    "AnimPresentHealParticle", "AnimTask_IsHealingMove",
)


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba", ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(c in "0123456789abcdefABCDEF" for c in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    symbols = oracle.symbols
    sprites, matrices, tasks = (
        symbols["gSprites"], symbols["gOamMatrices"], symbols["gTasks"],
    )
    active, pointer, wait = (
        names["gAnimScriptActive"], names["sBattleAnimScriptPtr"],
        names["sAnimFramesToWait"],
    )
    start, end = names[MOVE_NAME], names[END_NAME]
    palette_tags, tile_tags = (
        names["sSpritePaletteTags"], names["sSpriteTileRangeTags"],
    )
    palette_fade = names["gPaletteFade"]
    main_struct = names["gMain"]
    software_oam = main_struct + 0x38
    RGB.mkdir(parents=True, exist_ok=True)

    def u16(address):
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def u32(address):
        return u16(address) | u16(address + 2) << 16

    def s16(address):
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address):
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address, size):
        return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(size))

    def ident(address):
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot):
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot, "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1c)),
            "attr": [u16(base + i) for i in (0, 2, 4)],
            "pos": [s16(base + i) for i in (0x20, 0x22, 0x24, 0x26)],
            "flags": oracle.read_u8(base + 0x3E),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + i) for i in (0, 2, 4, 6)],
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "data": [s16(base + 0x2E + i * 2) for i in range(8)],
        }

    def audio_player(name):
        info, track = symbols[f"gMPlayInfo_{name}"], symbols[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40), "songHeader": u32(info),
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

    regs = {
        "dispcnt": 0x04000000, "dispstat": 0x04000004,
        "vcount": 0x04000006, "bg0cnt": 0x04000008,
        "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C,
        "bg3cnt": 0x0400000E, "bg0hofs": 0x04000010,
        "bg0vofs": 0x04000012, "bg1hofs": 0x04000014,
        "bg1vofs": 0x04000016, "bg2hofs": 0x04000018,
        "bg2vofs": 0x0400001A, "bg3hofs": 0x0400001C,
        "bg3vofs": 0x0400001E, "winin": 0x04000048,
        "winout": 0x0400004A, "mosaic": 0x0400004C,
        "bldcnt": 0x04000050, "bldalpha": 0x04000052,
        "bldy": 0x04000054,
    }
    rows, seen_moves, seen_pointers = [], set(), set()
    frame, started, done, occurrences, was_candidate = 0, False, False, 0, False

    def take():
        nonlocal started, done, occurrences, was_candidate
        if done:
            return
        snapshot = lab.snapshot()
        current_move = snapshot["engine"]["currentMove"]
        seen_moves.add(current_move)
        script = u32(pointer)
        if current_move == MOVE:
            seen_pointers.add(script)
        candidate = current_move == MOVE and oracle.read_u8(active) and start <= script < end
        if candidate and not was_candidate:
            occurrences += 1
        was_candidate = candidate
        if not started:
            if not candidate or occurrences != OCCURRENCE:
                return
            started = True
        elif not oracle.read_u8(active):
            done = True
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        live_sprites = [
            sprite(slot) for slot in range(64)
            if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1
        ]
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                live_tasks.append({
                    "slot": slot, "raw": raw(base, 0x28),
                    "func": ident(u32(base)),
                    "data": [s16(base + 8 + i * 2) for i in range(16)],
                })
        script = u32(pointer)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": oracle.read_u8(active),
            "script": ident(script),
            "scriptOffset": script - start if start <= script < end else None,
            "scriptWait": s8(wait),
            "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks, "sprites": live_sprites,
            "battlers": snapshot["battlers"],
            "mainCallbacks": {
                "callback1": ident(u32(main_struct)),
                "callback2": ident(u32(main_struct + 4)),
                "vblank": ident(u32(main_struct + 0x0C)),
                "hblank": ident(u32(main_struct + 0x10)),
                "vcount": ident(u32(main_struct + 0x14)),
                "oamLoadDisabled": oracle.read_u8(main_struct + 0x439) & 1,
            },
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)],
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "hardwareMatrices": [
                [s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)]
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
            "paletteFade": {
                "raw": raw(palette_fade, 12),
                "selectedPalettes": u32(palette_fade),
                "word1": u32(palette_fade + 4),
                "word2": u32(palette_fade + 8),
                "y": (u32(palette_fade + 4) >> 6) & 31,
                "targetY": (u32(palette_fade + 4) >> 11) & 31,
                "active": (u32(palette_fade + 4) >> 31) & 1,
                "objPaletteToggle": (u32(palette_fade + 8) >> 17) & 1,
                "deltaY": (u32(palette_fade + 8) >> 18) & 15,
            },
            "registers": {name: u16(address) for name, address in regs.items()},
            "se1": audio_player("SE1"), "se2": audio_player("SE2"),
        })

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    first = next(
        (i for i, row in enumerate(rows)
         if row["gAnimScriptActive"] and row["scriptOffset"] is not None),
        None,
    )
    if first is None:
        raise RuntimeError(
            f"{MOVE_NAME} occurrence {OCCURRENCE} not observed; moves={sorted(seen_moves)}, "
            f"pointers={[hex(value) for value in sorted(seen_pointers)]}",
        )
    last = next(
        (i for i in range(first + 1, len(rows))
         if not rows[i]["gAnimScriptActive"]),
        None,
    )
    if last is None:
        raise RuntimeError(f"{MOVE_NAME} inactive cleanup not observed")
    source = rows[first:last + 1]
    topology = {
        key: sorted({
            item[field]["symbol"] if field else item["func"]["symbol"]
            for row in source for item in row[collection]
            if (item[field]["symbol"] if field else item["func"]["symbol"])
        })
        for key, collection, field in (
            ("tasks", "tasks", None),
            ("templates", "sprites", "template"),
            ("callbacks", "sprites", "callback"),
        )
    }

    def starts_for(template):
        starts, prior = 0, set()
        for row in source:
            current = {
                item["slot"] for item in row["sprites"]
                if item["template"]["symbol"] == template
            }
            starts += len(current - prior)
            prior = current
        return starts

    lifecycles = {
        BAG: starts_for(BAG), PARTICLE: starts_for(PARTICLE),
        EXPLOSION: starts_for(EXPLOSION), HEALING_STAR: starts_for(HEALING_STAR),
    }
    if (lifecycles[BAG] != 1 or lifecycles[PARTICLE] not in (0, 9)
            or lifecycles[EXPLOSION] not in (0, 5)
            or lifecycles[HEALING_STAR] not in (0, 4)):
        raise RuntimeError(f"{MOVE_NAME} lifecycle changed: {lifecycles}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]:
        raise RuntimeError(f"{MOVE_NAME} first cleanup retained animation")
    result = {
        "schema": "present-dense-evidence/v1", "setup": setup,
        "sourceWindow": {
            "startFrame": source[0]["frame"], "endFrame": source[-1]["frame"],
            "frameCount": len(source),
        },
        "sourceSymbols": {MOVE_NAME: start, END_NAME: end},
        "templates": {name: names[name] for name in (BAG, PARTICLE, EXPLOSION)},
        "callbackSymbols": {name: names[name] for name in CALLBACKS},
        "occurrence": OCCURRENCE, "topology": topology, "lifecycleCounts": lifecycles, "frames": source,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} "
        f"({len(source)} frames), lifecycles {lifecycles}",
    )


if __name__ == "__main__":
    main()
