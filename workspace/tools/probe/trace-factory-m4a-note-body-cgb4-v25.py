#!/usr/bin/env python3
"""Capture CGB4's first-track flags scalar after ``_081DD9C8``'s ``ldrb``.

This Battle Scene OFF receipt freezes v24 and follows only its three selected
``sourceStateDigest`` rows.  It carries v23's already-proven in-memory CGB4
association across the selected successor prefix, then retains only r0's u8
result after ``ldrb r0, [r5, o_MusicPlayerTrack_flags]`` and before
``movs r1, 0x80``.  Pointers, addresses, track identity/count/index, channel,
frame, duration, condition flags, and later state remain live-only.
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
V23_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v23.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v23_for_v25", V23_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V23_PROBE}")
v23 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v23)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  At this point
# ``ldrb r0, [r5, flags]`` at 0x082DFC00 has completed and ``movs r1, 0x80``
# at 0x082DFC02 has not executed.  The PC remains a live-only selector.
FIRST_TRACK_FLAGS_POST_LOAD_PC = 0x082DFC04
EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V24_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v24.json"
V24_EVIDENCE_SHA256 = "288bb342ff0e321c1d09646998bb30fde48b564015f487b9ea293dd21245e491"


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v24_selected_digests() -> tuple[str, ...]:
    """Load only v24's three selected rows, or fail closed."""
    raw = V24_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V24_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v25 frozen v24 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v24"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v25 frozen v24 identity changed")
    digests: list[str] = []
    for index, row in enumerate(evidence["rows"]):
        if not isinstance(row, dict) or set(row) != {
            "sourceStateDigest",
            "postV23SourceOnlySuccessorPrefixSourceCycles",
            "contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles",
            "stopsBeforeV24Instruction",
        }:
            raise RuntimeError("CGB4 v25 frozen v24 row carries an unsupported field")
        digest = require_digest(row.get("sourceStateDigest"), f"CGB4 v25 frozen v24 row {index} digest")
        if (
            row.get("postV23SourceOnlySuccessorPrefixSourceCycles") != 4
            or row.get("contiguousPrefixThroughSourceOnlySuccessorPrefixSourceCycles") != 808
            or row.get("stopsBeforeV24Instruction") != "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]"
        ):
            raise RuntimeError("CGB4 v25 frozen v24 selected boundary changed")
        digests.append(digest)
    if len(digests) != 3 or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v25 frozen v24 selected-row census changed")
    return tuple(digests)


FROZEN_V24_SELECTED_DIGESTS = frozen_v24_selected_digests()
old = v23.old
old.M4A_INTERNAL_STAGE_PCS[FIRST_TRACK_FLAGS_POST_LOAD_PC] = "mplay-note-cgb4-first-track-flags-post-ldrb"
ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_first_track_flags(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        # v23 establishes this association before the callback owner can
        # advance.  Carry that in memory through the exact v23/v24 successor
        # prefix rather than re-identifying a track at the later flags load.
        digest = v23.v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V24_SELECTED_DIGESTS:
            return
        entry = v23.v21.v19.current_cgb4_entry(epoch)
        association = epoch.get("cgb4V23Pending")
        if (
            entry is None
            or not isinstance(association, dict)
            or association.get("entry") is not entry
            or association.get("sourceStateDigest") != digest
        ):
            raise RuntimeError("CGB4 v25 lost v23's frozen in-memory source-state association")
        seen = epoch.setdefault("cgb4V25SeenSourceDigests", set())
        if digest in seen:
            raise RuntimeError("CGB4 v25 captured a frozen source-state digest more than once")
        if epoch.get("cgb4V25Pending") is not None:
            raise RuntimeError("CGB4 v25 first-track flags handoff overlapped a prior row")
        epoch["cgb4V25Pending"] = {"entry": entry, "sourceStateDigest": digest}
        return
    if stage != "mplay-note-cgb4-first-track-flags-post-ldrb":
        return
    pending = epoch.get("cgb4V25Pending")
    if pending is None:
        return
    digest = v23.v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V24_SELECTED_DIGESTS:
        raise RuntimeError("CGB4 v25 first-track flags boundary changed its frozen source-state digest")
    if epoch.get("cgb4V23Pending") is not None:
        raise RuntimeError("CGB4 v25 first-track flags arrived before the v23 handoff completed")
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V25SeenSourceDigests", set())
    if digest in seen or "cgb4V25FirstTrackFlags" in entry:
        raise RuntimeError("CGB4 v25 first-track flags were captured more than once")
    # r0 is the completed u8 ldrb result.  Do not read r5, r1, CPSR, or any
    # memory: the packet retains only the scalar consumed by MPT_FLG_EXIST.
    r0 = int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF
    if r0 > 0xFF:
        raise RuntimeError("CGB4 v25 post-ldrb r0 is not a zero-extended flags byte")
    entry["cgb4V25FirstTrackFlags"] = {"firstTrackFlags": r0}
    seen.add(digest)
    epoch.pop("cgb4V25Pending", None)


old.append_m4a_internal_stage = append_with_first_track_flags


def compact(result: dict[str, Any]) -> dict[str, Any]:
    # Rebuild from the inherited source-state receipt so output carries only
    # v24's digest key and the one newly captured flags scalar.
    receipt = v23.v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v25 observed digest")
        if digest not in FROZEN_V24_SELECTED_DIGESTS:
            continue
        callbacks = [
            callback
            for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v25 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V25FirstTrackFlags")
        if (
            not isinstance(state, dict)
            or set(state) != {"firstTrackFlags"}
            or not isinstance(state["firstTrackFlags"], int)
            or not 0 <= state["firstTrackFlags"] <= 0xFF
        ):
            raise RuntimeError("CGB4 v25 frozen source-state row missed its first-track flags scalar")
        observations.append({"sourceStateDigest": digest, "firstTrackFlags": state["firstTrackFlags"]})
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if len(observations) != EXPECTED_SELECTED_ROWS[CASE] or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v25 frozen source-state rows are missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v25",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 first-track flags scalars", flush=True)


if __name__ == "__main__":
    main()
