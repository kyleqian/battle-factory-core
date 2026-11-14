#!/usr/bin/env python3
"""Record the OFF rental-select same-species refusal (iss216).

Replays tools/compare/traces/iss216-same-species-off.json from the canonical OFF
draft anchor.  The anchor deal has no duplicate, so tick 0 changes ONE value:
sFactorySelectScreen->mons[5].monId := mons[0].monId, which is all
Select_AreSpeciesValid reads (gFacilityTrainerMons[monId].species).  The mon data
(name, category, picture) is untouched, so the screen looks like the plain anchor.

Run through tools/run-mgba-probe.py; writes raw RGB888 per tick into
$ISS216_RGB_DIR (NNN.rgb, tick = frames advanced) plus a state JSON.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

OUTPUT = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[2]
RGB_DIR = Path(os.environ["ISS216_RGB_DIR"]) if os.environ.get("ISS216_RGB_DIR") else None


def harness_root(start: Path) -> Path:
    for c in (start, *start.parents):
        if (c / "oracle" / "emerald_core.py").is_file():
            return c
    raise SystemExit("harness root not found")


HARNESS = harness_root(ROOT)
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REF = (ROOT / "reference" / "pokeemerald").resolve()
BOOTSTRAP = HARNESS / "oracle/bootstrap/factory-battle-scene-off.json"
S_SELECT = 0x0300127C
MONS, MON_SIZE = 0x0C, 0x6C
GTASKS, TASK_SIZE = 0x03005E00, 0x28
TASKS = {0x0819B124: "HandleMenu", 0x0819B378: "HandleChooseMons"}


def u16(o, a): return o.read_u8(a) | o.read_u8(a + 1) << 8
def u32(o, a): return u16(o, a) | u16(o, a + 2) << 16


def row(o, tick):
    s = u32(o, S_SELECT)
    task = None
    for i in range(16):
        a = GTASKS + i * TASK_SIZE
        if o.read_u8(a + 4):
            f = u32(o, a) & ~1
            if f in TASKS:
                task = {"name": TASKS[f], "state": u16(o, a + 8)}
    return {
        "tick": tick, "task": task,
        "menuCursorPos": o.read_u8(s), "cursorPos": o.read_u8(s + 3), "selectingMonsState": o.read_u8(s + 5),
        "selectedIds": [o.read_u8(s + MONS + i * MON_SIZE + 4) for i in range(6)],
        "monIds": [u16(o, s + MONS + i * MON_SIZE) for i in range(6)],
    }


def main():
    trace = json.loads((ROOT / "tools/compare/traces/iss216-same-species-off.json").read_text())
    o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", BOOTSTRAP)
    o.new_session()
    s = u32(o, S_SELECT)
    before = row(o, 0)
    a0 = s + MONS
    mon0 = u16(o, a0)
    o.write_u8(s + MONS + 5 * MON_SIZE, mon0 & 0xFF)
    o.write_u8(s + MONS + 5 * MON_SIZE + 1, mon0 >> 8)
    rows = [row(o, 0)]
    if RGB_DIR:
        RGB_DIR.mkdir(parents=True, exist_ok=True)
        (RGB_DIR / "000.rgb").write_bytes(o.screen_rgb())
    tick = 0
    for seg in trace["segments"]:
        for _ in range(seg["frames"]):
            o.advance(seg.get("buttons", []))
            tick += 1
            rows.append(row(o, tick))
            if RGB_DIR:
                (RGB_DIR / f"{tick:03d}.rgb").write_bytes(o.screen_rgb())
    OUTPUT.write_text(json.dumps({"before": before, "rows": rows}) + "\n")


main()
