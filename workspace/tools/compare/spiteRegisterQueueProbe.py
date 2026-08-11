#!/usr/bin/env python3
"""Source-window audio/GPU queue evidence for MOVE_SPITE."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: spiteRegisterQueueProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

SOUND_INFO = 0x03006380
PCM_DMA_COUNTER = 0x03002F50
GPU_BUFFER = 0x03000818
GPU_WAITING_LIST = 0x03000878
BLDALPHA = 0x52


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    BattleLab(oracle, "battle-scene-on").prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {parts[2]: int(parts[0], 16) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])}
    start, end = names["Move_SPITE"], names["Move_MACH_PUNCH"]
    ptr, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    visual, tasks = oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gTasks"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def waiting() -> bool:
        for index in range(0x60):
            value = oracle.read_u8(GPU_WAITING_LIST + index)
            if value == BLDALPHA:
                return True
            if value == 0xFF:
                return False
        return False

    rows: list[dict[str, int | bool]] = []
    started = False
    frame = 0

    def capture() -> bool:
        nonlocal started
        pointer = oracle.read_u32(ptr)
        if not started and start <= pointer < end and oracle.read_u8(active):
            started = True
        if not started:
            return False
        rows.append({
            "age": len(rows),
            "frame": frame,
            "bufferedBldalpha": u16(GPU_BUFFER + BLDALPHA),
            "hardwareBldalpha": u16(0x04000000 + BLDALPHA),
            "waiting": waiting(),
            "pcmDmaCounter": oracle.read_u8(SOUND_INFO + 4),
            "vblankPcmDmaCounter": oracle.read_u8(PCM_DMA_COUNTER),
            "c15": oracle.read_u8(SOUND_INFO + 10),
            "pcmDmaPeriod": oracle.read_u8(SOUND_INFO + 11),
            "maxLines": oracle.read_u8(SOUND_INFO + 12),
        })
        return len(rows) > 1 and not oracle.read_u8(active) and not oracle.read_u8(visual) and not any(oracle.read_u8(tasks + slot * 0x28 + 4) for slot in range(16))

    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            if capture():
                OUTPUT.write_text(json.dumps({"schema": "spite-register-queue/v1", "frames": rows}))
                return
    raise RuntimeError("Spite cleanup was not observed")


if __name__ == "__main__":
    main()
