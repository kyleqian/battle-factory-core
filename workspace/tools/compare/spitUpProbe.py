#!/usr/bin/env python3
"""Emit a compact natural Scene-ON receipt for MOVE_SPIT_UP.

The scenario must stage one, two, or three Stockpiles through controller input.
This probe observes the resulting Spit Up presentation; it does not patch
transient battle state.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit("usage: spit-upProbe.py <scenario.json> <output.json> [rgb-dir]")

SCENARIO, OUTPUT = map(Path, sys.argv[1:3])
RGB = Path(sys.argv[3]) if len(sys.argv) == 4 else None
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_SPIT_UP = 255


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
    matrices = symbols["gOamMatrices"]
    tasks = symbols["gTasks"]
    script_active = names["gAnimScriptActive"]
    script_ptr = names["sBattleAnimScriptPtr"]
    script_start = names["Move_SPIT_UP"]
    script_end = names["Move_SWALLOW"]
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    if RGB is not None:
        RGB.mkdir(parents=True, exist_ok=True)

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def u32(address: int) -> int:
        return u16(address) | (u16(address + 2) << 16)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, length: int) -> str:
        return "".join(f"{oracle.read_u8(address + offset):02x}" for offset in range(length))

    def ident(address: int) -> dict:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def audio_player(name: str) -> dict:
        info = symbols[f"gMPlayInfo_{name}"]
        tracks = symbols[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40),
            "songHeader": u32(info),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(tracks + index * 0x50),
                    "panX": s8(tracks + index * 0x50 + 0x15),
                    "raw": raw(tracks + index * 0x50, 0x50),
                }
                for index in range(3)
            ],
        }

    def live_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                address = u32(base) & ~1
                result.append({
                    "slot": slot,
                    "function": by_address.get(address, f"0x{address:08x}"),
                    "func": ident(u32(base)),
                    "raw": raw(base, 0x28),
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
                matrix_num = (u16(base + 2) >> 9) & 31
                matrix = matrices + matrix_num * 8
                result.append({
                    "slot": slot,
                    "template": by_address.get(template, f"0x{template:08x}"),
                    "callback": by_address.get(callback, f"0x{callback:08x}"),
                    "templateId": ident(u32(base + 0x14)),
                    "callbackId": ident(u32(base + 0x1C)),
                    "raw": raw(base, 0x44),
                    "attr": [u16(base + offset) for offset in (0, 2, 4)],
                    "matrixNum": matrix_num,
                    "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                    "data": [s16(base + 0x2E + index * 2) for index in range(8)],
                })
        return result

    rows = []
    frame = 0
    source_seen = False
    done = False

    def take() -> None:
        nonlocal source_seen, done
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != MOVE_SPIT_UP:
            return
        pointer = u32(script_ptr)
        active_now = oracle.read_u8(script_active)
        in_source = script_start <= pointer < script_end
        if active_now and in_source:
            source_seen = True
        if not source_seen:
            return
        rgb = oracle.screen_rgb()
        if RGB is not None:
            (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame,
            "currentMove": MOVE_SPIT_UP,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "active": active_now,
            "gAnimScriptActive": active_now,
            "scriptPtr": pointer,
            "scriptPtrParity": pointer & 1,
            "scriptOwner": "Move_SPIT_UP" if in_source else None,
            "scriptOffset": pointer - script_start if in_source else None,
            "attackerBattler": oracle.read_u8(symbols["gBattleAnimAttacker"]),
            "targetBattler": oracle.read_u8(symbols["gBattleAnimTarget"]),
            "animTurn": oracle.read_u8(symbols["gAnimMoveTurn"]),
            "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks(),
            "sprites": live_sprites(),
            "battlerHp": {
                "player": snapshot["battlers"]["player"]["hp"],
                "opponent": snapshot["battlers"]["opponent"]["hp"],
            },
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
            "se1": audio_player("SE1"),
            "se2": audio_player("SE2"),
            "battlers": snapshot["battlers"],
            "parties": snapshot["parties"],
            "engineState": snapshot["engine"],
            "gameplayRng": snapshot["rngValue"],
            "animationRng": u32(names["gRng2Value"]),
            "immutableState": {
                key: snapshot[key]
                for key in ("rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")
            },
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
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
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "allocators": {
                "tileRanges": [[u16(names["sSpriteTileRanges"] + index * 4), u16(names["sSpriteTileRanges"] + index * 4 + 2)] for index in range(64)],
                "tileBitmap": raw(names["sSpriteTileAllocBitmap"], 128),
                "matrixBitmap": u32(names["gOamMatrixAllocBitmap"]),
                "reservedPaletteCount": oracle.read_u8(names["gReservedSpritePaletteCount"]),
                "reservedTileCount": u16(names["gReservedSpriteTileCount"]),
            },
            "rgb": rgb,
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
        raise RuntimeError("Spit Up source pointer was not observed")
    last = next((i for i in range(first + 1, len(rows)) if not rows[i]["active"]), None)
    if last is None:
        raise RuntimeError("Spit Up first inactive cleanup was not captured")
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
        "redOrb": sprite_starts("gSpitUpOrbSpriteTemplate"),
        "impact": sprite_starts("gFlashingHitSplatSpriteTemplate"),
        "deform": task_starts({"AnimTask_SpitUpDeformMon"}),
        "attackerShake": task_starts({"AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step"}),
        "targetPowerShake": task_starts({"AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"}),
    }
    anim_turns = {row["animTurn"] for row in source}
    if len(anim_turns) != 1 or not 1 <= next(iter(anim_turns)) <= 3:
        raise RuntimeError(f"natural trace did not preserve a 1..3 Stockpile animTurn: {anim_turns}")
    anim_turn = next(iter(anim_turns))
    expected = {"redOrb": 8 if anim_turn == 1 else 12 if anim_turn == 2 else 16, "impact": 2, "deform": 1, "attackerShake": 1, "targetPowerShake": 1}
    if lifecycle_counts != expected:
        raise RuntimeError(
            f"incomplete {anim_turn}-Stockpile lifecycle receipt: {lifecycle_counts}"
        )
    attackers = {row["attackerBattler"] for row in source}
    targets = {row["targetBattler"] for row in source}
    if len(attackers) != 1 or len(targets) != 1 or not attackers <= {0, 1}:
        raise RuntimeError(
            f"Spit Up attacker/target topology changed: attacker={attackers}, target={targets}"
        )
    attacker = next(iter(attackers))
    target = next(iter(targets))
    if target != 1 - attacker:
        raise RuntimeError(
            f"Spit Up attacker/target topology changed: attacker={attackers}, target={targets}"
        )
    if source[-1]["active"] or source[-1]["visualTaskCount"] or source[-1]["soundTaskCount"]:
        raise RuntimeError("first inactive frame retained animation work")

    expected_audio = {"se_m_take_down", "se_m_spit_up", "se_m_double_slap"}
    observed_audio = sorted({song for row in source for song in row["audio"] if song in expected_audio})
    if set(observed_audio) != expected_audio:
        raise RuntimeError(f"incomplete Spit Up audio receipt: {observed_audio}")

    tag_values = {"redOrb": 10237, "impact": 10135}
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
        raise RuntimeError(f"incomplete Spit Up tag lifecycle: {tag_presence}")

    rgb_digest = hashlib.sha256()
    for row in source:
        rgb_digest.update(row.pop("rgb"))
    register_values = {
        name: sorted({row["registers"][name] for row in source})
        for name in source[0]["registers"]
    }
    output = {
        "schema": "spit-up-natural-checkpoint/v1",
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
            "sourceFrameCount": len(source),
            "rgbSequenceSha256": rgb_digest.hexdigest(),
        },
        "sourcePointerContract": {
            "symbol": "Move_SPIT_UP",
            "start": script_start,
            "endExclusive": script_end,
            "byteLength": script_end - script_start,
        },
        "branch": {
            "stockpiles": anim_turn,
            "animTurn": anim_turn,
            "orbWaves": anim_turn,
            "attackerBattler": attacker,
            "targetBattler": target,
        },
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
            "minimum": min(
                row["battlerHp"]["player" if attacker == 0 else "opponent"]
                for row in source
            ),
            "maximum": max(
                row["battlerHp"]["player" if attacker == 0 else "opponent"]
                for row in source
            ),
        },
    }
    if RGB is not None:
        output = {
            "schema": "spit-up-dense-evidence/v1",
            "oracleProfile": "battle-scene-on",
            "setup": output["setup"],
            "sourceWindow": output["sourceWindow"],
            "sourcePointerContract": output["sourcePointerContract"],
            "branch": output["branch"],
            "lifecycleCounts": lifecycle_counts,
            "songHeaders": {
                "SE_M_TAKE_DOWN": names["se_m_take_down"],
                "SE_M_SPIT_UP": names["se_m_spit_up"],
                "SE_M_DOUBLE_SLAP": names["se_m_double_slap"],
            },
            "topology": output["topology"],
            "tagPresence": tag_presence,
            "registerValues": register_values,
            "attackerHpRange": output["attackerHpRange"],
            "cleanup": output["cleanup"],
            "frames": source,
        }
    OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n")
    print(
        f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} "
        f"({len(source)} frames), {lifecycle_counts}"
    )


main()
