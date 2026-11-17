# ais1: the AI mid-battle switch's "withdrew" message and return-to-ball

Scope: presentation only (`docs/factory-finish-scope.md`: logical outcomes, RNG and kernel events are unchanged). Files: `src/engine/battleResolutionPresentation.ts`
(`withSynthesizedAiSwitchRecallEvents`), `src/engine/midBattleOpponentPartySummary.ts` (aud253 stop-gap removed). Tests: `tests/ais1AiSwitchWithdraw.test.ts`, `tests/aud253AiSwitchLowHp.test.ts`.

## Cause

The kernel's `runVoluntarySwitchAction` starts at `BattleScript_PursuitSwitchDmgLoop` and skips the `BattleScript_ActionSwitch` prelude (`printstring STRINGID_RETURNMON`,
`returnatktoball`), and its `returnatktoball` handler only advances. So an AI switch had no "<TRAINER> withdrew <MON>!" message and no return-to-ball for the opponent,
and the opponent's party-summary draw followed the faint-less action directly. aud253 compensated with a stop-gap: the recall SE_BALL_OPEN rode the tray draw (31 frames late).

## Change

The player's recall is already synthesized in the presentation layer (`withSynthesizedSwitchRecallEvents`, negative sequences, dispatcher `synthesized-voluntary-switch`).
The AI gets the same with its own dispatcher `synthesized-ai-switch` (the Focus Punch pre-pass and menu-SE terms keyed on the player's dispatcher do not move): before the first
battler-1 `draw-party-status-summary` labelled `BattleScript_DoSwitchOut` it inserts `message STRINGID_RETURNMON` (seq -4) and `set-battler-sprite-visibility {battler 1, invisible}`
(seq -3, `returnatktoball`). Existing projection turns these into message (`RETURN_MON_TIMING` 24/9), `switch-out` (32 frames) and a healthbox-hiding `sprite-visibility` (1); the
renderer's `midBattleSwitchOutAt` is generic over battler. The recall SE_BALL_OPEN is now the `switch-out` command's (`emitMidBattleSwitchSounds`, +2), so the stop-gap
`if (lead === 0) playBallOpenSe()` in `midBattleOpponentPartySummary.ts` is deleted. Not synthesized (kept as before): a Pursuit interception (a MOVE_ANIMATION or a hidden battler-1
event precedes the draw), and a presentation with no `opponentTrainer` (unreachable in real play; the text needs the trainer name).

## Evidence (seed 2741 Scene OFF, ROM chain 19/19, `.integration/evidence/ais1/chain/`)

AI-switch segment, rows relative to the segment's commit frame, engine minus ROM:

| row | ROM | engine | delta |
|---|---|---|---|
| recall SE 15 | +53 | +53 | 0 (was +9 vs ROM +53: -44, stop-gap) |
| tray SE 114 | +84 | +84 | 0 (was +9: -75) |
| send-in SE 15 | +239 | +237 | -2 |
| cry 57 | +255 | +253 | -2 |

The segment grew by +74 frames (ROM's gap 75-77); the residual 1-3 frames is the same send-in -2 the aud253 pin already carried. No 31-frame row. Later rows of that segment
(+372 vs +385 SE 13, ...) are the post-switch move body (integration lane). Seed 71 / 15 / 26 / 28 chains also match to battle end (decisions 8 / 24 / 16 / 18).

## Census seeds 0..99, both scenes (`lsd194Census.sh`, base `1aef6552d` vs this tree)

- Outcomes / errors identical (0 error diffs). Commands: 7 battles per scene (seeds 15, 26, 28, 41, 52, 61, 99) gain exactly one triple `message(24f) + switch-out(b1, 32f) +
  sprite-visibility(b1, 1f)`, 21 new rows per scene, no other command changes (difflib: only inserts). `rst197CensusDelta.py` reports those 7 as `digest` diffs because the events
  digest includes the synthesized events; the logical events are the same (the ROM-chain runs above agree on decisions / outcome).
- Sound: 11 seeds change per scene. 7 are the AI-switch seeds (recall SE 15 + tray + send-in move later by the new 74 frames). 4 (71, 79, 80, 93) lose one SE 15 with no replacement:
  a double faint replacement's opponent summary has lead 0, so the aud253 stop-gap played a spurious SE_BALL_OPEN there; seed 71's ROM chain shows 0 missing / 0 extra after the removal.
- Scene ON uses the same commands (same 7 seeds, same triple).

## Pins re-pinned

`tests/aud253AiSwitchLowHp.test.ts` `DELTAS["2741"]` `[31, 0, -2, -2]` -> `[0, 0, -2, -2]`: the 31 was the stop-gap's offset; the recall SE is now at its ROM frame. Seed 2 (Scene ON) unchanged.

## Residuals / open

Superseded by the ais2 section below: the pixel comparison, the opponent anchor and the recall ball effect are done there. Still open: Pursuit-interception AI switches, Focus Punch pre-pass + AI switch,
and Frontier Brain battles are unprobed (no census seed exercises them; the Brain path should carry `opponentTrainer`).

## ais2: pixel compare against the ROM, the recall ball effect, the opponent anchor (presentation only)

Files: `src/engine/battleResolutionPresentationRender.ts` (opponent recall effect, `opponentBattlerYDelta`), `src/engine/battleScene.ts` (opponent-recall particle origin, opponent mon tint),
`src/engine/midBattleOpponentPartySummaryTiming.ts` + the draw command in `battleResolutionPresentation.ts` (tray span), `tools/integration/soundCensusRomReplay.ts` (`replay --render=LO:HI --render-dir=DIR`
writes the engine's 240x160 frames for replay frames LO..HI). Tests: `tests/ais2AiSwitchFrames.test.ts` (fixture `tests/fixtures/ais2-ai-switch-rom-frames.json`), `aud253` DELTAS 2741 re-pinned, `ais1` tray 100 -> 101.

### Method

Seed 2741 (ROM chain 19/19 in both scenes; Scene ON chain made here: `tools/audio/romDriveSeed.sh 2741 on`). The AI switch is segment 5: Scene OFF engine commit 2707 / ROM commit 2768 (pre-segment drift 61),
Scene ON engine 3774 / ROM 3865 (drift 91). ROM frames: the frozen trace with `trace.captureFrames` (<= 256 per `bin/oracle lab` call), engine frame f compared with ROM frame f + drift, md5 of the RGBA.
Frame hashes of 202 (OFF 2727..2928) and 206 (ON 3790..3995) ROM frames are the fixture; the test replays the engine and requires every frame equal.

### The 1-3 frame residual, located

- **The tray span (fixed).** `BattleScript_DoSwitchOut` runs `switchhandleorder BS_ATTACKER, 1` between `drawpartystatussummary` and `getswitchedmondata`; a faint replacement's script has no such command. The opponent's
  draw command is now 101 frames for a voluntary AI switch (`OPPONENT_SUMMARY_SWITCH_ORDER_FRAMES`, keyed on the draw's `BattleScript_DoSwitchOut` label; 100 / 123 for faint replacements as before). The tray slide,
  hold and fade-out are exact against the ROM through the tray's end (frames 2727..2928 and 3790..3995 equal the ROM's). Sound: send-in SE 15 and the cry go from -2 to -1.
- **The send-in ball (attributed, not fixed).** The remaining -1 / 2-frame difference starts at the opponent's send-in ball throw: engine frame 2929 (ON 3996) draws the ball 2 frames before the ROM's 2931 and
  drops it 1 frame before the ROM's last (2944 vs 2945), so the ROM's ball flight is one frame longer and the ball-open SE (+1) and the fade that follows it are one frame later. It is not specific to the withdraw: it is the opponent
  `switch-in` command's own timeline (a faint replacement's send-in shares it; its SE 15 row carries the same -1), and Scene ON shows the identical 112 / 111 px ball rows and fade. Out of the withdraw / switch-out paths this
  step may touch, left as the pinned -1 (`aud253` DELTAS 2741 `[0, 0, -1, -1]`).

### Recall ball effect (AnimTask_SwitchOutBallEffect), now drawn for the opponent

`AnimateBallOpenParticles(x, y + 32, ...)` + `LaunchBallFadeMonTask(FALSE, ...)` at the `switch-out` command's elapsed 2: the white fade of the BG palette rows, the mon's tint toward the ball colour (ramp 0 -> 16) and the
16 particles. The window is the player recall's (`midBattleSwitchFadeAt` / `midBattleSwitchParticleSchedulesAt`, trace 1086 = elapsed 0) on the opponent's own clock: elapsed since the `switch-out` began, carried across the
sprite-visibility and party-summary commands that follow it (the effect outlives the 32-frame command), cut at elapsed 54. Two measured differences from the player's staged fixture: (1) no stolen update tick
(`recallStolenTick = false`): the fixture's frame-1121 stall is the player-side party-summary sprite-sheet work, absent here; with it the BG white-out is off by one step from frame 2794 (ROM 2855); without it 2794..2802 are exact; (2) the
particle base is the slot's fixed `GetBattlerSpriteCoord` (176, 40) + 32 = (176, 72) (sBattlerCoords has no species term), drawn at (172, 68), no terrain clip. The mon is tinted by the same `BALL_OPEN_FADE_POKE_COLOR`
(the recalled mon's ball is a POKE BALL in every Factory set). The player's recall (the voluntary-switch clock) is untouched: `turn5-switchin` 175 / 241 and `turn13-switchin` 242 / 242 equal master's.

### Opponent anchor (item 2)

`SetBattlerSpriteYOffsetFromYScale` reads `GetBattlerYDeltaFromSpriteId`: `gMonFrontPicCoords[species].y_offset` for the opponent (the Castform elevation for a Castform). `midBattleSwitchOutAt(elapsed, battler, yOffset)`
takes it (`opponentBattlerYDelta(art)`; default 13 stays the player's RATTATA). Seed 2741's recalled MURKROW has y_offset 11 (the 13 constant gave `varr` 38 instead of 42); both scenes' scale-up frames are exact with it.
The player's own anchor still uses the staged fixture's 13 for any species (`gMonBackPicCoords` was not touched: the player recall traces are pinned to master).

### Census 0..99, both scenes (`lsd194Census.sh`, base `dcecf376b` vs `335d90c1f`)

Digests / errors equal in all 100 battles per scene; 93 identical; the 7 AI-switch battles (seeds 15, 26, 28, 41, 52, 61, 99) change exactly one command, the opponent `party-summary` 100 -> 101 frames. 0 bad.
Sound: only those 7 rows move, 1 frame each way (the send-in SE 15 / cry and later rows +1).

### Residuals / open

- The send-in ball 2-frame / 1-frame difference above (shared with faint replacements).
- The recalled mon's ball is assumed POKE BALL (every Factory set); a different ball would change the tint / particle palette.
- The player's recall anchor / particle origin are the staged fixture's constants for a non-RATTATA player mon (unchanged).
- Pursuit-interception and Focus-Punch-pre-pass AI switches stay unprobed (as ais1).

## ais3: the player recall anchor from `gMonBackPicCoords`, the AI send-in ball 2 frames early (presentation only)

Files: `src/engine/battleResolutionPresentationRender.ts` (`playerBattlerYDelta`, `recallElapsed`, `midBattleSwitchInAt` `tintHoldOverride`), `src/engine/battleResolutionPresentation.ts` (`AI_SWITCH_SEND_IN_LEAD_FRAMES`, the `aiSwitch` flag on the `switch-in`
command). Tests: `tests/ais3PlayerRecallFrames.test.ts` (fixture `tests/fixtures/ais3-player-recall-rom-frames.json`), `tests/ais2AiSwitchFrames.test.ts` (fixture re-baselined and extended), `aud253` DELTAS 2741 re-pinned.

### (b) Player recall anchor

`SetBattlerSpriteYOffsetFromYScale` reads `GetBattlerYDeltaFromSpriteId`: `gMonBackPicCoords[species].y_offset` for the player (the Castform elevation for a Castform), the mirror of the opponent's `gMonFrontPicCoords` read from ais2.
`midBattleSwitchOutAt` now gets `playerBattlerYDelta(art)` for battler 0 (it was the RATTATA 13 for every species). Pixel-compared against a staged ROM player recall of GRAVELER (back y_offset 12), both scenes, scale-up frames exact.
A second 1-frame residual surfaced there: the player's recall fade runs on the voluntary-switch clock (trace 1087 at command elapsed 0), so the scale ramp keys off `phaseElapsed + 1` for battler 0 (`recallElapsed`); the opponent's clock is unchanged.
Player-switch traces `turn5-switchin` (241) and `turn13-switchin` (242) are byte-identical to the base (`compare:differential`, 1346 captures over the six traces below).

### (a) Seed 2741 AI-switch send-in

- **Re-baseline.** The sta3 merge moved the pre-segment drift (OFF 61 -> 58, ON 91 -> 88); the engine is still frame-exact through the tray at the new offsets; the ais2 fixture was re-baselined (offsets 58 / 88).
- **Cause (attributed, fixed on the AI path).** For a voluntary AI switch the ROM's ball throw is at elapsed 4 of the send-in, 2 frames before the shared `switch-in` timeline's (a faint replacement's `BattleScript_FaintedMonSendOutNew` has no `switchhandleorder`
  and no healthbox hide before it; its OFF oracle trace `obr251-opponent-faint-off` is not oracle-exact at baseline either, 6/306, so the shared timeline is unproven either way and was left alone). `AI_SWITCH_SEND_IN_LEAD_FRAMES = 2`
  is applied to the `switch-in` command only when the `switch-in-animation` event carries `BattleScript_DoSwitchOut` provenance for battler 1: `minimumFrames`, `sendInVisualDelay`, `healthboxSlideElapsed` and `sendInLagElapsed` all +2 (sounds follow the delay).
  Then the mon tint hold is 22 instead of 23 (`tintHoldOverride`, the same value a front-animation send-in already uses): the ROM's fade ends one frame sooner.
- **Result.** Scene ON 3793..4043 (offset 88) exact for the whole window; Scene OFF 2727..3014 (offset 58) exact (fixture windows). OFF 3015+ is the post-switch move body (the AI's move text and animation after the switch; integration lane), not the send-in: best-fit offsets drift there.
- **Traces unchanged.** `compare:differential` HEAD vs `aa46e4ab9`: `obr251-opponent-faint-off/on`, `turn5-faint`, `turn13-dragonbreath-faint`, `turn5-switchin`, `turn13-switchin` all byte-identical (1346 / 1346 captures); the frs247 / pfr192 / obr251 tests are green.

### Census 0..99, both scenes (`lsd194Census.sh` + `rst197CensusDelta.py`, base `b1f11b3a4` vs `c090a3455`)

93 battles identical, 7 changed per scene (seeds 15, 26, 28, 41, 52, 61, 99), 0 digest / error / type-sequence diffs. Each changed battle has exactly one command change: the `switch-in` (battler 1) after the opponent `party-summary`, fields duration, `sendInVisualDelay`, healthbox slide and total
frames, each +2 (e.g. seed 15 OFF 68 -> 70, ON 151 -> 153). No other command moves. Soaks `winning-swap` and `winning` 0:20 are 20 / 20 each (4 x 5 seeds, `--parallel 2`); `randomRoundSoak` 64 / 64 (no pin moved).

### Pins

`tests/aud253AiSwitchLowHp.test.ts` `DELTAS["2741"]` `[0, 0, -1, -1]` -> `[0, 0, 1, 1]`: the send-in SE 15 and the cry are now 1 frame LATE (the visual ball is exact; the sound emitters are out of scope here and were not examined, only re-pinned). Same magnitude as before, opposite sign.

### Residuals / open

- Sound rows send-in SE 15 / cry +1 (above); the emitter's own offset from the ball throw needs its own look.
- The faint-replacement send-in (shared timeline) is unchanged and unproven against the ROM at the 2-frame start (obr251-off is 6/306 at baseline).
- Player recall: the ROM's 1-frame healthbox-hide intermediate frame (ROM 238 / engine 230 in the staged window) and the player send-in ball / emerge (frames 238-250, Scene ON) are the player-side open items.
- The recalled mon's ball is assumed POKE BALL (every Factory set).
- Pursuit-interception and Focus-Punch-pre-pass AI switches, and a same-turn player + AI switch, stay unprobed.
