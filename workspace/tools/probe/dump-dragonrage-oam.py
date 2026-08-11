#!/usr/bin/env python3
"""DRAGON_RAGE rung 1 (fire-plume z-order ties, render ages 105-114): RAM-read
the ACTUAL final OAM buffer (`gMain.oamBuffer[128]`, NOT `gSprites[]`) the
same way ISSUES #32's `dump-turn9-clone-oam.py`/`dump-aerialace-oam.py`/
`dump-quickattack-hitsplat-oam.py` already settled their own same-priority
overlaps: array POSITION in `gMain.oamBuffer` (post-`SortSprites`, walked by
`AddSpritesToOamBuffer`) IS the hardware tie-break - lower position -> lower
real OAM index -> drawn ON TOP.

For each requested RAM tick, dumps every live fire-plume sprite (identified
by `gDragonRageFirePlumeSpriteTemplate`, same template-pointer convention
`dump-dragonrage-full.py` uses) plus the target (ONIX) sprite, each sprite's
OWN raw `oam` attrs (attr0/1/2, copied byte-for-byte into `gMain.oamBuffer`
by `BuildOamBuffer` with no further transform), and the full 128-entry
`gMain.oamBuffer`. The exact-attr0/1/2 match between a sprite's own oam and
one `oamBuffer` entry gives that sprite's real final buffer index directly -
no `sSpriteOrder`/history simulation needed, just the one already-composited
answer for this exact tick.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-dragonrage-oam.py <scenario.json> <output.json> <startTick> <endTick>
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

GMAIN = 0x030022C0
OAM_BUFFER = GMAIN + 0x38
OAM_ENTRY_SIZE = 8
OAM_ENTRIES = 128

FIRE_PLUME_TEMPLATE_ADDR = 0x08596F28
FIRE_SPIT_TEMPLATE_ADDR = 0x08596F80

SPRITE_TEMPLATE_OFF = 0x14
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_FLAGS_OFF = 0x3E
SPRITE_SUBPRIORITY_OFF = 0x43

BLDCNT = 0x04000050
BLDALPHA = 0x04000052


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

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def read_u32(addr: int) -> int:
        b = [oracle.read_u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def decode_oam(attr0: int, attr1: int, attr2: int) -> dict:
        return {
            "raw": [attr0, attr1, attr2],
            "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "shape": (attr0 >> 14) & 0x3,
            "x": attr1 & 0x1FF,
            "matrixNum": (attr1 >> 9) & 0x1F,
            "size": (attr1 >> 14) & 0x3,
            "tileNum": attr2 & 0x3FF,
            "priority": (attr2 >> 10) & 0x3,
            "paletteNum": (attr2 >> 12) & 0xF,
        }

    def record(tick: int) -> dict:
        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)

        oam_entries = []
        for i in range(OAM_ENTRIES):
            base = OAM_BUFFER + i * OAM_ENTRY_SIZE
            attr0 = read_u16(base + 0)
            attr1 = read_u16(base + 2)
            attr2 = read_u16(base + 4)
            oam_entries.append(decode_oam(attr0, attr1, attr2))

        def buffer_index_for(attr0: int, attr1: int, attr2: int) -> int | None:
            for idx, entry in enumerate(oam_entries):
                if entry["raw"] == [attr0, attr1, attr2]:
                    return idx
            return None

        sprites = {}
        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + SPRITE_FLAGS_OFF)
            if not (flags & 0x1):
                continue
            template = read_u32(base + SPRITE_TEMPLATE_OFF)
            is_plume = template == FIRE_PLUME_TEMPLATE_ADDR
            is_target = slot == target_slot
            is_fire_spit = template == FIRE_SPIT_TEMPLATE_ADDR
            if not (is_plume or is_target or is_fire_spit):
                continue
            attr0 = read_u16(base + 0x00)
            attr1 = read_u16(base + 0x02)
            attr2 = read_u16(base + 0x04)
            oam = decode_oam(attr0, attr1, attr2)
            oam["slot"] = slot
            oam["kind"] = "plume" if is_plume else ("target" if is_target else "fireSpit")
            oam["invisible"] = bool(flags & 0x4)
            oam["subpriority"] = oracle.read_u8(base + SPRITE_SUBPRIORITY_OFF)
            oam["animCmdIndex"] = oracle.read_u8(base + SPRITE_ANIM_CMD_INDEX_OFF)
            oam["x2"] = s16(read_u16(base + SPRITE_X2_OFF))
            oam["y2"] = s16(read_u16(base + SPRITE_Y2_OFF))
            oam["bufferIndex"] = buffer_index_for(attr0, attr1, attr2)
            sprites[str(slot)] = oam

        return {
            "tick": tick,
            "targetSlot": int(target_slot),
            "sprites": sprites,
            "bldcnt": read_u16(BLDCNT),
            "bldalpha": read_u16(BLDALPHA),
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
