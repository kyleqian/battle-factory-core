# FIRE PUNCH burn lifecycle — Battle Scene OFF checkpoint

This is a SIDE-lane source-and-oracle checkpoint for the generic successful
secondary-burn path. It adds no production interpreter, controller, or
presentation code.

[`mechanic-fire-punch-burn-lifecycle-off.json`](../tools/battle-lab/mechanic-fire-punch-burn-lifecycle-off.json)
uses `mechanicLab` `overrides.parties`, so the ROM constructs **three complete
legal party records per side before battle initialization**. No HP, status,
stages, weather, turn result, or controller state is injected.

- Player lead: level-50 MAGBY (species 240), legal `FIRE_PUNCH` in slot 0;
  its source learnset gains it at level 19
  (`reference/pokeemerald/src/data/pokemon/level_up_learnsets.h:3276-3286`).
- Opponent lead: level-50 WAILMER (species 313; constant at
  `reference/pokeemerald/include/constants/species.h:317-320`) with legal
  `SPLASH` in all four slots. The repeated legal move constrains the Factory
  AI without injecting its action. Wailmer gets Splash at level 1
  (`level_up_learnsets.h:4091-4104`).
- Wailmer uses `abilitySlot: 1`, its source `ABILITY_OBLIVIOUS` rather than
  slot-0 `ABILITY_WATER_VEIL` (`species_info.h:8699-8724`), so the burn is
  permitted. MAGBY/WAILMER are Fire/Water respectively
  (`species_info.h:7209-7237`, `8699-8724`).
- Seed `8` yields the successful normal-ROM secondary-effect roll. The trace
  selects FIRE PUNCH once, then supplies no further input.

## Reproduce

The checkpoint explicitly selects the `battle-scene-off` profile. Use a new
scratch directory; the 42 requested frames each include the oracle's semantic
state in `manifest.json`.

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-fire-punch-burn-XXXXXX)
bin/oracle --profile battle-scene-off lab \
  tools/battle-lab/mechanic-fire-punch-burn-lifecycle-off.json \
  -o "$scratch_dir" --quiet
