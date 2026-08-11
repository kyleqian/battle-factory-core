#!/usr/bin/env python3
"""Capture the sixth-MPlayMain tempo selector omitted by frozen v3 evidence.

This additive sibling imports the v3 probe unchanged.  At the sixth compiled
MPlayMain entry it captures only MusicPlayerInfo bytes 0x18..0x23, zeroing the
memAccArea pointer at 0x18..0x1b while preserving tempoD/U/I/C.  The compact
packet joins each observation to v3 by its already-frozen source-state digest.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

HERE = Path(__file__).resolve().parent
V3_PROBE = HERE / "trace-factory-m4a-source-state-v3.py"
spec = importlib.util.spec_from_file_location("factory_m4a_source_state_v3", V3_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V3_PROBE}")
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)


ORIGINAL_APPEND = v3.old.append_m4a_internal_stage


def player_role(oracle: Any, target: int) -> str:
    current = v3.old.read_u32(oracle, v3.SOUND_INFO_ADDR + 0x24)
    seen: set[int] = set()
    index = 0
    while current and current not in seen and index < 16:
        if current == target:
            return f"music-player-{index}"
        seen.add(current)
        current = v3.old.read_u32(oracle, current + 0x3C)
        index += 1
    raise RuntimeError("sixth MPlayMain target is not in the source player chain")


def append_with_selector(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-main-entry":
        return
    workload = v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]
    entries = sum(item["kind"] == "mplay-main-entry" for item in audio["stages"])
    if entries != 6:
        return
    player = int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF
    scalar = [oracle.read_u8(player + 0x18 + index) for index in range(12)]
    scalar[0:4] = [0, 0, 0, 0]
    audio["state"]["sixthMPlaySelector"] = {
        "revision": "factory-m4a-player-selector/v1",
        "playerRole": player_role(oracle, player),
        "scalarRange": "MusicPlayerInfo+0x18..0x23",
        "scalarBytes": scalar,
        "normalizedFields": ["memAccArea"],
    }


v3.old.append_m4a_internal_stage = append_with_selector


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v3.compact_source_state_receipt(result)
    rows = []
    for observation in receipt["interrupts"]:
        state = observation["m4a"]["state"]
        rows.append({
            "sourceStateDigest": state["sourceSemanticState"]["stateDigest"],
            "playerScalar": state["sixthMPlaySelector"],
        })
    return {
        "schema": "factory-m4a-player-selector-probe/v1",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-entry",
        "observations": rows,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = v3.old.run_anchor()
    elif CASE == "liliana":
        result = v3.old.run_liliana()
    else:
        result = v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    print(f"wrote {OUTPUT}: {len(packet['observations'])} selector observations")


if __name__ == "__main__":
    main()
