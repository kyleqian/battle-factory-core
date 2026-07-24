# `Cmd_moveend` durable-state ownership

This is an implementation boundary for opcode 73, not an implementation.  It
uses the pinned receipt at `src/data/gen/battle-script-move-end-facts.json` and
the source definition at `reference/pokeemerald/src/battle_script_commands.c`
lines 4225-4497.  The receipt is the verbatim-case authority; this note only
assigns durable ownership.  Numeric dispatch is authoritative: source orders
states `0..7, 11, 12, 8..10, 13..17`, even though the enum names 8--10 before
11--12 (`include/constants/battle_script_commands.h:393-410`).

The existing `BattleScriptRulesContext` is a useful immutable rules aggregate,
but this note deliberately does **not** propose a parallel move-end receipt or
a giant replacement context.  Add small source-shaped owner slices, preserve
unrelated frozen values by identity, and keep script stack, RNG ledger, and
controller acknowledgement in the existing machine.

## Existing reusable ownership

| Source storage (width/cardinality) | Existing immutable owner | States using it |
| --- | --- | --- |
| `gBattlerAttacker`, `gBattlerTarget` (`u8`, one battler id each) | `rules.selectorRoles.attacker/target` (`0..3 | null`); move-end requires both non-null | 0--6, 8--10, 14--16 |
| `GetBattlerSide(gBattler*)` (derived `u8` side from source battle position) | `rules.battlers[i].side` (`0 | 1`, exactly four) is sufficient for this same-side predicate | 0 |
| `gBattleMons[i].hp` (`u16[4]`) | `rules.battlers[i].hp` | 0, 1, 16 |
| `gBattleMons[i].moves[4]` (`u16[4]` per battler) | `rules.battlers[i].moves` | 6 |
| `gBattleMons[i].status1/status2` (`u32[4]`) | `rules.battlers[i].status1/status2` | 1, 0, 13 |
| `gStatuses3[i]` (`u32[4]`) | `rules.battlers[i].status3`; despite the different C container, its documented source role is the durable status-3 word | 8--10 |
| `gDisableStructs[i].substituteHP` (`u8[4]`) | `rules.battlers[i].substituteHP` | 13 |
| `gMoveResultFlags` (`u8`) and `gHitMarker` (`u32`) | `rules.moveResultFlags`, `rules.hitMarker` | 0--1, 6, 8--9, 14--16 |
| `gCurrentMove` (`u16`), `gBattleMoves[gCurrentMove].power/effect` (generated immutable move data) | `rules.currentMove`, `rules.currentMovePower`, `rules.currentMoveEffect` | 0, 14--16 |
| `gAbsentBattlerFlags` (`u8`, battler-bit mask) | `rules.absentBattlerFlags` | 14--15 |
| `gBattleScripting.moveendState` (`u8`) | `rules.moveendState`, written by the completed generic SETBYTE resolver | every state and postlude |
| action-local `gBattleMoveDamage` etc. reset by `MoveValuesCleanUp` | `BattleScriptMoveValuesRulesContext` and `cleanUpBattleScriptMoveValues` | 16 only |
| script PC / pushed return PC | `BattleScriptMachineState.programCounter` and immutable `callStack` | 0, 1, 16, postlude |
| `gActiveBattler` plus controller-exec flag | `BattleScriptSchedulerState.activeBattler` and `pendingControllerBattlers`; acknowledgement already preserves rules/RNG/PC | 1, 8--10 |

`BattleScriptSemanticEventPayload` already has the source-shaped
`set-battler-sprite-visibility` event, but it currently restricts
`invisible: false`; state 8 needs the same controller event with `true`.
That is a narrow event-union extension, not presentation ownership of the
rule bit.

## Missing durable owner slices

The following are genuinely absent from `BattleScriptRulesContext` (verified
against `src/engine/battleScriptRulesContext.ts:23-117, 280-477`).  Names below
are ownership recommendations, not an instruction to change shared interfaces
in this side-lane note.

