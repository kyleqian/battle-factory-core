#!/usr/bin/env python3
"""ISSUES #56 Q1: distinguish the frame-444 materialize sprite from the
same-frame ball-open particle stall with direct Scene-OFF OAM RAM reads.

The comparison trace maps app frame 444 to BattleLab absolute frame 1615
(its `preCheckpointFrameOffset` is 1171).  Capture the surrounding source
ticks through the standard mGBA wrapper:

    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-issue56-yoshi-materialize-oam.py <fresh-output.json> \\
        tools/battle-lab/factory-arbitrary-intro-yoshi-off.json 1614:1616

The output records both sides of the sprite path:
  - opponent battler 1, resolved through `gBattlerSpriteIds[1]`, including
    `gSprites[id].oam`, x/y/x2/y2, affine matrix number, the live
    `gOamMatrices[n]` registers, the pending `gMain.oamBuffer` match, and
    the hardware OAM match at 0x07000000;
  - ball-open particles, identified structurally by their source origin
    `(176, 59)` (`AnimateBallOpenParticles(sprite->x, sprite->y - 5, ...)`)
    plus priority 1 / subpriority 28, so a one-tick particle freeze cannot
    be mistaken for a battler affine-position change.

`gOamBuffer` is not an exported linker symbol in this build (it is
`gMain.oamBuffer`, byte offset 0x38); `gSprites`, `gBattlerSpriteIds`, and
`gOamMatrices` are resolved from the oracle symbol map.  Results are written
before libmgba's known teardown SIGSEGV, so always invoke via
`tools/run-mgba-probe.py` rather than treating exit 139 as evidence.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


if len(sys.argv) != 4:
    raise SystemExit(
        f"usage: {sys.argv[0]} <output.json> <fixture.json> <startAbs:endAbs>"
    )

OUTPUT_PATH = Path(sys.argv[1])
FIXTURE_PATH = Path(sys.argv[2])
START_ABS, END_ABS = (int(value) for value in sys.argv[3].split(":", 1))
if END_ABS < START_ABS:
    raise SystemExit("endAbs must be >= startAbs")

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find oracle/emerald_core.py above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

SPRITE_SIZE = 0x44
MAX_SPRITES = 64
OAM_ENTRIES = 128
OAM_ENTRY_SIZE = 8
OAM_HARDWARE = 0x07000000
GMAIN_OAM_BUFFER_OFFSET = 0x38
MATRIX_SIZE = 8
OPPONENT_BATTLER = 1
PARTICLE_ORIGIN = (176, 59)
PARTICLE_PRIORITY = 1
PARTICLE_SUBPRIORITY = 28


def s8(value: int) -> int:
    return value - 0x100 if value & 0x80 else value


def s16(value: int) -> int:
    return value - 0x10000 if value & 0x8000 else value


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    symbols = oracle.symbols
    g_sprites = symbols["gSprites"]
    g_battler_sprite_ids = symbols["gBattlerSpriteIds"]
    g_oam_matrices = symbols["gOamMatrices"]
    g_main = symbols["gMain"]
    g_oam_buffer = g_main + GMAIN_OAM_BUFFER_OFFSET

    def read_u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def read_s16(addr: int) -> int:
        return s16(read_u16(addr))

    def decode_oam(base: int) -> dict:
        attr0 = read_u16(base)
        attr1 = read_u16(base + 2)
        attr2 = read_u16(base + 4)
        return {
            "attr0": attr0,
            "attr1": attr1,
            "attr2": attr2,
            "x": attr1 & 0x1FF,
            "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "shape": (attr0 >> 14) & 0x3,
            "matrixNum": (attr1 >> 9) & 0x1F,
            "size": (attr1 >> 14) & 0x3,
            "tile": attr2 & 0x3FF,
            "priority": (attr2 >> 10) & 0x3,
            "palette": (attr2 >> 12) & 0xF,
        }

    def matrix_values(matrix_num: int) -> dict:
        base = g_oam_matrices + matrix_num * MATRIX_SIZE
        return {
            "pa": read_s16(base),
            "pb": read_s16(base + 2),
            "pc": read_s16(base + 4),
            "pd": read_s16(base + 6),
        }

    def matrix_values_in_oam(oam_base: int, matrix_num: int) -> list[int]:
        # `CopyMatricesToOamBuffer` stores a/b/c/d in affineParam (+6) of
        # OAM entries 4*n..4*n+3 (sprite.c:469-479).
        return [
            read_s16(oam_base + (matrix_num * 4 + component) * OAM_ENTRY_SIZE + 6)
            for component in range(4)
        ]

    def matching_oam_entries(oam_base: int, target: dict) -> list[dict]:
        matches = []
        for index in range(OAM_ENTRIES):
            entry = decode_oam(oam_base + index * OAM_ENTRY_SIZE)
            if (
                entry["attr0"] == target["attr0"]
                and entry["attr1"] == target["attr1"]
                and entry["attr2"] == target["attr2"]
            ):
                matches.append({"index": index, **entry})
        return matches

    def sprite_state(sprite_id: int) -> dict:
        base = g_sprites + sprite_id * SPRITE_SIZE
        flags = read_u16(base + 0x3E)
        oam = decode_oam(base)
        return {
            "slot": sprite_id,
            "inUse": bool(flags & 0x1),
            "invisible": bool(flags & 0x4),
            "pos1": {"x": read_s16(base + 0x20), "y": read_s16(base + 0x22)},
            "pos2": {"x": read_s16(base + 0x24), "y": read_s16(base + 0x26)},
            "centerToCorner": {
                "x": s8(oracle.read_u8(base + 0x28)),
                "y": s8(oracle.read_u8(base + 0x29)),
            },
            "oam": oam,
            "subpriority": oracle.read_u8(base + 0x43),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "data": [read_s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def particle_states() -> list[dict]:
        rows = []
        for sprite_id in range(MAX_SPRITES):
            state = sprite_state(sprite_id)
            if not state["inUse"] or state["invisible"]:
                continue
            if (
                state["pos1"]["x"] == PARTICLE_ORIGIN[0]
                and state["pos1"]["y"] == PARTICLE_ORIGIN[1]
                and state["oam"]["priority"] == PARTICLE_PRIORITY
                and state["subpriority"] == PARTICLE_SUBPRIORITY
            ):
                rows.append(state)
        return rows

    rows: list[dict] = []

    def record() -> None:
        battler_ids = [oracle.read_u8(g_battler_sprite_ids + index) for index in range(4)]
        opponent = sprite_state(battler_ids[OPPONENT_BATTLER])
        matrix_num = opponent["oam"]["matrixNum"]
        rows.append(
            {
                "absoluteFrame": oracle.frame,
                "appRelativeFrame": oracle.frame - 1171,
                "battlerSpriteIds": battler_ids,
                "opponentBattler": opponent,
                "liveMatrix": matrix_values(matrix_num),
                "pendingOamMatches": matching_oam_entries(g_oam_buffer, opponent["oam"]),
                "hardwareOamMatches": matching_oam_entries(OAM_HARDWARE, opponent["oam"]),
                "pendingOamMatrix": matrix_values_in_oam(g_oam_buffer, matrix_num),
                "hardwareOamMatrix": matrix_values_in_oam(OAM_HARDWARE, matrix_num),
                "ballOpenParticles": particle_states(),
            }
        )

    original_advance = oracle.advance

    def patched_advance(buttons):
        original_advance(buttons)
        if START_ABS <= oracle.frame <= END_ABS:
            record()

    oracle.advance = patched_advance  # type: ignore[method-assign]
    oracle.new_session()
    lab = BattleLab(oracle, "battle-scene-off")
    request = validate_request(fixture, "battle-scene-off")
    lab.prepare(request)

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "fixture": str(FIXTURE_PATH),
                "requestedAbsoluteRange": [START_ABS, END_ABS],
                "appRelativeOffset": 1171,
                "anchors": {
                    "gSprites": hex(g_sprites),
                    "gBattlerSpriteIds": hex(g_battler_sprite_ids),
                    "gOamMatrices": hex(g_oam_matrices),
                    "gMain": hex(g_main),
                    "gMainOamBuffer": hex(g_oam_buffer),
                    "hardwareOam": hex(OAM_HARDWARE),
                },
                "rows": rows,
            },
            indent=2,
        )
    )
    print(f"wrote {OUTPUT_PATH} ({len(rows)} frames)")


main()
