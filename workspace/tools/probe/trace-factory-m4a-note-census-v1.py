#!/usr/bin/env python3
"""Capture an address-free sixth-player ``ply_note`` route census."""

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


# mGBA exposes pipelined Thumb PC (executing instruction + 2).
PLY_NOTE_ENTRY_PC = 0x082DFD3A
SELECTOR_PCS = {
    0x082DFD98: "keysplit",
    0x082DFDA0: "rhythm",
    0x082DFDD2: "inline",
}
wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[PLY_NOTE_ENTRY_PC] = "mplay-note-entry"
for selector_pc, selector in SELECTOR_PCS.items():
    wait.clear.channel.v3.old.M4A_INTERNAL_STAGE_PCS[selector_pc] = f"mplay-note-selector-{selector}"

ORIGINAL_APPEND = wait.clear.channel.v3.old.append_m4a_internal_stage
TONEDATA_TYPE_SPL = 0x40
TONEDATA_TYPE_RHY = 0x80
VOICEGROUP_START = 0x08676148
VOICEGROUP_INDEX_WINDOW_END = VOICEGROUP_START + 128 * 12


def song_regions() -> list[tuple[str, int, int]]:
    elf = HERE.parents[1] / "reference" / "pokeemerald" / "pokeemerald.elf"
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        capture_output=True, text=True, check=True,
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
    return [(f"battle-factory-bgm-track-{index + 1}", symbols[index][1], symbols[index + 1][1]) for index in range(9)]


SONG_REGIONS = song_regions()


def normalize_song_pointer(pointer: int) -> dict[str, int | str]:
    matches = [{"role": role, "offset": pointer - start} for role, start, end in SONG_REGIONS if start <= pointer < end]
    if len(matches) != 1:
        raise RuntimeError(f"ply_note command pointer 0x{pointer:08x} is outside the compiled song")
    return matches[0]


def expected_selector(tone_type: int) -> str:
    if tone_type & TONEDATA_TYPE_SPL:
        return "keysplit"
    if tone_type & TONEDATA_TYPE_RHY:
        return "rhythm"
    return "inline"


def parsed_note_values(command_bytes: list[int], key_before: int, velocity_before: int) -> tuple[int, int, int]:
    key = key_before
    velocity = velocity_before
    accepted = 0
    if command_bytes[0] < 0x80:
        key = command_bytes[0]
        accepted = 1
        if len(command_bytes) > 1 and command_bytes[1] < 0x80:
            velocity = command_bytes[1]
            accepted = 2
            if len(command_bytes) > 2 and command_bytes[2] < 0x80:
                accepted = 3
    return key, velocity, accepted


