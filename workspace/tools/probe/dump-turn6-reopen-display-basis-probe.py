#!/usr/bin/env python3
"""ISSUES #97-B continuation 2, goal 1: directly confirm/refute the
`turn5-bounce-recalibration-probe.md` §6d display-basis hypothesis - that
oracle's *displayed* frame N shows sprite-Y2 RAM state as of tick N-1, not
tick N's own post-`DoBounceEffect` value (a standard GBA "task writes OAM
during frame N's own trailing vblank; that write is scanned out starting
frame N+1, not frame N" render-lag).

Confirms the capture PROTOCOL first (`oracle/server.py`'s `run_trace`
calls `ORACLE.advance()` then, if `ORACLE.frame in wanted`, captures
`screen_rgb()`/`screen_png()` in that same call - i.e. tick N's Y2 RAM read
and tick N's captured pixels come from the exact same simulation instant,
so any N-vs-N-1 basis mismatch is a REAL emulated-hardware property, not a
probe-methodology artifact). Then, for each tick over the window-B onset
(7302-7320), records RAM Y2 (reusing `dump-turn5-6-reopen-bounce-driver.py`'s
addressing) AND a sha256 of the raw RGB crop over the onix bbox
(44,49-99,110) and healthbox bbox (127,74-229,110) from
`turn5-bounce-recalibration-probe.md`'s own compare-tool bbox report, so the
tick at which the VISIBLE crop actually changes can be read off directly and
compared against the tick at which the RAM value changes.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn6-reopen-display-basis-probe.py <fresh-output.json>
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")

OUTPUT_PATH = Path(sys.argv[1])
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
from PIL import Image as PILImage  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-action-off.json"

SPRITE_SIZE = 68
# turn5-bounce-recalibration-probe.md §0's own compare-tool bbox report.
ONIX_BBOX = (44, 49, 99, 110)  # minX, minY, maxX, maxY (inclusive)
HEALTHBOX_BBOX = (127, 74, 229, 110)
# Window-B onset (7305 first mismatch) plus the 7313-7318 reopen/reveal span.
TICK_RANGE = (7302, 7320)


def crop_sha256(rgb_bytes: bytes, width: int, height: int, bbox: tuple[int, int, int, int]) -> str:
    img = PILImage.frombytes("RGB", (width, height), rgb_bytes)
    x0, y0, x1, y1 = bbox
    crop = img.crop((x0, y0, x1 + 1, y1 + 1))
    return hashlib.sha256(crop.tobytes()).hexdigest()


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_battle_sprites_data_ptr = oracle.symbols["gBattleSpritesDataPtr"]
    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]
    g_sprites = oracle.symbols["gSprites"]

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

    def record(tick: int) -> dict:
        battle_sprites_data = u32(g_battle_sprites_data_ptr)
        healthboxes_data0 = u32(battle_sprites_data + 4)
        onix_slot = u8(g_battler_sprite_ids + 0)
        healthbox_slot = u8(g_healthbox_sprite_ids + 0)
        onix_y2 = s16(g_sprites + onix_slot * SPRITE_SIZE + 38)
        healthbox_y2 = s16(g_sprites + healthbox_slot * SPRITE_SIZE + 38)

        rgb = oracle.screen_rgb()
        onix_hash = crop_sha256(rgb, oracle.width, oracle.height, ONIX_BBOX)
        healthbox_hash = crop_sha256(rgb, oracle.width, oracle.height, HEALTHBOX_BBOX)

        return {
            "tick": tick,
            "onixY2": onix_y2,
            "healthboxMainY2": healthbox_y2,
            "onixCropSha256": onix_hash,
            "healthboxCropSha256": healthbox_hash,
        }

    ticks_out = []
    tick = 0
    if TICK_RANGE[0] <= tick <= TICK_RANGE[1]:
        ticks_out.append(record(tick))

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if TICK_RANGE[0] <= tick <= TICK_RANGE[1]:
                ticks_out.append(record(tick))
            if tick > TICK_RANGE[1]:
                break
        if tick > TICK_RANGE[1]:
            break

    # Derive, per field, the tick at which the RAM value changed and the
    # (independent) tick at which the captured-pixel crop hash changed, so
    # the basis question ("does the crop change at the SAME tick as RAM, or
    # one tick later?") is answered directly from this run's own data.
    transitions = {"onix": [], "healthbox": []}
    for field, y2_key, hash_key in (
        ("onix", "onixY2", "onixCropSha256"),
        ("healthbox", "healthboxMainY2", "healthboxCropSha256"),
    ):
        prev = None
        for row in ticks_out:
            if prev is not None:
                if row[y2_key] != prev[y2_key]:
                    transitions[field].append({
                        "kind": "ram",
                        "tick": row["tick"],
                        "from": prev[y2_key],
                        "to": row[y2_key],
                    })
                if row[hash_key] != prev[hash_key]:
                    transitions[field].append({
                        "kind": "pixels",
                        "tick": row["tick"],
                    })
            prev = row

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "onixBbox": ONIX_BBOX,
        "healthboxBbox": HEALTHBOX_BBOX,
        "tickRange": TICK_RANGE,
        "ticks": ticks_out,
        "transitions": transitions,
    }, indent=0))


main()
