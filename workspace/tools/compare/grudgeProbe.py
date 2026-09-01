#!/usr/bin/env python3
"""Capture complete bilateral Scene-ON MOVE_GRUDGE source/RGB evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: grudgeProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 288
MOVE_NAME = "Move_GRUDGE"
END_NAME = "Move_CAMOUFLAGE"
TEMPLATE = "gGrudgeFlameSpriteTemplate"


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
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    symbols = oracle.symbols
    sprites, matrices, tasks = symbols["gSprites"], symbols["gOamMatrices"], symbols["gTasks"]
    active, pointer, wait = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"], names["sAnimFramesToWait"]
    start, end = names[MOVE_NAME], names[END_NAME]
    tags, tile_tags, software = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"], names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)

    u8 = lambda address: oracle.read_u8(address)
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return bytes(u8(address + index) for index in range(size)).hex()

    def ident(address: int) -> dict[str, int | str | None]:
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
            "attr": [u16(base + index) for index in (0, 2, 4)],
            "animation": {"animNum": u8(base + 6), "animCmdIndex": u8(base + 7), "animDelayCounter": u8(base + 8)},
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "subpriority": u8(base + 0x43),
            "invisible": bool(u8(base + 0x3E) & 4),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + index) for index in (0, 2, 4, 6)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def audio_player(name: str) -> dict:
        info, track = symbols[f"gMPlayInfo_{name}"], symbols[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40),
            "songHeader": u32(info),
            "songHeaderIdentity": ident(u32(info)),
            "status": u32(info + 4),
            "tracks": [{
                "flags": u8(track + index * 0x50),
                "pan": s8(track + index * 0x50 + 0x14),
                "panX": s8(track + index * 0x50 + 0x15),
                "raw": raw(track + index * 0x50, 0x50),
            } for index in range(3)],
        }

    registers = {
        "dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C,
        "bg3cnt": 0x0400000E, "bg0hofs": 0x04000010, "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014, "bg1vofs": 0x04000016, "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E, "win0h": 0x04000040, "win0v": 0x04000044,
        "winin": 0x04000048, "winout": 0x0400004A, "mosaic": 0x0400004C,
        "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054,
    }
    bg_symbols = tuple(name for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y",
    ) if name in names)

    def row(frame: int, snapshot: dict, write_rgb: bool = True) -> dict:
        rgb = oracle.screen_rgb()
        if write_rgb:
            (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(pointer)
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4):
                live_tasks.append({
                    "slot": slot, "raw": raw(base, 0x28), "func": ident(u32(base)),
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                })
        attacker = u8(names["gBattleAnimAttacker"])
        target = u8(names["gBattleAnimTarget"])
        ids = [u8(names["gBattlerSpriteIds"] + index) for index in range(4)]
        return {
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "animScriptActive": bool(u8(active)), "scriptPtr": script,
            "script": ident(script),
            "scriptOwner": MOVE_NAME if start <= script < end else None,
            "scriptOffset": script - start if start <= script < end else None,
            "scriptWait": s8(wait),
            "visualTaskCount": u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks,
            "sprites": [sprite(slot) for slot in range(64) if u8(sprites + slot * 0x44 + 0x3E) & 1],
            "spriteOrder": [u8(names["sSpriteOrder"] + index) for index in range(64)],
            "animationBattlers": {"attacker": attacker, "target": target, "spriteIds": ids},
            "battlerSprites": {"attacker": sprite(ids[attacker]), "target": sprite(ids[target])},
            "battleBg": {name: s16(names[name]) for name in bg_symbols},
            "animArgs": [s16(names["gBattleAnimArgs"] + index * 2) for index in range(8)],
            "battlers": snapshot["battlers"], "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "immutableState": {key: snapshot[key] for key in (
                "rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions",
            )},
            "animationRng": u32(names["gRng2Value"]),
            "softwareOam": [raw(software + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "softwareMatrices": [[s16(matrices + index * 8 + offset) for offset in (0, 2, 4, 6)] for index in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)] for index in range(32)],
            "fadedPalette": [u16(symbols["gPlttBufferFaded"] + index * 2) for index in range(512)],
            "unfadedPalette": [u16(symbols["gPlttBufferUnfaded"] + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in registers.items()},
            "audio": {"SE1": audio_player("SE1"), "SE2": audio_player("SE2")},
        }

    rows: list[dict] = []
    seen_moves: set[int | None] = set()
    seen_pointers: set[int] = set()
    move_events: list[dict] = []
    started = False
    done = False
    entry_predecessor: dict | None = None
    frame = 0

    def take() -> None:
        nonlocal started, done, entry_predecessor
        if done:
            return
        snapshot = lab.snapshot()
        script = u32(pointer)
        seen_moves.add(snapshot["engine"].get("currentMove"))
        seen_pointers.add(script)
        if snapshot["engine"].get("currentMove") == MOVE and len(move_events) < 12:
            move_events.append({
                "frame": frame, "pointer": hex(script), "active": bool(u8(active)),
                "attacker": u8(names["gBattleAnimAttacker"]), "target": u8(names["gBattleAnimTarget"]),
                "battlers": snapshot["battlers"],
            })
        if not started:
            if snapshot["engine"].get("currentMove") != MOVE or not u8(active) or not (start <= script < end):
                entry_predecessor = row(frame, snapshot, write_rgb=False)
                return
            started = True
        elif not u8(active):
            done = True
        rows.append(row(frame, snapshot))

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    if not rows or not done or entry_predecessor is None:
        raise RuntimeError(f"{MOVE_NAME} complete source window not observed: rows={len(rows)}, moves={sorted(seen_moves, key=lambda value: -1 if value is None else value)}, pointers={[hex(value) for value in sorted(seen_pointers)]}, events={json.dumps(move_events, separators=(',', ':'))}")
    topology = {
        "tasks": sorted({task["func"]["symbol"] for item in rows for task in item["tasks"] if task["func"]["symbol"]}),
        "templates": sorted({sprite["template"]["symbol"] for item in rows for sprite in item["sprites"] if sprite["template"]["symbol"]}),
        "callbacks": sorted({sprite["callback"]["symbol"] for item in rows for sprite in item["sprites"] if sprite["callback"]["symbol"]}),
    }
    creations = 0
    prior: set[int] = set()
    for item in rows:
        current = {entry["slot"] for entry in item["sprites"] if entry["template"]["symbol"] == TEMPLATE}
        creations += len(current - prior)
        prior = current
    if creations != 6:
        raise RuntimeError(f"Grudge lifecycle changed: {creations} creations")
    if rows[-1]["animScriptActive"] or rows[-1]["visualTaskCount"] or rows[-1]["soundTaskCount"]:
        raise RuntimeError("Grudge first inactive cleanup retained animation work")
    pointer_parity = sorted({item["scriptPtr"] & 1 for item in rows if item["scriptOwner"] == MOVE_NAME})
    result = {
        "schema": "grudge-dense-evidence/v1", "profile": "battle-scene-on", "move": MOVE,
        "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)},
        "sourceSymbols": {name: names[name] for name in (
            MOVE_NAME, END_NAME, TEMPLATE, "AnimTask_GrudgeFlames", "AnimTask_GrudgeFlames_Step", "AnimGrudgeFlame",
            "DestroySprite", "se_m_psybeam", "se_m_ember", "se_m_nightmare",
        )},
        "topology": topology, "lifecycleCounts": {TEMPLATE: creations},
        "observedPointerParities": pointer_parity,
        "bgSymbols": list(bg_symbols),
        "sourceEntryPredecessor": entry_predecessor,
        "frames": rows,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames), lifecycle {{{TEMPLATE}: {creations}}}, pointer parities {pointer_parity}")


if __name__ == "__main__":
    main()
