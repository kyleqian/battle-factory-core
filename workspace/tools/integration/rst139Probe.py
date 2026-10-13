#!/usr/bin/env python3
"""rst139 (docs/rst139-ordinary-row-rest.md): per-frame battler sprite x2 / y2 of BOTH battlers through a whole battle-lab trace, Scene ON.
One scenario in a fresh direct mGBA process (never the shared HTTP oracles), the scenario's own explicit lab "seed".

usage: rst139Probe.py <scenario.json> <output.json>
Per frame n (after n trace frames; frame 0 = the lab's start) one row, compact (a key only when it changed since the previous row, except
`f` and `scr`):
  f                 frame
  act               gAnimScriptActive
  c0 / c1           gBattlerControllerFuncs[0 / 1] as its linker symbol (HandleInputChooseAction = the action menu, ...)
  b0 / b1           battler 0 / 1 sprite (gBattlerSpriteIds): [spriteId, x, y, x2, y2, invisible, species-pic tile]
  scr               sha256[:16] of the raw RGB888 screen
Optional env RST139_DUMP=<dir>: also write <dir>/<output stem>.npz (`frames`: every row's full RGB, uint8 [N, 160, 240, 3]); scratch only.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

if len(sys.argv) != 3:
    raise SystemExit("usage: rst139Probe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
SZ = 0x44


def s16(v: int) -> int:
    return v - 0x10000 if v & 0x8000 else v


def symbols(elf: Path) -> tuple[dict[str, int], dict[int, str]]:
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
    out, rev = {}, {}
    for line in nm.splitlines():
        p = line.split()
        if len(p) == 3:
            try:
                a = int(p[0], 16)
            except ValueError:
                continue
            out[p[2]] = a
            if p[1] in ("T", "t"):
                rev.setdefault(a, p[2])
    return out, rev


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    sy, rev = symbols(ref / "pokeemerald.elf")
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    act_a, spr_a, bsid_a, ctl_a = sy["gAnimScriptActive"], sy["gSprites"], sy["gBattlerSpriteIds"], sy["gBattlerControllerFuncs"]
    dump_dir = os.environ.get("RST139_DUMP")
    rows: list[dict] = []
    frames: list[np.ndarray] = []
    last: dict = {}
    frame = 0

    def sample() -> None:
        rgb = oracle.screen_rgb()
        if dump_dir:
            frames.append(np.frombuffer(rgb, dtype=np.uint8).reshape(160, 240, 3).copy())
        row = {"act": u8(act_a)}
        for bt in (0, 1):
            fn = u32(ctl_a + 4 * bt)
            row[f"c{bt}"] = rev.get(fn & ~1, hex(fn))
        for bt in (0, 1):
            sid = u8(bsid_a + bt)
            b = spr_a + sid * SZ
            row[f"b{bt}"] = [sid, s16(u16(b + 0x20)), s16(u16(b + 0x22)), s16(u16(b + 0x24)), s16(u16(b + 0x26)), (u8(b + 0x3E) >> 2) & 1,
                             u16(b + 4) & 0x3FF]
        out = {"f": frame}
        for k, v in row.items():
            if last.get(k) != v:
                out[k] = v
            last[k] = v
        out["scr"] = hashlib.sha256(rgb).hexdigest()[:16]
        rows.append(out)

    sample()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    if dump_dir:
        np.savez_compressed(os.path.join(dump_dir, f"{OUTPUT.stem}.npz"), frames=np.stack(frames))
    OUTPUT.write_text(json.dumps({"schema": "rst139-probe/v1", "scenario": SCENARIO.name, "seed": request.get("seed"), "frameCount": frame,
                                  "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
