#!/usr/bin/env python3
"""Capture the sixth-player channel-gate ClearChain link inputs.

This additive sibling preserves the channel-gate v1 packet and hooks the
compiled ``ClearChain`` wrapper entry.  It accepts only the wrapper calls
whose Thumb return address is MPlayMain's ``_081DD8AE`` callsite, then records
the current channel plus the track/previous/next links as source roles.  No
pointer, duration, frame, case identity, or observed timing is retained in an
entry.
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
CHANNEL_PROBE = HERE / "trace-factory-m4a-channel-gate-v1.py"
spec = importlib.util.spec_from_file_location("factory_m4a_channel_gate_v1", CHANNEL_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {CHANNEL_PROBE}")
channel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(channel)


# mGBA reports pipelined Thumb PC (instruction + 2).  The wrapper's caller LR
# is the Thumb return after MPlayMain's sole channel-gate ``bl ClearChain``.
CLEAR_CHAIN_WRAPPER_ENTRY_PC = 0x082E04B6
MPLAY_CHANNEL_GATE_RETURN = 0x082DFAED
channel.v3.old.M4A_INTERNAL_STAGE_PCS[CLEAR_CHAIN_WRAPPER_ENTRY_PC] = "clear-chain-wrapper-entry"

ORIGINAL_APPEND = channel.v3.old.append_m4a_internal_stage


def track_role(track: int, tracks: int, track_count: int) -> str | None:
    if track == 0:
        return None
    delta = track - tracks
    if delta < 0 or delta % channel.v3.MUSIC_PLAYER_TRACK_SIZE != 0:
        return "unmapped-track"
    index = delta // channel.v3.MUSIC_PLAYER_TRACK_SIZE
    return f"music-player-5-track-{index}" if index < track_count else "unmapped-track"


def append_with_clear_chain(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    workload = channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]

    if stage == "mplay-track-command-pass":
        entries = sum(item["kind"] == "mplay-main-entry" for item in audio["stages"])
        if entries == 6:
            if "sixthMPlayClearChain" in audio["state"]:
                raise RuntimeError("sixth-player ClearChain capture was initialized more than once")
            audio["state"]["sixthMPlayClearChain"] = {
                "revision": "factory-m4a-clearchain/v1",
                "playerRole": "music-player-5",
                "boundary": "ClearChain.wrapper-entry-from-MPlayMain._081DD8AE",
                "entries": [],
            }
        return

    if stage != "clear-chain-wrapper-entry":
        return
    capture = audio["state"].get("sixthMPlayClearChain")
    if capture is None:
        return
    lr = int(oracle.core.cpu.gprs[14]) & 0xFFFFFFFF
    if lr != MPLAY_CHANNEL_GATE_RETURN:
        return

    player = channel.sixth_player(oracle)
    track_count = oracle.read_u8(player + 0x08)
    tracks = channel.v3.old.read_u32(oracle, player + 0x2C)
    direct_start = channel.v3.SOUND_INFO_ADDR + channel.v3.old.SOUND_INFO_CHANNELS
    cgb_start = channel.v3.old.read_u32(oracle, channel.v3.SOUND_INFO_ADDR + 0x1C)
    current = int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF

    def channel_link_role(value: int) -> str | None:
        role = channel.v3.channel_role(value, direct_start, cgb_start)
        if role == "unmapped-channel":
            raise RuntimeError("ClearChain link is outside the source channel pools")
        return role

    current_role = channel_link_role(current)
    if current_role is None:
        raise RuntimeError("ClearChain current channel is null")
    source_track = channel.v3.old.read_u32(oracle, current + 0x2C)
    normalized_track = track_role(source_track, tracks, track_count)
    if normalized_track == "unmapped-track":
        raise RuntimeError("ClearChain track is outside the sixth player's track array")
    capture["entries"].append({
        "currentRole": current_role,
        "trackRole": normalized_track,
        "previousRole": channel_link_role(channel.v3.old.read_u32(oracle, current + 0x30)),
        "nextRole": channel_link_role(channel.v3.old.read_u32(oracle, current + 0x34)),
    })


channel.v3.old.append_m4a_internal_stage = append_with_clear_chain


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = channel.v3.compact_source_state_receipt(result)
    observations = []
    for observation in receipt["interrupts"]:
        state = observation["m4a"]["state"]
        capture = state.get("sixthMPlayClearChain")
        observations.append({
            "sourceStateDigest": state["sourceSemanticState"]["stateDigest"],
            "clearChainEntries": None if capture is None else capture["entries"],
        })
    return {
        "schema": "factory-m4a-clearchain-probe/v1",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "ClearChain-wrapper-entry-from-MPlayMain-channel-gate",
        "observations": observations,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = channel.v3.old.run_liliana()
    else:
        result = channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    calls = sum(len(row["clearChainEntries"] or []) for row in packet["observations"])
    initialized = sum(row["clearChainEntries"] is not None for row in packet["observations"])
    print(f"wrote {OUTPUT}: {calls} ClearChain calls across {initialized} one-pass observations")


if __name__ == "__main__":
    main()
