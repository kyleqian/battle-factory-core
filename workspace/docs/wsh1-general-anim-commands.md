# wsh1: Wish heal / Future Sight hit / Focus Band as general-animation commands (ISSUES #219)

Written by wsh1b from the wsh1 commits (`7bfa36da9..cc14d3ee1`; its session ended at the cap before the doc). Measurements below are wsh1's, taken
from its evidence dir (main tree `.integration/evidence/wsh1/`: `*.hashes.json` = per-frame framebuffer md5 of the app run and the ROM run,
`offs.py` = best frame offset of a window) and worker log; items marked **wsh1b** were (re)measured in this step. Section "wsh1b" at the end carries
this step's results.

## Source

Three `playanimation` sites whose animation the engine did not present (Scene ON the controller runs the General_* script and the next print / hit
waits for it; Scene OFF takes `BattleScript_Pausex20`):

| site | script | animation | battler |
| --- | --- | --- | --- |
| Wish comes true | `data/battle_scripts_1.s:3589-3599` `BattleScript_WishComesTrue` | `playanimation BS_TARGET, B_ANIM_WISH_HEAL` (:3591), then the print | the wisher |
| Future Sight / Doom Desire hit | `BattleScript_FutureAttackAnimate` :3519-3523 | `playanimation BS_ATTACKER, B_ANIM_FUTURE_SIGHT_HIT` (:3519; Doom Desire has its own :3522 and joins at `BattleScript_DoFutureAttackHit`), then `effectivenesssound; hitanimation` | the Future Sight user's slot |
| Focus Band | `BattleScript_FocusBandActivates` :4390-4394 | `playanimation BS_TARGET, B_ANIM_FOCUS_BAND`, then STRINGID_PKMNHUNGONWITHX | the survivor |

`Cmd_playanimation` (`src/battle_script_commands.c:4004-4038`), in order: STATS_CHANGE / SNATCH_MOVE / SUBSTITUTE_FADE always go to the controller;
`HITMARKER_NO_ANIMATIONS` (Scene OFF) pushes `BattleScript_Pausex20` (`pause B_WAIT_TIME_SHORT` = 32 frames, unconditional); the four weather
`*_CONTINUES` go to the controller; **a `STATUS3_SEMI_INVULNERABLE` battler skips the animation** (:4033-4038, advance 7, no controller command, no wait);
else `BtlController_EmitBattleAnimation`. The controller (`PlayerHandleBattleAnimation`, `battle_controller_player.c:3066-3079`) calls
`TryHandleLaunchBattleTableAnimation` (`battle_gfx_sfx_util.c:458-495`), which returns TRUE (no animation, `ControllerExecCompleted` at once) when
the battler is behind a Substitute and the animation is not one of `ShouldAnimBeDoneRegardlessOfSubstitute` (:505-519: SUBSTITUTE_FADE, the four
weather continues, SNATCH_MOVE), else it launches `gBattleAnims_General[tableId]` and the controller waits (`CompleteOnFinishedBattleAnimation`).

## What the engine does

`src/engine/battleResolutionPresentation.ts`:

* Constants `WISH_HEAL_COMMAND_FRAMES = 201`, `FUTURE_SIGHT_HIT_COMMAND_FRAMES = 172`, `FOCUS_BAND_COMMAND_FRAMES = 129`.
* `projectBattleResolutionCommands` collects the three `animation` receipts (`WISH_HEAL`, `FUTURE_SIGHT_HIT`, `FOCUS_BAND`) with the held-item inserts and
  emits a Scene ON `general-animation` command of that length (Scene OFF has no animation receipt in these slots; see holds below). The insert
  is skipped behind a displayed Substitute doll (`substituteDoll`, the same fact as the Focus Punch / stats-change skip).
