<!-- Read-only worker report (aud241 scout, 2026-11-04, Sonnet 5.5, 4 min, no new probe windows). Saved verbatim by the supervisor; UNVERIFIED — check every line number before use. -->

# aud241 scout: battle controller sound family

Nothing was edited or committed, and `git status` is clean. I did not run any new probe windows, so the gaps below are stated, not filled. I read `include/constants/sound.h:23/28/34` for the cry modes. I did not read the numeric values of the SE ids (13, 14, 16 and the like); I took them from `src/data/gen/audio-sound-sources.json`.


## 1. Sound table (Factory singles, BATTLE_TYPE_FRONTIER)

### Key

- **Fixtures:** all names are under `tools/audio/fixtures/`.
- **Kernel** means the kernel already emits a semantic event. "no" means aud241 has to add one, additively.
- **Frames** are 1-based, from the lab `d4a-megahorn-extra-player-rhydon-golbat`. Intro frames are 1336+, battle-window frames are 1-934.
- **ON vs OFF:** where ON and OFF frames differ, both are given.

### Rows

| # | Sound | ROM site | (kind, id, pan, mode) | Our owner | Kernel | Scene OFF |
|---|---|---|---|---|---|---|
| 1 | SE_NOT_EFFECTIVE (12) | `battle_script_commands.c:2016/2034` (`Cmd_effectivenesssound`); played via `PlayerHandlePlaySE` (`battle_controller_player.c` ~2882-2891) or `OpponentHandlePlaySE` (`battle_controller_opponent.c` ~1823-1833) | se, 12. Pan: -64 if the target is the player, 63 if the target is the opponent (`SOUND_PAN_ATTACKER` / `SOUND_PAN_TARGET`, `battle_anim.h:324-325`). | Kernel `play-se` timing gate (`battleScriptHitChainOpcode.ts:2364`, consumed at `battleResolutionPresentation.ts:1186/1314/1356/1400/1425`) | yes (`play-se` with `songId` + `battler`) | yes, at an earlier frame |
| 2 | SE_SUPER_EFFECTIVE (14) | `battle_script_commands.c:2012/2029` | se, 14, same pan rule | same | yes | yes |
| 3 | SE_EFFECTIVE (13) | `battle_script_commands.c:2039` | se, 13, same pan rule | same | yes | yes |
| 4 | SE_FAINT (16) | player: `battle_controller_player.c:2422` (`PlaySE12WithPanning(SE_FAINT, SOUND_PAN_ATTACKER)`); opponent: `battle_controller_opponent.c` ~1421 (`SOUND_PAN_TARGET`). Both run after `specialAnimActive` clears. | se, 16. Pan: -64 for a player mon, 63 for an opponent mon. | The faint-animation presentation step in `battleResolutionPresentation.ts` (the same place that looks up `play-faint-cry`, `:345-348`). `opponentFaintPresentationOwner.ts` owns only the dismiss edge (`storeOpponentFaintDismiss`, `:59`), not the SE. | no | yes |
| 5 | Faint cry | `Cmd_playfaintcry` (`battle_script_commands.c:5329-5335`); script sites `battle_scripts_1.s:2810` (BS_ATTACKER) and `:2818` (BS_TARGET). The controller calls `PlayCry_ByMode(species, ∓25, CRY_MODE_FAINT)` at `battle_controller_player.c:2914` and `battle_controller_opponent.c:1856`. | cry, species id. Pan: -25 for the player, +25 for the opponent. Mode: FAINT (5). Volume 120, priority 10. Ducks the BGM to 85 first. | `battleResolutionPresentation.ts:345-348` (`play-faint-cry` lookup) | yes (`battleScriptEvents.ts:154`, no pan or mode) | yes |
| 6 | Opponent send-out cry | `pokeball.c:665-748` (`Task_PlayCryWhenReleasedFromBall`). State 1 picks NORMAL (`:684`) or WEAK (`:686`) via `ShouldPlayNormalMonCry`. Pan from `:772-776`. | cry, species, pan +25, mode NORMAL (0) or WEAK (11) | Intro: `factoryBattleStartIntro.ts:153` (`advanceFactoryBattleStartIntro`, phase "opponent-release"), with the frame from `generatedBattleStartOpponentReleaseStarted` (`battleScene.ts:5039`). Mid-battle: `switchInTail.ts`, with the Scene OFF cry gate `SEND_IN_TAIL_OFF_CRY_FRAMES`. | no | yes. The opponent intro is identical in both scenes. |
| 7 | Player send-out cry | `pokeball.c:684/686`, `:772-776` | cry, species, pan -25, mode NORMAL or WEAK | Intro: phase "player-release" (`generatedBattleStartPlayerReleaseStarted`, `battleScene.ts:5315`). Mid-battle: `switchInTail.ts` (`sceneOffPlayerForcedSwitchInDuration` `:125`, `sceneOnPlayerForcedSwitchInDuration` `:174`, `playerFaintReplacementSendOutTiming` `:191`). | no | yes, but about 48 frames earlier than ON (see §2) |
| 8 | BGM duck around cries | `PlayCry_ByMode`, `sound.c:315-329`; restore by `Task_DuckBGMForPokemonCry`, `sound.c:552` | duck, BGM player, volume 85, then 256 once the cry stops | `screenSounds.ts` `playCry` already models it (duck 85, cry, restore scheduled at cry length + 1) | no | yes |
| 9 | SE_BALL_OPEN (15) | `battle_anim_throw.c:1588` (`AnimateBallOpenParticles`, `PlaySE`) | se, 15, pan null | Intro: the ball-open frame inside the "opponent-release" and "player-release" phases. Visual constant `BALL_OPEN_START_OFFSET = 18` (`battleScene.ts:4037`), but I did not confirm it is the SE frame. | no | yes |
| 10 | Ball tray SEs (114 enter, 115 ball, 116 exit) | `battle_interface.c:1666` (`PlaySE12WithPanning(SE_BALL_TRAY_ENTER, 0)`), `:1870` (`PlaySE2WithPanning`, EXIT), `:1872` (`PlaySE1WithPanning`, BALL) | se; ENTER pan 0; BALL and EXIT pan +/-63 by side | Intro: the tray-slide ticks before `BALL_WIDGETS_SETTLED_TICK`. I did not read its value or the sprite timing. | no | yes, and identical in ON and OFF |
| 11 | SE_BALL_THROW | `battle_anim_throw.c:824`, `pokeball.c:418` | not observed in the Factory trainer-intro log | none | no | n/a |
| 12 | Low-HP SE loop start | `HandleLowHpMusicChange`, `battle_gfx_sfx_util.c:1100` (`PlaySE(SE_LOW_HEALTH)`, 90, when the HP bar is red and the song is not already playing) | se, 90, pan null | Unmodelled. Callers are `battle_controller_player.c:969/1093/1138/2164/2421`, `battle_script_commands.c:3362/3454`, `battle_controller_opponent.c:1841`. | no | yes |
| 13 | Low-HP stop | `battle_gfx_sfx_util.c:1109/1114`; `BattleStopLowHpSound` `:1120-1128`; `battle_main.c:4975/4985/5247`; `battle_controller_player.c:2692/2899` | stop, 90. Every logged instance is a no-op (`noop: true`). | Unmodelled | no | yes |
| 14 | Battle BGM start | `GetBattleBGM`, `pokemon.c:6426-6489`. Brain (class FACTORY_HEAD, NOLAND) gets 471 (`:6473-6480`). Everyone else gets 476 (`:6482`). Start via `PlayMapChosenOrBattleBGM(0)`, `pokemon.c:6503/6505`. | bgm, 476 (Brain 471), `m4aMPlayAllStop` one frame before | Intro handoff, at the start of `advanceFactoryRoundBattleStartIntro` (`factoryRoundBattleOrchestrator.ts:1085`). `BGM_BATTLE = 476` is in `screenSounds.ts`. | no | yes |
| 15 | Victory music | `HandleEndTurn_BattleWon`, `battle_main.c:4960`. `BattleStopLowHpSound()` at `:4975`. Brain gets `MUS_VICTORY_GYM_LEADER` (354, `:4979`). Everyone else gets `MUS_VICTORY_TRAINER` (412, `:4981`). The `:4985+` branch is the non-frontier path and is not the Factory path. `VARIOUS_PLAY_TRAINER_DEFEATED_MUSIC` (`battle_script_commands.c:6494`) also plays 412. | bgm, 412 (Brain 354) | Win resolution in `battleResolutionPresentation.ts` | no | yes |
| 16 | Fade at battle end | `battle_main.c:5144` (`FadeOutMapMusic(5)`, in `HandleEndTurn_FinishBattle`) | fade, speed 5 | Battle-end transition | no | yes |
| 17 | Battle-return | After the postwin start P: SE_SELECT at P, fade (412 for a win, 476 for a loss) at P+6, no-op stop 90 at P+43, `bgm 469` at P+53, SE_EXIT (9) at P+79. These come from `docs/aud240d`, not the ROM source. | se / fade / bgm | Several postwin and terminal creation sites (aud240d left them for aud241) | no | yes |
| 18 | Stat-change / status SEs | `battle_anim_utility_funcs.c:562/564` (`SE_M_STAT_INCREASE` / `SE_M_STAT_DECREASE`, pan from `BattleAnimAdjustPanning2(SOUND_PAN_ATTACKER)`) | se | Animation C-side, so aud242 | n/a | **no** (animation family) |
| 19 | `Cmd_playse` / `Cmd_fanfare` | `battle_script_commands.c:5311/5320` | se / fanfare | `battleScriptSourceCommands.ts:921/923` | yes | yes |
| 20 | Level-up `MUS_LEVEL_UP` | `battle_scripts_1.s:3156/3184` | fanfare | Not on the Factory path (fixed level 50, no exp) | n/a | n/a |
| 21 | Run / forfeit | not reachable in the Factory | n/a | n/a | n/a | n/a |

