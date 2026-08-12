#!/usr/bin/env python3
"""Capture the post-``ply_note`` command byte and its storage class.

This additive Battle Scene OFF packet retains frozen v9 state and records only
the scalar consumed by MPlayMain's next ``ldrb r1, [r2]`` plus an address-free
classification of the pointed-to storage.  The hook is armed only after the
same entry has reached the CGB4 pan-sweep boundary, so unrelated command-loop
loads cannot satisfy the receipt.  No pointer, frame, duration, or identity is
serialized.
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
V9_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v9.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v9_for_v13", V9_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V9_PROBE}")
v9 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v9)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  At 0x82dfb1a
# MPlayMain executes the first command-byte load after the callback returns.
COMMAND_BYTE_LOAD_PC = 0x082DFB1C
old = v9.old
old.M4A_INTERNAL_STAGE_PCS[COMMAND_BYTE_LOAD_PC] = "mplay-note-cgb4-next-command-byte"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def storage_class(address: int) -> str:
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


def append_with_next_command(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-next-command-byte":
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
    if "cgb4NextCommandState" in entry:
        return

    # MPlayMain keeps its own MusicPlayerInfo in r7 for the whole track loop;
    # the inherited census has already admitted entries only for player 5.
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    tracks = old.read_u32(oracle, player + 0x2C)
    track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = track - tracks
    track_size = old.MUSIC_PLAYER_TRACK_SIZE
    if delta < 0 or delta % track_size != 0 or delta // track_size != entry["trackIndex"]:
        raise RuntimeError("post-ply_note command load does not belong to the captured track")

    command_pointer = int(oracle.core.cpu.gprs[2]) & 0xFFFFFFFF
    storage = storage_class(command_pointer)
    if storage == "other-or-unreadable":
        raise RuntimeError("post-ply_note command pointer targets unreadable storage")
    entry["cgb4NextCommandState"] = {
        "commandByte": oracle.read_u8(command_pointer),
        "storageClass": storage,
    }


old.append_m4a_internal_stage = append_with_next_command


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v9.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4NextCommandState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed its next command-byte load")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v13",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-post-ply_note-next-command-byte-load",
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
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 next-command states", flush=True)


if __name__ == "__main__":
    main()