* Scene OFF holds: Wish **36**, Focus Band **40** are `heldItemEffectOffHoldFrames`' executions + a per-animation lead (`WSH1_OFF_HOLD_LEAD`: Wish 0,
  Focus Band 2; the held-item leads 15 / 9 do not apply); Future Sight's hit **42** (`FUTURE_SIGHT_HIT_OFF_HOLD_FRAMES`, a `move-animation`
  hold before the `hit-animation`, found by the shared `PLAYANIMATION` slot before `effectivenesssound` with `B_ANIM_DOOM_DESIRE_HIT` two
  instructions back; Future Sight's `goto` jumps over Doom Desire's own slot, both take Pausex20).
* `src/engine/moveAnimSounds.ts`: `emitGeneralAnimSounds` emits the table SEs of `General_WishHeal` / `General_FutureSightHit` / `General_FocusBand` at
  script frame = command age - `*_SCRIPT_AGE` (6 / 0 / 0).
* Test harness: `tools/compare/appTrace.ts` `wsh1Stage` (+ `rngSeed` option) and the staged labs `tools/battle-lab/wsh1-{wish,fs,fb}-{on,off}.json`, traces
  `tools/compare/traces/wsh1-*.json`; Tier-1 `tests/wsh1GeneralAnimCommands.test.ts`.

## ROM windows

Offsets are "ROM frame = app frame + offset" over a window (best offset by exact framebuffer md5; `offs.py`). The "pre-segment offset" is the offset the
rows of the same resolution *before* the command already have, so a command is right when the rows after it return to that same offset.
Setups: Wish = `aud242k-wish-player-on` base (Rattata Lv50 vs Lv12, the player Wishes, the opponent uses Seismic Toss; the heal is the turn after);
Future Sight = player Lv50 FUTURE SIGHT vs Lv25 Rattata, lab seed 2; Focus Band = Lv20 Rattata holding FOCUS BAND (196) vs Lv50, oracle lab seed 9
(the lab seed does not map to the app RNG; oracle seeds 9 / 16 / 29 / 40 trigger the band, app seed 2 does too).

| animation | scene | ROM window | ours | next text / hit at pre-segment offset |
| --- | --- | --- | --- | --- |
| Wish heal | ON | 201 frames from the `playanimation` row X to the first glyph of "...wish came true!" | 201 | offset 0 before (1200-1222: 23/23) and after (1423-1445: 22/23; 1446-1510: 65/65) |
| Wish heal | OFF | `Pausex20` 32 + the script's own rows: first glyph 36 rows after | 36 | offset 0 (window 924-1277 aligned except a 4-frame lead) |
| Future Sight hit | ON | 172 frames to the `hitanimation` | 172 | pre-segment offset +14 (1990-2060: 71/71 at +14); hit at the same +14 |
| Future Sight hit | OFF | `Pausex20` + the message wait: 42 before the hit | 42 | pre-segment offset +14 (1800-1960: 161/161 at +14) |
| Focus Band | ON | ROM +137 after the message start, ours +8 pre-segment offset: 129 | 129 | +8 for the print (500-560: 59/61 at +8), later rows at +14 (Seismic Toss residual, out of scope) |
| Focus Band | OFF | 38 executions + lead 2 = 40 | 40 | offset 0 for the window (fb-off2 200-224 exact) |

## Measured constants and how they were derived

* **201 / 172 / 129**: step the ROM lab to the `playanimation` row, find the first row whose framebuffer differs from the pre-animation hold and the
  first row of the next print / hit; the command length is the difference at the pre-segment offset (Focus Band: ROM +137 minus the +8 offset).
* **36 / 40 / 42** (Scene OFF): measured on the OFF ROM labs. Wish 36 equals the script's own executions (lead 0); Focus Band 38 executions + lead 2;
  Future Sight's hold cannot be derived from execution counts (the message's own wait is in them), so it is the ROM-measured constant.
* **Script ages 6 / 0 / 0**: the T2 seeds 3738 (Wish; SE 140 at command age 41, 179 at 116), 6079 (Future Sight; 189 at 3, 184 at 41 and 50),
  4235 (Focus Band; 171 at 0) scored against the ROM sound rows (`tests/wsh1GeneralAnimCommands.test.ts` "SE rows at command age").

## Census / soak (wsh1, `cc14d3ee1`)

