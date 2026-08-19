#!/usr/bin/env python3
"""ISSUES #97 remainder (docs/turn5-single-frame-residuals-diagnosis.md):
RAM-probes the real `DoBounceEffect` driver state across
`turn5-confirm-off-a`'s own class-3 confirm-wait residual window
(5959-5968, `docs/turn5-confirm-pools-diagnosis.md` §3), against the
CURRENT Battle Scene OFF oracle (127.0.0.1:8014's bootstrap,
`factory-battle-scene-off.json`). Adapted from
`dump-turn5-6-reopen-bounce-driver.py`'s own addressing scheme
(`gBattleSpritesDataPtr` -> deref -> `healthBoxesData[battler=0]` ->
`{battlerBounceSpriteId@+3, healthboxBounceSpriteId@+2}` ->
`gSprites[driverId]`'s own `sSinIndex@+46(u16)/sDelta@+48/sAmplitude@+50/
sBouncerTarget@+52/sWhich@+54`, PLUS the resultant sprites' own
`y2@+38(s16)` via `gBattlerSpriteIds[0]`/`gHealthboxSpriteIds[0]`
directly), re-pointed at `turn5-confirm-off-a.json` (byte-identical
76-segment script to `turn5-action-off.json`, sha256-confirmed) with the
window widened to cover the confirm-wait tail this trace's own capture
range actually reaches (5958-6089) that `turn5-action-off.json`'s own
window (ending 5960) does not.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-6-reopen-bounce-driver.py <fresh-output.json>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")

OUTPUT_PATH = Path(sys.argv[1])
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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-confirm-off-a.json"

SPRITE_SIZE = 68
# turn5-action-off.json's own 32-frame capture window (first mismatch 5927).
WINDOW_A = (5955, 5970)
# turn6-reopen-off.json's own 46-frame capture window (first mismatch 7305).
WINDOW_B = (999999, 999998)


def in_windows(tick: int) -> bool:
    return (WINDOW_A[0] <= tick <= WINDOW_A[1]) or (WINDOW_B[0] <= tick <= WINDOW_B[1])


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
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
    if in_windows(tick):
        ticks_out.append(record(tick))

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if in_windows(tick):
                ticks_out.append(record(tick))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "windowA": WINDOW_A,
        "windowB": WINDOW_B,
        "ticks": ticks_out,
    }, indent=0))


main()
