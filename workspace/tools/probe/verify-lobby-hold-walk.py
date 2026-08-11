#!/usr/bin/env python3
"""CONTINUOUS-HOLD WALK forensics verify: re-derive the §7 hold-walk model from
a fresh probe output and PASS/FAIL it against the committed ground truth.

The probe is tools/probe/dump-lobby-hold-walk.py run through
tools/run-mgba-probe.py over tools/battle-lab/scratch-loss-lobby-walk-probe.json
with a window covering the four holds (e.g. 5170-5475, pngSel "none").

Checks pinned against docs/factory-lobby-freeroam-ground-truth.md §7 (all
ticks canonical, grid coords = currentCoords, map = grid - 7):

  - input latency + turn: DOWN register 5172, turn 5173-5180 (act 33), the
    turn completes (heldMovementFinished) on 5180;
  - first step starts 5181 (cc flip to (11,16), spriteY 113, timer 1);
  - step cadence: ends 5196/5212/5228 (timer 16), next step starts the very
    next frame 5197/5213 (input re-arm, DoCB1_Overworld ordering);
  - rendered scroll lag: bg1vofs(T) = 40 + (T - 5181) for 5181..5229 (the
    displayed field scrolls 1px/frame one frame behind the player);
  - border block: 5229 act 25, cc stays (11,18), vofs frozen 88;
  - UP hold: turn 5273-5280, steps 5281/5297, settle 5313 (act 1, facing up);
  - LEFT hold: turn 5333-5340, steps 5341/5357/5373/5389, mid-step release
    5392 runs to completion 5404, settle 5405 (act 2, hofs 192 = -64);
  - second UP hold: turn 5413-5420, steps 5421/5437, settle 5453 (act 1).

Run (window 5170-5475, RAM-only):
    python3 tools/run-mgba-probe.py /tmp/hold-verify.json -- \
        python3 tools/probe/dump-lobby-hold-walk.py \
        /tmp/hold-verify.json tools/battle-lab/scratch-loss-lobby-walk-probe.json \
        5170 5475 none
    python3 tools/probe/verify-lobby-hold-walk.py /tmp/hold-verify.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Constants (constants/event_object_movement.h)
WALK_NORMAL_DOWN = 0x08
WALK_NORMAL_UP = 0x09
WALK_NORMAL_LEFT = 0x0A
WALK_IN_PLACE_FAST_DOWN = 0x21
WALK_IN_PLACE_FAST_UP = 0x22
WALK_IN_PLACE_FAST_LEFT = 0x23
WALK_IN_PLACE_NORMAL_DOWN = 0x19
FACE_UP = 0x01
FACE_DOWN = 0x00
FACE_LEFT = 0x02

# VOFS at free-roam idle (sVerticalCameraPan 32 + 8, field_camera.c:78)
VOFS_BASELINE = 40

checks: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    checks.append((name, ok, detail))


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} <probe-output.json>")
    data = json.loads(Path(sys.argv[1]).read_text())
    by_tick = {t["tick"]: t for t in data["ticks"]}

    def get(tick: int) -> dict | None:
        return by_tick.get(tick)

    # ------------------------------------------------------------------
    # DOWN hold (fixture register DOWN from 5172, 80 frames).
    # ------------------------------------------------------------------
    t = get(5172)
    if t is not None:
        check("DOWN press 5172 still idle (1-frame input latency)", t["movementActionId"] == FACE_UP, f"act={t['movementActionId']}")

    t = get(5173)
    if t is not None:
        check("DOWN turn starts 5173 (act 33)", t["movementActionId"] == WALK_IN_PLACE_FAST_DOWN, f"act={t['movementActionId']}")
        check("DOWN turn 5173 is turn pose (anim 8/2)", t["spriteAnimNum"] == 8 and t["spriteAnimCmdIndex"] == 2, f"anim={t['spriteAnimNum']}/{t['spriteAnimCmdIndex']}")

    t = get(5180)
    if t is not None:
        check("DOWN turn completes 5180 (fin=1)", t["heldMovementFinished"] == 1, f"fin={t['heldMovementFinished']}")

    t = get(5181)
    if t is not None:
        check(
            "step 1 starts 5181: cc flip, first pixel, timer=1",
            (t["x"], t["y"]) == (11, 16) and t["spriteY"] == 113 and t["spriteTimer"] == 1,
            f"cc=({t['x']},{t['y']}) sprY={t['spriteY']} timer={t['spriteTimer']}",
        )

    for end, nxt, tile in ((5196, 5197, (11, 17)), (5212, 5213, (11, 18))):
        te, tn = get(end), get(nxt)
        if te is not None and tn is not None:
            check(
                f"step ends {end} then next starts {nxt} SAME-frame-arm (no gap)",
                te["spriteTimer"] == 16 and te["heldMovementFinished"] == 1
                and tn["spriteTimer"] == 1 and (tn["x"], tn["y"]) == tile and tn["spriteY"] == te["spriteY"] + 1,
                f"end fin={te['heldMovementFinished']} timer={te['spriteTimer']}; next cc=({tn['x']},{tn['y']}) timer={tn['spriteTimer']} sprY={tn['spriteY']}",
            )

    te = get(5228)
    tn = get(5229)
    if te is not None and tn is not None:
        check(
            "step 3 ends 5228; 5229 = border block (act 25, cc frozen)",
            te["spriteTimer"] == 16 and tn["movementActionId"] == WALK_IN_PLACE_NORMAL_DOWN and (tn["x"], tn["y"]) == (11, 18),
            f"te timer={te['spriteTimer']}; 5229 act={tn['movementActionId']} cc=({tn['x']},{tn['y']})",
        )

    # Rendered scroll ramp: vofs(T) = 40 + (T - 5181) for 5181..5229 (1-frame lag).
    missing = 0
    bad = 0
    for T in range(5181, 5230):
        row = get(T)
        if row is None:
            missing += 1
            continue
        if row["bg1vofs"] != VOFS_BASELINE + (T - 5181):
            bad += 1
            if bad <= 3:
                check(f"scroll T={T}", False, f"vofs={row['bg1vofs']} want {VOFS_BASELINE + (T - 5181)}")
    if missing == 0 and bad == 0:
        check("rendered scroll vofs(T)=40+(T-5181) across all 49 ticks 5181..5229", True)
    elif bad > 0:
        check("rendered scroll vofs(T)=40+(T-5181) across all 49 ticks 5181..5229", False, f"{bad} bad ticks")

    # ------------------------------------------------------------------
    # UP hold (register UP from 5272, 40 frames).
    # ------------------------------------------------------------------
    t = get(5273)
    if t is not None:
        check("UP turn starts 5273 (act 34)", t["movementActionId"] == WALK_IN_PLACE_FAST_UP, f"act={t['movementActionId']}")

    t = get(5281)
    if t is not None:
        check(
            "UP step 1 starts 5281 (cc (11,17), sprY 159)",
            (t["x"], t["y"]) == (11, 17) and t["spriteY"] == 159 and t["spriteTimer"] == 1,
            f"cc=({t['x']},{t['y']}) sprY={t['spriteY']} timer={t['spriteTimer']}",
        )

    t = get(5297)
    if t is not None:
        check("UP step 2 starts 5297 (cc (11,16))", (t["x"], t["y"]) == (11, 16), f"cc=({t['x']},{t['y']})")

    t = get(5313)
    if t is not None:
        check("UP settles 5313 facing NORTH (act 1)", t["movementActionId"] == FACE_UP and t["runningState"] == 0, f"act={t['movementActionId']} run={t['runningState']}")

    # ------------------------------------------------------------------
    # LEFT hold (register LEFT from 5332, 60 frames; released mid-step 4).
    # ------------------------------------------------------------------
    t = get(5333)
    if t is not None:
        check("LEFT turn starts 5333 (act 35)", t["movementActionId"] == WALK_IN_PLACE_FAST_LEFT, f"act={t['movementActionId']}")

    for start, tile, sx in ((5341, (10, 16), 119), (5357, (9, 16), 103), (5373, (8, 16), 87), (5389, (7, 16), 71)):
        t = get(start)
        if t is not None:
            check(
                f"LEFT step {start}: cc {tile} sprX {sx}",
                (t["x"], t["y"]) == tile and t["spriteX"] == sx and t["spriteTimer"] == 1,
                f"cc=({t['x']},{t['y']}) sprX={t['spriteX']} timer={t['spriteTimer']}",
            )

    t = get(5404)
    if t is not None:
        check("LEFT mid-step release 5392: step 4 still runs to 5404 (16px)", t["spriteTimer"] == 16 and t["heldMovementFinished"] == 1, f"timer={t['spriteTimer']} fin={t['heldMovementFinished']}")

    t = get(5405)
    if t is not None:
        check("LEFT settles 5405 facing WEST, scroll catches up (hofs 192=-64)", t["movementActionId"] == FACE_LEFT and t["bg1hofs"] == 192, f"act={t['movementActionId']} hofs={t['bg1hofs']}")

    # ------------------------------------------------------------------
    # Second UP hold (register UP from 5412, 40 frames).
    # ------------------------------------------------------------------
    t = get(5413)
    if t is not None:
        check("UP-2 turn starts 5413 (act 34)", t["movementActionId"] == WALK_IN_PLACE_FAST_UP, f"act={t['movementActionId']}")

    for start, tile, sy in ((5421, (7, 15), 127), (5437, (7, 14), 111)):
        t = get(start)
        if t is not None:
            check(
                f"UP-2 step {start}: cc {tile} sprY {sy}",
                (t["x"], t["y"]) == tile and t["spriteY"] == sy and t["spriteTimer"] == 1,
                f"cc=({t['x']},{t['y']}) sprY={t['spriteY']} timer={t['spriteTimer']}",
            )

    t = get(5453)
    if t is not None:
        check("UP-2 settles 5453 facing NORTH (act 1)", t["movementActionId"] == FACE_UP and t["runningState"] == 0, f"act={t['movementActionId']} run={t['runningState']}")

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------
    failures = [c for c in checks if not c[1]]
    for name, ok, detail in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not ok else ""))
    print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
