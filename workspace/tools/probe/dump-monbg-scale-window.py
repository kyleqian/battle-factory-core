#!/usr/bin/env python3
"""Defect A's named `monbg` hypothesis, instrumented directly (not assumed).

Source read first: `Cmd_monbg` (`battle_anim.c:591-647`) calls
`MoveBattlerSpriteToBG(battler, toBG_2, FALSE)` (`battle_anim.c:668-749`) -
`setSpriteInvisible=FALSE`, so the OBJ itself is NOT hidden inline. But the
task it spawns, `Task_InitUpdateMonBg` (`battle_anim.c:555-589`), sets
`gSprites[battlerSpriteId].invisible = TRUE` unconditionally the very next
game frame (line ~561), regardless of `setSpriteInvisible`. From then on
`Task_UpdateMonBg` (`battle_anim.c:813-837`) only repositions the BG's
scroll registers to track `sprite->x2/y2` (the ONE-TIME `DrawBattlerOnBg`
tile copy itself is never redrawn) - and `AnimTask_ScaleMonAndRestore`
(`battle_anim_mon_movement.c:823-860`) only ever calls `SetSpriteRotScale`
(the OBJ's own affine matrix), never touches `x2`/`y2`. So if this
hypothesis is right, the OAM matrix keeps updating every tick (already
RAM-confirmed exact in rung 5) but is applied to an INVISIBLE OBJ, while
the real displayed pixels are a BG tile copy that never scales - explaining
"exact at center (both coincide there), wrong at edges, magnitude grows
with scale, unaffected by lag" without any new asset/decode defect.

Dumps, every tick in [startTick, endTick]: for both player/opponent
battler sprites - `invisible` bit, `x2`/`y2`, OAM `matrixNum` + the
`gOamMatrices` it points at; `gBattle_BG1_X/Y` and `gBattle_BG2_X/Y` (the
RAM mirrors `MoveBattlerSpriteToBG`/`Task_UpdateMonBg` write); the actual
hardware `BG1CNT`/`BG2CNT`/`BG1HOFS`/`BG1VOFS`/`BG2HOFS`/`BG2VOFS`
registers (in case of a DMA/VBlank-transfer lag against the RAM mirror,
the same class of one-tick lag already found for BLDY/rotation elsewhere
in this move family); `DISPCNT` (which BG/OBJ layers are enabled);
`BLDCNT`/`BLDALPHA`/`BLDY`.

Addresses (linker-map/struct-offset derived, see module doc above):
  gSprites          = 0x02020630 (struct Sprite, sizeof 0x44)
  gBattlerSpriteIds  = 0x020241e4 (u8[MAX_BATTLERS_COUNT])
  gOamMatrices       = symbol lookup (struct OamMatrix, sizeof 8)
  gBattle_BG1_X/Y    = 0x02022e18 / 0x02022e1a
  gBattle_BG2_X/Y    = 0x02022e1c / 0x02022e1e
  DISPCNT  = 0x04000000
  BG1CNT   = 0x0400000a, BG2CNT   = 0x0400000c
  BG1HOFS  = 0x04000014, BG1VOFS  = 0x04000016
  BG2HOFS  = 0x04000018, BG2VOFS  = 0x0400001a
  BLDCNT   = 0x04000050, BLDALPHA = 0x04000052, BLDY = 0x04000054

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-python> tools/probe/dump-monbg-scale-window.py <scenario.json> <output.json> <startTick> <endTick>
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

GBATTLE_BG1_X = 0x02022E18
GBATTLE_BG1_Y = 0x02022E1A
GBATTLE_BG2_X = 0x02022E1C
GBATTLE_BG2_Y = 0x02022E1E

DISPCNT = 0x04000000
BG1CNT = 0x0400000A
BG2CNT = 0x0400000C
BG1HOFS = 0x04000014
BG1VOFS = 0x04000016
BG2HOFS = 0x04000018
BG2VOFS = 0x0400001A
BLDCNT = 0x04000050
BLDALPHA = 0x04000052
BLDY = 0x04000054


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

    oam_matrices = oracle.symbols["gOamMatrices"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        value = u16(addr)
        return value - 0x10000 if value >= 0x8000 else value

    def sprite_record(battler: int) -> dict:
        slot = u8(GBATTLERSPRITEIDS + battler)
        base = GSPRITES + slot * SPRITE_SIZE
        attr1 = u16(base + 2)
        matrix_num = (attr1 >> 9) & 0x1F
        matrix_base = oam_matrices + matrix_num * 8
        return {
            "slot": slot,
            "invisible": bool(u8(base + 0x3E) & 4),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "matrixNum": matrix_num,
            "matrix": {
                "a": s16(matrix_base),
                "b": s16(matrix_base + 2),
                "c": s16(matrix_base + 4),
                "d": s16(matrix_base + 6),
            },
        }

    def record(tick: int) -> dict:
        return {
            "tick": tick,
            "playerSprite": sprite_record(0),
            "opponentSprite": sprite_record(1),
            "bg1X": s16(GBATTLE_BG1_X),
            "bg1Y": s16(GBATTLE_BG1_Y),
            "bg2X": s16(GBATTLE_BG2_X),
            "bg2Y": s16(GBATTLE_BG2_Y),
            "dispcnt": u16(DISPCNT),
            "bg1cnt": u16(BG1CNT),
            "bg2cnt": u16(BG2CNT),
            "bg1hofsReg": u16(BG1HOFS),
            "bg1vofsReg": u16(BG1VOFS),
            "bg2hofsReg": u16(BG2HOFS),
            "bg2vofsReg": u16(BG2VOFS),
            "bldcnt": u16(BLDCNT),
            "bldalpha": u16(BLDALPHA),
            "bldy": u16(BLDY),
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
