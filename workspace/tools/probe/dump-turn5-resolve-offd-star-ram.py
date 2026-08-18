#!/usr/bin/env python3
"""ISSUES #97 remainder residual (B), the newly-exposed 6970-6988 ring/star
span (`docs/turn5-confirmb-resolved-residuals.md` §8.2's own "widening
toward x=200... separate, unisolated sparkle contribution" flag, never
independently RAM-checked): RAM ground truth for the granting-star sprites
(`gGrantingStarsSpriteTemplate`, `ANIM_TAG_SPARKLE_2`,
`reference/pokeemerald/data/battle_anim_scripts.s:9073/9075`,
`GrantingStarsEffect`) across `turn5-resolve-off-d`'s own 6970-6988 window,
now that the dominant Onix HP-digit bug (§8.2/§8.7, landed) no longer masks
whatever smaller contribution the sparkle makes.

Same direct-`EmeraldOracle`/`factory-battle-scene-off.json` replay pattern
`dump-turn5-resolve-offd-onixhp-ram.py` established for this exact trace,
combined with the all-slots sprite scan `dump-sitrus-ring-sprite.py` used
for the OTHER Sitrus sparkle consumer (the thin ring) - same `struct
Sprite`/`struct OamMatrix` layout (`include/sprite.h`,
`include/gba/types.h`) both already used successfully in this directory.

Scans ALL 64 sprite slots every tick (the granting stars' own slot is not
pinned ahead of time for THIS trace/session) and records full detail only
for slots whose template pointer matches `gGrantingStarsSpriteTemplate`
(oracle-resolved this session: `bin/oracle symbols
gGrantingStarsSpriteTemplate` -> 0x8592b7c).

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-turn5-resolve-offd-star-ram.py <output.json> [startTick endTick]

Defaults to [6945, 7003] (margin around the doc's own 6970-6988 span, wide
enough to also see both stars' own spawn/destroy edges - RAM 6968/6978 per
the already-landed model, +62-tick lifetime each).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [startTick endTick]")

OUTPUT_PATH = Path(sys.argv[1])
WINDOW = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) == 4 else (6945, 7003)
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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-resolve-off-d.json"

STAR_TEMPLATE_PTR = 0x08592B7C
RING_TEMPLATE_PTR = 0x0859381C
NUM_SLOTS = 64
SPRITE_SIZE = 0x44  # sizeof(struct Sprite), same layout dump-sitrus-ring-sprite.py already confirmed for this ROM build.


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    if trace.get("oracleProfile") != "battle-scene-off":
        raise ValueError(f"{TRACE_PATH} is not a battle-scene-off trace")
    segments = trace["segments"]

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]
    g_oam_matrices = oracle.symbols["gOamMatrices"]
    MATRIX_SIZE = 8

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        return u16(addr) | (u16(addr + 2) << 16)

    def record_sprite(slot: int) -> dict:
        base = g_sprites + slot * SPRITE_SIZE
        oam_byte3 = u8(base + 3)
        matrix_num = (oam_byte3 >> 1) & 0x1F
        matrix_base = g_oam_matrices + matrix_num * MATRIX_SIZE
        flags_e = u8(base + 0x3E)
        flags_f = u8(base + 0x3F)
        return {
            "slot": slot,
            "template": u32(base + 0x14),
            "inUse": bool(flags_e & 0x1),
            "invisible": bool((flags_e >> 2) & 0x1),
            "matrixNum": matrix_num,
            "affineAnimBeginning": bool((flags_f >> 3) & 0x1),
            "affineAnimEnded": bool((flags_f >> 5) & 0x1),
            "animNum": u8(base + 0x2A),
            "animCmdIndex": u8(base + 0x2B),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "a": s16(matrix_base + 0),
            "d": s16(matrix_base + 6),
        }

    def record(tick: int) -> dict:
        stars = []
        rings = []
        for slot in range(NUM_SLOTS):
            rec = record_sprite(slot)
            if rec["template"] == STAR_TEMPLATE_PTR:
                stars.append(rec)
            elif rec["template"] == RING_TEMPLATE_PTR:
                rings.append(rec)
        return {"tick": tick, "starSprites": stars, "ringSprites": rings}

    ticks_out = []
    tick = 0
    if WINDOW[0] <= tick <= WINDOW[1]:
        ticks_out.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if WINDOW[0] <= tick <= WINDOW[1]:
                ticks_out.append(record(tick))
        if tick > WINDOW[1]:
            break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "window": WINDOW,
        "starTemplatePtr": STAR_TEMPLATE_PTR,
        "ringTemplatePtr": RING_TEMPLATE_PTR,
        "ticks": ticks_out,
    }, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
