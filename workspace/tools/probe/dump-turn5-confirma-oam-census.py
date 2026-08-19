#!/usr/bin/env python3
"""ISSUES #97 side-lane instrument (fifth), the full-OAM census `docs/turn5-
single-frame-residuals-diagnosis.md` §5's own "Next probe" names for
`turn5-confirm-off-a`'s two disjoint mismatch regions at ticks 5959-5961
(x=44-99, the Onix-sprite silhouette; x=127-229, a separate content
difference §5.4 left uncharacterized). Adapted from the bootstrap-corrected
`dump-turn5-resolve-offa-oam-bg3rows-census.py` template (same raw-hardware
OAM read at 0x07000000, all 128 slots, decoding attr0/1/2 directly instead
of the app-level `gSprites[]` struct - hardware OAM x/y are already the
sprite's on-screen top-left corner, so no `centerToCornerVec` reconstruction
is needed the way `Sprite.x/x2` software-side census probes require, per
`docs/turn5-single-frame-residuals-diagnosis.md` §8.3's own correction).
Drops the BG3-tilemap half of the template: this session's source read
(`battleMenu.ts`'s `menuIdleBounce`/`commandMenuBounceY2` doc, and the two
`menu-idle-{onix,healthbox}-bounce.json` two-state pixel assets'  own
`x/y/width/height`) already independently pins both mismatch regions as
pre-baked SPRITE-silhouette overlay patches (Onix's own battler sprite and
Onix's own healthbox main sprite - `DoBounceEffect(gActiveBattler, ...)`
only ever bounces the player side), not BG-scroll content - so no BG
register read is needed; this probe's job is to cross-confirm that
source-level read against real hardware OAM slot positions/shapes.

Samples RAM ticks 5958-5962 (the live pre-freeze window plus one tick each
side) against `tools/compare/traces/turn5-confirm-off-a.json` directly.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-confirma-oam-census.py <fresh-output.json> \\
      [comma,separated,ticks]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 3):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [comma,separated,ticks]")

OUTPUT_PATH = Path(sys.argv[1])
DEFAULT_TICKS = {5958, 5959, 5960, 5961, 5962}
TARGET_TICKS = set(int(x) for x in sys.argv[2].split(",")) if len(sys.argv) == 3 else DEFAULT_TICKS
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

OAM_BASE = 0x07000000
OAM_ENTRY_BYTES = 8
OAM_ENTRY_COUNT = 128

# GBA OAM shape(2 bits)/size(2 bits) -> (widthPx, heightPx). shape 0=square,
# 1=wide(horizontal), 2=tall(vertical), 3=prohibited.
SHAPE_SIZE_DIMS = {
    (0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
    (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
    (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64),
}

# The two mismatch bboxes this probe cross-checks (docs/turn5-single-frame-
# residuals-diagnosis.md §5.4): region (i) x=44-99, region (ii) x=127-229,
# both y=49-110 in the combined bbox.
REGION_I_X = (44, 99)
REGION_II_X = (127, 229)


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    segments = trace["segments"]
    oracle_profile = trace.get("oracleProfile", "battle-scene-on")
    assert oracle_profile == "battle-scene-off", oracle_profile

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def record_oam() -> dict:
        entries = []
        for slot in range(OAM_ENTRY_COUNT):
            base = OAM_BASE + slot * OAM_ENTRY_BYTES
            a0 = u16(base)
            a1 = u16(base + 2)
            a2 = u16(base + 4)

            obj_mode = (a0 >> 8) & 0x3
            if obj_mode == 2:
                continue  # hidden/disabled - not displayed by hardware

            y = a0 & 0xFF
            shape = (a0 >> 14) & 0x3
            x = a1 & 0x1FF
            size = (a1 >> 14) & 0x3
            tile_num = a2 & 0x3FF
            palette_num = (a2 >> 12) & 0xF

            dims = SHAPE_SIZE_DIMS.get((shape, size))
            if dims is None:
                continue  # prohibited shape/size combo
            width, height = dims

            cols_covered = {(x + dx) % 512 for dx in range(width)}
            on_screen_cols = sorted(c for c in cols_covered if c < 240)
            if not on_screen_cols:
                continue
            col_lo, col_hi = on_screen_cols[0], on_screen_cols[-1]

            overlaps_i = col_lo <= REGION_I_X[1] and col_hi >= REGION_I_X[0]
            overlaps_ii = col_lo <= REGION_II_X[1] and col_hi >= REGION_II_X[0]

            entries.append({
                "slot": slot,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "shape": shape,
                "size": size,
                "tileNum": tile_num,
                "paletteNum": palette_num,
                "onScreenColRange": [col_lo, col_hi],
                "overlapsRegionI": overlaps_i,
                "overlapsRegionII": overlaps_ii,
            })
        return {"entries": entries}

    def record(tick: int) -> dict:
        onix_slot = u8(g_battler_sprite_ids + 0)
        healthbox_slot = u8(g_healthbox_sprite_ids + 0)
        return {
            "tick": tick,
            "onixBattlerSpriteSlot": onix_slot,
            "onixHealthboxMainSpriteSlot": healthbox_slot,
            "oam": record_oam(),
        }

    ticks_out = []
    tick = 0
    max_tick = max(TARGET_TICKS)
    if tick in TARGET_TICKS:
        ticks_out.append(record(tick))

    for segment in segments:
        if tick > max_tick:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick > max_tick:
                break
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                ticks_out.append(record(tick))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": oracle_profile,
        "ticks": ticks_out,
    }))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
