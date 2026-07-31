#!/usr/bin/env python3
"""Side-lane bounded step (idle-bounce PHASE misalignment attribution):
RAM ground truth for the turn-9 pre-move FIGHT-submenu idle-bounce window
(`docs/rank5-off-ground-truth.md`'s "menu-window phase" section, turns
9/11/12; ISSUES #56 item 2's Q2 addendum names the sibling arbitrary-intro
`menuIdleBounce`/`DoBounceEffect` oscillator as precedent). Combines
`dump-turn13-bounce-driver.py`'s driver-chain read (`gBattleSpritesDataPtr`
-> `healthBoxesData[battler]` -> `{battlerBounceSpriteId, healthboxBounceSpriteId}`
-> `gSprites[driverId]`'s own `sSinIndex/sDelta/sAmplitude/sBouncerTarget/sWhich`)
with `dump-turn9-hitanim-off.py`'s hardcoded-address/OFF-bootstrap idiom
(`factory-battle-scene-off.json`), replayed against
`tools/compare/traces/turn9-quickattack-off.json`'s own verbatim segments -
the exact trace this step's assigned brief cites (177/233 matched, all 56
misses in ticks 10818-10873).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn9-idle-bounce-off.py \
        tools/compare/traces/turn9-quickattack-off.json <output.json> <startTick> <endTick>

Quirks (see ROADMAP.md Domain notes): mGBA spews log lines to stdout
(never parsed here - all results go to the output file); the interpreter
segfaults at teardown *after* results are written (exit 139 is benign -
check the output file, not the exit code).
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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

# Same hardcoded addresses `dump-turn9-hitanim-off.py` already proved valid
# for this ROM build under the OFF bootstrap.
GSPRITES = 0x02020630
SPRITE_SIZE = 0x44  # 68
GHEALTHBOXSPRITEIDS = 0x03005D70
GBATTLERSPRITEIDS = 0x020241E4
GBATTLESPRITESDATAPTR = 0x20244D0

SIN_INDEX_OFF = 46
DELTA_OFF = 48
AMPLITUDE_OFF = 50
BOUNCER_TARGET_OFF = 52
WHICH_OFF = 54
Y2_OFF = 38


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        return (
            oracle.read_u8(addr)
            | (oracle.read_u8(addr + 1) << 8)
            | (oracle.read_u8(addr + 2) << 16)
            | (oracle.read_u8(addr + 3) << 24)
        )

    def driver_fields(driver_id: int) -> dict:
        base = GSPRITES + driver_id * SPRITE_SIZE
        return {
            "sinIndex": u16(base + SIN_INDEX_OFF),
            "delta": u8(base + DELTA_OFF),
            "amplitude": u8(base + AMPLITUDE_OFF),
            "bouncerTarget": u8(base + BOUNCER_TARGET_OFF),
            "which": u8(base + WHICH_OFF),
        }

    def record(tick: int) -> dict:
        battle_sprites_data = u32(GBATTLESPRITESDATAPTR)
        healthboxes_data0 = u32(battle_sprites_data + 4)
        onix_driver_id = u8(healthboxes_data0 + 3)
        healthbox_driver_id = u8(healthboxes_data0 + 2)

        onix_slot = u8(GBATTLERSPRITEIDS + 0)
        healthbox_slot = u8(GHEALTHBOXSPRITEIDS + 0)

        row = {
            "tick": tick,
            "onixSpriteSlot": onix_slot,
            "healthboxMainSpriteSlot": healthbox_slot,
            "onixDriverId": onix_driver_id,
            "healthboxDriverId": healthbox_driver_id,
            "onixY2": s16(GSPRITES + onix_slot * SPRITE_SIZE + Y2_OFF),
            "healthboxMainY2": s16(GSPRITES + healthbox_slot * SPRITE_SIZE + Y2_OFF),
        }
        onix_driver = driver_fields(onix_driver_id)
        healthbox_driver = driver_fields(healthbox_driver_id)
        row["onixSinIndex"] = onix_driver["sinIndex"]
        row["onixDelta"] = onix_driver["delta"]
        row["onixAmplitude"] = onix_driver["amplitude"]
        row["onixBouncerTarget"] = onix_driver["bouncerTarget"]
        row["onixWhich"] = onix_driver["which"]
        row["healthboxSinIndex"] = healthbox_driver["sinIndex"]
        row["healthboxDelta"] = healthbox_driver["delta"]
        row["healthboxAmplitude"] = healthbox_driver["amplitude"]
        row["healthboxBouncerTarget"] = healthbox_driver["bouncerTarget"]
        row["healthboxWhich"] = healthbox_driver["which"]
        return row

    ticks_out = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        ticks_out.append(record(tick))

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if START_TICK <= tick <= END_TICK:
                ticks_out.append(record(tick))
            if tick > END_TICK:
                break
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out}, indent=0))


main()
