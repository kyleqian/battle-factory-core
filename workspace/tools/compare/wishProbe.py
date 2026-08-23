#!/usr/bin/env python3
"""Complete legal Scene-ON Wish source/hardware/audio/RGB receipt."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: wishProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    p for p in (ROOT, *ROOT.parents)
    if (p / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba",
        ref / "pokeemerald.map",
        HARNESS / "oracle/bootstrap/factory.json",
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
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active = names["gAnimScriptActive"]
    ptr, wait = names["sBattleAnimScriptPtr"], names["sAnimFramesToWait"]
    start, end = names["Move_WISH"], names["Move_STOCKPILE"]
    tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    software = names["gMain"] + 0x38
    battler_ids = sy["gBattlerSpriteIds"]
    rng2 = sy["gRng2Value"]
    bg_names = tuple(name for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y",
    ) if name in names)
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
    def raw(address, length):
        return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(length))
    def ident(address):
        return {"address": address, "symbol": by_address.get(address & ~1)}
    def sprite(slot):
        base = sprites + slot * 0x44
        matrix = (u16(base + 2) >> 9) & 31
        matrix_address = matrices + matrix * 8
        return {
            "slot": slot,
            "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1c)),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "invisible": (oracle.read_u8(base + 0x3e) >> 2) & 1,
            "animCmdIndex": oracle.read_u8(base + 0x2b),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "matrixNum": matrix,
            "matrix": [s16(matrix_address + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }
    def player(name):
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40), "songHeader": u32(info),
            "songHeaderIdentity": ident(u32(info)),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(track + i * 0x50),
                    "panX": s8(track + i * 0x50 + 0x15),
                    "raw": raw(track + i * 0x50, 0x50),
                }
                for i in range(4)
            ],
        }
    regs = {
        "dispcnt": 0x04000000, "bg0cnt": 0x04000008,
        "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C,
        "bg3cnt": 0x0400000E,
        "bg0hofs": 0x04000010, "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014, "bg1vofs": 0x04000016,
        "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E,
        "win0h": 0x04000040, "win0v": 0x04000044,
        "winin": 0x04000048, "winout": 0x0400004A,
        "mosaic": 0x0400004C, "bldcnt": 0x04000050,
        "bldalpha": 0x04000052, "bldy": 0x04000054,
    }
    rows, frame, started, done = [], 0, False, False

    def take():
        nonlocal started, done
        if done:
            return
        snapshot = lab.snapshot()
        script = u32(ptr)
        if not started:
            if (
                snapshot["engine"]["currentMove"] != 273
                or not oracle.read_u8(active)
                or not (start <= script < end)
            ):
                return
            started = True
        elif not oracle.read_u8(active):
            done = True
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        live = [
            sprite(i) for i in range(64)
            if oracle.read_u8(sprites + i * 0x44 + 0x3e) & 1
        ]
        live_tasks = [
            {
                "slot": i, "raw": raw(base, 0x28),
                "func": ident(u32(base)),
                "data": [s16(base + 8 + j * 2) for j in range(16)],
            }
            for i in range(16)
            if oracle.read_u8((base := tasks + i * 0x28) + 4)
        ]
        attacker = oracle.read_u8(names["gBattleAnimAttacker"])
        target = oracle.read_u8(names["gBattleAnimTarget"])
        ids = [oracle.read_u8(battler_ids + index) for index in range(4)]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "animScriptActive": bool(oracle.read_u8(active)),
            "gAnimScriptActive": oracle.read_u8(active),
            "script": ident(script),
            "scriptPtr": script, "scriptPtrParity": script & 1,
            "scriptOwner": "Move_WISH" if start <= script < end else None,
            "scriptOffset": script - start if start <= script < end else None,
            "scriptWait": s8(wait),
            "animArgs": [s16(names["gBattleAnimArgs"] + i * 2) for i in range(8)],
            "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(sy["gAnimSoundTaskCount"]),
            "rng2Value": u32(rng2),
            "animationRng": u32(rng2),
            "tasks": live_tasks, "sprites": live,
            "spriteFlags": [oracle.read_u8(sprites + i * 0x44 + 0x3e) for i in range(64)],
            "spriteOrder": [oracle.read_u8(names["sSpriteOrder"] + i) for i in range(64)],
            "animationBattlers": {"attacker": attacker, "target": target, "spriteIds": ids},
            "battlerSprites": {"attacker": sprite(ids[attacker]), "target": sprite(ids[target])},
            "battlers": snapshot["battlers"],
            "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "immutableState": {
                key: snapshot[key] for key in (
                    "rngValue", "battleOutcome", "weather", "weatherTurns",
                    "sideStatuses", "sideConditions",
                )
            },
            "playerSprite": sprite(oracle.read_u8(battler_ids)),
            "opponentSprite": sprite(oracle.read_u8(battler_ids + 1)),
            "softwareOam": [raw(software + i * 8, 8) for i in range(128)],
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "softwareMatrices": [
                [s16(matrices + i * 8 + offset) for offset in (0, 2, 4, 6)]
                for i in range(32)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)]
                for i in range(32)
            ],
            "fadedPalette": [
                u16(sy["gPlttBufferFaded"] + i * 2) for i in range(512)
            ],
            "unfadedPalette": [
                u16(sy["gPlttBufferUnfaded"] + i * 2) for i in range(512)
            ],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(tags + i * 2) for i in range(16)],
            "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "registers": {name: u16(address) for name, address in regs.items()},
            "battleBg": {name: s16(names[name]) for name in bg_names},
            "audio": {"SE1": player("SE1"), "SE2": player("SE2")},
            "se1": player("SE1"), "se2": player("SE2"),
        })

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    if not rows or rows[-1]["gAnimScriptActive"]:
        raise RuntimeError("complete Wish source window not observed")
    topology = {
        "tasks": sorted({
            item["func"]["symbol"] for row in rows for item in row["tasks"]
            if item["func"]["symbol"]
        }),
        "templates": sorted({
            item["template"]["symbol"] for row in rows for item in row["sprites"]
            if item["template"]["symbol"]
        }),
        "callbacks": sorted({
            item["callback"]["symbol"] for row in rows for item in row["sprites"]
            if item["callback"]["symbol"]
        }),
    }
    tracked = [
        "gWishStarSpriteTemplate",
        "gMiniTwinklingStarSpriteTemplate",
        "gGrantingStarsSpriteTemplate",
    ]
    lifecycle = {}
    for template in tracked:
        prior, starts = set(), 0
        for row in rows:
            current = {
                item["slot"] for item in row["sprites"]
                if item["template"]["symbol"] == template
            }
            starts += len(current - prior)
            prior = current
        lifecycle[template] = starts
    result = {
        "schema": "wish-dense-evidence/v2", "profile": "battle-scene-on",
        "move": 273, "setup": setup,
        "sourceWindow": {
            "startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
            "frameCount": len(rows),
        },
        "sourceSymbols": {"Move_WISH": start, "Move_STOCKPILE": end},
        "sourcePointerContract": {
            "start": start, "endExclusive": end,
            "observedAddresses": sorted({row["scriptPtr"] for row in rows}),
            "observedParities": sorted({
                row["scriptPtrParity"] for row in rows
                if row["scriptOwner"] == "Move_WISH"
            }),
        },
        "bgSymbols": list(bg_names),
        "lifecycleCounts": lifecycle, "topology": topology, "frames": rows,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} "
        f"({len(rows)} frames), lifecycles {lifecycle}"
    )

if __name__ == "__main__":
    main()