* `tools/integration` sound/command census seeds 0..99, both scenes: `eventsDigest` identical for all 100 seeds (the Scene ON command streams of 9 seeds
  gain the inserted commands; no gameplay digest moved).
* vanilla 0:20 both scenes 20/20 OK; winning 0:60 60/60 OK; `npm run test:gate`, `npm run build`, `npm run build:lib` green.
* Two soak frame pins moved (frames only, same battle / turn / end state): seed 21 strong-route 41_099 -> 41_221, seed 0 full 37_771 -> 37_806.
* T2 (ON): ROM-only move-animation rows 56 -> 40 on the aud257 chain with seeds 3738 / 6079 / 4235 re-run; engine-only 0.

## Residuals (as wsh1 reported)

* Future Sight hit: the rows of the turn before the command sit at +14 in both scenes, and an end-of-turn residual of +8 after the hit (also in both).
* The second Future Sight SE (184, at command age 41) lands 1 frame early against the ROM table.
* Wish ON: after the heal message the HP bar / following print / turn-end rows sit at +2 / +5 / +10 (wish-on2 1511-1622).
* Focus Band lab: later rows follow a different (unmodelled-here) Seismic Toss timing; not part of the command.

## wsh1b

### 1. Source skips (Cmd_playanimation semi-invulnerable, Substitute)

Both already existed (kernel `PLAYANIMATION` in `battleScriptStatbuffchangeOpcode.ts` emits nothing for a `STATUS3_SEMI_INVULNERABLE` battler; the
projection insert loop skips behind `substituteDoll`). New Tier-1 coverage in `tests/wsh1GeneralAnimCommands.test.ts` (stages `wsh1b-wishdig-{on,off}`,
`wsh1b-wishsub-on` in `tools/compare/appTrace.ts`, labs/traces of the same names): control Wish heals once; Wish on a Dig user and Wish behind a
Substitute heal 0 times, the wish still comes true. A mutation (`if (true || ...)` on the Substitute check) fails the Substitute test.
ROM window (Wish heal on a Dig battler): no ~+200 jump; heal message at +20 (pre-turn +8), heal HP +22, next message +25, i.e. the same +2/+5
post-heal residual as the grounded control.

### 2. T2 (Scene ON, 21 aligned seeds: 3738 / 6079 / 4235 re-run + the 18 from the aud259 chain)

Move-animation SE exact 308, offset 3683, ROM-only (missing) 0, engine-only (extra) 0. Other families missing 0 / extra 0: stat-change 13/72,
cry 4/167, battle-controller 66/577, bgm 0/5, fanfare 0/0, screen 0/0 (exact/total).

### 3. Future Sight residuals: cause

* **+14 (both scenes)** is not Future Sight: it is the 28-frame `HP_TIMING` floor after the *foe's* Seismic Toss hit on the player (damage 25): ROM
  bar-drain start -> next text 43 frames, app 29. Bar-drain frames match. hpd1's floor-free rule covered only hits on the foe.
* **+8 end-of-turn** is the post-bar tail after the Future Sight hit's `datahpupdate`: ROM drain end -> text box clear 18 frames (script rows
  `gBattlescriptCurrInstr` advance about one instruction per frame, then action-finish transitions, probe `hpd2Probe.py`), app 10 (`TURN_END_TIMING`).
  Same mechanism as hpd1's unlanded tail; the only rule available (hpd1 `hpMoveEndLeadRows` / `applyHpHitTails`, e01bfd249) was reverted because
  rol1-rollout5-on got worse, and re-applying it for one script was not source-proven, so **no production change**.
* **Second SE 184 early**: not reproduced. Engine rows match the ROM spacing exactly (38, +9) in 3/3 FS instances of seed 6079.

Because nothing frame-moving changed, no census / soak re-run was needed.

### 4. Drawing the three animations in Scene ON

Done in wsh2 (below).

## wsh2: the three animations are drawn in Scene ON (ISSUES #219 remainder)

