#!/usr/bin/env python3
"""Capture only CGB4's second-loop track flags byte at ``_081DD9C8``.

This Battle Scene OFF receipt freezes v28's three selected
``sourceStateDigest`` rows.  The first post-load visit is used only as a
live iteration discriminator; the emitted packet retains exactly the digest
and r0's zero-extended byte on the second visit.  No iteration count,
pointer/address, track identity/count/index, channel, frame, duration,
condition flags, or wider state is serialized.
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
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v25_for_v29", V25_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V25_PROBE}")
v25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v25)


EXPECTED_SELECTED_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V28_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v28.json"
V28_EVIDENCE_SHA256 = "d09f0d3e33bd562898632d0bb13830c09d0b859610edf158bd5d8bb598ebaf8b"


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v28_selected_digests() -> tuple[str, ...]:
    raw = V28_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V28_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v29 frozen v28 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v28"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v29 frozen v28 identity changed")
    digests: list[str] = []
    expected_keys = {
        "sourceStateDigest", "continuationDecision",
        "postV27FirstTrackContinuationSourceCycles",
        "contiguousPrefixThroughFirstTrackContinuationSourceCycles",
        "bgtTakenControlTransferRefills", "stopsBeforeV28Instruction",
    }
    for index, row in enumerate(evidence["rows"]):
        if not isinstance(row, dict) or set(row) != expected_keys:
            raise RuntimeError("CGB4 v29 frozen v28 row carries an unsupported field")
        digest = require_digest(row.get("sourceStateDigest"), f"CGB4 v29 frozen v28 row {index} digest")
        if (
            row.get("continuationDecision") != "movs-MusicPlayerTrack_size; adds-r5-r0; bgt-taken-_081DD9C8"
            or row.get("postV27FirstTrackContinuationSourceCycles") != 12
            or row.get("contiguousPrefixThroughFirstTrackContinuationSourceCycles") != 844
            or row.get("bgtTakenControlTransferRefills") != 1
            or row.get("stopsBeforeV28Instruction") != "_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]"
        ):
            raise RuntimeError("CGB4 v29 frozen v28 selected boundary changed")
        digests.append(digest)
    if len(digests) != 3 or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v29 frozen v28 selected-row census changed")
    return tuple(digests)


FROZEN_V28_SELECTED_DIGESTS = frozen_v28_selected_digests()
old = v25.old
ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_second_track_flags(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-clock-exit-cmp-r4":
        digest = v25.v23.v21.v19.current_source_state_digest(epoch)
        if digest not in FROZEN_V28_SELECTED_DIGESTS:
            return
        entry = v25.v23.v21.v19.current_cgb4_entry(epoch)
        association = epoch.get("cgb4V23Pending")
        if (
            entry is None
            or not isinstance(association, dict)
            or association.get("entry") is not entry
            or association.get("sourceStateDigest") != digest
        ):
            raise RuntimeError("CGB4 v29 lost the established source-state association")
        if epoch.get("cgb4V29Pending") is not None:
            raise RuntimeError("CGB4 v29 second-track handoff overlapped a prior row")
        epoch["cgb4V29Pending"] = {"entry": entry, "sourceStateDigest": digest, "loadsSeen": 0}
        return
    if stage != "mplay-note-cgb4-first-track-flags-post-ldrb":
        return
    pending = epoch.get("cgb4V29Pending")
    if pending is None:
        return
    digest = v25.v23.v21.v19.current_source_state_digest(epoch)
    if digest != pending["sourceStateDigest"] or digest not in FROZEN_V28_SELECTED_DIGESTS:
        raise RuntimeError("CGB4 v29 flags boundary changed its frozen source-state digest")
    pending["loadsSeen"] += 1
    if pending["loadsSeen"] < 2:
        return
    if pending["loadsSeen"] > 2:
        raise RuntimeError("CGB4 v29 reached an unexpected extra flags load before capture")
    entry = pending["entry"]
    seen = epoch.setdefault("cgb4V29SeenSourceDigests", set())
    if digest in seen or "cgb4V29SecondTrackFlags" in entry:
        raise RuntimeError("CGB4 v29 captured a frozen source-state digest more than once")
    r0 = int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF
    if r0 > 0xFF:
        raise RuntimeError("CGB4 v29 post-ldrb r0 is not a zero-extended flags byte")
    entry["cgb4V29SecondTrackFlags"] = {"secondTrackFlags": r0}
    seen.add(digest)
    epoch.pop("cgb4V29Pending", None)


old.append_m4a_internal_stage = append_with_second_track_flags


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v25.v23.v21.v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v29 observed digest")
        if digest not in FROZEN_V28_SELECTED_DIGESTS:
            continue
        callbacks = [
            callback for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v29 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V29SecondTrackFlags")
        if (
            not isinstance(state, dict)
            or set(state) != {"secondTrackFlags"}
            or not isinstance(state["secondTrackFlags"], int)
            or not 0 <= state["secondTrackFlags"] <= 0xFF
        ):
            raise RuntimeError("CGB4 v29 frozen row missed its second-track flags byte")
        observations.append({"sourceStateDigest": digest, "secondTrackFlags": state["secondTrackFlags"]})
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if len(observations) != EXPECTED_SELECTED_ROWS[CASE] or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v29 frozen rows are missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v29",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "second-track-loop-post-_081DD9C8-ldrb-r0-before-movs-MPT_FLG_EXIST-decision",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 second-track flags bytes", flush=True)


if __name__ == "__main__":
    main()
