#!/usr/bin/env python3
"""EMBER creation-tick investigation: per-frame RAM dump of every in-use
`gEmberSpriteTemplate`/`gEmberFlareSpriteTemplate` sprite (full struct,
including `data[]` and the raw `callback` pointer, not just the OAM-facing
fields `tools/probe/run-battle-lab-rgb.py` already captures) plus the
captured RGB framebuffer, over a narrow frame window. Distinguishes exactly
which RAM tick a fresh ember/flare's creation lands on, what its `data[]`/
`callback` show that tick vs the next, and cross-checks against the actual
displayed pixels — rather than assuming the same creation-tick shape as a
sibling move (MIST_BALL/FLY) transfers unmodified.

Run with the harness's mGBA-enabled interpreter (NOT system python3), same
convention as the other `dump-*.py` probes:
    tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-venv>/bin/python tools/probe/dump-ember-creation.py \
        <scenario.json> <output.json> <startFrame> <endFrame>
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(
        f"usage: {sys.argv[0]} <scenario.json> <output.json> <startFrame> <endFrame>"
    )
SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_FRAME = int(sys.argv[3])
END_FRAME = int(sys.argv[4])

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

    sprites = oracle.symbols["gSprites"]
    ember_template = oracle.symbols["gEmberSpriteTemplate"]
    ember_flare_template = oracle.symbols["gEmberFlareSpriteTemplate"]

    def s16(addr: int) -> int:
        value = oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)
        return value - 0x10000 if value >= 0x8000 else value

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def u32(addr: int) -> int:
        return (
            oracle.read_u8(addr)
            | (oracle.read_u8(addr + 1) << 8)
            | (oracle.read_u8(addr + 2) << 16)
            | (oracle.read_u8(addr + 3) << 24)
        )

    def sprite_record(slot: int, kind: str) -> dict:
        base = sprites + slot * 0x44
        flags = u16(base + 0x3E)
        return {
            "slot": slot,
            "kind": kind,
            "callback": hex(u32(base + 0x1C)),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "data": [s16(base + 0x2E + i * 2) for i in range(8)],
            "invisible": bool(flags & 4),
            "subpriority": oracle.read_u8(base + 0x43),
            "tileNum": oracle.read_u8(base + 4) | ((oracle.read_u8(base + 5) & 0x3) << 8),
        }

    def capture(frame: int) -> dict:
        rgb = oracle.screen_rgb()
        records = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if not (oracle.read_u8(base + 0x3E) & 1):
                continue
            template = u32(base + 0x14)
            if template == ember_template:
                records.append(sprite_record(slot, "ember"))
            elif template == ember_flare_template:
                records.append(sprite_record(slot, "flare"))
        return {
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "sprites": records,
            # Crop around the two named mismatch regions (89-96, 84-92) so
            # the committed evidence stays small but still pixel-checkable.
            "cropRgb": [
                list(rgb[(y * 240 + x) * 3 : (y * 240 + x) * 3 + 3])
                for y in range(84, 92)
                for x in range(88, 98)
            ],
        }

    frame = 0
    rows = []
    if START_FRAME <= frame <= END_FRAME:
        rows.append(capture(frame))
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            frame += 1
            if START_FRAME <= frame <= END_FRAME:
                rows.append(capture(frame))
            if frame > END_FRAME:
                break
        else:
            continue
        break

    OUTPUT_PATH.write_text(json.dumps({"frames": rows}, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH} ({len(rows)} frames)")


if __name__ == "__main__":
    main()
