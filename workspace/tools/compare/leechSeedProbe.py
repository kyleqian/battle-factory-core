#!/usr/bin/env python3
"""Capture independent dense Scene-ON Leech Seed main and natural drain windows."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: leechSeedProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID = 73

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    setup.pop("preCheckpointCaptures", None)
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    (RGB_DIR / "main").mkdir(exist_ok=True)
    (RGB_DIR / "residual").mkdir(exist_ok=True)

    nm_text = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                             check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm_text.splitlines()
             if len(parts := line.split()) == 3
             and all(char in "0123456789abcdefABCDEF" for char in parts[0])]
    nm = {name: address for address, name in pairs}
    by_address = {address & ~1: name for address, name in pairs}
    intervals = {
        "Move_LEECH_SEED": (nm["Move_LEECH_SEED"], nm["Move_EMBER"]),
        "General_LeechSeedDrain": (nm["General_LeechSeedDrain"], nm["General_MonHit"]),
        "Move_ABSORB": (nm["Move_ABSORB"], nm["AbsorbEffect"]),
        "AbsorbEffect": (nm["AbsorbEffect"], nm["Move_MEGA_DRAIN"]),
        "HealingEffect": (nm["HealingEffect"], nm["HealingEffect2"]),
    }
    expected = {
        "Move_LEECH_SEED": (0x082CA083, 0x082CA0D9),
        "General_LeechSeedDrain": (0x082D82FD, 0x082D830B),
        "Move_ABSORB": (0x082D0F9A, 0x082D1009),
        "AbsorbEffect": (0x082D1009, 0x082D10B2),
        "HealingEffect": (0x082D79DF, 0x082D7A28),
    }
    if intervals != expected:
        raise RuntimeError(f"Leech Seed source intervals changed: {intervals!r}")

    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    faded, unfaded = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"]
    battler_ids, software_oam = sy["gBattlerSpriteIds"], nm["gMain"] + 0x38
    active_ptr, script_ptr = nm["gAnimScriptActive"], nm["sBattleAnimScriptPtr"]
    palette_tags, tile_tags = nm["sSpritePaletteTags"], nm["sSpriteTileRangeTags"]
    sprite_order, anim_rng = nm["sSpriteOrder"], nm["gRng2Value"]
    channels = {name.lower(): (sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"])
                for name in ("SE1", "SE2")}
    registers = {
        "dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A,
        "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
        "bg0hofs": 0x04000010, "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014, "bg1vofs": 0x04000016,
        "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E,
        "winin": 0x04000048, "winout": 0x0400004A,
        "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054,
    }

    def u8(address: int) -> int: return oracle.read_u8(address)
    def u16(address: int) -> int: return u8(address) | u8(address + 1) << 8
    def u32(address: int) -> int: return u16(address) | u16(address + 2) << 16
    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value
    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value
    def raw(address: int, size: int) -> str:
        return bytes(u8(address + index) for index in range(size)).hex()
    def ident(address: int) -> dict:
        return {"address": address, "symbol": by_address.get(address & ~1)}
    def owner(pointer: int) -> tuple[str | None, int | None]:
        for name, (start, end) in intervals.items():
            if start <= pointer < end:
                return name, pointer - start
        return None, None
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 31
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {"slot": slot, "raw": raw(base, 0x44),
                "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1C)),
                "attr": [u16(base + offset) for offset in (0, 2, 4)],
                "x": s16(base + 0x20), "y": s16(base + 0x22),
                "x2": s16(base + 0x24), "y2": s16(base + 0x26),
                "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
                "animDelayCounter": u8(base + 0x2C), "invisible": bool(u8(base + 0x3E) & 4),
                "subpriority": u8(base + 0x43), "matrixNum": matrix_num,
                "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
                "data": [s16(base + 0x2E + index * 2) for index in range(8)]}
    def live_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64) if u8(sprites + slot * 0x44 + 0x3E) & 1]
    def live_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4):
                result.append({"slot": slot, "raw": raw(base, 0x28),
                               "func": ident(u32(base)),
                               "data": [s16(base + 8 + index * 2) for index in range(16)]})
        return result
    def audio(info: int, tracks: int) -> dict:
        header = u32(info)
        return {"rawInfo": raw(info, 0x40), "songHeader": header,
                "songHeaderIdentity": ident(header), "status": u32(info + 4),
                "tracks": [{"flags": u8(tracks + index * 0x50),
                            "pan": s8(tracks + index * 0x50 + 0x14),
                            "panX": s8(tracks + index * 0x50 + 0x15),
                            "raw": raw(tracks + index * 0x50, 0x50)} for index in range(4)]}

    windows: dict[str, list[dict]] = {"main": [], "residual": []}
    phase = "waiting-main"
    def capture(frame: int) -> None:
        nonlocal phase
        pointer, active = u32(script_ptr), bool(u8(active_ptr))
        snapshot = lab.snapshot()
        if phase == "waiting-main":
            if (not active or pointer != intervals["Move_LEECH_SEED"][0]
                    or snapshot["engine"]["currentMove"] != MOVE_ID):
                return
            phase = "main"
        elif phase == "waiting-residual":
            residual_owner, _ = owner(pointer)
            seeded = any(mon["volatile"]["leechSeededBy"] is not None
                         for mon in snapshot["battlers"].values())
            if (not active or not seeded
                    or residual_owner not in ("General_LeechSeedDrain", "Move_ABSORB")):
                return
            phase = "residual"
        elif phase == "done":
            return
        name = "main" if phase == "main" else "residual"
        rgb = oracle.screen_rgb()
        (RGB_DIR / name / f"{frame:05d}.rgb").write_bytes(rgb)
        sprites_now, tasks_now = live_sprites(), live_tasks()
        script_owner, script_offset = owner(pointer)
        sprite_ids = [u8(battler_ids + index) for index in range(4)]
        windows[name].append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "animScriptActive": active, "scriptPtr": pointer,
            "scriptOwner": script_owner, "scriptOwnerOffset": script_offset,
            "visualTaskCount": u8(sy["gAnimVisualTaskCount"]),
            "soundTaskCount": u8(sy["gAnimSoundTaskCount"]),
            "animationBattlers": {"attacker": u8(nm["gBattleAnimAttacker"]),
                                  "target": u8(nm["gBattleAnimTarget"]),
                                  "spriteIds": sprite_ids},
            "battleAnimArgs": [u16(nm["gBattleAnimArgs"] + index * 2) for index in range(8)],
            "tasks": tasks_now, "sprites": sprites_now,
            "playerSprite": sprite(sprite_ids[0]), "opponentSprite": sprite(sprite_ids[1]),
            "battlers": snapshot["battlers"], "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "immutableState": {key: snapshot[key] for key in ("rngValue", "battleOutcome",
                "weather", "weatherTurns", "sideStatuses", "sideConditions")},
            "animationRng": u32(anim_rng),
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "spriteOrder": [u8(sprite_order + index) for index in range(64)],
            "softwareMatrices": [[s16(matrices + index * 8 + offset)
                                  for offset in (0, 2, 4, 6)] for index in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset)
                                  for offset in (0, 8, 16, 24)] for index in range(32)],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {key: u16(address) for key, address in registers.items()},
            **{key: audio(info, tracks) for key, (info, tracks) in channels.items()},
        })
        if not active:
            phase = "waiting-residual" if name == "main" else "done"

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    if phase != "done" or not all(windows.values()):
        raise RuntimeError(f"complete main+residual windows not captured: {phase}, "
                           f"{[(key, len(value)) for key, value in windows.items()]}")

    def topology(rows: list[dict]) -> dict:
        return {"templates": sorted({sprite["template"]["symbol"] for row in rows
                                     for sprite in row["sprites"] if sprite["template"]["symbol"]}),
                "callbacks": sorted({sprite["callback"]["symbol"] for row in rows
                                     for sprite in row["sprites"] if sprite["callback"]["symbol"]}),
                "tasks": sorted({task["func"]["symbol"] for row in rows
                                 for task in row["tasks"] if task["func"]["symbol"]})}
    def starts(rows: list[dict], template: str) -> int:
        count, previous = 0, set()
        for row in rows:
            current = {sprite["slot"] for sprite in row["sprites"]
                       if sprite["template"]["symbol"] == template}
            count += len(current - previous)
            previous = current
        return count
    counts = {
        "mainLeechSeeds": starts(windows["main"], "gLeechSeedSpriteTemplate"),
        "residualAbsorptionOrbs": starts(windows["residual"], "gAbsorptionOrbSpriteTemplate"),
        "residualHealingStars": starts(windows["residual"], "gHealingBlueStarSpriteTemplate"),
    }
    if counts != {"mainLeechSeeds": 3, "residualAbsorptionOrbs": 8,
                  "residualHealingStars": 4}:
        raise RuntimeError(f"Leech Seed lifecycle counts changed: {counts}")
    seeded = windows["residual"][0]["battlers"]
    if not any(mon["volatile"]["leechSeededBy"] is not None for mon in seeded.values()):
        raise RuntimeError("residual window lacks natural Leech Seed provenance")
    result = {"schema": "leech-seed-main-residual-dense-evidence/v1", "setup": setup,
              "sourceIntervals": intervals,
              "songHeaders": {key: nm[key] for key in ("se_m_poison_powder", "se_m_tail_whip",
                  "se_m_absorb", "se_m_crabhammer", "se_m_absorb_2")},
              "lifecycleCounts": counts,
              "windows": {key: {"startFrame": rows[0]["frame"],
                                  "endFrame": rows[-1]["frame"], "frameCount": len(rows),
                                  "topology": topology(rows), "frames": rows}
                          for key, rows in windows.items()}}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: main {result['windows']['main']['startFrame']}.."
          f"{result['windows']['main']['endFrame']} ({len(windows['main'])}); residual "
          f"{result['windows']['residual']['startFrame']}.."
          f"{result['windows']['residual']['endFrame']} ({len(windows['residual'])})")

if __name__ == "__main__":
    main()
