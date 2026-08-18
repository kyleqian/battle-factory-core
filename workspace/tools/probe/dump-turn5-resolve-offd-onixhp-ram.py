#!/usr/bin/env python3
"""ISSUES #97 remainder, residual (B) mandatory pre-landing spot-check
(`docs/turn5-confirmb-resolved-residuals.md` §2.2's own caveat): before
landing `turn5OffSitrusOnixHp`'s proposed hard step at tick 6984, verify
ONIX's own `gBattleMons[1].hp` shape across 6975-6995 with a live RAM read
-- the doc's §2.2 only sampled two already-settled post-jump ticks
(6988/7005) and explicitly flagged the step-vs-short-ramp shape as
unconfirmed.

Adapted from dump-issue62-hpbar-battlemons-off.py (same struct layout,
same battle-scene-off bootstrap), replayed against
`tools/compare/traces/turn5-resolve-off-d.json` (this trace's own
segments already reach past tick 6995).

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-turn5-resolve-offd-onixhp-ram.py \\
        tools/compare/traces/turn5-resolve-off-d.json <output.json> 6975-6995
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick-endTick>")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
_start, _end = sys.argv[3].split("-")
TARGET_TICKS = set(range(int(_start), int(_end) + 1))

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

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

# struct BattlePokemon (include/pokemon.h): sizeof == 0x58.
STRUCT_SIZE = 0x58
# battler0 is ONIX -- confirmed by dump-turn5-resolve-grovyle-side-driver.py's
# own "battler0_onix" field name against the same bootstrap/trace family.
ONIX_BATTLER_IDX = 0


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    if trace.get("oracleProfile") != "battle-scene-off":
        raise ValueError(f"{TRACE_PATH} is not a battle-scene-off trace")
    segments = trace["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    gbm = oracle.symbols["gBattleMons"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def read_hp() -> int:
        base = gbm + ONIX_BATTLER_IDX * STRUCT_SIZE
        return u16(base + 0x28)

    out = {}
    tick = 0
    if tick in TARGET_TICKS:
        out[tick] = read_hp()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                out[tick] = read_hp()

    OUTPUT_PATH.write_text(json.dumps(out, indent=0, sort_keys=True))


main()
