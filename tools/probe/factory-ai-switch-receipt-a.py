#!/usr/bin/env python3
"""Attribute the real-ROM FindMonThatAbsorbsOpponentsMove coin flip.

The probe follows the two-pass receipt method used by
attribute-factory-ai-random-callers.py: sRandCount identifies the only frames
that draw Random(), then a fresh battle-lab process single-steps just those
frames.  It records Random()+2's LR, the exact LCG transition, and the action
and AI_monToSwitchIntoId state left by that frame.  A fixture seed may be
overridden without changing the staged full parties.

Run each case through tools/run-mgba-probe.py; that wrapper validates the JSON
even on libmgba's known teardown SIGSEGV.
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
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
FIXTURE = ROOT / "tools" / "battle-lab" / "mechanic-factory-ai-switch-receipt-a-off.json"

RANDOM_ENTRY_PC = 0x0806F5CC + 2  # libmgba reports Thumb's pipelined PC.
SRANDCOUNT = 0x020249C0
GRNG = 0x03005D80
G_ACTIVE_BATTLER = 0x02024064
G_CHOSEN_ACTION = 0x0202421C
GBATTLE_STRUCT_PTR = 0x0202449C
AI_MON_TO_SWITCH_OFFSET = 0x294  # offsetof(struct BattleStruct, AI_monToSwitchIntoId).
MON_TO_SWITCH_OFFSET = 0x5C


def symbols() -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(ELF)],
        check=True, capture_output=True, text=True,
    ).stdout
    rows = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] in ("t", "T"):
            rows.append((int(fields[0], 16), fields[2]))
    return rows


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
    BattleLab(oracle, "battle-scene-off").prepare(req)
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
    found = []
    states = []
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
    start_counter = oracle.core.frame_counter
    rows = []
    while oracle.core.frame_counter == start_counter:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            pre = oracle.read_u32(GRNG)
            lr = oracle.core.cpu.lr
            counter = oracle.read_u32(SRANDCOUNT)
            while oracle.read_u32(SRANDCOUNT) == counter:
                oracle.core.step()
            post = oracle.read_u32(GRNG)
            source = caller(table, lr)
            u16 = post >> 16
            row = {
                "frame": frame,
                "lr": f"0x{lr:08x}",
                "caller": source,
                "preRng": f"0x{pre:08x}",
                "postRng": f"0x{post:08x}",
                "returnU16": u16,
            }
            if source.startswith("FindMonThatAbsorbsOpponentsMove"):
                row["expression"] = "Random() & 1"
                row["expressionResult"] = u16 & 1
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
    receipt_rows = [row for row in rows if row["caller"].startswith("FindMonThatAbsorbsOpponentsMove")]
    if len(receipt_rows) != 1:
        raise RuntimeError(f"expected exactly one absorber coin, got {len(receipt_rows)}")
    receipt = receipt_rows[0]
    success = receipt["expressionResult"] == 1
    command_state = next(
        state for state in states
        if state["frame"] >= receipt["frame"] and state["chosenAction"] != 255
    )
    receipt_index = rows.index(receipt)
    if success:
        command_rows = [receipt]
    else:
        final_tie_index = next(
            index for index, row in enumerate(rows[receipt_index + 1:], receipt_index + 1)
            if row["caller"].startswith("ChooseMoveOrAction_Singles")
        )
        command_rows = rows[receipt_index:final_tie_index + 1]
    command_delta = len(command_rows)
    result = {
        "fixture": str(FIXTURE.relative_to(ROOT)),
        "profile": "battle-scene-off",
        "seed": req["seed"],
        "fastPass": deltas,
        "attributedDraws": rows,
        "absorberReceipt": receipt,
        "command": {
            "firstChosenAction": command_state,
            "drawDelta": command_delta,
            "attributedDraws": command_rows,
        },
        "verdict": {
            "oddReturnSwitchesToPartyIndex1": success and command_state["chosenAction"] == 2 and receipt["aiMonToSwitchIntoIdWhenWritten"] == 1,
            "expectedCommandDelta": 1 if success else None,
            "controlRequiresOrdinaryMoveLedgerPlusOne": not success and command_delta > 1,
        },
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}; absorber u16={receipt['returnU16']} parity={receipt['expressionResult']}")


if __name__ == "__main__":
    main()