Presentation only (`battleScene.ts generalAnimationRenderView`; pure rows in `src/animation/{focusBand,wishHeal,futureSightHit,normalPaletteFade}.ts`).
No command length, timing, gameplay, RNG, sound or Scene OFF change (gates below). One `GENERAL_SCRIPT_START_FRAMES` entry
(`battleResolutionPresentationRender.ts`, FOCUS_BAND 8) shifts the Focus Band effect's age to the script's first row; the other two scripts start at
command age 0.

### Source and what is reused

* **General_FocusBand** (`data/battle_anim_scripts.s:10500`): `simple_palette_blend` of the survivor toward RGB_RED (up delay 7, then down delay 4) and
  `AnimTask_SlideMonForFocusBand` (`battle_anim_effects_3.c:3585-3719`, args 30, 128, 0, 1, 2, 0, 1: 30 runs of the slide + 30 runs of the held slide;
  the player's x flag subtracts, the opponent adds), then the gSlideMonToOriginalPosSpriteTemplate restore (`slideMon.ts slideMonToOriginalPosAtTick`, 15).
  The slide is ported literally (`focusBand.ts slideRunsX2`, held x2 -13 / +17); the palette steps come from `normalPaletteFade.ts`
  (`palette.c UpdateNormalPaletteFade`: deltaY 2, step = delay + 2 frames, the BG pass on the creation frame and the OBJ pass one frame later,
  y clamped to the target).
* **General_WishHeal**: BG palettes blend toward black (`normalPaletteFadeY` delay 3, 0 -> 10, back at the end), the wisher's two granting stars
  (`heldItemHeal.ts` star rows, period 10, 61 ticks) and the four healing blue stars (period 9, `healingBlueStarsAtAge`, `RECOVER_STAR_SPAWN_PERIOD`) at
  `liveBattlerAnchors(side).picOffsetPoint`. No new component: Wish's stars / hearts and the item-heal stars are the existing implementations.
* **General_FutureSightHit**: SetPsychicBackground (`psychicBackground.ts` ramps, rotation ring and the +2 pause at the blendoff gap, as Psychic /
  Confusion / Future Sight), `setalpha 8, 8`, ShakeMon(target, 4, 0, 15, 1) + ScaleMonAndRestore(-5, -5, 15), ShakeMon(target, 4, 0, 24, 1), clearmonbg
  (`shakeMon.ts`, `bind.ts scaleMonAndRestoreAtAge`, the Psychic draw's `drawExtractedTileBg` + `mgbaDarkenColor`, the alpha-blended affine stretch
  over the frozen monbg copy). The target is the other side from the effect's battler (the Future Sight user's slot).
* Both sides: the effect's battler is the wisher / survivor / user, so either side is drawn from the same rows (x mirrored where the C mirrors it:
  Focus Band's slide direction, the stars' dx). The opponent stands at its tracked front idle rest (`liveBattlerAnchors().frontIdleRest`) and its
  elevated shadow hides while the script runs (as hie2).

### Fitted constants (the rest is source-derived)

| constant | value | what it is | fit |
| --- | --- | --- | --- |
| `GENERAL_SCRIPT_START_FRAMES.FOCUS_BAND` | 8 | the script's first row after the command start | exact from age 0 of the first tint step |
| `FOCUS_BAND_PALETTE_LEAD` | 2 | the OBJ blend shows 2 frames before the model's pass | tint pairs of 1071 px at 1 |
| `FOCUS_BAND_BLEND_DOWN_FRAME` / `_RESTORE_FRAME` | 60 / 104 | the script waits (`delay`, `waitforvisualfinish`) | restore 101 left a 17-frame tail residual |
| `WISH_HEAL_BG_UP_AGE` / `_DOWN_AGE` | 11 / 167 | the BG black blend's start and the back-fade's start | 13 / 169 was 2 frames late |
| `WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE` | 43 | first visible granting star | 46 was 3 frames late |
| `WISH_HEAL_HEALING_OFFSET` | 75 | healing blue stars start after the granting stars | 76 / 82 left a column of star pixels |
| `FUTURE_SIGHT_HIT_PSYCHIC_AGE0` | 10 | the Psychic family's age 0 in command age | the fade-1 pixel (5, 100) one frame late at 11 |
| `FUTURE_SIGHT_HIT_SHAKE1_START` / `_SHAKE2_START` / `_FADE2_START` | 37 / 67 / 120 | the first / second shake task creation, the second BG fade | phase of the 4-period shake (35 / 66 each off by 2 / 1 frames), fade 2 from the ROM BG pixel |