## 2. Existing fixture evidence

- **Rows 1-3 (effectiveness):**
  - `battle-window.json` (ON) has SE_NOT_EFFECTIVE at f118 (pan -64) and f474 (pan 63).
  - `battle-window-off.json` (OFF) has it at f107 and f317 (-64 and 63).
  - SUPER_EFFECTIVE (14) and EFFECTIVE (13) appear in no fixture.
- **Rows 4-5 (faint SE, faint cry):** no fixture has SE_FAINT or a FAINT-mode cry.
- **Rows 6-7 (send-out cries):**
  - `battle-intro-window.json` (ON): f1612 duck 85, then `cry 42 GOLBAT pan 25 NORMAL vol 120 pri 10`. The player side is f1827 (duck 85, then `cry 112 RHYDON pan -25 NORMAL`).
  - `battle-intro-window-off.json` (OFF): the player cry is at f1779. The opponent is at f1612, the same as ON.
  - Restores: ON f1668 (opponent) and f1886 (player). OFF f1838 (player).
  - The opponent ball-open to cry gap is 17 frames (1595 to 1612). The player gap is 13 (1814 to 1827 ON, 1766 to 1779 OFF).
  - No fixture has a WEAK send-out cry. `summary-party-window.json` has a WEAK ONIX cry, but from the summary screen, not a send-out.
