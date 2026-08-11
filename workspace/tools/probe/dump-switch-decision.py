#!/usr/bin/env python3
"""Dev-time RAM probe for docs/faint-switch-notes.md's "why Pidgeotto, not
Murkrow" question (§13 open item 1 in docs/battle-turn-notes.md).

`GetMostSuitableMonToSwitchInto` (reference/pokeemerald/src/
battle_ai_switch_items.c:629) scores switch-in *candidates* that haven't
been sent out yet, so they live in `gEnemyParty`/`gPlayerParty` (party
format), not `gBattleMons` (battle format, only the *active* battler slots
are populated). Two tricks used here to avoid decrypting `gEnemyParty`'s
encrypted+shuffled substructures:

1. `struct Pokemon` (include/pokemon.h:219-232, the *party* format, as
   opposed to `struct BoxPokemon`) caches level/hp/maxHP/attack/defense/
   speed/spAttack/spDefense as **plaintext** fields appended after the
   encrypted `struct BoxPokemon box` member - `GetMonData` returns these
   directly without touching the encrypted substructures. Empirically
   located (not hand-derived from struct padding, which was tried first
   and got the offsets wrong by shifting everything +4 bytes vs the real
   layout - the compiler doesn't insert the padding a naive read of the
   struct fields suggests): `sizeof(struct BoxPokemon) == 0x50`, then
   status(u32)@0x50, level(u8)@0x54, mail(u8)@0x55, hp(u16)@0x56,
   maxHP(u16)@0x58, attack(u16)@0x5A, defense(u16)@0x5C, speed(u16)@0x5E,
   spAttack(u16)@0x60, spDefense(u16)@0x62; `sizeof(struct Pokemon) == 0x64`
   confirmed both by the gap to the next party slot and by an exact
   byte-for-byte match against `gPlayerParty[0]` (Onix)'s already-known
   RAM values (attack 51, defense 187, speed 76, spAttack 36, spDefense 72,
   level 50) at every tick checked.
2. The opponent's actual party (species + moveset) is **not** the
   `gSaveBlock2Ptr->frontier.rentalMons[3..5]` array `dump-rentalmons.py`'s
   own docstring describes (that array turns out to hold the *player-facing
   6-slot draft pool* for the entire battle in this trace, unrelated to
   DESTIN's own preset-trainer party) - it's `gFrontierTempParty[0..2]`
   (`GenerateOpponentMons`, battle_factory.c:303-377), a `u16[]` of
   `monId` indices into `gFacilityTrainerMons` (== `gBattleFrontierMons`,
   src/data/battle_frontier/battle_frontier_mons.h) - the same table that
   gives each `FRONTIER_MON_*` id its `species`/`moves`/`itemTableId`.
   Confirmed durable input data, not itself RAM (no need to re-probe): monId
   188/184/135 decode via include/constants/battle_frontier_mons.h to
   FRONTIER_MON_GROVYLE_1/MURKROW_1/PIDGEOTTO, and the resulting moveset
   for Grovyle and Pidgeotto (the two RAM-readable via gBattleMons, since
   both occupy the active battler1 slot at different ticks) matches this
   session's own gBattleMons reads bit-exact - see docs/faint-switch-notes.md.

Also dumps a dense per-tick ledger of `gCurrentMove`/`gActiveBattler`
across the switch-decision window: `GetMostSuitableMonToSwitchInto`'s own
damage-fallback loop (battle_ai_switch_items.c:772-786) calls
`AI_CalcDmg(gActiveBattler, opposingBattler)` then
`TypeCalc(move, gActiveBattler, opposingBattler)` per candidate move, but
`AI_CalcDmg` -> `CalculateBaseDamage` reads the *global* `gCurrentMove`
for the move's power/other properties, not the loop's own local `move` -
this ledger checks whether `gCurrentMove` sits pinned to Onix's last-used
move (ROCK_SLIDE, 157) across tick boundaries during the decision window
(it does, every tick 6400-6683 sampled here reads 157) - see the dossier
for why this doesn't fully resolve the puzzle (tick-level sampling can't
rule out same-frame writes-then-reverts).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-switch-decision.py <trace.json> <output.json> \
        <partyStatsTick> <ledgerStartTick> <ledgerEndTick>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 6:
    raise SystemExit(
        f"usage: {sys.argv[0]} <trace.json> <output.json> "
        "<partyStatsTick> <ledgerStartTick> <ledgerEndTick>"
    )
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
PARTY_STATS_TICK = int(sys.argv[3])
LEDGER_START = int(sys.argv[4])
LEDGER_END = int(sys.argv[5])

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

# From `bin/oracle symbols gEnemyParty gPlayerParty gFrontierTempParty gCurrentMove gActiveBattler`.
GENEMYPARTY = 0x02024744
GPLAYERPARTY = 0x020244EC
GFRONTIERTEMPPARTY = 0x03006298
GCURRENTMOVE = 0x020241EA
GACTIVEBATTLER = 0x02024064
PARTY_MON_SIZE = 0x64  # sizeof(struct Pokemon), empirically confirmed (see module docstring)


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def mon_stats(base: int) -> dict:
        return {
            "level": oracle.read_u8(base + 0x54),
            "hp": u16(base + 0x56),
            "maxHP": u16(base + 0x58),
            "attack": u16(base + 0x5A),
            "defense": u16(base + 0x5C),
            "speed": u16(base + 0x5E),
            "spAttack": u16(base + 0x60),
            "spDefense": u16(base + 0x62),
        }

    def party_snapshot() -> dict:
        return {
            "playerParty0": mon_stats(GPLAYERPARTY + 0 * PARTY_MON_SIZE),
            "enemyParty0": mon_stats(GENEMYPARTY + 0 * PARTY_MON_SIZE),
            "enemyParty1": mon_stats(GENEMYPARTY + 1 * PARTY_MON_SIZE),
            "enemyParty2": mon_stats(GENEMYPARTY + 2 * PARTY_MON_SIZE),
            "frontierTempParty": [u16(GFRONTIERTEMPPARTY + 2 * i) for i in range(3)],
        }

    ledger = []
    party_stats = None
    last_ledger_entry = None
    tick = 0

    def maybe_record():
        nonlocal party_stats, last_ledger_entry
        if tick == PARTY_STATS_TICK:
            party_stats = party_snapshot()
        if LEDGER_START <= tick <= LEDGER_END:
            entry = (u16(GCURRENTMOVE), oracle.read_u8(GACTIVEBATTLER))
            if entry != last_ledger_entry:
                ledger.append({"tick": tick, "gCurrentMove": entry[0], "gActiveBattler": entry[1]})
                last_ledger_entry = entry

    maybe_record()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            maybe_record()

    OUTPUT_PATH.write_text(
        json.dumps({"partyStatsTick": PARTY_STATS_TICK, "partyStats": party_stats, "gCurrentMoveLedger": ledger}, indent=2)
    )


main()
