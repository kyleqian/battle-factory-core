# Rage never ended — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

Once a Pokémon had used Rage, every later hit on it raised its Attack ("rage is building") for as long as it stayed on the
field, whatever it did next. In the real game Rage lasts only while the Pokémon keeps choosing Rage.

Seed 1904 (Scene OFF): the opponent's Clefable calls Rage through Metronome. Next turn it uses Metronome again (Shadow
Ball). ROM: its `STATUS2_RAGE` is gone before the first move of that turn. Engine: the flag stayed, and each Rollout hit
printed `STRINGID_PKMNRAGEBUILDING` and raised Attack.

## Cause

- C: `TryClearRageStatuses` (`battle_util.c:1973-1981`) clears `STATUS2_RAGE` from every battler whose
  `gChosenMoveByBattler` is not `MOVE_RAGE`. `CheckFocusPunch_ClearVarsBeforeTurnStarts` calls it after the Focus Punch
  set-up loop and before the first action of every turn (`battle_main.c:4925`). `gChosenMoveByBattler` is reset to
  `MOVE_NONE` every turn (`:4004`) and only set by a move chosen at the menu (`:4399`) or by Encore (`:4194`), so a switch,
  a locked move and a forced Struggle all drop Rage, and Metronome / Sleep Talk calling Rage give one turn of it.
- Engine: no counterpart. `src/engine` set the flag (`MOVE_EFFECT_RAGE`) and read it (`MOVEEND_RAGE`) but never cleared it
  except by leaving the field.

## Fix

`src/engine/factoryBattleScriptFullTurnDecision.ts` `tryClearRageStatuses`, called right after the Focus Punch pre-pass,
on the turn's banked `chosenMoveByBattler`.

## Test

`tests/parityMacRageStatusClear.test.ts`: turn 1 the player uses Rage (flag set). Turn 2, choosing Tackle: the foe's hit
raises no Attack and the flag is gone (unfixed: flag still set, Attack +1). Control: choosing Rage again keeps the flag and
the hit raises Attack.

## ROM replay

Seed 1904 goes from 60 / 123 to 153 matched states at the driver's default 80,000-frame cap (a long battle; see
`STATUS.md` for the long-drive result).
