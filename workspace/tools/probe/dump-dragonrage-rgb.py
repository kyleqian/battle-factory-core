#!/usr/bin/env python3
"""DRAGON_RAGE rung 5 portable comparator's probe: `dump-dragonrage-full.py`'s
own sprite/task capture (attacker/target `AnimTask_ShakeMon`, the fire-spit
sprite, all 8 fire-plume sprites, both `SlideMonTo{Offset,OriginalPos}` dummy
sprites - same template-pointer identification convention) plus dense raw
RGB per frame, mirroring `run-battle-lab-rgb.py`'s own capture loop/CLI shape
(`<scenario.json> <fresh-output.json> <fresh-rgb-dir>`) so
`tools/compare/dragonRagePortable.ts` can drive it exactly like
`emberPortable.ts` drives `run-battle-lab-rgb.py`.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-dragonrage-rgb.py <scenario.json> <output.json> <rgb-dir>
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <fresh-output.json> <fresh-rgb-dir>")
SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
RGB_DIR = Path(sys.argv[3])

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
GANIMSOUNDTASKCOUNT = 0x020383FF

GTASKS = 0x03005E00
TASK_SIZE = 0x28
NUM_TASKS = 16
ANIM_TASK_SHAKE_MON = 0x080D51AC
ANIM_TASK_SHAKE_MON_STEP = 0x080D5220

GOAMMATRICES = 0x02021BC0
OAMMATRIX_SIZE = 0x08
GPLTTBUFFERUNFADED = 0x02037B14
GPLTTBUFFERFADED = 0x02037714

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
    setup = lab.prepare(request)
    RGB_DIR.mkdir()
    gmplayinfo_se1 = oracle.symbols["gMPlayInfo_SE1"]
    gmplaytrack_se1 = oracle.symbols["gMPlayTrack_SE1"]

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def read_s16(addr: int) -> int:
        return s16(read_u16(addr))

    def read_u32(addr: int) -> int:
        b = [oracle.read_u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def read_s8(addr: int) -> int:
        value = oracle.read_u8(addr)
        return value - 0x100 if value & 0x80 else value

    def sound_player() -> dict:
        return {
            "songHeader": oracle.read_u32(gmplayinfo_se1),
            "status": oracle.read_u32(gmplayinfo_se1 + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(gmplaytrack_se1 + i * 0x50),
                    "panX": read_s8(gmplaytrack_se1 + i * 0x50 + 0x15),
                }
                for i in range(3)
            ],
        }

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
            "attr": [read_u16(base), read_u16(base + 2), read_u16(base + 4)],
        }

    def capture(frame: int) -> dict | None:
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != 82:
            return None
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)

        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        attacker_slot = oracle.read_u8(GBATTLERSPRITEIDS + attacker_battler)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)

        shake_mon_tasks = []
        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            if not oracle.read_u8(base + 0x04):
                continue
            func = read_u32(base + 0x00) & ~1
            if func not in (ANIM_TASK_SHAKE_MON, ANIM_TASK_SHAKE_MON_STEP):
                continue
            shake_mon_tasks.append({
                "slot": slot,
                "priority": oracle.read_u8(base + 0x07),
                "data": [read_s16(base + 0x08 + i * 2) for i in range(6)],
            })

        fire_spit_sprites = []
        fire_plume_sprites = []
        slide_sprites = []
        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + SPRITE_FLAGS_OFF)
            if not (flags & 0x1):
                continue
            template = read_u32(base + SPRITE_TEMPLATE_OFF)
            if template == FIRE_SPIT_TEMPLATE_ADDR:
                fire_spit_sprites.append(sprite_common(slot))
            elif template == FIRE_PLUME_TEMPLATE_ADDR:
                fire_plume_sprites.append(sprite_common(slot))
            elif template in (SLIDE_TO_OFFSET_TEMPLATE_ADDR, SLIDE_TO_ORIGINAL_POS_TEMPLATE_ADDR):
                s = sprite_common(slot)
                s["kind"] = (
                    "SlideMonToOffset"
                    if template == SLIDE_TO_OFFSET_TEMPLATE_ADDR
                    else "SlideMonToOriginalPos"
                )
                slide_sprites.append(s)

        return {
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "animScriptActive": oracle.read_u8(GANIMSCRIPTACTIVE),
            "animVisualTaskCount": oracle.read_u8(GANIMVISUALTASKCOUNT),
            "animSoundTaskCount": oracle.read_u8(GANIMSOUNDTASKCOUNT),
            "player": snapshot["battlers"]["player"],
            "opponent": snapshot["battlers"]["opponent"],
            "playerPersonality": oracle.read_u32(oracle.symbols["gBattleMons"] + 0x48),
            "opponentPersonality": oracle.read_u32(oracle.symbols["gBattleMons"] + 0x58 + 0x48),
            "attacker": sprite_common(attacker_slot),
            "target": sprite_common(target_slot),
            "shakeMonTasks": shake_mon_tasks,
            "fireSpitSprites": fire_spit_sprites,
            "firePlumeSprites": fire_plume_sprites,
            "slideSprites": slide_sprites,
            "hardwareOam": [
                [read_u16(0x07000000 + i * 8 + offset) for offset in (0, 2, 4)]
                for i in range(128)
            ],
            "hardwareMatrices": [
                [read_s16(0x07000006 + i * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for i in range(32)
            ],
            "registers": {
                "dispcnt": read_u16(0x04000000),
                "bldcnt": read_u16(0x04000050),
                "bldalpha": read_u16(0x04000052),
            },
            "fadedPalette": [read_u16(GPLTTBUFFERFADED + i * 2) for i in range(512)],
            "unfadedPalette": [read_u16(GPLTTBUFFERUNFADED + i * 2) for i in range(512)],
            "hardwarePalette": [read_u16(0x05000000 + i * 2) for i in range(512)],
            "se1": sound_player(),
        }

    records = []
    frame = 0
    first = capture(frame)
    if first is not None:
        records.append(first)
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            frame += 1
            record = capture(frame)
            if record is not None:
                records.append(record)

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "schema": "dragonrage-dense-rgb/v1",
                "profile": profile,
                "setup": setup,
                "songHeaders": {
                    "dragonRage": oracle.read_u32(oracle.symbols["gSongTable"] + 171 * 8),
                    "flameWheel2": oracle.read_u32(oracle.symbols["gSongTable"] + 145 * 8),
                },
                "frames": records,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUTPUT_PATH} ({len(records)} frames)")


if __name__ == "__main__":
    main()
