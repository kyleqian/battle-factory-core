# aud241c: battle-end and battle-return sounds (S11 audio step 5, third slice)

Write-only emitters on the Factory singles path (generated orchestrator route). Nothing here changes engine state, RNG, kernel
FactoryEvents, frame hashes or pixels (`tests/aud241cBattleEndSounds.test.ts` compares the full serialized state with and without a sink;
`tests/audioSinkNeutral.test.ts` the per-frame hashes). Evidence: the six step-mode ROM windows of `docs/aud241c-fixtures.md`
(`tools/audio/fixtures/aud241c-{win,loss,brain}-{on,off}-window.json`).

## Code

- `src/engine/battleEndSounds.ts` (new): `emitBattleEndSounds(before, after, frontierBrain)`, called from the `soundCollecting()` block of
  `tick()` in `src/engine/core.ts` with the round's `battleResolutionPresentation` before and after the tick (own call, outside the
  `after`-must-exist gate, so the A that leaves the last terminal box is still seen). It acts on one edge: the accepted A that leaves a
  `message` command with `advance: "button"` (the `X fainted!` boxes and `PLAYERDEFEATEDTRAINER1` / `TRAINER1LOSETEXT` / `TRAINER1WINTEXT`).
- `src/engine/screenSounds.ts`: `stopLowHpSound()` (`BattleStopLowHpSound`: a real `stop 90` only while the aud241b loop flag is set, and
  it clears the flag; otherwise the ROM's no-op, not emitted).
- `src/audio/soundEvents.ts`: optional `speed` on `SoundEvent` (the fade's `m4aMPlayFadeOut` speed). Type only.
- `tools/compare/appTrace.ts`: `APP_STAGES["aud241c-{win,loss,brain}-{on,off}"]` (the aud241b Rattata Seismic Toss stage with the benches
  removed, so the last faint is a hard terminal; `midBattleSwitchStage` options `trainerBenchHp: null`, `playerBenchNone`, `frontierBrain`
  = win streak 20, the Silver Factory Head round). Nothing added to `src/engine/battleScene.ts`.

## Rules (all offsets in ticks from the accepted A, both scenes alike: no 7-tick Scene ON lag)

| Edge (the A that leaves ...) | Emitted | ROM source |
|---|---|---|
| any button box (`fainted!`, the two terminal texts) | `se 5` (SE_SELECT, pan null) on the A tick | `PlaySE(SE_SELECT)` of the text printer. Also true for a non-final faint (`switch-opponent-replacement-off-window`: SE_FAINT 308, SELECT 355), so it is emitted for every button box |
| the last `fainted!` of a **win** (opponent battler, `battleOutcome & WON`) | +22: `stop 90` (only if the loop plays), `bgm 412` (Brain: `bgm 354`) | `HandleEndTurn_BattleWon`: `BattleStopLowHpSound`, `PlayBGM(MUS_VICTORY_TRAINER / _GYM_LEADER)` |
| the last `fainted!` of a **loss** (player battler, `battleOutcome & LOST`) with the opponent's active mon alive | +24: `se 15` (SE_BALL_OPEN, pan null); no victory BGM | `returnopponentmon1toball` (`VARIOUS_RETURN_OPPONENT_MON1`: only `if (hp != 0)`), `BattleScript_LocalBattleLostPrintTrainersWinText` |
| `TRAINER1LOSETEXT` (win) / `TRAINER1WINTEXT` (loss) = P | +6 `fade` of the playing BGM (412 / 354 on a win, 476 on a loss; 471 for a Brain loss), speed 5 | `HandleEndTurn_FinishBattle` `FadeOutMapMusic(5)` |
| | +53 `bgm 469` (Brain win: +52) | `MapMusicMain` `PlayBGM(MUS_B_FACTORY)` |
| | +79 `se 9` (SE_EXIT), none for a Brain win | the return script |

The `stop 90` at P+43 (`SpecialStatusesClear`), the win's `HandleLowHpMusicChange` stops and the `DestroyAnimSoundTask` duck are the ROM's
no-ops (`noop: true` in the fixtures) and are not emitted. aud240d already emits the heal fanfare (win, P+201), the symbol fanfare (Brain,
P+219) and the loss lobby SE_SELECT; this slice adds none of them.

## Result (`tests/aud241cBattleEndSounds.test.ts`)

The ROM windows are lab runs with a fixed A cadence. The engine is staged on the same last faint, run once to find its SE_FAINT, then
driven with the A presses at the ROM's SE_SELECT offsets from SE_FAINT (the cadence is part of the ROM evidence, not ROM timing). Compared:
SE_FAINT, SE_SELECT, SE_BALL_OPEN, SE_EXIT, effective `stop 90`, `bgm`, `fade`: frame (relative to SE_FAINT), kind, id, pan, fade speed.

| Window | Events compared | Frame deltas (ours - ROM) |
|---|---|---|
| win ON (SE_FAINT, SELECT @46, bgm 412 @68, SELECT @146, SELECT/P @246, fade 412 @252, bgm 469 @299, SE_EXIT @325) | 8 | all 0 |
| win OFF (same, @43 / 65 / 143 / 243 / 249 / 296 / 322) | 8 | all 0 |
| Brain ON (bgm 354, fade 354, bgm 469 at P+52, no SE_EXIT) | 7 | all 0 |
| Brain OFF | 7 | all 0 |
| loss ON (SELECT @168, SE_BALL_OPEN @192, P @770, fade 476 @776, bgm 469 @823, SE_EXIT @849, lobby SELECT) | 8 | all 0 |
| loss OFF (SELECT @54, ball open @78, P @356, fade 362, bgm 409, SE_EXIT 435, lobby SELECT) | 8 | all 0 |

The loss lobby SE_SELECT is aud240d's terminal emitter (the test presses the third A) and is not doubled. Every nonzero delta: none.

## Flow mismatches and gaps (recorded, not fixed)

1. The A cadence is pinned from the ROM; the engine's own "fainted!" box reaches `awaiting-message-dismiss` earlier than the ROM's A
   (F+30 vs the lab's F+43 / F+46), so nothing here checks when the box becomes dismissable, only what the dismiss plays.
2. **+18 vs +22 victory BGM** (scout: Explosion self-faint +18, attacker faint +22): only +22 is modelled; a win by the player's own
   self-faint would be 4 ticks late. No step window is committed for it.
3. **Brain bgm 469 one tick earlier (P+52)** and no SE_EXIT are encoded as the measured Brain constants; the cause (between P+43 and
   `PlayBGM`) is still unexplained.
4. A Brain **loss** is not measured: it uses the ordinary loss rules with the 471 fade and SE_EXIT (unverified).
5. Only the generated orchestrator route is wired. The canonical recorded route (`core.ts` ~2040-2080 `createPostwinState`) and the
   postwin heal/record flow keep their own aud240d sounds; no end sounds on that route.
6. The victory BGM id is chosen by `frontierBrain` (Silver/Gold Factory Head -> 354). The Gold Brain's BGM was not separately measured.
7. A `message` box that is a faint of the *player's* mon during a win (both sides faint) or a draw is not distinguished beyond
   `battleOutcome` bits; Explosion double-KO windows were not staged.
8. SE_SELECT on a button box is emitted without checking that the ROM's text printer waits for A for that string; it matches every
   observed window (terminal texts, final and replacement faints).

## Verification

See the final section appended by the verification run (tested commit / tree and outcomes).
