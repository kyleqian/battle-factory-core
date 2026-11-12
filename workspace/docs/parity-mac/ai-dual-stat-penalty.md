# AI "already maxed" penalty for two-stat moves: one penalty, not both — fixed (5 handlers)

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 898 off DIR`.

## Symptom

Seed 898, late in a long battle: the opponent's Walrein has Attack, Defense and evasion at +6 and only Curse and Double Team
left with PP. ROM single-step: after the check-bad-move pass both moves stand at 90, Double Team's viability roll takes it to
89, and the AI plays Curse. The engine had Curse at 82 and played Double Team.

## Cause

- C, `AI_CBM_Curse` / `AI_CBM_BulkUp` (`data/battle_ai_scripts.s:434-437`, `:581-584`):
  `if_stat_level_equal AI_USER, STAT_ATK, MAX_STAT_STAGE, Score_Minus10` then
  `if_stat_level_equal AI_USER, STAT_DEF, MAX_STAT_STAGE, Score_Minus8`. `Score_Minus10` is a label (`:620-622`: `score -10`,
  `end`), so the first gate JUMPS and ends the script; the second gate runs only when the first did not fire.
- Engine: `src/engine/factoryAiCheckBadMove.ts` added both penalties (-18). The same shape was ported the same way for
  `AI_CBM_CosmicPower` (`:576-579`), `AI_CBM_CalmMind` (`:590-593`), `AI_CBM_DragonDance` (`:595-598`) and `AI_CBM_Tickle`
  (`:571-574`, the target's stats at the floor).

## Fix

All five return -10 when the first stat is at the limit, otherwise -8 when the second is, otherwise 0.

## Tests

`tests/factoryAiCheckBadMove.test.ts`: the six "both at the limit" cases (Bulk Up, Curse, Cosmic Power, Calm Mind, Dragon
Dance, Tickle) now assert -10. They pinned -18 before, so they fail on the unfixed code.

## ROM replay

Seed 898 matches to battle end. See `STATUS.md`.
