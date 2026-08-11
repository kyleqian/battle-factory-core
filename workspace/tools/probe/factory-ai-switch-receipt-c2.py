#!/usr/bin/env python3
"""Attribute the legal Perish Song zero-timer Factory-AI switch command.

The fixture stages no transient state: Misdreavus applies Perish Song, then
the player voluntarily switches before the third countdown.  The next AI
command sees only its own active at timer zero.  A fast sRandCount pass and a
fresh targeted single-step pass prove that the helper and suitable selector
add no Random() calls at that command boundary.
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (2, 3):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [seed]")

OUTPUT = Path(sys.argv[1])
SEED_OVERRIDE = int(sys.argv[2], 0) if len(sys.argv) == 3 else None
ROOT = Path(__file__).resolve().parents[2]


def harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise RuntimeError("could not find the harness root")


HARNESS = harness_root(ROOT)
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = HARNESS / "reference" / "pokeemerald"
ROM, MAP, ELF = REFERENCE / "pokeemerald.gba", REFERENCE / "pokeemerald.map", REFERENCE / "pokeemerald.elf"
BOOTSTRAP = HARNESS / "oracle" / "bootstrap" / "factory-battle-scene-off.json"
FIXTURE = ROOT / "tools" / "battle-lab" / "mechanic-factory-ai-switch-receipt-c2-perish-off.json"
RANDOM_ENTRY_PC, SRANDCOUNT, GRNG = 0x0806F5CC + 2, 0x020249C0, 0x03005D80
G_ACTIVE_BATTLER, G_CHOSEN_ACTION, GBATTLE_STRUCT_PTR = 0x02024064, 0x0202421C, 0x0202449C
AI_MON_TO_SWITCH_OFFSET, MON_TO_SWITCH_OFFSET = 0x294, 0x5C
G_STATUSES3, G_DISABLE_STRUCTS, DISABLE_STRUCT_SIZE = 0x020242AC, 0x020242BC, 28


def symbols() -> list[tuple[int, str]]:
    out = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(ELF)], check=True, capture_output=True, text=True).stdout
    return [(int(parts[0], 16), parts[2]) for line in out.splitlines() if len(parts := line.split()) == 3 and parts[1] in ("t", "T")]


def caller(table: list[tuple[int, str]], lr: int) -> str:
    base, name = table[bisect.bisect_right(table, (lr, "\U0010ffff")) - 1]
    return name if base == lr else f"{name}+0x{lr - base:x}"


def request() -> dict:
    value = json.loads(FIXTURE.read_text())
    if SEED_OVERRIDE is not None:
        value["seed"] = SEED_OVERRIDE
    return validate_request(value, "battle-scene-off")


def stage() -> tuple[EmeraldOracle, dict]:
    oracle = EmeraldOracle(rom_path=ROM, map_path=MAP, bootstrap_path=BOOTSTRAP)
    req = request()
    BattleLab(oracle, "battle-scene-off").prepare(req)
    return oracle, req


def trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(segment["frames"]):
            frame += 1
            yield frame, segment.get("buttons", [])


def state(oracle: EmeraldOracle) -> dict:
    battle_struct = oracle.read_u32(GBATTLE_STRUCT_PTR)
    return {
        "activeBattler": oracle.read_u8(G_ACTIVE_BATTLER),
        "chosenActions": [oracle.read_u8(G_CHOSEN_ACTION + index) for index in range(4)],
        "aiMonToSwitchIntoId": oracle.read_u8(battle_struct + AI_MON_TO_SWITCH_OFFSET + 1),
        "monToSwitchIntoId": oracle.read_u8(battle_struct + MON_TO_SWITCH_OFFSET + 1),
        "playerPerishSongTimer": oracle.read_u8(G_DISABLE_STRUCTS + 15) & 0x0F,
        "opponentPerishSongTimer": oracle.read_u8(G_DISABLE_STRUCTS + DISABLE_STRUCT_SIZE + 15) & 0x0F,
        "playerPerishStatus3": f"0x{oracle.read_u32(G_STATUSES3):08x}",
        "opponentPerishStatus3": f"0x{oracle.read_u32(G_STATUSES3 + 4):08x}",
    }


def fast_pass(oracle: EmeraldOracle, trace: dict) -> tuple[list[dict], list[dict]]:
    deltas, states, before = [], [], oracle.read_u32(SRANDCOUNT)
    for frame, buttons in trace_frames(trace):
        oracle.advance(buttons)
        after, snapshot = oracle.read_u32(SRANDCOUNT), state(oracle)
        if after != before:
            deltas.append({"frame": frame, "delta": (after - before) & 0xFFFFFFFF, "state": snapshot})
        states.append({"frame": frame, **snapshot})
        before = after
    return deltas, states


def step_frame(oracle: EmeraldOracle, frame: int, buttons: list[str], table: list[tuple[int, str]]) -> list[dict]:
    oracle._set_buttons(buttons)
    start_counter, rows = oracle.core.frame_counter, []
    while oracle.core.frame_counter == start_counter:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            pre, lr, count = oracle.read_u32(GRNG), oracle.core.cpu.lr, oracle.read_u32(SRANDCOUNT)
            while oracle.read_u32(SRANDCOUNT) == count:
                oracle.core.step()
            post = oracle.read_u32(GRNG)
            rows.append({"frame": frame, "lr": f"0x{lr:08x}", "caller": caller(table, lr), "preRng": f"0x{pre:08x}", "postRng": f"0x{post:08x}", "returnU16": post >> 16})
            continue
        oracle.core.step()
    oracle._screen_stale = False
    oracle.frame += 1
    for row in rows:
        row["stateAfterFrame"] = state(oracle)
    return rows


def attributed_pass(oracle: EmeraldOracle, trace: dict, frames: set[int], table: list[tuple[int, str]]) -> list[dict]:
    rows = []
    for frame, buttons in trace_frames(trace):
        rows.extend(step_frame(oracle, frame, buttons, table) if frame in frames else (oracle.advance(buttons) or []))
    return rows


def main() -> None:
    first, req = stage()
    deltas, states = fast_pass(first, req["trace"])
    second, _ = stage()
    rows = attributed_pass(second, req["trace"], {row["frame"] for row in deltas}, symbols())
    commands = []
    prior = 255
    for snapshot in states:
        current = snapshot["chosenActions"][1]
        if prior == 255 and current != 255:
            commands.append(snapshot)
        prior = current
    zero_timer = [
        snapshot for snapshot in commands
        if snapshot["opponentPerishSongTimer"] == 0 and snapshot["opponentPerishStatus3"] != "0x00000000"
    ]
    if len(zero_timer) != 1:
        raise RuntimeError(f"expected exactly one live zero-timer AI command, got {len(zero_timer)}")
    command = zero_timer[0]
    command_rows = [row for row in rows if row["frame"] == command["frame"]]
    result = {
        "fixture": str(FIXTURE.relative_to(ROOT)), "profile": "battle-scene-off", "seed": req["seed"],
        "fastPass": deltas, "attributedDraws": rows, "commandStates": commands,
        "perishReceipt": {"zeroTimerCommand": command, "attributedDrawsAtCommand": command_rows},
        "verdict": {
            "liveZeroTimerAiCommandReached": True,
            "perishHelperAndSuitableSelectorDrawDelta": len(command_rows),
            "switchesToPartyIndex1": command["chosenActions"][1] == 2 and command["monToSwitchIntoId"] == 1,
        },
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}; zero-timer commands={len(zero_timer)}")


if __name__ == "__main__":
    main()