def append_with_note_census(epoch: dict[str, Any], oracle: Any, frame: int, pc: int, stage: str) -> None:
    ORIGINAL_APPEND(epoch, oracle, frame, pc, stage)
    workload = wait.clear.channel.v3.old.current_vblank_workload(epoch)
    if workload is None or "audioInternal" not in workload:
        return
    audio = workload["audioInternal"]
    if stage == "mplay-track-command-pass":
        entries = sum(item["kind"] == "mplay-main-entry" for item in audio["stages"])
        if entries == 6:
            if "sixthMPlayNoteCensus" in audio["state"]:
                raise RuntimeError("sixth-player ply_note census was initialized twice")
            audio["state"]["sixthMPlayNoteCensus"] = {
                "revision": "factory-m4a-note-census/v1",
                "playerRole": "music-player-5",
                "boundary": "ply_note.entry-and-source-selector",
                "entries": [],
            }
        return
    if stage != "mplay-note-entry" and not stage.startswith("mplay-note-selector-"):
        return
    capture = audio["state"].get("sixthMPlayNoteCensus")
    if capture is None:
        return
    if stage == "mplay-note-entry":
        player = int(oracle.core.cpu.gprs[1]) & 0xFFFFFFFF
        if player != wait.clear.channel.sixth_player(oracle):
            raise RuntimeError("ply_note entry player is not music-player-5")
        tracks = wait.clear.channel.v3.old.read_u32(oracle, player + 0x2C)
        track = int(oracle.core.cpu.gprs[2]) & 0xFFFFFFFF
        delta = track - tracks
        if delta < 0 or delta % wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE != 0:
            raise RuntimeError("ply_note entry track is outside music-player-5")
        track_index = delta // wait.clear.channel.v3.MUSIC_PLAYER_TRACK_SIZE
        if track_index >= oracle.read_u8(player + 0x08):
            raise RuntimeError("ply_note entry track index exceeds track count")
        command_pointer = wait.clear.channel.v3.old.read_u32(oracle, track + 0x40)
        normalized = normalize_song_pointer(command_pointer)
        role_start, role_end = next((start, end) for role, start, end in SONG_REGIONS if role == normalized["role"])
        available = min(3, role_end - command_pointer)
        if available <= 0:
            raise RuntimeError("ply_note command source lacks its first parameter byte")
        command_bytes = [oracle.read_u8(command_pointer + index) for index in range(available)]
        key_before = oracle.read_u8(track + 0x05)
        velocity_before = oracle.read_u8(track + 0x06)
        key_after, velocity_after, accepted_parameters = parsed_note_values(command_bytes, key_before, velocity_before)
        tone_type = oracle.read_u8(track + 0x24)
        tone_table = None
        selected_tone = None
        if tone_type & (TONEDATA_TYPE_SPL | TONEDATA_TYPE_RHY):
            table = wait.clear.channel.v3.old.read_u32(oracle, track + 0x28)
            if table != VOICEGROUP_START:
                raise RuntimeError(f"nested ply_note tone table 0x{table:08x} is not voicegroup_frlg_drumset")
            selected_index = key_after
            selected = table + selected_index * 12
            if selected + 12 > VOICEGROUP_INDEX_WINDOW_END:
                raise RuntimeError("nested ply_note selected tone escapes voicegroup_b_factory")
            tone_table = {"role": "voicegroup_frlg_drumset-midi-index-base", "offset": 0}
            selected_tone = {
                "index": selected_index,
                "scalarBytes": [oracle.read_u8(selected + index) for index in (0, 1, 2, 3, 8, 9, 10, 11)],
            }
        capture["entries"].append({
            "trackIndex": track_index,
            "noteCode": int(oracle.core.cpu.gprs[0]) & 0xFFFFFFFF,
            "commandPointer": normalized,
            "commandBytes": command_bytes,
            "acceptedParameters": accepted_parameters,
            "keyBefore": key_before,
            "velocityBefore": velocity_before,
            "keyAfter": key_after,
            "velocityAfter": velocity_after,
            "toneType": tone_type,
            "toneTable": tone_table,
            "selectedTone": selected_tone,
            "derivedSelector": expected_selector(tone_type),
            "observedSelector": None,
        })
        return
    if not capture["entries"] or capture["entries"][-1]["observedSelector"] is not None:
        raise RuntimeError("ply_note selector has no pending entry")
    selector = stage.removeprefix("mplay-note-selector-")
    entry = capture["entries"][-1]
    if selector != entry["derivedSelector"]:
        raise RuntimeError(f"source-derived selector {entry['derivedSelector']} disagrees with executed {selector}")
    entry["observedSelector"] = selector


wait.clear.channel.v3.old.append_m4a_internal_stage = append_with_note_census


def compact(result: dict[str, Any]) -> dict[str, Any]:
    receipt = wait.clear.channel.v3.compact_source_state_receipt(result)
    observations = []
    for observation in receipt["interrupts"]:
        state = observation["m4a"]["state"]
        capture = state.get("sixthMPlayNoteCensus")
        entries = None if capture is None else capture["entries"]
        if entries is not None and any(entry["observedSelector"] is None for entry in entries):
            raise RuntimeError("ply_note entry did not reach exactly one selector")
        observations.append({
            "sourceStateDigest": state["sourceSemanticState"]["stateDigest"],
            "noteCallbacks": entries,
        })
    return {
        "schema": "factory-m4a-note-census-probe/v1", "case": receipt["case"],
        "oracleProfile": receipt["oracleProfile"], "sourceFunction": receipt["sourceFunction"],
        "joinKey": "sourceStateDigest", "captureBoundary": "sixth-MPlayMain-ply_note-entry-and-selector",
        "addressFree": True, "observations": observations,
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
    callbacks = [callback for row in packet["observations"] for callback in (row["noteCallbacks"] or [])]
    routes: dict[str, int] = {}
    for callback in callbacks:
        selector = callback["observedSelector"]
        routes[selector] = routes.get(selector, 0) + 1
    print(f"wrote {OUTPUT}: {len(callbacks)} ply_note callbacks, routes={routes}")


if __name__ == "__main__":
    main()
