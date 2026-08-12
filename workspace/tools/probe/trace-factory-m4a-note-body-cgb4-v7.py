#!/usr/bin/env python3
"""Capture only the scalar operands read at observed ``ChnVolSetAsm`` entry.

This additive Battle Scene OFF packet inherits the frozen v4 source-state join
and serializes no pointer, frame, duration, callback identity, or result byte.
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
V4_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v4.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v4_for_v7", V4_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V4_PROBE}")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  The caller's
# Thumb LR is retained only as a live callsite discriminator and is never
# serialized.
CHN_VOL_SET_ENTRY_PC = 0x082DFD0A
PLY_NOTE_CHN_VOL_SET_RETURN = 0x082DFECD
helper.body.body.note.wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[CHN_VOL_SET_ENTRY_PC] = "mplay-note-cgb4-chn-vol-set"

ORIGINAL_APPEND = helper.body.body.note.wait.clear.channel.v3.old.append_m4a_internal_stage


def signed8(value: int) -> int:
    return value - 0x100 if value & 0x80 else value


def append_with_chn_vol_set(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-chn-vol-set":
        return
    workload = helper.body.body.note.wait.clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    if (int(oracle.core.cpu.gprs[14]) & 0xFFFFFFFF) != PLY_NOTE_CHN_VOL_SET_RETURN:
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12 or "cgb4TrkVolPitSetState" not in entry:
        return
    if "cgb4ChnVolSetState" in entry:
        raise RuntimeError("CGB4 ChnVolSetAsm entry was captured twice for one callback")

    channel = int(oracle.core.cpu.gprs[4]) & 0xFFFFFFFF
    track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    entry["cgb4ChnVolSetState"] = {
        "velocity": oracle.read_u8(channel + 0x12),
        "rhythmPan": signed8(oracle.read_u8(channel + 0x14)),
        "volMR": oracle.read_u8(track + 0x10),
        "volML": oracle.read_u8(track + 0x11),
    }


helper.body.body.note.wait.clear.channel.v3.old.append_m4a_internal_stage = append_with_chn_vol_set


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = helper.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4ChnVolSetState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed ChnVolSetAsm entry")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v7",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_note-CGB4-ChnVolSetAsm-entry-scalars",
        "addressFree": True,
        "observations": receipt["observations"],
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = helper.body.body.note.wait.clear.channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = helper.body.body.note.wait.clear.channel.v3.old.run_liliana()
    else:
        result = helper.body.body.note.wait.clear.channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    callbacks = [
        callback
        for observation in packet["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 ChnVolSetAsm entry states", flush=True)


if __name__ == "__main__":
    main()
