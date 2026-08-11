#!/usr/bin/env python3
"""MOVE_GROWTH residual bisection (this session): rule the IVYSAUR-attacker
"salt-and-pepper" framebuffer mismatch (ANIMATION_PROGRESS.md) in or out of
the two suspected classes - a species idle-anim rest offset, or an
asset/palette decode difference - by reading IVYSAUR's own battler sprite
OAM (`x2`/`y2`, tileNum, paletteNum) plus the FULL VRAM tile bytes and OBJ
palette row (faded + unfaded) directly, at both a clean pre-move tick and
window ticks.

Result (both orientations): `x2`/`y2` are 0 at every probed tick (no rest
offset - matches `speciesIdleAnim.ts`'s own source-derived finding that
IVYSAUR's front/back idle families both zero out on completion, unlike
ONIX's `RAPID_H_HOPS`); VRAM tile bytes and the 16-color OBJ palette
(faded == unfaded, i.e. no blend active at these ticks) are BYTE-IDENTICAL
to `src/assets/gen/battle-back-sprites.json`/`battle-opponent-front-
sprites.json`'s own IVYSAUR entries at every probed tick, including window
ticks - ruling out an extraction/decode bug too. The actual cause (see
`sceneOnGrowthView`'s own doc, `src/animation/sceneOnPresentation.ts`) was a
captured-framebuffer display lag relative to the live OAM matrix write, not
anything this probe's own instruments (VRAM/palette/x2/y2) could see -
those are all correct at every tick; the mismatch is a rendering-pipeline
timing offset between "matrix written" and "matrix painted to the
captured frame".

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-growth-ivysaur-vram.py \
        <scenario.json> <output.json> <attackerBattler> <tick1> [<tick2> ...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
ATTACKER_BATTLER = int(sys.argv[3])
TICKS = sorted(int(t) for t in sys.argv[4:])

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

OBJ_VRAM0 = 0x06010000
TILE_BYTES_4BPP = 32
TILE_COUNT = 64  # 64x64 sprite, 4bpp -> 8x8 tiles

GPLTTBUFFERFADED = 0x02037B14
GPLTTBUFFERUNFADED = 0x02037714


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

    def read_u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def record(tick: int) -> dict:
        slot = oracle.read_u8(GBATTLERSPRITEIDS + ATTACKER_BATTLER)
        base = GSPRITES + slot * SPRITE_SIZE
        attr0 = read_u16(base + 0x00)
        attr1 = read_u16(base + 0x02)
        attr2 = read_u16(base + 0x04)
        tile_num = attr2 & 0x3FF
        palette_num = (attr2 >> 12) & 0xF
        affine_mode = (attr0 >> 8) & 0x3
        shape = (attr0 >> 14) & 0x3
        size = (attr1 >> 14) & 0x3
        x2 = read_u16(base + 0x24)
        y2 = read_u16(base + 0x26)
        vram_base = OBJ_VRAM0 + tile_num * TILE_BYTES_4BPP
        vram_bytes = bytes(oracle.read_u8(vram_base + i) for i in range(TILE_COUNT * TILE_BYTES_4BPP))
        pal_faded_base = GPLTTBUFFERFADED + (0x100 + palette_num * 16) * 2
        pal_unfaded_base = GPLTTBUFFERUNFADED + (0x100 + palette_num * 16) * 2
        pal_faded = [read_u16(pal_faded_base + 2 * i) for i in range(16)]
        pal_unfaded = [read_u16(pal_unfaded_base + 2 * i) for i in range(16)]
        return {
            "tick": tick,
            "slot": int(slot),
            "tileNum": tile_num,
            "paletteNum": palette_num,
            "affineMode": affine_mode,
            "shape": shape,
            "size": size,
            "x2": x2,
            "y2": y2,
            "vramHex": vram_bytes.hex(),
            "palFaded": pal_faded,
            "palUnfaded": pal_unfaded,
        }

    rows = []
    tick = 0
    remaining = list(TICKS)
    if remaining and remaining[0] == 0:
        rows.append(record(0))
        remaining.pop(0)
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if remaining and tick == remaining[0]:
                rows.append(record(tick))
                remaining.pop(0)
            if not remaining:
                break
        if not remaining:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
