#!/usr/bin/env python3
"""ISSUES #97 remainder (docs/turn5-resolve-offc-tail-diagnosis.md): RAM
ground truth for `turn5-resolve-off-c`'s trailing 47-frame mismatch
(ticks 6763-6809), instrumenting the two stacked mechanisms
`docs/turn5-family-class3-diagnosis.md` §3e/§7 named but did not trace:

  (i) PIDGEOTTO's status box (`gHealthboxSpriteIds[1]`) OAM visibility/
      slide position, to pin the real onset tick against the app's own
      `turn5PidgeottoHealthboxSlideDx` gate
      (`TURN5_PIDGEOTTO_SETTLE_TICK + 1 = 6829`, `battleScene.ts:11148`);
  (ii) the background palette-cycle/blend state during PIDGEOTTO's pink
       send-out flash (`gPlttBufferFaded`/`gPlttBufferUnfaded`, all 32
       rows, plus the decoded `gPaletteFade` control struct), to
       distinguish a phase-offset blend from a genuinely different
       per-row pattern.

Same direct-`EmeraldOracle`/`factory-battle-scene-off.json` replay
pattern `dump-turn5-resolve-grovyle-side-driver.py` established (same
76-segment button script, byte-identical across all six confirm/
resolve-off traces plus `turn5-reset-off.json`, sha256-confirmed). Also
carries battler1 (PIDGEOTTO)'s own mon-sprite OAM/position and the
`gDisplayedStringBattle` decode forward from that script, for a single
self-contained receipt covering both mechanisms plus the already-
established name-plate-text tick (6762) as a cross-check.

Samples every tick in [6720, 6815] by default (covers the ball handoff
at 6727 through 6 ticks past the resolve-off-c window's own end at
6809) - override with two extra argv ticks.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-offc-tail-probe.py <fresh-output.json> [startTick endTick]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [startTick endTick]")

OUTPUT_PATH = Path(sys.argv[1])
OVERRIDE_WINDOW = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) == 4 else None
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

WINDOW = OVERRIDE_WINDOW if OVERRIDE_WINDOW is not None else (6720, 6815)
BATTLEMON_STRUCT_SIZE = 0x58
DISPLAYED_STRING_BYTES = 64

# Sprite field offsets (include/sprite.h) - same layout
# dump-midbattle-switch-oam.py already pinned for this ROM build.
SPRITE_SIZE = 0x44
SPRITE_OAM_OFF = 0x00       # attr0/1/2, u16 each
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_FLAGS_OFF = 0x3E     # bit0 inUse, bit2 invisible

# B_WIN_MSG's sTextPrinters[0] (compile-time EWRAM_DATA link address, same
# ROM build as dump-win-terminal-swap-textprinter.py's own pin).
STP0 = 0x020201B0
OFF_ACTIVE = 0x1B
OFF_STATE = 0x1C
OFF_DELAY_COUNTER = 0x1E


def decode_displayed(raw: list) -> str:
    chars: list = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "'", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\n")
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    gbm = oracle.symbols["gBattleMons"]
    displayed_string_addr = oracle.symbols["gDisplayedStringBattle"]
    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]
    g_sprites = oracle.symbols["gSprites"]
    g_pltt_faded = oracle.symbols["gPlttBufferFaded"]
    g_pltt_unfaded = oracle.symbols["gPlttBufferUnfaded"]
    g_palette_fade = oracle.symbols["gPaletteFade"]

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

    def read_battler(idx: int) -> dict:
        base = gbm + idx * BATTLEMON_STRUCT_SIZE
        return {
            "species": u16(base + 0x00),
            "hp": u16(base + 0x28),
            "maxHP": u16(base + 0x2C),
            "status1": u8(base + 0x4C),
        }

    def decode_attr0(attr0: int) -> dict:
        return {
            "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "shape": (attr0 >> 14) & 0x3,
        }

    def decode_attr1(attr1: int) -> dict:
        return {"x": attr1 & 0x1FF, "matrixNum": (attr1 >> 9) & 0x1F, "size": (attr1 >> 14) & 0x3}

    def decode_attr2(attr2: int) -> dict:
        return {"tileNum": attr2 & 0x3FF, "priority": (attr2 >> 10) & 0x3, "paletteNum": (attr2 >> 12) & 0xF}

    def sprite_entry(slot: int) -> dict | None:
        if slot >= 64:
            return None
        base = g_sprites + slot * SPRITE_SIZE
        flags = u16(base + SPRITE_FLAGS_OFF)
        a0 = u16(base + SPRITE_OAM_OFF)
        a1 = u16(base + SPRITE_OAM_OFF + 2)
        a2 = u16(base + SPRITE_OAM_OFF + 4)
        return {
            "slot": slot,
            "inUse": bool(flags & 0x1),
            "invisible": bool(flags & 0x4),
            **decode_attr0(a0),
            **decode_attr1(a1),
            **decode_attr2(a2),
            "x": s16(base + SPRITE_X_OFF),
            "y": s16(base + SPRITE_Y_OFF),
            "x2": s16(base + SPRITE_X2_OFF),
            "y2": s16(base + SPRITE_Y2_OFF),
            "callback": hex(u32(base + SPRITE_CALLBACK_OFF) & ~1),
        }

    def text_printer_state() -> dict:
        return {
            "active": u8(STP0 + OFF_ACTIVE),
            "state": u8(STP0 + OFF_STATE),
            "delayCounter": u8(STP0 + OFF_DELAY_COUNTER),
        }

    def pal_rows(base: int) -> list:
        return [u16(base + i * 2) for i in range(512)]

    def palette_fade() -> dict:
        word0 = u32(g_palette_fade)
        word1 = u32(g_palette_fade + 4)
        word2 = u32(g_palette_fade + 8)
        return {
            "selectedPalettes": word0,
            "y": (word1 >> 6) & 0x1F,
            "targetY": (word1 >> 11) & 0x1F,
            "blendColor": (word1 >> 16) & 0x7FFF,
            "active": (word1 >> 31) & 1,
            "mode": (word2 >> 8) & 0x3,
            "softwareFadeFinishing": (word2 >> 17) & 1,
            "deltaY": (word2 >> 19) & 0xF,
        }

    def record(tick: int) -> dict:
        raw = [u8(displayed_string_addr + i) for i in range(DISPLAYED_STRING_BYTES)]
        healthbox_slot1 = u8(g_healthbox_sprite_ids + 1)
        battler_slot1 = u8(g_battler_sprite_ids + 1)
        return {
            "tick": tick,
            "battler1_foe": read_battler(1),
            "healthboxSpriteId1": healthbox_slot1,
            "healthboxSprite1": sprite_entry(healthbox_slot1),
            "battlerSpriteId1": battler_slot1,
            "battlerSprite1": sprite_entry(battler_slot1),
            "textPrinter0": text_printer_state(),
            "displayedString": decode_displayed(raw),
            "paletteFade": palette_fade(),
            "plttFaded": pal_rows(g_pltt_faded),
            "plttUnfaded": pal_rows(g_pltt_unfaded),
        }

    ticks_out = []
    tick = 0
    if WINDOW[0] <= tick <= WINDOW[1]:
        ticks_out.append(record(tick))

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if WINDOW[0] <= tick <= WINDOW[1]:
                ticks_out.append(record(tick))
        if tick > WINDOW[1]:
            break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "window": WINDOW,
        "ticks": ticks_out,
    }, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
