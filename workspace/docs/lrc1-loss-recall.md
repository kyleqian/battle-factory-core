# lrc1: after a lost battle the foe goes back into its ball (2026-11-20)

The frame catcher sweep (`docs/fcs1-catcher-sweep.md`, finding 2) found that when the player's last Pokémon faints, our foe's
Pokémon vanished at once and the ball sound played 22 frames later over an empty field, while the ROM sends it back into its ball
(pink fade, sparkles, shrink) before the trainer slides in. Fixed here, both scenes, and pinned by `tests/lrc1LossRecall.test.ts`
(red with the fix undone). The fix also gives the loss tail the ROM's length, so the win text now prints (and can be dismissed)
67 frames later than before: that is a gameplay-timing change, proved below; no RNG draw moved.

Branch `fix/loss-recall`, cut from `catcher-sweep` (aa97e2153). Evidence (not in git): `.integration/evidence/fix-loss-recall/`.

## ROM

`BattleScript_LocalBattleLostPrintTrainersWinText` (`data/battle_scripts_1.s:2960-2968`):
`returnopponentmon1toball BS_ATTACKER` / `waitstate` / `returnopponentmon2toball` / `waitstate` / `trainerslidein` / `waitstate` /
`printstring STRINGID_TRAINER1WINTEXT`.

- `VARIOUS_RETURN_OPPONENT_MON1` (`src/battle_script_commands.c:6455-6461`): while battler 1 has HP,
  `BtlController_EmitReturnMonToBall(B_COMM_TO_CONTROLLER, FALSE)`.
- `OpponentHandleReturnMonToBall` (`src/battle_controller_opponent.c:1200-1215`) with the FALSE (animated) argument runs
  `DoSwitchOutAnimation` (`:1217-1235`): B_ANIM_SWITCH_OUT_OPPONENT_MON = `Special_SwitchOutOpponentMon`
  (`data/battle_anim_scripts.s:10719-10723`: `AnimTask_SwitchOutBallEffect` = ball-open particles + SE_BALL_OPEN + the ball fade of
  the mon and the battle background, `delay 10`, `AnimTask_SwitchOutShrinkMon`), then `FreeMonSpriteAfterSwitchOutAnim` frees the sprite
  and hides the healthbox. The `waitstate` holds the script until then. This is the same return to ball as an AI switch's
  (`docs/ais1-ai-switch-withdraw.md`, ais2), which ours already draws frame-exact.
- `SpriteCB_EnemyShadow` hides an elevated foe's shadow while `gAnimScriptActive`.
- After the slide: printstring's first row shows 3 rows after the slide settles (`docs/terminal-seam-antecedent-boundary-probe.md` §3:
  exec-flag sampling lag, waitstate's own row, the printer's render lag).

### Frames (seed 0 Scene OFF, battle 7; `fcs1/final/r0-off-ws`)

B = the loss's SE_BALL_OPEN. Engine frames before the fix, ROM frames from the catcher's ROM run (frame-exact ground truth).

| event | ROM | ROM rel. B | ours before | ours before rel. B |
|---|---|---|---|---|
| A on "ARIADOS fainted!" | 105,572 | -28 | 99,690 | -24 |
| foe gone at once | | | 99,692 | -22 |
| SE_BALL_OPEN (B) | 105,600 | 0 | 99,714 | 0 |
| first recall picture (BG fade 2/16, mon tint 1/16, first particle) | 105,603 | +3 | | |
| foe sprite gone after the shrink | ~105,625 | +25 | | |
| healthbox gone | 105,630 | +30 | | |
| last particle | 105,642 | +42 | | |
| trainer slide: first pixel / settled | 105,655 / 105,681 | +55 / +81 | 99,705 / 99,731 | -9 / +17 |
| win text first row | 105,684 | +84 | 99,731 | +17 |

All 8 lost battles of the sweep (seeds 0 OFF / ON, 2 ON, 22 OFF / ON, 23 ON, 26 OFF / ON): win text at B + 84 on the ROM every time
(ours before: B + 17 or 18). The slide's first pixel depends on the trainer's picture; the slide itself is at the same B offset. The DUSCLOPS
loss lab (`docs/terminal-seam-loss-path-ground-truth.md`, the same ROM window as `tools/audio/fixtures/aud241c-loss-off-window.json`)
gives the same chain from the controller side: recall dispatch 2951 (D), SE_BALL_OPEN 2953 (D + 2), slide dispatch 2996 (D + 45),
slide settled 3034, win text 3037 (D + 86).

