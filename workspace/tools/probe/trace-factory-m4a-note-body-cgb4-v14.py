#!/usr/bin/env python3
"""Capture only the immediate post-wait ``lfoSpeed`` scalar for CGB4 notes.

This additive Battle Scene OFF packet inherits frozen v13 state and adds the
single IWRAM byte consumed by MPlayMain's next decision.  The hook fires while
the ``ldrb r1, [r5, o_MusicPlayerTrack_lfoSpeed]`` instruction is executing;
the following ``mod`` read is deliberately never inspected or serialized.
No pointer, address, frame, duration, or callback identity is retained.
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
V13_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v13.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v13_for_v14", V13_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V13_PROBE}")
v13 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v13)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  This is the
# read immediately after v13's first wait decrement and before the mod read.
LFO_SPEED_LOAD_PC = 0x082DFB7C
old = v13.old
old.M4A_INTERNAL_STAGE_PCS[LFO_SPEED_LOAD_PC] = "mplay-note-cgb4-lfo-speed"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_lfo_speed(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-lfo-speed":
        return
    workload = old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12 or "cgb4PanSweepState" not in entry:
        return
    # A positive encoded wait re-enters this decision on later MPlay passes.
    # The first visit is the one contiguous with v13's post-note wait
    # decrement; later visits are outside this bounded packet.
    if "cgb4LfoSpeedState" in entry:
        return

    # MPlayMain retains player 5 in r7 and the current track in r5 through the
    # command/wait loop.  Validate this is exactly the inherited CGB4 entry
    # before reading its one scalar, without retaining either address.
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    tracks = old.read_u32(oracle, player + 0x2C)
    track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = track - tracks
    track_size = old.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0 or delta // track_size != entry["trackIndex"]:
        raise RuntimeError("lfoSpeed decision does not belong to the captured CGB4 track")

    entry["cgb4LfoSpeedState"] = {"lfoSpeed": oracle.read_u8(track + 0x19)}


old.append_m4a_internal_stage = append_with_lfo_speed


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v13.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4LfoSpeedState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed its lfoSpeed decision")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v14",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-post-ply_note-lfoSpeed-decision",
        "addressFree": True,
        "observations": receipt["observations"],
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
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    callbacks = [
        callback
        for observation in packet["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 lfoSpeed states", flush=True)


if __name__ == "__main__":
    main()
