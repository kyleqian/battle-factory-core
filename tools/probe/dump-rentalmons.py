#!/usr/bin/env python3
"""Dev-time RAM probe: gSaveBlock2Ptr->frontier.rentalMons[6] (the Battle
Factory's own rental-mon bookkeeping array, include/global.h's
`struct RentalMon rentalMons[FRONTIER_PARTY_SIZE * 2]`), at a chosen set of
ticks along a replayed button script.

OFFSET GOTCHA (the reason a prior session's probe was deleted, see
docs/battle-turn-notes.md §17): include/global.h's field-offset comments
inside `struct BattleFrontier` (e.g. `/*0xE70*/ struct RentalMon
rentalMons[...]`) are pret's usual convention of annotating the offset
**within the top-level SaveBlock2**, not relative to `frontier` itself -
proven by `struct BattleFrontier`'s own first field, `towerPlayer`, being
commented `/*0x64C*/`, which is exactly `SaveBlock2.frontier`'s own offset
(global.h:541) - if the comment were BattleFrontier-relative it would read
`/*0x0*/`. So the correct address is
`*gSaveBlock2Ptr + 0xE70` (rentalMons' own absolute comment), NOT
`*gSaveBlock2Ptr + 0x64C + 0xE70` (the double-counted bug this replaces).
Same rule applied below to challengeStatus/selectedPartyMons/
curChallengeBattleNum, kept as a plausibility side-check.

`struct RentalMon` (global.h:357-365): u16 monId; (2 bytes pad to align the
following u32); u32 personality; u8 ivs; u8 abilityNum; (2 bytes pad to
round the struct to a 4-byte multiple) -> sizeof == 0xC, confirmed by the
gap to the next field (`battlePoints` at 0xEB8 - rentalMons at 0xE70 ==
0x48 == 6*0xC).

rentalMons[0..2] are the player's own current party (by rental-pool index,
`battle_factory.c`'s `GenerateInitialRentalMons`/`SetPlayerAndOpponentParties`);
rentalMons[3..5] are the opponent's. A swap
(`CopySwappedMonData`, battle_factory_screen.c:2350-2361) overwrites
rentalMons[playerMonId] with rentalMons[enemyMonId + FRONTIER_PARTY_SIZE]'s
monId/ivs, and personality/abilityNum read fresh off the swapped-in
`gEnemyParty` mon.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-rentalmons.py <trace.json> <output.json> <tick1,tick2,...>
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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

# All offsets below are absolute within SaveBlock2 (see module docstring).
RENTAL_MONS_OFFSET = 0xE70
RENTAL_MON_SIZE = 0xC
RENTAL_MON_COUNT = 6  # FRONTIER_PARTY_SIZE * 2
CHALLENGE_STATUS_OFFSET = 0xCA8
SELECTED_PARTY_MONS_OFFSET = 0xCAA
CUR_CHALLENGE_BATTLE_NUM_OFFSET = 0xCB2


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    saveblock2_ptr_addr = oracle.symbols["gSaveBlock2Ptr"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def u32(addr: int) -> int:
        return (
            oracle.read_u8(addr)
            | (oracle.read_u8(addr + 1) << 8)
            | (oracle.read_u8(addr + 2) << 16)
            | (oracle.read_u8(addr + 3) << 24)
        )

    def snapshot() -> dict:
        base = oracle.read_u32(saveblock2_ptr_addr)
        rental_mons = []
        for i in range(RENTAL_MON_COUNT):
            entry_base = base + RENTAL_MONS_OFFSET + i * RENTAL_MON_SIZE
            rental_mons.append(
                {
                    "monId": u16(entry_base + 0x0),
                    "personality": u32(entry_base + 0x4),
                    "ivs": oracle.read_u8(entry_base + 0x8),
                    "abilityNum": oracle.read_u8(entry_base + 0x9),
                }
            )
        return {
            "saveBlock2Base": base,
            "rentalMons": rental_mons,
            "challengeStatus": oracle.read_u8(base + CHALLENGE_STATUS_OFFSET),
            "selectedPartyMons": [
                u16(base + SELECTED_PARTY_MONS_OFFSET + 2 * i) for i in range(3)
            ],
            "curChallengeBattleNum": u16(base + CUR_CHALLENGE_BATTLE_NUM_OFFSET),
        }

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