```

The observed run is 734 frames / **42 captures and 42 capture-states**. Its
`battleLab` metadata reports `profile: "battle-scene-off"`,
`sourceInitialized: true`, and `customPartiesBuiltBeforeBattle: true`.

## Observed controller and display boundaries

The listed values are oracle semantic state at the named capture frames; text
and healthbox statements are from those targeted PNGs.

| Frames | Receipt |
| --- | --- |
| 0, 34, 40 | Settled first request, fight menu, then `currentMove = 7` (FIRE PUNCH). |
| 67 → 68 | PP is received as `15 → 14`; the move has entered normal battle-script execution. |
| 178 → 179 | Wailmer's direct-hit HP changes `237 → 204` (33 damage); it is still unstatused. |
| 271 → 272 | `status1` changes `0 → 16` (`burn`) while HP remains 204. RNG changes `823626030 → 3664104713`; the resulting 16-bit roll is `55909 % 100 = 9`, inside FIRE PUNCH's 10% secondary chance. |
| 296 | The source burn printer is visibly holding `Foe WAILMER was burned!`; the BRN icon is not yet displayed. |
| 363 → 364 | The `BRN` healthbox icon first appears while the same burn message remains held. This is the useful data-write vs. icon-notify presentation boundary. |
| 376 → 404 | The opponent performs its only legal action, SPLASH. The target remains burn/204 HP, establishing that the later damage is end-turn burn rather than a move effect. |
| 636 | The residual branch visibly holds `Foe WAILMER is hurt by its burn!`; its BRN icon is already present. |
| 666 → 667 | Residual burn HP changes `204 → 175`, exactly `floor(237 / 8) = 29`; the target survives. |
| 672 | RNG changes `3664104713 → 3754388296` as the completed turn resets for the next action-selection pass. |
| 674–679, 734 | Both controllers receive Choose Action; player command settles at 18 and opponent at 53. Frame 734 is the stable normal `What will MAGBY do?` FIGHT/BAG/POKéMON/RUN prompt with Wailmer still `burn`, 175/237 HP, and `battleOutcome = 0`. |

This deliberately exercises the nonterminal result: every capture has
`battleOutcome = 0`, so it proves the **next-command** handoff and makes no
claim that the terminal branch was reached. The terminal alternative remains
an audited generic presentation lifecycle, not oracle coverage supplied by
this non-fainting checkpoint.

## Source causal map

- `BattleScript_EffectBurnHit` sets `MOVE_EFFECT_BURN` and follows the generic
  hit script (`reference/pokeemerald/data/battle_scripts_1.s:236-269,
  362-365`): PP reduction, attack/hit sequence, healthbar/data HP update,
  result printer, then `seteffectwithchance`.
- `Cmd_seteffectwithchance` takes `Random() % 100 < secondaryEffectChance`
  (`reference/pokeemerald/src/battle_script_commands.c:2908-2939`).
  `Random()` advances `gRngValue` and returns its upper 16 bits
  (`reference/pokeemerald/src/random.c:11-16`), which is why the recorded
  post-draw seed proves the roll of 9 above.
  `SetMoveEffect` rejects Fire targets, Water Veil, and existing primary
  status before accepting burn (`2234-2518`, especially `2341-2379`), writes
  `status1`, and emits `REQUEST_STATUS_BATTLE` to the target controller
  (`2476-2499`). That source sequence accounts for the frame-272 semantic
  status receipt.
- `BattleScript_MoveEffectBurn` is `statusanimation`, the burned string,
  `waitmessage`, then `updatestatusicon`/`waitstate`
  (`battle_scripts_1.s:3893-3897`, `3869-3876`). Under Battle Scene OFF,
  `Cmd_statusanimation` does not emit an animation controller command when
  `HITMARKER_NO_ANIMATIONS` is set (`battle_script_commands.c:5753-5767`),
  but `Cmd_updatestatusicon` still emits and waits for the icon controller
  (`7699-7720`). That explains the delayed, source-owned frame-364 BRN edge
  without inventing a Scene-OFF status animation.
- End-turn processing reaches `ENDTURN_BURN` after the normal turn actions
  (`reference/pokeemerald/src/battle_util.c:1440-1464`). It assigns
  `maxHP / 8` (minimum one) and executes `BattleScript_BurnTurnDmg`
  (`1550-1559`), which prints the burn line before status/healthbar/data-HP
  processing (`battle_scripts_1.s:3739-3753`).
- Once controller work is clear, `BattleTurnPassed` clears per-turn values,
  advances the turn, selects `HandleTurnActionSelectionState`, and assigns
  `gRandomTurnNumber = Random()`
  (`reference/pokeemerald/src/battle_main.c:3932-4013`). The selection state
  emits Choose Action (`4160-4171`); the player controller creates the prompt
  and menu (`battle_controller_player.c:2575-2589`) while the opponent runs
  its normal AI (`battle_controller_opponent.c:1540-1544`).

## Read-only TypeScript seam audit

The kernel already has typed semantic events for the relevant source
receipts: `set-battler-status-data`, `status-icon-update`,
`status-animation`, `message`, `health-bar-update`, and `hp-change`
(`src/engine/battleScriptEvents.ts:61-197`). The Scene-OFF source path above
does not emit `status-animation`; the distinct `status-icon-update` event is
the important receipt here.

The presenter already projects the raw status data write to a generic
`type: "status"` command and pairs healthbar/HP receipts into `type: "hp"`
(`src/engine/battleResolutionPresentation.ts:63-142, 690-744`). It has no
projection for `status-icon-update`; the orchestrator therefore commits
`displayedStatus1` as soon as the earlier `status` command completes
(`src/engine/factoryRoundBattleOrchestrator.ts:1131-1165`). Its lifecycle
already distinguishes `next-command-handoff` and `terminal-handoff`
(`battleResolutionPresentation.ts:253-263`; `factoryRoundBattleOrchestrator.ts:1116-1121`).

The smallest generic implementation follow-up is consequently **not a new
controller interface**: add a `status-icon` presentation command sourced from
the existing `status-icon-update` event (battler, status1, status2,
eventSequence, short controller-owned timing), and move the displayed-status
boundary commit from the raw data sync to that command. Preserve the existing
raw status write for logical state. This places the BRN display at the source
icon receipt (frame 364 here) while remaining reusable for poison, paralysis,
freeze, sleep, and status clears. Scene-ON can separately project its already
typed `status-animation` receipt; this OFF checkpoint specifically says not
to fabricate one.
