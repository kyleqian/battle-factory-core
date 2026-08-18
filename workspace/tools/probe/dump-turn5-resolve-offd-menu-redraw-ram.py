#!/usr/bin/env python3
"""ISSUES #97 remainder residual (B), the 6989-7005 menu-chrome spike
(`docs/turn5-confirmb-resolved-residuals.md` §6.3/§8.3): the named RAM-probe
instrument, run for the first time this session.

§6.3's own split-region RGB sampling (unchanged, not re-derived here) found
the app's `drawTurn5SitrusSettledMenuChrome` blits the action-menu
button-grid as a single uniform bitmap at `TURN5_OFF_SITRUS_MENU_REDRAW_
TICK=6991`, 4 ticks EARLY relative to real hardware's own redraw of that
same region. Source reading (`reference/pokeemerald/src/battle_controller_
player.c:2565-2589`) names the real mechanism directly: `PlayerHandle
ChooseAction` queues the button-grid text into `B_WIN_ACTION_MENU` and sets
`gBattlerControllerFuncs[gActiveBattler] = HandleChooseActionAfterDma3`;
that state polls `IsDma3ManagerBusyWithBgCopy()` every tick and, only once
the async DMA3 tilemap copy finishes, sets `gBattle_BG0_Y = DISPLAY_HEIGHT`
(160) - a Y-SCROLL SNAP that reveals the button-grid region, not a redraw of
its pixels. `gBattle_BG0_Y` is 0 while the pre-menu message-box content is
showing and 160 once the grid is revealed (`PlayerHandlePrintString`/the
other five `gBattle_BG0_X/_Y=0` call sites elsewhere in the same file reset
it back to 0 whenever a new message window opens) - this probe reads BOTH
`gBattle_BG0_X`/`gBattle_BG0_Y` every tick across the window and reports the
exact render tick of the 0->160 transition, which IS the real hardware's
button-grid reveal tick this residual's own next instrument asked for.

Same direct-`EmeraldOracle`/`factory-battle-scene-off.json` replay pattern
`dump-turn5-resolve-offd-onixhp-ram.py`/`dump-turn5-resolve-offc-tail-
probe.py` already established for this exact trace family.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-turn5-resolve-offd-menu-redraw-ram.py <output.json> [startTick endTick]

Defaults to [6980, 7010] (brackets the doc's own 6989-7005 span with margin
on both sides).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [startTick endTick]")

OUTPUT_PATH = Path(sys.argv[1])
WINDOW = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) == 4 else (6980, 7010)
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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-resolve-off-d.json"


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    if trace.get("oracleProfile") != "battle-scene-off":
        raise ValueError(f"{TRACE_PATH} is not a battle-scene-off trace")
    segments = trace["segments"]

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    bg0_x_addr = oracle.symbols["gBattle_BG0_X"]
    bg0_y_addr = oracle.symbols["gBattle_BG0_Y"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def record(tick: int) -> dict:
        return {"tick": tick, "bg0X": s16(bg0_x_addr), "bg0Y": s16(bg0_y_addr)}

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
        "bg0XAddr": hex(bg0_x_addr),
        "bg0YAddr": hex(bg0_y_addr),
        "ticks": ticks_out,
    }, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
