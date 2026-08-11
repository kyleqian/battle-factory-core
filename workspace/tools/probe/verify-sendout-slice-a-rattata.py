#!/usr/bin/env python3
"""ISSUES #71 Slice A positive-case verify: re-derive the settle tick, the
settled x2/y2, and the persistence claims from a FRESH probe of
tools/battle-lab/send-out-slice-a-rattata-off.json (RATTATA opponent lead,
Battle Scene OFF), and print PASS/FAIL per check.

The RATTATA front sprite lives in battler slot 1 (`gBattlerSpriteIds[1]`,
`data[2] == 19` identifies species RATTATA). Coordinate spaces:
  phase "pre"  = absolute frame from new_session() (the internal battle-start
                 route incl. the send-out; the settle happens here);
  phase "post" = relative frame after the action-menu checkpoint (user trace).

Checks (per the acceptance brief):
  (a) settle tick = the last pre tick where the sprite's callback is not
      SpriteCallbackDummy (the ball-arrival `SpriteCB_OpponentMonFromBall`
      bounce) — from the final dummy callback on, x2/y2 never change. The
      fixture's measured value is pre-tick 1616 (x2/y2 stabilize at 1612).
  (b) settled x2/y2 = {0,0} — REFUTES `speciesFrontIdleRestOffset`'s
      `{x2:1,y2:0}` claim for live Battle-Scene-OFF play.
  (c) persistence: x2=0/y2=0/SpriteCallbackDummy for every post tick (1..634),
      which spans a full turn and 200+ ticks past the settle.
  (d) x2 stays 0 for the sprite's entire life; the y2 trajectory through the
      intro is a single 16-tick descent 0,14,13,...,0 over pre-ticks
      1599-1612.

A missing or shortened capture set FAILS loudly (never passes silently).

Run (fresh probe, ~1-2 min):
    python3 tools/probe/verify-sendout-slice-a-rattata.py
Or re-validate an existing probe output:
    python3 tools/probe/verify-sendout-slice-a-rattata.py /tmp/sa-probe.json
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
SCENARIO = WORKTREE_ROOT / "tools/battle-lab/send-out-slice-a-rattata-off.json"
DUMP_PROBE = HERE / "dump-sendout-slice-a-rattata.py"

SETTLE_TICK_EXPECTED = 1616
CREATION_TICK_EXPECTED = 1581
RATTATA_SPECIES = 19
POST_END_EXPECTED = 634
BOUNCE_START_EXPECTED = 1599
Y2_BOUNCE_EXPECTED = [0, 14, 13, 12, 11, 10, 9, 8, 7, 5, 4, 3, 2, 0]

DUMMY = "SpriteCallbackDummy"

checks: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    checks.append((name, ok, detail))


def run_fresh_probe() -> dict:
    """Run the RAM probe through run-mgba-probe.py into a fresh temp file and
    return the parsed JSON (parsed inside the temp dir's lifetime)."""
    with tempfile.TemporaryDirectory(prefix="sa-verify-") as tmp:
        output = Path(tmp) / "probe.json"
        # The literal "python3" lets run-mgba-probe.py route the probe through
        # the harness's mGBA venv (vendor/mgba-venv/bin/python3) itself.
        command = [
            sys.executable,
            str(WORKTREE_ROOT / "tools/run-mgba-probe.py"),
            str(output),
            "--",
            "python3",
            str(DUMP_PROBE),
            str(SCENARIO),
            str(output),
        ]
        proc = subprocess.run(command, capture_output=True, text=True, timeout=600)
        if not output.is_file():
            raise SystemExit(
                "probe did not write output; probe stdout tail:\n"
                + (proc.stdout[-2000:] or "none")
                + "\nstderr tail:\n"
                + (proc.stderr[-2000:] or "none")
            )
        try:
            return json.loads(output.read_text())
        except json.JSONDecodeError as error:
            raise SystemExit(f"probe output is not valid JSON: {error}") from error


def main() -> int:
    if len(sys.argv) == 2:
        data = json.loads(Path(sys.argv[1]).read_text())
    elif len(sys.argv) == 1:
        print("running fresh probe (this takes ~1-2 min)...")
        data = run_fresh_probe()
    else:
        raise SystemExit(
            f"usage: {sys.argv[0]} [probe-output.json] "
            "(default: run the probe fresh)"
        )

    rows = data.get("ticks")
    if not isinstance(rows, list) or not rows:
        raise SystemExit("FAIL: probe output has no tick rows (missing capture)")
    pre = {r["tick"]: r for r in rows if r.get("phase") == "pre"}
    post = {r["tick"]: r for r in rows if r.get("phase") == "post"}

    check("probe sampled the full pre route", bool(pre), f"{len(pre)} pre rows")
    check("probe sampled the full post trace", bool(post), f"{len(post)} post rows")

    if not pre or not post:
        failures = [c for c in checks if not c[1]]
        for name, ok, detail in checks:
            print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))
        print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed")
        return 1

    # ---- creation tick (a): first pre row carrying species 19 ----
    creation = next((t for t in sorted(pre) if pre[t]["battler1"]["data2"] == RATTATA_SPECIES), None)
    check("RATTATA sprite creation tick", creation == CREATION_TICK_EXPECTED,
          f"creation={creation} want {CREATION_TICK_EXPECTED}")

    # ---- settle tick (a): last pre tick whose callback is not dummy ----
    last_non_dummy = max(
        (t for t in sorted(pre) if pre[t]["battler1"]["callbackSymbol"] != DUMMY),
        default=None,
    )
    settle = None
    if last_non_dummy is not None:
        after = [t for t in sorted(pre) if t > last_non_dummy]
        if after and all(pre[t]["battler1"]["callbackSymbol"] == DUMMY for t in after):
            settle = last_non_dummy + 1
    check("settle tick derived", settle == SETTLE_TICK_EXPECTED,
          f"settle={settle} want {SETTLE_TICK_EXPECTED}")

    # ---- (b) settled x2/y2: from settle onward, x2=0 y2=0 forever ----
    x2_bad = []
    y2_bad = []
    for t in sorted(pre):
        if t < settle:
            continue
        b1 = pre[t]["battler1"]
        if b1["x2"] != 0:
            x2_bad.append((t, b1["x2"]))
        if b1["y2"] != 0:
            y2_bad.append((t, b1["y2"]))
    for t in sorted(post):
        b1 = post[t]["battler1"]
        if b1["x2"] != 0:
            x2_bad.append((t, b1["x2"]))
        if b1["y2"] != 0:
            y2_bad.append((t, b1["y2"]))
    check("settled x2 == 0 for all post-settle ticks", not x2_bad,
          f"{x2_bad[:5]} ..." if x2_bad else "0 deviations")
    check("settled y2 == 0 for all post-settle ticks", not y2_bad,
          f"{y2_bad[:5]} ..." if y2_bad else "0 deviations")

    # x2 never leaves 0 for the sprite's entire life (creation onward).
    x2_life = [(t, pre[t]["battler1"]["x2"]) for t in sorted(pre)
               if t >= creation and pre[t]["battler1"]["x2"] != 0]
    check("x2 == 0 for the sprite's entire life", not x2_life,
          f"{x2_life[:5]} ..." if x2_life else "0 deviations")

    # ---- (c) persistence across all post ticks (200+ past settle, full turn) ----
    bad_post = []
    for t in sorted(post):
        b1 = post[t]["battler1"]
        if (b1["data2"], b1["x2"], b1["y2"], b1["callbackSymbol"]) != (
            RATTATA_SPECIES, 0, 0, DUMMY,
        ):
            bad_post.append((t, b1))
    check("post ticks fully sampled 1..end", max(post) == POST_END_EXPECTED
          and set(range(1, POST_END_EXPECTED + 1)) <= set(post),
          f"post range {min(post)}..{max(post)} want 1..{POST_END_EXPECTED}")
    check("persistence: all post ticks flat (19,0,0,dummy)", not bad_post,
          f"{[(t, b['x2'], b['y2'], b['callbackSymbol']) for t, b in bad_post[:5]]}"
          if bad_post else f"{len(post)}/634 post ticks clean")

    # ---- (d) y2 trajectory through the intro (the ball-arrival bounce) ----
    got_bounce = [pre[t]["battler1"]["y2"] for t in
                  range(BOUNCE_START_EXPECTED, BOUNCE_START_EXPECTED + len(Y2_BOUNCE_EXPECTED))]
    check("y2 intro trajectory matches 16-tick descent",
          got_bounce == Y2_BOUNCE_EXPECTED,
          f"got {got_bounce} want {Y2_BOUNCE_EXPECTED}")

    # ---- report ----
    failures = [c for c in checks if not c[1]]
    for name, ok, detail in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not ok else ""))
    print(f"\n{len(checks) - len(failures)}/{len(checks)} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
