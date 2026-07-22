#!/usr/bin/env python3
"""Mission A2 (worktree PROBE follow-up, docs/aerial-ace-notes.md): RAM-read
the ACTUAL final OAM buffer (`gMain.oamBuffer[128]`, `include/main.h:34`,
NOT `gSprites[]`) to settle which of the AERIAL_ACE overlap's two sprites
(real Pidgeotto, slot 5; the `AnimTask_TraceMonBlended` clone, slot 7)
lands at the LOWER final OAM index and therefore wins same-priority ties on
real hardware (`sprite.c` `SortSprites`/`AddSpritesToOamBuffer`: sSpriteOrder
is walked in ascending-priority order and assigned strictly increasing OAM
indices, so array position IN gMain.oamBuffer IS the hardware tie-break —
no need to re-derive `subpriority`/`sSpriteOrder` history separately).

gMain.oamBuffer is the exact buffer CpuCopy32'd to real hardware OAM
(0x07000000) every vblank (`sprite.c:643`) — reading it directly from
IWRAM is equivalent to reading hardware OAM and avoids any DMA-timing
ambiguity about which frame's copy is currently live at 0x07000000.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-aerialace-oam.py <trace.json> <output.json> <startTick> <endTick>
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

# `bin/oracle symbols gMain gSprites` — gMain lives in IWRAM (not
# EWRAM_DATA-tagged in main.h), gSprites in EWRAM.
GMAIN = 0x030022C0
OAM_BUFFER = GMAIN + 0x38  # include/main.h:34, struct OamData oamBuffer[128]
OAM_ENTRY_SIZE = 8
OAM_ENTRIES = 128

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
SLOTS_OF_INTEREST = [4, 5, 6, 7]  # real Pidgeotto (5) + the two trace clones (4/7) + Onix (6) for context

BLDCNT = 0x04000050
BLDALPHA = 0x04000052


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def decode_oam(attr0: int, attr1: int, attr2: int) -> dict:
        return {
            "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "shape": (attr0 >> 14) & 0x3,
            "x": attr1 & 0x1FF,
            "matrixNum": (attr1 >> 9) & 0x1F,
            "size": (attr1 >> 14) & 0x3,
            "tileNum": attr2 & 0x3FF,
            "priority": (attr2 >> 10) & 0x3,
            "paletteNum": (attr2 >> 12) & 0xF,
        }

    def record(tick: int) -> dict:
        row: dict = {"tick": tick}

        # Final hardware-equivalent OAM buffer: every entry, in order.
        oam_entries = []
        for i in range(OAM_ENTRIES):
            base = OAM_BUFFER + i * OAM_ENTRY_SIZE
            attr0 = read_u16(base + 0)
            attr1 = read_u16(base + 2)
            attr2 = read_u16(base + 4)
            oam_entries.append(decode_oam(attr0, attr1, attr2))
        row["oamBuffer"] = oam_entries

        # gSprites[slot].oam (offset 0x00) for the slots of interest — the
        # SAME struct OamData, pre-copy, so we can match by (y,x,tileNum,
        # paletteNum) against the oamBuffer entries above and also read
        # subpriority (sprite.h:243, offset 0x43, not part of hardware OAM)
        # for context.
        sprites = {}
        for slot in SLOTS_OF_INTEREST:
            base = GSPRITES + slot * SPRITE_SIZE
            attr0 = read_u16(base + 0x00)
            attr1 = read_u16(base + 0x02)
            attr2 = read_u16(base + 0x04)
            flags = read_u16(base + 0x3E)
            oam = decode_oam(attr0, attr1, attr2)
            oam["inUse"] = bool(flags & 0x1)
            oam["invisible"] = bool(flags & 0x4)
            oam["subpriority"] = oracle.read_u8(base + 0x43)
            sprites[str(slot)] = oam
        row["sprites"] = sprites

        row["bldcnt"] = read_u16(BLDCNT)
        row["bldalpha"] = read_u16(BLDALPHA)
        return row

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
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
