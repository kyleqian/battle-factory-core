#!/usr/bin/env python3
"""Classify MPlay-written SoundMainRAM targets through pinned source routes.

This additive probe imports the frozen mixer-entry v1 probe for staging and
entry-target capture.  It observes only exact source instruction boundaries:
the three ``ply_note`` selector arms, the ``SoundChannel.wav`` store, and the
two possible same-pass writers of the inline ``ToneData.wav`` field.  Compact
output contains source roles, indices, symbols, and digests, never addresses
or timing fields.

Run only through ``tools/run-mgba-probe.py``.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana"}:
    raise SystemExit(f"unknown replacement-bearing case {CASE!r}")

HERE = Path(__file__).resolve().parent
V1_PROBE = HERE / "trace-factory-m4a-soundmainram-entry-targets-v1.py"
spec = importlib.util.spec_from_file_location("factory_m4a_entry_targets_v1", V1_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load v1 sibling: {V1_PROBE}")
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)
old = v1.old

TONEDATA_TYPE_SPL = 0x40
TONEDATA_TYPE_RHY = 0x80
TONE_DATA_BYTES = 12

# mGBA exposes the pipelined Thumb PC (the executing instruction + 2).  The
# accepted packet renders these as symbol-relative instruction indices below.
BOUNDARY_STAGES = {
    0x082DFD98: "ply-note-keysplit-selector",
    0x082DFDA0: "ply-note-rhythm-selector",
    0x082DFDD2: "ply-note-inline-selector",
    0x082DF964: "ply-voice-inline-wave-store",
    0x082E1520: "ply-xwave-inline-wave-store",
    0x082DFEC0: "ply-note-channel-wave-store",
}
old.M4A_INTERNAL_STAGE_PCS.update(BOUNDARY_STAGES)

BOUNDARY_ROLES = {
    "ply-note-keysplit-selector": {
        "symbol": "ply_note",
        "instructionIndex": 47,
        "instructionRole": "keysplit-table-selector-load",
    },
    "ply-note-rhythm-selector": {
        "symbol": "ply_note",
        "instructionIndex": 51,
        "instructionRole": "rhythm-midi-key-selector-copy",
    },
    "ply-note-inline-selector": {
        "symbol": "ply_note",
        "instructionIndex": 76,
        "instructionRole": "inline-track-tone-select",
    },
    "ply-voice-inline-wave-store": {
        "symbol": "ply_voice",
        "instructionIndex": 17,
        "instructionRole": "MusicPlayerTrack.ToneData.wav-store",
    },
    "ply-xwave-inline-wave-store": {
        "symbol": "ply_xwave",
        "instructionIndex": 21,
        "instructionRole": "MusicPlayerTrack.ToneData.wav-store",
    },
    "ply-note-channel-wave-store": {
        "symbol": "ply_note",
        "instructionIndex": 195,
        "instructionRole": "SoundChannel.wav-store",
    },
}


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def track_role(oracle: Any, track: int) -> dict[str, int | str]:
    player = old.read_u32(oracle, old.SOUND_INFO_ADDR + 0x24)
    seen: set[int] = set()
    player_index = 0
    matches: list[dict[str, int | str]] = []
    while player and player not in seen and player_index < 16:
        seen.add(player)
        tracks = old.read_u32(oracle, player + old.MUSIC_PLAYER_INFO_TRACKS)
        count = min(old.read_u8(oracle, player + 8), 16)
        if tracks and tracks <= track < tracks + count * old.MUSIC_PLAYER_TRACK_SIZE:
            delta = track - tracks
            if delta % old.MUSIC_PLAYER_TRACK_SIZE == 0:
                matches.append({
                    "playerRole": "SoundInfo.MPlayMain-linked-player",
                    "playerIndex": player_index,
                    "trackIndex": delta // old.MUSIC_PLAYER_TRACK_SIZE,
                })
        player = old.read_u32(oracle, player + 0x3C)
        player_index += 1
    if len(matches) != 1:
        raise RuntimeError(f"track did not map uniquely to one source role: {len(matches)} matches")
    return matches[0]


def channel_index(channel: int) -> int | None:
    direct_start = old.SOUND_INFO_ADDR + old.SOUND_INFO_CHANNELS
    delta = channel - direct_start
    if delta < 0 or delta % old.SOUND_CHANNEL_SIZE != 0:
        # The same source store also initializes CgbChannel.wav. Those writes
        # cannot feed the selected direct-sound SoundMainRAM array.
        return None
    index = delta // old.SOUND_CHANNEL_SIZE
    if index < 0 or index >= 12:
        return None
    return index


def wave_role(oracle: Any, wave: int) -> dict[str, Any]:
    asset = v1.WAVE_ASSETS.get(wave)
    semantic = v1.v3.source_wave(oracle, wave)
    if asset is None or semantic is None:
        raise RuntimeError("wave target did not resolve to a pinned WaveData symbol")
    region = semantic["sampleRegion"]
    if not region["complete"] or region["sha256"] is None:
        raise RuntimeError("wave target lacked a complete payload digest")
    return {
        "storageRole": v1.storage_role(wave),
        "waveSymbol": asset["waveSymbol"],
        "payloadBytes": semantic["header"]["size"],
        "payloadSha256": region["sha256"],
    }


def optional_wave_role(oracle: Any, wave: int) -> dict[str, Any] | None:
    if wave not in v1.WAVE_ASSETS:
        return None
    return wave_role(oracle, wave)


def active_audio(epoch: dict[str, Any]) -> dict[str, Any] | None:
    # The imported bootstrap is instruction-stepped before the selected
    # construction epoch too. Those earlier m4a calls are intentionally out
    # of this receipt and may legitimately target CGB/non-WaveData storage.
    if epoch.get("entry") is None or epoch.get("return") is not None:
        return None
    workload = old.current_vblank_workload(epoch)
    if workload is None:
        return None
    return workload.get("audioInternal")


def current_mplay_index(audio: dict[str, Any]) -> int:
    index = audio.get("_mplayInvocationIndex")
    if not isinstance(index, int) or index < 0:
        raise RuntimeError("source writer appeared outside a pinned MPlayMain invocation")
    return index


def role_key(role: dict[str, int | str]) -> tuple[int, int]:
    return int(role["playerIndex"]), int(role["trackIndex"])


def observe_selector(audio: dict[str, Any], oracle: Any, stage: str) -> None:
    track = old.cpu_gpr(oracle, 5)
    role = track_role(oracle, track)
    key = (current_mplay_index(audio), *role_key(role))
    audio.setdefault("_selectorBoundaries", {})[key] = stage


def observe_inline_writer(audio: dict[str, Any], oracle: Any, stage: str) -> None:
    if stage == "ply-voice-inline-wave-store":
        track = old.cpu_gpr(oracle, 1)
        wave = old.cpu_gpr(oracle, 3)
        route = "mplay.ply-voice.tone-table-wave"
        tone_type = old.read_u8(oracle, track + old.MUSIC_TRACK_TONE)
        normalized_wave = (
            None
            if tone_type & (TONEDATA_TYPE_SPL | TONEDATA_TYPE_RHY)
            else optional_wave_role(oracle, wave)
        )
    else:
        track = old.cpu_gpr(oracle, 1)
        wave = old.cpu_gpr(oracle, 4)
        route = "mplay.ply-xwave.command-u32"
        normalized_wave = optional_wave_role(oracle, wave)
    role = track_role(oracle, track)
    key = (current_mplay_index(audio), *role_key(role))
    audio.setdefault("_inlineWaveWriters", {})[key] = {
        "route": route,
        "boundary": BOUNDARY_ROLES[stage],
        "wave": normalized_wave,
    }


def observe_note_writer(audio: dict[str, Any], oracle: Any) -> None:
    channel = old.cpu_gpr(oracle, 4)
    track = old.cpu_gpr(oracle, 5)
    selected_tone = old.cpu_gpr(oracle, 6)
    wave = old.cpu_gpr(oracle, 7)
    direct_channel_index = channel_index(channel)
    if direct_channel_index is None:
        return
    role = track_role(oracle, track)
    invocation = current_mplay_index(audio)
    tone_type = old.read_u8(oracle, track + old.MUSIC_TRACK_TONE)
    key = (invocation, *role_key(role))
    observed_selector = audio.get("_selectorBoundaries", {}).get(key)

    if tone_type & TONEDATA_TYPE_SPL:
        route = "mplay.ply-note.keysplit-tone-wave"
        expected_selector = "ply-note-keysplit-selector"
    elif tone_type & TONEDATA_TYPE_RHY:
        route = "mplay.ply-note.rhythm-tone-wave"
        expected_selector = "ply-note-rhythm-selector"
    else:
        route = "mplay.ply-note.inline-tone-wave"
        expected_selector = "ply-note-inline-selector"
    if observed_selector != expected_selector:
        raise RuntimeError(
            f"selector/store route disagreement: expected {expected_selector}, observed {observed_selector}"
        )

    selected_index: int | None = None
    selector_input: dict[str, Any]
    if route == "mplay.ply-note.inline-tone-wave":
        if selected_tone != track + old.MUSIC_TRACK_TONE:
            raise RuntimeError("inline selector did not retain MusicPlayerTrack.ToneData")
        selector_input = {"role": "MusicPlayerTrack.ToneData"}
    else:
        table = old.read_u32(oracle, track + old.MUSIC_TRACK_TONE + 4)
        delta = selected_tone - table
        if delta < 0 or delta % TONE_DATA_BYTES != 0:
            raise RuntimeError("selected nested tone did not map to a ToneData index")
        selected_index = delta // TONE_DATA_BYTES
        midi_key = old.read_u8(oracle, track + 5)
        if route == "mplay.ply-note.keysplit-tone-wave":
            key_split = old.read_u32(oracle, track + old.MUSIC_TRACK_TONE + 8)
            if key_split == 0 or not old.is_source_readable(key_split + midi_key, 1):
                raise RuntimeError("keysplit selector table was unreadable")
            selector_value = old.read_u8(oracle, key_split + midi_key)
            if selected_index != selector_value:
                raise RuntimeError("keysplit selector index disagreed with selected tone")
            selector_input = {
                "role": "MusicPlayerTrack.ToneData.keySplitTable[midiKey]",
                "midiKey": midi_key,
                "selectedToneIndex": selected_index,
            }
        else:
            if selected_index != midi_key:
                raise RuntimeError("rhythm MIDI-key index disagreed with selected tone")
            selector_input = {
                "role": "MusicPlayerTrack.key",
                "midiKey": midi_key,
                "selectedToneIndex": selected_index,
            }

    last_inline_writer = audio.get("_inlineWaveWriters", {}).get(key)
    inline_ancestry: dict[str, Any] | None = None
    if route == "mplay.ply-note.inline-tone-wave":
        xwave = last_inline_writer is not None and last_inline_writer["route"] == "mplay.ply-xwave.command-u32"
        if last_inline_writer is not None and last_inline_writer["wave"] is None:
            raise RuntimeError("relevant same-pass inline writer lacked a normalized WaveData target")
        if last_inline_writer is not None and last_inline_writer["wave"] != wave_role(oracle, wave):
            raise RuntimeError("same-pass inline writer target disagreed with ply_note selected wave")
        inline_ancestry = {
            "lastWriterRouteInSameMPlayMain": (
                last_inline_writer["route"] if last_inline_writer is not None else "pre-mplay-inline-tone-state"
            ),
            "plyXwaveCommandU32Ancestry": xwave,
            "writerBoundary": last_inline_writer["boundary"] if last_inline_writer is not None else None,
        }

    audio.setdefault("_noteWriters", []).append({
        "channelIndex": direct_channel_index,
        "mplayInvocationIndex": invocation,
        **role,
        "toneType": tone_type,
        "route": route,
        "selectorBoundary": BOUNDARY_ROLES[observed_selector],
        "channelWaveStoreBoundary": BOUNDARY_ROLES["ply-note-channel-wave-store"],
        "selectorInput": selector_input,
        "selectedToneRole": (
            "MusicPlayerTrack.ToneData"
            if selected_index is None
            else "MusicPlayerTrack.ToneData.wav-tone-table-row"
        ),
        "selectedToneIndex": selected_index,
        "wave": wave_role(oracle, wave),
        "inlineAncestry": inline_ancestry,
    })


def finalize_entry_provenance(audio: dict[str, Any]) -> None:
    targets = audio.get("soundMainRamEntryTargets")
    if not isinstance(targets, list):
        raise RuntimeError("provenance finalizer lacked v1 entry targets")
    last_by_channel: dict[int, dict[str, Any]] = {}
    for writer in audio.get("_noteWriters", []):
        last_by_channel[int(writer["channelIndex"])] = writer
    replacements: list[dict[str, Any]] = []
    for target in targets:
        if target["targetProducingRoute"] == "pre-mplay-persisted":
            continue
        index = int(target["channelIndex"])
        writer = last_by_channel.get(index)
        if writer is None:
            raise RuntimeError(f"MPlay-replaced channel {index} lacked a ply_note writer")
        descriptor = target["wave"]["directWaveTargetDescriptor"]
        entry_wave = {
            "storageRole": descriptor["storageRole"],
            "waveSymbol": descriptor["waveSymbol"],
            "payloadBytes": target["wave"]["size"],
            "payloadSha256": target["wave"]["sampleRegion"]["sha256"],
        }
        if writer["wave"] != entry_wave:
            raise RuntimeError(f"last ply_note writer for channel {index} disagreed with mixer entry")
        replacements.append(writer)
    audio["mplayReplacementProvenance"] = replacements


ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_provenance(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    if stage not in BOUNDARY_STAGES.values():
        ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    audio = active_audio(epoch)
    if audio is None:
        return
    if stage == "mplay-main-entry":
        audio["_mplayInvocationIndex"] = int(audio.get("_mplayInvocationIndex", -1)) + 1
    elif stage in {"ply-note-keysplit-selector", "ply-note-rhythm-selector", "ply-note-inline-selector"}:
        observe_selector(audio, oracle, stage)
    elif stage in {"ply-voice-inline-wave-store", "ply-xwave-inline-wave-store"}:
        observe_inline_writer(audio, oracle, stage)
    elif stage == "ply-note-channel-wave-store":
        observe_note_writer(audio, oracle)
    elif stage == "sound-main-ram-entry":
        finalize_entry_provenance(audio)


old.append_m4a_internal_stage = append_with_provenance


def compact_receipt(result: dict[str, Any]) -> dict[str, Any]:
    observations: list[dict[str, Any]] = []
    for workload in result["vblankWorkloadEvidence"]["interrupts"]:
        audio = workload.get("audioInternal")
        if audio is None:
            continue
        replacements = audio.get("mplayReplacementProvenance")
        if replacements:
            semantic = audio["state"]["sourceSemanticState"]
            targets = audio["soundMainRamEntryTargets"]
            observations.append({
                "sourceStateDigest": semantic["stateDigest"],
                "entryTargetStateDigest": hashlib.sha256(canonical_json(targets)).hexdigest(),
                "replacements": replacements,
            })
    return {
        "schema": "factory-m4a-mixer-entry-provenance/v2",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "captureBoundary": "source-general ply_note and inline-tone writer boundaries before sound-main-ram-entry",
        "addressFree": True,
        "classificationOnly": True,
        "boundaryRoles": BOUNDARY_ROLES,
        "frozenEntryTargetReference": {
            "packetSchema": "factory-m4a-soundmainram-entry-targets/v1",
            "joinKeys": ["sourceStateDigest", "entryTargetStateDigest"],
        },
        "observations": observations,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    result = old.run_anchor() if CASE == "anchor" else old.run_liliana()
    receipt = compact_receipt(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(receipt, indent=2) + "\n")
    count = sum(len(row["replacements"]) for row in receipt["observations"])
    print(f"wrote {OUTPUT}: {CASE} {count} classified replacements", flush=True)


if __name__ == "__main__":
    main()
