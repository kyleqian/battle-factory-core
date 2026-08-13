#!/usr/bin/env python3
"""Capture CGB4's fourth-track r2 scalar immediately before ``subs r2, 0x1``.

This Battle Scene OFF receipt freezes v38's three selected
``sourceStateDigest`` rows. The live-only selector requires the fourth aligned
track in the current ``MusicPlayerInfo.tracks`` array and exactly four flag
load visits. The emitted packet retains only that digest plus r2's
address-free machine scalar before its decrement. It does not read or emit
pointers, addresses, track count/index/identity, channel, frame, duration,
condition flags, wider state, a subtraction result, or either successor body.
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
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v25_for_v39", V25_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V25_PROBE}")
v25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v25)


# mGBA exposes pipelined Thumb PC (executing instruction + 2). This is the
# boundary immediately before `_081DDA62`'s `subs r2, 0x1` at 0x082DFC9A.
# PCs are live-only selectors and are never serialized.
FOURTH_TRACK_R2_BEFORE_DECREMENT_PC = 0x082DFC9C
FOURTH_TRACK_FLAGS_POST_LOAD_PC = 0x082DFC04
EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V38_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v38.json"
V38_EVIDENCE_SHA256 = "374076dfde52abfb519edd9e121c851ea55cd1f1ac13bf4675613f2e26d0b8ce"
TRACK_COUNT_OFFSET = 0x08
TRACKS_OFFSET = 0x2C
TRACK_SIZE = 0x50
FOURTH_TRACK_INDEX = 3


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v38_selected_digests() -> tuple[str, ...]:
    """Load only v38's three selected rows, or fail closed."""
    raw = V38_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V38_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v39 frozen v38 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v38"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v39 frozen v38 identity changed")
    expected_keys = {
        "sourceStateDigest",
        "fourthTrackVolPitchMaskDecision",
        "postV37FourthTrackVolPitchDecisionSourceCycles",
        "contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles",
        "beqTakenControlTransferRefills",
        "stopsBeforeV38Instruction",
    }
    digests: list[str] = []
    for index, row in enumerate(evidence["rows"]):
        if not isinstance(row, dict) or set(row) != expected_keys:
            raise RuntimeError("CGB4 v39 frozen v38 row carries an unsupported field")
        digest = require_digest(row.get("sourceStateDigest"), f"CGB4 v39 frozen v38 row {index} digest")
        if (
            row.get("fourthTrackVolPitchMaskDecision") != "MPT_FLG_VOLCHG|MPT_FLG_PITCHG-clear-beq-taken"
            or row.get("postV37FourthTrackVolPitchDecisionSourceCycles") != 12
            or row.get("contiguousPrefixThroughFourthTrackVolPitchDecisionSourceCycles") != 936
            or row.get("beqTakenControlTransferRefills") != 1
            or row.get("stopsBeforeV38Instruction") != "_081DDA62: subs r2, 0x1"
        ):
            raise RuntimeError("CGB4 v39 frozen v38 selected boundary changed")
        digests.append(digest)
    if len(digests) != 3 or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v39 frozen v38 selected-row census changed")
    return tuple(digests)


FROZEN_V38_SELECTED_DIGESTS = frozen_v38_selected_digests()
old = v25.old
old.M4A_INTERNAL_STAGE_PCS[FOURTH_TRACK_FLAGS_POST_LOAD_PC] = "mplay-note-cgb4-fourth-track-flags-post-ldrb"
old.M4A_INTERNAL_STAGE_PCS[FOURTH_TRACK_R2_BEFORE_DECREMENT_PC] = "mplay-note-cgb4-fourth-track-r2-before-decrement"
# Bypass v25's first-track wrapper: this fresh probe owns the fourth-iteration
# selectors and must not leave a predecessor handoff armed.
ORIGINAL_APPEND = v25.ORIGINAL_APPEND


