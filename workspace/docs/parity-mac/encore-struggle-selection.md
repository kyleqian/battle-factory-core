# Encore and forced Struggle: who is asked what at action selection (audit lead B2, dia272 seed-60 lead) — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

1. **Encore (10 seeds: 161 193 203 228 522 553 631 758 992 1021).** After Encore landed on the player's Pokémon, the ROM opened
   the action menu every turn; the engine played those turns by itself. The player could not switch out of an Encore, and
   the replay stopped with "action menu without a move decision". On the opponent's side the engine also skipped the AI's
   switch check (and its random draws) for an Encored opponent.
2. **Struggle (24 seeds).** On a turn where the opponent had no usable move, the engine still ran the AI move chooser on a
   stale slot and spent its random draws; the ROM spends none (dia272: seed 60, engine 9 draws vs ROM 8, the accuracy
   roll shifted and Struggle missed). On the player's side the ROM asks no move on such a turn (FIGHT commits it), so the
   replay driver kept one decision too many and drifted.

## Cause

C, `HandleTurnActionSelectionState` (`battle_main.c`):

- `:4160-4165` only `STATUS2_MULTIPLETURNS` / `STATUS2_RECHARGE` skip the controller entirely.
- `:4166-4170` every other battler gets `BtlController_EmitChooseAction`: the player's action menu, the opponent's
  `AI_TrySwitchOrUseItem` (`battle_controller_opponent.c:1540`).
- `:4182-4197` on `B_ACTION_USE_MOVE`: `AreAllMovesUnusable()` (forced Struggle, `:4184-4191`) and
  `gDisableStructs[b].encoredMove != 0` (`:4192-4197`) both confirm the action without `BtlController_EmitChooseMove`.
  So `OpponentHandleChooseMove` (`battle_controller_opponent.c:1551-1567`: `BattleAI_SetupAIData` +
  `BattleAI_ChooseMoveOrAction`) never runs on those turns: zero move-chooser draws. The player sees no move menu.

Engine before the fix:

- `src/engine/factoryBattleScriptFullTurnDecision.ts` `lockedMoveDecision` treated Encore like the STATUS2 lock: the
  turn-boundary code auto-confirmed the action for either side with no request, and `legalCommandDecisions` offered no switch.
- `src/engine/factoryAiLiveDriver.ts` `submitLiveFactoryAiDecision` always ran the move chooser after the switch check,
  including on the single forced-Struggle decision.

## Fix

- Kernel: `statusLockedMoveDecision` (STATUS2 lock only) is what the turn boundary auto-confirms and what suppresses
  switching. An Encored battler now gets its command request: exactly the encored move slot, plus its legal switches.
  New exported predicate `battlerMoveSelectionIsForced` (forced Struggle or Encore, not a STATUS2 lock).
- AI driver: after the switch check declines, a forced move is submitted with the switch check's draws only
  (new result variant `phase: "forced-move"`; the W2 `gBattleMovePower` register is left alone, C runs no `AI_CalcDmg`).
- Replay tools: `soundCensusRomReplay.ts` marks such a decision `forced: true`; `romDecisionDriver.py` commits a forced
  decision at the ROM's action menu (FIGHT) and expects no move menu. Driver test added (`tools/test_rom_decision_driver.py`).

## Known presentation gap (not fixed here; for the presentation lane)

On a forced turn the engine still opens its move menu after FIGHT, with the forced slot as the only legal one (about 40
tool drivers and the census policy wait for that menu). The real game goes straight from FIGHT to the turn, and for Struggle
prints "… has no moves left!" (`BattleScript_NoMovesLeft`). The decision set is the same on both sides (FIGHT = the forced
move, or switch); only the menu step differs.

## Tests

- New, failing unfixed: `tests/factoryAiLiveDriver.test.ts` "forced Struggle (all PP 0)" and "Encore": phase `forced-move`,
  RNG calls equal to the switch check's draws.
- Updated to the source flow (they pinned the old auto-confirm): `tests/factoryBattleScriptEncoreFullTurn.test.ts` (three
  cases; the player case now asserts a player request listing only the encored slot, which fails unfixed),
  `tests/issue138EncoreDisableReceipt.test.ts` control arm (the trainer command is collected, one decision),
  `tests/factoryAiR13dEvidence.test.ts` (helper type only).
- Re-pin: `tests/stl109Struggle.test.ts` route "opponent first, then the player": same slot list on census seed 60; the
  opponent now Struggles four times before the player's first (was two). The battle really changed: its RNG line differs
  from the opponent's first Struggle on, because that turn no longer spends chooser draws.

## ROM replay

All 10 Encore seeds match to battle end. Struggle: 21 of 24 match (225 265 292 345 417 444 492 542 577 702 737 804 813 862
897 929 973 1095 1112 1125 1157). Still open: 529, 705, 796 (see `STATUS.md`). Also now matching: 60 87 89 90 119 159 769 912.
