#!/usr/bin/env python3
"""Capture sixth-player MPlayMain ``ply_pend`` callback inputs.

This additive sibling hooks the compiled ``ply_pend`` entry reached from
MPlayMain's jump-table command site. Rows retain only track index,
``patternLevel``, and the source-role/offset pattern return target. Callback,
track, and song pointers are used only to validate/normalize the live source
route and discarded.
"""

from __future__ import annotations

import importlib.util
import json
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

HERE = Path(__file__).resolve().parent
WAIT_PROBE = HERE / "trace-factory-m4a-wait-lfo-v1.py"
spec = importlib.util.spec_from_file_location("factory_m4a_wait_lfo_v1", WAIT_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {WAIT_PROBE}")
wait = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wait)


# mGBA reports pipelined Thumb PC (instruction + 2). The LR remains the Thumb
# return after MPlayMain's jump-table ``bl call_r3`` across the trampoline.
PLY_PEND_ENTRY_PC = 0x082DF8CA
CALL_R3_ENTRY_PC = 0x082DFCB6
MPLAY_JUMP_TABLE_RETURN = 0x082DFB5F
wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[PLY_PEND_ENTRY_PC] = "mplay-pend-entry"
wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[CALL_R3_ENTRY_PC] = "mplay-command-callback-entry"

COMMAND_FAMILIES = {
    0xB2: "ply_goto",
    0xB3: "ply_patt",
    0xB4: "ply_pend",
    0xB5: "ply_rept",
    0xBA: "ply_prio",
    0xBB: "ply_tempo",
    0xBC: "ply_keysh",
    0xBD: "ply_voice",
    0xBE: "ply_vol",
    0xBF: "ply_pan",
    0xC0: "ply_bend",
    0xC1: "ply_bendr",
    0xC2: "ply_lfos",
    0xC3: "ply_lfodl",
    0xC4: "ply_mod",
    0xC5: "ply_modt",
    0xC8: "ply_tune",
    0xCC: "ply_port",
    0xCD: "ply_xcmd",
    0xCE: "ply_endtie",
}

ORIGINAL_APPEND = wait.clear.channel.v3.old.append_m4a_internal_stage


def song_regions() -> list[tuple[str, int, int]]:
    elf = HERE.parents[1] / "reference" / "pokeemerald" / "pokeemerald.elf"
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    wanted = {*(f"mus_b_factory_{index}" for index in range(1, 10)), "mus_b_factory"}
    symbols = []
    for line in output.splitlines():
        parts = line.split()
        if len(parts) >= 3 and parts[-1] in wanted:
            symbols.append((parts[-1], int(parts[0], 16)))
    symbols.sort(key=lambda row: row[1])
    if len(symbols) != 10 or symbols[-1][0] != "mus_b_factory":
        raise RuntimeError("compiled mus_b_factory track symbols changed")
    return [
        (f"battle-factory-bgm-track-{index + 1}", symbols[index][1], symbols[index + 1][1])
        for index in range(9)
    ]


SONG_REGIONS = song_regions()


def normalize_song_pointer(pointer: int) -> dict[str, int | str]:
    matches = [
        {"role": role, "offset": pointer - start}
        for role, start, end in SONG_REGIONS
        if start <= pointer < end
    ]
    if len(matches) != 1:
        raise RuntimeError("ply_pend pattern return target is outside the compiled song")
    return matches[0]


def append_with_command_dispatch(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    workload = wait.clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]

    if stage == "mplay-track-command-pass":
        entries = sum(item["kind"] == "mplay-main-entry" for item in audio["stages"])
        if entries == 6:
            if "sixthMPlayPend" in audio["state"]:
                raise RuntimeError("sixth-player ply_pend capture was initialized twice")
            audio["state"]["sixthMPlayPend"] = {
                "revision": "factory-m4a-pend/v1",
                "playerRole": "music-player-5",
                "boundary": "ply_pend.entry-from-MPlayMain._081DD90C",
                "callbackFamilies": [],
                "entries": [],
            }
        return

    if stage not in {"mplay-command-callback-entry", "mplay-pend-entry"}:
        return
    capture = audio["state"].get("sixthMPlayPend")
    if capture is None:
        return
    lr = int(oracle.core.cpu.gprs[14]) & 0xFFFFFFFF
    if lr != MPLAY_JUMP_TABLE_RETURN:
        return

    player = wait.clear.channel.sixth_player(oracle)
    if (int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF) != player:
        raise RuntimeError("jump-table callback player is not music-player-5")
    track_count = oracle.read_u8(player + 0x08)
    tracks = wait.clear.channel.v3.old.read_u32(oracle, player + 0x2C)
    track = int(oracle.core.cpu.gprs[1]) & 0xFFFFFFFF
    delta = track - tracks
    if delta < 0 or delta % wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE != 0:
        raise RuntimeError("jump-table callback track is outside music-player-5")
    track_index = delta // wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
    if track_index >= track_count:
        raise RuntimeError("jump-table callback track index exceeds track count")

    command = oracle.read_u8(player + 0x0A) + 0xB1
    if stage == "mplay-command-callback-entry":
        family = COMMAND_FAMILIES.get(command)
        if family is None:
            raise RuntimeError(f"unmapped MPlay jump-table command 0x{command:02x}")
        capture["callbackFamilies"].append(family)
        return

    if command != 0xB4:
        raise RuntimeError("ply_pend entry does not carry the PEND command selector")
    pattern_level = oracle.read_u8(track + 0x02)
    return_target = None
    if pattern_level > 0:
        if pattern_level > 3:
            raise RuntimeError("ply_pend patternLevel exceeds the three-slot source stack")
        target = wait.clear.channel.v3.old.read_u32(oracle, track + 0x44 + (pattern_level - 1) * 4)
        return_target = normalize_song_pointer(target)
    capture["entries"].append({
        "trackIndex": track_index,
        "patternLevel": pattern_level,
        "returnTarget": return_target,
    })


wait.clear.channel.v3.old.append_m4a_internal_stage = append_with_command_dispatch


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = wait.clear.channel.v3.compact_source_state_receipt(result)
    observations = []
    for observation in receipt["interrupts"]:
        state = observation["m4a"]["state"]
        capture = state.get("sixthMPlayPend")
        observations.append({
            "sourceStateDigest": state["sourceSemanticState"]["stateDigest"],
            "callbackFamilies": None if capture is None else capture["callbackFamilies"],
            "pendCallbacks": None if capture is None else capture["entries"],
        })
    return {
        "schema": "factory-m4a-pend-probe/v1",
        "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"],
        "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest",
        "captureBoundary": "sixth-MPlayMain-ply_pend-entry",
        "observations": observations,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = wait.clear.channel.v3.old.run_anchor()
    elif CASE == "liliana":
        result = wait.clear.channel.v3.old.run_liliana()
    else:
        result = wait.clear.channel.v3.old.run_factory_varied()
    packet = compact(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(packet, indent=2) + "\n")
    callbacks = sum(len(row["pendCallbacks"] or []) for row in packet["observations"])
    initialized = sum(row["pendCallbacks"] is not None for row in packet["observations"])
    print(f"wrote {OUTPUT}: {callbacks} ply_pend callbacks across {initialized} one-pass observations")


if __name__ == "__main__":
    main()
