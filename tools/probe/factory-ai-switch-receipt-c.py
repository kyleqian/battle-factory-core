#!/usr/bin/env python3
"""Bank Recipe C's real-ROM Natural Cure sentinel receipt.

Each invocation creates two fresh mechanic-lab processes: a fast sRandCount
pass identifies draw frames, then a targeted single-step pass attributes every
Random()+2 LR and its exact LCG transition.  The trace's one constrained Spore
turn puts full-HP Natural Cure Swablu to sleep; Vaporeon/Jolteon are its legal
bench options.  The Perish fixture shares this script's low-level state
recorder while its zero-draw result is selected from state transitions.
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <natural|perish> <output.json> [seed]")

CASE, OUTPUT = sys.argv[1], Path(sys.argv[2])
if CASE not in ("natural", "perish"):
    raise SystemExit("case must be natural or perish")
SEED_OVERRIDE = int(sys.argv[3], 0) if len(sys.argv) == 4 else None
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
FIXTURE = ROOT / "tools" / "battle-lab" / f"mechanic-factory-ai-switch-receipt-c-{CASE}-off.json"
RANDOM_ENTRY_PC, SRANDCOUNT, GRNG = 0x0806F5CC + 2, 0x020249C0, 0x03005D80
G_ACTIVE_BATTLER, G_CHOSEN_ACTION, GBATTLE_STRUCT_PTR = 0x02024064, 0x0202421C, 0x0202449C
AI_MON_TO_SWITCH_OFFSET, MON_TO_SWITCH_OFFSET = 0x294, 0x5C
G_STATUSES3, G_DISABLE_STRUCTS, DISABLE_STRUCT_SIZE = 0x020242AC, 0x020242BC, 28


def symbols() -> list[tuple[int, str]]:
    output = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(ELF)], check=True, capture_output=True, text=True).stdout
    return [(int(parts[0], 16), parts[2]) for line in output.splitlines() if len(parts := line.split()) == 3 and parts[1] in ("t", "T")]


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


def switch_state(oracle: EmeraldOracle) -> dict:
    active, battle_struct = oracle.read_u8(G_ACTIVE_BATTLER), oracle.read_u32(GBATTLE_STRUCT_PTR)
    return {
        "activeBattler": active,
        "chosenActions": [oracle.read_u8(G_CHOSEN_ACTION + index) for index in range(4)],
        "aiMonToSwitchIntoId": oracle.read_u8(battle_struct + AI_MON_TO_SWITCH_OFFSET + active),
        "monToSwitchIntoId": oracle.read_u8(battle_struct + MON_TO_SWITCH_OFFSET + active),
        "statuses3": f"0x{oracle.read_u32(G_STATUSES3 + active * 4):08x}",
        "perishSongTimer": oracle.read_u8(G_DISABLE_STRUCTS + active * DISABLE_STRUCT_SIZE + 13) & 0x0F,
        "opponentAiMonToSwitchIntoId": oracle.read_u8(battle_struct + AI_MON_TO_SWITCH_OFFSET + 1),
        "opponentMonToSwitchIntoId": oracle.read_u8(battle_struct + MON_TO_SWITCH_OFFSET + 1),
    }


def fast_pass(oracle: EmeraldOracle, trace: dict) -> tuple[list[dict], list[dict]]:
    deltas, states, before = [], [], oracle.read_u32(SRANDCOUNT)
    for frame, buttons in trace_frames(trace):
        oracle.advance(buttons)
        after, state = oracle.read_u32(SRANDCOUNT), switch_state(oracle)
        if after != before:
            deltas.append({"frame": frame, "delta": (after - before) & 0xFFFFFFFF, "state": state})
        states.append({"frame": frame, **state})
        before = after
    return deltas, states


def step_frame(oracle: EmeraldOracle, frame: int, buttons: list[str], table: list[tuple[int, str]]) -> list[dict]:
    oracle._set_buttons(buttons)
    start_counter, rows = oracle.core.frame_counter, []
    battle_struct = oracle.read_u32(GBATTLE_STRUCT_PTR)
    prior_switch_id = oracle.read_u8(battle_struct + AI_MON_TO_SWITCH_OFFSET + 1)
    while oracle.core.frame_counter == start_counter:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            pre, lr, counter = oracle.read_u32(GRNG), oracle.core.cpu.lr, oracle.read_u32(SRANDCOUNT)
            while oracle.read_u32(SRANDCOUNT) == counter:
                oracle.core.step()
            post, source = oracle.read_u32(GRNG), caller(table, lr)
            row = {"frame": frame, "lr": f"0x{lr:08x}", "caller": source, "preRng": f"0x{pre:08x}", "postRng": f"0x{post:08x}", "returnU16": post >> 16}
            if source.startswith("ShouldSwitchIfNaturalCure"):
                row.update({"expression": "Random() & 1", "expressionResult": (post >> 16) & 1})
            rows.append(row)
            continue
        oracle.core.step()
        current_switch_id = oracle.read_u8(battle_struct + AI_MON_TO_SWITCH_OFFSET + 1)
        if current_switch_id != prior_switch_id:
            for row in rows:
                row.setdefault("opponentAiMonToSwitchIntoIdWrites", []).append(current_switch_id)
            prior_switch_id = current_switch_id
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
    natural_rows = [row for row in rows if row["caller"].startswith("ShouldSwitchIfNaturalCure")]
    command_states = []
    prior_action = 255
    for state in states:
        action = state["chosenActions"][1]
        if prior_action == 255 and action != 255:
            command_states.append(state)
        prior_action = action
    result = {"fixture": str(FIXTURE.relative_to(ROOT)), "profile": "battle-scene-off", "seed": req["seed"], "fastPass": deltas, "attributedDraws": rows, "commandStates": command_states}
    if CASE == "natural":
        if not natural_rows:
            raise RuntimeError("expected at least one Natural Cure Random() & 1 draw")
        primary = natural_rows[0]
        command_state = next(state for state in command_states if state["frame"] >= primary["frame"])
        command_rows = [row for row in natural_rows if row["frame"] == primary["frame"]]
        result.update({"naturalCureReceipt": primary, "command": {"firstChosenAction": command_state, "drawDelta": len(command_rows), "attributedDraws": command_rows}, "verdict": {"oddStatusMoveArmWritesSentinel": primary["expressionResult"] == 1, "evenControlContinuesToFinalNaturalCureCoin": primary["expressionResult"] == 0 and len(command_rows) == 2, "switchAction": command_state["chosenActions"][1] == 2}})
    else:
        switches = [state for state in command_states if state["chosenActions"][1] == 2]
        result.update({"perishReceipt": {"switchStates": switches, "naturalCureDraws": natural_rows}, "verdict": {"zeroRandomInPerishHelper": not natural_rows, "switchObserved": bool(switches)}})
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}; case={CASE}")


if __name__ == "__main__":
    main()
