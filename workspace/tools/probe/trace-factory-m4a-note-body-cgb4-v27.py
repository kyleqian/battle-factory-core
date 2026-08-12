#!/usr/bin/env python3
"""Capture CGB4's one r2 scalar immediately before ``subs r2, 0x1``.

This Battle Scene OFF receipt freezes the three v26 ``sourceStateDigest``
rows.  It carries the established in-memory CGB4 association from the earlier
clock-exit boundary to pipelined PC 0x082DFC9C, where ``subs r2, 0x1`` at
0x082DFC9A is the next instruction.  The emitted packet retains only the
address-free ``r2BeforeDecrement`` machine scalar.  It does not read or emit
track count/index/identity, pointers, addresses, channel state, frame,
duration, condition flags, or either successor body.
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
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v25_for_v27", V25_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V25_PROBE}")
v25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v25)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  At this point
# `_081DDA62`'s ``subs r2, 0x1`` at 0x082DFC9A has not begun.  The PC itself
# is an in-process selector only; no preceding control-flow source state is
# retained in the compact packet.
R2_BEFORE_DECREMENT_PC = 0x082DFC9C
EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V26_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v26.json"
V26_EVIDENCE_SHA256 = "a4cff030582607369f63bd70cb1ed6a3c5afad4d36997d0f3626684a9122bae1"


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v26_selected_digests() -> tuple[str, ...]:
    """Load only v26's frozen rows, with the v26 strip-back schema exact."""
    raw = V26_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V26_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v27 frozen v26 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v26"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v27 frozen v26 identity changed")
    digests: list[str] = []
    for index, row in enumerate(evidence["rows"]):
        if not isinstance(row, dict) or set(row) != {
            "sourceStateDigest",
            "volPitchMaskDecision",
            "postV25FirstTrackVolPitchDecisionSourceCycles",
            "contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles",
            "beqTakenControlTransferRefills",
            "stopsBeforeV26Instruction",
        }:
            raise RuntimeError("CGB4 v27 frozen v26 row carries an unsupported field")
        digest = require_digest(row.get("sourceStateDigest"), f"CGB4 v27 frozen v26 row {index} digest")
        if (
            row.get("volPitchMaskDecision") != "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken"
            or row.get("postV25FirstTrackVolPitchDecisionSourceCycles") != 12
            or row.get("contiguousPrefixThroughFirstTrackVolPitchDecisionSourceCycles") != 828
            or row.get("beqTakenControlTransferRefills") != 1
            or row.get("stopsBeforeV26Instruction") != "_081DDA62: first instruction"
        ):
            raise RuntimeError("CGB4 v27 frozen v26 selected boundary changed")
        digests.append(digest)
    if len(digests) != 3 or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v27 frozen v26 selected-row census changed")
    return tuple(digests)


FROZEN_V26_SELECTED_DIGESTS = frozen_v26_selected_digests()
old = v25.old
old.M4A_INTERNAL_STAGE_PCS[R2_BEFORE_DECREMENT_PC] = "mplay-note-cgb4-first-track-r2-before-decrement"
ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_r2_before_decrement(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        # The inherited v25 path has just proven this association at the last
        # point where its CGB4 callback owner is unambiguous.  Keep only that
        # existing digest plus the in-memory callback record until the exact
        # decrement boundary; no track datum is reread or retained.
        digest = v25.v23.v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V26_SELECTED_DIGESTS:
            return
        entry = v25.v23.v21.v19.current_cgb4_entry(epoch)
        association = epoch.get("cgb4V23Pending")
        if (
            entry is None
            or not isinstance(association, dict)
            or association.get("entry") is not entry
            or association.get("sourceStateDigest") != digest
        ):
            raise RuntimeError("CGB4 v27 lost the established in-memory source-state association")
        if epoch.get("cgb4V27Pending") is not None:
            raise RuntimeError("CGB4 v27 decrement handoff overlapped a prior row")
        epoch["cgb4V27Pending"] = {"entry": entry, "sourceStateDigest": digest}
        return
    if stage != "mplay-note-cgb4-first-track-r2-before-decrement":
        return
    pending = epoch.get("cgb4V27Pending")
    if pending is None:
        return
    digest = v25.v23.v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V26_SELECTED_DIGESTS:
        raise RuntimeError("CGB4 v27 decrement boundary changed its frozen source-state digest")
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V27SeenSourceDigests", set())
    if digest in seen or "cgb4V27R2BeforeDecrement" in entry:
        raise RuntimeError("CGB4 v27 captured a frozen source-state digest more than once")
    # Capture precisely one register scalar.  Do not read CPSR, r5/r7/r9, any
    # memory, or either successor state; branch selection is derived later
    # from this source operand and pinned ROM instruction bytes.
    entry["cgb4V27R2BeforeDecrement"] = {"r2BeforeDecrement": int(oracle.core.cpu.gprs[2]) & 0xFFFFFFFF}
    seen.add(digest)
    epoch.pop("cgb4V27Pending", None)


old.append_m4a_internal_stage = append_with_r2_before_decrement


def compact(result: dict[str, Any]) -> dict[str, Any]:
    # Rebuild from the inherited source-state receipt, retaining only the
    # frozen digest association and this one new r2 scalar.
    receipt = v25.v23.v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v27 observed digest")
        if digest not in FROZEN_V26_SELECTED_DIGESTS:
            continue
        callbacks = [
            callback
            for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v27 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V27R2BeforeDecrement")
        if (
            not isinstance(state, dict)
            or set(state) != {"r2BeforeDecrement"}
            or not isinstance(state["r2BeforeDecrement"], int)
            or not 0 <= state["r2BeforeDecrement"] <= 0xFFFFFFFF
        ):
            raise RuntimeError("CGB4 v27 frozen source-state row missed its r2-before-decrement scalar")
        observations.append({"sourceStateDigest": digest, "r2BeforeDecrement": state["r2BeforeDecrement"]})
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if len(observations) != EXPECTED_SELECTED_ROWS[CASE] or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v27 frozen source-state rows are missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v27",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "immediately-before-_081DDA62-subs-r2-0x1",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 r2-before-decrement scalars", flush=True)


if __name__ == "__main__":
    main()
