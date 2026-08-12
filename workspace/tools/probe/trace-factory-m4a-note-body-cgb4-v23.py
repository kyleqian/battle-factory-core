#!/usr/bin/env python3
"""Capture CGB4's post-``subs`` r0 scalar at ``_081DD9BC``.

This Battle Scene OFF receipt accepts only the three frozen v22 rows whose
source-selected successor is ``_081DD9B6``.  It records the one scalar left in
the source register at the entry to ``strh r0, [r7, tempoC]``: the unsigned
post-subtraction r0 value.  The original tempoC value, pointers, runtime
addresses, frames, durations, clock, track identity/index/count, condition
flags, and every later instruction remain live-only and are never serialized.
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
V21_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v21.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v21_for_v23", V21_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V21_PROBE}")
v21 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v21)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  At this point
# the preceding ``subs r0, 150`` has completed and ``strh`` has not begun.
# The PC itself is used only as an in-process instruction selector.
SUBTRACTION_RESULT_ENTRY_PC = 0x082DFBF6
EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V22_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v22.json"
V22_EVIDENCE_SHA256 = "fb345eca1778d2b2f4514f6a0eee33b4749d2ad0e2c3441195d332c8e2282ad0"


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v22_selected_digests() -> dict[str, tuple[str, ...]]:
    """Load only v22's selected-successor membership by digest, or fail closed."""
    raw = V22_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V22_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v23 frozen v22 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v22"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v23 frozen v22 identity changed")
    result: dict[str, list[str]] = {name: [] for name in EXPECTED_SELECTED_ROWS}
    seen: set[str] = set()
    for row in evidence["rows"]:
        if not isinstance(row, dict):
            raise RuntimeError("CGB4 v23 frozen v22 row is malformed")
        case = row.get("case")
        digest = require_digest(row.get("sourceStateDigest"), "CGB4 v23 frozen v22 row digest")
        if case not in result or digest in seen:
            raise RuntimeError("CGB4 v23 frozen v22 digest join is missing or ambiguous")
        seen.add(digest)
        if row.get("selectedSuccessor") == "_081DD9B6":
            if (
                row.get("clockExitR4Nonzero") is not True
                or row.get("postV21SelectedSuccessorPrefixSourceCycles") != 6
                or row.get("stopsBeforeV22Instruction") != "_081DD9BC: strh r0, [r7, o_MusicPlayerInfo_tempoC]"
            ):
                raise RuntimeError("CGB4 v23 frozen v22 selected-successor boundary changed")
            result[case].append(digest)
        elif (
            row.get("selectedSuccessor") is not None
            or row.get("postV21SelectedSuccessorPrefixSourceCycles") is not None
            or row.get("stopsBeforeV22Instruction") != "_081DD886"
        ):
            raise RuntimeError("CGB4 v23 frozen v22 EXIST-set null boundary changed")
    if len(seen) != 7 or any(len(result[name]) != EXPECTED_SELECTED_ROWS[name] for name in result):
        raise RuntimeError("CGB4 v23 frozen v22 selected-row census changed")
    return {name: tuple(digests) for name, digests in result.items()}


FROZEN_V22_SELECTED_DIGESTS = frozen_v22_selected_digests()
old = v21.old
old.M4A_INTERNAL_STAGE_PCS[SUBTRACTION_RESULT_ENTRY_PC] = "mplay-note-cgb4-subtraction-result-entry"
ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_subtraction_result(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    # The preceding branch boundary is where v21's inherited probe still has
    # its exact CGB4 callback association.  Arm an in-memory handoff there;
    # it retains just the frozen digest and callback record, never a runtime
    # pointer/address, frame, duration, tempoC, or track datum.
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        digest = v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V22_SELECTED_DIGESTS[CASE]:
            return
        entry = v21.v19.current_cgb4_entry(epoch)
        if entry is None:
            raise RuntimeError("CGB4 v23 selected branch lost its frozen CGB4 association")
        if "cgb4V23SubtractionResult" in entry:
            raise RuntimeError("CGB4 v23 armed an already-captured frozen source-state digest")
        pending = epoch.get("cgb4V23Pending")
        if pending is not None:
            raise RuntimeError("CGB4 v23 selected branch overlapped a prior result handoff")
        epoch["cgb4V23Pending"] = {"entry": entry, "sourceStateDigest": digest}
        return
    if stage != "mplay-note-cgb4-subtraction-result-entry":
        return
    pending = epoch.get("cgb4V23Pending")
    if pending is None:
        return
    digest = v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V22_SELECTED_DIGESTS[CASE]:
        raise RuntimeError("CGB4 v23 subtraction entry changed its frozen source-state digest")
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V23SeenSourceDigests", set())
    if digest in seen or "cgb4V23SubtractionResult" in entry:
        raise RuntimeError("CGB4 v23 captured a frozen source-state digest more than once")
    # The post-subs result is the exact source operand at the entry to strh.
    # Keep it as r0's unsigned machine scalar; do not read tempoC, r7, flags,
    # or any later branch/body state.
    entry["cgb4V23SubtractionResult"] = {"subtractionResult": int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF}
    seen.add(digest)
    epoch.pop("cgb4V23Pending", None)


old.append_m4a_internal_stage = append_with_subtraction_result


def compact(result: dict[str, Any]) -> dict[str, Any]:
    # Rebuild packets from the base receipt so output contains only the frozen
    # digest join key and this one newly captured scalar.
    receipt = v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v23 observed digest")
        if digest not in FROZEN_V22_SELECTED_DIGESTS[CASE]:
            continue
        callbacks = [
            callback
            for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v23 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V23SubtractionResult")
        if (
            not isinstance(state, dict)
            or set(state) != {"subtractionResult"}
            or not isinstance(state["subtractionResult"], int)
            or not 0 <= state["subtractionResult"] <= 0xFFFFFFFF
        ):
            raise RuntimeError("CGB4 v23 frozen source-state row missed its post-subs r0 scalar")
        observations.append({"sourceStateDigest": digest, "subtractionResult": state["subtractionResult"]})
    expected = FROZEN_V22_SELECTED_DIGESTS[CASE]
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if actual != expected or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v23 frozen source-state rows were reordered, missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v23",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "post-subs-r0-at-_081DD9BC-entry-before-strh",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 post-subs r0 scalars", flush=True)


if __name__ == "__main__":
    main()
