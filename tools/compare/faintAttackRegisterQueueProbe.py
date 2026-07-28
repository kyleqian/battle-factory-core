#!/usr/bin/env python3
"""Cycle-level Scene-ON probe for FAINT ATTACK's buffered BLDALPHA write.

The two committed rung-1 traces differ only by 30 idle frames before the
player SEND OUT confirmation.  This probe replays each accepted prefix, then
single-steps the CPU across FAINT ATTACK ages 148..153.  It records:

* the fade task's software coefficient/counter;
* gpu_regs.c's buffered BLDALPHA value and waiting-list membership;
* the hardware BLDALPHA register sampled by the PPU;
* VCOUNT and mGBA's global cycle at each relevant write/transfer; and
* frame-start/frame-end framebuffer hashes.

Run only through tools/run-mgba-probe.py; the output path must be fresh.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json>")

OUTPUT = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS = find_harness_root(ROOT)
ORACLE_DIR = HARNESS / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


ROM = (ROOT / "reference" / "pokeemerald" / "pokeemerald.gba").resolve()
MAP = (ROOT / "reference" / "pokeemerald" / "pokeemerald.map").resolve()
BOOTSTRAP = ORACLE_DIR / "bootstrap" / "factory.json"

GPU_BUFFER = 0x03000818
GPU_WAITING_LIST = 0x03000878
GPU_BUFFER_LOCKED = 0x030008D8
BLDALPHA_OFFSET = 0x52
REG_VCOUNT = 0x04000006
REG_BLDALPHA = 0x04000052
TASKS = 0x03005E00
TASK_SIZE = 0x28
FADE_STEP_THUMB = 0x0811381D
FADE_STEP_START = 0x0811381C
FADE_STEP_END = 0x08113884
COPY_BUFFERED_START = 0x08001080
COPY_BUFFERED_END = 0x080010AA
SET_GPU_REG_START = 0x080010B4
SET_GPU_REG_END = 0x08001132

ANIMATION_START = {
    "canonical": 20826,
    "delayed30": 20856,
}
PREFIX_TRACE = {
    "canonical": ROOT / "tools/compare/traces/turn16-rung1.json",
    "delayed30": ROOT / "tools/compare/traces/turn16-rung1-delayed.json",
}
FIRST_STEPPED_AGE = 148
LAST_STEPPED_AGE = 153


def u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)


def active_fade_task(oracle: EmeraldOracle) -> dict[str, int] | None:
    for slot in range(16):
        base = TASKS + slot * TASK_SIZE
        if oracle.read_u8(base + 4) and oracle.read_u32(base) == FADE_STEP_THUMB:
            return {
                "slot": slot,
                "coefficient": u16(oracle, base + 10),
                "delayCounter": u16(oracle, base + 12),
            }
    return None


def waiting_index(oracle: EmeraldOracle) -> int | None:
    for index in range(0x60):
        value = oracle.read_u8(GPU_WAITING_LIST + index)
        if value == BLDALPHA_OFFSET:
            return index
        if value == 0xFF:
            return None
    return None


def snapshot(oracle: EmeraldOracle, frame: int, pc: int | None = None) -> dict[str, object]:
    native = oracle.core._native
    cpu = oracle.core.cpu._native
    return {
        "frame": frame,
        "age": frame - ANIMATION_START[current_run],
        "pc": None if pc is None else f"0x{pc:08x}",
        "globalCycle": int(native.timing.globalCycles),
        "cpuCycles": int(cpu.cycles),
        "vcount": u16(oracle, REG_VCOUNT),
        "task": active_fade_task(oracle),
        "bufferedBldalpha": u16(oracle, GPU_BUFFER + BLDALPHA_OFFSET),
        "waitingIndex": waiting_index(oracle),
        "bufferLocked": oracle.read_u8(GPU_BUFFER_LOCKED),
        "hardwareBldalpha": u16(oracle, REG_BLDALPHA),
    }


def relevant_pc(pc: int) -> str | None:
    aligned = pc & ~1
    if FADE_STEP_START <= aligned < FADE_STEP_END:
        return "fade-task"
    if COPY_BUFFERED_START <= aligned < COPY_BUFFERED_END:
        return "copy-buffered"
    if SET_GPU_REG_START <= aligned < SET_GPU_REG_END:
        return "set-gpu-reg"
    return None


def replay_prefix(oracle: EmeraldOracle, path: Path) -> int:
    frame = 0
    trace = json.loads(path.read_text())
    for segment in trace["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            frame += 1
    return frame


def run_one(label: str) -> dict[str, object]:
    global current_run
    current_run = label
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP)
    oracle.new_session()
    frame = replay_prefix(oracle, PREFIX_TRACE[label])
    expected_prefix_end = ANIMATION_START[label] - 1
    if frame != expected_prefix_end:
        raise RuntimeError(f"{label}: prefix ended at {frame}, expected {expected_prefix_end}")

    while frame < ANIMATION_START[label] + FIRST_STEPPED_AGE - 1:
        oracle.advance([])
        frame += 1

    events: list[dict[str, object]] = []
    frame_ends = 0
    last_pc_kind: str | None = None

    def boundary(kind: str) -> None:
        nonlocal frame, frame_ends
        if kind == "frame-start":
            frame += 1
        row = snapshot(oracle, frame)
        row["kind"] = kind
        row["framebufferSha256"] = hashlib.sha256(oracle.screen_rgb()).hexdigest()
        events.append(row)
        if kind == "frame-end":
            frame_ends += 1

    oracle.core._callbacks.video_frame_started.append(lambda: boundary("frame-start"))
    oracle.core._callbacks.video_frame_ended.append(lambda: boundary("frame-end"))
    oracle._set_buttons([])

    previous = snapshot(oracle, frame)
    max_frame_ends = LAST_STEPPED_AGE - FIRST_STEPPED_AGE + 1
    steps = 0
    while frame_ends < max_frame_ends:
        pc = int(oracle.core.cpu.pc)
        pc_kind = relevant_pc(pc)
        before = snapshot(oracle, frame, pc)
        oracle.core.step()
        steps += 1
        after = snapshot(oracle, frame, int(oracle.core.cpu.pc))

        changed = any(
            before[key] != after[key]
            for key in (
                "task",
                "bufferedBldalpha",
                "waitingIndex",
                "bufferLocked",
                "hardwareBldalpha",
            )
        )
        if (pc_kind is not None and pc_kind != last_pc_kind) or changed:
            after["kind"] = pc_kind or "state-change"
            after["before"] = {
                key: before[key]
                for key in (
                    "vcount",
                    "task",
                    "bufferedBldalpha",
                    "waitingIndex",
                    "bufferLocked",
                    "hardwareBldalpha",
                )
            }
            events.append(after)
        last_pc_kind = pc_kind
        previous = after
        if steps > 2_000_000:
            raise RuntimeError(f"{label}: exceeded bounded single-step budget")

    return {
        "label": label,
        "animationStartFrame": ANIMATION_START[label],
        "firstSteppedAge": FIRST_STEPPED_AGE,
        "lastSteppedAge": LAST_STEPPED_AGE,
        "steps": steps,
        "events": events,
        "final": previous,
    }


current_run = "canonical"
result = {
    "schema": "faint-attack-register-queue-probe/v1",
    "source": {
        "SetGpuReg": "reference/pokeemerald/src/gpu_regs.c:66-97",
        "CopyBufferedValuesToGpuRegs": "reference/pokeemerald/src/gpu_regs.c:34-51",
        "VBlankIntr": "reference/pokeemerald/src/main.c:337-369",
        "fadeTask": "reference/pokeemerald/src/battle_anim_dark.c:231-261",
    },
    "runs": [run_one("canonical"), run_one("delayed30")],
}
OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(f"wrote {OUTPUT}")
