#!/usr/bin/env python3
"""Capture sixth-player state at MPlayMain's pre-command channel gate.

This additive sibling imports the frozen v3 driver unchanged. At the sixth
compiled MPlayMain ``_081DD874`` boundary it records only the mutable state
consumed by the per-track channel gate/clear loop before command execution.
The packet joins each row to the existing v3 receipt by
``sourceStateDigest`` and retains no address, duration, frame, or case lookup.
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


def sixth_player(oracle: Any) -> int:
    current = v3.old.read_u32(oracle, v3.SOUND_INFO_ADDR + 0x24)
    seen: set[int] = set()
    for index in range(16):
        if not current or current in seen:
            break
        if index == 5:
            return current
        seen.add(current)
        current = v3.old.read_u32(oracle, current + 0x3C)
    raise RuntimeError("sixth MPlayMain player is not in the source player chain")


def channel_state(oracle: Any, first: int, direct_start: int, cgb_start: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[int] = set()
    current = first
    while current and current not in seen and len(rows) < 16:
        seen.add(current)
        role = v3.channel_role(current, direct_start, cgb_start)
        if role == "unmapped-channel":
            raise RuntimeError("channel-gate member is outside the source channel pools")
        rows.append({
            "role": role,
            "statusFlags": oracle.read_u8(current + 0x00),
            "gateTime": oracle.read_u8(current + 0x10),
        })
        current = v3.old.read_u32(oracle, current + 0x34)
    if current:
        raise RuntimeError("channel-gate chain is cyclic or exceeds 16 elements")
    return rows


def append_with_channel_gate(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    if stage != "mplay-track-command-pass":
        return
    workload = v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]
    entries = sum(item["kind"] == "mplay-main-entry" for item in audio["stages"])
    if entries != 6:
        return
    if "sixthMPlayChannelGate" in audio["state"]:
        raise RuntimeError("sixth-player channel gate was captured more than once")
    player = sixth_player(oracle)
    track_count = oracle.read_u8(player + 0x08)
    tracks = v3.old.read_u32(oracle, player + 0x2C)
    direct_start = v3.SOUND_INFO_ADDR + v3.old.SOUND_INFO_CHANNELS
    cgb_start = v3.old.read_u32(oracle, v3.SOUND_INFO_ADDR + 0x1C)
    audio["state"]["sixthMPlayChannelGate"] = {
        "revision": "factory-m4a-channel-gate/v1",
        "playerRole": "music-player-5",
        "boundary": "MPlayMain._081DD874",
        "tracks": [
            {
                "trackIndex": index,
                "flags": oracle.read_u8(tracks + index * 0x50),
                "channels": channel_state(
                    oracle,
                    v3.old.read_u32(oracle, tracks + index * 0x50 + 0x20),
                    direct_start,
                    cgb_start,
                ),
            }
            for index in range(track_count)
        ],
    }


v3.old.append_m4a_internal_stage = append_with_channel_gate


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = v3.compact_source_state_receipt(result)
    observations = []
    for observation in receipt["interrupts"]:
        state = observation["m4a"]["state"]
        gate = state.get("sixthMPlayChannelGate")
        # The exact tempo selector proves five calls take no pass and therefore
        # never reach this compiled boundary. Keep those rows joinable without
        # fabricating pre-command state.
        observations.append({
            "sourceStateDigest": state["sourceSemanticState"]["stateDigest"],
            "channelGate": gate,
        })
    return {
        "schema": "factory-m4a-channel-gate-probe/v1",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-one-pass-channel-gate",
        "observations": observations,
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
    captured = sum(row["channelGate"] is not None for row in packet["observations"])
    print(f"wrote {OUTPUT}: {captured}/{len(packet['observations'])} channel-gate observations")


if __name__ == "__main__":
    main()
