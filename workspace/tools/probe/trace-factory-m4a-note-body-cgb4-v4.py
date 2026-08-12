#!/usr/bin/env python3
"""Capture the address-free operands at the observed CGB4 TrkVolPitSet entry.

This additive sibling keeps the frozen v3 allocation-body packet and captures
only the track bytes read by the compiled ``TrkVolPitSet`` helper.  It observes
the zero-lfoDelay route after ``_081DDC66`` and deliberately retains no pointer,
frame, duration, or callback identity.
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
V3_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v3.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v3_for_v4", V3_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V3_PROBE}")
body = importlib.util.module_from_spec(spec)
spec.loader.exec_module(body)


# mGBA exposes pipelined Thumb PC (instruction + 2).  This is the PC while
# executing TrkVolPitSet's first ``push {r4, lr}`` at 0x082e0a80.
TRK_VOL_PIT_SET_ENTRY_PC = 0x082E0A82
PLY_NOTE_TRK_VOL_PIT_SET_RETURN = 0x082DFEA7
body.body.note.wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[TRK_VOL_PIT_SET_ENTRY_PC] = "mplay-note-cgb4-trk-vol-pit-set"

ORIGINAL_APPEND = body.body.note.wait.clear.channel.v3.old.append_m4a_internal_stage


def signed8(value: int) -> int:
    return value - 0x100 if value & 0x80 else value


def append_with_trk_vol_pit_set(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-trk-vol-pit-set":
        return
    workload = body.body.note.wait.clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    # TrkVolPitSet is also called by MPlayMain's later volume/pitch pass.  The
    # note allocation call is the BL at _081DDC66; its Thumb LR is the only
    # callsite discriminator needed here and is not serialized.
    if (int(oracle.core.cpu.gprs[14]) & 0xFFFFFFFF) != PLY_NOTE_TRK_VOL_PIT_SET_RETURN:
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12 or "cgb4AllocationBodyState" not in entry:
        return
    if "cgb4TrkVolPitSetState" in entry:
        raise RuntimeError("CGB4 TrkVolPitSet was captured twice for one callback")

    player = body.body.note.wait.clear.channel.sixth_player(oracle)
    track_count = oracle.read_u8(player + 0x08)
    tracks = body.body.note.wait.clear.channel.v3.old.read_u32(oracle, player + 0x2C)
    current_track = int(oracle.core.cpu.gprs[1]) & 0xFFFFFFFF
    delta = current_track - tracks
    track_size = body.body.note.wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0 or delta // track_size != entry["trackIndex"]:
        raise RuntimeError("TrkVolPitSet track does not match the pending sixth-player note")
    if entry["trackIndex"] >= track_count:
        raise RuntimeError("TrkVolPitSet track exceeds the sixth player's track count")

    # These are the only track fields read by the observed source route.  Keep
    # the signedness of the C source operands instead of retaining raw bytes.
    # The clear-only route does not read the volume/pan fields, so do not
    # serialize them there.
    flags = oracle.read_u8(current_track + 0x00)
    state: dict[str, Any] = {"flags": flags}
    if flags & 0x01:
        state["volume"] = {
            "vol": oracle.read_u8(current_track + 0x12),
            "volX": oracle.read_u8(current_track + 0x13),
            "pan": signed8(oracle.read_u8(current_track + 0x14)),
            "panX": signed8(oracle.read_u8(current_track + 0x15)),
            "modT": oracle.read_u8(current_track + 0x18),
        }
    entry["cgb4TrkVolPitSetState"] = state


body.body.note.wait.clear.channel.v3.old.append_m4a_internal_stage = append_with_trk_vol_pit_set


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = body.compact(result)
    cgb4 = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4TrkVolPitSetState" not in callback for callback in cgb4):
        raise RuntimeError("an observed type-12 callback missed the TrkVolPitSet entry")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v4",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_note-CGB4-TrkVolPitSet-entry",
        "addressFree": True,
        "observations": receipt["observations"],
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = body.body.note.wait.clear.channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = body.body.note.wait.clear.channel.v3.old.run_liliana()
    else:
        result = body.body.note.wait.clear.channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    callbacks = [
        callback
        for observation in packet["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 TrkVolPitSet states", flush=True)


if __name__ == "__main__":
    main()
