#!/usr/bin/env python3
"""Send-out front-animation probe: read the settled battler sprite callback
directly by BATTLER INDEX (`gBattlerSpriteIds[0]`/`[1]`), not
`gBattleAnimAttacker`/`gBattleAnimTarget` (those are stale/zeroed until
`DoMoveAnim` runs, `battle_anim.c:201-206` - the earlier DRAGON_RAGE full-move
probe's own "target" rows before its move's `gAnimScriptActive` flip were
silently reading battler 0 twice, not the real per-side sprites; this probe
sidesteps that entirely).

Reads `struct Sprite.callback` (offset 0x1C, `include/sprite.h:202`) as a
function pointer (thumb-bit masked) plus x2/y2/animNum/animCmdIndex/data[2]
for BOTH battler slots. This began as the ONIX `ANIM_RAPID_H_HOPS` probe and
is intentionally species-generic for the generated front-selector families.
Addresses
(`nm reference/pokeemerald/pokeemerald.elf`; these front-family `Anim_*`
entries and `WaitAnimEnd` are `static` so absent from the map):
  Anim_RapidHorizontalHops  = 0x08182b24 (ONIX/RATTATA, ANIM_RAPID_H_HOPS)
  Anim_VerticalStretch      = 0x08180210 (GROVYLE/PIDGEOTTO, ANIM_V_STRETCH,
                                          ISSUES #71 §4 sibling pair)
  Anim_HorizontalSlideWobble = 0x08180670 (KABUTO, ANIM_H_SLIDE_WOBBLE)
  Anim_VerticalSquishBounce = 0x0818080c (MURKROW, ANIM_V_SQUISH_AND_BOUNCE)
  WaitAnimEnd               = 0x08184d88
  SpriteCallbackDummy       = 0x08007428
  SpriteCallbackDummy_2     = 0x080398b8

**Corrected (ISSUES #71 Slice D, PROGRESS.md entry 920, 2026-08-04):** a
`mechanicLab` scenario staged under `profile: "battle-scene-off"` never
dispatches the front idle-anim task at all during its fast-forward — this
probe then reads a flat `SpriteCallbackDummy`/`x2=0` from tick 0. That flat
read is the **real game's own behavior**, not a mechanicLab staging
artifact: `SKIP_FRONT_ANIM` (`pokemon.c:6803-6852`) never launches the
front-sprite animation task under Battle Scene OFF, so `x2`/`y2` stay
`{0,0}` for the whole battle, for every species (see
`docs/rattata-off-seam-flat-settle-probe.md` for a 634-tick RAM receipt).
This superseded PAPERCUTS.md's earlier "Real OFF-profile battles DO play
send-out anims" claim, which entry 920 also corrected. To probe the
per-tick front idle-anim task itself (as opposed to confirming it never
runs), use `battle-scene-on`.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-onix-front-idle-anim.py <scenario.json> <output.json> <startTick> <endTick>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json> <startTick> <endTick>")
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

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
GBATTLERSPRITEIDS = 0x020241E4

SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_DATA_OFF = 0x2E

SYMBOLS = {
    0x08180714: "VerticalSquishBounce",
    0x0818080C: "Anim_VerticalSquishBounce",
    0x08182B24: "Anim_RapidHorizontalHops",
    0x08180210: "Anim_VerticalStretch",
    0x08180670: "Anim_HorizontalSlideWobble",
    0x08184D88: "WaitAnimEnd",
    0x08007428: "SpriteCallbackDummy",
    0x080398B8: "SpriteCallbackDummy_2",
}


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

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def read_s16(addr: int) -> int:
        return s16(read_u16(addr))

    def read_u32(addr: int) -> int:
        b = [oracle.read_u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def battler_sprite(battler: int) -> dict:
        slot = oracle.read_u8(GBATTLERSPRITEIDS + battler)
        base = GSPRITES + slot * SPRITE_SIZE
        callback = read_u32(base + SPRITE_CALLBACK_OFF) & ~1
        return {
            "battler": battler,
            "slot": slot,
            "x2": read_s16(base + SPRITE_X2_OFF),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "animNum": oracle.read_u8(base + SPRITE_ANIM_NUM_OFF),
            "animCmdIndex": oracle.read_u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
            "data2": read_s16(base + SPRITE_DATA_OFF + 2 * 2),
            "callback": hex(callback),
            "callbackSymbol": SYMBOLS.get(callback, "?"),
        }

    def record(tick: int) -> dict:
        return {
            "tick": tick,
            "battler0": battler_sprite(0),
            "battler1": battler_sprite(1),
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
