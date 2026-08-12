#!/usr/bin/env python3
"""Capture the live ``r6`` loop counter at CGB4's track-loop decrement.

This additive Battle Scene OFF packet inherits frozen v15 state and records
only the source register consumed by ``subs r6, 0x1; ble _081DD9A4``.  The
hook fires while the decrement instruction executes, so the captured scalar
is its pre-decrement value.  No pointer, address, frame, duration, track
count, or callback identity is serialized; track index remains a live-only
association check and is never used to derive the loop count.
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
V15_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v15.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v15_for_v17", V15_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V15_PROBE}")
v15 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v15)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  At this
# boundary ``subs r6, 0x1`` at 0x082dfbd0 is executing, before either branch
# successor begins.
TRACK_LOOP_DECREMENT_PC = 0x082DFBD2
old = v15.old
old.M4A_INTERNAL_STAGE_PCS[TRACK_LOOP_DECREMENT_PC] = "mplay-note-cgb4-track-loop-decrement"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_track_loop_count(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-track-loop-decrement":
        return
    workload = old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12 or "cgb4ModState" not in entry:
        return
    # Positive waits can revisit the track loop on later MPlay passes.  Retain
    # only the first decrement contiguous with the inherited v15 boundary.
    if "cgb4TrackLoopState" in entry:
        return

    # MPlayMain retains player 5 in r7 and the current track in r5 through
    # this loop.  Validate the inherited CGB4 entry live without serializing
    # either runtime address.  This association deliberately does not derive
    # a loop count from the track index.
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    tracks = old.read_u32(oracle, player + 0x2C)
    track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = track - tracks
    track_size = old.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0 or delta // track_size != entry["trackIndex"]:
        raise RuntimeError("track-loop decrement does not belong to the captured CGB4 track")

    entry["cgb4TrackLoopState"] = {
        "r6BeforeDecrement": int(oracle.core.cpu.gprs[6]) & 0xFFFFFFFF,
    }


old.append_m4a_internal_stage = append_with_track_loop_count


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v15.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4TrackLoopState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed its track-loop decrement")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v17",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-post-ply_note-track-loop-r6-before-subs",
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
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 pre-decrement r6 states", flush=True)


if __name__ == "__main__":
    main()
