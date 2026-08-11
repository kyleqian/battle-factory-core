# Factory AI voluntary-switch receipts — B/C

ROM-only receipts for the staged `ShouldSwitch` probes described in
`docs/factory-ai-switch-scout.md` §7. Runs use the Battle Scene OFF
mechanic-lab builder and three complete legal party records per side. Each
case is run by `tools/probe/factory-ai-switch-receipt-b.py` through
`tools/run-mgba-probe.py`: a fast `sRandCount` pass identifies every draw
frame, then a fresh process single-steps only those frames to attribute
`Random()+2`'s caller/LR and LCG transition.

## B. Wonder Guard direct selector

Fixture: `tools/battle-lab/mechanic-factory-ai-switch-receipt-b-off.json`.
The player is Wonder Guard Shedinja; the active AI mon is Vaporeon with
Surf/Ice Beam/Toxic/Protect, none super effective against Bug/Ghost. AI party
index 1 is Blaze Charmander with Tackle/Growl/Smokescreen/Flamethrower, so its
only super-effective move is deliberately its fourth slot. Index 2 is Limber
Ditto. The player uses Protect and carries a Lum Berry only to keep the
two-turn input route alive; neither changes the selector state.

Initial staging used National-Dex-like `292` and was rejected by the evidence:
the built battler had Bug/Flying types and did not enter the Wonder Guard
helper. The source's actual `SPECIES_SHEDINJA` is `303`
(`include/constants/species.h`), and the lab correctly rejects `male` for it:
`overrides.parties.player[0].gender 'male' is not available for species 303`.
The committed fixture therefore uses source id `303`, `genderless`; it is a
complete legal party staging, not a substituted mechanic.

### Success parity — seed 1

Committed receipt:
`tools/probe/receipts/factory-ai-switch-receipt-b-success-seed-1.json`.

| Field | ROM observation |
| --- | --- |
| attributed caller + LR | `ShouldSwitchIfWonderGuard+0x1b5`, `0x08062e0d` |
| pre / post `gRngValue` | `0xcb7bc739` → `0xe97d91b8` |
| returned u16 / `%3` | `59773`, `1` |
| `AI_monToSwitchIntoId` | transiently writes `1` before controller consumption |
| chosen action | `B_ACTION_SWITCH` (`2`) |
| total command draw delta | `1` |

The selector draw is on trace frame 364, followed by the switch action on
frame 365. No active-move scan draw, setup draw, score-script draw, or final
move chooser draw occurs.

### Result-2 control — seed 5

Committed receipt:
`tools/probe/receipts/factory-ai-switch-receipt-b-control-seed-5.json`.

| Field | ROM observation |
| --- | --- |
| attributed caller + LR | `ShouldSwitchIfWonderGuard+0x1b5`, `0x08062e0d` |
| pre / post `gRngValue` | `0x5457c42e` → `0x10b8ec09` |
| returned u16 / `%3` | `4280`, `2` |
| `AI_monToSwitchIntoId` | remains sentinel `6` |
| chosen action | `B_ACTION_USE_MOVE` (`0`) |
| total command draw delta | `8` |

The control's remaining seven draws are four
`BattleAI_SetupAIData+0x83`, two `Cmd_if_random_less_than+0x7` score-script
draws, and the `ChooseMoveOrAction_Singles+0xf7` final chooser draw. Thus
`%3 == 2` fails the direct selector and reaches the ordinary move path.

### §7B prediction verdict

**Held exactly.** The active Vaporeon scan contributes zero draws; the only
candidate/move draw is Charmander index 1, move slot 3 Flamethrower. Result
`1` switches directly to index 1 with command delta 1; result `2` fails that
helper and invokes the move chooser. That observed first and only selector
draw pins party-major then move-major scan order.

Both committed JSON ledgers were reproduced byte-for-byte by a second fresh
`tools/run-mgba-probe.py` process. The wrapper reported its known teardown
SIGSEGV after successful JSON writes; it validated all four fresh outputs.
