#!/usr/bin/env python3
"""Capture CGB4's fifth-track flags byte before the EXIST decision.

This Battle Scene OFF receipt freezes v40's three selected
``sourceStateDigest`` rows. The live-only selector requires the fifth aligned
track in the current ``MusicPlayerInfo.tracks`` array and exactly five loop
loads. The emitted packet retains only that digest plus the post-``ldrb``
flags scalar. It serializes no pointer, address, count, index, identity,
channel, frame, duration, condition flags, mask/body state, decrement, or
successor body.
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
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v25_for_v41", V25_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V25_PROBE}")
v25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v25)


# mGBA exposes pipelined Thumb PC (executing instruction + 2). At this
# boundary the fifth iteration's `ldrb r0, [r5, flags]` at 0x082DFC00 has
# completed and the EXIST-mask `movs` has not executed. This PC is a
# live-only selector and is never serialized.
FIFTH_TRACK_FLAGS_POST_LOAD_PC = 0x082DFC04
EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V40_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v40.json"
V40_EVIDENCE_SHA256 = "2bd6f1b5d6e94d09d333c4937c2588b6f6aa4f4191c3654d27f8567d71ecfb2a"
TRACK_COUNT_OFFSET = 0x08
TRACKS_OFFSET = 0x2C
TRACK_SIZE = 0x50
FIFTH_TRACK_INDEX = 4


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v40_selected_digests() -> tuple[str, ...]:
    """Load only v40's three selected rows, or fail closed."""
    raw = V40_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V40_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v41 frozen v40 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v40"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v41 frozen v40 identity changed")
    expected_keys = {
        "sourceStateDigest",
        "continuationDecision",
        "postV39FourthTrackContinuationSourceCycles",
        "contiguousPrefixThroughFourthTrackContinuationSourceCycles",
        "bgtTakenControlTransferRefills",
        "stopsBeforeV40Instruction",
    }
    digests: list[str] = []
    for index, row in enumerate(evidence["rows"]):
        if not isinstance(row, dict) or set(row) != expected_keys:
            raise RuntimeError("CGB4 v41 frozen v40 row carries an unsupported field")
        digest = require_digest(row.get("sourceStateDigest"), f"CGB4 v41 frozen v40 row {index} digest")
        if (
            row.get("continuationDecision") != "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8"
            or row.get("postV39FourthTrackContinuationSourceCycles") != 12
            or row.get("contiguousPrefixThroughFourthTrackContinuationSourceCycles") != 952
            or row.get("bgtTakenControlTransferRefills") != 1
            or row.get("stopsBeforeV40Instruction") != "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]"
        ):
            raise RuntimeError("CGB4 v41 frozen v40 selected boundary changed")
        digests.append(digest)
    if len(digests) != 3 or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v41 frozen v40 selected-row census changed")
    return tuple(digests)


FROZEN_V40_SELECTED_DIGESTS = frozen_v40_selected_digests()
old = v25.old
old.M4A_INTERNAL_STAGE_PCS[FIFTH_TRACK_FLAGS_POST_LOAD_PC] = "mplay-note-cgb4-fifth-track-flags-post-ldrb"
# Bypass v25's same-PC first-track wrapper: this receipt owns its fifth-loop
# selector and must not leave an inherited pending handoff armed.
ORIGINAL_APPEND = v25.ORIGINAL_APPEND


def pointer_bounded_fifth_track(oracle: Any) -> None:
    """Require r5 to be the fifth aligned, in-range track; retain nothing."""
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    track_count = int(oracle.read_u8(player + TRACK_COUNT_OFFSET))
    tracks = int(old.read_u32(oracle, player + TRACKS_OFFSET)) & 0xFFFFFFFF
    current = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = current - tracks
    if (
        track_count <= FIFTH_TRACK_INDEX
        or delta < 0
        or delta % TRACK_SIZE != 0
        or delta // TRACK_SIZE != FIFTH_TRACK_INDEX
    ):
        raise RuntimeError("CGB4 v41 flags load was not the pointer-bounded fifth track")


def append_with_fifth_track_flags(
    epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str
) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        digest = v25.v23.v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V40_SELECTED_DIGESTS:
            return
        entry = v25.v23.v21.v19.current_cgb4_entry(epoch)
        association = epoch.get("cgb4V23Pending")
        if (
            entry is None
            or not isinstance(association, dict)
            or association.get("entry") is not entry
            or association.get("sourceStateDigest") != digest
        ):
            raise RuntimeError("CGB4 v41 lost the established source-state association")
        if epoch.get("cgb4V41Pending") is not None:
            raise RuntimeError("CGB4 v41 fifth-track handoff overlapped a prior row")
        epoch["cgb4V41Pending"] = {"entry": entry, "sourceStateDigest": digest, "loadsSeen": 0, "frame": frame}
        return
    if stage != "mplay-note-cgb4-fifth-track-flags-post-ldrb":
        return
    pending = epoch.get("cgb4V41Pending")
    if pending is None:
        return
    digest = v25.v23.v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V40_SELECTED_DIGESTS:
        raise RuntimeError("CGB4 v41 flags boundary changed its frozen source-state digest")
    if frame != pending["frame"]:
        raise RuntimeError("CGB4 v41 fifth-track loop escaped its selected frame")
    pending["loadsSeen"] += 1
    iteration = pending["loadsSeen"] - 1
    if iteration < FIFTH_TRACK_INDEX:
        return
    if iteration > FIFTH_TRACK_INDEX:
        raise RuntimeError("CGB4 v41 reached an unexpected extra flags load before capture")
    pointer_bounded_fifth_track(oracle)
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V41SeenSourceDigests", set())
    if digest in seen or "cgb4V41FifthTrackFlags" in entry:
        raise RuntimeError("CGB4 v41 captured a frozen source-state digest more than once")
    # r0 is the completed u8 load. Do not retain r5/r7, CPSR, or memory; the
    # selector's pointer/count/index checks remain live-only.
    r0 = int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF
    if r0 > 0xFF:
        raise RuntimeError("CGB4 v41 post-ldrb r0 is not a zero-extended flags byte")
    entry["cgb4V41FifthTrackFlags"] = {"fifthTrackFlags": r0}
    seen.add(digest)
    epoch.pop("cgb4V41Pending", None)


old.append_m4a_internal_stage = append_with_fifth_track_flags


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v25.v23.v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v41 observed digest")
        if digest not in FROZEN_V40_SELECTED_DIGESTS:
            continue
        callbacks = [
            callback
            for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v41 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V41FifthTrackFlags")
        if (
            not isinstance(state, dict)
            or set(state) != {"fifthTrackFlags"}
            or not isinstance(state["fifthTrackFlags"], int)
            or not 0 <= state["fifthTrackFlags"] <= 0xFF
        ):
            raise RuntimeError("CGB4 v41 frozen source-state row missed its fifth-track flags scalar")
        observations.append({"sourceStateDigest": digest, "fifthTrackFlags": state["fifthTrackFlags"]})
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if len(observations) != EXPECTED_SELECTED_ROWS[CASE] or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v41 frozen source-state rows are missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v41",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "fifth-track-loop-post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 fifth-track flags bytes", flush=True)


if __name__ == "__main__":
    main()
