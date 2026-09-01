#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_SWEET_SCENT state and raw RGB evidence."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: sweetScentProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = int(os.environ.get("POKEBENCH_ANIM_PROBE_MOVE_ID", "230"))
MOVE_NAME = os.environ.get("POKEBENCH_ANIM_PROBE_MOVE_NAME", "Move_SWEET_SCENT")
END_NAME = os.environ.get("POKEBENCH_ANIM_PROBE_END_NAME", "Move_HYPER_BEAM")
SCHEMA = os.environ.get("POKEBENCH_ANIM_PROBE_SCHEMA", "sweet-scent-dense-evidence/v1")
EXTRA_SYMBOLS = tuple(filter(None, os.environ.get(
    "POKEBENCH_ANIM_PROBE_SYMBOLS",
    "SweetScentEffect,gSweetScentPetalSpriteTemplate,AnimSweetScentPetal,AnimSweetScentPetal_Step,AnimTask_BlendColorCycleByTag,AnimTask_BlendColorCycleByTagLoop",
).split(",")))
REPEATED_BODIES = os.environ.get("POKEBENCH_ANIM_PROBE_REPEATED_BODIES") == "1"
EXTRA_FRAMES = int(os.environ.get("POKEBENCH_ANIM_PROBE_EXTRA_FRAMES", "0"))


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    start, end = names[MOVE_NAME], names[END_NAME]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    software_oam, palette_tags, tile_tags = names["gMain"] + 0x38, names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
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
        return bytes(u8(address + offset) for offset in range(size)).hex()

    def ident(address: int) -> dict:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot, "raw": raw(base, 0x44), "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1C)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)], "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26), "animNum": u8(base + 0x2A),
            "animCmdIndex": u8(base + 0x2B), "animDelayCounter": u8(base + 0x2C),
            "subpriority": u8(base + 0x43), "flags": u8(base + 0x3E), "invisible": bool(u8(base + 0x3E) & 4),
            "matrixNum": matrix_num, "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def live_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64) if u8(sprites + slot * 0x44 + 0x3E) & 1]

    def live_tasks() -> list[dict]:
        return [{"slot": slot, "raw": raw(tasks + slot * 0x28, 0x28), "func": ident(u32(tasks + slot * 0x28)),
                 "data": [s16(tasks + slot * 0x28 + 8 + index * 2) for index in range(16)]}
                for slot in range(16) if u8(tasks + slot * 0x28 + 4)]

    def mplay(name: str) -> dict:
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"songHeader": u32(info), "songHeaderIdentity": ident(u32(info)), "status": u32(info + 4),
                "tracks": [{"flags": u8(track + i * 0x50), "pan": s8(track + i * 0x50 + 0x14),
                            "panX": s8(track + i * 0x50 + 0x15), "raw": raw(track + i * 0x50, 0x50)} for i in range(4)]}

    regs = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C,
            "bg3cnt": 0x0400000E, "bg0hofs": 0x04000010, "bg0vofs": 0x04000012, "bg1hofs": 0x04000014,
            "bg1vofs": 0x04000016, "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A, "bg3hofs": 0x0400001C,
            "bg3vofs": 0x0400001E, "win0h": 0x04000040, "win0v": 0x04000044, "winin": 0x04000048,
            "winout": 0x0400004A, "mosaic": 0x0400004C, "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}
    bg_names = tuple(name for name in ("gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y") if name in names)

    def row(frame: int, snapshot: dict) -> dict:
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(pointer)
        attacker, target = u8(names["gBattleAnimAttacker"]), u8(names["gBattleAnimTarget"])
        ids = [u8(names["gBattlerSpriteIds"] + index) for index in range(4)]
        return {
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "animScriptActive": bool(u8(active)),
            "scriptPtr": script, "scriptPtrParity": script & 1, "scriptPointerIdentity": ident(script),
            "scriptOwner": MOVE_NAME if start <= script < end else None, "scriptOffset": script - start if start <= script < end else None,
            "scriptWait": s8(names["sAnimFramesToWait"]), "animArgs": [s16(names["gBattleAnimArgs"] + i * 2) for i in range(8)],
            "visualTaskCount": u8(sy["gAnimVisualTaskCount"]), "soundTaskCount": u8(sy["gAnimSoundTaskCount"]),
            "tasks": live_tasks(), "sprites": live_sprites(), "spriteFlags": [u8(sprites + i * 0x44 + 0x3E) for i in range(64)],
            "spriteOrder": [u8(names["sSpriteOrder"] + i) for i in range(64)],
            "animationBattlers": {"attacker": attacker, "target": target, "spriteIds": ids},
            "battlerSprites": {"attacker": sprite(ids[attacker]), "target": sprite(ids[target])},
            "battlers": snapshot["battlers"], "parties": snapshot["parties"], "engine": snapshot["engine"],
            "immutableState": {key: snapshot[key] for key in ("rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")},
            "animationRng": u32(names["gRng2Value"]), "battleBg": {name: s16(names[name]) for name in bg_names},
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)], "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "softwareMatrices": [[s16(matrices + i * 8 + o) for o in (0, 2, 4, 6)] for i in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + o) for o in (0, 8, 16, 24)] for i in range(32)],
            "fadedPalette": [u16(sy["gPlttBufferFaded"] + i * 2) for i in range(512)],
            "unfadedPalette": [u16(names["gPlttBufferUnfaded"] + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "registers": {name: u16(address) for name, address in regs.items()}, "audio": {"SE1": mplay("SE1"), "SE2": mplay("SE2")},
        }

    rows: list[dict] = []
    started = done = False
    frame = 0

    def take() -> None:
        nonlocal started, done
        snapshot = lab.snapshot()
        script = u32(pointer)
        if not started:
            if snapshot["engine"].get("currentMove") != MOVE or not u8(active) or script != start:
                return
            started = True
        elif not REPEATED_BODIES and not u8(active):
            done = True
        if started and not (done and rows and not rows[-1]["animScriptActive"]):
            rows.append(row(frame, snapshot))

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
            if done:
                break
        if done:
            break
    body_windows: list[dict] = []
    stage_facts: dict = {}
    if REPEATED_BODIES:
        for _ in range(EXTRA_FRAMES):
            oracle.advance([]); frame += 1; take()
        body_starts = [index for index, item in enumerate(rows)
                       if item["animScriptActive"] and item["scriptPtr"] == start
                       and (index == 0 or not rows[index - 1]["animScriptActive"])]
        if not body_starts:
            raise RuntimeError(f"no {MOVE_NAME} source body observed")
        retained_indices: list[int] = []
        for body_index, body_start in enumerate(body_starts):
            body_end = next((index for index in range(body_start + 1, len(rows))
                             if not rows[index]["animScriptActive"]), None)
            if body_end is None:
                raise RuntimeError(f"body {body_index} inactive {MOVE_NAME} cleanup not observed")
            retained_indices.extend(range(body_start, body_end + 1))
            body_windows.append({
                "bodyIndex": body_index,
                "startFrame": rows[body_start]["frame"],
                "endFrame": rows[body_end]["frame"],
                "frameCount": body_end - body_start + 1,
            })
        gaps = []
        for left, right in zip(body_windows, body_windows[1:]):
            before = next(item for item in rows if item["frame"] == left["endFrame"])
            after = next(item for item in rows if item["frame"] == right["startFrame"])
            gaps.append({
                "afterFrame": left["endFrame"], "beforeFrame": right["startFrame"],
                "frameCount": right["startFrame"] - left["endFrame"] - 1,
                "hpBefore": [before["battlers"]["player"]["hp"], before["battlers"]["opponent"]["hp"]],
                "hpAfter": [after["battlers"]["player"]["hp"], after["battlers"]["opponent"]["hp"]],
                "gameplayRngBefore": before["immutableState"]["rngValue"],
                "gameplayRngAfter": after["immutableState"]["rngValue"],
                "animationRngBefore": before["animationRng"],
                "animationRngAfter": after["animationRng"],
            })
        stage_facts = {"observedBodyCount": len(body_windows), "interBodyGaps": gaps}
        rows = [rows[index] for index in retained_indices]
        retained = {item["frame"] for item in rows}
        for rgb_path in RGB.glob("*.rgb"):
            if int(rgb_path.stem) not in retained:
                rgb_path.unlink()
        done = True
    if not rows or not done or rows[-1]["animScriptActive"]:
        raise RuntimeError(f"complete {MOVE_NAME} source window not observed: rows={len(rows)}, frame={frame}, ptr={hex(u32(pointer))}")
    topology = {
        "tasks": sorted({task["func"]["symbol"] for item in rows for task in item["tasks"] if task["func"]["symbol"]}),
        "templates": sorted({sprite["template"]["symbol"] for item in rows for sprite in item["sprites"] if sprite["template"]["symbol"]}),
        "callbacks": sorted({sprite["callback"]["symbol"] for item in rows for sprite in item["sprites"] if sprite["callback"]["symbol"]}),
    }
    result = {
        "schema": SCHEMA, "profile": "battle-scene-on", "move": MOVE, "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows),
                         "sourceFrameCount": sum(row["scriptOwner"] == MOVE_NAME for row in rows)},
        "bodyWindows": body_windows, "stageFacts": stage_facts,
        "sourcePointerContract": {"start": start, "endExclusive": end, "observedAddresses": sorted({row["scriptPtr"] for row in rows}),
                                  "observedParities": sorted({row["scriptPtrParity"] for row in rows if row["scriptOwner"] == MOVE_NAME})},
        "sourceSymbols": {name: names[name] for name in (MOVE_NAME, END_NAME, *EXTRA_SYMBOLS) if name in names},
        "topology": topology, "bgSymbols": list(bg_names), "frames": rows,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} rows), pointer parities {result['sourcePointerContract']['observedParities']}")


if __name__ == "__main__":
    main()
