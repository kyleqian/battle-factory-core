#!/usr/bin/env python3
"""lsd199: per-frame RAM trace of the AnimTask_ShakeMon target pose (docs/lsd198-leech-seed-drain-animation.md, lsd199 section).

One battle-lab scenario in a fresh direct mGBA process (never the shared HTTP oracles), Scene ON or OFF.
usage: lsd199ShakeProbe.py <scenario.json> <on|off> <output.json>
Per trace frame (frame n = after n trace frames, i.e. after that frame's RunTasks): gAnimScriptActive (`act`), gAnimScriptCallback (`cb`),
for battlers 0 / 1 the battler sprite's x2 / y2 (`b0` / `b1` = [x2, y2]) and the OAM-buffer Y of the entry with that sprite's tile
(`oy0` / `oy1`, gMain.oamBuffer as built by this frame's BuildOamBuffer, i.e. before this frame's RunTasks), and the active task list in RunTasks order
(`tasks` = [[func, priority], ...]). Rows are stored only while gAnimScriptActive is set (plus 3 frames after).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

if len(sys.argv) != 4 or sys.argv[2] not in ("on", "off"):
    raise SystemExit("usage: lsd199ShakeProbe.py <scenario> <on|off> <output.json>")
SCENARIO, MODE, OUTPUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]
G_TASKS, G_MAIN = 0x03005E00, 0x030022C0  # pokeemerald.map ("gTasks = ." / "gMain = .")


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / BOOT)
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    sy = oracle.symbols
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    s16 = lambda a: (u16(a) ^ 0x8000) - 0x8000
    act_a, cb_a, ids_a, spr_a = sy["gAnimScriptActive"], sy["gAnimScriptCallback"], sy["gBattlerSpriteIds"], sy["gSprites"]
    rows, tail, frame = [], 0, 0

    def tasks() -> list:
        head = next((i for i in range(16) if u8(G_TASKS + i * 40 + 4) and u8(G_TASKS + i * 40 + 5) == 0xFE), None)
        out, i = [], head
        while i is not None and i < 16 and len(out) < 16:
            base = G_TASKS + i * 40
            out.append([hex(u32(base)), u8(base + 7), i])
            nxt = u8(base + 6)
            i = None if nxt == 0xFF else nxt
        return out

    def oam_y(sprite: int) -> int | None:
        tile = u16(spr_a + sprite * 0x44 + 4) & 0x3FF
        for k in range(128):
            e = G_MAIN + 0x38 + k * 8
            if (u16(e + 4) & 0x3FF) == tile and (u16(e) & 0x300) != 0x200:
                return u16(e) & 0xFF
        return None

    def sample() -> None:
        nonlocal tail
        act = u8(act_a)
        tail = 3 if act else tail - 1
        if tail < 0:
            return
        row = {"f": frame, "act": act, "cb": hex(u32(cb_a)), "tasks": tasks()}
        for b in (0, 1):
            sid = u8(ids_a + b)
            row[f"b{b}"] = [s16(spr_a + sid * 0x44 + 0x24), s16(spr_a + sid * 0x44 + 0x26)]
            row[f"oy{b}"] = oam_y(sid)
        rows.append(row)

    sample()
    limit = int(os.environ.get("SUB183_MAX_FRAMES", "1000000"))
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            if frame >= limit:
                break
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    OUTPUT.write_text(json.dumps({"schema": "lsd199-shake-probe/v1", "scenario": SCENARIO.name, "mode": MODE, "frameCount": frame,
                                  "symbols": {k: hex(sy[k]) for k in ("AnimTask_ShakeMon", "AnimTask_GetBattlersFromArg") if k in sy},
                                  "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
