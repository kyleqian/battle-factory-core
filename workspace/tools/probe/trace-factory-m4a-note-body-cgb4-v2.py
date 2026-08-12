#!/usr/bin/env python3
"""Capture the mutable CGB-channel state at the accepted ply_note prefix.

This additive sibling keeps the frozen address-free note census and adds only
the state read by the source immediately after CGB channel-4 pointer
selection: status flags, channel priority, and the unsigned channel-track
ordering relation against the current sixth-player track.  No pointer or
timing identity is serialized.
"""

from __future__ import annotations

import importlib.util
import json
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
NOTE_PROBE = HERE / "trace-factory-m4a-note-census-v1.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_census_v1_for_cgb4", NOTE_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {NOTE_PROBE}")
note = importlib.util.module_from_spec(spec)
spec.loader.exec_module(note)


# mGBA reports pipelined Thumb PC (instruction + 2).  This is the PC after
# the accepted prefix's final ``adds r4, r0`` and at the first mutable read:
# ``ldrb r1, [r4, o_CgbChannel_statusFlags]``.
CGB4_STATUS_ENTRY_PC = 0x082DFE04
note.wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[CGB4_STATUS_ENTRY_PC] = "mplay-note-cgb4-status"

ORIGINAL_APPEND = note.wait.clear.channel.v3.old.append_m4a_internal_stage


def track_relation(channel_track: int, current_track: int) -> str:
    if channel_track == 0:
        return "null"
    if channel_track < current_track:
        return "less"
    if channel_track == current_track:
        return "equal"
    return "greater"


def append_with_cgb4_state(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    workload = note.wait.clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload or stage != "mplay-note-cgb4-status":
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return

    entry = capture["entries"][-1]
    player = note.wait.clear.channel.sixth_player(oracle)
    tracks = note.wait.clear.channel.v3.old.read_u32(oracle, player + 0x2C)
    current_track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = current_track - tracks
    track_size = note.wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0:
        return
    if delta // track_size != entry["trackIndex"] or entry["toneType"] != 12:
        return

    cgb_start = note.wait.clear.channel.v3.old.read_u32(
        oracle, note.wait.clear.channel.v3.SOUND_INFO_ADDR + note.wait.clear.channel.v3.old.SOUND_INFO_CGB_CHANS
    )
    channel = int(oracle.core.cpu.gprs[4]) & 0xFFFFFFFF
    channel_index = (channel - cgb_start) // note.wait.clear.channel.v3.CGB_CHANNEL_SIZE
    if channel_index != 3:
        raise RuntimeError("type-12 note did not select CGB channel 4")
    channel_track = note.wait.clear.channel.v3.old.read_u32(oracle, channel + 0x2C)
    entry["cgb4MutableState"] = {
        "statusFlags": oracle.read_u8(channel + 0x00),
        "priority": oracle.read_u8(channel + 0x13),
        "trackRelation": track_relation(channel_track, current_track),
    }


note.wait.clear.channel.v3.old.append_m4a_internal_stage = append_with_cgb4_state


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = note.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
    ]
    cgb4 = [callback for callback in callbacks if callback.get("toneType") == 12]
    if any("cgb4MutableState" not in callback for callback in cgb4):
        raise RuntimeError("an observed type-12 callback missed the mutable-state boundary")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v2",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_note-CGB4-status-priority-track",
        "addressFree": True,
        "observations": receipt["observations"],
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = note.wait.clear.channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = note.wait.clear.channel.v3.old.run_liliana()
    else:
        result = note.wait.clear.channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    callbacks = [
        callback
        for observation in packet["observations"]
        for callback in (observation["noteCallbacks"] or [])
    ]
    print(
        f"wrote {OUTPUT}: {len(callbacks)} callbacks, "
        f"{sum('cgb4MutableState' in callback for callback in callbacks)} CGB4 states",
        flush=True,
    )


if __name__ == "__main__":
    main()
