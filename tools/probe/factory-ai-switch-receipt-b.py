#!/usr/bin/env python3
"""Attribute the real-ROM Wonder Guard direct-selector draw.

The staged Battle Scene OFF fixture gives the player Wonder Guard Shedinja and
the AI Vaporeon active.  Only Charmander at party index 1 has an SE move, and
Flamethrower is deliberately slot 3.  Fresh runs use sRandCount to identify
draw frames, then single-step those frames to record Random's caller/LR,
exact LCG transition, expression result, and the controller action.
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
ROM = REFERENCE / "pokeemerald.gba"
MAP = REFERENCE / "pokeemerald.map"
ELF = REFERENCE / "pokeemerald.elf"
BOOTSTRAP = HARNESS / "oracle" / "bootstrap" / "factory-battle-scene-off.json"
FIXTURE = ROOT / "tools" / "battle-lab" / "mechanic-factory-ai-switch-receipt-b-off.json"

RANDOM_ENTRY_PC = 0x0806F5CC + 2
SRANDCOUNT = 0x020249C0
GRNG = 0x03005D80
G_ACTIVE_BATTLER = 0x02024064
G_CHOSEN_ACTION = 0x0202421C
GBATTLE_STRUCT_PTR = 0x0202449C
AI_MON_TO_SWITCH_OFFSET = 0x294
MON_TO_SWITCH_OFFSET = 0x5C


def symbols() -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(ELF)],
        check=True, capture_output=True, text=True,
    ).stdout
    return [
        (int(fields[0], 16), fields[2])
        for line in output.splitlines()
        if len(fields := line.split()) == 3 and fields[1] in ("t", "T")
    ]


def caller(table: list[tuple[int, str]], lr: int) -> str:
    index = bisect.bisect_right(table, (lr, "\U0010ffff")) - 1
    base, name = table[index]
    return name if base == lr else f"{name}+0x{lr - base:x}"


def request() -> dict:
    value = json.loads(FIXTURE.read_text())
    if SEED_OVERRIDE is not None:
        value["seed"] = SEED_OVERRIDE
    return validate_request(value, "battle-scene-off")


def stage() -> tuple[EmeraldOracle, dict]:
    oracle = EmeraldOracle(rom_path=ROM, map_path=MAP, bootstrap_path=BOOTSTRAP)
    req = request()
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(req)
    return oracle, req


def trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(segment["frames"]):
            frame += 1
            yield frame, segment.get("buttons", [])


def switch_state(oracle: EmeraldOracle) -> dict:
    active = oracle.read_u8(G_ACTIVE_BATTLER)
    battle_struct = oracle.read_u32(GBATTLE_STRUCT_PTR)
    return {
        "activeBattler": active,
        "chosenActions": [oracle.read_u8(G_CHOSEN_ACTION + index) for index in range(4)],
        "aiMonToSwitchIntoId": oracle.read_u8(battle_struct + AI_MON_TO_SWITCH_OFFSET + active),
        "monToSwitchIntoId": oracle.read_u8(battle_struct + MON_TO_SWITCH_OFFSET + active),
    }


def fast_pass(oracle: EmeraldOracle, trace: dict) -> tuple[list[dict], list[dict]]:
    found, states = [], []
    before = oracle.read_u32(SRANDCOUNT)
    for frame, buttons in trace_frames(trace):
        oracle.advance(buttons)
        after = oracle.read_u32(SRANDCOUNT)
        if after != before:
            found.append({"frame": frame, "delta": (after - before) & 0xFFFFFFFF, "state": switch_state(oracle)})
        state = switch_state(oracle)
        states.append({"frame": frame, "chosenAction": state["chosenActions"][1], "aiMonToSwitchIntoId": state["aiMonToSwitchIntoId"]})
        before = after
    return found, states


def step_frame(oracle: EmeraldOracle, frame: int, buttons: list[str], table: list[tuple[int, str]]) -> list[dict]:
    oracle._set_buttons(buttons)
    start_counter, rows = oracle.core.frame_counter, []
    while oracle.core.frame_counter == start_counter:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            pre, lr, counter = oracle.read_u32(GRNG), oracle.core.cpu.lr, oracle.read_u32(SRANDCOUNT)
            while oracle.read_u32(SRANDCOUNT) == counter:
                oracle.core.step()
            post, source = oracle.read_u32(GRNG), caller(table, lr)
            row = {"frame": frame, "lr": f"0x{lr:08x}", "caller": source, "preRng": f"0x{pre:08x}", "postRng": f"0x{post:08x}", "returnU16": post >> 16}
            if source.startswith("ShouldSwitchIfWonderGuard"):
                row["expression"] = "Random() % 3"
                row["expressionResult"] = (post >> 16) % 3
                row["aiMonToSwitchIntoIdWhenWritten"] = None
            rows.append(row)
            continue
        oracle.core.step()
        state = switch_state(oracle)
        for row in rows:
            if row.get("aiMonToSwitchIntoIdWhenWritten") is None and state["aiMonToSwitchIntoId"] != 6:
                row["aiMonToSwitchIntoIdWhenWritten"] = state["aiMonToSwitchIntoId"]
    oracle._screen_stale = False
    oracle.frame += 1
    for row in rows:
        row["stateAfterFrame"] = switch_state(oracle)
    return rows


def attributed_pass(oracle: EmeraldOracle, trace: dict, frames: set[int], table: list[tuple[int, str]]) -> list[dict]:
    rows = []
    for frame, buttons in trace_frames(trace):
        if frame in frames:
            rows.extend(step_frame(oracle, frame, buttons, table))
        else:
            oracle.advance(buttons)
    return rows


def main() -> None:
    first, req = stage()
    deltas, states = fast_pass(first, req["trace"])
    second, _ = stage()
    rows = attributed_pass(second, req["trace"], {row["frame"] for row in deltas}, symbols())
    receipt_rows = [row for row in rows if row["caller"].startswith("ShouldSwitchIfWonderGuard")]
    if len(receipt_rows) != 1:
        OUTPUT.write_text(json.dumps({"fastPass": deltas, "attributedDraws": rows}, indent=2) + "\n")
        raise RuntimeError(f"expected exactly one Wonder Guard selector draw, got {len(receipt_rows)}")
    receipt = receipt_rows[0]
    success = receipt["expressionResult"] in (0, 1)
    command_state = next(state for state in states if state["frame"] >= receipt["frame"] and state["chosenAction"] != 255)
    receipt_index = rows.index(receipt)
    if success:
        command_rows = [receipt]
    else:
        final_tie_index = next(
            index for index, row in enumerate(rows[receipt_index + 1:], receipt_index + 1)
            if row["caller"].startswith("ChooseMoveOrAction_Singles")
        )
        command_rows = rows[receipt_index:final_tie_index + 1]
    result = {
        "fixture": str(FIXTURE.relative_to(ROOT)), "profile": "battle-scene-off", "seed": req["seed"],
        "fastPass": deltas, "attributedDraws": rows, "wonderGuardReceipt": receipt,
        "command": {"firstChosenAction": command_state, "drawDelta": len(command_rows), "attributedDraws": command_rows},
        "verdict": {
            "selectorResultSwitchesToPartyIndex1": success and command_state["chosenAction"] == 2 and receipt["aiMonToSwitchIntoIdWhenWritten"] == 1,
            "expectedCommandDelta": 1 if success else None,
            "result2ContinuesToMoveChooser": not success and command_state["chosenAction"] == 0 and len(command_rows) > 1,
        },
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}; Wonder Guard u16={receipt['returnU16']} modulo={receipt['expressionResult']}")


if __name__ == "__main__":
    main()
