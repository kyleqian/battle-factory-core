#!/usr/bin/env python3
"""Dev-time RAM probe: identify the Battle Factory battle-2 opponent trainer
that the WIN swap-offer NO route reaches on the far side of the guide
dismissal (ISSUES #73, next-battle boundary).

Replays the committed mechanicLab fixture
`tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`
verbatim (its 37+2-segment schedule = the proven 37-segment prefix plus one
held A dismissing the guide and the idle tail), stages it through the real
battle-lab `BattleLab.prepare` route, and reads `gTrainerBattleOpponent_A`
(plus the staged parties and intro-speech buffer) at frames around the
far-side held boundary (10756). No invented input, no transient battle
state injection.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-guide-dismiss-far-side-trainer.py <fresh-output.json>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")
OUTPUT_PATH = Path(sys.argv[1])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
FIXTURE_PATH = (
    WORKTREE_ROOT
    / "tools"
    / "battle-lab"
    / "scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json"
)


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab  # noqa: E402

ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

EXPECTED_CANONICAL_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"


def read_c_string(oracle: EmeraldOracle, addr: int, limit: int = 512) -> str:
    out = []
    for offset in range(limit):
        byte = oracle.read_u8(addr + offset)
        if byte == 0:
            break
        out.append(chr(byte))
    return "".join(out)


def main() -> None:
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(
            f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}, "
            f"expected {EXPECTED_CANONICAL_SHA256}"
        )
    fixture = json.loads(FIXTURE_PATH.read_text())
    request = {key: value for key, value in fixture.items() if key != "trace"}
    request.setdefault("rentalSwapCount", 0)
    request.setdefault("preCheckpointCaptureFrames", [])
    request.setdefault("preCheckpointCaptureAllFrames", False)
    lab = BattleLab(oracle, "battle-scene-off")
    setup = lab.prepare(request)

    samples = {}
    tick = 0
    for segment in fixture["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in (
                9020, 9030, 9040, 9041, 9042, 9043, 9044, 9045, 9046, 9047, 9050,
                9100, 9200, 9400, 9600, 9800, 9900, 10000, 10004, 10005, 10006,
                10406, 10724, 10756, 11308,
            ):
                samples[tick] = {
                    "gTrainerBattleOpponent_A": oracle.read_u16(
                        oracle.symbols["gTrainerBattleOpponent_A"]
                    ),
                    "gRngValue": oracle.read_u32(
                        oracle.symbols["gRngValue"]
                    ),
                }
                gsv4 = oracle.symbols.get("gStringVar4")
                if gsv4 is not None:
                    samples[tick]["gStringVar4"] = read_c_string(oracle, gsv4)
                gsv = oracle.symbols.get("gStringVar")
                if gsv is not None:
                    samples[tick]["gStringVar0"] = read_c_string(oracle, gsv)
                    samples[tick]["gStringVar1"] = read_c_string(oracle, gsv + 256)

    result = {
        "fixture": str(FIXTURE_PATH.relative_to(WORKTREE_ROOT)),
        "finalTick": tick,
        "canonicalScreenSha256": oracle.canonical_screen_sha256,
        "samples": samples,
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
