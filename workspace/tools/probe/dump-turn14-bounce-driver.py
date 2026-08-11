#!/usr/bin/env python3
"""S7/S8 turn 14 settled-menu bounce residual probe (ISSUES #34,
docs/turn13-bounce-notes.md's own §2 method, re-pointed at TURN14_MENU_
REDRAW_TICK=18086 instead of turn 13's own switch-in reset at 17112): RAM-
probes the SAME `DoBounceEffect` driver state `dump-turn13-bounce-driver.py`
already established for battler 0 (Onix), just over turn 14's own window
instead. Resolves `gBattleSpritesDataPtr` (deref) -> `healthBoxesData
[battler=0]` -> `{battlerBounceSpriteId@+3, healthboxBounceSpriteId@+2}` ->
`gSprites[driverId]`'s own `sSinIndex@+46(u16)/sDelta@+48/sAmplitude@+50/
sBouncerTarget@+52/sWhich@+54` (struct Sprite stride 68), PLUS the resultant
target sprites' own raw `y2@+38(s16)` via `gBattlerSpriteIds[0]`/
`gHealthboxSpriteIds[0]` directly - byte-identical addressing to turn 13's
own probe, since Onix (battler 0) never leaves the field or re-switches-in
between turn 13 and turn 14 (no fresh switch-in this turn).

Reuses `tools/compare/traces/turn14-fly-miss.json`'s own 110-segment button
script verbatim (already reaches render tick 18956, the settled-tail spot
tick named in ISSUES #34) - only its `"segments"` array is consumed, same
precedent as `dump-turn13-bounce-driver.py` reusing a trace/spec file's own
segments.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn14-bounce-driver.py \
        tools/compare/traces/turn14-fly-miss.json <output.json> \
        <startTick> <endTick>

Quirks (see ROADMAP.md Domain notes): mGBA spews log lines to stdout
(never parsed here - all results go to the output file); the interpreter
segfaults at teardown *after* results are written (exit 139 is benign -
check the output file, not the exit code).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <output.json> <startTick> <endTick>")
SPEC_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])

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

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

SPRITE_SIZE = 68


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_battle_sprites_data_ptr = oracle.symbols["gBattleSpritesDataPtr"]
    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]
    g_sprites = oracle.symbols["gSprites"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        return (
            oracle.read_u8(addr)
            | (oracle.read_u8(addr + 1) << 8)
            | (oracle.read_u8(addr + 2) << 16)
            | (oracle.read_u8(addr + 3) << 24)
        )

    def driver_fields(driver_id: int) -> dict:
        base = g_sprites + driver_id * SPRITE_SIZE
        return {
            "sinIndex": u16(base + 46),
            "delta": u8(base + 48),
            "amplitude": u8(base + 50),
            "bouncerTarget": u8(base + 52),
            "which": u8(base + 54),
        }

    def record(tick: int) -> dict:
        # gBattleSpritesDataPtr -> *ptr -> +4 -> *ptr => healthBoxesData[0]
        battle_sprites_data = u32(g_battle_sprites_data_ptr)
        healthboxes_data0 = u32(battle_sprites_data + 4)
        onix_driver_id = u8(healthboxes_data0 + 3)
        healthbox_driver_id = u8(healthboxes_data0 + 2)

        onix_slot = u8(g_battler_sprite_ids + 0)
        healthbox_slot = u8(g_healthbox_sprite_ids + 0)

        row = {
            "tick": tick,
            "onixSpriteSlot": onix_slot,
            "healthboxMainSpriteSlot": healthbox_slot,
            "onixDriverId": onix_driver_id,
            "healthboxDriverId": healthbox_driver_id,
            "onixY2": s16(g_sprites + onix_slot * SPRITE_SIZE + 38),
            "healthboxMainY2": s16(g_sprites + healthbox_slot * SPRITE_SIZE + 38),
        }
        onix_driver = driver_fields(onix_driver_id)
        healthbox_driver = driver_fields(healthbox_driver_id)
        row["onixSinIndex"] = onix_driver["sinIndex"]
        row["onixDelta"] = onix_driver["delta"]
        row["onixAmplitude"] = onix_driver["amplitude"]
        row["onixBouncerTarget"] = onix_driver["bouncerTarget"]
        row["onixWhich"] = onix_driver["which"]
        row["healthboxSinIndex"] = healthbox_driver["sinIndex"]
        row["healthboxDelta"] = healthbox_driver["delta"]
        row["healthboxAmplitude"] = healthbox_driver["amplitude"]
        row["healthboxBouncerTarget"] = healthbox_driver["bouncerTarget"]
        row["healthboxWhich"] = healthbox_driver["which"]
        return row

    ticks_out = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        ticks_out.append(record(tick))

    for segment in spec["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if START_TICK <= tick <= END_TICK:
                ticks_out.append(record(tick))
            if tick > END_TICK:
                break
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out}, indent=0))


main()
