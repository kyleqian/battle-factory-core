#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ISSUES #97 side-lane instrument (B), §11.2's
own named next instrument #2: which BG layer actually carries the visible
sky/ground art during turn 5's ROCK_SLIDE camera shake, and whether that
differs from turn 6/7's own analogous (bit-exact-passing) windows.

Dumps DISPCNT (0x04000000), all four BGxCNT (0x04000008/0A/0C/0E, priority +
char-base + screen-base fields decoded), all four gBattle_BGn_X/Y shadow
globals (`bin/oracle symbols gBattle_BG{0,1,2,3}_{X,Y}`) AND the real hardware
BGnHOFS/VOFS scroll registers themselves - NOT just BG3 - since
`VBlankCB_Battle` (reference/pokeemerald/src/battle_main.c:2085-2098) copies
ALL FOUR shadow pairs to hardware unconditionally every vblank, so a
turn5-vs-turn6 difference could live in BG0-2's own shadow state (masking
BG3's real, RAM-confirmed -7 write) rather than in BG3 itself. Also dumps the
windowing (WIN0H/V, WIN1H/V, WININ/WINOUT) and blend (BLDCNT/BLDALPHA/BLDY)
registers, since a turn5-specific KO/faint screen effect could mask or tint
the shifted background without touching BG3VOFS at all.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    ../../vendor/mgba-venv/bin/python \
        tools/probe/dump-turn5-resolve-offa-bglayer-census.py <trace.json> <output.json> <startTick> [endTick]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (4, 5):
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> [endTick]")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4]) if len(sys.argv) == 5 else None

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

DISPCNT = 0x04000000
BG0CNT = 0x04000008
BG1CNT = 0x0400000A
BG2CNT = 0x0400000C
BG3CNT = 0x0400000E
# The real hardware scroll registers themselves (not just the C shadow
# globals) - VBlankCB_Battle copies the shadows here every frame, but reading
# the hardware side directly rules out any copy-skip hypothesis outright.
BG_HOFS_VOFS = {
    0: (0x04000010, 0x04000012),
    1: (0x04000014, 0x04000016),
    2: (0x04000018, 0x0400001A),
    3: (0x0400001C, 0x0400001E),
}

# From `bin/oracle symbols gBattle_BG{0,1,2,3}_{X,Y}`.
SHADOW = {
    0: (0x02022E14, 0x02022E16),
    1: (0x02022E18, 0x02022E1A),
    2: (0x02022E1C, 0x02022E1E),
    3: (0x02022E20, 0x02022E22),
}

# Windowing + blend hardware registers - a turn5-specific KO/faint screen
# effect (window mask or blend) would show up here even though BG3VOFS/
# gBattle_BG3_Y themselves are already RAM-confirmed correct.
WIN0H = 0x04000040
WIN1H = 0x04000042
WIN0V = 0x04000044
WIN1V = 0x04000046
WININ = 0x04000048
WINOUT = 0x0400004A
BLDCNT = 0x04000050
BLDALPHA = 0x04000052
BLDY = 0x04000054


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v & 0x8000 else v

    def decode_bgcnt(v: int) -> dict:
        return {
            "priority": v & 0x3,
            "charBase": (v >> 2) & 0x3,
            "mosaic": bool(v & 0x40),
            "colorMode256": bool(v & 0x80),
            "screenBase": (v >> 8) & 0x1F,
            "wrap": bool(v & 0x2000),
            "screenSize": (v >> 14) & 0x3,
        }

    def record(tick: int) -> dict:
        dispcnt = u16(DISPCNT)
        row = {
            "tick": tick,
            "dispcnt": dispcnt,
            "dispcntBgEnable": {n: bool(dispcnt & (1 << (8 + n))) for n in range(4)},
            "dispcntMode": dispcnt & 0x7,
        }
        for n, addr in ((0, BG0CNT), (1, BG1CNT), (2, BG2CNT), (3, BG3CNT)):
            row[f"bg{n}cnt"] = decode_bgcnt(u16(addr))
        for n, (xaddr, yaddr) in SHADOW.items():
            row[f"bg{n}shadowX"] = s16(xaddr)
            row[f"bg{n}shadowY"] = s16(yaddr)
        for n, (hofs, vofs) in BG_HOFS_VOFS.items():
            row[f"bg{n}hwHofs"] = u16(hofs) & 0x1FF
            row[f"bg{n}hwVofs"] = u16(vofs) & 0x1FF
        row["win0h"] = u16(WIN0H)
        row["win1h"] = u16(WIN1H)
        row["win0v"] = u16(WIN0V)
        row["win1v"] = u16(WIN1V)
        row["winin"] = u16(WININ)
        row["winout"] = u16(WINOUT)
        row["bldcnt"] = u16(BLDCNT)
        row["bldalpha"] = u16(BLDALPHA)
        row["bldy"] = u16(BLDY)
        return row

    rows = []
    tick = 0
    if START_TICK <= tick <= (END_TICK if END_TICK is not None else tick):
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if END_TICK is not None and tick > END_TICK:
                continue
            rows.append(record(tick))

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
