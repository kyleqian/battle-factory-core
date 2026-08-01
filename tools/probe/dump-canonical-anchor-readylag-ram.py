#!/usr/bin/env python3
"""ISSUES #56 item 1 probe: RAM-read a Factory intro's opponent/player
controller state machine (`Intro_TryShinyAnimShowHealthbox`,
`battle_controller_opponent.c:292-383` and its player-side twin
`battle_controller_player.c:979-1063`) across the release/ready boundary, to
name the completion-to-`CONTROLLER_CHOOSEACTION` dispatch and opponent-AI
resolution tail behind the command-menu-ready transition.

With no fixture argument, this replays the REAL canonical route:
`tools/compare/traces/interactive-generated-intro-off.json` (`sourceTrace` =
`traces-groundtruth/battle1-intro.json`'s own first 34 segments,
`appendSegments` = the committed 98-wait/2-A/400-wait tail). With an optional
fixture argument, it instead drives a complete legal `factoryLegal` request
through `BattleLab.prepare()` and records the identical signals. This lets
the canonical and staged routes be compared without changing the watcher.

RAM signals recorded every frame (`struct BattleHealthboxInfo`,
`reference/pokeemerald/include/battle.h:553-578`; bitfield-packed 2 bytes
then plain u8 fields, confirmed against the source's own `// 0x8`/`x10`/`x20`/
`x40` comments on the first byte's fields):
  - `gBattleControllerExecFlags` (u32, `battle_main.c:156`): per-battler busy
    bit; the source's own gate for "every controller signalled completion"
    (`if (gBattleControllerExecFlags == 0)`, `battle_main.c:3707-3713` is the
    exact `BattleIntroPrintPlayerSendsOut` site the existing code comment at
    `battleScene.ts:4183-4184` cites).
  - `gBattleSpritesDataPtr->healthBoxesData[battler]` byte0 (ballAnimActive
    0x08) and byte1 (finishedShinyMonAnim 0x01, bgmRestored 0x20, waitForCry
    0x40, healthboxSlideInStarted 0x80) for battler 0 (player/ONIX) and
    battler 1 (opponent/GROVYLE per the probe-1 doc's own corroboration).

`bgmRestored`'s persistent flag rising 0->1 is the exact tick
`!waitForCry && !IsCryPlayingOrClearCrySongs()` first holds (cry has
finished playing) for that battler; falling 1->0 is the tick the *whole*
`Intro_TryShinyAnimShowHealthbox` gate closes (`bgmRestored && battlerAnimsDone`
both true in the same call, i.e. real controller-completion, not just the
cry gate) - the two together directly discriminate "cry gate opens but
sprite anim isn't done yet" (multi-tick plateau) from "cry is the binding
constraint" (rise and fall coincide).

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-canonical-anchor-readylag-ram.py <fresh-output.json>
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-canonical-anchor-readylag-ram.py <fresh-output.json> \\
        tools/battle-lab/factory-onix-readylag-off.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 3):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [factory-legal-fixture.json]")
OUTPUT_PATH = Path(sys.argv[1])
FIXTURE_PATH = Path(sys.argv[2]).resolve() if len(sys.argv) == 3 else None

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
from battle_lab import BattleLab, validate_request  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

COMPARE_TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "interactive-generated-intro-off.json"
GROUNDTRUTH_DIR = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth"

# Same cross-check other probes in this tree use: battle-scene-off's bootstrap
# is byte-identical to battle-scene-on's at frame 0.
EXPECTED_CANONICAL_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

# Record from this frame onward (well before GENERATED_BATTLE_INTRO_SOURCE_
# CLOCK_ORIGIN=1048, the app's own source-clock origin for this exact trace's
# numbering) through the end of the replay.
RECORD_FROM_FRAME = 900

BATTLE_SPRITES_DATA_PTR = 0x020244D0
EXEC_FLAGS = 0x02024068
ACTIVE_BATTLER = 0x02024064
BATTLERS_COUNT = 0x0202406C
BATTLE_MAIN_FUNC = 0x03005D04
SIZEOF_HEALTHBOX_INFO = 12
HEALTHBOXES_PTR_OFFSET = 4  # struct BattleSpriteData.healthBoxesData, 2nd ptr


def build_segments() -> list[dict]:
    trace_file = json.loads(COMPARE_TRACE_PATH.read_text())
    source_path = (GROUNDTRUTH_DIR / Path(trace_file["sourceTrace"]).name).resolve()
    source = json.loads(source_path.read_text())
    source_segments = source["segments"][: trace_file["sourceSegmentCount"]]
    return [*source_segments, *trace_file["appendSegments"]]


def main() -> None:
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(
            f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}, "
            f"expected {EXPECTED_CANONICAL_SHA256} - the bootstrap anchor has drifted"
        )
    rows: list[dict] = []

    def record() -> None:
        if oracle.frame < RECORD_FROM_FRAME:
            return
        sprites_ptr = oracle.read_u32(BATTLE_SPRITES_DATA_PTR)
        healthboxes_ptr = (
            oracle.read_u32(sprites_ptr + HEALTHBOXES_PTR_OFFSET) if sprites_ptr else 0
        )
        row = {
            "frame": oracle.frame,
            "gActiveBattler": oracle.read_u8(ACTIVE_BATTLER),
            "gBattlersCount": oracle.read_u8(BATTLERS_COUNT),
            "gBattleControllerExecFlags": oracle.read_u32(EXEC_FLAGS),
            "gBattleMainFunc": oracle.read_u32(BATTLE_MAIN_FUNC),
            "healthbox": {},
        }
        if healthboxes_ptr:
            for battler in (0, 1):
                base = healthboxes_ptr + battler * SIZEOF_HEALTHBOX_INFO
                byte0 = oracle.read_u8(base)
                byte1 = oracle.read_u8(base + 1)
                row["healthbox"][str(battler)] = {
                    "ballAnimActive": bool(byte0 & 0x08),
                    "triedShinyMonAnim": bool(byte0 & 0x80),
                    "finishedShinyMonAnim": bool(byte1 & 0x01),
                    "bgmRestored": bool(byte1 & 0x20),
                    "waitForCry": bool(byte1 & 0x40),
                    "healthboxSlideInStarted": bool(byte1 & 0x80),
                }
        rows.append(row)

    source: dict
    if FIXTURE_PATH is None:
        oracle.new_session()
        segments = build_segments()
        total_frames = sum(int(s["frames"]) for s in segments)
        for segment in segments:
            buttons = segment.get("buttons", [])
            for _ in range(int(segment["frames"])):
                oracle.advance(buttons)
                record()
        source = {
            "kind": "canonical-segments",
            "compareTrace": str(COMPARE_TRACE_PATH.relative_to(WORKTREE_ROOT)),
            "sourceSegmentCount": len(segments) - 3,
            "appendSegments": segments[-3:],
        }
    else:
        fixture = json.loads(FIXTURE_PATH.read_text())
        original_advance = oracle.advance

        def recording_advance(buttons):
            original_advance(buttons)
            record()

        oracle.advance = recording_advance  # type: ignore[method-assign]
        oracle.new_session()
        lab = BattleLab(oracle, "battle-scene-off")
        request = validate_request(fixture, "battle-scene-off")
        lab.prepare(request)
        # BattleLab restores its prepared checkpoint after collecting the
        # pre-checkpoint series, so oracle.frame is back at zero here. The
        # watcher rows retain the absolute prepare-frame coordinate.
        total_frames = rows[-1]["frame"] if rows else 0
        try:
            fixture_name = str(FIXTURE_PATH.relative_to(WORKTREE_ROOT))
        except ValueError:
            fixture_name = str(FIXTURE_PATH)
        source = {"kind": "factoryLegal", "fixture": fixture_name}

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "source": source,
        "totalFrames": total_frames,
        "recordFromFrame": RECORD_FROM_FRAME,
        "canonicalScreenSha256": oracle.canonical_screen_sha256,
        "rows": rows,
    }, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} rows, totalFrames={total_frames})")


main()
