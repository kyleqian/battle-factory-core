# fix274: MOVE_EFFECT_BYTE cleared per action (#209) and chosenMovePositions written at selection (#210)

Source-proven gameplay fixes under `docs/factory-finish-scope.md`. Diagnosis: `docs/dia272-leads.md`. Evidence (not in git): `.integration/evidence/fix274/` (`rom/`, `census/`, `cls/`).

## 1. #209 effect byte (`battleActionFinished.ts`)

C `HandleAction_ActionFinished` (`battle_util.c:658-683`) zeroes `gBattleCommunication[3]` (MOVE_EFFECT_BYTE), `[4]` and `multihitMoveEffect` after every action. The engine reset `multiHitEffect` but not `moveEffectByte`, so a move that set the byte and then missed (accuracycheck jumps past `seteffectwithchance`) left it armed for later actions. Fix: `moveEffectByte: 0` in `handleBattleActionFinished`, and the stale doc comment (it said `[3]` was unrepresented) now says `[3]` is cleared, `[4]` is not represented.
`BattleTurnPassed`'s `gBattleCommunication[0..4] = 0` (`battle_main.c:3984-3985`) is NOT separately represented (`finishTurnValuesCleanUp` does not touch it); every action ends through the clear above, so the byte is already 0 entering BattleTurnPassed. Left as is (no observed consequence; slots 0/1 are untouched by this step).

Test: `tests/fix274EffectByte.test.ts` (5 tests, all fail unfixed): direct `handleBattleActionFinished` check, plus Thunder missing as the second mover (rng seeds 2, 3, 11, 12) must leave `moveEffectByte === 0` at end of turn (unfixed: 5 = MOVE_EFFECT_PARALYSIS).

## 2. #210 chosenMovePositions (`factoryBattleScriptFullTurnDecision.ts`, awaiting-trainer-command)

C writes `gBattleStruct->chosenMovePositions[battler]` at selection (`battle_main.c:4398`, Encore `:4195`) for both battlers, before any action. Only the action-time `buildActionContext` write existed in the engine, so a battler that faints before acting kept the previous turn's slot. ENDTURN_ORDER's `GetWhoStrikesFirst` (`ignoreChosenMoves == FALSE`, `battle_main.c:4694-4720`, `endTurnChosenMove`) reads `moves[chosenMovePositions[b]]` of the (replacement) battler: stale slot, wrong priority bracket, skipped speed-tie `Random() & 1`. Fix: when the round's two decisions are accepted, write the submitted move slots into `chosenMovePositions` (switch decisions leave the slot untouched, as in C).
Test: `tests/fix274MovePositions.test.ts` (2 tests; the faint-before-acting one fails unfixed: positions `[0,0,0,0]` instead of `[1,0,0,0]`; the switch-untouched one is a guard that passes both ways).

## 3. ROM drives (`tools/audio/romDriveSeed.sh`, `.integration/evidence/fix274/rom/`)

53 ON 8/8, 53 OFF 8/8, 42 ON 17/17, 42 OFF 17/17, 50 OFF 31/31 (all divergence none, previously 4/9, 4/9, 9/16, 9/16, 18/25). Regression OFF `1 3 4 5 6 8 11 13 17 20 22 26 28 30 31 39 224 552` all full match; ON 57 11/11.

## 4. Census 0..999, both scenes (`LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4`)

Baseline: aiv271 final arms `{on,off}-3bfb1a391`; fixed arms `{on,off}-237ee0e5e`. Changed seeds: 21 per scene, identical ON/OFF sets, 0 errors added:
`41 88 101 190 225 279 316 383 389 423 484 530 617 665 687 692 722 804 808 835 971`.
Classifier (neutralisation, `cls/report.txt`): the unfixed base, base+fix(1) only, base+fix(2) only were each run on the 21 seeds in both scenes. Unfixed digest == baseline on 21/21. Attribution (both scenes): **(1) alone reproduces the fixed digest on 17 seeds** (88 190 225 279 316 383 389 423 484 530 617 665 692 722 804 808 971), **(2) alone on 4 seeds** (41 101 687 835), 0 needing both, **0 unexplained**. The other 979 seeds are digest-identical to the aiv271 baseline. Not done (time cap): a full 1000-seed instrumented-unfixed census (the 979 unchanged seeds are evidence the early lobby-return commits do not move census digests).

## 5. Re-pins

- `tests/factoryRoundBattleOrchestrator.test.ts` post-ShouldSwitch round census: seed 4 calls 1590 -> 1471, seed 20 1644 -> 1555 (whole-round RNG cursor; outcome / battle index unchanged, still win at battle 6).
- `tests/factoryRoundChaining.test.ts` (b): curated first-round seed 1 -> 5 (seed 1's hop-3 round now loses; 0, 2, 3, 4 also lose; 5 is the first that chains four wins deep). Only the seed changed; assertions are structural.

## 6. Not in scope (left in dia272-leads.md)

Seed 60 forced-Struggle AI chooser (`factoryAiLiveDriver.ts`) and its 73/82 remainder. Also untested: `chosenActionByBattler` is never `B_ACTION_SWITCH` for voluntary switches (the full-turn seam passes it to `withTurnOrderPositions` for the turn itself; only the reducer-level field is concerned).
