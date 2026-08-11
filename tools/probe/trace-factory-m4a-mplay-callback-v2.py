#!/usr/bin/env python3
"""Fresh compact Scene-OFF receipt for the sixth-MPlayMain callback class.

The committed v3 packet owns the normalized source-state graph.  This probe
replays the same three staging paths through the validated mGBA wrapper,
constructs the v3 state digest in memory at each m4a boundary, and emits only
the callback component plus digest/cost joins.  It also checks the live table
targets against the source/ELF-generated TypeScript manifest at every
boundary, without serializing those state graphs again.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
os.environ["FACTORY_CONSTRUCTION_CYCLE_EVIDENCE"] = "1"
os.environ["FACTORY_VBLANK_WORKLOAD_EVIDENCE"] = "1"
os.environ["FACTORY_VBLANK_WORKLOAD_INTERNAL_EVIDENCE"] = "1"

HERE = Path(__file__).resolve().parent
V3_PROBE = HERE / "trace-factory-m4a-source-state-v3.py"
spec = importlib.util.spec_from_file_location("factory_m4a_source_state_v3_for_mplay", V3_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V3_PROBE}")
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def node_component() -> tuple[dict[str, Any], list[dict[str, str]]]:
    script = """
import { createHash } from 'node:crypto';
import { expectedComponent, MPLAY_REMAINING_RESIDUALS } from './tools/report/factory-m4a-mplay-callback-v2.ts';
const canonical = (value) => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : (value !== null && typeof value === 'object') ? '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}' : JSON.stringify(value);
const component = expectedComponent();
const componentDigest = createHash('sha256').update(canonical(component)).digest('hex');
process.stdout.write(JSON.stringify({ component, componentDigest, residuals: MPLAY_REMAINING_RESIDUALS }));
"""
    output = subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", script],
        cwd=WORKTREE_ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    parsed = json.loads(output)
    return parsed["component"], parsed["residuals"]


COMPONENT, RESIDUALS = node_component()
COMPONENT_DIGEST = hashlib.sha256(canonical_json(COMPONENT)).hexdigest()


def snapshot_m4a_internal_state(oracle: Any) -> dict[str, str]:
    # v3 is built only long enough to calculate its address-free digest.  The
    # full graph never enters this probe's JSON output.
    source_state = v3.source_semantic_state(oracle)
    dispatch = source_state["dispatchTables"]
    expected_dispatch = COMPONENT["dispatchTables"]
    if dispatch["mplayJumpTargets"] != expected_dispatch["gMPlayJumpTable"]["targets"]:
        raise RuntimeError("live gMPlayJumpTable targets differ from source manifest")
    if dispatch["xcmdTargets"] != expected_dispatch["gXcmdTable"]["targets"]:
        raise RuntimeError("live gXcmdTable targets differ from source manifest")
    return {
        "sourceStateDigest": hashlib.sha256(canonical_json(source_state)).hexdigest(),
        "mplayCallbackComponentDigest": COMPONENT_DIGEST,
    }


v3.old.snapshot_m4a_internal_state = snapshot_m4a_internal_state


def compact_receipt(raw: dict[str, Any]) -> dict[str, Any]:
    source_entry = raw["entry"]["masterCycles"]
    source_return = raw["return"]["masterCycles"]
    observations: list[dict[str, Any]] = []
    for workload in raw["vblankWorkloadEvidence"]["interrupts"]:
        returned = workload.get("return")
        resumed = workload.get("resume")
        audio = workload.get("audioInternal")
        if returned is None or resumed is None or audio is None:
            continue
        entry_cycles = workload["entry"]["masterCycles"]
        if entry_cycles < source_entry or entry_cycles > source_return:
            continue
        state = audio["state"]
        state_digest = state.get("sourceStateDigest")
        component_digest = state.get("mplayCallbackComponentDigest")
        if not isinstance(state_digest, str) or component_digest != COMPONENT_DIGEST:
            raise RuntimeError("compact callback state is incomplete or non-general")
        call = next(stage["masterCycles"] for stage in audio["stages"] if stage["kind"] == "m4a-sound-main-call")
        returned_m4a = next(stage["masterCycles"] for stage in audio["stages"] if stage["kind"] == "m4a-sound-main-return")
        if returned_m4a <= call:
            raise RuntimeError("non-positive m4a call cost")
        observations.append({"sourceStateDigest": state_digest, "m4aCost": returned_m4a - call})
    if len(observations) != {"anchor": 52, "liliana": 31, "factory-varied": 30}[CASE]:
        raise RuntimeError(f"{CASE}: expected 52/31/30 m4a joins, got {len(observations)}")
    if len({row["sourceStateDigest"] for row in observations}) != len(observations):
        raise RuntimeError(f"{CASE}: duplicate source state digest")
    return {
        "schema": "factory-m4a-mplay-callback-probe/v2",
        "case": raw["case"],
        "oracleProfile": raw["oracleProfile"],
        "sourceStateReference": {"packetSchema": "factory-m4a-source-state-probe/v3", "digestKey": "sourceSemanticState.stateDigest"},
        "mplayCallback": {"component": COMPONENT, "componentDigest": COMPONENT_DIGEST},
        "residualDereferences": RESIDUALS,
        "observations": observations,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        raw = v3.old.run_anchor()
    elif CASE == "liliana":
        raw = v3.old.run_liliana()
    else:
        raw = v3.old.run_factory_varied()
    result = compact_receipt(raw)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}: {result['case']} {len(result['observations'])} callback observations", flush=True)


if __name__ == "__main__":
    main()
