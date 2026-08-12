#!/usr/bin/env python3
"""Capture sixth-player mutable inputs at MPlayMain's wait/LFO boundary.

This additive sibling preserves the frozen source-state and channel-gate
packets.  It hooks the compiled ``_081DD938`` boundary and retains one
address-free row per active sixth-player track, after command execution has
produced a nonzero wait and immediately before the wait/LFO source branch.
No pointer, duration, frame, case identity, or observed timing is retained in
an entry.
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
CLEAR_PROBE = HERE / "trace-factory-m4a-clearchain-v1.py"
spec = importlib.util.spec_from_file_location("factory_m4a_clearchain_v1", CLEAR_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {CLEAR_PROBE}")
clear = importlib.util.module_from_spec(spec)
spec.loader.exec_module(clear)


# mGBA reports pipelined Thumb PC (instruction + 2).
WAIT_LFO_BOUNDARY_PC = 0x082DFB72
clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[WAIT_LFO_BOUNDARY_PC] = "mplay-track-wait-lfo"

ORIGINAL_APPEND = clear.channel.v3.old.append_m4a_internal_stage


def append_with_wait_lfo(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    workload = clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]

    if stage == "mplay-track-command-pass":
        entries = sum(item["kind"] == "mplay-main-entry" for item in audio["stages"])
        if entries == 6:
            if "sixthMPlayWaitLfo" in audio["state"]:
                raise RuntimeError("sixth-player wait/LFO capture was initialized more than once")
            audio["state"]["sixthMPlayWaitLfo"] = {
                "revision": "factory-m4a-wait-lfo/v1",
                "playerRole": "music-player-5",
                "boundary": "MPlayMain._081DD938",
                "tracks": [],
            }
        return

    if stage != "mplay-track-wait-lfo":
        return
    capture = audio["state"].get("sixthMPlayWaitLfo")
    if capture is None:
        return

    player = clear.channel.sixth_player(oracle)
    track_count = oracle.read_u8(player + 0x08)
    tracks = clear.channel.v3.old.read_u32(oracle, player + 0x2C)
    current = int(oracle.core.cpu.gprs[5]) & 0xFFFFFFFF
    delta = current - tracks
    if delta < 0 or delta % clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE != 0:
        return
    track_index = delta // clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
    if track_index >= track_count:
        return

    # A zero wait immediately loops back into command dispatch.  Capture the
    # unique nonzero visit that actually enters this track's wait/LFO branch.
    wait = oracle.read_u8(current + 0x01)
    if wait == 0:
        return
    if any(row["trackIndex"] == track_index for row in capture["tracks"]):
        raise RuntimeError("sixth-player track reached nonzero wait/LFO boundary twice")
    capture["tracks"].append({
        "trackIndex": track_index,
        "wait": wait,
        "mod": oracle.read_u8(current + 0x17),
        "lfoSpeed": oracle.read_u8(current + 0x19),
    })


clear.channel.v3.old.append_m4a_internal_stage = append_with_wait_lfo


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = clear.channel.v3.compact_source_state_receipt(result)
    observations = []
    for observation in receipt["interrupts"]:
        state = observation["m4a"]["state"]
        capture = state.get("sixthMPlayWaitLfo")
        observations.append({
            "sourceStateDigest": state["sourceSemanticState"]["stateDigest"],
            "waitLfoTracks": None if capture is None else capture["tracks"],
        })
    return {
        "schema": "factory-m4a-wait-lfo-probe/v1",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-per-track-wait-lfo",
        "observations": observations,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = clear.channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = clear.channel.v3.old.run_liliana()
    else:
        result = clear.channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    tracks = sum(len(row["waitLfoTracks"] or []) for row in packet["observations"])
    initialized = sum(row["waitLfoTracks"] is not None for row in packet["observations"])
    print(f"wrote {OUTPUT}: {tracks} final track waits across {initialized} one-pass observations")


if __name__ == "__main__":
    main()
