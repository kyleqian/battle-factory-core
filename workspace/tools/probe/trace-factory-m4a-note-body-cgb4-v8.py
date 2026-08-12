#!/usr/bin/env python3
"""Capture only signed ``keyM`` at the first post-ChnVolSetAsm branch.

This additive Battle Scene OFF packet keeps the frozen v7 helper-entry
scalars and captures the one missing scalar consumed by the caller's
``key + keyM`` signed ``bpl`` at ``_081DDCA0``.  The capture is gated by the
ChnVolSetAsm return LR and retains no address, frame, duration, identity, or
result bytes.
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
V7_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v7.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v7_for_v8", V7_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V7_PROBE}")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  The caller's
# first post-helper branch is ``bpl _081DDCA0`` at 0x082DFED4, so its exact
# boundary is reported as 0x082DFED6.  The ChnVolSetAsm BL's LR is retained
# only as a live callsite gate and is never serialized.
POST_CHN_VOL_KEYM_BRANCH_PC = 0x082DFED6
PLY_NOTE_CHN_VOL_SET_RETURN = 0x082DFECD
old = helper.helper.body.body.note.wait.clear.channel.v3.old
old.M4A_INTERNAL_STAGE_PCS[POST_CHN_VOL_KEYM_BRANCH_PC] = "mplay-note-cgb4-post-chn-keym"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def signed8(value: int) -> int:
    return value - 0x100 if value & 0x80 else value


def append_with_keym(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-post-chn-keym":
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
    if entry.get("toneType") != 12 or "cgb4ChnVolSetState" not in entry:
        return
    if "cgb4PostChnVolSetState" in entry:
        raise RuntimeError("post-ChnVolSetAsm keyM was captured twice for one callback")

    track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    entry["cgb4PostChnVolSetState"] = {"keyM": signed8(oracle.read_u8(track + 0x08))}


old.append_m4a_internal_stage = append_with_keym


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = helper.compact(result)
    callbacks = [
        callback
        for observation in receipt["observations"]
        for callback in (observation["noteCallbacks"] or [])
        if callback.get("toneType") == 12
    ]
    if any("cgb4ChnVolSetState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed ChnVolSetAsm entry state")
    if any("cgb4PostChnVolSetState" not in callback for callback in callbacks):
        raise RuntimeError("an observed CGB4 callback missed post-ChnVolSetAsm keyM state")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v8",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_note-CGB4-post-ChnVolSetAsm-keyM-at-bpl",
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
    print(f"wrote {OUTPUT}: {len(callbacks)} CGB4 post-ChnVolSetAsm keyM states", flush=True)


if __name__ == "__main__":
    main()
