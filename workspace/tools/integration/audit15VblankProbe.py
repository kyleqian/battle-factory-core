#!/usr/bin/env python3
"""Live audit 15: VBlank-write probe for a one-row blend residual (fresh direct mGBA process; never the shared HTTP oracles).

usage: audit15VblankProbe.py <scenario.json> <output.json> <start-frame> <end-frame>
For every trace frame n in [start, end] (frame n = after n trace frames, the prep48Probe.py numbering; row = n - activation) records, after
the advance: the IO registers BLDCNT / BLDALPHA / DISPCNT, the gpu_regs.c buffered copies (sGpuRegBuffer) and the waiting list head
(a buffered write that has not reached IO yet), gMain.vblankCounter1 / 2 and gAnimVisualTaskCount / gAnimScriptActive. The screen of frame n
was drawn with the IO state latched at the end of frame n-1's VBlank, so a register value that reaches IO one frame later shows one row later.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
START, END = int(sys.argv[3]), int(sys.argv[4])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
ref = (ROOT / "reference/pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
lab = BattleLab(oracle, "battle-scene-on")
lab.prepare(request)
sy = dict(oracle.symbols)
nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
for line in nm.splitlines():
    if len(p := line.split()) == 3 and p[2] not in sy and all(c in "0123456789abcdefABCDEF" for c in p[0]):
        sy[p[2]] = int(p[0], 16)
u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
buf, waiting = sy["sGpuRegBuffer"], sy["sGpuRegWaitingList"]
main = sy["gMain"]
rows = []
frame = 0
for segment in request["trace"]["segments"]:
    for _ in range(segment["frames"]):
        oracle.advance(segment.get("buttons", []))
        frame += 1
        if START <= frame <= END:
            rows.append({"frame": frame, "io": {"bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052), "dispcnt": u16(0x04000000)},
                         "buffer": {"bldcnt": u16(buf + 0x50), "bldalpha": u16(buf + 0x52), "dispcnt": u16(buf)},
                         "waiting": [u8(waiting + i) for i in range(4)],
                         "vblank1": u32(main + 0x20), "vblank2": u32(main + 0x24),
                         "animScriptActive": u8(sy["gAnimScriptActive"]), "visualTasks": u8(sy["gAnimVisualTaskCount"]),
                         "screen": hashlib.sha256(oracle.screen_rgb()).hexdigest()[:16]})
OUTPUT.write_text(json.dumps({"schema": "audit15-vblank-probe/v1", "scenario": SCENARIO.name, "rows": rows}, indent=0) + "\n")
