#!/usr/bin/env python3
"""Mid-battle switch ball-fade palette + party-summary tray ground truth
(ISSUES #78 residuals; extends `dump-midbattle-switch-ram.py`).

Replays the committed mechanicLab OFF scenario (BattleLab.prepare +
verbatim segments) and records, per tick in [startTick, endTick]:
  * the full `gPlttBufferFaded` and `gPlttBufferUnfaded` 512-entry u16
    arrays (so the per-frame faded palette rows can be banked verbatim,
    not just re-derived from a coefficient model);
  * the decoded `gPaletteFade` control struct (selectedPalettes, y,
    targetY, blendColor, active, mode, softwareFadeFinishing) for
    attributing each row change to `BeginNormalPaletteFade`;
  * the active `Task_FadeMon_ToBallColor`/`Task_FadeMon_ToNormal`/
    `Task_FadeMon_ToNormal_Step` task (the `LaunchBallFadeMonTask`
    follow-through, `battle_anim_throw.c:2033-2102`) with its data[]; and
  * the party-status-summary tray sprites (bar + six ball icons, matched
    by callback pointer, `battle_interface.c:1450-1668`): per-frame
    x/x2/y plus each ball icon's oam paletteNum/tileNum (the tileNum
    delta pins the alive/status/fainted/empty glyph selected at
    `CreatePartyStatusSummarySprites`).

The two palette arrays per frame are the load-bearing receipt: the
`BlendPalette`/`BeginNormalPaletteFade` coefficient model
(`util.c:264-278`, `palette.c:156-200`, `palette.c:406-490`) can be
checked against them directly.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-python> tools/probe/dump-midbattle-switch-fade-palette.py \
            <scenario.json> <output.json> <startTick> <endTick>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <out.json> <startTick> <endTick>")
SCENARIO_PATH = Path(sys.argv[1])
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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"

GPLTTFADED = 0x02037B14  # gPlttBufferFaded
GPLTTUNFADED = 0x02037714  # gPlttBufferUnfaded
GPALETTEFADE = 0x02037FD4  # gPaletteFade (include/palette.h:35-53)
GTASKS = 0x03005E00
TASK_SIZE = 0x28
NUM_TASKS = 16
GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
GBATTLERSPRITEIDS = 0x020241E4

# nm reference/pokeemerald/pokeemerald.elf
TASK_FADE_MON_TO_BALLCOLOR = 0x08172AB0
TASK_FADE_MON_TO_NORMAL = 0x08172B40
TASK_FADE_MON_TO_NORMAL_STEP = 0x08172B90
FADE_TASK_FUNCS = (TASK_FADE_MON_TO_BALLCOLOR, TASK_FADE_MON_TO_NORMAL, TASK_FADE_MON_TO_NORMAL_STEP)

SPRITECB_STATUSSUMMARYBAR_ENTER = 0x08074078
SPRITECB_STATUSSUMMARYBAR_EXIT = 0x08074090
SPRITECB_STATUSSUMMARYBALLS_ENTER = 0x080740C4
SPRITECB_STATUSSUMMARYBALLS_EXIT = 0x08074158
SPRITECB_STATUSSUMMARYBALLS_ONSWITCHOUT = 0x080741C8
SUMMARY_BAR_CALLBACKS = (SPRITECB_STATUSSUMMARYBAR_ENTER, SPRITECB_STATUSSUMMARYBAR_EXIT)
SUMMARY_BALL_CALLBACKS = (
    SPRITECB_STATUSSUMMARYBALLS_ENTER,
    SPRITECB_STATUSSUMMARYBALLS_EXIT,
    SPRITECB_STATUSSUMMARYBALLS_ONSWITCHOUT,
)

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_OAM_ATTR2_OFF = 0x04
SPRITE_FLAGS_OFF = 0x3E
SPRITE_DATA_OFF = 0x2E


def main() -> None:
    request = validate_request(json.loads(SCENARIO_PATH.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json")
    lab = BattleLab(oracle, request["profile"])
    lab.prepare(request)

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

    def pal_row(base: int, offset: int) -> list:
        return [u16(base + (offset + i) * 2) for i in range(16)]

    def record(tick: int) -> dict:
        # --- gPlttBufferFaded + gPlttBufferUnfaded (full 512) ---
        faded = [u16(GPLTTFADED + i * 2) for i in range(512)]
        unfaded = [u16(GPLTTUNFADED + i * 2) for i in range(512)]

        # --- gPaletteFade decoded ---
        word0 = u32(GPALETTEFADE)          # selectedPalettes (multipurpose1)
        word1 = u32(GPALETTEFADE + 4)      # delayCounter:6 y:5 targetY:5 blendColor:15 active:1
        word2 = u32(GPALETTEFADE + 8)      # multipurpose2:6 yDec:1 ... mode:2 ...
        fade = {
            "selectedPalettes": word0,
            "y": (word1 >> 6) & 0x1F,
            "targetY": (word1 >> 11) & 0x1F,
            "blendColor": (word1 >> 16) & 0x7FFF,
            "active": (word1 >> 31) & 1,
            "mode": (word2 >> 8) & 0x3,
            "softwareFadeFinishing": (word2 >> 17) & 1,
            "objPaletteToggle": (word2 >> 18) & 1,
            "delayCounter": word1 & 0x3F,
            "deltaY": (word2 >> 19) & 0xF,
        }

        # --- LaunchBallFadeMonTask follow-through task ---
        fade_task = None
        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            if not u8(base + 0x04):
                continue
            func = u32(base + 0x00) & ~1
            if func in FADE_TASK_FUNCS:
                fade_task = {
                    "slot": slot,
                    "func": hex(func),
                    "data": [u16(base + 0x08 + i * 2) for i in range(16)],
                }

        # --- party-status-summary tray sprites ---
        summary_bar = None
        summary_balls = []
        for slot in range(64):
            base = GSPRITES + slot * SPRITE_SIZE
            if not (u16(base + SPRITE_FLAGS_OFF) & 0x1):
                continue
            callback = u32(base + SPRITE_CALLBACK_OFF) & ~1
            attr2 = u16(base + SPRITE_OAM_ATTR2_OFF)
            common = {
                "slot": slot,
                "x": s16(base + SPRITE_X_OFF),
                "y": s16(base + SPRITE_Y_OFF),
                "x2": s16(base + SPRITE_X2_OFF),
                "y2": s16(base + SPRITE_Y2_OFF),
                "paletteNum": (attr2 >> 12) & 0xF,
                "tileNum": (attr2 & 0x3FF),
                "data": [s16(base + SPRITE_DATA_OFF + i * 2) for i in range(6)],
            }
            if callback in SUMMARY_BAR_CALLBACKS:
                summary_bar = common
            elif callback in SUMMARY_BALL_CALLBACKS:
                summary_balls.append(common)

        # --- player battler sprite (palette row + visibility) ---
        mon_slot = u8(GBATTLERSPRITEIDS + 0)
        mon_base = GSPRITES + mon_slot * SPRITE_SIZE
        mon_attr2 = u16(mon_base + SPRITE_OAM_ATTR2_OFF)
        mon = {
            "slot": mon_slot,
            "x": s16(mon_base + SPRITE_X_OFF),
            "y": s16(mon_base + SPRITE_Y_OFF),
            "x2": s16(mon_base + SPRITE_X2_OFF),
            "y2": s16(mon_base + SPRITE_Y2_OFF),
            "paletteNum": (mon_attr2 >> 12) & 0xF,
            "callback": hex(u32(mon_base + SPRITE_CALLBACK_OFF) & ~1),
        }

        return {
            "tick": tick,
            "fade": fade,
            "fadeTask": fade_task,
            "faded": faded,
            "unfaded": unfaded,
            "mon": mon,
            "summaryBar": summary_bar,
            "summaryBalls": summary_balls,
        }

    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                break
            rows.append(record(tick))
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