| Source storage and exact type | Missing immutable owner / use | Source cases |
| --- | --- | --- |
| `gBattleMons[i].item` (`u16[4]`; `struct BattlePokemon`, `pokemon.h:260-314`) | Per-battler held-item field.  Required for changed-item copy and initial hold-effect lookup. | 6, 7; item delegates 11--12 |
| `gBattleMons[i].statStages[NUM_BATTLE_STATS]` (`s8` array; `pokemon.h:260-314`) | Per-battler stat-stage slice, preserving all source entries; do not substitute presentation stat events for the durable value. | 0 write (Attack increment) |
| `gSpecialStatuses[i].{restoredBattlerSprite,physicalDmg,specialDmg}` (`u32:1`, `s32`, `s32`; `battle.h:132-147`) | Small four-battler special-status slice.  `restoredBattlerSprite` is written only by 9 here; damage fields are read by 0/1 predicates. | 0, 1, 9, 10 |
| `gProtectStructs[i].chargingTurn` (`u32:1`; `battle.h:104-131`) | Per-battler protect flag (not the currently optional individual protect flags). | 16 |
| `gChosenMove` (`u16`) | Chosen-move scalar, distinct from `currentMove`; source snapshots it to `originallyUsedMove` before the switch. | prelude, 6, 14--15 |
| `gBattleStruct->choicedMove[i]`, `changedItems[i]` (`u16[4]` each; `battle.h:354-448`) | Choice/change-item slice.  `changedItems` must be cleared after copying to each mon's item. | 6--7 |
| `gBattleStruct->absentBattlerFlags` (`u8`) | A *second* absent mask, separate from reusable global `rules.absentBattlerFlags`; source tests both. | 14--15 |
| `gBattleStruct->dynamicMoveType` (`u8`) | Dynamic-type override consumed by `GET_MOVE_TYPE`; a move-data resolver alone is insufficient. | prelude, 14 |
| `gEnigmaBerries[i].holdEffect` (`u8[4]`; `struct BattleEnigmaBerry`, `global.berry.h:54-59`) | Enigma hold-effect source data, or one immutable held-effect resolver that returns the exact source value for normal and Enigma items. | prelude, 6 |
| `gBattlersCount` (`u8`), `gBattleTypeFlags` (`u32`), `gBattlerPositions[4]` (`u8[4]`) | Battle topology slice.  Side alone cannot implement `GetBattlerAtPosition(BATTLE_PARTNER(GetBattlerPosition(target)))`. | 7, 10, 13, 16 |
| `gLastPrintedMoves`, `gLastMoves`, `gLastResultingMoves`, `gLastLandedMoves`, `gLastHitByType` (`u16[4]` each), `gLastHitBy` (`u8[4]`; `battle.h:672-679`) | One narrowly named move-history slice, with the six independent arrays retained (not a lossy "last move" scalar). | 14 |
| `gBattleStruct->lastTakenMove` (`u8[16]`, packed two-byte values) and `lastTakenMoveFrom` (`u8[32]`, packed `[target][attacker][2]`; `battle.h:400, 424`) | Either retain the source byte arrays or expose fixed `u16[4]` / `u16[4][4]` views with source-order byte serialization pinned. | 15 |

The current Factory asleep adapter creates only its two active mons plus two
empty placeholders (`factoryBattleScriptDecision.ts:211-293`), has no item,
stages, history, topology, special-status, or selected-move input, and asserts
the opcode-73 barrier (`:560-625`).  It therefore cannot be treated as a
complete move-end fixture merely because its particular items and battle mode
would make many predicates false.

## State-to-owner and delegate map

All ranges below are source lines in `battle_script_commands.c`.  "Machine"
means the existing immutable interpreter owns PC/stack and its `rng` ledger;
no case may manufacture a second RNG cursor.  Direct controller work emits a
semantic request, marks exactly its active battler pending, and returns/block
semantics resume at the unchanged opcode-73 PC after acknowledgement.