def pointer_bounded_fourth_track(oracle: Any) -> None:
    """Require r5 to be the fourth aligned, in-range track; retain nothing."""
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    track_count = int(oracle.read_u8(player + TRACK_COUNT_OFFSET))
    tracks = int(old.read_u32(oracle, player + TRACKS_OFFSET)) & 0xFFFFFFFF
    current = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = current - tracks
    if (
        track_count <= FOURTH_TRACK_INDEX
        or delta < 0
        or delta % TRACK_SIZE != 0
        or delta // TRACK_SIZE != FOURTH_TRACK_INDEX
    ):
        raise RuntimeError("CGB4 v39 r2 boundary was not the pointer-bounded fourth track")


def append_with_fourth_track_r2(
    epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str
) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        digest = v25.v23.v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V38_SELECTED_DIGESTS:
            return
        entry = v25.v23.v21.v19.current_cgb4_entry(epoch)
        association = epoch.get("cgb4V23Pending")
        if (
            entry is None
            or not isinstance(association, dict)
            or association.get("entry") is not entry
            or association.get("sourceStateDigest") != digest
        ):
            raise RuntimeError("CGB4 v39 lost the established source-state association")
        if epoch.get("cgb4V39Pending") is not None:
            raise RuntimeError("CGB4 v39 fourth-track handoff overlapped a prior row")
        epoch["cgb4V39Pending"] = {"entry": entry, "sourceStateDigest": digest, "loadsSeen": 0, "frame": frame}
        return
    pending = epoch.get("cgb4V39Pending")
    if pending is None:
        return
    digest = v25.v23.v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V38_SELECTED_DIGESTS:
        raise RuntimeError("CGB4 v39 boundary changed its frozen source-state digest")
    if stage == "mplay-note-cgb4-fourth-track-flags-post-ldrb":
        if frame != pending["frame"]:
            raise RuntimeError("CGB4 v39 fourth-track loop escaped its selected frame")
        pending["loadsSeen"] += 1
        iteration = pending["loadsSeen"] - 1
        if iteration < FOURTH_TRACK_INDEX:
            return
        if iteration > FOURTH_TRACK_INDEX:
            raise RuntimeError("CGB4 v39 reached an unexpected extra flags load before capture")
        return
    if stage != "mplay-note-cgb4-fourth-track-r2-before-decrement":
        return
    # The decrement boundary is reached once per loop iteration. Keep the
    # first three entirely live-only and accept only the fourth aligned track.
    if pending["loadsSeen"] < FOURTH_TRACK_INDEX + 1:
        return
    if pending["loadsSeen"] != FOURTH_TRACK_INDEX + 1:
        raise RuntimeError("CGB4 v39 reached the fourth decrement without exactly four flags loads")
    pointer_bounded_fourth_track(oracle)
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V39SeenSourceDigests", set())
    if digest in seen or "cgb4V39R2BeforeDecrement" in entry:
        raise RuntimeError("CGB4 v39 captured a frozen source-state digest more than once")
    # Read only the address-free r2 operand. Do not read CPSR, the subtraction
    # result, r5/r7, any memory beyond the live selector, or either successor.
    entry["cgb4V39R2BeforeDecrement"] = {
        "r2BeforeDecrement": int(oracle.core.cpu.gprs[2]) & 0xFFFFFFFF,
    }
    seen.add(digest)
    epoch.pop("cgb4V39Pending", None)


old.append_m4a_internal_stage = append_with_fourth_track_r2


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v25.v23.v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v39 observed digest")
        if digest not in FROZEN_V38_SELECTED_DIGESTS:
            continue
        callbacks = [
            callback
            for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v39 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V39R2BeforeDecrement")
        if (
            not isinstance(state, dict)
            or set(state) != {"r2BeforeDecrement"}
            or not isinstance(state["r2BeforeDecrement"], int)
            or not 0 <= state["r2BeforeDecrement"] <= 0xFFFFFFFF
        ):
            raise RuntimeError("CGB4 v39 frozen row missed its r2-before-decrement scalar")
        observations.append({"sourceStateDigest": digest, "r2BeforeDecrement": state["r2BeforeDecrement"]})
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if len(observations) != EXPECTED_SELECTED_ROWS[CASE] or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v39 frozen rows are missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v39",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "fourth-track-immediately-before-_081DDA62-subs-r2-0x1",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 fourth-track r2-before-decrement scalars", flush=True)


if __name__ == "__main__":
    main()
