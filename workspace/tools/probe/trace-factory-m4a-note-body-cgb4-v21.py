#!/usr/bin/env python3
"""Capture CGB4's final MPlayMain r4 decision operand at the clock exit.

This Battle Scene OFF receipt accepts only the three frozen v20 EXIST-clear
source-state rows.  At the pipelined ``cmp r4, 0`` instruction it records the
single semantic operand fact needed by the source branch: whether r4 is zero.
Pointers, addresses, frames, durations, the clock scalar, track identity and
count, and both selected successor bodies remain live-only and are never
serialized.
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
V19_PROBE = HERE / "trace-factory-m4a-note-body-cgb4-v19.py"
spec = importlib.util.spec_from_file_location("factory_m4a_note_body_cgb4_v19_for_v21", V19_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V19_PROBE}")
v19 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v19)


# mGBA exposes pipelined Thumb PC (executing instruction + 2).  The source
# instruction at this stage is ``cmp r4, 0``; no successor instruction has
# begun.  This runtime-only selector is deliberately absent from packets.
CLOCK_EXIT_CMP_PC = 0x082DFBE4
EXPECTED_CLEAR_ROWS: dict[str, int] = {"anchor": 0, "liliana": 1, "factory-varied": 2}
ROOT = HERE.parents[1]
V20_EVIDENCE = ROOT / "tests" / "fixtures" / "factory-m4a-note-body-cgb4-evidence-v20.json"
V20_EVIDENCE_SHA256 = "ba5fa1b0e0010ffeb65f77cbd91a6b136992f47d82300bed51dc36a4bd2014cc"


def require_digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
        raise RuntimeError(f"{label} is not a SHA-256 digest")
    return value


def frozen_v20_clear_digests() -> dict[str, tuple[str, ...]]:
    """Load the frozen clear-row membership by digest, or fail closed."""
    raw = V20_EVIDENCE.read_bytes()
    if sha256(raw).hexdigest() != V20_EVIDENCE_SHA256:
        raise RuntimeError("CGB4 v21 frozen v20 evidence changed")
    evidence = json.loads(raw)
    if (
        evidence.get("schema") != "factory-m4a-note-body-cgb4-evidence/v20"
        or evidence.get("oracleProfile") != "battle-scene-off"
        or evidence.get("addressFree") is not True
        or not isinstance(evidence.get("rows"), list)
    ):
        raise RuntimeError("CGB4 v21 frozen v20 identity changed")
    result: dict[str, list[str]] = {name: [] for name in EXPECTED_CLEAR_ROWS}
    seen: set[str] = set()
    for row in evidence["rows"]:
        if not isinstance(row, dict):
            raise RuntimeError("CGB4 v21 frozen v20 row is malformed")
        case = row.get("case")
        digest = require_digest(row.get("sourceStateDigest"), "CGB4 v21 frozen v20 row digest")
        if case not in result or digest in seen:
            raise RuntimeError("CGB4 v21 frozen v20 digest join is missing or ambiguous")
        seen.add(digest)
        if row.get("finalClearTrackExitRoute") == "exist-clear-final-track-ble-taken":
            if (
                row.get("postV19FinalClearTrackExitSourceCycles") != 10
                or row.get("stopsBeforeV20SelectedSuccessor") != "_081DD9A4"
            ):
                raise RuntimeError("CGB4 v21 frozen v20 clear route changed")
            result[case].append(digest)
        elif (
            row.get("finalClearTrackExitRoute") is not None
            or row.get("postV19FinalClearTrackExitSourceCycles") is not None
            or row.get("stopsBeforeV20SelectedSuccessor") != "_081DD886"
        ):
            raise RuntimeError("CGB4 v21 frozen v20 EXIST-set null boundary changed")
    if len(seen) != 7 or any(len(result[name]) != EXPECTED_CLEAR_ROWS[name] for name in result):
        raise RuntimeError("CGB4 v21 frozen v20 clear-row census changed")
    return {name: tuple(digests) for name, digests in result.items()}


FROZEN_V20_CLEAR_DIGESTS = frozen_v20_clear_digests()
old = v19.old
old.M4A_INTERNAL_STAGE_PCS[CLOCK_EXIT_CMP_PC] = "mplay-note-cgb4-clock-exit-cmp-r4"
ORIGINAL_APPEND = old.append_m4a_internal_stage


def append_with_clock_exit_r4(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-note-cgb4-clock-exit-cmp-r4":
        return
    digest = v19.current_source_state_digest(epoch)
    if digest not in FROZEN_V20_CLEAR_DIGESTS[CASE]:
        return
    entry = v19.current_cgb4_entry(epoch)
    if entry is None:
        raise RuntimeError("CGB4 v21 clock-exit cmp lost its frozen CGB4 association")
    seen = epoch.setdefault("cgb4V21SeenSourceDigests", set())
    if digest in seen or "cgb4V21ClockExitDecision" in entry:
        raise RuntimeError("CGB4 v21 captured a frozen source-state digest more than once")
    # r4 is the exact source operand at cmp.  Do not retain its raw value:
    # the source decision needs only its zero/nonzero class.
    entry["cgb4V21ClockExitDecision"] = {"r4Nonzero": bool(int(oracle.core.cpu.gprs[4]) & 0xFFFFFFFF)}
    seen.add(digest)


old.append_m4a_internal_stage = append_with_clock_exit_r4


def compact(result: dict[str, Any]) -> dict[str, Any]:
    # v19's underlying v17 compactor retains the live CGB4 callback metadata;
    # output is rebuilt from scratch so packets expose only the frozen join key
    # and the one newly captured boolean.
    receipt = v19.v17.compact(result)
    observations: list[dict[str, Any]] = []
    for observation in receipt["observations"]:
        digest = require_digest(observation.get("sourceStateDigest"), "CGB4 v21 observed digest")
        if digest not in FROZEN_V20_CLEAR_DIGESTS[CASE]:
            continue
        callbacks = [
            callback
            for callback in (observation.get("noteCallbacks") or [])
            if callback.get("toneType") == 12
        ]
        if len(callbacks) != 1:
            raise RuntimeError("CGB4 v21 frozen source-state row is missing or ambiguous")
        state = callbacks[0].get("cgb4V21ClockExitDecision")
        if not isinstance(state, dict) or set(state) != {"r4Nonzero"} or not isinstance(state["r4Nonzero"], bool):
            raise RuntimeError("CGB4 v21 frozen source-state row missed its r4 decision operand")
        observations.append({"sourceStateDigest": digest, "r4Nonzero": state["r4Nonzero"]})
    expected = FROZEN_V20_CLEAR_DIGESTS[CASE]
    actual = tuple(row["sourceStateDigest"] for row in observations)
    if actual != expected or len(set(actual)) != len(actual):
        raise RuntimeError("CGB4 v21 frozen source-state rows were reordered, missing, duplicate, ambiguous, or extra")
    return {
        "schema": "factory-m4a-note-body-cgb4-probe/v21",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "clock-exit-cmp-r4-zero-nonzero-before-selected-successor",
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
    print(f"wrote {OUTPUT}: {len(packet['observations'])} CGB4 clock-exit r4 decisions", flush=True)


if __name__ == "__main__":
    main()