So the ROM's loss tail from the recall's dispatch D is: SE D + 2, healthbox gone D + 32, trainer slide (our model's el 0) D + 45, settled
D + 83, win text D + 86. Ours (with D = B - 2) hid the foe at D - 20, started the slide at D - 19 and the win text at D + 19 (B + 17):
67 frames short of the ROM's B + 84, plus the A -> D gap of "Open" 1 (0-6 frames).

## Change

- `src/engine/battleResolutionPresentation.ts`: the loss tail's `set-battler-sprite-visibility` (opcode `B_SCR_OP_VARIOUS`, label
  `BattleScript_LocalBattleLostPrintTrainersWinText`, battler 1) now projects to a `switch-out` of battler 1 with
  `leadFrames: LOSS_RECALL_LEAD_FRAMES` (20) and `minimumFrames` 20 + 32, then the recall receipt (`sprite-visibility`, `recall`,
  `LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES` = 13), then the trainer slide with `holdFrames: LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES` (3).
  The lead is the script rows between the last "fainted!" box's A and the dispatch; it keeps the SE_BALL_OPEN frame aud241c / aud252
  measured (command start + 22 = lead + 2), so the sound did not move. `switchOutRecallElapsed` gives the recall clock.
- `src/engine/battleResolutionPresentationRender.ts`: a lead switch-out leaves the foe to the ordinary draw (at rest, ordinary-row idle
  rest in Scene ON, Substitute doll swap at the dispatch) until its recall clock starts; the ball effect and the recall's carry-over run
  on the recall clock; a slide's `holdFrames` count in its duration. `MidBattleSwitchOutView.shadowVisible` (recall elapsed 0-2).
- `src/engine/battleScene.ts`: the switch-out sprite of the foe is drawn at its elevation (`gEnemyMonElevation`) and an elevated foe keeps
  its shadow for those 3 rows. Seed 23 Scene ON's DUSTOX dropped to the ground and lost its shadow at the dispatch without this (ROM:
  shadow in 210929-210931, gone from 210932; the mon hovers through the shrink). This is the shared recall draw, so an AI switch of an
  elevated foe gets the same correction (ais2's MURKROW is not elevated; its frame test is unchanged).
- `src/engine/battleStartSounds.ts`: a switch-out's SE_BALL_OPEN is at recall elapsed 2 (+ the lead). `src/engine/battleEndSounds.ts`,
  `src/engine/tickSounds.ts`: the old `emitLossBallOpenSound` (22 ticks after the hide) is removed; the recall's own ball sound replaces it.

The win tail's slide (`BattleScript_FrontierTrainerBattleWon_LoseTexts`) is untouched (see "Open").

## Gameplay timing and RNG

- **Changed (proved):** the win text after a loss starts 67 frames later (B + 84 instead of B + 17), so its earliest accepted A is 67
  frames later. Source: the `waitstate` after `returnopponentmon1toball` waits for `DoSwitchOutAnimation`; ROM frames: the table above,
  8 of 8 lost battles at B + 84, and the DUSCLOPS lab's 2951 -> 3037.
- **Not changed:** the faint box's A -> SE_BALL_OPEN gap (24 on a move faint, 22 on an end-of-turn faint), so aud241c's loss windows
  (A + 24, both scenes) and aud252's SE_BALL_OPEN rows stay as pinned.
- **RNG:** no Random() call in the loss tail (Frontier battles draw no VBlank RNG while `gMain.inBattle`, `src/engine/battleExitRng.ts`
  E1), and the Lobby exit draws are counted from the win text's A (`PostwinState` age). Checked on seed 0 Scene OFF: the gameplay RNG
  value, RNG mode and battle RNG per tick from 3 ticks before the win text's A through the Lobby are identical before / after for the
  first 631 ticks, keyed by ticks since that A; they part only where the trace's fixed-frame presses land 65 frames earlier relative to it (the trace's accepted A moved 99,767 -> 99,832)
  (`.integration/evidence/fix-loss-recall/rng-{before,after}.txt`). A closed-loop player gets the same Lobby. A fixed-frame trace recorded
  on an older build that loses a battle replays differently from the win text on.
- The exact Lobby compare traces (`lbra-loss-off`, `loss-terminal-window-off`) start at or after the slide on a scaffold whose recall event
  is labelled `compare-fixture`, so they keep their own command lists; their Tier-1 tests (`lbra`, `lbrb`-`lbre`, `lbw*`, `battleExitRng`,
  `factoryLobby*`, `factoryTerminal*`) are green.

## Tests

