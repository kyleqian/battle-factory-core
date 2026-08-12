#!/usr/bin/env python3
"""Capture the address-free CGB4 allocation-body operands at ``_081DDC40``.

This additive sibling keeps the accepted v2 CGB4 status/priority/track route
and captures only the mutable state consumed by the allocation body before
``clear_modM``/``TrkVolPitSet``: the selected channel's chain links and owner,
the current track's channel link, and ``lfoDelay``.  No pointer, duration,
frame, case, or callback schedule is serialized.
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
V2_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v2.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v2_for_v3", V2_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V2_PROBE}")
body = importlib.util.module_from_spec(spec)
spec.loader.exec_module(body)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  This is the
# PC after ``adds r0, r4, 0`` and immediately before the ClearChain BL at the
# compiled ``_081DDC40`` allocation-body entry.
CGB4_ALLOCATION_BODY_PC = 0x082DFE7A
body.note.wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[CGB4_ALLOCATION_BODY_PC] = "mplay-note-cgb4-allocation-body"

ORIGINAL_APPEND = body.note.wait.clear.channel.v3.old.append_m4a_internal_stage


def channel_role(value: int, direct_start: int, cgb_start: int) -> str | None:
    role = body.note.wait.clear.channel.v3.channel_role(value, direct_start, cgb_start)
    if role == "unmapped-channel":
        raise RuntimeError("allocation-body channel link is outside the source channel pools")
    return role


def track_role(value: int, tracks: int, track_count: int) -> str | None:
    if value == 0:
        return None
    delta = value - tracks
    if delta < 0 or delta % body.note.wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE != 0:
        raise RuntimeError("allocation-body channel owner is outside the sixth player's track array")
    index = delta // body.note.wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
    if index >= track_count:
        raise RuntimeError("allocation-body channel owner exceeds the sixth player's track count")
    return f"music-player-5-track-{index}"


def append_with_allocation_body(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    workload = body.note.wait.clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload or stage != "mplay-note-cgb4-allocation-body":
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12 or "cgb4MutableState" not in entry:
        return
    if "cgb4AllocationBodyState" in entry:
        raise RuntimeError("CGB4 allocation body was captured twice for one callback")

    player = body.note.wait.clear.channel.sixth_player(oracle)
    track_count = oracle.read_u8(player + 0x08)
    tracks = body.note.wait.clear.channel.v3.old.read_u32(oracle, player + 0x2C)
    current_track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = current_track - tracks
    track_size = body.note.wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0 or delta // track_size != entry["trackIndex"]:
        raise RuntimeError("allocation-body track does not match the pending sixth-player note")

    direct_start = body.note.wait.clear.channel.v3.SOUND_INFO_ADDR + body.note.wait.clear.channel.v3.old.SOUND_INFO_CHANNELS
    cgb_start = body.note.wait.clear.channel.v3.old.read_u32(
        oracle, body.note.wait.clear.channel.v3.SOUND_INFO_ADDR + body.note.wait.clear.channel.v3.old.SOUND_INFO_CGB_CHANS
    )
    current_channel = int(oracle.core.cpu.gprs[4]) & 0xFFFFFFFF
    current_role = channel_role(current_channel, direct_start, cgb_start)
    if current_role != "cgb-channel-3":
        raise RuntimeError(f"type-12 allocation body selected {current_role!r}, expected cgb-channel-3")

    entry["cgb4AllocationBodyState"] = {
        "currentRole": current_role,
        "trackRole": track_role(body.note.wait.clear.channel.v3.old.read_u32(oracle, current_channel + 0x2C), tracks, track_count),
        "previousRole": channel_role(body.note.wait.clear.channel.v3.old.read_u32(oracle, current_channel + 0x30), direct_start, cgb_start),
        "nextRole": channel_role(body.note.wait.clear.channel.v3.old.read_u32(oracle, current_channel + 0x34), direct_start, cgb_start),
        "trackChanRole": channel_role(body.note.wait.clear.channel.v3.old.read_u32(oracle, current_track + 0x20), direct_start, cgb_start),
        "lfoDelay": oracle.read_u8(current_track + 0x1B),
    }


body.note.wait.clear.channel.v3.old.append_m4a_internal_stage = append_with_allocation_body


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = body.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4AllocationBodyState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed the allocation-body boundary")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v3",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_note-CGB4-allocation-body-before-ClearChain",
        "addressFree": True,
        "observations": receipt["observations"],
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = body.note.wait.clear.channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = body.note.wait.clear.channel.v3.old.run_liliana()
    else:
        result = body.note.wait.clear.channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    callbacks = [
        callback
        for observation in packet["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 allocation-body states", flush=True)


if __name__ == "__main__":
    main()
