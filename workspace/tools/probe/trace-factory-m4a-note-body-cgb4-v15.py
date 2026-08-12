#!/usr/bin/env python3
"""Capture only the immediate post-wait ``mod`` scalar for CGB4 notes.

This additive Battle Scene OFF packet inherits frozen v14 state and adds the
single IWRAM byte consumed by MPlayMain's immediate modulation decision.  The
following ``lfoDelayC`` read is deliberately never inspected or serialized.
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
V14_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v14.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v14_for_v15", V14_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V14_PROBE}")
v14 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v14)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  This is the
# immediate IWRAM mod load after v14's lfoSpeed decision and before lfoDelayC.
MOD_LOAD_PC = 0x082DFB82
old = v14.old
old.M4A_INTERNAL_STAGE_PCS[MOD_LOAD_PC] = "mplay-note-cgb4-mod"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_mod(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-mod":
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
    if "cgb4ModState" in entry:
        return

    # MPlayMain retains player 5 in r7 and the current track in r5 through the
    # command/wait loop.  Validate the inherited CGB4 entry without retaining
    # either runtime address.
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    tracks = old.read_u32(oracle, player + 0x2C)
    track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = track - tracks
    track_size = old.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0 or delta // track_size != entry["trackIndex"]:
        raise RuntimeError("mod decision does not belong to the captured CGB4 track")

    entry["cgb4ModState"] = {"mod": oracle.read_u8(track + 0x17)}


old.append_m4a_internal_stage = append_with_mod


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v14.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4ModState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed its immediate mod decision")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v15",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-post-ply_note-mod-decision",
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
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 mod states", flush=True)


if __name__ == "__main__":
    main()
