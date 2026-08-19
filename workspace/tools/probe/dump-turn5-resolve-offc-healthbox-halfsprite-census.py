#!/usr/bin/env python3
"""ISSUES #97 remainder, the named next probe from
docs/turn5-single-frame-residuals-diagnosis.md §1.3 (`turn5-resolve-off-c`'s
lone tick-6763 residual, 195/196): a full 64-slot `gSprites[]` census across
the whole PIDGEOTTO healthbox slide-in span, to find PIDGEOTTO's own real
HP-bar sub-sprite whose `x`/`x2` track `gHealthboxSpriteIds[1]` (the already-
probed 64px "frame-left" sprite, `dump-turn5-resolve-offc-tail-probe.py`,
x=44 fixed base) in lockstep.

Source ground truth resolved BEFORE writing this probe
(reference/pokeemerald/src/battle_interface.c:851-868,979-1013): the real
healthbox is not one sprite or even two - it's THREE, all created together
in `CreateBattlerHealthboxSprites` and toggled visible/invisible together
(`SetHealthboxSpriteVisible`, line 1031-1036):
  - healthboxLeft/Main  - `gHealthboxSpriteIds[battler]` itself (already
    probed: x=44, shape=1/size=3 = 64x32).
  - healthboxRight/Other - `gSprites[left].oam.affineParam` (a u16 field,
    Sprite offset 0x06) holds this sprite's own slot id.
    `SpriteCB_HealthBoxOther` (line 1004-1013) sets
    `x = gSprites[left].x + 64` and `x2 = gSprites[left].x2` every frame -
    lockstep by construction, at a base 64px to the right of the left half.
  - healthbar (the HP-bar graphic itself) -
    `gSprites[left].hMain_HealthBarSpriteId` (`data[5]`, Sprite offset
    0x2E+5*2=0x38) holds this sprite's own slot id.
    `SpriteCB_HealthBar` (line 979-1002) sets, for the opponent
    `hBar_Data6=2` case, `x = gSprites[left].x + 8` and
    `x2 = gSprites[left].x2` every frame - also lockstep, base 8px right of
    the left half.

This probe does NOT trust that source reading alone: it independently scans
all 64 `gSprites[]` slots at every target tick and reports, per slot,
whether `x2` equals the left healthbox sprite's own `x2` that same tick -
so the lockstep claim is verified from raw RAM, not asserted from the
pret source tree (which is a development reference, not the exact running
ROM build's guaranteed layout). The two pointer-chased ids (`oam.affineParam`,
`hMain_HealthBarSpriteId`) are ALSO resolved and flagged directly in the
census output for a fast cross-check against the independent x2-lockstep
scan.

Samples every tick in [6758, 6790] by default (covers the onset tick 6762,
the residual tick 6763, and the whole slide span named in the brief) -
override with a comma-separated tick list as a single extra argv.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-offc-healthbox-halfsprite-census.py \\
      tools/compare/traces/turn5-resolve-off-c.json <fresh-output.json> [t1,t2,...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> [comma,separated,ticks]")

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
DEFAULT_TICKS = set(range(6758, 6791))
TARGET_TICKS = set(int(x) for x in sys.argv[3].split(",")) if len(sys.argv) == 4 else DEFAULT_TICKS

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

PROFILE_BOOTSTRAP = {
    "battle-scene-on": "factory.json",
    "battle-scene-off": "factory-battle-scene-off.json",
}

# Sprite field offsets (include/sprite.h) - same layout dump-midbattle-switch-
# oam.py, dump-turn5-resolve-offa-sprite-census.py and dump-turn5-resolve-
# offc-tail-probe.py already established for this ROM build.
SPRITE_SIZE = 0x44
SPRITE_OAM_OFF = 0x00        # attr0/attr1/attr2/affineParam, u16 each
SPRITE_AFFINE_PARAM_OFF = 0x06  # oam.affineParam: healthboxRight spriteId (healthboxLeft only)
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_DATA_OFF = 0x2E
SPRITE_DATA5_OFF = SPRITE_DATA_OFF + 5 * 2  # 0x38: hMain_HealthBarSpriteId (healthboxLeft only)
SPRITE_FLAGS_OFF = 0x3E      # bit0 inUse, bit2 invisible
SPRITE_SUBPRIORITY_OFF = 0x43

# GBA OAM shape(2 bits)/size(2 bits) -> (widthPx, heightPx). Same table
# dump-turn5-resolve-offa-oam-bg3rows-census.py already established.
SHAPE_SIZE_DIMS = {
    (0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
    (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
    (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64),
}


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    segments = trace["segments"]
    oracle_profile = trace.get("oracleProfile", "battle-scene-on")
    bootstrap_name = PROFILE_BOOTSTRAP[oracle_profile]
    bootstrap_path = ORACLE_DIR / "bootstrap" / bootstrap_name

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, bootstrap_path)
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]

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

    def slot_base(slot: int) -> int:
        return g_sprites + slot * SPRITE_SIZE

    def sprite_entry(slot: int) -> dict:
        base = slot_base(slot)
        flags = u16(base + SPRITE_FLAGS_OFF)
        a0 = u16(base + SPRITE_OAM_OFF)
        a1 = u16(base + SPRITE_OAM_OFF + 2)
        a2 = u16(base + SPRITE_OAM_OFF + 4)
        shape = (a0 >> 14) & 0x3
        size = (a1 >> 14) & 0x3
        dims = SHAPE_SIZE_DIMS.get((shape, size))
        return {
            "slot": slot,
            "inUse": bool(flags & 0x1),
            "invisible": bool(flags & 0x4),
            "x": s16(base + SPRITE_X_OFF),
            "y": s16(base + SPRITE_Y_OFF),
            "x2": s16(base + SPRITE_X2_OFF),
            "y2": s16(base + SPRITE_Y2_OFF),
            "subpriority": u8(base + SPRITE_SUBPRIORITY_OFF),
            "shape": shape,
            "size": size,
            "width": dims[0] if dims else None,
            "height": dims[1] if dims else None,
            "tileNum": a2 & 0x3FF,
            "priority": (a2 >> 10) & 0x3,
            "paletteNum": (a2 >> 12) & 0xF,
            "affineParam": u16(base + SPRITE_AFFINE_PARAM_OFF),
            "data5": s16(base + SPRITE_DATA5_OFF),
            "callback": hex(u32(base + SPRITE_CALLBACK_OFF) & ~1),
        }

    def record(tick: int) -> dict:
        healthbox_left_id = u8(g_healthbox_sprite_ids + 1)
        left = sprite_entry(healthbox_left_id)
        right_id = left["affineParam"] & 0xFF
        healthbar_id = left["data5"] & 0xFF
        right = sprite_entry(right_id) if right_id < 64 else None
        healthbar = sprite_entry(healthbar_id) if healthbar_id < 64 else None

        census = []
        lockstep_x2_slots = []
        for slot in range(64):
            entry = sprite_entry(slot)
            if not entry["inUse"]:
                continue
            census.append(entry)
            if slot != healthbox_left_id and entry["x2"] == left["x2"]:
                lockstep_x2_slots.append(slot)

        return {
            "tick": tick,
            "healthboxLeftId": healthbox_left_id,
            "healthboxLeft": left,
            "healthboxRightId": right_id,
            "healthboxRight": right,
            "healthbarId": healthbar_id,
            "healthbar": healthbar,
            "lockstepX2Slots": lockstep_x2_slots,
            "census": census,
        }

    ticks_out = []
    tick = 0
    max_tick = max(TARGET_TICKS)
    if tick in TARGET_TICKS:
        ticks_out.append(record(tick))

    for segment in segments:
        if tick > max_tick:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick > max_tick:
                break
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                ticks_out.append(record(tick))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)) if TRACE_PATH.is_relative_to(WORKTREE_ROOT) else str(TRACE_PATH),
        "oracleProfile": oracle_profile,
        "bootstrap": bootstrap_name,
        "ticks": ticks_out,
    }))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks, bootstrap={bootstrap_name})")


main()
