#!/usr/bin/env python3
"""Dev-time RAM probe: `gBattleMons[0..1]` hp/maxHP/species at chosen ticks,
replayed against the **battle-scene-off** bootstrap (`factory-battle-scene-
off.json`), for ISSUES #62's E-2/D-2 discriminating HP-bar probe
(docs/issue62-hpbar-probe.md). Adapted from dump-battler-snapshot.py, which
uses the ON-profile default bootstrap and is therefore not tick-comparable
to the `tools/compare/fixtures/issue62-turn2-*.json` reproducers (both
declare `"oracleProfile": "battle-scene-off"`).

Run with the harness's mGBA-enabled interpreter (NOT system python3), through
the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-issue62-hpbar-battlemons-off.py <trace.json> <output.json> <tick1,tick2,...>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <tick1,tick2,...>")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = {int(x) for x in sys.argv[3].split(",")}

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
SINGLES_BATTLERS = 2


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

    def read_battler(idx: int) -> dict:
        base = gbm + idx * STRUCT_SIZE
        return {
            "species": u16(base + 0x00),
            "hp": u16(base + 0x28),
            "level": oracle.read_u8(base + 0x2A),
            "maxHP": u16(base + 0x2C),
        }

    def snapshot() -> dict:
        return {f"battler{i}": read_battler(i) for i in range(SINGLES_BATTLERS)}

    out = {}
    tick = 0
    if tick in TARGET_TICKS:
        out[tick] = snapshot()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                out[tick] = snapshot()

    OUTPUT_PATH.write_text(json.dumps(out, indent=0))


main()