- **Row 8 (BGM duck):** the `battle-intro-window` ducks above, plus the party-window fixtures.
- **Row 9 (ball open):** f1595 (opponent). Player is f1814 ON and f1766 OFF.
- **Row 10 (tray):**
  - Identical in both scenes.
  - ENTER (114) at f1336 and 1339.
  - BALL (115) at 1355, 1362 (pan 63), 1364 (-64), 1369 (63), 1371 (-64), 1378 (-64).
  - EXIT (116) at 1376, 1383, 1390 (63), 1385, 1392, 1399 (-64).
- **Row 11 (ball throw):** absent from the log.
- **Rows 12-13 (low-HP):**
  - Only no-op stops of song 90 exist.
  - ON: `battle-window.json` f159, f160, f288; intro f1912.
  - OFF: `battle-window-off.json` f148, f149, f277; intro f1839.
  - No fixture contains the start (`PlaySE(SE_LOW_HEALTH)`).
- **Row 14 (battle BGM):** `battle-intro-window.json` f987 (`m4aMPlayAllStop` stops BGM 469, plus 5 no-op stops), then f988 `bgm 476 MUS_VS_TRAINER via PlayBGM`. The Brain's 471 has no fixture.
- **Rows 15-17 (victory, fade, battle-return):**
  - No committed fixture exists.
  - The numbers come only from the docs, on the canonical trace `battle1-postwin-next-prompt` at P=23602: fade 412 at f23608, no-op stop 90 at f23645, bgm 469 at f23655, SE_EXIT at f23681.
  - The victory BGM start is not in those numbers.
  - `heal-window.json` covers only the following heal fanfare (stop BGM at f25803, `MUS_HEAL`, continue at f25963).
- **Rows 18-21:** none in the battle windows. Row 18 is aud242's.

