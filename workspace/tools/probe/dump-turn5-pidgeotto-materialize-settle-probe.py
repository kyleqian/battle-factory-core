#!/usr/bin/env python3
"""ISSUES #97 remainder, THIRD `turn5-resolve-off-c` mechanism
(docs/turn5-resolve-offc-tail-diagnosis.md §10's landed-2026-08-18 addendum):
after the two prior mechanisms landed, `turn5-resolve-off-c` stayed
149/196 with a flat ~3% residual across every one of the same 47 frames
(6763-6809), traced structurally to PIDGEOTTO's own SPRITE
materialize->settled hand-off: the app gates
`drawTurn5PidgeottoMaterialize`'s switch to `drawTurn5PidgeottoSettled` on
`TURN5_PIDGEOTTO_SETTLE_TICK` (6828, `battleScene.ts:11114`, sourced from
`turn5ResolutionAdapter.ts`'s `PIDGEOTTO_MATERIALIZE_SETTLE_TICK`), while
§3c's own aside already flagged (without RAM-pinning) that the real
sprite's idle callback fires "by RAM tick ~6760" - i.e. far earlier.

This probe pins the REAL materialize->settled visual timeline directly:
PIDGEOTTO's own mon sprite (`gBattlerSpriteIds[1]`), every tick in
[startTick, endTick] (default [6735, 6835], covering the ball handoff
(6727) through past `TURN5_PIDGEOTTO_SETTLE_TICK` (6828)):

  * OAM (`attr0/1/2` decoded: y/affineMode/objMode/shape, x/matrixNum/
    size, tileNum/priority/paletteNum) and `invisible`;
  * the sprite's own `callback` pointer, resolved against the two named
    callback addresses `dump-midbattle-switch-oam.py` already pinned for
    this exact ROM build (`SPRITECB_OPPONENTMONFROMBALL = 0x08039B58`,
    the ball-emerge callback; `SpriteCallbackDummy = 0x08007428`, the
    idle sentinel `dump-onix-front-idle-anim.py` also uses) - the
    callback flip between these two IS the real hardware's own
    materialize->settled transition, independent of any affine-matrix
    reading;
  * `x2`/`y2`, `animNum`/`animCmdIndex`, `data[0..7]` (the sprite's own
    generic per-callback scratch state - materialize/emerge tasks
    typically drive a countdown or sub-state machine through `data[]`);
  * whenever `affineMode != 0`: the live `gOamMatrices[matrixNum]`
    registers (`pa/pb/pc/pd`) - the exact stretch/scale the hardware is
    rendering that tick, directly comparable to the app's own
    `TURN5_STRETCH_TABLE` entries;
  * PIDGEOTTO's own healthbox sprite (`gHealthboxSpriteIds[1]`) `x2`/
    `invisible`/`callback` alongside, as a same-window cross-check that
    nothing beyond the already-landed 6763 slide re-anchor is left
    uncovered in this span.

Same direct-`EmeraldOracle`/`factory-battle-scene-off.json` replay driver
as `dump-turn5-resolve-offc-tail-probe.py` (same 76-segment
`turn5-resolve-off-a.json` script, sha256-confirmed shared by all six
confirm/resolve-off traces plus `turn5-reset-off.json`) - NOT the
`battle_lab`/mechanicLab driver `dump-midbattle-switch-oam.py` used for a
different (ISSUES #78) mid-battle-switch scenario; only its callback
addresses and struct-offset layout are reused here, verbatim.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-pidgeotto-materialize-settle-probe.py <fresh-output.json> [startTick endTick]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [startTick endTick]")

OUTPUT_PATH = Path(sys.argv[1])
OVERRIDE_WINDOW = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) == 4 else None
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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-resolve-off-a.json"

WINDOW = OVERRIDE_WINDOW if OVERRIDE_WINDOW is not None else (6735, 6835)

# Sprite field offsets (include/sprite.h) - same layout
# dump-midbattle-switch-oam.py/dump-turn5-resolve-offc-tail-probe.py
# already pinned for this ROM build.
SPRITE_SIZE = 0x44
SPRITE_OAM_OFF = 0x00
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_DATA_OFF = 0x2E
SPRITE_FLAGS_OFF = 0x3E  # bit0 inUse, bit2 invisible

GOAM_MATRIX_SIZE = 8
# `sAffineAnimStates` is file-static (not in the linker map's exported
# symbol table) - literal address `dump-midbattle-switch-oam.py` already
# resolved from the ELF for this exact ROM build.
SAFFINEANIMSTATES = 0x03000B70
AFFINE_STATE_SIZE = 10

SPRITECB_OPPONENTMONFROMBALL = 0x08039B58
SPRITECB_HEALTHBOXSLIDEIN = 0x080769CC
SPRITE_CALLBACK_DUMMY = 0x08007428
NAMED_CALLBACKS = {
    SPRITECB_OPPONENTMONFROMBALL: "SpriteCB_OpponentMonFromBall",
    SPRITE_CALLBACK_DUMMY: "SpriteCallbackDummy",
    SPRITECB_HEALTHBOXSLIDEIN: "SpriteCB_HealthBoxSlideIn",
}


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]
    g_sprites = oracle.symbols["gSprites"]
    g_oam_matrices = oracle.symbols["gOamMatrices"]

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

    def decode_attr0(attr0: int) -> dict:
        return {
            "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "shape": (attr0 >> 14) & 0x3,
        }

    def decode_attr1(attr1: int) -> dict:
        return {"x": attr1 & 0x1FF, "matrixNum": (attr1 >> 9) & 0x1F, "size": (attr1 >> 14) & 0x3}

    def decode_attr2(attr2: int) -> dict:
        return {"tileNum": attr2 & 0x3FF, "priority": (attr2 >> 10) & 0x3, "paletteNum": (attr2 >> 12) & 0xF}

    def matrix(matrix_num: int) -> dict:
        base = g_oam_matrices + matrix_num * GOAM_MATRIX_SIZE
        return {"a": s16(base + 0), "b": s16(base + 2), "c": s16(base + 4), "d": s16(base + 6)}

    def affine_anim_state(matrix_num: int) -> dict:
        base = SAFFINEANIMSTATES + matrix_num * AFFINE_STATE_SIZE
        return {
            "animNum": u8(base + 0),
            "animCmdIndex": u8(base + 1),
            "delayCounter": u8(base + 2),
            "loopCounter": u8(base + 3),
            "xScale": s16(base + 4),
            "yScale": s16(base + 6),
            "rotation": u16(base + 8),
        }

    def named_callback(addr: int) -> str:
        return NAMED_CALLBACKS.get(addr, hex(addr))

    def mon_sprite_entry(slot: int) -> dict:
        base = g_sprites + slot * SPRITE_SIZE
        flags = u16(base + SPRITE_FLAGS_OFF)
        a0 = u16(base + SPRITE_OAM_OFF)
        a1 = u16(base + SPRITE_OAM_OFF + 2)
        a2 = u16(base + SPRITE_OAM_OFF + 4)
        decoded_a0 = decode_attr0(a0)
        decoded_a1 = decode_attr1(a1)
        callback_addr = u32(base + SPRITE_CALLBACK_OFF) & ~1
        entry = {
            "slot": slot,
            "inUse": bool(flags & 0x1),
            "invisible": bool(flags & 0x4),
            **decoded_a0,
            **decoded_a1,
            **decode_attr2(a2),
            "x": s16(base + SPRITE_X_OFF),
            "y": s16(base + SPRITE_Y_OFF),
            "x2": s16(base + SPRITE_X2_OFF),
            "y2": s16(base + SPRITE_Y2_OFF),
            "animNum": u8(base + SPRITE_ANIM_NUM_OFF),
            "animCmdIndex": u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
            "data": [s16(base + SPRITE_DATA_OFF + i * 2) for i in range(8)],
            "callback": named_callback(callback_addr),
            "callbackRaw": hex(callback_addr),
        }
        if decoded_a0["affineMode"] != 0:
            entry["matrix"] = matrix(decoded_a1["matrixNum"])
            entry["affineAnim"] = affine_anim_state(decoded_a1["matrixNum"])
        return entry

    def healthbox_sprite_entry(slot: int) -> dict:
        base = g_sprites + slot * SPRITE_SIZE
        flags = u16(base + SPRITE_FLAGS_OFF)
        callback_addr = u32(base + SPRITE_CALLBACK_OFF) & ~1
        return {
            "slot": slot,
            "invisible": bool(flags & 0x4),
            "x2": s16(base + SPRITE_X2_OFF),
            "callback": named_callback(callback_addr),
        }

    def record(tick: int) -> dict:
        mon_slot = u8(g_battler_sprite_ids + 1)
        healthbox_slot = u8(g_healthbox_sprite_ids + 1)
        return {
            "tick": tick,
            "mon": mon_sprite_entry(mon_slot),
            "healthbox": healthbox_sprite_entry(healthbox_slot),
        }

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
        "ticks": ticks_out,
    }, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
