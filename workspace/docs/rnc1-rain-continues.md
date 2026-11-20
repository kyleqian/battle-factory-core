# rnc1: the rain at "Rain continues to fall." (2026-11-20)

The frame catcher sweep's finding 1 (`docs/fcs1-catcher-sweep.md`): at the end of a rainy turn in Scene ON the ROM darkens the field and
draws falling rain while "Rain continues to fall." is up; ours showed the text over the normal field (the sound played). This step draws
the ROM's animation, at the ROM's rows, and gives the command the ROM's length. Presentation only: no battle rule or RNG changed.

## What was wrong

- `BattleScript_RainContinuesOrEnds` (`data/battle_scripts_1.s:3192-3198`) prints the message, `waitmessage B_WAIT_TIME_LONG`, then
  `jumpifbyte` (to `end2` when the rain stopped) and `playanimation BS_ATTACKER, B_ANIM_RAIN_CONTINUES`. That is `General_Rain`
  (`data/battle_anim_scripts.s:10511-10522`), its own script, not Rain Dance's body: blend the field and battlers to black 0 -> 4, two
  `AnimTask_CreateRaindrops, 2, 0, 3, 60`, `delay 50`, blend back.
- wth236 drew Rain Dance's body (move 240) there and asked the presentation RNG for its words under the move key
  `move:<request>:<segment>:<command>`. The tick seam never activates a general-animation command under that key (it records
  General_Rain's 80 words as a non-consuming sub-stream under `general:<request>:<segment>:<sequence>`), so the words were null, the
  Rain Dance adapter returned null and nothing was drawn.
- The command was Rain Dance's 187-row body + 4 = 191 rows; the ROM's is 122. The SE played 7 rows late.

## ROM evidence

Seed 19 Scene ON (the sweep trace `traces2/r19-on-ws.json`), battle 2, four rain turns. The sweep's ROM run was re-run with the catcher's
own driver plus a per-frame RAM watch (`.integration/evidence/fix-rain/probe/romRainWatch.py`: `gAnimScriptActive`, `gRng2Value`,
`gAnimVisualTaskCount`, `gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, SE1 status); its pictures are byte-identical to the
sweep's ROM run (16,302 frames). W = the row `waitmessage` ends (the command's row 0), X = the row `gAnimScriptActive` rises.

| turn | W | X | SE_M_RAIN_DANCE | 20 draws of 4 words | raindrop tasks end | blend done | script ends | text clears |
|---|---|---|---|---|---|---|---|---|
| 1 | 13170 | 13172 | 13175 | 13189 + 3k | 13248 | 13261 | 13292 | 13297 |
| 2 | 13956 | 13958 | 13961 | 13975 + 3k | X + 76 | X + 89 | X + 120 | W + 127 |
| 3 | 15302 | 15304 | 15307 | X + 17 + 3k | X + 76 | X + 89 | X + 120 | W + 127 |
| 4 | 16047 | 16049 | 16052 | X + 17 + 3k | X + 76 | X + 89 | X + 120 | W + 127 |

- X = W + 2: `jumpifbyte` at W + 1, `playanimation` at W + 2, where the player controller launches the script
  (`TryHandleLaunchBattleTableAnimation`) and `Task_ClearBitWhenBattleTableAnimDone` runs `loadspritegfx` the same row.
- The SE at X + 3 (`loadspritegfx` waits a row, `WaitAnimFrameCount` hands back a row later). The script reaches `end` once the blend is done (about X + 90), and
  `Cmd_end` (`battle_anim.c:476-503`) waits while `IsSEPlaying`: SE_M_RAIN_DANCE is 168 ticks at tempo 220
  (`sound/songs/midi/se_m_rain_dance.s`), TRUE for 117 rows from its row (the seg127 rule: 1 + the VBlank of tick 169), so the script ends
  at X + 120 on all four turns.
- On the screen (turn 1, `peek.py` / pixel reads): the blend shows 1 / 2 / 3 / 4 at 13180 / 13183 / 13186 / 13189 (X + 8 ...) and 3 / 2 /
  1 / 0 at 13253 / 13256 / 13259 / 13262 (X + 81 ...); the first drops at 13191 (X + 19, the pair drawn at X + 17); the last drop at
  13266 (X + 94); 13267 is the field as it is again.
- The command's length: on "The rain stopped." (same battle, W 17024) `jumpifbyte` jumps straight to `end2` at W + 2 and the text clears at
  W + 5. With the rain the text clears at W + 127 on all four turns: the animation adds exactly 122 rows (2 + 120).

## The change

- `src/animation/rainDance.ts` `generalRainAtAge`: General_Rain's rows on the script clock (row 0 = X): the blend (Rain Dance's up-ramp one
  row earlier, its own down-ramp at 80 / 83 / 86 / 89), the drops from the 20 recorded spawn rows (the existing `generalRainDropsAtAge`,
  `GENERAL_RAIN_SPAWN_AGES` = 17 + 3k) shown one row late, the script end `GENERAL_RAIN_SCRIPT_ROWS` = 3 + 117 = 120.
- `battleResolutionPresentationRender.ts` `weatherContinuesBodyEffect`: RAIN_CONTINUES draws a move-240 body with `request.generalRain`
  at script row = command row - 2, reading the words the tick seam already records for the event (`generalAnimationPresentationRngKey`).
  Nothing new is read from or scheduled into the shared presentation stream, so every other body's words and the sprite-order lends after
  RAIN_CONTINUES are unchanged. The words are surrogate (faithful random, as before: prep46 §2's non-consuming read).
- `liveMoveAnimation.ts`: `request.generalRain` gives the `GENERAL_RAIN` config (120 rows; a displayed Substitute doll or a transformed
  battler declines, the field as it is). `sceneOnPresentation.ts` / `battleScene.ts`: the Rain Dance compositor draws it (same selector,
  art and drop program).
- `battleResolutionPresentation.ts`: `RAIN_CONTINUES_COMMAND_FRAMES` = 122 (was 191). Sun / Sandstorm / Hail are unchanged.
- `moveAnimSounds.ts`: General_Rain's SE plays on command row 5 (script row 3), was row 12.

## Tests

- `tests/rnc1RainContinues.test.ts`: the reducer's shown blend, drop lifetimes and script end at the RAM-read rows; then seed 19's first
  rain turn played by the catcher's test player: 122 rows, the SE on row 5, 20 rows rendered with the ROM's RAM-read words equal the ROM
  frames' hashes, the session's own words draw a General_Rain body, and through the command the shared stream only takes its per-frame step.
- `tests/wth236WeatherContinues.test.ts`: the rain body is now `{ moveId 240, age 4, generalRain }`; the census digests are unchanged.
- Off-test check (`probe/romWordsCompare.mjs`): with the ROM's words, every row of all four rain commands (4 x 122 frames) is
  pixel-identical to the ROM's frames.
- Run on this branch: typecheck clean; the 14 test files touching rain, weather, words and animation sounds (145 tests); the soak pin
  files (`randomRoundSoak*.test.ts`, `contain209SoakContained`, `soakLobbyNewChallenge`: 11 files, 125 tests, no pin moved);
  `test:gate` 360 files, 2,832 tests. All pass. The full `npm test` was not run.

## Frame catcher, seed 19 Scene ON, before / after

`KEEP=1 JOBS=1 tools/frame-catcher/run.sh` on the sweep's trace `traces2/r19-on-ws.json` (the same presses), this build against the
sweep's `final/r19-on-ws` (master `869b52918` + the catcher fixes). Run: `.integration/evidence/fix-rain/catcher/r19-on-ws/`; contact sheets
`.integration/evidence/fix-rain/before-sheet.png` / `after-sheet.png`.

| | before | after |
|---|---|---|
| the "ROM only 240x112" rain blob (sweep #2) | 20,810 px, 328 frames in the 4 rain turns | gone |
| differences inside the 4 rain windows (pixels x frames) | 6,825,653 (largest blob 20,810 px) | 61,906 (largest 84 px: one drop's streak) |
| differences elsewhere (occurrences, pixels x frames) | 2,864, 6,087,751 | 2,905, 6,119,919 |
| stretches: content / timing / identical | 131 / 119 / 0 (250) | 140 / 118 / 0 (258) |
| picture differences (+ small) | 622 (+835) | 1,256 (+1,298) |
| sound differences | 0 | 0 |
| menus followed | 251 / 251 | 259 / 259 |
| rain SE (ours, command row) | 12 | 5 (ROM 5) |

- The darkening and the drops now show on the ROM's frames. The drops themselves fall at other places than the ROM's: their words are the
  presentation RNG's (faithful random, D3), so each drop streak is a small "ROM only" / "ours only" blob. That is where the larger
  difference count comes from (1,434 tiny blobs in the rain windows); with the ROM's words the frames are identical (above).
- The trace's presses are the old build's. With 69 rows less per rain turn they land elsewhere in battle 2 (8 more menu visits: party
  menu and its submenu opened and closed), which accounts for the extra stretches; the round's digest is unchanged (`f5ae7f776a44c8ec`),
  as are all 7 battles' first action-menu frames.

## Not done

- After the rain the next prompt's text clears 3 rows late (W + 130 against W + 127) when the turn ends with the `turn-end` command (8 rows;
  the ROM's tail after `end2` is 5), and 5 rows early in a turn without one (turn 3: a faint's button message drops the `turn-end`). The
  same 3 rows show after "The rain stopped." (W + 8 against W + 5). That is the end-of-turn tail, not the rain command; not changed here.
- Sun / Sandstorm / Hail continues keep their move bodies and wth236 lengths, unchecked. Seen in passing: seed 2's Hail continues plays
  SE_M_HAIL 8 rows late (ROM 28985, ours 26861 = ROM 28993) and starts its blend a row late.
- General_Rain with a Substitute doll or a transformed battler on the field is not drawn (the ROM plays it regardless of a Substitute);
  not measured.
