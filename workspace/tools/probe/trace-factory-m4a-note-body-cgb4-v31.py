#!/usr/bin/env python3
"""Capture CGB4's second-loop r2 scalar immediately before ``subs r2, 0x1``.

This Battle Scene OFF receipt freezes v30's three selected
``sourceStateDigest`` rows.  The two post-load visits are an in-memory
iteration discriminator only.  Once the frozen clear-mask branch reaches
``_081DDA62``, the packet retains exactly that digest plus r2's address-free
machine scalar before its decrement.  It does not read or emit pointers,
addresses, track count/index/identity, channel, frame, duration, condition
flags, wider state, a subtraction result, or either successor body.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from hashlib import sha256
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

HERE = Path(__file__).resolve().parent
V25_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v25.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v25_for_v31", V25_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V25_PROBE}")
v25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v25)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  This is the
# instruction boundary immediately before `_081DDA62`'s `subs r2, 0x1` at
# 0x082DFC9A.  The PC only selects an in-memory observation; it is not output.
R2_BEFORE_DECREMENT_PC = 0x082DFC9C
EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V30_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v30.json"
V30_EVIDENCE_SHA256 = "dad6dbec1ab4956cecbe6041535f387ffd1d14107267504b70afaaf472242477"


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v30_selected_digests() -> tuple[str, ...]:
    """Load only v30's frozen three-row, exact-key boundary."""
    raw = V30_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V30_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v31 frozen v30 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v30"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v31 frozen v30 identity changed")
    expected_keys = {
        "sourceStateDigest",
        "secondTrackFlags",
        "secondTrackVolPitchMaskDecision",
        "postV29SecondTrackVolPitchDecisionSourceCycles",
        "contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles",
        "beqTakenControlTransferRefills",
        "stopsBeforeV30Instruction",
    }
    digests: list[str] = []
    for index, row in enumerate(evidence["rows"]):
        if not isinstance(row, dict) or set(row) != expected_keys:
            raise RuntimeError("CGB4 v31 frozen v30 row carries an unsupported field")
        digest = require_digest(row.get("sourceStateDigest"), f"CGB4 v31 frozen v30 row {index} digest")
        if (
            row.get("secondTrackFlags") != 0x80
            or row.get("secondTrackVolPitchMaskDecision") != "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken"
            or row.get("postV29SecondTrackVolPitchDecisionSourceCycles") != 12
            or row.get("contiguousPrefixThroughSecondTrackVolPitchDecisionSourceCycles") != 864
            or row.get("beqTakenControlTransferRefills") != 1
            or row.get("stopsBeforeV30Instruction") != "_081DDA62: first instruction"
        ):
            raise RuntimeError("CGB4 v31 frozen v30 selected boundary changed")
        digests.append(digest)
    if len(digests) != 3 or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v31 frozen v30 selected-row census changed")
    return tuple(digests)


FROZEN_V30_SELECTED_DIGESTS = frozen_v30_selected_digests()
old = v25.old
old.M4A_INTERNAL_STAGE_PCS[R2_BEFORE_DECREMENT_PC] = "mplay-note-cgb4-second-track-r2-before-decrement"
ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_second_track_r2_before_decrement(
    epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str
) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        # The inherited v25 path proved this existing association at its last
        # unambiguous owner point.  Carry only that digest and callback record
        # until this probe's exact selected second-visit boundary.
        digest = v25.v23.v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V30_SELECTED_DIGESTS:
            return
        entry = v25.v23.v21.v19.current_cgb4_entry(epoch)
        association = epoch.get("cgb4V23Pending")
        if (
            entry is None
            or not isinstance(association, dict)
            or association.get("entry") is not entry
            or association.get("sourceStateDigest") != digest
        ):
            raise RuntimeError("CGB4 v31 lost the established source-state association")
        if epoch.get("cgb4V31Pending") is not None:
            raise RuntimeError("CGB4 v31 second-track decrement handoff overlapped a prior row")
        epoch["cgb4V31Pending"] = {"entry": entry, "sourceStateDigest": digest, "loadsSeen": 0}
        return
    pending = epoch.get("cgb4V31Pending")
    if pending is None:
        return
    digest = v25.v23.v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V30_SELECTED_DIGESTS:
        raise RuntimeError("CGB4 v31 decrement boundary changed its frozen source-state digest")
    if stage == "mplay-note-cgb4-first-track-flags-post-ldrb":
        # This counter is a live discriminator only.  Do not read r0 or
        # serialize the visit count; v30 is the frozen flags decision receipt.
        pending["loadsSeen"] += 1
        if pending["loadsSeen"] > 2:
            raise RuntimeError("CGB4 v31 reached an unexpected extra flags load before capture")
        return
    if stage != "mplay-note-cgb4-second-track-r2-before-decrement":
        return
    # `_081DDA62` is also reached by the first track after its one flags
    # load.  Keep that visit entirely in-memory; the selected second loop is
    # the only visit after exactly two loads.
    if pending["loadsSeen"] < 2:
        return
    if pending["loadsSeen"] != 2:
        raise RuntimeError("CGB4 v31 reached _081DDA62 without exactly two frozen flags loads")
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V31SeenSourceDigests", set())
    if digest in seen or "cgb4V31R2BeforeDecrement" in entry:
        raise RuntimeError("CGB4 v31 captured a frozen source-state digest more than once")
    # Capture exactly one scalar.  Do not read CPSR, r5/r7/r9, any memory, or
    # either successor; the `ble` route is derived later from r2 plus source.
    entry["cgb4V31R2BeforeDecrement"] = {"r2BeforeDecrement": int(oracle.core.cpu.gprs[2]) & 0xFFFFFFFF}
    seen.add(digest)
    epoch.pop("cgb4V31Pending", None)


old.append_m4a_internal_stage = append_with_second_track_r2_before_decrement


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v25.v23.v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v31 observed digest")
        if digest not in FROZEN_V30_SELECTED_DIGESTS:
            continue
        callbacks = [
            callback for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v31 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V31R2BeforeDecrement")
        if (
            not isinstance(state, dict)
            or set(state) != {"r2BeforeDecrement"}
            or not isinstance(state["r2BeforeDecrement"], int)
            or not 0 <= state["r2BeforeDecrement"] <= 0xFFFFFFFF
        ):
            raise RuntimeError("CGB4 v31 frozen row missed its r2-before-decrement scalar")
        observations.append({"sourceStateDigest": digest, "r2BeforeDecrement": state["r2BeforeDecrement"]})
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if len(observations) != EXPECTED_SELECTED_ROWS[CASE] or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v31 frozen rows are missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v31",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "second-track-immediately-before-_081DDA62-subs-r2-0x1",
        "addressFree": True,
        "observations": observations,
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 second-track r2-before-decrement scalars", flush=True)


if __name__ == "__main__":
    main()
