#!/usr/bin/env python3
"""Run a checked-in Battle Lab scenario locally and capture dense raw RGB.

This is the mGBA-backed fallback for oracle services started before the
additive ``/v1/battle-lab/run`` route was installed. Run it only through
``tools/run-mgba-probe.py`` so a validated JSON result distinguishes the
known mGBA teardown crash from a failed probe.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


if len(sys.argv) != 4:
    raise SystemExit(
        f"usage: {sys.argv[0]} <scenario.json> <fresh-output.json> <fresh-rgb-dir>"
    )

SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
RGB_DIR = Path(sys.argv[3])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    profile = scenario.get("profile", "battle-scene-on")
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    bootstrap = ORACLE_DIR / "bootstrap" / (
        "factory.json"
        if profile == "battle-scene-on"
        else "factory-battle-scene-off.json"
    )
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        bootstrap,
    )
    request = validate_request(scenario, profile)
    lab = BattleLab(oracle, profile)
    setup = lab.prepare(request)
    RGB_DIR.mkdir()

    records = []

    def capture(frame: int) -> None:
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        snapshot = lab.snapshot()
        feather_template = oracle.symbols["gFallingFeatherSpriteTemplate"]
        sprites = oracle.symbols["gSprites"]
        feather_slots = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if (
                oracle.read_u8(base + 0x3E) & 1
                and oracle.read_u32(base + 0x14) == feather_template
            ):
                feather_slots.append(slot)
        records.append(
            {
                "frame": frame,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "currentMove": snapshot["engine"]["currentMove"],
                "controllerExecFlags": snapshot["engine"]["controllerExecFlags"],
                "playerControllerCommand": snapshot["engine"]["playerControllerCommand"],
                "opponentControllerCommand": snapshot["engine"]["opponentControllerCommand"],
                "player": snapshot["battlers"]["player"],
                "opponent": snapshot["battlers"]["opponent"],
                "featherSlots": feather_slots,
            }
        )

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "schema": "battle-lab-dense-rgb/v1",
                "profile": profile,
                "setup": setup,
                "frames": records,
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
