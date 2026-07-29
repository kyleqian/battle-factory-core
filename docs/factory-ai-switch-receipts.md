# Factory AI voluntary-switch receipts

ROM-only receipts for the staged `ShouldSwitch` probes in
`docs/factory-ai-switch-scout.md` §7. All runs use the Battle Scene OFF
mechanic-lab builder's three complete legal party records per side, and the
self-timing trace's 2-frame `A` pulse followed by 18 released frames. The
probe is `tools/probe/factory-ai-switch-receipt-a.py`; it follows the existing
two-pass `sRandCount`/single-step method and is always invoked through
`tools/run-mgba-probe.py` in a fresh process.

## A. Absorber one-draw switch

Fixture: `tools/battle-lab/mechanic-factory-ai-switch-receipt-a-off.json`.
Player active is Torrent Blastoise with four Water Guns. The AI has Static
Raichu active, Water Absorb Vaporeon at party index 1, and Limber Ditto at
index 2; Raichu/Vaporeon have four Swifts, so neither has a move super
effective against Water Blastoise. Water Gun lands before the measured AI
command, leaving `lastLandedMoves[1] = WATER_GUN` and `lastHitBy[1] = 0`.

### Success — seed 2

Committed ledger:
`tools/probe/receipts/factory-ai-switch-receipt-a-success-seed-2.json`.

| Field | ROM observation |
| --- | --- |
| attributed caller | `FindMonThatAbsorbsOpponentsMove+0x249` (LR `0x0806309d`) |
| pre / post `gRngValue` | `0xf69f135c` → `0xcec9a69f` |
| returned u16 / parity | `52937`, odd (`Random() & 1 = 1`) |
| `AI_monToSwitchIntoId` | transiently writes `1` before controller consumption |
| chosen action | `B_ACTION_SWITCH` (`2`) |
| total command draw delta | `1` |

There is no active-SE reluctance draw, no setup draw, and no tie draw. A
second fresh-process run produced a byte-identical JSON ledger (`cmp` against
the committed receipt).

### Even control — seed 1

Committed ledger:
`tools/probe/receipts/factory-ai-switch-receipt-a-control-seed-1.json`.

| Field | ROM observation |
| --- | --- |
| attributed caller | `FindMonThatAbsorbsOpponentsMove+0x249` (LR `0x0806309d`) |
| pre / post `gRngValue` | `0xde17efe2` → `0xc6145fad` |
| returned u16 / parity | `50708`, even (`Random() & 1 = 0`) |
| `AI_monToSwitchIntoId` | remains sentinel `6` |
| chosen action | `B_ACTION_USE_MOVE` (`0`) |
| total command draw delta | `6` |

The control's six draws are exactly the failed absorber coin, four
`BattleAI_SetupAIData+0x83` draws, and the
`ChooseMoveOrAction_Singles+0xf7` final tie draw. Thus its ordinary five-draw
move ledger is shifted by exactly `+1`; Vaporeon's non-SE Swift prevents a
later NVE fallback draw. A second fresh-process run also produced a
byte-identical JSON ledger.

### §1.4 prediction verdict

**Held exactly.** The isolated odd coin switches directly to party index 1
with command delta 1. The even coin does not select the absorber and instead
continues into the ordinary move ledger with precisely one additional draw.

The wrapper reported its known libmgba teardown SIGSEGV after each successful
JSON write; `tools/run-mgba-probe.py` validated the newly written JSON in all
four runs.