Future Sight display lags (all ROM-fitted, same family as Psychic's): the OBJ scale reads age - 2, the alpha-blend mode age - 1 (plus one more frame at
the tail), the first shake shows its creation x2 (4) on the creation frame itself, the monbg copy follows the live x2 one tick behind and shows 4 on the
second shake's creation frame while the OBJ still shows 0. The copy exists from the first shake through the second one.

### Measured (ROM = Scene ON oracle; app capture N = state after N ticks; evidence `.integration/evidence/wsh2/`, not in git)

Frame counts are exact framebuffer matches against the ROM frame `N + pre-segment offset`, per in-window capture. The labs: the existing player-side
`wsh1-{fb,wish,fs}-on` and, new in wsh2, the opponent-side `wsh2-{fb,wish,fs}-opp-on` (`tools/battle-lab/`, `tools/compare/traces/`, stages in
`tools/compare/appTrace.ts`): the same Rattata pair with the sides swapped (the foe Wishes / Future Sights / holds the Focus Band, the player uses
Seismic Toss).

| animation | side | window (captures) | offset | in-window exact | residual (class, pixels) |
| --- | --- | --- | --- | --- | --- |
| Focus Band | player | 375 - 505 (131) | +8 | 131 / 131 with the foe-idle mask (163,41,190,71); 123 / 131 unmasked | 8 frames (375 - 382): the foe's front-idle bounce phase, 410 px, bbox 163,41-190,71, also present in the rows before the command (pre-existing) |
| Focus Band | opponent | 371 - 500 (130) | +8 | 130 / 130 (135 / 135 over 366 - 500) | none |
| Wish heal | player | 1222 - 1423 (202) | 0 | 200 / 202 | 1223: the foe idle phase (410 px, 163,41-190,71); 1337: 50 px, bbox 72,88-88,109 (end of granting star 2 / first blue star) |
| Wish heal | opponent | 1222 - 1423 (202) | 0 | 201 / 202 | 1337: 78 px, bbox 151,43-176,73 (same star hand-over) |
| Future Sight hit | player | 2059 - 2230 (172) | +14 | 172 / 172 with the foe-idle mask; 125 / 172 unmasked | 47 frames (2059 - 2105, before the first shake): the foe idle phase, 410 px (the sprite is the target; same residual in the rows before the command) |
| Future Sight hit | opponent | 2059 - 2231 (173) | +14 | 173 / 173 | none |

Rows after each window at the same offset: Focus Band 59 / 61 at +8 as wsh1 (the Seismic Toss residual); Wish and Future Sight windows return to their pre-segment
offsets (Wish 1423 - 1445 22 / 23 as wsh1; Future Sight 2233 - 2290 23 / 23 at +14, unmasked).

### Residuals

* Wish 1337 (one frame per side, 50 / 78 px): the last tick of the second granting star against the first blue-star frame (the `local 60` star tick is not
  drawn, which is the 50 px choice; drawing it gives 65 px). Hypothesis: the OAM tile slot is reused by the blue star. Unfixed.
* The foe's front-idle bounce phase (410 px, 1 px) in the player-side labs is the pre-existing lab phase (identical before the command); the Future Sight
  hasher mask exists for it.
* Not proved: an elevated opponent's shadow window, a species whose OBJ is not a 64 x 64 canvas, the player-side user of Future Sight with a player target
  (the opponent-side lab's target is the player's Rattata: proved), Focus Band / Wish on a different species, Doom Desire's own script.
* Future Sight's +14 / +8 HP-hold residuals and the Wish post-heal +2 / +5 are the hpd-family timing items listed above; untouched.

### Gates (code: see the final report for the commit / tree)

Filled by the final report of the wsh2 session; this file records the measurements above.