| State / C case | Durable reads and writes | Delegate / transfer owner |
| --- | --- | --- |
| 0 `MOVEEND_RAGE` (4240-4256) | Read target `status2`, `hp`, target Attack stage, attacker/target/side, result flags, target damage special-status, current move power; increment target `statStages[STAT_ATK]`; increment state. | Rules predicate; on success machine `call`/pushes cursor then jumps `BattleScript_RageIsBuilding`.  No direct RNG/controller. |
| 1 `MOVEEND_DEFROST` (4257-4274) | Read target `status1`, `hp`, attacker/target, target `specialDmg`, flags, resolved move type; clear `STATUS1_FREEZE`, set active battler, increment state. | Direct status-data controller emission + pending target; machine pushes cursor and jumps `BattleScript_DefrostedViaFireMove`.  The controller barrier is mandatory before continuation. |
| 2 `MOVEEND_SYNCHRONIZE_TARGET` (4275-4279) | Read target and `moveendState`; increment state. | `AbilityBattleEffects(ABILITYEFFECT_SYNCHRONIZE, target, 0, 0, 0)` owns any state/RNG/controller/effect-script result and returns `effect`. |
| 3 `MOVEEND_ON_DAMAGE_ABILITIES` (4280-4284) | Read target and state; increment state. | `AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, target, 0, 0, 0)` owns contact/on-damage effects, RNG, barriers and script transfer. |
| 4 `MOVEEND_IMMUNITY_ABILITIES` (4285-4290) | Read/write state; only increments when its delegate reports no effect. | `AbilityBattleEffects(ABILITYEFFECT_IMMUNITY, 0, 0, 0, 0)` owns its cross-battler cursor/loop, all effects/RNG/transfers. |
| 5 `MOVEEND_SYNCHRONIZE_ATTACKER` (4291-4295) | Read attacker/state; increment state. | `AbilityBattleEffects(ABILITYEFFECT_ATK_SYNCHRONIZE, attacker, 0, 0, 0)` owns effect/RNG/controller/script result. |
| 6 `MOVEEND_CHOICE_MOVE` (4296-4317) | Read `hitMarker`, held-effect result, `chosenMove`, result flags, attacker moves; write `choicedMove[attacker]` or `MOVE_NONE`, increment state. | Pure held-effect resolver owns normal/Enigma lookup.  No direct controller/RNG; do not fold Choice policy into an item-effect delegate. |
| 7 `MOVEEND_CHANGED_ITEMS` (4318-4329) | Read `battlersCount`, `changedItems[i]`; for each nonzero write `battleMons[i].item` then clear `changedItems[i]`; increment state. | Rules-only item transfer; cardinality follows `gBattlersCount`, not all four placeholders. |
| 11 `MOVEEND_ITEM_EFFECTS_ALL` (4330-4335) | Read/write state only locally. | `ItemBattleEffects(ITEMEFFECT_MOVE_END, 0, FALSE)` owns its battler scan, mutations, RNG, controller and pushed-script effect; increment only after false. |
| 12 `MOVEEND_KINGSROCK_SHELLBELL` (4336-4340) | Read/write state locally; increments regardless of true effect. | `ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)` owns effect/RNG/controller/script result. |
| 8 `MOVEEND_ATTACKER_INVISIBLE` (4341-4352) | Read attacker `status3` and hit marker; set active attacker; increment state only on emitted path. | Direct sprite-visibility controller (`invisible: true`) plus pending attacker, then explicit C `return` with opcode PC unchanged. |
| 9 `MOVEEND_ATTACKER_VISIBLE` (4353-4367) | Read result flags, attacker `status3`, `WasUnableToUseMove`; set active attacker, clear semi-invulnerable bit, set attacker `restoredBattlerSprite`, increment state. | `WasUnableToUseMove` is a rules predicate over durable battle state; direct controller emits `invisible: false`, marks attacker pending, then returns. |
| 10 `MOVEEND_TARGET_VISIBLE` (4368-4380) | Read target `restoredBattlerSprite`, target/battler count/status3; set active target, clear target semi-invulnerable bit, increment state. | Direct controller emits `invisible: false`, marks target pending, then returns. |
| 13 `MOVEEND_SUBSTITUTE` (4381-4388) | For `i < gBattlersCount`, read `disable[i].substituteHP`; clear `battleMons[i].status2` substitute bit when zero; increment state. | Rules-only cleanup. Existing `battlers[i].substituteHP` is reusable. |
| 14 `MOVEEND_UPDATE_LAST_MOVES` (4389-4437) | Read/write attacker/target swap and hit marker; write all history arrays subject to the two absent masks, move-effect, obey/faint/result predicates; resolve resulting move type; increment state. | Rules-owned swap/history reducer plus dynamic move-type resolver.  No controller/RNG; it must preserve source order (swap before every later indexed write). |
| 15 `MOVEEND_MIRROR_MOVE` (4438-4461) | Read both absent masks, current move flags, hit/result predicates, attacker/target/chosen move; write packed last-taken histories; increment state. | Rules-owned history reducer with endian/index tests for source's byte addressing.  No controller/RNG. |
| 16 `MOVEEND_NEXT_TARGET` (4462-4484) | Read unable/no-attack-string flags, double flag, attacker charging flag, move target data, target position/partner, partner HP; on replay write target, hit marker, state=0 and clean move values. | Topology resolver owns partner lookup.  On live partner: machine pushes original move-effect script, jumps `BattleScript_FlushMessageBox`, and returns; otherwise rules-only increment.  No direct `Random()`. |

