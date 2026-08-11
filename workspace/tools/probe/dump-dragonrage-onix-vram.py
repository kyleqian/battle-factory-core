#!/usr/bin/env python3
"""DRAGON_RAGE rung 2 (age 98's 1598px ONIX-silhouette anomaly): dump ONIX's
own OBJ VRAM tile range (`tileNum=473`, 4bpp, size-3/64x64 = 64 tiles = 2048
bytes at `OBJ_VRAM0 + tileNum*32`) across a tick window bracketing the
target `AnimTask_ShakeMon` creation tick, to check the `LoadBallGfx`
precedent (a runtime VRAM overwrite of the tile range this move's static
asset extraction assumed was stable) - same instrument class as
`docs/battle-scene-notes.md` §7.25.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-dragonrage-onix-vram.py <scenario.json> <output.json> <startTick> <endTick>
"""

from __future__ import annotations

import hashlib
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
GBATTLEANIMTARGET = 0x02038437

OBJ_VRAM0 = 0x06010000
TILE_BYTES_4BPP = 32
TILE_COUNT = 64  # 64x64 sprite, 4bpp -> 8x8 tiles

BG_VRAM_END = 0x06010000  # background charblocks 0-3, in case tileNum indexes past OBJ range unexpectedly


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
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def record(tick: int) -> dict:
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)
        base = GSPRITES + target_slot * SPRITE_SIZE
        attr2 = read_u16(base + 0x04)
        tile_num = attr2 & 0x3FF
        vram_base = OBJ_VRAM0 + tile_num * TILE_BYTES_4BPP
        vram_bytes = bytes(oracle.read_u8(vram_base + i) for i in range(TILE_COUNT * TILE_BYTES_4BPP))
        return {
            "tick": tick,
            "targetSlot": int(target_slot),
            "tileNum": tile_num,
            "vramSha256": hashlib.sha256(vram_bytes).hexdigest(),
            "vramFirst32Hex": vram_bytes[:32].hex(),
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
