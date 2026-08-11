#!/usr/bin/env python3
"""Capture address-free direct-sound targets at SoundMainRAM entry.

This is an additive sibling of the frozen m4a source-state v3 packet.  It
reuses v3's staging and exact source hooks, but emits only the v3 state digest,
the call cost used for the mechanical join, and the post-six-MPlayMain target
descriptor requested by the SoundMainRAM target audit.

Run only through ``tools/run-mgba-probe.py``.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

HERE = Path(__file__).resolve().parent
V3_PROBE = HERE / "trace-factory-m4a-source-state-v3.py"
spec = importlib.util.spec_from_file_location("factory_m4a_source_state_v3", V3_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load v3 sibling: {V3_PROBE}")
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)
old = v3.old

SOUND_CHANNEL_STATUS_ACTIVE = 0xC7
SOUND_CHANNEL_STATUS_START = 0x80
TONEDATA_TYPE_FIX = 0x08
TONEDATA_TYPE_REV = 0x10
TONEDATA_TYPE_CMP = 0x20
WAVE_DATA_FLAG_LOOP = 0xC0


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def wave_assets() -> dict[int, dict[str, Any]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(old.REFERENCE / "pokeemerald.elf")],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    rows: list[tuple[int, str]] = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[2].startswith("DirectSoundWaveData_"):
            rows.append((int(fields[0], 16), fields[2]))
    result: dict[int, dict[str, Any]] = {}
    for (address, name), (next_address, _) in zip(rows, rows[1:]):
        physical_payload_bytes = next_address - address - old.WAVE_DATA_BYTES
        if physical_payload_bytes >= 0:
            result[address] = {
                "waveSymbol": name,
                "physicalPayloadBytes": physical_payload_bytes,
            }
    return result


WAVE_ASSETS = wave_assets()


def storage_role(address: int) -> str:
    if 0x08000000 <= address < 0x0A000000:
        return "gamepak-ws0"
    if 0x0A000000 <= address < 0x0C000000:
        return "gamepak-ws1"
    if 0x0C000000 <= address < 0x0E000000:
        return "gamepak-ws2"
    if 0x02000000 <= address < 0x02040000:
        return "ewram"
    if 0x03000000 <= address < 0x03008000:
        return "iwram"
    return "other-or-unreadable"


def raw_selected_targets(oracle: Any) -> list[dict[str, int]]:
    max_chans = old.read_u8(oracle, old.SOUND_INFO_ADDR + old.SOUND_INFO_MAX_CHANS)
    direct_start = old.SOUND_INFO_ADDR + old.SOUND_INFO_CHANNELS
    return [
        {
            "wave": old.read_u32(oracle, direct_start + index * old.SOUND_CHANNEL_SIZE + old.SOUND_CHANNEL_WAVE),
            "current": old.read_u32(oracle, direct_start + index * old.SOUND_CHANNEL_SIZE + old.SOUND_CHANNEL_CURRENT),
        }
        for index in range(max_chans)
    ]


def entry_wave(oracle: Any, wave_address: int, current_address: int, channel_type: int) -> dict[str, Any] | None:
    if wave_address == 0 or not old.is_source_readable(wave_address, old.WAVE_DATA_BYTES):
        return None
    wave_type = old.read_u16(oracle, wave_address + old.WAVE_DATA_TYPE)
    status = old.read_u16(oracle, wave_address + old.WAVE_DATA_STATUS)
    frequency = old.read_u32(oracle, wave_address + old.WAVE_DATA_FREQUENCY)
    loop_start = old.read_u32(oracle, wave_address + old.WAVE_DATA_LOOP_START)
    size = old.read_u32(oracle, wave_address + old.WAVE_DATA_SIZE)
    data_address = wave_address + old.WAVE_DATA_BYTES
    asset = WAVE_ASSETS.get(wave_address)
    physical_bytes = asset["physicalPayloadBytes"] if asset is not None else None
    required_guard = (
        33 * ((size + 63) // 64) - size
        if wave_type != 0 or channel_type & (TONEDATA_TYPE_CMP | TONEDATA_TYPE_REV)
        else 0 if channel_type & TONEDATA_TYPE_FIX else 1
    )
    physical_region = (
        v3.region_bytes(oracle, data_address, physical_bytes, physical_bytes)
        if physical_bytes is not None
        else {"requestedBytes": None, "capturedBytes": 0, "complete": False, "sha256": None}
    )
    current_offset = current_address - data_address if data_address <= current_address <= data_address + size else None
    return {
        "type": wave_type,
        "status": status,
        "frequency": frequency,
        "loopStart": loop_start,
        "size": size,
        "sampleRegion": v3.region_bytes(oracle, data_address, size, v3.MAX_WAVE_BYTES),
        "physicalSampleRegion": physical_region,
        "storedCurrentOffset": current_offset,
        "directWaveTargetDescriptor": {
            "storageRole": storage_role(wave_address),
            "waveSymbol": asset["waveSymbol"] if asset is not None else "unresolved-wave-target",
            "waveAlignmentMod4": wave_address & 3,
            "physicalPayloadBytes": physical_bytes,
            "requiredGuardBytes": required_guard,
            "availableGuardBytes": physical_bytes - size if physical_bytes is not None else None,
        },
    }


def snapshot_entry_targets(oracle: Any, before: list[dict[str, int]]) -> list[dict[str, Any]]:
    max_chans = old.read_u8(oracle, old.SOUND_INFO_ADDR + old.SOUND_INFO_MAX_CHANS)
    direct_start = old.SOUND_INFO_ADDR + old.SOUND_INFO_CHANNELS
    rows: list[dict[str, Any]] = []
    for index in range(max_chans):
        channel = direct_start + index * old.SOUND_CHANNEL_SIZE
        status_flags = old.read_u8(oracle, channel)
        channel_type = old.read_u8(oracle, channel + 1)
        count = old.read_u32(oracle, channel + old.SOUND_CHANNEL_COUNT)
        fw = old.read_u32(oracle, channel + old.SOUND_CHANNEL_FW)
        frequency = old.read_u32(oracle, channel + old.SOUND_CHANNEL_FREQUENCY)
        wave_address = old.read_u32(oracle, channel + old.SOUND_CHANNEL_WAVE)
        stored_current = old.read_u32(oracle, channel + old.SOUND_CHANNEL_CURRENT)
        wave = entry_wave(oracle, wave_address, stored_current, channel_type)
        active = (status_flags & SOUND_CHANNEL_STATUS_ACTIVE) != 0
        starts = active and (status_flags & SOUND_CHANNEL_STATUS_START) != 0
        if not active:
            current_route = "not-read-channel-off"
            effective_offset = None
        elif starts:
            current_route = "soundmainram.start-current"
            effective_offset = count
        else:
            current_route = "soundmainram.persisted-current"
            effective_offset = wave["storedCurrentOffset"] if wave is not None else None
        size = wave["size"] if wave is not None else None
        region_complete = bool(
            wave is not None
            and wave["sampleRegion"]["complete"]
            and effective_offset is not None
            and size is not None
            and 0 <= effective_offset < size
        )
        pre = before[index]
        rows.append({
            "channelIndex": index,
            "statusFlags": status_flags,
            "type": channel_type,
            "count": count,
            "fw": fw,
            "frequency": frequency,
            "targetProducingRoute": (
                "pre-mplay-persisted"
                if pre["wave"] == wave_address
                else "mplay-replaced-before-entry-unclassified-tone-route"
            ),
            "preMplayCurrentRelation": (
                "same-stored-current" if pre["current"] == stored_current else "mplay-changed-stored-current"
            ),
            "currentRelation": {
                "route": current_route,
                "inWaveData": effective_offset is not None and size is not None and 0 <= effective_offset < size,
                "offset": effective_offset,
                "regionComplete": region_complete,
            },
            "wave": wave,
        })
    return rows


ORIGINAL_START = old.start_m4a_internal_observation
ORIGINAL_APPEND = old.append_m4a_internal_stage


def start_with_raw_targets(epoch: dict[str, Any], oracle: Any, frame: int, pc: int) -> None:
    ORIGINAL_START(epoch, oracle, frame, pc)
    workload = old.current_vblank_workload(epoch)
    if workload is not None and "audioInternal" in workload:
        workload["audioInternal"]["_preMplayTargets"] = raw_selected_targets(oracle)


def append_with_entry_targets(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "sound-main-ram-entry":
        return
    workload = old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]
    before = audio.get("_preMplayTargets")
    if before is None:
        raise RuntimeError("SoundMainRAM entry lacked its paired pre-MPlay target snapshot")
    audio["soundMainRamEntryTargets"] = snapshot_entry_targets(oracle, before)


old.start_m4a_internal_observation = start_with_raw_targets
old.append_m4a_internal_stage = append_with_entry_targets


def m4a_cost(stages: list[dict[str, Any]]) -> int:
    call = next(stage["masterCycles"] for stage in stages if stage["kind"] == "m4a-sound-main-call")
    returned = next(stage["masterCycles"] for stage in stages if stage["kind"] == "m4a-sound-main-return")
    return returned - call


def compact_receipt(result: dict[str, Any]) -> dict[str, Any]:
    source_entry = result["entry"]["masterCycles"]
    source_return = result["return"]["masterCycles"]
    observations: list[dict[str, Any]] = []
    for workload in result["vblankWorkloadEvidence"]["interrupts"]:
        audio = workload.get("audioInternal")
        if (
            workload.get("return") is None
            or workload.get("resume") is None
            or audio is None
            or workload["entry"]["masterCycles"] < source_entry
            or workload["entry"]["masterCycles"] > source_return
        ):
            continue
        targets = audio.get("soundMainRamEntryTargets")
        if targets is None:
            raise RuntimeError("selected m4a observation lacks SoundMainRAM entry targets")
        semantic = audio["state"]["sourceSemanticState"]
        observations.append({
            "sourceStateDigest": semantic["stateDigest"],
            "m4aSoundMainCycles": m4a_cost(audio["stages"]),
            "soundMainRamEntryTargets": targets,
            "entryTargetStateDigest": hashlib.sha256(canonical_json(targets)).hexdigest(),
        })
    return {
        "schema": "factory-m4a-soundmainram-entry-targets/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "sourceStateReference": {
            "packetSchema": "factory-m4a-source-state-probe/v3",
            "digestKey": "sourceSemanticState.stateDigest",
        },
        "captureBoundary": "sound-main-ram-entry",
        "addressFree": True,
        "durationReducer": False,
        "observations": observations,
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
    receipt = compact_receipt(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"wrote {OUTPUT}: {CASE} {len(receipt['observations'])} entry-target observations", flush=True)


if __name__ == "__main__":
    main()
