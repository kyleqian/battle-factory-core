#!/usr/bin/env python3
"""MOVE_SHADOW_PUNCH's own unproven component: `AnimTask_AttackerPunchWithTrace`
(reference/pokeemerald/src/battle_anim_mons.c:2392-2496, NOT battle_anim_fight.c
as the step brief's own citation said - confirmed directly via `nm` against the
pinned elf). Whole-move single-pass RAM probe, same convention as
`dump-dragonrage-full.py`: every active gTasks slot matching this task's own
func pointer (creation-tick self-reassign, same shape ShakeMon already
established), the attacker's own sprite (to directly verify the task's own
`x2 -= tBattlerSpriteId` quirk - a real vanilla artifact, not a bug in this
port), every live trace-clone sprite (identified by `callback ==
AnimBattlerTrace`, `struct Sprite`+0x1C - CloneBattlerSpriteWithBlend struct-
copies the attacker's own template pointer, so clones can't be told apart from
the attacker by template the way DRAGON_RAGE's fire-plume spawns were), the
fist/hitsplat sprites (by template pointer, `gFistFootSpriteTemplate`/
`gBasicHitSplatSpriteTemplate` - already-proven assets per FIRE_PUNCH), and the
BLDCNT/BLDALPHA/BLDY hardware registers (ground truth for the `fadetobg
BG_GHOST`/`restorebg` fade ramp - the MECHANISM is already exact-proven via
MOVE_EXTREME_SPEED, only this move's own timing anchors are new).

Addresses (reference/pokeemerald.map + `nm` for static symbols):
  gTasks                          = 0x03005e00
  gSprites                        = 0x02020630
  gBattlerSpriteIds               = 0x020241e4
  gBattleAnimAttacker/Target      = 0x02038436 / 0x02038437
  gAnimScriptActive/VisualTaskCount = 0x020383fd / 0x020383fe
  AnimTask_AttackerPunchWithTrace      = 0x080a8bc4 (creation tick only)
  AnimTask_AttackerPunchWithTrace_Step = 0x080a8cac (every tick after)
  AnimBattlerTrace (clone sprite callback) = 0x080a8dfc
  gFistFootSpriteTemplate         = 0x08595e98
  gBasicHitSplatSpriteTemplate    = 0x08597358
  REG_BLDCNT/BLDALPHA/BLDY        = 0x04000050 / 0x04000052 / 0x04000054

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-shadowpunch-full.py <scenario.json> <output.json> <startTick> <endTick>
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
NUM_SPRITES = 64
GBATTLERSPRITEIDS = 0x020241E4

GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437
GANIMSCRIPTACTIVE = 0x020383FD
GANIMVISUALTASKCOUNT = 0x020383FE

GTASKS = 0x03005E00
TASK_SIZE = 0x28
NUM_TASKS = 16
PUNCH_TASK_FUNC = 0x080A8BC4
PUNCH_TASK_STEP = 0x080A8CAC

TRACE_CALLBACK = 0x080A8DFC
FIST_TEMPLATE_ADDR = 0x08595E98
HITSPLAT_TEMPLATE_ADDR = 0x08597358

BLDCNT = 0x04000050
BLDALPHA = 0x04000052
BLDY = 0x04000054

SPRITE_OAM_ATTR2_OFF = 0x04
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_TEMPLATE_OFF = 0x14
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_DATA_OFF = 0x2E
SPRITE_FLAGS_OFF = 0x3E
SPRITE_SUBPRIORITY_OFF = 0x43


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

    def sprite_common(slot: int) -> dict:
        base = GSPRITES + slot * SPRITE_SIZE
        attr2 = read_u16(base + SPRITE_OAM_ATTR2_OFF)
        flags = read_u16(base + SPRITE_FLAGS_OFF)
        return {
            "slot": slot,
            "x": read_s16(base + SPRITE_X_OFF),
            "y": read_s16(base + SPRITE_Y_OFF),
            "x2": read_s16(base + SPRITE_X2_OFF),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "animNum": oracle.read_u8(base + SPRITE_ANIM_NUM_OFF),
            "animCmdIndex": oracle.read_u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
            "invisible": bool(flags & 0x4),
            "subpriority": oracle.read_u8(base + SPRITE_SUBPRIORITY_OFF),
            "priority": (attr2 >> 10) & 0x3,
            "paletteNum": (attr2 >> 12) & 0xF,
            "data": [read_s16(base + SPRITE_DATA_OFF + i * 2) for i in range(8)],
        }

    def record(tick: int) -> dict:
        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        attacker_slot = oracle.read_u8(GBATTLERSPRITEIDS + attacker_battler)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)

        row: dict = {
            "tick": tick,
            "animScriptActive": oracle.read_u8(GANIMSCRIPTACTIVE),
            "animVisualTaskCount": oracle.read_u8(GANIMVISUALTASKCOUNT),
            "bldcnt": read_u16(BLDCNT),
            "bldalpha": read_u16(BLDALPHA),
            "bldy": read_u16(BLDY),
            "attackerSlot": attacker_slot,
            "attacker": sprite_common(attacker_slot),
            "target": sprite_common(target_slot),
            "punchTask": None,
            "traceSprites": [],
            "fistSprite": None,
            "hitsplatSprites": [],
        }

        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            is_active = oracle.read_u8(base + 0x04)
            if not is_active:
                continue
            func = read_u32(base + 0x00) & ~1
            if func not in (PUNCH_TASK_FUNC, PUNCH_TASK_STEP):
                continue
            row["punchTask"] = {
                "slot": slot,
                "priority": oracle.read_u8(base + 0x07),
                "data": [read_s16(base + 0x08 + i * 2) for i in range(8)],
            }

        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + SPRITE_FLAGS_OFF)
            if not (flags & 0x1):
                continue
            callback = read_u32(base + SPRITE_CALLBACK_OFF) & ~1
            template = read_u32(base + SPRITE_TEMPLATE_OFF)
            if callback == TRACE_CALLBACK:
                row["traceSprites"].append(sprite_common(slot))
            elif template == FIST_TEMPLATE_ADDR:
                row["fistSprite"] = sprite_common(slot)
            elif template == HITSPLAT_TEMPLATE_ADDR:
                row["hitsplatSprites"].append(sprite_common(slot))

        return row

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
