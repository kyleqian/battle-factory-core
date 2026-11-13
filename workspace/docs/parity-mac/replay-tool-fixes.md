# Replay tool: three false alarms removed

Mac parity lane, 2026-11-12. These are changes to the ROM replay tools, not to the engine. Each one made a seed look like
an engine error when the engine was right.

## 1. The ROM drive stopped at the win flag, before the turn was over

- Seeds: 1181, 2722, 4270 (each one engine state short at battle end, "stop = outcome").
- What happens in the game: `gBattleOutcome` is set by the script that decides the battle, but `BattleTurnPassed` still
  runs `HandleFaintedMonActions` and `HandleWishPerishSongOnTurnEnd` after it. A pending Future Sight still rolls its
  accuracy (seed 1181, single-stepped: `Random via Cmd_accuracycheck` after the outcome, then `HandleEndTurn_BattleWon`;
  the ROM's last `gRngValue` equals the engine's). Only then does `gBattleMainFunc` become `sEndTurnFuncsTable[outcome]`
  (`RunTurnActionsFunctions`).
- Tool before: `romDecisionDriver.py` returned at the first frame with `gBattleOutcome != 0`, so the frozen trace and the
  ROM timeline ended before that last draw.
- Now: the driver keeps going (pulsing A for the remaining messages) until `gBattleMainFunc` is `HandleEndTurn_BattleWon`
  / `HandleEndTurn_BattleLost`, with a 3,000-frame safety cap. `soundEventProbe.py` reports `mainFunc` in the observation.
  Test: `tools/test_rom_decision_driver.py` `test_after_the_outcome_the_drive_runs_on_until_the_end_turn_handler`.

## 2. The first-turn alignment could lock on a repeated turn number

- Seed: 1816 (0 states matched).
- The replay finds where the engine's start sits in the ROM's RNG stream by matching `gRandomTurnNumber`, a 16-bit value,
  inside a 48-draw window, and took the first hit. In seed 1816 the same value appears twice (2 and 15 draws behind the
  menu). The first hit was the wrong one. Expected rate: about one seed in 4,000.
- Now: the setup records `AI_THINKING_STRUCT->simulatedRNG` (the four `100 - Random() % 16` of `BattleAI_SetupAIData`,
  `battle_ai_script_commands.c:340-341`). When the opponent's reply is a move, a candidate is accepted only if four
  consecutive draws among the opponent's pre-menu draws give those four values. The first verified candidate wins; older
  setups without the field behave as before. The engine output carries `alignment` (all candidates, verified or not).

## 3. A lab staging that already played a turn is refused

- Seed: 3623 (0 states matched).
- `oracle/battle_lab.py` `_finish_intro_to_action_menu` waits 120 frames, then presses A for 2 frames, and repeats until
  the action menu is up. Now and then the A lands on the first action menu: FIGHT, slot 0, and turn 1 is played before the
  "setup" snapshot (seed 3623: the snapshot is turn 2, Graveler at 26 / 151 HP). The engine side starts at turn 1, so
  nothing can match.
- Now: the setup records `gLastMoves`; `replay` throws "the lab staging already played a turn" when a last move is set or
  a lead is not at full HP with no status. The chain reports rc 13 for that seed instead of a mismatch.
- Not fixed here: the staging race itself is in the oracle lab (top layer). Seed 3623 stays un-replayable until it is.

## Limits that are not errors

Long battles need higher caps than the stock chain's (engine 200,000 frames, ROM drive 80,000):
`soundCensusRomReplay.ts replay --frame-budget=N` and `soundEventProbe.py lab --drive ... --frames N`.
