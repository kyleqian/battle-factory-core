#!/usr/bin/env python3
"""ISSUES #81 freeze-schedule probe (side lane, GROUND-TRUTH only — no src/ or
tests/ edits). Answers the open question from
docs/fight-menu-chrome-ground-truth.md §8.1: does the oracle apply the SAME
piecewise bounce-index freeze schedule in battle-1's own fight-menu windows
(the windows that pin the app's current single-2-tick-opening-freeze constant),
or is the torment fixture's 4/1/1 schedule route-dependent?

Measured schedule (this probe, RAM + pixel ground truth over
tools/battle-lab/scratch-fight-menu-bounce-b1.json and
...-b1-nav.json, reusing battle1-fight-submenu-idle/-nav segments):

  battle-1 fight-menu boundary        freeze length    frames
  ----------------------------------  ---------------  --------------------
  action-menu opening (RAM 1748)      0-frame          bounce starts cleanly at seed 128/192
  submenu-open DMA-wait (RAM 1888-    2-frame          index holds at used-index 77
    1889, screen 1889-1890)                            for 2 RAM ticks
  B-close (RAM 2049)                  1-frame          index holds at 166
  B-close (RAM 2051)                  1-frame          index holds at 173

Verdict: ROUTE-DEPENDENT (b). The torment fixture's 4-frame fight-opening
freeze (736-739) is NOT present in battle-1: battle-1's action-menu opening
starts the bounce cleanly (0-frame freeze), its submenu-open DMA-wait freeze
is 2 frames (not torment's 1-frame message-entry freeze), and its B-close
produces two 1-frame freezes.

How this script re-derives the mapping: it replays both scratch traces fresh
through the Battle Scene OFF oracle, extracts the player-healthbox top-edge
y2 per captured frame (the whole healthbox translates vertically by y2; the
green field row at a fixed x column is the marker, validated byte-exact
against RAM gSprites[0].y2), then checks the measured y2 sequence against the
gSineTable model under the documented freeze schedule. PASS = the measured y2
matches the freeze-schedule model on every captured frame AND the no-freeze
model disagrees at the documented freeze frames (proving the freezes are
real, not the model's constant).

Run: python3 tools/probe/verify-fight-menu-freeze-schedule.py
"""

from __future__ import annotations

import base64
import io
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

GBA_SINE_TABLE_256 = [
    0, 6, 12, 18, 25, 31, 37, 43, 49, 56, 62, 68, 74, 80, 86, 92,
    97, 103, 109, 115, 120, 126, 131, 136, 142, 147, 152, 157, 162, 167, 171, 176,
    181, 185, 189, 193, 197, 201, 205, 209, 212, 216, 219, 222, 225, 228, 231, 234,
    236, 238, 241, 243, 244, 246, 248, 249, 251, 252, 253, 254, 254, 255, 255, 255,
    256, 255, 255, 255, 254, 254, 253, 252, 251, 249, 248, 246, 244, 243, 241, 238,
    236, 234, 231, 228, 225, 222, 219, 216, 212, 209, 205, 201, 197, 193, 189, 185,
    181, 176, 171, 167, 162, 157, 152, 147, 142, 136, 131, 126, 120, 115, 109, 103,
    97, 92, 86, 80, 74, 68, 62, 56, 49, 43, 37, 31, 25, 18, 12, 6,
    0, -6, -12, -18, -25, -31, -37, -43, -49, -56, -62, -68, -74, -80, -86, -92,
    -97, -103, -109, -115, -120, -126, -131, -136, -142, -147, -152, -157, -162, -167, -171, -176,
    -181, -185, -189, -193, -197, -201, -205, -209, -212, -216, -219, -222, -225, -228, -231, -234,
    -236, -238, -241, -243, -244, -246, -248, -249, -251, -252, -253, -254, -254, -255, -255, -255,
    -256, -255, -255, -255, -254, -254, -253, -252, -251, -249, -248, -246, -244, -243, -241, -238,
    -236, -234, -231, -228, -225, -222, -219, -216, -212, -209, -205, -201, -197, -193, -189, -185,
    -181, -176, -171, -167, -162, -157, -152, -147, -142, -136, -131, -126, -120, -115, -109, -103,
    -97, -92, -86, -80, -74, -68, -62, -56, -49, -43, -37, -31, -25, -18, -12, -6,
]

# Documented freeze schedule per trace (RAM ticks where the healthbox bounce
# index does not advance by +7). Derived from the RAM probe (driver sSinIndex)
# and cross-checked pixel-exact against the oracle PNGs. The -idle trace only
# opens the submenu (no B-close); the -nav trace adds the B-close at 2046-2047,
# which produces the two 1-frame freezes at 2049/2051.
TRACE_FREEZE_SCHEDULES = {
    "scratch-fight-menu-bounce-b1": {
        1888, 1889,  # submenu-open DMA-wait (2-frame)
    },
    "scratch-fight-menu-bounce-b1-nav": {
        1888, 1889,  # submenu-open DMA-wait (2-frame)
        2049,        # B-close (1-frame)
        2051,        # B-close (1-frame)
    },
}

