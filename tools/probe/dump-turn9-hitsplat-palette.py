#!/usr/bin/env python3
"""S7 slice R rung PROBE (docs/turn9-shake-notes.md's last dated section,
"third session... salvaged"): the ONE named instrument left for the
hitsplat's tip/edge residual after coefficient brute-force (every (eva,evb)
pair, 8-bit AND 5-bit domains) and floor-vs-round sampling were both
REFUTED (`diag-turn9-hitsplat-blendfit.ts`/`diag-turn9-hitsplat-tips.ts`) -
a direct RAM dump of `gPlttBufferFaded` vs `gPlttBufferUnfaded` for the
hitsplat's own OBJ palette bank, to test the named hypothesis that oracle
tip colors sit in a saturated (255,240,152)-family because of a
palette-space tint (a `BlendPalette`-style fade written into
`gPlttBufferFaded` only) rather than any per-pixel blend variant.

Identifies the hitsplat sprite dynamically by its `affineAnims` field
(struct Sprite +0x10) against `sAffineAnims_HitSplat`'s own real (rodata, no
thumb bit) address - the SAME identifying field
`dump-endeavor-hitsplat-shake.py`'s own docstring already established (its
own callback is reassigned to `RunStoredCallbackWhenAffineAnimEnds` on the
sprite's very first tick, so `callback`-based identification finds nothing;
`affineAnims` is stable for the sprite's whole life). That script's own
already-committed run against turn 9's own trace found `matrixA=matrixD=303`
via this exact method, cross-confirming it resolves turn 9's hitsplat
correctly too - reused as-is here, not re-derived. Falls back to the
already-RAM-confirmed constant bank 7 (`battleScene.ts:7708-7710`'s own
comment, "RAM-confirmed the palette bank itself (PALRAM_OBJ bank 7)") on
ticks where the sprite isn't alive yet/anymore, so the palette table has no
gaps across the +/-1 pad ticks.

OBJ palette N occupies `gPlttBufferFaded`/`gPlttBufferUnfaded` 16-bit-color
index `0x100 + N*16` (BG palettes are the first 0x100 = 16 banks x16
colors) - `dump-endeavor-squish-blend-ext.py`'s own already-validated
addressing, reused unmodified.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn9-hitsplat-palette.py <trace.json> \
        <output.json> <startTick> <endTick>

PAPERCUT (per docs/turn9-shake-notes.md's own methodology note): this probe
may exit 139 (segfault on interpreter teardown) AFTER writing valid,
complete JSON - validate `len(ticks)` against the expected tick count before
assuming the run failed.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>")
TRACE_PATH = Path(sys.argv[1])
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

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
MAX_SPRITES = 64

GPLTTBUFFERFADED = 0x02037B14
GPLTTBUFFERUNFADED = 0x02037714

SPRITE_OAM_ATTR2_OFF = 0x04
SPRITE_AFFINE_ANIMS_OFF = 0x10
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0

# `arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf` -
# rodata, no thumb bit (same constant `dump-endeavor-hitsplat-shake.py` uses).
S_AFFINE_ANIMS_HIT_SPLAT = 0x08597348

# RAM-confirmed fallback (battleScene.ts:7708-7710's own comment) for ticks
# where the sprite isn't alive to identify dynamically.
FALLBACK_PALETTE_NUM = 7


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def bgr555_to_rgb8(v: int) -> list:
        r5 = v & 0x1F
        g5 = (v >> 5) & 0x1F
        b5 = (v >> 10) & 0x1F
        return [(r5 << 3) | (r5 >> 2), (g5 << 3) | (g5 >> 2), (b5 << 3) | (b5 >> 2)]

    def find_hitsplat_palette_num() -> int | None:
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            if not (flags & 1):
                continue
            affine_anims = oracle.read_u32(base + SPRITE_AFFINE_ANIMS_OFF)
            if affine_anims != S_AFFINE_ANIMS_HIT_SPLAT:
                continue
            attr2 = read_u16(base + SPRITE_OAM_ATTR2_OFF)
            return (attr2 >> 12) & 0xF
        return None

    def record(tick: int) -> dict:
        found_palette_num = find_hitsplat_palette_num()
        palette_num = found_palette_num if found_palette_num is not None else FALLBACK_PALETTE_NUM

        pal_base_faded = GPLTTBUFFERFADED + (0x100 + palette_num * 16) * 2
        pal_base_unfaded = GPLTTBUFFERUNFADED + (0x100 + palette_num * 16) * 2

        faded_raw = [read_u16(pal_base_faded + 2 * i) for i in range(16)]
        unfaded_raw = [read_u16(pal_base_unfaded + 2 * i) for i in range(16)]
        faded_rgb = [bgr555_to_rgb8(v) for v in faded_raw]
        unfaded_rgb = [bgr555_to_rgb8(v) for v in unfaded_raw]
        diff_indices = [i for i in range(16) if faded_raw[i] != unfaded_raw[i]]

        return {
            "tick": tick,
            "hitsplatSpriteFound": found_palette_num is not None,
            "paletteNum": palette_num,
            "fadedRaw": faded_raw,
            "unfadedRaw": unfaded_raw,
            "fadedRgb": faded_rgb,
            "unfadedRgb": unfaded_rgb,
            "diffIndices": diff_indices,
        }

    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                continue
            rows.append(record(tick))
            if tick >= END_TICK:
                break
        else:
            continue
        break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
