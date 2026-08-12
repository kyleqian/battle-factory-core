#!/usr/bin/env python3
"""Emit a compact natural Scene-ON receipt for MOVE_SWALLOW.

The scenario must stage Stockpile through controller input.  This probe observes
the resulting Swallow presentation; it does not patch transient battle state.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: swallowProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_SWALLOW = 256


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference" / "pokeemerald").resolve()
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
    pairs = []
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0]):
            pairs.append((int(parts[0], 16), parts[2]))
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    symbols = oracle.symbols
    sprites = symbols["gSprites"]
    tasks = symbols["gTasks"]
    script_active = names["gAnimScriptActive"]
    script_ptr = names["sBattleAnimScriptPtr"]
    script_start = names["Move_SWALLOW"]
    script_end = names["Move_TRANSFORM"]
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def u32(address: int) -> int:
        return u16(address) | (u16(address + 2) << 16)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def live_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                address = u32(base) & ~1
                result.append({
                    "slot": slot,
                    "function": by_address.get(address, f"0x{address:08x}"),
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                })
        return result

    def live_sprites() -> list[dict]:
        result = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base + 0x3E) & 1:
                template = u32(base + 0x14) & ~1
                callback = u32(base + 0x1C) & ~1
                result.append({
                    "slot": slot,
                    "template": by_address.get(template, f"0x{template:08x}"),
                    "callback": by_address.get(callback, f"0x{callback:08x}"),
                })
        return result

    rows = []
    frame = 0
    source_seen = False
    done = False

    def take() -> None:
        nonlocal source_seen, done
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != MOVE_SWALLOW:
            return
        pointer = u32(script_ptr)
        active_now = oracle.read_u8(script_active)
        in_source = script_start <= pointer < script_end
        if active_now and in_source:
            source_seen = True
        if not source_seen:
            return
        rows.append({
            "frame": frame,
            "active": active_now,
            "scriptOffset": pointer - script_start if in_source else None,
            "animTurn": oracle.read_u8(symbols["gAnimMoveTurn"]),
            "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks(),
            "sprites": live_sprites(),
            "attackerHp": snapshot["battlers"]["player"]["hp"],
            "registers": {
                "winin": u16(0x04000048),
                "winout": u16(0x0400004A),
                "mosaic": u16(0x0400004C),
                "bldcnt": u16(0x04000050),
                "bldalpha": u16(0x04000052),
                "bldy": u16(0x04000054),
            },
            "audio": [
                by_address.get(u32(symbols[f"gMPlayInfo_{player}"]) & ~1)
                for player in ("SE1", "SE2")
            ],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "rgb": oracle.screen_rgb(),
        })
        if source_seen and not active_now:
            done = True

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
            if done:
                break
        if done:
            break

    first = next((i for i, row in enumerate(rows) if row["active"] and row["scriptOffset"] is not None), None)
    if first is None:
        raise RuntimeError("Swallow source pointer was not observed")
    last = next((i for i in range(first + 1, len(rows)) if not rows[i]["active"]), None)
    if last is None:
        raise RuntimeError("Swallow first inactive cleanup was not captured")
    source = rows[first:last + 1]

    def sprite_starts(template: str) -> int:
        starts = 0
        previous = set()
        for row in source:
            current = {sprite["slot"] for sprite in row["sprites"] if sprite["template"] == template}
            starts += len(current - previous)
            previous = current
        return starts

    def task_starts(functions: set[str]) -> int:
        starts = 0
        previous = set()
        for row in source:
            current = {task["slot"] for task in row["tasks"] if task["function"] in functions}
            starts += len(current - previous)
            previous = current
        return starts

    templates = sorted({sprite["template"] for row in source for sprite in row["sprites"]})
    callbacks = sorted({sprite["callback"] for row in source for sprite in row["sprites"]})
    functions = sorted({task["function"] for row in source for task in row["tasks"]})
    lifecycle_counts = {
        "blueOrb": sprite_starts("gSwallowBlueOrbSpriteTemplate"),
        "blueStar": sprite_starts("gHealingBlueStarSpriteTemplate"),
        "deform": task_starts({"AnimTask_SwallowDeformMon"}),
        "shake": task_starts({"AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step"}),
    }
    expected = {"blueOrb": 5, "blueStar": 4, "deform": 1, "shake": 2}
    if lifecycle_counts != expected:
        raise RuntimeError(f"incomplete one-stockpile lifecycle receipt: {lifecycle_counts}")
    if {row["animTurn"] for row in source} != {1}:
        raise RuntimeError("natural trace did not preserve the one-stockpile animTurn")
    if source[-1]["active"] or source[-1]["visualTaskCount"] or source[-1]["soundTaskCount"]:
        raise RuntimeError("first inactive frame retained animation work")

    expected_audio = {"se_m_take_down", "se_m_spit_up", "se_m_absorb_2"}
    observed_audio = sorted({song for row in source for song in row["audio"] if song in expected_audio})
    if set(observed_audio) != expected_audio:
        raise RuntimeError(f"incomplete Swallow audio receipt: {observed_audio}")

    tag_values = {"blueOrb": 10236, "blueStar": 10031}
    tag_presence = {
        name: {
            "paletteFrames": sum(value in row["paletteTags"] for row in source),
            "tileFrames": sum(value in row["tileTags"] for row in source),
            "absentAfterCleanup": value not in source[-1]["paletteTags"] and value not in source[-1]["tileTags"],
        }
        for name, value in tag_values.items()
    }
    if any(
        not state["paletteFrames"] or not state["tileFrames"] or not state["absentAfterCleanup"]
        for state in tag_presence.values()
    ):
        raise RuntimeError(f"incomplete Swallow tag lifecycle: {tag_presence}")

    rgb_digest = hashlib.sha256()
    for row in source:
        rgb_digest.update(row.pop("rgb"))
    register_values = {
        name: sorted({row["registers"][name] for row in source})
        for name in source[0]["registers"]
    }
    output = {
        "schema": "swallow-natural-checkpoint/v1",
        "oracleProfile": "battle-scene-on",
        "setup": {
            "mode": setup["mode"],
            "profile": setup["profile"],
            "challengeNum": setup["challengeNum"],
            "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
            "playerLeadSetId": setup["player"][0]["setId"],
            "opponentLeadSetId": setup["opponent"][0]["setId"],
        },
        "sourceWindow": {
            "startFrame": source[0]["frame"],
            "endFrame": source[-1]["frame"],
            "frameCount": len(source),
            "rgbSequenceSha256": rgb_digest.hexdigest(),
        },
        "branch": {"stockpiles": 1, "animTurn": 1, "orbWaves": 1},
        "lifecycleCounts": lifecycle_counts,
        "audio": observed_audio,
        "tagPresence": tag_presence,
        "topology": {"templates": templates, "callbacks": callbacks, "tasks": functions},
        "registerValues": register_values,
        "cleanup": {
            "active": source[-1]["active"],
            "visualTaskCount": source[-1]["visualTaskCount"],
            "soundTaskCount": source[-1]["soundTaskCount"],
        },
        "attackerHpRange": {
            "minimum": min(row["attackerHp"] for row in source),
            "maximum": max(row["attackerHp"] for row in source),
        },
    }
    OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n")
    print(
        f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} "
        f"({len(source)} frames), {lifecycle_counts}"
    )


main()
