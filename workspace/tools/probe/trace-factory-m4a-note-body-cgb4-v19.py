#!/usr/bin/env python3
"""Capture CGB4's next-track ``MPT_FLG_EXIST`` decision at the loop head.

This Battle Scene OFF receipt adapts the finite v17 driver.  It follows only
the seven frozen continuation rows from v18: after v17's exact decrement
boundary, it reads the *successor* track's flags byte at ``_081DD87C`` and
captures the direct Thumb register/condition evidence at the following
``bne _081DD886``.  Runtime pointers, track identities/counts, frames, and
all later loop state remain live-only and are never serialized.
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
V17_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v17.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v17_for_v19", V17_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V17_PROBE}")
v17 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v17)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  The first
# stage is exactly ``ldrb r0, [r5, o_MusicPlayerTrack_flags]``; the second is
# exactly the later ``bne _081DD886`` after ``movs r1, MPT_FLG_EXIST`` and
# ``tst r1, r0``.  The probe does not observe either selected successor.
NEXT_TRACK_FLAGS_LOAD_PC = 0x082DFAB6
NEXT_TRACK_EXIST_BRANCH_PC = 0x082DFABC
MPT_FLG_EXIST = 0x80
MAX_CGB4_SUCCESSOR_ROWS: dict[str, int] = {"anchor": 0, "liliana": 3, "factory-varied": 4}
# The source route from v17's decrement boundary to this branch is 20
# ARM7TDMI source cycles at most.  This finite live-only cap leaves room for
# instrumentation accounting while rejecting a stale arm on a later pass.
MAX_PENDING_MASTER_CYCLES = 64
ROOT = HERE.parents[1]
V18_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v18.json"
V18_EVIDENCE_SHA256 = "812f3f497a7842f9d57e4c8bb54f89c0fcae5fae943faa1e0c59c9a39fe960b3"


def frozen_v18_digests() -> dict[str, tuple[str, ...]]:
    """Load the frozen v18 continuation membership by digest, or fail closed."""
    raw = V18_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V18_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v19 frozen v18 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v18"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v19 frozen v18 identity changed")
    result: dict[str, list[str]] = {name: [] for name in MAX_CGB4_SUCCESSOR_ROWS}
    seen: set[str] = set()
    for row in evidence["rows"]:
        if not isinstance(row, dict):
            raise RuntimeError("CGB4 v19 frozen v18 row is malformed")
        case = row.get("case")
        digest = row.get("sourceStateDigest")
        if case not in result or not isinstance(digest, str) or len(digest) != 64 or digest in seen:
            raise RuntimeError("CGB4 v19 frozen v18 digest join is missing or ambiguous")
        if row.get("trackLoopRoute") != "continue-to-next-track":
            raise RuntimeError("CGB4 v19 frozen v18 row is not a continuation")
        seen.add(digest)
        result[case].append(digest)
    if len(seen) != 7 or any(len(result[name]) != MAX_CGB4_SUCCESSOR_ROWS[name] for name in result):
        raise RuntimeError("CGB4 v19 frozen v18 continuation census changed")
    return {name: tuple(digests) for name, digests in result.items()}


FROZEN_V18_DIGESTS = frozen_v18_digests()

old = v17.old
old.M4A_INTERNAL_STAGE_PCS[NEXT_TRACK_FLAGS_LOAD_PC] = "mplay-note-cgb4-next-track-flags"
old.M4A_INTERNAL_STAGE_PCS[NEXT_TRACK_EXIST_BRANCH_PC] = "mplay-note-cgb4-next-track-exist-branch"

ORIGINAL_APPEND = old.append_m4a_internal_stage


def master_cycles(oracle: Any) -> int:
    return int(oracle.core._native.timing.globalCycles) + int(oracle.core.cpu._native.cycles)


def current_cgb4_entry(epoch: dict[str, Any]) -> dict[str, Any] | None:
    workload = old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return None
    capture = workload["audioInternal"]["state"].get("sixthMPlayNoteCensus")
    if capture is None or not capture["entries"]:
        return None
    entry = capture["entries"][-1]
    if entry.get("toneType") != 12:
        return None
    return entry


def current_source_state_digest(epoch: dict[str, Any]) -> str | None:
    workload = old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return None
    digest = workload["audioInternal"]["state"].get("sourceSemanticState", {}).get("stateDigest")
    if not isinstance(digest, str) or len(digest) != 64:
        raise RuntimeError("CGB4 v19 active source-state digest is missing or malformed")
    return digest


def current_track_is_entry(epoch: dict[str, Any], oracle: Any, entry: dict[str, Any]) -> bool:
    """Use v17's live-only current-track gate before arming a successor.

    A later MPlay pass can retain a previously captured CGB4 callback as the
    census tail while it decrements a different track.  This is the same
    association v17 proved at its decrement boundary.  It intentionally
    validates only the already-frozen *current* row and never derives or
    stores successor identity, count, index, or r5.
    """
    player = int(oracle.core.cpu.gprs[7]) & 0xFFFFFFFF
    tracks = old.read_u32(oracle, player + 0x2C)
    current = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = current - tracks
    track_size = old.MUSIC_PLAYER_TRACK_SIZE
    return (
        delta >= 0
        and delta % track_size == 0
        and delta // track_size == entry.get("trackIndex")
    )


def arm_successor(epoch: dict[str, Any], oracle: Any, frame: int) -> None:
    entry = current_cgb4_entry(epoch)
    if entry is None or "cgb4TrackLoopState" not in entry:
        return
    digest = current_source_state_digest(epoch)
    if digest not in FROZEN_V18_DIGESTS[CASE]:
        return
    if not current_track_is_entry(epoch, oracle, entry):
        return
    seen = epoch.setdefault("cgb4V19SeenSourceDigests", set())
    if digest in seen:
        raise RuntimeError("CGB4 v19 captured a frozen source-state digest twice")
    loop_state = entry["cgb4TrackLoopState"]
    if not isinstance(loop_state, dict) or loop_state.get("r6BeforeDecrement") not in {2, 3}:
        raise RuntimeError("CGB4 v19 observed a frozen continuation row without v17's positive loop counter")
    if epoch.get("cgb4V19Pending") is not None:
        raise RuntimeError("CGB4 v19 successor arm overlapped a prior row")
    if len(seen) >= MAX_CGB4_SUCCESSOR_ROWS[CASE]:
        raise RuntimeError("CGB4 v19 exceeded its finite per-case successor-row cap")
    seen.add(digest)
    epoch["cgb4V19Pending"] = {
        "entry": entry,
        "sourceStateDigest": digest,
        "frame": frame,
        "masterCycles": master_cycles(oracle),
    }


def pending_entry(epoch: dict[str, Any], oracle: Any, frame: int) -> dict[str, Any] | None:
    pending = epoch.get("cgb4V19Pending")
    if pending is None:
        return None
    if pending["frame"] != frame:
        raise RuntimeError("CGB4 v19 successor loop-head escaped its finite stepped frame")
    elapsed = master_cycles(oracle) - int(pending["masterCycles"])
    if elapsed < 0 or elapsed > MAX_PENDING_MASTER_CYCLES:
        raise RuntimeError("CGB4 v19 successor loop-head exceeded its finite master-cycle cap")
    return pending["entry"]


def append_with_next_track_exist(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage == "mplay-note-cgb4-track-loop-decrement":
        # v17 has just captured its live pre-decrement register.  Arm only
        # that frozen positive route; no track index/count or successor
        # identity participates in this association.
        arm_successor(epoch, oracle, frame)
        return
    if stage == "mplay-note-cgb4-next-track-flags":
        entry = pending_entry(epoch, oracle, frame)
        if entry is None:
            return
        if current_source_state_digest(epoch) != epoch["cgb4V19Pending"]["sourceStateDigest"]:
            raise RuntimeError("CGB4 v19 successor loop-head changed its source-state digest")
        if "cgb4NextTrackExistState" in entry or "cgb4V19Flags" in epoch:
            raise RuntimeError("CGB4 v19 next-track flags were captured more than once")
        # r5 is the source operand base at this instruction.  It is used only
        # for the one flags-byte read and is deliberately never serialized.
        track = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
        epoch["cgb4V19Flags"] = oracle.read_u8(track)
        return
    if stage != "mplay-note-cgb4-next-track-exist-branch":
        return
    entry = pending_entry(epoch, oracle, frame)
    if entry is None:
        return
    if current_source_state_digest(epoch) != epoch["cgb4V19Pending"]["sourceStateDigest"]:
        raise RuntimeError("CGB4 v19 MPT_FLG_EXIST branch changed its source-state digest")
    if "cgb4V19Flags" not in epoch or "cgb4NextTrackExistState" in entry:
        raise RuntimeError("CGB4 v19 branch reached without exactly one flags capture")
    flags = int(epoch.pop("cgb4V19Flags"))
    r0 = int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF
    r1 = int(oracle.core.cpu.gprs[1]) & 0xFFFFFFFF
    cpsr = int(oracle.core.cpu._native.cpsr.packed)
    tst_zero = bool(cpsr & (1 << 30))
    if r0 != flags or r1 != MPT_FLG_EXIST:
        raise RuntimeError("CGB4 v19 direct register evidence disagrees with the flags load")
    if tst_zero != ((r0 & r1) == 0):
        raise RuntimeError("CGB4 v19 direct TST condition evidence disagrees with MPT_FLG_EXIST")
    if tst_zero:
        branch_route = "bne-not-taken-then-b-_081DD998"
        selected_successor = "_081DD998"
    else:
        branch_route = "bne-taken-to-_081DD886"
        selected_successor = "_081DD886"
    entry["cgb4NextTrackExistState"] = {
        "flags": flags,
        "directBranchEvidence": {
            "branchInstruction": "MPlayMain._081DD884:bne _081DD886",
            "r0AfterFlagsLoad": r0,
            "r1ExistMask": r1,
            "tstZero": tst_zero,
            "branchRoute": branch_route,
            "selectedSuccessor": selected_successor,
        },
    }
    epoch.pop("cgb4V19Pending", None)


old.append_m4a_internal_stage = append_with_next_track_exist


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = observation["sourceStateDigest"]
        callbacks = [
            callback
            for callback in (observation["noteCallbacks"] or [])
            if callback.get("toneType") == 12
        ]
        if digest not in FROZEN_V18_DIGESTS[CASE]:
            continue
        if len(callbacks) > 1:
            raise RuntimeError("CGB4 v19 source-state row became ambiguous")
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v19 frozen source-state row missed its CGB4 callback")
        callback = callbacks[0]
        state = callback.get("cgb4NextTrackExistState")
        if not isinstance(state, dict):
            raise RuntimeError("a frozen CGB4 continuation row missed its successor loop-head capture")
        observations.append({
            "sourceStateDigest": digest,
            "cgb4NextTrackExistState": state,
        })
    if len(observations) != MAX_CGB4_SUCCESSOR_ROWS[CASE]:
        raise RuntimeError("CGB4 v19 successor-row count did not match the finite frozen census")
    digests = [row["sourceStateDigest"] for row in observations]
    if any(not isinstance(digest, str) for digest in digests) or len(set(digests)) != len(digests):
        raise RuntimeError("CGB4 v19 source-state digest join is missing or ambiguous")
    if tuple(digests) != FROZEN_V18_DIGESTS[CASE]:
        raise RuntimeError("CGB4 v19 frozen source-state rows were reordered, missing, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v19",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "first-successor-loop-head-MPT_FLG_EXIST-bne-before-selected-successor",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 next-track MPT_FLG_EXIST states", flush=True)


if __name__ == "__main__":
    main()
