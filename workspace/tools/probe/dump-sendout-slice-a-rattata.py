#!/usr/bin/env python3
"""ISSUES #71 Slice A positive-case RAM probe: sample the settled RATTATA
front sprite through its real battle-start send-out seam under Battle Scene
OFF, from sprite creation to well past the settle.

Reads `struct Sprite` fields by BATTLER INDEX (`gBattlerSpriteIds[0]`/`[1]`)
for every emulated frame of the mechanicLab route, including the internal
pre-checkpoint intro (rental-selection screen + battle-start send-out) that
`BattleLab.prepare()` normally hides. This is the field set the program-doc
§7 acceptance bar asks for: `x`, `y`, `x2`, `y2`, `animNum`, `animCmdIndex`,
`callback`, plus `data[2]` (the sprite's species tag, used to confirm WHICH
species the slot carries).

Sprite layout (reference/pokeemerald/include/sprite.h):
    callback  = 0x1C (u32 func ptr, thumb-bit masked)
    x         = 0x20 (s16)
    y         = 0x22 (s16)
    x2        = 0x24 (s16)
    y2        = 0x26 (s16)
    animNum   = 0x2A (u8)
    animCmdIndex = 0x2B (u8)
    data      = 0x2E (s16[8]); data[2] holds the species id for battle mons

Row coordinate spaces (both are the emulator's own `oracle.frame`):
  phase "pre"  : absolute frame from new_session() (0 == rental screen), the
                 send-out happens here, so the settle tick is a pre-tick;
  phase "post" : relative frame after prepare() resets frame to 0 (the
                 action-menu checkpoint where the user trace begins).

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-sendout-slice-a-rattata.py \
            <scenario.json> <output.json>
The scenario is tools/battle-lab/send-out-slice-a-rattata-off.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json>")
SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])

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

SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_DATA_OFF = 0x2E

SYMBOLS = {
    0x08180714: "VerticalSquishBounce",
    0x0818080C: "Anim_VerticalSquishBounce",
    0x08182B24: "Anim_RapidHorizontalHops",
    0x08180210: "Anim_VerticalStretch",
    0x08180670: "Anim_HorizontalSlideWobble",
    0x08184D88: "WaitAnimEnd",
    0x08007428: "SpriteCallbackDummy",
    0x080398B8: "SpriteCallbackDummy_2",
}


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    profile = scenario.get("profile", "battle-scene-on")
    bootstrap = ORACLE_DIR / "bootstrap" / (
        "factory.json" if profile == "battle-scene-on" else "factory-battle-scene-off.json"
    )
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, bootstrap)
    request = validate_request(scenario, profile)
    lab = BattleLab(oracle, profile)

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

    def battler_sprite(battler: int) -> dict:
        slot = oracle.read_u8(GBATTLERSPRITEIDS + battler)
        base = GSPRITES + slot * SPRITE_SIZE
        callback = read_u32(base + SPRITE_CALLBACK_OFF) & ~1
        return {
            "battler": battler,
            "slot": slot,
            "x": read_s16(base + SPRITE_X_OFF),
            "y": read_s16(base + SPRITE_Y_OFF),
            "x2": read_s16(base + SPRITE_X2_OFF),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "animNum": oracle.read_u8(base + SPRITE_ANIM_NUM_OFF),
            "animCmdIndex": oracle.read_u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
            "data2": read_s16(base + SPRITE_DATA_OFF + 2 * 2),
            "callback": hex(callback),
            "callbackSymbol": SYMBOLS.get(callback, "?"),
        }

    rows: list[dict] = []
    phase = {"name": "pre"}

    def record() -> None:
        rows.append(
            {
                "tick": oracle.frame,
                "phase": phase["name"],
                "battler0": battler_sprite(0),
                "battler1": battler_sprite(1),
            }
        )

    orig_advance = lab._advance

    def recording_advance(frames: int, buttons: tuple[str, ...], after_frame=None) -> None:
        def inner() -> None:
            if after_frame is not None:
                after_frame()
            record()

        orig_advance(frames, buttons, inner)

    lab._advance = recording_advance
    lab.prepare(request)

    phase["name"] = "post"
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            record()

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks: "
          f"{sum(1 for r in rows if r['phase'] == 'pre')} pre, "
          f"{sum(1 for r in rows if r['phase'] == 'post')} post)")


main()
