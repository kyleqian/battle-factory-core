#!/usr/bin/env python3
"""DRAGON_RAGE rung 3: whole-move per-tick RAM probe. Extends
`dump-dragonrage-slide.py`'s staging (same `mechanic-dragon-rage-charmeleon-
onix.json` CHARMELEON-vs-ONIX fixture) to capture the FULL move body in one
pass: `gAnimVisualTaskCount`/`gAnimScriptActive` (ground truth for
`waitforvisualfinish`'s own gating - it blocks until the count hits zero,
`reference/pokeemerald/src/battle_anim.c:455-465`, not a per-sprite wait),
every active `gTasks` slot (both `AnimTask_ShakeMon` calls: attacker first,
target second), the fire-spit sprite (`gDragonRageFireSpitSpriteTemplate`,
`StartDragonFireTranslation`'s translation + its own single-step affine
matrix via `gOamMatrices`), all `gDragonRageFirePlumeSpriteTemplate` spawns
(position + animCmdIndex frame stepping + self-destroy), and both
`SlideMonToOffset`/`SlideMonToOriginalPos` dummy sprites (reconfirms rung
2's already-ported primitive in the same single-pass window).

Addresses (`reference/pokeemerald/pokeemerald.map`, this run's pinned
reference build; `AnimTask_ShakeMon_Step` is `static` so it's read from
`nm reference/pokeemerald/pokeemerald.elf` instead of the map):
  gTasks                              = 0x03005e00
  gAnimScriptActive                   = 0x020383fd
  gAnimVisualTaskCount                = 0x020383fe
  AnimTask_ShakeMon                   = 0x080d51ac (creation tick only - self-reassigns)
  AnimTask_ShakeMon_Step              = 0x080d5220 (every tick after creation)
  gDragonRageFirePlumeSpriteTemplate  = 0x08596f28
  gDragonRageFireSpitSpriteTemplate   = 0x08596f80
  gSlideMonToOriginalPosSpriteTemplate = 0x0857fe58
  gSlideMonToOffsetSpriteTemplate      = 0x0857fe70

Sprite/task identification follows this track's established convention:
sprites by their own `template` pointer (`struct Sprite` + 0x14, stable for
the sprite's whole lifetime, unlike `callback` which reassigns itself after
the first tick - same convention `dump-dragonrage-slide.py`/
`dump-mist-ball-sprite.py` use); tasks by `func`, checked against BOTH
`AnimTask_ShakeMon` and `AnimTask_ShakeMon_Step` (masking the thumb bit)
since `AnimTask_ShakeMon` itself calls `gTasks[taskId].func =
AnimTask_ShakeMon_Step; gTasks[taskId].func(taskId);` synchronously at
creation - the task's func is ALREADY `AnimTask_ShakeMon_Step` by the first
RAM-observable tick, same self-reassignment shape
`dump-fly-shakemon-tasks.py`'s own doc comment already flags for this task.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-dragonrage-full.py <scenario.json> <output.json> <startTick> <endTick>
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
ANIM_TASK_SHAKE_MON = 0x080D51AC
ANIM_TASK_SHAKE_MON_STEP = 0x080D5220

GOAMMATRICES = 0x02021BC0
OAMMATRIX_SIZE = 0x08

FIRE_PLUME_TEMPLATE_ADDR = 0x08596F28
FIRE_SPIT_TEMPLATE_ADDR = 0x08596F80
SLIDE_TO_ORIGINAL_POS_TEMPLATE_ADDR = 0x0857FE58
SLIDE_TO_OFFSET_TEMPLATE_ADDR = 0x0857FE70

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_TEMPLATE_OFF = 0x14
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_OAM_ATTR1_OFF = 0x02
SPRITE_FLAGS_OFF = 0x3E
SPRITE_SUBPRIORITY_OFF = 0x43
SPRITE_DATA_OFF = 0x2E


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
        flags = read_u16(base + SPRITE_FLAGS_OFF)
        attr1 = read_u16(base + SPRITE_OAM_ATTR1_OFF)
        matrix_num = (attr1 >> 9) & 0x1F
        mbase = GOAMMATRICES + matrix_num * OAMMATRIX_SIZE
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
            "matrixNum": matrix_num,
            "matrixA": read_s16(mbase + 0),
            "matrixB": read_s16(mbase + 2),
            "matrixC": read_s16(mbase + 4),
            "matrixD": read_s16(mbase + 6),
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
            "attacker": sprite_common(attacker_slot),
            "target": sprite_common(target_slot),
            "shakeMonTasks": [],
            "fireSpitSprites": [],
            "firePlumeSprites": [],
            "slideSprites": [],
        }

        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            is_active = oracle.read_u8(base + 0x04)
            if not is_active:
                continue
            func = read_u32(base + 0x00) & ~1
            if func not in (ANIM_TASK_SHAKE_MON, ANIM_TASK_SHAKE_MON_STEP):
                continue
            row["shakeMonTasks"].append({
                "slot": slot,
                "priority": oracle.read_u8(base + 0x07),
                "data": [read_s16(base + 0x08 + i * 2) for i in range(6)],
            })

        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + SPRITE_FLAGS_OFF)
            if not (flags & 0x1):
                continue
            template = read_u32(base + SPRITE_TEMPLATE_OFF)
            if template == FIRE_SPIT_TEMPLATE_ADDR:
                row["fireSpitSprites"].append(sprite_common(slot))
            elif template == FIRE_PLUME_TEMPLATE_ADDR:
                row["firePlumeSprites"].append(sprite_common(slot))
            elif template in (SLIDE_TO_OFFSET_TEMPLATE_ADDR, SLIDE_TO_ORIGINAL_POS_TEMPLATE_ADDR):
                s = sprite_common(slot)
                s["kind"] = (
                    "SlideMonToOffset"
                    if template == SLIDE_TO_OFFSET_TEMPLATE_ADDR
                    else "SlideMonToOriginalPos"
                )
                row["slideSprites"].append(s)

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
