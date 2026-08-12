#!/usr/bin/env python3
"""Capture only ``ToneData.pan_sweep`` at the CGB4 sweep branch.

This additive Battle Scene OFF packet retains the frozen v8 packet byte-for-
byte and serializes the one missing scalar consumed at the two-stage CGB sweep
branch.  The live ChnVolSetAsm return LR gates the exact pipelined Thumb
boundary; no pointer, frame, duration, identity, helper target, or result is
retained.
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
V8_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v8.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v8_for_v9", V8_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V8_PROBE}")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  The first
# pan_sweep test is ``bne _081DDCBA`` at 0x082DFEEA, hence the exact boundary
# is 0x082DFEEC.  The ChnVolSetAsm BL's LR survives through this point and is
# used only as a live callsite gate.
PAN_SWEEP_BRANCH_PC = 0x082DFEEC
PLY_NOTE_CHN_VOL_SET_RETURN = 0x082DFECD
old = helper.old
old.M4A_INTERNAL_STAGE_PCS[PAN_SWEEP_BRANCH_PC] = "mplay-note-cgb4-pan-sweep"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_pan_sweep(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-pan-sweep":
        return
    workload = old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    if (int(oracle.core.cpu.gprs[14]) & 0xFFFFFFFF) != PLY_NOTE_CHN_VOL_SET_RETURN:
        return
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12 or "cgb4PostChnVolSetState" not in entry:
        return
    if "cgb4PanSweepState" in entry:
        raise RuntimeError("CGB4 ToneData.pan_sweep was captured twice for one callback")

    tone = int(oracle.core.cpu.gprs[6]) & 0xFFFFFFFF
    entry["cgb4PanSweepState"] = {"panSweep": oracle.read_u8(tone + 0x03)}


old.append_m4a_internal_stage = append_with_pan_sweep


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = helper.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4PostChnVolSetState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed frozen v8 post-helper state")
    if any("cgb4PanSweepState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed ToneData.pan_sweep")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v9",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_note-CGB4-pan-sweep-at-bne",
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
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 ToneData.pan_sweep states", flush=True)


if __name__ == "__main__":
    main()