SEED_HEALTHBOX = 128
MENU_BOUNCE_RAM_SETUP_TICK = 1748
TRACES = [
    ROOT / "tools/battle-lab/scratch-fight-menu-bounce-b1.json",
    ROOT / "tools/battle-lab/scratch-fight-menu-bounce-b1-nav.json",
]
X_MARKER = 200
GREEN_FIELD = (82, 107, 99)
GREEN_FIELD_BASELINE = 74  # screen y2 = (first green row at X_MARKER) - 74


def y2_from_sin_index(index: int) -> int:
    return (GBA_SINE_TABLE_256[index & 0xFF] >> 8) + 1


def model_y2(screen_tick: int, freeze_schedule) -> int:
    """App/bounce model for the healthbox: screen S shows RAM S-1 (render lag),
    index = seed + 7*(ramTick - 1748), minus 7 for each documented freeze that
    already happened before this ramTick. y2 = Sin(index,1)+1."""
    ram = screen_tick - 1
    if ram < MENU_BOUNCE_RAM_SETUP_TICK:
        return 0
    frozen = sum(1 for f in freeze_schedule if f <= ram)
    index = (SEED_HEALTHBOX + 7 * (ram - MENU_BOUNCE_RAM_SETUP_TICK) - 7 * frozen) & 0xFF
    return y2_from_sin_index(index)


def png_pixel_y2(png_bytes: bytes) -> int:
    from PIL import Image

    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    for y in range(72, 112):
        if im.getpixel((X_MARKER, y)) == GREEN_FIELD:
            return y - GREEN_FIELD_BASELINE
    raise AssertionError(f"green-field marker not found at x={X_MARKER}")


def run_trace_fresh(trace_path: Path) -> dict:
    oracle_url = os.environ.get(
        "POKEBENCH_MAIN_ORACLE_URL",
        os.environ.get("POKEBENCH_ORACLE_URL", "http://127.0.0.1:8014"),
    ).rstrip("/")
    trace = json.loads(trace_path.read_text())
    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp)
        cmd = [
            "bin/oracle",
            "run",
            str(trace_path),
            "-o",
            str(out_dir),
            "-q",
        ]
        env = dict(os.environ)
        env["POKEBENCH_ORACLE_URL"] = oracle_url
        env["POKEBENCH_MAIN_ORACLE_URL"] = oracle_url
        subprocess.run(cmd, cwd=ROOT, env=env, check=True, capture_output=True, text=True)
        manifest = json.loads((out_dir / "manifest.json").read_text())
        captures = {}
        for c in manifest["captures"]:
            png = (out_dir / c["file"]).read_bytes()
            captures[c["frame"]] = c["sha256"], png
    return captures


def main() -> int:
    failures = 0
    for trace_path in TRACES:
        name = trace_path.stem
        print(f"replaying {name} fresh...")
        freeze_schedule = TRACE_FREEZE_SCHEDULES[name]
        captures = run_trace_fresh(trace_path)
        # frame -> (sha, measured pixel y2)
        measured = {f: png_pixel_y2(png) for f, (_, png) in captures.items()}

        # 1. Every captured frame must match the freeze-schedule model.
        mism = [
            (f, measured[f], model_y2(f, freeze_schedule))
            for f in sorted(measured)
            if measured[f] != model_y2(f, freeze_schedule)
        ]
        if mism:
            failures += 1
            print(f"FAIL  {name}: {len(mism)} frames mismatch freeze-schedule model: {mism[:8]}")
        else:
            print(f"PASS  {name}: {len(measured)}/{len(measured)} captured frames match the freeze-schedule model")

        # 2. The freeze schedule must be real and observable: the no-freeze
        #    model must disagree with the measured pixels on at least one
        #    captured screen (the 2-frame submenu-open freeze shifts the whole
        #    post-reveal phase, so ~10+ screens in-window flip), while the
        #    freeze-schedule model agrees on all of them (check 1).
        def no_freeze_y2(screen_tick: int) -> int:
            ram = screen_tick - 1
            if ram < MENU_BOUNCE_RAM_SETUP_TICK:
                return 0
            index = (SEED_HEALTHBOX + 7 * (ram - MENU_BOUNCE_RAM_SETUP_TICK)) & 0xFF
            return y2_from_sin_index(index)

        observable = [
            f for f in sorted(measured)
            if no_freeze_y2(f) != measured[f] and model_y2(f, freeze_schedule) == measured[f]
        ]
        if observable:
            print(f"PASS  {name}: freeze schedule observable — no-freeze model wrong on {len(observable)} captured screens, e.g. {observable[:6]}")
        else:
            failures += 1
            print(f"FAIL  {name}: freeze schedule not observably different from the no-freeze model on any captured frame")
    if failures:
        print(f"VERDICT: FAIL ({failures} trace(s) with mismatches)")
        return 1
    print("VERDICT: PASS — battle-1 fight-menu bounce matches the documented freeze schedule (route-dependent, verdict (b))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
