#!/usr/bin/env python3
"""Dense read-only Battle Scene OFF receipt + compact assertions for the
ITEMEFFECT_MOVE_END generic status-cure item family (Rank 1 of
docs/gate6-family-worklist.md; see docs/item-move-end-family-ground-truth.md
for the full source citations). Verifies that a held cure-berry (e.g. Cheri
Berry / HOLD_EFFECT_CURE_PAR, battle_util.c:3641-3649) clears a status the
acting move itself just inflicted, at that move's own Cmd_moveend
MOVEEND_ITEM_EFFECTS_ALL state (battle_script_commands.c:4330-4335), before
either battler's next turn -- and that a no-item control leaves the status
in place. Dense-frame capture pattern lifted from
tools/probe/probe-gate6-r7-r8-off.py.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <seed> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
SEED = int(sys.argv[2])
OUTPUT_PATH = Path(sys.argv[3])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0
STATUS1_PARALYSIS = 1 << 6


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


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    fixture["seed"] = SEED
    request = validate_request(fixture, PROFILE)
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    )
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    symbols = oracle.symbols

    def compact() -> dict:
        state = lab.snapshot()
        return {
            "rngValue": state["rngValue"],
            "opponent": {
                "status1": state["battlers"]["opponent"]["status1"],
                "status": state["battlers"]["opponent"]["status"],
                "item": state["battlers"]["opponent"]["item"],
                "hp": state["battlers"]["opponent"]["hp"],
                "pp": state["battlers"]["opponent"]["pp"],
            },
            "player": {
                "status1": state["battlers"]["player"]["status1"],
                "item": state["battlers"]["player"]["item"],
                "hp": state["battlers"]["player"]["hp"],
                "pp": state["battlers"]["player"]["pp"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "sha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
        }

    initial = compact()
    frames = []
    random_frames = []
    before = initial
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        frames.append({"frame": frame, **after})
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (rand_after - rand_before) & 0xFFFFFFFF
        if delta:
            random_frames.append({
                "frame": frame,
                "randomCalls": delta,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
            })
        before = after
        rand_before = rand_after

    final = compact()

    # Compact assertion summary: first frame each transition is observed.
    def first_frame(predicate):
        for row in frames:
            if predicate(row):
                return row["frame"]
        return None

    summary = {
        "paralysisAppliedFrame": first_frame(
            lambda r: r["opponent"]["status1"] & STATUS1_PARALYSIS
        ),
        "paralysisCuredFrame": first_frame(
            lambda r: not (r["opponent"]["status1"] & STATUS1_PARALYSIS)
            and any(
                f["frame"] < r["frame"]
                and f["opponent"]["status1"] & STATUS1_PARALYSIS
                for f in frames
            )
        ),
        "itemConsumedFrame": first_frame(
            lambda r, _init=initial: r["opponent"]["item"] != _init["opponent"]["item"]
        ),
        "finalOpponentStatus1": final["opponent"]["status1"],
        "finalOpponentItem": final["opponent"]["item"],
        "totalRandomCalls": sum(row["randomCalls"] for row in random_frames),
    }

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "sampledEveryTraceFrame": True,
        "initial": initial,
        "summary": summary,
        "randomFrames": random_frames,
        "frames": frames,
        "final": final,
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: {len(frames)} dense frames, "
        f"{summary['totalRandomCalls']} Random() calls, "
        f"paralysis applied@{summary['paralysisAppliedFrame']} "
        f"cured@{summary['paralysisCuredFrame']} "
        f"itemConsumed@{summary['itemConsumedFrame']} "
        f"finalStatus1={summary['finalOpponentStatus1']} "
        f"finalItem={summary['finalOpponentItem']}",
        flush=True,
    )


main()
