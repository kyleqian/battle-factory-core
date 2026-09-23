#!/usr/bin/env python3
"""Capture MOVE_CURSE's first Step2 palette-transfer VCOUNT directly.

This probe intentionally never reads the framebuffer.  A fast source-state
pass finds the frame where the live Curse task first changes from Step1 to
Step2.  A fresh emulator then single-steps only that frame and samples
REG_VCOUNT at BeginNormalPaletteFade's direct CpuSet call and BIOS SWI.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <ghost-scenario.json> <output.json>")

SCENARIO = Path(sys.argv[1]).resolve()
OUTPUT = Path(sys.argv[2]).resolve()
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
REG_VCOUNT = 0x04000006
REG_DISPSTAT = 0x04000004
TASK_SIZE = 0x28
TASK_ACTIVE_OFFSET = 4
CPUSET_CALL = 0x080A1BCE
CPUSET_SWI = 0x082E7084
THUMB_PIPELINE = 2
FADED_PALETTE = 0x02037B14
HARDWARE_PALETTE = 0x05000000
CPUSET_32BIT_0X100_WORDS = 0x04000100


def symbols() -> dict[str, int]:
    ref = ROOT / "reference/pokeemerald"
    text = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    result: dict[str, int] = {}
    for line in text.splitlines():
        fields = line.split()
        if len(fields) == 3 and all(char in "0123456789abcdefABCDEF" for char in fields[0]):
            result[fields[2]] = int(fields[0], 16)
    return result


NAMES = symbols()
STEP1 = NAMES["AnimTask_CurseStretchingBlackBg_Step1"]
STEP2 = NAMES["AnimTask_CurseStretchingBlackBg_Step2"]


def new_stage() -> tuple[EmeraldOracle, dict, dict]:
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba",
        ref / "pokeemerald.map",
        HARNESS / "oracle/bootstrap/factory.json",
    )
    setup = BattleLab(oracle, PROFILE).prepare(request)
    return oracle, request, setup


def trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, buttons


def callback_slots(oracle: EmeraldOracle, callback: int) -> list[int]:
    tasks = oracle.symbols["gTasks"]
    return [
        slot for slot in range(16)
        if oracle.read_u8(tasks + slot * TASK_SIZE + TASK_ACTIVE_OFFSET)
        and (oracle.read_u32(tasks + slot * TASK_SIZE) & ~1) == callback
    ]


def find_first_step2_frame() -> tuple[int, list[int], dict]:
    oracle, request, setup = new_stage()
    previous_step2: list[int] = []
    saw_step1 = False
    for frame, buttons in trace_frames(request["trace"]):
        oracle.advance(buttons)
        step1 = callback_slots(oracle, STEP1)
        step2 = callback_slots(oracle, STEP2)
        saw_step1 = saw_step1 or bool(step1)
        if saw_step1 and step2 and not previous_step2:
            return frame, step2, setup
        previous_step2 = step2
    raise RuntimeError("first Curse Step2 callback frame was not observed")


def single_step_transfer(target_frame: int) -> dict:
    oracle, request, _setup = new_stage()
    frames = list(trace_frames(request["trace"]))
    for frame, buttons in frames:
        if frame >= target_frame:
            target_buttons = buttons
            break
        oracle.advance(buttons)
    else:
        raise RuntimeError(f"target frame {target_frame} exceeds trace")

    oracle._set_buttons(target_buttons)
    start_counter = oracle.core.frame_counter
    events: list[dict] = []
    steps = 0
    while oracle.core.frame_counter == start_counter:
        executing = int(oracle.core.cpu.pc) - THUMB_PIPELINE
        args = [int(oracle.core.cpu.gprs[index]) for index in range(3)]
        direct_palette_copy = args == [
            FADED_PALETTE, HARDWARE_PALETTE, CPUSET_32BIT_0X100_WORDS,
        ]
        if executing in (CPUSET_CALL, CPUSET_SWI) and direct_palette_copy:
            before = oracle.read_u16(REG_VCOUNT)
            dispstat = oracle.read_u16(REG_DISPSTAT)
            oracle.core.step()
            steps += 1
            after = oracle.read_u16(REG_VCOUNT)
            events.append({
                "site": "BeginNormalPaletteFade/CpuSet-call" if executing == CPUSET_CALL else "CpuSet/SWI",
                "executingAddress": hex(executing),
                "vcountBefore": before,
                "vcountAfter": after,
                "dispstatBefore": hex(dispstat),
                "inHBlankBefore": bool(dispstat & 0x2),
                "inVBlankBefore": bool(dispstat & 0x1),
                "firstPostTransferScanline": before + (1 if dispstat & 0x2 else 0),
                "arguments": {
                    "source": hex(args[0]), "destination": hex(args[1]),
                    "control": hex(args[2]),
                },
            })
            continue
        oracle.core.step()
        steps += 1
        if steps > 1_000_000:
            raise RuntimeError("target frame exceeded one million instructions")
    return {"events": events, "instructionSteps": steps}


def main() -> None:
    target_frame, slots, setup = find_first_step2_frame()
    stepped = single_step_transfer(target_frame)
    if [event["site"] for event in stepped["events"]] != [
        "BeginNormalPaletteFade/CpuSet-call", "CpuSet/SWI",
    ]:
        raise RuntimeError(f"unexpected transfer events: {stepped['events']}")
    result = {
        "schema": "curse-palette-transfer-timing-probe/v1",
        "oracleProfile": PROFILE,
        "scenario": str(SCENARIO.relative_to(ROOT)),
        "setup": {
            "player": [mon["species"] for mon in setup["player"]],
            "opponent": [mon["species"] for mon in setup["opponent"]],
        },
        "sourceDiscovery": {
            "method": "first live gTasks callback transition from AnimTask_CurseStretchingBlackBg_Step1 to Step2",
            "targetFrame": target_frame,
            "step2TaskSlots": slots,
        },
        "transfer": stepped,
        "framebufferRead": False,
        "pixelDataRead": False,
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}: frame={target_frame} events={stepped['events']}", flush=True)


if __name__ == "__main__":
    main()
