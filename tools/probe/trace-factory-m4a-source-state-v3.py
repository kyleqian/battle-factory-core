#!/usr/bin/env python3
"""Capture a source-semantic m4a state key for Issue #55.

This is a sibling of ``trace-factory-construction-rng.py``.  It imports that
probe only for its battle staging and instruction-boundary driver, then
replaces its v2 m4a snapshot with a wider, address-free source-state packet.
The old probe and its byte contract are intentionally untouched.

The packet captures complete fixed-size m4a structs, normalized channel and
player links, full readable WaveData/PCM regions by digest, dispatch-table
targets, and the audio I/O window.  It remains an evidence packet rather than
a timing reducer: command handlers are indirect and can read unbounded source
data, so the precise residual dereferences are carried in the packet.

Run through the validated wrapper, for example:

    python3 tools/run-mgba-probe.py /tmp/fresh.json -- \
      python3 tools/probe/trace-factory-m4a-source-state-v3.py /tmp/fresh.json anchor
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

# The imported driver reads these flags at import time.
os.environ["FACTORY_CONSTRUCTION_CYCLE_EVIDENCE"] = "1"
os.environ["FACTORY_VBLANK_WORKLOAD_EVIDENCE"] = "1"
os.environ["FACTORY_VBLANK_WORKLOAD_INTERNAL_EVIDENCE"] = "1"

HERE = Path(__file__).resolve().parent
OLD_PROBE = HERE / "trace-factory-construction-rng.py"
spec = importlib.util.spec_from_file_location("factory_construction_probe_v2", OLD_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {OLD_PROBE}")
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)


# m4a_internal.h / constants/m4a_constants.inc, with all pointer-bearing
# fields normalized out of raw scalar byte regions below.
SOUND_INFO_SCALAR_BYTES = 0x50
PCM_BUFFER_BYTES = 1584 * 2
MUSIC_PLAYER_INFO_SIZE = 0x40
MUSIC_PLAYER_TRACK_SIZE = 0x50
SOUND_CHANNEL_SIZE = 0x40
CGB_CHANNEL_SIZE = 0x40

SOUND_INFO_POINTER_FIELDS = (0x1C, 0x20, 0x24, 0x28, 0x2C, 0x30, 0x34, 0x38, 0x3C)
PLAYER_POINTER_FIELDS = (0x00, 0x20, 0x2C, 0x30, 0x38, 0x3C)
TRACK_POINTER_FIELDS = (0x20, 0x28, 0x40, 0x44, 0x48, 0x4C)
DIRECT_POINTER_FIELDS = (0x24, 0x28, 0x2C, 0x30, 0x34)
CGB_POINTER_FIELDS = (0x24, 0x28, 0x2C, 0x30, 0x34)

SOUND_INFO_ADDR = old.SOUND_INFO_ADDR
SOUND_INFO_CHANNELS = old.SOUND_INFO_CHANNELS
SOUND_INFO_CGB_CHANS = old.SOUND_INFO_CGB_CHANS
SOUND_INFO_PCM_BUFFER = 0x350

G_MPLAY_JUMP_TABLE = 0x03007460
G_CGB3_VOL = 0x08675C54
G_CLOCK_TABLE = 0x08675C64
G_XCMD_TABLE = 0x08675CCC

REG_BASE = 0x04000000
REG_VCOUNT = REG_BASE + 0x06
REG_SOUND_WINDOW = REG_BASE + 0x60
REG_SOUND_WINDOW_BYTES = 0x40
REG_DMA1_SOURCE = REG_BASE + 0xBC
REG_DMA1_DEST = REG_BASE + 0xC0
REG_DMA1_CONTROL = REG_BASE + 0xC4
REG_DMA2_SOURCE = REG_BASE + 0xC8
REG_DMA2_DEST = REG_BASE + 0xCC
REG_DMA2_CONTROL = REG_BASE + 0xD0
REG_FIFO_A = REG_BASE + 0xA0
REG_FIFO_B = REG_BASE + 0xA4

COMMAND_WINDOW_BYTES = 256
PATTERN_WINDOW_BYTES = 128
TONE_TABLE_WINDOW_BYTES = 256 * 12
MAX_WAVE_BYTES = 0x20000

RESIDUAL_DEREFERENCES = [
    {
        "stage": "sixth-MPlayMain",
        "source": "reference/pokeemerald/src/m4a_1.s:1130-1466",
        "read": "Indirect command and pattern handlers can advance cmdPtr or a pattern-stack target beyond the captured 256/128-byte windows.",
        "captured": "Current command bytes, all three pattern-stack windows, complete track/player scalar state, and dispatch target symbols.",
        "remainder": "The full handler-dependent command/control-flow read set is not statically bounded by this packet.",
    },
    {
        "stage": "sixth-MPlayMain",
        "source": "reference/pokeemerald/src/m4a.c:1500-1534",
        "read": "ply_xcmd/ply_xxx and gXcmdTable/gMPlayJumpTable callbacks may dereference callback-specific state.",
        "captured": "Dispatch table target symbols and the callback-visible player/track/channel graph.",
        "remainder": "Transitive callback reads are not instruction-traced into a complete memory-read set.",
    },
    {
        "stage": "CgbSound",
        "source": "reference/pokeemerald/src/m4a.c:925-1231",
        "read": "CgbSound reads hardware registers selected by channel number and callback/table code.",
        "captured": "The complete 0x04000060-0x0400009F audio register window, all four CgbChannel structs, wave words, and gCgb3Vol bytes.",
        "remainder": "No residual was observed in the fixed CgbSound body; indirect CgbOscOff/MidiKeyToCgbFreq code remains represented by target symbols rather than a transitive read proof.",
    },
    {
        "stage": "SoundMainRAM-channel-passes",
        "source": "reference/pokeemerald/src/m4a_1.s:134-445",
        "read": "The ARM mixer indexes PCM and WaveData sample bytes using mutable count/fw/current state.",
        "captured": "All 12 SoundChannel structs, full readable WaveData sample regions, the complete 3168-byte PCM buffer, DMA source/destination roles, and VCOUNT.",
        "remainder": "If a malformed/current sample target falls outside its captured WaveData, the target is reported as incomplete; no such target was observed in this packet.",
    },
]


def source_symbol(value: int) -> str | None:
    if value == 0:
        return None
    rendered = old.pointer_symbol(value & ~1)
    # Never retain a raw numeric target in a compact state key.
    return rendered if not rendered.startswith("0x") else "unresolved-target"


def region_bytes(oracle: Any, start: int, requested: int, cap: int | None = None) -> dict[str, Any]:
    if start == 0 or requested < 0:
        return {"requestedBytes": requested, "capturedBytes": 0, "complete": False, "sha256": None}
    limit = requested if cap is None else min(requested, cap)
    if not old.is_source_readable(start, limit):
        return {"requestedBytes": requested, "capturedBytes": 0, "complete": False, "sha256": None}
    values = bytes(oracle.read_u8(start + index) for index in range(limit))
    return {
        "requestedBytes": requested,
        "capturedBytes": limit,
        "complete": limit == requested,
        "sha256": hashlib.sha256(values).hexdigest(),
    }


def normalized_bytes(oracle: Any, start: int, size: int, pointer_fields: tuple[int, ...]) -> list[int]:
    values = [oracle.read_u8(start + index) for index in range(size)]
    for field in pointer_fields:
        for index in range(4):
            if field + index < len(values):
                values[field + index] = 0
    return values


def source_wave(oracle: Any, wave: int, current: int = 0) -> dict[str, Any] | None:
    if wave == 0 or not old.is_source_readable(wave, 0x10):
        return None
    size = old.read_u32(oracle, wave + old.WAVE_DATA_SIZE)
    data = wave + old.WAVE_DATA_BYTES
    current_offset = None
    if current >= data and current - data <= size:
        current_offset = current - data
    return {
        "header": {
            "type": old.read_u16(oracle, wave + old.WAVE_DATA_TYPE),
            "status": old.read_u16(oracle, wave + old.WAVE_DATA_STATUS),
            "frequency": old.read_u32(oracle, wave + old.WAVE_DATA_FREQUENCY),
            "loopStart": old.read_u32(oracle, wave + old.WAVE_DATA_LOOP_START),
            "size": size,
        },
        "sampleRegion": region_bytes(oracle, data, size, MAX_WAVE_BYTES),
        "currentOffset": current_offset,
        "currentRegion": (
            region_bytes(oracle, current, min(32, max(size - current_offset, 0)))
            if current_offset is not None
            else None
        ),
    }


def source_tone(oracle: Any, tone: int) -> dict[str, Any] | None:
    if tone == 0 or not old.is_source_readable(tone, 12):
        return None
    wave = old.read_u32(oracle, tone + 4)
    return {
        "scalar": [oracle.read_u8(tone + index) for index in range(12) if index not in (4, 5, 6, 7)],
        "wave": source_wave(oracle, wave),
        "waveTargetPresent": wave != 0,
    }


def channel_role(value: int, direct_start: int, cgb_start: int) -> str | None:
    if value == 0:
        return None
    if direct_start <= value < direct_start + 12 * SOUND_CHANNEL_SIZE and (value - direct_start) % SOUND_CHANNEL_SIZE == 0:
        return f"direct-channel-{(value - direct_start) // SOUND_CHANNEL_SIZE}"
    if cgb_start and cgb_start <= value < cgb_start + 4 * CGB_CHANNEL_SIZE and (value - cgb_start) % CGB_CHANNEL_SIZE == 0:
        return f"cgb-channel-{(value - cgb_start) // CGB_CHANNEL_SIZE}"
    return "unmapped-channel"


def source_channel_chain(oracle: Any, first: int, direct_start: int, cgb_start: int) -> list[str | None]:
    result: list[str | None] = []
    seen: set[int] = set()
    current = first
    while current and current not in seen and len(result) < 16:
        seen.add(current)
        result.append(channel_role(current, direct_start, cgb_start))
        if not old.is_source_readable(current + 0x34, 4):
            break
        current = old.read_u32(oracle, current + 0x34)
    return result


def source_track(
    oracle: Any,
    track: int,
    player_tone: int,
    direct_start: int,
    cgb_start: int,
) -> dict[str, Any]:
    channel = old.read_u32(oracle, track + 0x20)
    command = old.read_u32(oracle, track + 0x40)
    patterns = [old.read_u32(oracle, track + offset) for offset in (0x44, 0x48, 0x4C)]
    return {
        "scalarBytes": normalized_bytes(oracle, track, 0x20, ()),
        "tailBytes": normalized_bytes(oracle, track + 0x20, 0x30, (0x00, 0x08, 0x20, 0x24, 0x28, 0x2C)),
        "inlineTone": source_tone(oracle, track + 0x24),
        "channelChain": source_channel_chain(oracle, channel, direct_start, cgb_start),
        "channelLinked": channel != 0,
        "commandRegion": region_bytes(oracle, command, COMMAND_WINDOW_BYTES),
        "patternRegions": [region_bytes(oracle, pattern, PATTERN_WINDOW_BYTES) for pattern in patterns],
        "toneTableRegion": region_bytes(oracle, player_tone, TONE_TABLE_WINDOW_BYTES),
    }


def source_player(oracle: Any, player: int, direct_start: int, cgb_start: int) -> dict[str, Any]:
    tracks = old.read_u32(oracle, player + 0x2C)
    tone = old.read_u32(oracle, player + 0x30)
    count = min(oracle.read_u8(player + 8), 16)
    return {
        "scalarBytes": normalized_bytes(oracle, player, MUSIC_PLAYER_INFO_SIZE, PLAYER_POINTER_FIELDS),
        "routineTargets": {
            "main": source_symbol(old.read_u32(oracle, player + 0x38)),
            "next": source_symbol(old.read_u32(oracle, player + 0x3C)),
        },
        "trackCount": count,
        "tracks": [
            source_track(oracle, tracks + index * MUSIC_PLAYER_TRACK_SIZE, tone, direct_start, cgb_start)
            for index in range(count)
        ] if tracks else [],
        "toneTableRegion": region_bytes(oracle, tone, TONE_TABLE_WINDOW_BYTES),
    }


def source_direct_channel(oracle: Any, channel: int, direct_start: int, cgb_start: int) -> dict[str, Any]:
    wave = old.read_u32(oracle, channel + 0x24)
    current = old.read_u32(oracle, channel + 0x28)
    track = old.read_u32(oracle, channel + 0x2C)
    return {
        "scalarBytes": normalized_bytes(oracle, channel, SOUND_CHANNEL_SIZE, DIRECT_POINTER_FIELDS),
        "wave": source_wave(oracle, wave, current),
        "currentInWave": source_wave(oracle, wave, current) is not None and current != 0,
        "trackLinked": track != 0,
        "channelLinks": {
            "track": "music-player-track" if track else None,
            "previous": channel_role(old.read_u32(oracle, channel + 0x30), direct_start, cgb_start),
            "next": channel_role(old.read_u32(oracle, channel + 0x34), direct_start, cgb_start),
        },
    }


def source_cgb_channel(oracle: Any, channel: int, direct_start: int, cgb_start: int) -> dict[str, Any]:
    wave = old.read_u32(oracle, channel + 0x24)
    current = old.read_u32(oracle, channel + 0x28)
    return {
        "scalarBytes": normalized_bytes(oracle, channel, CGB_CHANNEL_SIZE, CGB_POINTER_FIELDS),
        "waveWords": region_bytes(oracle, wave, 16, 16),
        "currentWaveWords": region_bytes(oracle, current, 16, 16),
        "waveIsCurrent": wave != 0 and wave == current,
        "channelLinks": {
            "track": "music-player-track" if old.read_u32(oracle, channel + 0x2C) else None,
            "previous": channel_role(old.read_u32(oracle, channel + 0x30), direct_start, cgb_start),
            "next": channel_role(old.read_u32(oracle, channel + 0x34), direct_start, cgb_start),
        },
    }


def table_targets(oracle: Any, start: int, count: int) -> list[str | None]:
    return [source_symbol(old.read_u32(oracle, start + index * 4)) for index in range(count)]


def dma_role(value: int, pcm_start: int) -> str:
    if value == pcm_start or value == pcm_start + PCM_BUFFER_BYTES // 2:
        return "pcm-buffer-half"
    if value == REG_FIFO_A:
        return "fifo-a"
    if value == REG_FIFO_B:
        return "fifo-b"
    return "other"


def source_semantic_state(oracle: Any) -> dict[str, Any]:
    cgb_start = old.read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_CGB_CHANS)
    player_head = old.read_u32(oracle, SOUND_INFO_ADDR + 0x24)
    direct_start = SOUND_INFO_ADDR + SOUND_INFO_CHANNELS
    pcm_start = SOUND_INFO_ADDR + SOUND_INFO_PCM_BUFFER
    players: list[dict[str, Any]] = []
    seen_players: set[int] = set()
    current_player = player_head
    while current_player and current_player not in seen_players and len(players) < 16:
        seen_players.add(current_player)
        players.append(source_player(oracle, current_player, direct_start, cgb_start))
        current_player = old.read_u32(oracle, current_player + 0x3C)

    state = {
        "revision": "factory-m4a-source-state/v3",
        "soundInfo": {
            "scalarBytes": normalized_bytes(oracle, SOUND_INFO_ADDR, SOUND_INFO_SCALAR_BYTES, SOUND_INFO_POINTER_FIELDS),
            "routineTargets": {
                "mplayMain": source_symbol(old.read_u32(oracle, SOUND_INFO_ADDR + 0x20)),
                "cgbSound": source_symbol(old.read_u32(oracle, SOUND_INFO_ADDR + 0x28)),
                "cgbOscOff": source_symbol(old.read_u32(oracle, SOUND_INFO_ADDR + 0x2C)),
                "midiKeyToCgbFreq": source_symbol(old.read_u32(oracle, SOUND_INFO_ADDR + 0x30)),
                "plynote": source_symbol(old.read_u32(oracle, SOUND_INFO_ADDR + 0x38)),
                "extVolPit": source_symbol(old.read_u32(oracle, SOUND_INFO_ADDR + 0x3C)),
            },
            "pcmBuffer": region_bytes(oracle, pcm_start, PCM_BUFFER_BYTES),
        },
        "musicPlayers": players,
        "directChannels": [
            source_direct_channel(
                oracle,
                direct_start + index * SOUND_CHANNEL_SIZE,
                direct_start,
                cgb_start,
            )
            for index in range(12)
        ],
        "cgbChannels": [
            source_cgb_channel(
                oracle,
                cgb_start + index * CGB_CHANNEL_SIZE,
                direct_start,
                cgb_start,
            )
            for index in range(4)
        ] if cgb_start else [],
        "dispatchTables": {
            "clockValues": region_bytes(oracle, G_CLOCK_TABLE, 0x80),
            "cgb3VolumeValues": region_bytes(oracle, G_CGB3_VOL, 18),
            "mplayJumpTargets": table_targets(oracle, G_MPLAY_JUMP_TABLE, 36),
            "xcmdTargets": table_targets(oracle, G_XCMD_TABLE, 14),
        },
        "audioIo": {
            "vcount": oracle.read_u8(REG_VCOUNT),
            "soundRegisters": [oracle.read_u8(REG_SOUND_WINDOW + index) for index in range(REG_SOUND_WINDOW_BYTES)],
            "dma": {
                "dma1SourceRole": dma_role(old.read_u32(oracle, REG_DMA1_SOURCE), pcm_start),
                "dma1DestinationRole": dma_role(old.read_u32(oracle, REG_DMA1_DEST), pcm_start),
                "dma1Control": old.read_u32(oracle, REG_DMA1_CONTROL),
                "dma2SourceRole": dma_role(old.read_u32(oracle, REG_DMA2_SOURCE), pcm_start),
                "dma2DestinationRole": dma_role(old.read_u32(oracle, REG_DMA2_DEST), pcm_start),
                "dma2Control": old.read_u32(oracle, REG_DMA2_CONTROL),
            },
        },
        "coverage": {
            "complete": False,
            "fixedRegions": [
                "SoundInfo scalar and PCM buffer",
                "all six MusicPlayerInfo nodes and their track scalar/tone/channel graphs",
                "all twelve SoundChannel nodes and four CgbChannel nodes",
                "readable WaveData samples and CGB wave words",
                "m4a dispatch tables, audio I/O registers, VCOUNT, and DMA roles",
            ],
            "residualDereferences": RESIDUAL_DEREFERENCES,
        },
    }
    return state


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def snapshot_m4a_source_state(oracle: Any) -> dict[str, Any]:
    base = ORIGINAL_SNAPSHOT(oracle)
    semantic = source_semantic_state(oracle)
    semantic["stateDigest"] = hashlib.sha256(canonical_json(semantic)).hexdigest()
    base["sourceSemanticState"] = semantic
    return base


ORIGINAL_SNAPSHOT = old.snapshot_m4a_internal_state
old.snapshot_m4a_internal_state = snapshot_m4a_source_state


def compact_source_state_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Keep only source-stage observations in the v3 packet.

    The imported driver also records the outer VBlank workload.  That older
    shell contains DMA queue cursors and frame-relative fields which are not
    inputs to this state-key experiment, so the v3 packet intentionally
    retains only the m4a call-to-return stages and their source-relative
    cycle positions.
    """
    legacy = old.compact_vblank_workload_internal_receipt(result)
    interrupts: list[dict[str, Any]] = []
    for observation in legacy["interrupts"]:
        audio = observation["m4a"]
        call = next(
            stage["cyclesSinceVBlankEntry"]
            for stage in audio["stages"]
            if stage["kind"] == "m4a-sound-main-call"
        )
        interrupts.append({
            "m4a": {
                "state": audio["state"],
                "stages": [
                    {
                        "kind": stage["kind"],
                        "cyclesSinceM4aEntry": stage["cyclesSinceVBlankEntry"] - call,
                    }
                    for stage in audio["stages"]
                ],
            },
        })
    return {
        "schema": "factory-m4a-source-state-probe/v3",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "commandWindowBytes": COMMAND_WINDOW_BYTES,
        "patternWindowBytes": PATTERN_WINDOW_BYTES,
        "toneTableWindowBytes": TONE_TABLE_WINDOW_BYTES,
        "interrupts": interrupts,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = old.run_anchor()
    elif CASE == "liliana":
        result = old.run_liliana()
    else:
        result = old.run_factory_varied()
    result = compact_source_state_receipt(result)
    result["stateKey"] = "interrupt.m4a.state.sourceSemanticState.stateDigest"
    result["stateCapture"] = {
        "addressFree": True,
        "durationFree": True,
        "residualCount": len(RESIDUAL_DEREFERENCES),
        "residualStages": [item["stage"] for item in RESIDUAL_DEREFERENCES],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}: {result['case']} {len(result['interrupts'])} source-state observations", flush=True)


if __name__ == "__main__":
    main()
