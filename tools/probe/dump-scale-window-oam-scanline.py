#!/usr/bin/env python3
"""Defect A's own next-action instrument (ANIMATION_PROGRESS.md's "Defect A
cracked open, not closed" entry): dump the SCALED battler OBJ's real OAM
attr0/attr1 - shape/size/affine-mode bits and its exact screen position, NOT
just the OAM matrix (already RAM-confirmed exact in an earlier rung) - PLUS a
raw whole-frame screen capture at chosen peak-scale ticks, so a per-scanline
sample can be diffed against this engine's own `drawSpriteSheetAffineStretch`
output post-hoc.

Extends `dump-monbg-scale-window.py`'s own `sprite_record` (same addresses,
same struct offsets) with the fields that probe didn't capture: full attr0
(`gSprites[].oam0`), decoded shape/size/affineMode/objMode, and the real OAM
x/y (`attr1 & 0x1FF`, `attr0 & 0xFF`) - the position the hardware renderer
actually uses, as opposed to the `sprite.x`/`sprite.y` struct fields alone.

Struct layout (`reference/pokeemerald/include/gba/types.h:55-72`,
`struct OamData`, verified directly, not assumed):
  attr0 (u16 @ sprite+0x00): y:8, affineMode:2, objMode:2, mosaic:1, bpp:1, shape:2
  attr1 (u16 @ sprite+0x02): x:9, matrixNum:5, size:2

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-python> tools/probe/dump-scale-window-oam-scanline.py \
        <scenario.json> <output.json> <startTick> <endTick> \
        <comma-separated-scanline-ticks> <rgb-out-dir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 7:
    raise SystemExit(
        f"usage: {sys.argv[0]} <scenario.json> <output.json> <startTick> <endTick> "
        "<scanlineTicksCsv> <rgbOutDir>"
    )
SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])
SCANLINE_TICKS = {int(t) for t in sys.argv[5].split(",") if t}
RGB_DIR = Path(sys.argv[6])

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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
GBATTLERSPRITEIDS = 0x020241E4


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    profile = scenario.get("profile", "battle-scene-on")
    bootstrap = ORACLE_DIR / "bootstrap" / (
        "factory.json" if profile == "battle-scene-on" else "factory-battle-scene-off.json"
    )
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, bootstrap)
    request = validate_request(scenario, profile)
    lab = BattleLab(oracle, profile)
    lab.prepare(request)

    oam_matrices = oracle.symbols["gOamMatrices"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        value = u16(addr)
        return value - 0x10000 if value >= 0x8000 else value

    def sprite_record(battler: int) -> dict:
        slot = u8(GBATTLERSPRITEIDS + battler)
        base = GSPRITES + slot * SPRITE_SIZE
        attr0 = u16(base)
        attr1 = u16(base + 2)
        matrix_num = (attr1 >> 9) & 0x1F
        matrix_base = oam_matrices + matrix_num * 8
        return {
            "slot": slot,
            "invisible": bool(u8(base + 0x3E) & 4),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "centerToCornerVecX": u8(base + 0x28) - (0x100 if u8(base + 0x28) >= 0x80 else 0),
            "centerToCornerVecY": u8(base + 0x29) - (0x100 if u8(base + 0x29) >= 0x80 else 0),
            "attr0": attr0,
            "attr1": attr1,
            "oamY": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "mosaic": bool(attr0 & 0x1000),
            "bpp": bool(attr0 & 0x2000),
            "shape": (attr0 >> 14) & 0x3,
            "oamX": attr1 & 0x1FF,
            "matrixNum": matrix_num,
            "size": (attr1 >> 14) & 0x3,
            "matrix": {
                "a": s16(matrix_base),
                "b": s16(matrix_base + 2),
                "c": s16(matrix_base + 4),
                "d": s16(matrix_base + 6),
            },
        }

    def record(tick: int) -> dict:
        return {
            "tick": tick,
            "playerSprite": sprite_record(0),
            "opponentSprite": sprite_record(1),
        }

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    if tick in SCANLINE_TICKS:
        (RGB_DIR / f"{tick:05d}.rgb").write_bytes(oracle.screen_rgb())
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in SCANLINE_TICKS:
                (RGB_DIR / f"{tick:05d}.rgb").write_bytes(oracle.screen_rgb())
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                continue
            rows.append(record(tick))
            if tick >= END_TICK and tick >= max(SCANLINE_TICKS, default=0):
                break
        else:
            continue
        break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks), rgb for ticks {sorted(SCANLINE_TICKS)} in {RGB_DIR}")


main()