- `tests/lrc1LossRecall.test.ts` (new, both scenes, the aud241c loss stage): one SE_BALL_OPEN at A + 24; the command chain; the foe at
  rest through the lead and the dispatch at B - 2; fade and particles from B + 3 to B + 42, the shrink (304 at B + 15, 736 at B + 24, sprite
  gone at B + 25), healthbox gone at B + 30; slide el 0 at B + 43, settled B + 81, win text at B + 84; the elevated shadow rows. 11 tests,
  10 red with the recall projection undone.
- `tests/factoryVoluntarySwitchSeam.test.ts`: the recall view gained `shadowVisible`.
- `tests/randomRoundSoak.test.ts`, re-pinned as its comments say: the M-B "full" pins 22844 -> 22897 and 61456 -> 61504, "vanilla"
  9205 -> 9319 and 9400 -> 9350 (frames only; same battle / turn / depth / end state; the soak's presses after the longer tail land on new
  phases); the #89 Baton Pass pin 12 -> 3 (`tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 8`: candidates 3, 6, 14, 28, 32, 36).
- Gates on the final tree: `NODE_OPTIONS=--max-old-space-size=8192 tsc -b` clean (`npm run typecheck` needs `flock`, absent on the Mac);
  `npm run test:gate` 360 files / 2,832 tests passed; `npm test` 1,905 files / 16,332 tests passed, 0 failed (44 files skipped, as on
  master).

## Frame catcher, seed 0 Scene OFF (`traces2/r0-off-ws.json`)

Before: `.integration/evidence/fcs1/final/r0-off-ws` (catcher-sweep worktree, engine `869b52918`); after: this branch,
`.integration/evidence/fix-loss-recall/catcher/r0-off-ws` (`KEEP=1 JOBS=1 tools/frame-catcher/run.sh`, 316 s).

| | before | after |
|---|---|---|
| menus followed / ROM stop | 501 / 501, engine-trace-end | 501 / 501, engine-trace-end |
| stretches content / timing | 203 / 297 | 203 / 297 |
| picture differences (all battles) | 358 | 328 |
| sound differences | 0 | 0 |
| differences in battle 7's last stretch (fight menu -> Lobby question, 499) | 30 (the recall: #2 18,540 px over 37 frames, #6, #7, #14, ...) | 1 (#191, 14 px, 1 frame at engine 100,013 in the Lobby; before #177, 8 frames) |
| stretch 499 length engine / ROM | 1,072 / 1,338 frames | 1,151 / 1,152 frames |
| battle 7: A -> SE_BALL_OPEN / -> win text / -> accepted A, engine (ROM) | 24 (28) / 42 (112) / 77 (142) | 24 (28) / 108 (112) / 142 (142) |

Frame by frame from SE_BALL_OPEN - 30 to + 108 the engine's pictures equal the ROM's in all 8 lost battles of the sweep in the field
(rows 0-114; `cmpSplit.py` in the evidence notes); the text box differs only where the ROM cleared the "fainted!" box ("Open" 2) and on
the frames before the A, where the two sides' presses differ. Contact sheet: `.integration/evidence/fix-loss-recall/after-r0-off-b7-recall.png`.

## Open

1. **A -> recall gap.** ROM A -> SE_BALL_OPEN is 24 in both labs (aud241c / DUSCLOPS) but 26-28 in the 8 sweep battles (27 or 28 on a
   move faint, 26 / 28 on end-of-turn faints); ours is 24 (move faint, two moveend rows first) or 22 (end-of-turn faint). Ours is 0-6 frames
   short there; the cause is in the rows between the faint box and `returnopponentmon1toball` (turn end, faint handling), not in the recall.
   Left as is (aud241c / aud252 pin the current frames).
2. **The "fainted!" box after its A.** In 4 of the 8 lost battles (seeds 2 ON, 22 OFF, 23 ON, 26 ON) the ROM clears the box one frame
   after the A; in the other 4 (and the DUSCLOPS lab) it keeps the text with a frozen cursor, as ours always does. Not understood; it now
   shows for 84 frames before the win text instead of 18.
3. **The win tail** has the same 3 slide -> print rows and, from the A on "Player defeated ...!" to the slide, ~14 frames the ROM spends
   that ours does not (seed 0 Scene OFF battle 1: ours slide el 0 at the A, ROM 14 later; text 17 frames early overall). Not changed here:
   it moves every won battle.
4. A foe behind a Substitute at the loss: the ROM plays SUBSTITUTE_TO_MON before the recall (`DoSwitchOutAnimation` state 0); ours swaps
   the doll at the dispatch with no animation and no extra rows (as the AI switch). Not seen in the sweep.
5. The faint text of seed 0 battle 7 prints one frame early (ours 99,666-99,682 vs ROM 105,552-105,568 at the recall's alignment).