**Scene OFF caveat.** OFF is a different timeline, not a shifted ON. The effectiveness SEs fire earlier (f107 vs f118, f317 vs f474), and the player send-out is about 48 frames earlier. Frames have to come from the presentation and kernel queue, never from fixed offsets.

## 3. Proposed split (each step ≤ 130 min)

1. **aud241a: battle start, tray and send-out** (rows 6-10, 14).
   - Emit from `advanceFactoryBattleStartIntro` / `advanceFactoryRoundBattleStartIntro` and from the `switchInTail.ts` mid-battle send-in.
   - Use `playCry` for the duck handling. Take the cry mode from `ShouldPlayNormalMonCry`.
   - Acceptance windows: `battle-intro-window` and `battle-intro-window-off`, with the tray identical in both and the player-side frames different.
   - Add one Brain intro window (471) and one mid-battle switch-in window with a WEAK send-out cry.
2. **aud241b: effectiveness, faint, low-HP** (rows 1-5, 12-13).
   - Add a pan and kind payload to the kernel `play-se` and `play-faint-cry` consumers. This must be additive, because those events gate timing.
   - Emit SE_FAINT and the faint cry from the faint-animation presentation step.
   - Add low-HP start and stop at the HP-bar red threshold and at the callers listed in row 12.
   - Acceptance windows: `battle-window` and `battle-window-off` (existing), plus new fixtures for a faint (player and opponent), SUPER_EFFECTIVE / EFFECTIVE, and a low-HP start. These need new probe runs or lab requests.
3. **aud241c: battle end and return** (rows 15-17, plus the Brain 354 case).
   - Emit the victory BGM, the fade at P+6, the BGM 469 at P+53 and SE_EXIT at P+79 at the postwin and terminal creation sites.
   - Acceptance windows: a new fixture of the canonical battle-1 tail, from the last faint through P+90, with a Scene OFF counterpart, and the loss-terminal case (fade id 476).

## 4. Risks

- **Low-HP start is unmodelled.** It has no ROM evidence, and the seven caller sites fire at different points: switch-in, healthbar done, faint, and `SetPlayerMonData`. The first aud241b task is a probe window with a red HP bar. The bar threshold and the "already playing" guard (`!lowHpSong`) must also be modelled.
- **Missing fixtures.** Faint, SUPER_EFFECTIVE, EFFECTIVE, the Brain BGM, the victory BGM, the end fade and the battle-return events have none. The nightly T1/T2 gate needs them before it can pin these frames.
- **BGM-to-tray gap.** The lab shows 348 frames (f988 to f1336). The canonical `battle1-swapyes-b` trace shows 359. The 11-frame difference is unexplained, so a fixed offset would fail on one of the two routes.
- **Player-side spacing.** Ball open to cry is 13 frames for the player and 17 for the opponent. The player-side dispatch uses a cry-length-dependent delay (`GENERATED_PLAYER_DISPATCH_BASELINE_DELAY`, `cryDurationTicks`), and only Onix has a WEAK cry length (78 frames, in `WEAK_CRY_FRAMES`).
- **Pan comes from the target's controller.** The effectiveness SE goes to `gBattlerTarget`. The kernel `play-se` event carries `battler`, but the pan mapping has to be added at the presentation seam.
- **m4a semantics the player must model:**
  - **SE priorities.** There are three SE players. `PlaySE12WithPanning` uses SE1 and SE2. The tray BALL and EXIT SEs each use a single player (`PlaySE1WithPanning` / `PlaySE2WithPanning`). A second SE on a busy player can be dropped or cut.
  - **BGM duck on cries.** The duck goes to 85/256 for non-doubles modes, and is restored to 0x100 by the duck task once the cry stops. A cry stop restores the duck on the stop frame, and `noop` duck calls change nothing.
  - **Fanfare pause and continue.** `m4aMPlayStop(BGM)`, then the fanfare, then `m4aMPlayContinue(BGM)` from `Task_Fanfare` (`sound.c:247`).
  - **Fade.** `FadeOutBGM` calls `m4aMPlayFadeOut` (`sound.c:292`). The battle-end fade is speed 5 (`battle_main.c:5144`).
  - **`m4aMPlayAllStop`.** It runs at battle start (f987) before the BGM 476 start.
- **Step mode only for fixtures.** Hybrid `--fast` drops no-ops and previously hid a double SE.
