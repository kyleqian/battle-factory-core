# vis243a: send-in animations cut short -- census, ROM wait rule and the family fix

Status: **Part 1 (census) and Part 2 (family fix for the mid-battle voluntary player send-in, Scene ON and OFF) are done.** The
opponent mid-battle send-in already waits for the species animation (verified, no change). The **battle-start "Go!" intro is not
fixed** (a fixed canonical-tick timeline, bso226's known timing residual); the exact fix plan is in section 7.

## 1. Symptom and root cause

Kyle's voluntary switch to KOFFING ("Go! KOFFING!") grows to its GROW pose, freezes ~9 frames, then snaps to normal when the next
"Foe AIPOM used ..." message starts. Cause: `switchInTiming` (`src/engine/battleResolutionPresentation.ts`) gave the voluntary player
send-in a **fixed** span (`SWITCH_IN_TIMING` = 91 frames + the 11-frame waitstate hold = 102 elapsed). The ROM does not time the send-in; it
**waits for the sprite callback** that the species back animation owns (section 3). The forced ("X was dragged out!") path already had the
ROM chain (snd182: `shift + max(91, cry + 66, T_back + 70)`); the voluntary path never got it.

## 2. Method

* `T_back(species, nature)` = `backAnimWaitTick`: the first reducer tick whose callback is `WaitAnimEnd` (ported back-animation reducer,
  `src/engine/switchInTail.ts`). Nature = personality % 25 (`GetNature`), so the animation (and the window) is nature dependent for 315 of the
  376 species.
* The back animation's tick 0 renders at send-in elapsed 66 (`MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED`), so the animation ends at elapsed
  `66 + T_back`; the ROM-correct send-in end (next print) is `max(91, cry + 66, T_back + 70) + 11` (Scene ON; CASTFORM +1), Scene OFF
  `max(91, cry + 66) + 11`.
* Census: `tools/integration/vis243aCensus.ts` (all 376 Factory-reachable species x 25 natures; run against the pre-fix window of 102).
  Opponent columns come from the species send-in tail table (`src/data/sendInTail.ts`, source-extracted front-animation tables,
  `opponentSwitchInDuration`).
* ROM evidence: mechanicLab voluntary switch staged by `tools/integration/vis243aStage.py` (`overrides.parties`), dense step-1 mGBA windows
  through `bin/oracle --profile battle-scene-on|off lab`; the first frame of the opponent's next print is the measured end of the send-in
  (`tools/integration/fixtures/vis243a/rom-voluntary-send-in.json`, 12 Scene ON + 4 Scene OFF probes). Pixel comparison through the
  production path: `tools/integration/vis243aCompare.ts` (`createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView`).

## 3. The ROM's own wait rule

All paths in `reference/pokeemerald/src`.

**Player send-in** (`PlayerHandleSwitchInAnim`, `battle_controller_player.c:2185-2195`, then `SwitchIn_TryShinyAnimShowHealthbox`):

1. `battle_controller_player.c:1098-1115` `SwitchIn_TryShinyAnimShowHealthbox`: waits for the ball (`gBattleControllerData` sprite callback is
   `SpriteCallbackDummy` and `!ballAnimActive`), then shows the healthbox -> `SwitchIn_CleanShinyAnimShowSubstitute`.
2. `battle_controller_player.c:1065-1085` `SwitchIn_CleanShinyAnimShowSubstitute`: proceeds only when the healthbox callback is
   `SpriteCallbackDummy`, `finishedShinyMonAnim`, **and `gSprites[gBattlerSpriteIds[gActiveBattler]].callback == SpriteCallbackDummy`** (line
   1067-1069) -- the battler (mon) sprite's callback.
3. That callback is the back animation: `pokeball.c:750-760` `SpriteCB_ReleaseMonFromBall` -> `battle_main.c:2982-2988`
   `SpriteCB_PlayerMonFromBall` -> `pokemon.c:6886-6900` `BattleAnimateBackSprite`: with `HITMARKER_NO_ANIMATIONS` (and not link) it sets
   `callback = SpriteCallbackDummy` at once (**Scene OFF: no wait**); otherwise it launches `LaunchAnimationTaskForBackSprite` and sets
   `SpriteCallbackDummy_2`, which becomes `SpriteCallbackDummy` only when the animation task ends (**Scene ON: waits the whole animation**).
4. `battle_controller_player.c:1087-1096` `SwitchIn_HandleSoundAndEnd`: `!specialAnimActive && !IsCryPlayingOrClearCrySongs()` -- the cry
   must have finished -- then `PlayerBufferExecCompleted`. The next print follows after the 11-frame waitstate hold.

**Opponent send-in** (`OpponentHandleSwitchInAnim`, `battle_controller_opponent.c:1160-1166`):

1. `:500-514` `SwitchIn_TryShinyAnim` waits for the ball, `:482-498` `SwitchIn_ShowHealthbox` waits for `finishedShinyMonAnim` **and the battler
   sprite callback == `SpriteCallbackDummy`** (line 484-485): the front animation (`battle_main.c:2836-2848` `SpriteCB_OpponentMonFromBall` ->
   `BattleAnimateFrontSprite`, `pokemon.c:6803-6809`; `SKIP_FRONT_ANIM` under `HITMARKER_NO_ANIMATIONS`, so **Scene OFF skips it**).
2. `:469-480` `SwitchIn_HandleSoundAndEnd` waits for the cry and the sprite callback (`SpriteCallbackDummy` or `SpriteCallbackDummy_2`).

**Battle start**: `Intro_WaitForShinyAnimAndHealthbox` (`battle_controller_player.c:940`, `battle_controller_opponent.c:223`) waits on the
same battler-sprite callbacks, so "Go!" and the menu come after the animations (bso226: 39..98 frames after the app's fixed timeline).

## 4. Census (before the fix)

Window the voluntary path gave: **102** elapsed for every species and nature. Window the ROM rule needs: **102..213**.

| quantity | value |
|---|---|
| Factory-reachable species | 376 |
| species whose back animation is clipped for at least one nature | 343 (33 never clipped) |
| species clipped for all 25 natures | 205 |
| species whose window is shorter than the ROM wait for at least one nature | 376 (368 for every nature) |
| worst window shortfall | 111 frames |
| worst back-animation clip (frames of animation the snap removes) | 95 frames |
| back-animation wait tick `T_back` | 18..131 (nature dependent for 315 species) |
| cry frames | 11..134 |
| opponent front-animation end | 34..230; opponent window already species keyed, 96..292 |

Per-path window each species gets (after the fix, identical to the ROM rule; test-pinned for all 376 x 25 natures):

| path | window |
|---|---|
| voluntary player, Scene ON | `max(91, cry + 66, T_back + 70) + 11` (+1 CASTFORM) |
| voluntary player, Scene OFF | `max(91, cry + 66) + 11` (+1 CASTFORM) |
| forced player ("dragged out!", Roar / Whirlwind, faint replacement), Scene ON / OFF | same without the 11 (the forced path was already ROM-exact; snd182) |
| opponent, Scene ON | `slideStart + 26` with `slideStart = 36 + castform + max(S, A + delay - 1)` (snd145; front animation) |
| opponent, Scene OFF | cry-bound offs152 tail (front animation skipped) |
| battle-start intro | fixed canonical timeline -- **not** ROM-waiting (section 7) |

Full per-species table in the appendix (clipped species first). "clipped" = back-animation frames removed when the next print arrives at
the old window; "short" = how much earlier than the ROM the next print arrives.

## 5. The fix (Part 2)

`switchInTiming` (`src/engine/battleResolutionPresentation.ts`): `battler === 0` now returns the forced-path duration
(`sceneOnPlayerForcedSwitchInDuration` / `sceneOffPlayerForcedSwitchInDuration`) instead of the fixed 91; the switch-in command still adds the
11-frame hold (`minimumFrames + settleHoldFrames`), so voluntary = forced + 11 in the same scene. The second call site (final-state-driven
switch-in) picks the rule up automatically. The switch-in command builder gives CASTFORM the forced path's +1 (healthbox slide 67, visual
delay 1), as the ROM probe shows. No new constants, no per-species data: one shared function, one ROM rule, both scenes.

### Dense ROM probes: the formula equals the ROM on 16 / 16

First frame of the next print, as send-in elapsed (`romNextText`) vs production (`appElapsed`):

| scene | species (nature) | ROM | app |
|---|---|---|---|
| ON | KOFFING (0 / 7 / 20) | 146 / 145 / 145 | 146 / 145 / 145 |
| ON | CATERPIE (0) | 102 | 102 |
| ON | PIDGEY (3) | 118 | 118 |
| ON | CASTFORM (0) | 182 | 183 (ball visual delay +1; the print itself matches the ROM) |
| ON | SMEARGLE (5) | 122 | 122 |
| ON | MAGBY (0) | 209 | 209 |
| ON | ONIX (3) | 147 | 147 |
| ON | SPINDA (0) | 124 | 124 |
| ON | SPOINK (10) | 145 | 145 |
| ON | JYNX (0) | 211 | 211 |
| OFF | ONIX (3) / KOFFING (0) / PIDGEY (3) / SPINDA (0) | 147 / 135 / 102 / 112 | 147 / 135 / 102 / 112 |

Pinned by `tests/vis243aVoluntarySendIn.test.ts` (ROM probes, the identity voluntary = forced + hold for every species, and a production
render test).

### Before / after pixels (KOFFING, nature 0, Scene ON, voluntary switch; dense ROM window, per send-in elapsed e)

Receipt: `tools/integration/fixtures/vis243a/koffing-before-after-px.json` (every e 60..148, per region). before = the fixed 102 window,
after = production (146). Differing pixels vs the ROM:

| e | before (sprite / text / total) | after |
|---|---|---|
| 101 | 0 / 0 / 0 | 0 |
| 102 (old snap + next print) | 735 / 383 / 1118 | 0 |
| 103 | 846 / 351 / 1197 | 0 |
| 104 | 981 / 366 / 1347 | 0 |
| 110 | 1420 / 319 / 1739 | 0 |
| 120 | 1314 / 600 / 1914 | 0 |
| 130 (ROM animation over, text box still wrong) | 0 / 664 / 664 | 0 |
| 140 | 0 / 664 / 664 | 0 |
| 145 | 0 / 664 / 664 | 0 |
| 146 (ROM next print) | 0 / 684 / 684 | 0 |
| 148 | 0 / 617 / 617 | 0 |

Player sprite region over the whole send-in: 32,129 px on 29 rows before, **94 px on 1 row after** (e = 66, the back animation's first
frame; unchanged from before the fix and unrelated). Every row from e = 102 through 148 is 0 px after (58,033 px before).

### Opponent send-in (verified, no change needed)

Opponent faint-replacement send-in of SPOINK (ANIM_H_JUMPS_V_STRETCH_TWICE), Scene ON, `vis243aStageOpp.py` + `vis243aCompare.ts --opp`, dense
ROM window: opponent **sprite region 0 px over all 217 send-in rows** (animation start to end, window 219); the opponent healthbox is 0 px
from e = 60 on (5,503 px in e < 60, the ball / slide-in phase, not touched here). The message band is not claimed by that harness (the player
half is transplanted). So the mid-battle opponent window already tracks the front animation; the SPOINK report matches the battle-start
intro (section 7), not this path.

### Roar / Whirlwind, faint replacements

Roar / Whirlwind on the player (`forced`) already used the ROM chain (snd182) and are unchanged. The player faint-replacement send-in is built by
the same non-forced switch-in command as a voluntary switch, so it moved with the family fix; `tests/pfr192PlayerFaintSendInClock.test.ts` and
`tests/plr162PlayerForcedSendIn.test.ts` pinned the old fixed 91 for those commands and now pin the species rule (section 8).

## 6. Scene OFF

The ROM rule applies partially: `BattleAnimateBackSprite` / `BattleAnimateFrontSprite` skip the animations under `HITMARKER_NO_ANIMATIONS`
(`pokemon.c:6805, 6888`), so the back/front animation wait is a no-op, but the **cry** wait (`SwitchIn_HandleSoundAndEnd`) remains. Scene OFF
therefore uses `max(91, cry + 66)`: 4 / 4 dense Scene OFF probes exact (table above); long-cry species (ONIX 70, KOFFING 58, SPINDA 35 frames of cry) gain a longer window.

## 7. Not fixed: battle-start "Go!" (named follow-up with an exact plan)

The generated battle-start intro is a fixed timeline: `battleScene.ts` draws the player throw at `BRENDAN_THROW_START_TICK = 1574`,
`PLAYER_MATERIALIZE_START_TICK = 1653`, with the opponent held at its settled front frame (`GENERATED_INTRO_OPPONENT_SETTLED_LOCAL = 4096`,
~`battleScene.ts:5373`, 5862) and the Scene ON animations riding the mid-battle views
(`generatedBattleStartOpponentAnimAt` / `generatedBattleStartPlayerAnimAt`, `battleResolutionPresentationRender.ts:581-600`). bso226 measured the
ROM "Go!" 39..98 frames later than the app for long-animation species, and a long opponent front animation (SPOINK) means the ROM holds
the opponent's "Go!" print for the whole front animation while the app's throw starts at its fixed tick.

Plan (not done: it changes canonical-tick constants shared with the committed 715/715 `interactive-generated-intro-off` pin and the
orchestrator's intro frame counts, so it needs its own differential and census round):

1. Make the intro timeline data-driven by the same two numbers the mid-battle path already has: opponent front-animation end
   (`opponentSwitchInDuration`-style, `SEND_IN_TAIL_FRONT_ANIM_DURATION`) before the "Go!" print / player throw, and the player back-animation
   wait (`backAnimWaitTick`, cry bound as in `sceneOnPlayerForcedSwitchInDuration`) before the action menu.
2. Insert the extra hold as intro-local ticks after the opponent materialize, not by editing the canonical-tick constants: add two helpers
   (names proposed) `generatedIntroOpponentAnimHold(species)` (= front-animation end minus the app's current lead before the throw, >= 0) and
   `generatedIntroPlayerAnimHold(species, personality)`, and thread them through the orchestrator's intro frame count. Scene OFF returns 0 for
   the animation part (no animation wait; the cry bound only).
3. Prove with the bso226 harness (`tools/integration/bso226Run.ts`, five windows) with `--lag` set to 0 on the long-animation windows
   (WAILMER 98@517, SPINDA 39@475 become exact), `interactive-generated-intro-off` unchanged, census digests only moving on intro frame
   counts.

## 8. Re-pinned tests (each is the old fixed voluntary 91 now being the species rule)

| test | change |
|---|---|
| `tests/battleResolutionPresentation.test.ts` | MACHOP Scene OFF voluntary span 91 -> `sceneOffPlayerForcedSwitchInDuration(66)` = 104 (cry bound) |
| `tests/pfr192PlayerFaintSendInClock.test.ts` | TYPHLOSION Scene ON / CASTFORM Scene OFF non-forced player timing 91 -> `sceneOnPlayerForcedSwitchInDuration(157, 0)` / `sceneOffPlayerForcedSwitchInDuration(385)` |
| `tests/plr162PlayerForcedSendIn.test.ts` | non-forced player send-in commands (faint replacement) pin the species rule instead of `SWITCH_IN_SPAN_FRAMES`; CASTFORM carries the +1 slide / visual delay; TYPHLOSION Scene OFF voluntary = 174 (cry bound) |
| `tests/sendInTail.test.ts` | player `switchInTiming(0, ...)` = the Scene ON rule (not the calibrated 91); the player slide stays 66 |
| `tests/snd182SceneOnForcedPlayerSendIn.test.ts` | the voluntary `switchInTiming` expectations are now the forced duration (+ the hold carried by the command); opponent unchanged |
| `tests/factoryVoluntarySwitchSeam.test.ts` | HARIYAMA (Scene OFF, cry-bound) voluntary switch-in span 91 -> `sceneOffPlayerForcedSwitchInDuration(336)` = 113 (+ the 11-frame hold) |
| `tests/randomRoundSoak.test.ts` (3 pins, below) | soak trajectories moved with the presentation clock |
| `tests/vis243aVoluntarySendIn.test.ts` | new: ROM probes, identity for all species, KOFFING production render |

### Soak pins (per-pin explanation)

The soak driver's exploring policy presses buttons from a frame-keyed cooldown stream, so any change of presentation length (here: longer player
send-ins) shifts which phase each press lands on and gives the exploring seeds a new trajectory -- the same mechanism recorded at soak111,
fsw235 and pmo239. This is not a gameplay change: with a fixed input script the 1000-battle census (section 9) is digest-identical.

| pin | before | after | explanation |
|---|---|---|---|
| seed 0, `full` (M-B step 2 (c)) | 37753 frames / battle 2 / turn 26 | 38729 / battle 2 / turn 28 | new exploring trajectory; same battle, end state `roundLost`, depth 1 |
| seed 1, `full` (same test) | 17862 / battle 1 / turn 31 | 21359 / battle 1 / turn 37 | new exploring trajectory; same battle, end state, depth 0 |
| ISSUES #89 Baton Pass halt, seed 19 | seed 19 commits Baton Pass in battle 2 | seed 19 now plays 50860 frames / battle 3 / turn 12 with no Baton Pass; pin moved to seed 30 | re-scan of full-policy seeds 0..127 with the restored scratch `soak111BatonPassSearch.ts` (same options as the pin): hits 28, 30, 32, 57, 63, 64, 118, 127; seed 30 is the lowest ending in battle 2 as a genuine loss (3 Baton Pass commits, halt in battleIndex 0 of the chained round, as 19 had); test name and comment updated |

## 9. Gates

* **Census** (`tools/integration/lsd194Census.sh`, `LSD194_CENSUS_JOBS=2 LSD194_SPLIT=4`, seeds 0..999, both scenes, tested tree `dac9cd2fe`)
  vs baseline `.integration/validation/sv-20261101/cln237-evidence/census/{on,off}-4f6fa87e4` through `rst197CensusDelta.py`:
  **0 bad battles in both scenes** (events digest and error equal and the command type sequence equal in all 1000 battles each). Moved: Scene ON
  929 / 1000 battles changed, 1,725 `switch-in` commands, +84,874 frames; Scene OFF 918 / 1000 battles, 1,638 `switch-in` commands, +49,739
  frames. Every changed command is a `switch-in` whose duration field (2) and total-frames field (18) rose from the old 91 (102) to the species
  window (never lower); no other command type moved. Five seeds per scene (367, 473, 603, 870, 945) also moved fields 5 / 6: the player's
  CASTFORM send-in now carries the forced path's healthbox slide 67 and visual delay 1. Gameplay outcomes (events digest) unchanged.
* **`npm run compare:differential`** vs the parent `c06d8fc8a`: **PASS, all 211 standard traces, 38,532 / 38,532 captures byte-identical**
  (the three acceptance traces alone: 641 / 641). No capture changed, so the standard traces do not exercise a clipped voluntary player
  send-in; the changed behaviour is evidenced by the dense ROM probes and the census, not by these traces.
* `npm run typecheck`, `npm run test:smoke` (8 files, 448 tests), full `npm test`, `npm run build`: results recorded in section 10.

## Appendix: per-species census (pre-fix window 102)

Columns: cry frames; back-animation wait tick `T_back` (min..max over the 25 natures); ROM window needed (voluntary, Scene ON); back-animation frames clipped by the old window (min..max); natures clipped of 25; opponent front-animation end; opponent send-in window (already species keyed).

| id | species | cry | T_back | needed window | anim clipped | natures clipped | opp anim end | opp window |
|---|---|---|---|---|---|---|---|---|
| 1 | BULBASAUR | 47 | 61..91 | 142..172 | 25..55 | 25 | 66 | 128 |
| 2 | IVYSAUR | 47 | 21..81 | 124..162 | 0..45 | 17 | 47 | 109 |
| 3 | VENUSAUR | 55 | 33..77 | 132..158 | 0..41 | 17 | 74 | 136 |
| 4 | CHARMANDER | 41 | 43..65 | 124..146 | 7..29 | 25 | 58 | 120 |
| 5 | CHARMELEON | 41 | 20..35 | 118..118 | 0..0 | 0 | 65 | 127 |
| 6 | CHARIZARD | 55 | 128..128 | 209..209 | 92..92 | 25 | 45 | 107 |
| 7 | SQUIRTLE | 41 | 43..65 | 124..146 | 7..29 | 25 | 110 | 172 |
| 8 | WARTORTLE | 49 | 43..65 | 126..146 | 7..29 | 25 | 50 | 112 |
| 9 | BLASTOISE | 55 | 128..128 | 209..209 | 92..92 | 25 | 128 | 190 |
| 10 | CATERPIE | 24 | 21..81 | 102..162 | 0..45 | 17 | 110 | 172 |
| 11 | METAPOD | 66 | 61..91 | 143..172 | 25..55 | 25 | 102 | 164 |
| 12 | BUTTERFREE | 29 | 87..131 | 168..212 | 51..95 | 25 | 102 | 164 |
| 13 | WEEDLE | 46 | 21..81 | 123..162 | 0..45 | 17 | 91 | 153 |
| 14 | KAKUNA | 52 | 61..91 | 142..172 | 25..55 | 25 | 85 | 147 |
| 15 | BEEDRILL | 55 | 41..41 | 132..132 | 5..5 | 25 | 88 | 150 |
| 16 | PIDGEY | 11 | 18..37 | 102..118 | 0..1 | 8 | 82 | 144 |
| 17 | PIDGEOTTO | 43 | 20..35 | 120..120 | 0..0 | 0 | 66 | 128 |
| 18 | PIDGEOT | 49 | 18..37 | 126..126 | 0..1 | 8 | 50 | 112 |
| 19 | RATTATA | 23 | 33..86 | 114..167 | 0..50 | 17 | 87 | 149 |
| 20 | RATICATE | 27 | 33..86 | 114..167 | 0..50 | 17 | 65 | 127 |
| 21 | SPEAROW | 50 | 18..37 | 127..127 | 0..1 | 8 | 102 | 164 |
| 22 | FEAROW | 49 | 20..35 | 126..126 | 0..0 | 0 | 66 | 128 |
| 23 | EKANS | 55 | 18..37 | 132..132 | 0..1 | 8 | 80 | 142 |
| 24 | ARBOK | 55 | 33..77 | 132..158 | 0..41 | 17 | 50 | 112 |
| 25 | PIKACHU | 47 | 56..81 | 137..162 | 20..45 | 25 | 85 | 147 |
| 26 | RAICHU | 67 | 56..81 | 144..162 | 20..45 | 25 | 85 | 147 |
| 27 | SANDSHREW | 27 | 43..65 | 124..146 | 7..29 | 25 | 52 | 114 |
| 28 | SANDSLASH | 39 | 43..65 | 124..146 | 7..29 | 25 | 50 | 112 |
| 29 | NIDORAN_F | 28 | 43..65 | 124..146 | 7..29 | 25 | 86 | 148 |
| 30 | NIDORINA | 36 | 20..35 | 113..116 | 0..0 | 0 | 50 | 112 |
| 31 | NIDOQUEEN | 48 | 33..77 | 125..158 | 0..41 | 17 | 50 | 112 |
| 32 | NIDORAN_M | 30 | 43..65 | 124..146 | 7..29 | 25 | 42 | 104 |
| 33 | NIDORINO | 34 | 20..35 | 111..116 | 0..0 | 0 | 50 | 112 |
| 34 | NIDOKING | 69 | 33..77 | 146..158 | 0..41 | 17 | 75 | 137 |
| 35 | CLEFAIRY | 24 | 61..91 | 142..172 | 25..55 | 25 | 50 | 112 |
| 36 | CLEFABLE | 30 | 61..91 | 142..172 | 25..55 | 25 | 168 | 230 |
| 37 | VULPIX | 67 | 43..65 | 144..146 | 7..29 | 25 | 85 | 147 |
| 38 | NINETALES | 69 | 41..41 | 146..146 | 5..5 | 25 | 85 | 147 |
| 39 | JIGGLYPUFF | 15 | 61..91 | 142..172 | 25..55 | 25 | 88 | 150 |
| 40 | WIGGLYTUFF | 19 | 64..114 | 145..195 | 28..78 | 25 | 85 | 147 |
| 41 | ZUBAT | 55 | 87..131 | 168..212 | 51..95 | 25 | 50 | 112 |
| 42 | GOLBAT | 55 | 33..77 | 132..158 | 0..41 | 17 | 102 | 164 |
| 43 | ODDISH | 41 | 21..81 | 118..162 | 0..45 | 17 | 72 | 134 |
| 44 | GLOOM | 36 | 21..81 | 113..162 | 0..45 | 17 | 98 | 160 |
| 45 | VILEPLUME | 73 | 41..81 | 150..162 | 5..45 | 25 | 168 | 230 |
| 46 | PARAS | 79 | 21..81 | 156..162 | 0..45 | 17 | 110 | 172 |
| 47 | PARASECT | 86 | 33..77 | 163..163 | 0..41 | 17 | 95 | 157 |
| 48 | VENONAT | 44 | 33..86 | 121..167 | 0..50 | 17 | 85 | 147 |
| 49 | VENOMOTH | 46 | 87..131 | 168..212 | 51..95 | 25 | 109 | 171 |
| 50 | DIGLETT | 55 | 33..77 | 132..158 | 0..41 | 17 | 65 | 127 |
| 51 | DUGTRIO | 55 | 33..77 | 132..158 | 0..41 | 17 | 125 | 187 |
| 52 | MEOWTH | 27 | 43..65 | 124..146 | 7..29 | 25 | 81 | 143 |
| 53 | PERSIAN | 54 | 18..37 | 131..131 | 0..1 | 8 | 70 | 132 |
| 54 | PSYDUCK | 37 | 21..81 | 114..162 | 0..45 | 17 | 85 | 147 |
| 55 | GOLDUCK | 32 | 41..81 | 122..162 | 5..45 | 25 | 85 | 147 |
| 56 | MANKEY | 47 | 43..65 | 124..146 | 7..29 | 25 | 93 | 155 |
| 57 | PRIMEAPE | 46 | 43..65 | 124..146 | 7..29 | 25 | 90 | 152 |
| 58 | GROWLITHE | 38 | 20..35 | 115..116 | 0..0 | 0 | 69 | 131 |
| 59 | ARCANINE | 49 | 20..35 | 126..126 | 0..0 | 0 | 89 | 151 |
| 60 | POLIWAG | 32 | 43..65 | 124..146 | 7..29 | 25 | 50 | 112 |
| 61 | POLIWHIRL | 19 | 33..77 | 114..158 | 0..41 | 17 | 78 | 140 |
| 62 | POLIWRATH | 32 | 78..78 | 159..159 | 42..42 | 25 | 79 | 141 |
| 63 | ABRA | 66 | 41..81 | 143..162 | 5..45 | 25 | 72 | 134 |
| 64 | KADABRA | 76 | 41..81 | 153..162 | 5..45 | 25 | 72 | 134 |
| 65 | ALAKAZAM | 89 | 31..43 | 166..166 | 0..7 | 16 | 78 | 140 |
| 66 | MACHOP | 38 | 20..35 | 115..116 | 0..0 | 0 | 100 | 162 |
| 67 | MACHOKE | 39 | 33..77 | 116..158 | 0..41 | 17 | 84 | 146 |
| 68 | MACHAMP | 47 | 33..77 | 124..158 | 0..41 | 17 | 77 | 139 |
| 69 | BELLSPROUT | 22 | 31..43 | 112..124 | 0..7 | 16 | 42 | 104 |
| 70 | WEEPINBELL | 42 | 31..43 | 119..124 | 0..7 | 16 | 110 | 172 |
| 71 | VICTREEBEL | 55 | 31..43 | 132..132 | 0..7 | 16 | 74 | 136 |
| 72 | TENTACOOL | 45 | 21..81 | 122..162 | 0..45 | 17 | 52 | 114 |
| 73 | TENTACRUEL | 65 | 21..81 | 142..162 | 0..45 | 17 | 100 | 162 |
| 74 | GEODUDE | 67 | 78..78 | 159..159 | 42..42 | 25 | 88 | 150 |
| 75 | GRAVELER | 79 | 33..77 | 156..158 | 0..41 | 17 | 88 | 150 |
| 76 | GOLEM | 40 | 33..77 | 117..158 | 0..41 | 17 | 74 | 136 |
| 77 | PONYTA | 43 | 128..128 | 209..209 | 92..92 | 25 | 66 | 128 |
| 78 | RAPIDASH | 53 | 20..35 | 130..130 | 0..0 | 0 | 60 | 122 |
| 79 | SLOWPOKE | 21 | 21..81 | 102..162 | 0..45 | 17 | 98 | 160 |
| 80 | SLOWBRO | 38 | 61..91 | 142..172 | 25..55 | 25 | 105 | 167 |
| 81 | MAGNEMITE | 55 | 18..37 | 132..132 | 0..1 | 8 | 138 | 200 |
| 82 | MAGNETON | 68 | 18..37 | 145..145 | 0..1 | 8 | 98 | 160 |
| 83 | FARFETCHD | 21 | 21..81 | 102..162 | 0..45 | 17 | 88 | 150 |
| 84 | DODUO | 55 | 18..37 | 132..132 | 0..1 | 8 | 82 | 144 |
| 85 | DODRIO | 55 | 20..35 | 132..132 | 0..0 | 0 | 104 | 166 |
| 86 | SEEL | 51 | 61..91 | 142..172 | 25..55 | 25 | 120 | 182 |
| 87 | DEWGONG | 60 | 21..81 | 137..162 | 0..45 | 17 | 98 | 160 |
| 88 | GRIMER | 30 | 31..43 | 112..124 | 0..7 | 16 | 82 | 144 |
| 89 | MUK | 42 | 31..43 | 119..124 | 0..7 | 16 | 109 | 171 |
| 90 | SHELLDER | 44 | 61..91 | 142..172 | 25..55 | 25 | 60 | 122 |
| 91 | CLOYSTER | 59 | 18..37 | 136..136 | 0..1 | 8 | 102 | 164 |
| 92 | GASTLY | 66 | 41..41 | 143..143 | 5..5 | 25 | 130 | 192 |
| 93 | HAUNTER | 67 | 41..41 | 144..144 | 5..5 | 25 | 98 | 160 |
| 94 | GENGAR | 42 | 41..81 | 122..162 | 5..45 | 25 | 115 | 177 |
| 95 | ONIX | 70 | 33..77 | 147..158 | 0..41 | 17 | 110 | 172 |
| 96 | DROWZEE | 82 | 61..91 | 159..172 | 25..55 | 25 | 103 | 165 |
| 97 | HYPNO | 82 | 41..81 | 159..162 | 5..45 | 25 | 105 | 167 |
| 98 | KRABBY | 69 | 33..86 | 146..167 | 0..50 | 17 | 48 | 110 |
| 99 | KINGLER | 69 | 33..77 | 146..158 | 0..41 | 17 | 110 | 172 |
| 100 | VOLTORB | 70 | 20..35 | 147..147 | 0..0 | 0 | 62 | 124 |
| 101 | ELECTRODE | 71 | 20..35 | 148..148 | 0..0 | 0 | 84 | 146 |
| 102 | EXEGGCUTE | 54 | 21..81 | 131..162 | 0..45 | 17 | 90 | 152 |
| 103 | EXEGGUTOR | 90 | 43..65 | 167..167 | 7..29 | 25 | 74 | 136 |
| 104 | CUBONE | 43 | 20..35 | 120..120 | 0..0 | 0 | 88 | 150 |
| 105 | MAROWAK | 41 | 43..65 | 124..146 | 7..29 | 25 | 88 | 150 |
| 106 | HITMONLEE | 53 | 21..81 | 130..162 | 0..45 | 17 | 42 | 104 |
| 107 | HITMONCHAN | 51 | 18..37 | 128..128 | 0..1 | 8 | 75 | 137 |
| 108 | LICKITUNG | 43 | 21..81 | 120..162 | 0..45 | 17 | 98 | 160 |
| 109 | KOFFING | 58 | 64..114 | 145..195 | 28..78 | 25 | 50 | 112 |
| 110 | WEEZING | 61 | 64..114 | 145..195 | 28..78 | 25 | 50 | 112 |
| 111 | RHYHORN | 55 | 78..78 | 159..159 | 42..42 | 25 | 51 | 113 |
| 112 | RHYDON | 58 | 78..78 | 159..159 | 42..42 | 25 | 89 | 151 |
| 113 | CHANSEY | 42 | 43..65 | 124..146 | 7..29 | 25 | 98 | 160 |
| 114 | TANGELA | 43 | 31..43 | 120..124 | 0..7 | 16 | 90 | 152 |
| 115 | KANGASKHAN | 53 | 43..65 | 130..146 | 7..29 | 25 | 50 | 113 |
| 116 | HORSEA | 27 | 61..91 | 142..172 | 25..55 | 25 | 61 | 123 |
| 117 | SEADRA | 24 | 87..131 | 168..212 | 51..95 | 25 | 61 | 123 |
| 118 | GOLDEEN | 28 | 87..131 | 168..212 | 51..95 | 25 | 138 | 200 |
| 119 | SEAKING | 55 | 87..131 | 168..212 | 51..95 | 25 | 102 | 164 |
| 120 | STARYU | 56 | 61..91 | 142..172 | 25..55 | 25 | 141 | 203 |
| 121 | STARMIE | 59 | 128..128 | 209..209 | 92..92 | 25 | 61 | 123 |
| 122 | MR_MIME | 54 | 41..81 | 131..162 | 5..45 | 25 | 90 | 152 |
| 123 | SCYTHER | 38 | 18..37 | 115..118 | 0..1 | 8 | 60 | 122 |
| 124 | JYNX | 134 | 61..91 | 211..211 | 25..55 | 25 | 130 | 192 |
| 125 | ELECTABUZZ | 87 | 56..81 | 164..164 | 20..45 | 25 | 70 | 133 |
| 126 | MAGMAR | 44 | 128..128 | 209..209 | 92..92 | 25 | 50 | 112 |
| 127 | PINSIR | 35 | 78..78 | 159..159 | 42..42 | 25 | 51 | 113 |
| 128 | TAUROS | 52 | 78..78 | 159..159 | 42..42 | 25 | 88 | 150 |
| 129 | MAGIKARP | 54 | 43..65 | 131..146 | 7..29 | 25 | 88 | 150 |
| 130 | GYARADOS | 57 | 33..77 | 134..158 | 0..41 | 17 | 88 | 150 |
| 131 | LAPRAS | 42 | 128..128 | 209..209 | 92..92 | 25 | 42 | 104 |
| 132 | DITTO | 32 | 49..97 | 130..178 | 13..61 | 25 | 50 | 112 |
| 133 | EEVEE | 40 | 43..65 | 124..146 | 7..29 | 25 | 42 | 104 |
| 134 | VAPOREON | 63 | 128..128 | 209..209 | 92..92 | 25 | 50 | 112 |
| 135 | JOLTEON | 45 | 56..81 | 137..162 | 20..45 | 25 | 50 | 112 |
| 136 | FLAREON | 44 | 128..128 | 209..209 | 92..92 | 25 | 60 | 122 |
| 137 | PORYGON | 57 | 41..41 | 134..134 | 5..5 | 25 | 40 | 102 |
| 138 | OMANYTE | 38 | 61..91 | 142..172 | 25..55 | 25 | 102 | 164 |
| 139 | OMASTAR | 38 | 61..91 | 142..172 | 25..55 | 25 | 42 | 104 |
| 140 | KABUTO | 35 | 61..91 | 142..172 | 25..55 | 25 | 102 | 164 |
| 141 | KABUTOPS | 39 | 20..35 | 116..116 | 0..0 | 0 | 50 | 112 |
| 142 | AERODACTYL | 69 | 20..35 | 146..146 | 0..0 | 0 | 82 | 144 |
| 143 | SNORLAX | 15 | 61..91 | 142..172 | 25..55 | 25 | 110 | 172 |
| 144 | ARTICUNO | 67 | 128..128 | 209..209 | 92..92 | 25 | 70 | 132 |
| 145 | ZAPDOS | 44 | 56..81 | 137..162 | 20..45 | 25 | 60 | 122 |
| 146 | MOLTRES | 67 | 128..128 | 209..209 | 92..92 | 25 | 98 | 160 |
| 147 | DRATINI | 33 | 21..81 | 110..162 | 0..45 | 17 | 50 | 112 |
| 148 | DRAGONAIR | 47 | 18..37 | 124..124 | 0..1 | 8 | 50 | 112 |
| 149 | DRAGONITE | 54 | 33..77 | 131..158 | 0..41 | 17 | 90 | 152 |
| 152 | CHIKORITA | 15 | 43..65 | 124..146 | 7..29 | 25 | 50 | 112 |
| 153 | BAYLEEF | 25 | 21..81 | 102..162 | 0..45 | 17 | 50 | 112 |
| 154 | MEGANIUM | 46 | 33..77 | 123..158 | 0..41 | 17 | 50 | 112 |
| 155 | CYNDAQUIL | 20 | 43..65 | 124..146 | 7..29 | 25 | 40 | 102 |
| 156 | QUILAVA | 34 | 20..35 | 111..116 | 0..0 | 0 | 50 | 112 |
| 157 | TYPHLOSION | 108 | 128..128 | 209..209 | 92..92 | 25 | 59 | 145 |
| 158 | TOTODILE | 52 | 20..35 | 129..129 | 0..0 | 0 | 48 | 110 |
| 159 | CROCONAW | 57 | 20..35 | 134..134 | 0..0 | 0 | 50 | 112 |
| 160 | FERALIGATR | 72 | 33..77 | 149..158 | 0..41 | 17 | 85 | 147 |
| 161 | SENTRET | 12 | 43..65 | 124..146 | 7..29 | 25 | 55 | 117 |
| 162 | FURRET | 18 | 43..65 | 124..146 | 7..29 | 25 | 74 | 136 |
| 163 | HOOTHOOT | 31 | 87..131 | 168..212 | 51..95 | 25 | 84 | 146 |
| 164 | NOCTOWL | 60 | 18..37 | 137..137 | 0..1 | 8 | 60 | 122 |
| 165 | LEDYBA | 20 | 33..86 | 114..167 | 0..50 | 17 | 40 | 102 |
| 166 | LEDIAN | 24 | 87..131 | 168..212 | 51..95 | 25 | 82 | 144 |
| 167 | SPINARAK | 38 | 33..86 | 115..167 | 0..50 | 17 | 48 | 110 |
| 168 | ARIADOS | 35 | 21..81 | 112..162 | 0..45 | 17 | 50 | 112 |
| 169 | CROBAT | 66 | 18..37 | 143..143 | 0..1 | 8 | 50 | 112 |
| 170 | CHINCHOU | 36 | 31..43 | 113..124 | 0..7 | 16 | 98 | 160 |
| 171 | LANTURN | 30 | 56..81 | 137..162 | 20..45 | 25 | 102 | 164 |
| 172 | PICHU | 21 | 43..65 | 124..146 | 7..29 | 25 | 85 | 147 |
| 173 | CLEFFA | 17 | 61..91 | 142..172 | 25..55 | 25 | 40 | 102 |
| 174 | IGGLYBUFF | 20 | 61..91 | 142..172 | 25..55 | 25 | 103 | 165 |
| 175 | TOGEPI | 31 | 61..91 | 142..172 | 25..55 | 25 | 110 | 172 |
| 176 | TOGETIC | 20 | 87..131 | 168..212 | 51..95 | 25 | 50 | 112 |
| 177 | NATU | 30 | 43..65 | 124..146 | 7..29 | 25 | 85 | 147 |
| 178 | XATU | 42 | 41..81 | 122..162 | 5..45 | 25 | 125 | 187 |
| 179 | MAREEP | 21 | 43..65 | 124..146 | 7..29 | 25 | 99 | 161 |
| 180 | FLAAFFY | 39 | 61..91 | 142..172 | 25..55 | 25 | 40 | 102 |
| 181 | AMPHAROS | 47 | 56..81 | 137..162 | 20..45 | 25 | 75 | 137 |
| 182 | BELLOSSOM | 40 | 87..131 | 168..212 | 51..95 | 25 | 154 | 216 |
| 183 | MARILL | 37 | 43..65 | 124..146 | 7..29 | 25 | 141 | 203 |
| 184 | AZUMARILL | 48 | 61..91 | 142..172 | 25..55 | 25 | 168 | 230 |
| 185 | SUDOWOODO | 46 | 21..81 | 123..162 | 0..45 | 17 | 90 | 152 |
| 186 | POLITOED | 52 | 43..65 | 129..146 | 7..29 | 25 | 113 | 175 |
| 187 | HOPPIP | 24 | 87..131 | 168..212 | 51..95 | 25 | 102 | 164 |
| 188 | SKIPLOOM | 37 | 87..131 | 168..212 | 51..95 | 25 | 117 | 179 |
| 189 | JUMPLUFF | 46 | 87..131 | 168..212 | 51..95 | 25 | 110 | 172 |
| 190 | AIPOM | 40 | 43..65 | 124..146 | 7..29 | 25 | 74 | 136 |
| 191 | SUNKERN | 23 | 61..91 | 142..172 | 25..55 | 25 | 40 | 102 |
| 192 | SUNFLORA | 45 | 21..81 | 122..162 | 0..45 | 17 | 50 | 112 |
| 193 | YANMA | 48 | 87..131 | 168..212 | 51..95 | 25 | 65 | 127 |
| 194 | WOOPER | 21 | 31..43 | 112..124 | 0..7 | 16 | 50 | 112 |
| 195 | QUAGSIRE | 38 | 21..81 | 115..162 | 0..45 | 17 | 52 | 114 |
| 196 | ESPEON | 56 | 41..81 | 133..162 | 5..45 | 25 | 60 | 122 |
| 197 | UMBREON | 44 | 41..81 | 122..162 | 5..45 | 25 | 60 | 122 |
| 198 | MURKROW | 48 | 43..65 | 125..146 | 7..29 | 25 | 50 | 112 |
| 199 | SLOWKING | 68 | 61..91 | 145..172 | 25..55 | 25 | 50 | 112 |
| 200 | MISDREAVUS | 33 | 41..41 | 122..122 | 5..5 | 25 | 102 | 164 |
| 201 | UNOWN | 37 | 41..81 | 122..162 | 5..45 | 25 | 61 | 123 |
| 202 | WOBBUFFET | 58 | 31..43 | 135..135 | 0..7 | 16 | 85 | 147 |
| 203 | GIRAFARIG | 42 | 41..81 | 122..162 | 5..45 | 25 | 100 | 162 |
| 204 | PINECO | 38 | 33..77 | 115..158 | 0..41 | 17 | 102 | 164 |
| 205 | FORRETRESS | 57 | 33..77 | 134..158 | 0..41 | 17 | 40 | 103 |
| 206 | DUNSPARCE | 45 | 18..37 | 122..122 | 0..1 | 8 | 59 | 121 |
| 207 | GLIGAR | 35 | 49..97 | 130..178 | 13..61 | 25 | 50 | 112 |
| 208 | STEELIX | 108 | 33..77 | 185..185 | 0..41 | 17 | 88 | 150 |
| 209 | SNUBBULL | 41 | 20..35 | 118..118 | 0..0 | 0 | 52 | 114 |
| 210 | GRANBULL | 67 | 33..77 | 144..158 | 0..41 | 17 | 55 | 117 |
| 211 | QWILFISH | 33 | 31..43 | 112..124 | 0..7 | 16 | 153 | 215 |
| 212 | SCIZOR | 65 | 20..35 | 142..142 | 0..0 | 0 | 60 | 122 |
| 213 | SHUCKLE | 29 | 61..91 | 142..172 | 25..55 | 25 | 130 | 192 |
| 214 | HERACROSS | 52 | 20..35 | 129..129 | 0..0 | 0 | 66 | 128 |
| 215 | SNEASEL | 26 | 18..37 | 103..118 | 0..1 | 8 | 42 | 104 |
| 216 | TEDDIURSA | 47 | 61..91 | 142..172 | 25..55 | 25 | 50 | 112 |
| 217 | URSARING | 84 | 33..77 | 161..161 | 0..41 | 17 | 60 | 122 |
| 218 | SLUGMA | 49 | 128..128 | 209..209 | 92..92 | 25 | 50 | 112 |
| 219 | MAGCARGO | 60 | 128..128 | 209..209 | 92..92 | 25 | 50 | 112 |
| 220 | SWINUB | 36 | 33..86 | 114..167 | 0..50 | 17 | 50 | 112 |
| 221 | PILOSWINE | 37 | 33..77 | 114..158 | 0..41 | 17 | 40 | 102 |
| 222 | CORSOLA | 37 | 21..81 | 114..162 | 0..45 | 17 | 61 | 123 |
| 223 | REMORAID | 30 | 21..81 | 107..162 | 0..45 | 17 | 34 | 96 |
| 224 | OCTILLERY | 74 | 49..97 | 151..178 | 13..61 | 25 | 61 | 123 |
| 225 | DELIBIRD | 46 | 18..37 | 123..123 | 0..1 | 8 | 40 | 102 |
| 226 | MANTINE | 45 | 21..81 | 122..162 | 0..45 | 17 | 130 | 192 |
| 227 | SKARMORY | 68 | 20..35 | 145..145 | 0..0 | 0 | 85 | 147 |
| 228 | HOUNDOUR | 36 | 33..77 | 114..158 | 0..41 | 17 | 42 | 104 |
| 229 | HOUNDOOM | 56 | 33..77 | 133..158 | 0..41 | 17 | 70 | 132 |
| 230 | KINGDRA | 39 | 128..128 | 209..209 | 92..92 | 25 | 66 | 128 |
| 231 | PHANPY | 32 | 20..35 | 109..116 | 0..0 | 0 | 100 | 162 |
| 232 | DONPHAN | 49 | 78..78 | 159..159 | 42..42 | 25 | 100 | 162 |
| 233 | PORYGON2 | 45 | 41..41 | 122..122 | 5..5 | 25 | 70 | 132 |
| 234 | STANTLER | 64 | 61..91 | 142..172 | 25..55 | 25 | 50 | 112 |
| 235 | SMEARGLE | 29 | 21..81 | 106..162 | 0..45 | 17 | 46 | 108 |
| 236 | TYROGUE | 46 | 18..37 | 123..123 | 0..1 | 8 | 60 | 122 |
| 237 | HITMONTOP | 39 | 22..43 | 116..124 | 0..7 | 16 | 44 | 106 |
| 238 | SMOOCHUM | 33 | 21..81 | 110..162 | 0..45 | 17 | 90 | 152 |
| 239 | ELEKID | 30 | 33..77 | 114..158 | 0..41 | 17 | 75 | 137 |
| 240 | MAGBY | 41 | 128..128 | 209..209 | 92..92 | 25 | 90 | 152 |
| 241 | MILTANK | 42 | 21..81 | 119..162 | 0..45 | 17 | 98 | 160 |
| 242 | BLISSEY | 47 | 61..91 | 142..172 | 25..55 | 25 | 50 | 112 |
| 243 | RAIKOU | 49 | 56..81 | 137..162 | 20..45 | 25 | 60 | 122 |
| 244 | ENTEI | 58 | 128..128 | 209..209 | 92..92 | 25 | 42 | 104 |
| 245 | SUICUNE | 52 | 128..128 | 209..209 | 92..92 | 25 | 60 | 122 |
| 246 | LARVITAR | 36 | 78..78 | 159..159 | 42..42 | 25 | 40 | 102 |
| 247 | PUPITAR | 24 | 33..77 | 114..158 | 0..41 | 17 | 50 | 112 |
| 248 | TYRANITAR | 66 | 78..78 | 159..159 | 42..42 | 25 | 50 | 112 |
| 277 | TREECKO | 33 | 43..65 | 124..146 | 7..29 | 25 | 50 | 112 |
| 278 | GROVYLE | 58 | 20..35 | 135..135 | 0..0 | 0 | 53 | 115 |
| 279 | SCEPTILE | 74 | 33..77 | 151..158 | 0..41 | 17 | 46 | 111 |
| 280 | TORCHIC | 28 | 43..65 | 124..146 | 7..29 | 25 | 42 | 104 |
| 281 | COMBUSKEN | 82 | 43..65 | 159..159 | 7..29 | 25 | 66 | 128 |
| 282 | BLAZIKEN | 89 | 128..128 | 209..209 | 92..92 | 25 | 47 | 126 |
| 283 | MUDKIP | 21 | 21..81 | 102..162 | 0..45 | 17 | 48 | 110 |
| 284 | MARSHTOMP | 48 | 43..65 | 125..146 | 7..29 | 25 | 42 | 104 |
| 285 | SWAMPERT | 64 | 128..128 | 209..209 | 92..92 | 25 | 95 | 157 |
| 286 | POOCHYENA | 26 | 43..65 | 124..146 | 7..29 | 25 | 64 | 126 |
| 287 | MIGHTYENA | 55 | 33..77 | 132..158 | 0..41 | 17 | 51 | 113 |
| 288 | ZIGZAGOON | 33 | 18..37 | 110..118 | 0..1 | 8 | 46 | 108 |
| 289 | LINOONE | 87 | 20..35 | 164..164 | 0..0 | 0 | 70 | 132 |
| 290 | WURMPLE | 25 | 31..43 | 112..124 | 0..7 | 16 | 67 | 129 |
| 291 | SILCOON | 46 | 33..77 | 123..158 | 0..41 | 17 | 55 | 117 |
| 292 | BEAUTIFLY | 23 | 87..131 | 168..212 | 51..95 | 25 | 42 | 104 |
| 293 | CASCOON | 46 | 33..77 | 123..158 | 0..41 | 17 | 60 | 122 |
| 294 | DUSTOX | 36 | 18..37 | 113..118 | 0..1 | 8 | 90 | 152 |
| 295 | LOTAD | 13 | 21..81 | 102..162 | 0..45 | 17 | 99 | 161 |
| 296 | LOMBRE | 41 | 43..65 | 124..146 | 7..29 | 25 | 79 | 141 |
| 297 | LUDICOLO | 48 | 43..65 | 125..146 | 7..29 | 25 | 168 | 230 |
| 298 | SEEDOT | 23 | 61..91 | 142..172 | 25..55 | 25 | 90 | 152 |
| 299 | NUZLEAF | 32 | 33..77 | 114..158 | 0..41 | 17 | 95 | 157 |
| 300 | SHIFTRY | 56 | 41..81 | 133..162 | 5..45 | 25 | 52 | 114 |
| 301 | NINCADA | 18 | 33..86 | 114..167 | 0..50 | 17 | 92 | 154 |
| 302 | NINJASK | 35 | 41..41 | 122..122 | 5..5 | 25 | 82 | 144 |
| 303 | SHEDINJA | 22 | 41..81 | 122..162 | 5..45 | 25 | 143 | 205 |
| 304 | TAILLOW | 17 | 43..65 | 124..146 | 7..29 | 25 | 34 | 96 |
| 305 | SWELLOW | 26 | 20..35 | 103..116 | 0..0 | 0 | 42 | 104 |
| 306 | SHROOMISH | 25 | 61..91 | 142..172 | 25..55 | 25 | 66 | 128 |
| 307 | BRELOOM | 36 | 20..35 | 113..116 | 0..0 | 0 | 79 | 141 |
| 308 | SPINDA | 35 | 22..43 | 112..124 | 0..7 | 16 | 45 | 107 |
| 309 | WINGULL | 35 | 87..131 | 168..212 | 51..95 | 25 | 102 | 164 |
| 310 | PELIPPER | 34 | 87..131 | 168..212 | 51..95 | 25 | 102 | 164 |
| 311 | SURSKIT | 30 | 65..65 | 146..146 | 29..29 | 25 | 56 | 118 |
| 312 | MASQUERAIN | 56 | 87..131 | 168..212 | 51..95 | 25 | 72 | 134 |
| 313 | WAILMER | 80 | 128..128 | 209..209 | 92..92 | 25 | 154 | 216 |
| 314 | WAILORD | 119 | 128..128 | 209..209 | 92..92 | 25 | 111 | 173 |
| 315 | SKITTY | 20 | 61..91 | 142..172 | 25..55 | 25 | 59 | 121 |
| 316 | DELCATTY | 60 | 43..65 | 137..146 | 7..29 | 25 | 66 | 128 |
| 317 | KECLEON | 24 | 41..41 | 122..122 | 5..5 | 25 | 95 | 157 |
| 318 | BALTOY | 36 | 61..91 | 142..172 | 25..55 | 25 | 140 | 202 |
| 319 | CLAYDOL | 55 | 41..81 | 132..162 | 5..45 | 25 | 105 | 167 |
| 320 | NOSEPASS | 38 | 78..78 | 159..159 | 42..42 | 25 | 168 | 230 |
| 321 | TORKOAL | 27 | 128..128 | 209..209 | 92..92 | 25 | 75 | 137 |
| 322 | SABLEYE | 33 | 41..41 | 122..122 | 5..5 | 25 | 130 | 192 |
| 323 | BARBOACH | 26 | 31..43 | 112..124 | 0..7 | 16 | 230 | 292 |
| 324 | WHISCASH | 48 | 33..77 | 125..158 | 0..41 | 17 | 195 | 257 |
| 325 | LUVDISC | 14 | 65..65 | 146..146 | 29..29 | 25 | 102 | 164 |
| 326 | CORPHISH | 34 | 18..37 | 111..118 | 0..1 | 8 | 140 | 202 |
| 327 | CRAWDAUNT | 70 | 20..35 | 147..147 | 0..0 | 0 | 75 | 137 |
| 328 | FEEBAS | 22 | 65..65 | 146..146 | 29..29 | 25 | 168 | 230 |
| 329 | MILOTIC | 111 | 128..128 | 209..209 | 92..92 | 25 | 110 | 172 |
| 330 | CARVANHA | 29 | 65..65 | 146..146 | 29..29 | 25 | 168 | 230 |
| 331 | SHARPEDO | 65 | 20..35 | 142..142 | 0..0 | 0 | 157 | 219 |
| 332 | TRAPINCH | 29 | 61..91 | 142..172 | 25..55 | 25 | 75 | 137 |
| 333 | VIBRAVA | 40 | 41..41 | 122..122 | 5..5 | 25 | 140 | 202 |
| 334 | FLYGON | 74 | 18..37 | 151..151 | 0..1 | 8 | 140 | 202 |
| 335 | MAKUHITA | 21 | 78..78 | 159..159 | 42..42 | 25 | 102 | 164 |
| 336 | HARIYAMA | 47 | 78..78 | 159..159 | 42..42 | 25 | 87 | 149 |
| 337 | ELECTRIKE | 35 | 20..35 | 112..116 | 0..0 | 0 | 78 | 140 |
| 338 | MANECTRIC | 60 | 33..77 | 137..158 | 0..41 | 17 | 79 | 141 |
| 339 | NUMEL | 27 | 78..78 | 159..159 | 42..42 | 25 | 105 | 167 |
| 340 | CAMERUPT | 66 | 128..128 | 209..209 | 92..92 | 25 | 105 | 167 |
| 341 | SPHEAL | 16 | 61..91 | 142..172 | 25..55 | 25 | 198 | 260 |
| 342 | SEALEO | 34 | 33..77 | 114..158 | 0..41 | 17 | 75 | 137 |
| 343 | WALREIN | 103 | 33..77 | 180..180 | 0..41 | 17 | 63 | 140 |
| 344 | CACNEA | 26 | 33..86 | 114..167 | 0..50 | 17 | 168 | 230 |
| 345 | CACTURNE | 64 | 33..77 | 141..158 | 0..41 | 17 | 75 | 137 |
| 346 | SNORUNT | 48 | 18..37 | 125..125 | 0..1 | 8 | 117 | 179 |
| 347 | GLALIE | 59 | 18..37 | 136..136 | 0..1 | 8 | 75 | 137 |
| 348 | LUNATONE | 68 | 61..91 | 145..172 | 25..55 | 25 | 103 | 165 |
| 349 | SOLROCK | 46 | 61..91 | 142..172 | 25..55 | 25 | 130 | 192 |
| 350 | AZURILL | 30 | 43..65 | 124..146 | 7..29 | 25 | 84 | 146 |
| 351 | SPOINK | 21 | 43..65 | 124..146 | 7..29 | 25 | 157 | 219 |
| 352 | GRUMPIG | 36 | 41..81 | 122..162 | 5..45 | 25 | 88 | 150 |
| 353 | PLUSLE | 26 | 43..65 | 124..146 | 7..29 | 25 | 50 | 112 |
| 354 | MINUN | 46 | 43..65 | 124..146 | 7..29 | 25 | 50 | 112 |
| 355 | MAWILE | 33 | 33..77 | 114..158 | 0..41 | 17 | 70 | 132 |
| 356 | MEDITITE | 23 | 41..81 | 122..162 | 5..45 | 25 | 88 | 150 |
| 357 | MEDICHAM | 47 | 41..81 | 124..162 | 5..45 | 25 | 98 | 160 |
| 358 | SWABLU | 16 | 87..131 | 168..212 | 51..95 | 25 | 61 | 123 |
| 359 | ALTARIA | 32 | 87..131 | 168..212 | 51..95 | 25 | 85 | 147 |
| 360 | WYNAUT | 39 | 43..65 | 124..146 | 7..29 | 25 | 88 | 150 |
| 361 | DUSKULL | 30 | 41..41 | 122..122 | 5..5 | 25 | 75 | 137 |
| 362 | DUSCLOPS | 39 | 41..41 | 122..122 | 5..5 | 25 | 75 | 137 |
| 363 | ROSELIA | 31 | 128..128 | 209..209 | 92..92 | 25 | 98 | 160 |
| 364 | SLAKOTH | 24 | 21..81 | 102..162 | 0..45 | 17 | 98 | 160 |
| 365 | VIGOROTH | 41 | 43..65 | 124..146 | 7..29 | 25 | 71 | 133 |
| 366 | SLAKING | 28 | 33..77 | 114..158 | 0..41 | 17 | 154 | 216 |
| 367 | GULPIN | 23 | 31..43 | 112..124 | 0..7 | 16 | 60 | 122 |
| 368 | SWALOT | 49 | 31..43 | 126..126 | 0..7 | 16 | 105 | 167 |
| 369 | TROPIUS | 93 | 78..78 | 170..170 | 42..42 | 25 | 75 | 137 |
| 370 | WHISMUR | 23 | 61..91 | 142..172 | 25..55 | 25 | 114 | 176 |
| 371 | LOUDRED | 37 | 33..77 | 114..158 | 0..41 | 17 | 168 | 230 |
| 372 | EXPLOUD | 80 | 31..43 | 157..157 | 0..7 | 16 | 79 | 141 |
| 373 | CLAMPERL | 52 | 61..91 | 142..172 | 25..55 | 25 | 75 | 137 |
| 374 | HUNTAIL | 45 | 87..131 | 168..212 | 51..95 | 25 | 75 | 137 |
| 375 | GOREBYSS | 64 | 87..131 | 168..212 | 51..95 | 25 | 102 | 164 |
| 376 | ABSOL | 30 | 41..81 | 122..162 | 5..45 | 25 | 102 | 164 |
| 377 | SHUPPET | 24 | 41..41 | 122..122 | 5..5 | 25 | 105 | 167 |
| 378 | BANETTE | 36 | 41..41 | 122..122 | 5..5 | 25 | 105 | 167 |
| 379 | SEVIPER | 33 | 31..43 | 112..124 | 0..7 | 16 | 140 | 202 |
| 380 | ZANGOOSE | 27 | 20..35 | 104..116 | 0..0 | 0 | 140 | 202 |
| 381 | RELICANTH | 57 | 21..81 | 134..162 | 0..45 | 17 | 75 | 137 |
| 382 | ARON | 26 | 20..35 | 103..116 | 0..0 | 0 | 154 | 216 |
| 383 | LAIRON | 59 | 33..77 | 136..158 | 0..41 | 17 | 81 | 143 |
| 384 | AGGRON | 73 | 78..78 | 159..159 | 42..42 | 25 | 79 | 141 |
| 385 | CASTFORM | 36 | 87..131 | 169..213 | 51..95 | 25 | 102 | 165 |
| 386 | VOLBEAT | 33 | 87..131 | 168..212 | 51..95 | 25 | 71 | 133 |
| 387 | ILLUMISE | 49 | 87..131 | 168..212 | 51..95 | 25 | 99 | 161 |
| 388 | LILEEP | 28 | 31..43 | 112..124 | 0..7 | 16 | 75 | 137 |
| 389 | CRADILY | 83 | 31..43 | 160..160 | 0..7 | 16 | 105 | 167 |
| 390 | ANORITH | 33 | 18..37 | 110..118 | 0..1 | 8 | 105 | 167 |
| 391 | ARMALDO | 65 | 33..77 | 142..158 | 0..41 | 17 | 75 | 137 |
| 392 | RALTS | 29 | 41..81 | 122..162 | 5..45 | 25 | 98 | 160 |
| 393 | KIRLIA | 35 | 41..81 | 122..162 | 5..45 | 25 | 59 | 121 |
| 394 | GARDEVOIR | 69 | 41..81 | 146..162 | 5..45 | 25 | 50 | 112 |
| 395 | BAGON | 22 | 33..77 | 114..158 | 0..41 | 17 | 79 | 141 |
| 396 | SHELGON | 57 | 33..77 | 134..158 | 0..41 | 17 | 75 | 137 |
| 397 | SALAMENCE | 71 | 33..77 | 148..158 | 0..41 | 17 | 109 | 171 |
| 398 | BELDUM | 27 | 18..37 | 104..118 | 0..1 | 8 | 50 | 112 |
| 399 | METANG | 53 | 20..35 | 130..130 | 0..0 | 0 | 42 | 104 |
| 400 | METAGROSS | 112 | 33..77 | 189..189 | 0..41 | 17 | 80 | 149 |
| 401 | REGIROCK | 90 | 33..77 | 167..167 | 0..41 | 17 | 50 | 127 |
| 402 | REGICE | 91 | 33..77 | 168..168 | 0..41 | 17 | 73 | 135 |
| 403 | REGISTEEL | 65 | 33..77 | 142..158 | 0..41 | 17 | 50 | 112 |
| 407 | LATIAS | 35 | 41..41 | 122..122 | 5..5 | 25 | 52 | 114 |
| 408 | LATIOS | 62 | 41..41 | 139..139 | 5..5 | 25 | 50 | 112 |
| 411 | CHIMECHO | 29 | 87..131 | 168..212 | 51..95 | 25 | 135 | 197 |
