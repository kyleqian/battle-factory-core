#!/usr/bin/env python3
"""Capture the exact comparison inside Cmd_if_has_move at AI_CV_Counter3.

Single-steps the reach decision and, whenever the PC enters Cmd_if_has_move
(0x08132e18) while gAIScriptPtr points at AI_CV_Counter3 (0x082dd46d), dumps
the relevant registers + the AI user's moveset + the script operand bytes.
Adapted from `attribute-factory-ai-mirrorcoat-scores.py` (a copy).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <mechanicLab-fixture.json> <output.json>")
FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REFERENCE_POKEEMERALD = (HARNESS_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
PROFILE = "battle-scene-off"

RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
SRANDCOUNT_ADDR = 0x020249C0
GBATTLE_RESOURCES_ADDR = 0x020244A8
AI_FIELD_OFFSET = 20
GBATTLE_MONS_ADDR = 0x02024084
GACTIVE_BATTLER_ADDR = 0x02024064
GAISCRIPT_PTR_ADDR = 0x0203AB38
BATTLEPOKEMON_SIZE = 0x58
MOVES_OFFSET = 0x0C
CMD_IF_HAS_MOVE = 0x08132E18
AI_CV_COUNTER3 = 0x082DD46D
DECISION_WINDOW_START, DECISION_WINDOW_END = (100, 732)


def load_fixture() -> dict:
    fixture = json.loads(FIXTURE_PATH.read_text())
    return validate_request(fixture, PROFILE)


def stage(oracle: EmeraldOracle):
    lab = BattleLab(oracle, PROFILE)
    request = load_fixture()
    setup = lab.prepare(request)
    return lab, request, setup


def rand_count(oracle: EmeraldOracle) -> int:
    return oracle.read_u32(SRANDCOUNT_ADDR)


def ai_pointer(oracle: EmeraldOracle) -> int:
    resources = oracle.read_u32(GBATTLE_RESOURCES_ADDR)
    return oracle.read_u32(resources + AI_FIELD_OFFSET)


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, buttons


def pass1_fast_deltas(oracle: EmeraldOracle, trace: dict) -> list[tuple[int, int]]:
    deltas: list[tuple[int, int]] = []
    prev = rand_count(oracle)
    for frame, buttons in iter_trace_frames(trace):
        oracle.advance(buttons)
        cur = rand_count(oracle)
        delta = (cur - prev) & 0xFFFFFFFF
        if delta:
            deltas.append((frame, delta))
        prev = cur
    return deltas


def main() -> None:
    oracle = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    lab, request, setup = stage(oracle)
    trace = request["trace"]
    deltas = pass1_fast_deltas(oracle, trace)
    window_deltas = [(f, d) for f, d in deltas if DECISION_WINDOW_START < f <= DECISION_WINDOW_END]
    flagged_frames = {f for f, _d in window_deltas}

    oracle2 = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    stage(oracle2)
    captures: list[dict] = []
    for frame, buttons in iter_trace_frames(trace):
        if frame not in flagged_frames:
            oracle2.advance(buttons)
            continue
        oracle2._set_buttons(buttons)
        start_fc = oracle2.core.frame_counter
        steps = 0
        max_steps = 20_000_000
        in_region = False
        while True:
            pc = oracle2.core.cpu.pc
            script_ptr = oracle2.read_u32(GAISCRIPT_PTR_ADDR)
            if pc == CMD_IF_HAS_MOVE + 2 and script_ptr == AI_CV_COUNTER3:
                in_region = True
            if in_region:
                if 0x08132E10 <= pc <= 0x08132F60:
                    cpu = oracle2.core.cpu
                    gprs = cpu.gprs
                    captures.append({
                        "frame": oracle2.frame + 1,
                        "pc": hex(pc),
                        "r0": gprs[0] & 0xFFFF, "r1": gprs[1] & 0xFF, "r2": gprs[2],
                        "r3": gprs[3], "r4": gprs[4], "r5": gprs[5], "r6": gprs[6], "r7": gprs[7],
                        "gAIScriptPtr": hex(script_ptr),
                    })
                else:
                    in_region = False
            if oracle2.core.frame_counter != start_fc:
                break
            oracle2.core.step()
            steps += 1
            if steps > max_steps:
                raise RuntimeError(f"frame did not end after {max_steps} single steps")
        oracle2._screen_stale = False
        oracle2.frame += 1

    result = {"fixture": str(FIXTURE_PATH), "ifHasMoveAtCounter3": captures}
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH}: {len(captures)} Cmd_if_has_move@Counter3 captures", flush=True)


if __name__ == "__main__":
    main()
