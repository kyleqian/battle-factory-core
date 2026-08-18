#!/usr/bin/env python3
"""ISSUES #97 sub-entry J's own Class B "next instrument" (docs/turn5-resolve-
ab-pools-diagnosis.md §10's addendum: the 6248-6365 static-background
residual at render ticks 6259/6260/6263/6264/6267/6268, where `rockSlideBg3Y`
is RAM-confirmed `-7`): a full `gSprites[]` OAM census at those exact ticks
(plus neighbors), to rule the falling ROCK_SLIDE rock props (`ROCK_SLIDE_
ROCK_TABLE`/`gFallingRockSpriteTemplate`, `battleMenu.ts`) in or out as a
contributor to the huge (~30%-of-frame) diff there.

Result this session: NO rock-shaped/rock-positioned sprite is ever active at
any sampled tick - every `inUse` slot maps to an already-known, stationary
battler/icon-bar/UI sprite (positions stable across the whole window, only
`y2` bounce-jittering by +-1 and the known blink-toggle on Grovyle's own
slot). This independently reconfirms, for turn 5 specifically, the same
"rock-prop animation absent under Scene-OFF" finding turn 1's own dossier
already established via `HITMARKER_NO_ANIMATIONS` - ruling OUT missing rock
sprites as the residual's cause, narrowing it to the static-BG tilemap/scroll
mechanism itself (see the diagnosis doc's own dated addendum for the
follow-on oracle-vs-oracle row-band analysis this census fed into).

Same direct-`EmeraldOracle`/`factory-battle-scene-off.json` replay pattern
`dump-turn5-resolve-grovyle-side-driver.py` established, driven by
`turn5-resolve-off-a.json`'s own 76-segment button script.

Samples the fixed tick set {6248, 6255, 6256, 6258-6264, 6267, 6268} by
default (the residual's own onset plus every flagged huge-diff tick and
enough neighbors to see stability) - override with a comma-separated list.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-offa-sprite-census.py <fresh-output.json> [t1,t2,...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 3):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [comma,separated,ticks]")

OUTPUT_PATH = Path(sys.argv[1])
DEFAULT_TICKS = {6248, 6255, 6256, 6258, 6259, 6260, 6261, 6262, 6263, 6264, 6267, 6268}
WINDOW_TICKS = set(int(x) for x in sys.argv[2].split(",")) if len(sys.argv) == 3 else DEFAULT_TICKS
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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-resolve-off-a.json"

# Sprite field offsets (include/sprite.h) - same layout dump-midbattle-switch-oam.py
# and dump-turn5-resolve-offc-tail-probe.py already established for this ROM build.
SPRITE_SIZE = 0x44
SPRITE_OAM_OFF = 0x00
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_FLAGS_OFF = 0x3E  # bit0 inUse, bit2 invisible


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        b = [u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def record(tick: int) -> list:
        out = []
        for slot in range(64):
            base = g_sprites + slot * SPRITE_SIZE
            flags = u16(base + SPRITE_FLAGS_OFF)
            if not (flags & 0x1):
                continue
            a2 = u16(base + SPRITE_OAM_OFF + 4)
            out.append({
                "slot": slot,
                "invisible": bool(flags & 0x4),
                "x": s16(base + SPRITE_X_OFF),
                "y": s16(base + SPRITE_Y_OFF),
                "x2": s16(base + SPRITE_X2_OFF),
                "y2": s16(base + SPRITE_Y2_OFF),
                "tileNum": a2 & 0x3FF,
                "paletteNum": (a2 >> 12) & 0xF,
                "callback": hex(u32(base + SPRITE_CALLBACK_OFF) & ~1),
            })
        return out

    ticks_out: dict[str, list] = {}
    tick = 0
    if tick in WINDOW_TICKS:
        ticks_out[str(tick)] = record(tick)
    maxtick = max(WINDOW_TICKS)

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in WINDOW_TICKS:
                ticks_out[str(tick)] = record(tick)
        if tick > maxtick:
            break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "ticks": ticks_out,
    }, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