The postlude owns the three-byte opcode advance only when `moveendState ==
MOVEEND_COUNT` and `effect == FALSE` (4489-4497).  End mode is not optional
metadata: read opcode operands `endMode/endState` as `u8/u8`; preserve source
mode 1's first-no-effect stop and mode 2's state-equality stop.  Receipt counts
are 24 starts, fixed operands `[1,1]`, modes `0=6`, `1=4`, `2=14`.

## Minimal dependency order and exact tests

This order keeps each new owner independently immutable and leaves opcode 73
unregistered until the final row.  Test names below are the exact proposed
Tier-1 files/cases; existing adapter tests remain regression evidence, not a
substitute for the new unit tests.

1. Add the **move-end battler metadata** slice (item, all signed stages,
   special-status fields, protect charging bit) and its freeze/identity
   constructor.  Unlock `tests/battleScriptMoveEndState.test.ts` cases
   `preserves-s8-battler-metadata-by-identity` and
   `validates-source-widths-and-four-battler-cardinality`.
2. Add the **choice/change and move-history** slices, both absent masks, and
   dynamic/Enigma move-data resolvers.  Unlock
   `tests/battleScriptMoveEndOwnership.test.ts` cases
   `choice-and-changed-items-keep-u16-values`,
   `update-last-moves-swaps-before-indexed-history-writes`, and
   `mirror-history-serializes-source-target-attacker-order`.
3. Add the **battle topology** slice/resolver and a source-shaped
   `WasUnableToUseMove` predicate.  Unlock
   `tests/battleScriptMoveEndTopology.test.ts` cases
   `substitute-loops-only-through-gBattlersCount` and
   `next-target-resolves-partner-by-position-not-battler-parity`.
4. Add explicit **controller request/resumption** support for status-data and
   both visibility values, using existing scheduler acknowledgement.  Unlock
   `tests/battleScriptMoveEndControllers.test.ts` cases
   `defrost-blocks-with-pc-and-rng-preserved` and
   `visibility-cases-return-and-resume-the-same-moveend-instruction`.
5. Implement source-complete **ability and item delegate ports** with a
   frozen result carrying next rules, the *same* machine RNG ledger, optional
   controller request, and optional script transfer.  Unlock
   `tests/battleScriptMoveEndDelegates.test.ts` cases
   `ability-effects-own-effect-rng-and-script-transfer` and
   `item-effects-own-move-end-scan-and-kings-rock-shell-bell-transfer`.
6. Implement the pure cases and all 17-state/end-mode loop against those
   owners; test all 24 receipt sites before registration.  Unlock
   `tests/battleScriptMoveEnd.test.ts` cases
   `executes-every-receipted-opcode73-start-with-fixed-u8-u8-operands`,
   `mode-one-stops-after-first-noneffect-state`,
   `mode-two-stops-at-requested-state`, and
   `doubles-replay-pushes-effect-script-and-jumps-flush-message-box`.
7. **Only now register opcode 73** in the production handler set and extend
   the Factory adapter past its honest barrier.  Unlock the existing
   `tests/factoryBattleScriptDecision.test.ts` asleep player/trainer assertions
   to replace the `move-end-barrier` expectation with controller-acknowledged
   source completion.  This final integration must also prove no duplicate RNG
   cursor, no PC advance across a controller return, and no loss of frozen
   unrelated state.

There is no `Random()` call in the `Cmd_moveend` body, but that is not a
zero-RNG exemption: ability/item delegates and their transferred scripts own
their source draws in the existing machine ledger.  Registering a no-effect
stub, a singles-only case filter, or a direct adapter continuation before step
7 would discard durable source state and violate this ownership boundary.
