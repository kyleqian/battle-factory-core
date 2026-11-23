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

## ais4: the opponent faint replacement runs the AI send-in timeline (presentation only)

Files: `src/engine/battleResolutionPresentation.ts` (opponent `switch-in` projection: `faintReplacement`, `aiSwitchLead`, the nickname lag), `src/engine/battleStartSounds.ts` (`SWITCH_IN_BALL_OPEN_ELAPSED_OPPONENT` 18 -> 17),
`tools/compare/traces/obr251-opponent-faint-{off,on}.json` (`appStage.opponentTrainerId` 110). Tests: `tests/ais4OpponentFaintReplacementSendIn.test.ts`, `tests/aud253AiSwitchLowHp.test.ts` (DELTAS re-pinned).

### Why `obr251-opponent-faint-off` matched 6 / 306

1. **Harness (frame 626, the first differing frame).** The staged orchestrator drew its own opponent trainer name; the lab's ROM trainer is id 110. `appStage.opponentTrainerId: 110` in both traces: OFF 6 -> 58, ON 6 -> 59 (the sent-out text 626-660 now matches).
2. **Source (frames 626-710).** A faint replacement (`BattleScript_FaintedMonSendOutNew`, battler 1) has the same ROM timeline as an AI voluntary switch: ball throw 2 frames before the shared `switch-in` timeline (`AI_SWITCH_SEND_IN_LEAD_FRAMES`), tint hold 22, and NO
   nickname lag frame (the offs152 long-nickname lag was measured on forced / Roar send-ins; RATTATA, 7 glyphs, cry 23, has none as a replacement). Both fixed by a provenance test on the `switch-in-animation` event. OFF 58 -> 91, ON 59 -> 178 (of 306).
3. **Sounds (aud253 seed 2741, the +1 send-in SE 15 / cry).** The emitter opens the ball SE at `17 + sendInVisualDelay` (was 18): with the 2-frame lead the SE and cry now equal the ROM exactly (ROM SE 15 at 681, cry at 697 in obr251; aud253 2741 `[0, 0, 1, 1]` -> `[0, 0, 0, 0]`). The aud241a opponent emitter test pins only spacing 16 / pan / ducks and is unchanged.

Matched frames (oracle vs app, `npm run compare`): `obr251-opponent-faint-off` 6 -> 91 / 306, `obr251-opponent-faint-on` 6 -> 178 / 306. No `ais1-*` / `ais2-*` / `ais3-*` / `vis243a-*` / `go246-*` compare traces exist (ais2 / ais3 are test fixtures; their tests are green).
`compare:differential` vs `d7e8ec50d`: `turn5-faint` 110 / 110, `turn13-dragonbreath-faint` 141 / 141, `turn5-switchin` 241 / 241, `turn13-switchin` 242 / 242 byte-identical (their opponent send-in goes through the canonical adapter, a different path); the two obr251 traces differ as intended.

### Census 0..99, both scenes (`lsd194Census.sh` + `rst197CensusDelta.py`, base `d7e8ec50d` vs final)

100 / 100 battles per scene with identical `eventsDigest`, errors and command-type sequences (0 bad). 91 battles per scene change exactly one command each: the opponent `switch-in` after the party-summary (a faint replacement), fields duration, `sendInVisualDelay`, healthbox slide, total frames, each +2. Nothing else moves.

### Pins

`aud253` `DELTAS["2741"]` `[0, 0, 1, 1]` -> `[0, 0, 0, 0]`. `plr162` Scene ON opponent send-ins add the `aiSwitch` 2 (a faint replacement). Soak-trajectory pins moved by the +2 frames per replacement (outcomes unchanged): `randomRoundSoak` seven-win milestone frames 41376 -> 41369, renderCalls 2916 -> 2913; M-B (c) seed 0 frames 39649 -> 39712 (same battle 2 / turn 24 / roundLost);
the carry-14 winning seed 4 -> 2 (scan 0..10); `lbrd` seeds 17 -> 4 (scan 1..12 on the full file: 4 passes 15 / 15). `npm run soak -- --policy vanilla --seeds 0:20` 20 / 20 OK (budget). `npm run typecheck` / the `tsc -b` half of `npm run build` exit 1 on the base too: the same 10 errors in `tools/compare/appTrace.ts` (merge debris: duplicate imports / `rngSeed`, two configs without `moveId`) and `oracleClient.ts` (no pngjs types); `vite build` exits 0.

### Residuals / open (not fixed here)

- Scene OFF: the ROM's `\p` that ends the fainted text clears the box at A+1 (ON does not); the post-send-in text clear is 9 frames early in OFF (app 727 / ROM 736; menu 733 / 742) and 1 frame late in ON (824 / 823).
- Gender: the ROM replacement is male, the staged bench personality 0 is female (24 px in the sprite): harness only, the lab's personality is not recorded.
- The canonical-adapter opponent send-in (`turn5-switchin`, PIDGEOTTO) stays 1 frame late (175 / 241): a separate path, untouched.
- Player side (item 5) not changed. Scene OFF `pmo239-switch-0-to-2-reopen-off` (frames 1140-1400): exact through the recall (1181); from 1182 the player send-in (ball, emerge, fade, particles) is exactly 1 frame late (shift +1 gives 0 px for 1182-1243), the healthbox slide 1245-1266 also 1 late, the next message at ROM 1294 / app 1296. The older RATTATA switch (`mid-battle-switch-dense-a-off`) shows no shift (k0 best; the residual is a static 676 px sprite difference, a harness species / gender issue), so the 1-frame start is
  one observation on PIDGEY / MACHOP and not proven species-independent: a source change needs a second species. Scene ON player send-in (frames 238-250) has no ON lab / trace yet.
- A same-turn player voluntary switch + AI switch (item 3) was not started.

## ais5: the player's voluntary send-in print (species dependent), the same-turn player + AI switch (presentation only)

Closes ISSUES #222 items (3) and (5). Both scenes; no battle rule / RNG / event change (census `eventsDigest` identical).

### Method

Labs in `tools/battle-lab/ais5-*.json` (`mechanicLab.overrides.parties`, the `mechanic-factory-ai-switch-receipt-c2-perish-off` setup: Misdreavus AI, Perish Song sentinel, so the AI switches to Jolteon at turn 4; the player's bench varies per lab).
Turn 3 is a player voluntary switch alone, turn 4 a player voluntary switch plus the AI's Perish switch (`ais5-both-switch-*`), or the AI switch alone (`ais5-ai-only-*`). Scene ON needs its own input timeline (the Perish Song animation is ~270 frames longer, so the menu opens later: segments 9 / 25 / 47 waits 950 / 1000 / 1000).
`tools/integration/labCompare.sh` (ROM SE rows + first-glyph print rows vs the engine) and `npm run compare` windows of 250 frames (traces `tools/compare/traces/ais5-*.json`, appStage `lab`, `opponentTrainerId` 222).

### (3) Same-turn player + AI switch: already on separate clocks

ROM order (both scenes, all labs): player `ActionSwitch` print, recall SE 15, tray / "Go!" print, send-in SE 15; then the AI's `ActionSwitch` print, recall SE 15, tray SE 114, "sent out" print, send-in SE 15 (`DoSwitchOut` runs once per battler, the AI's after the player's, the AI's recall starts the print row after the player's send-in message).
The engine already ran each side from its own source-derived clock: the AI recall / tray / send-in intervals are identical in `ais5-both-switch-*` and `ais5-ai-only-*`, in both scenes, and the order and every row's script label match. The only same-turn effect was the player's send-in offset carried into the AI rows (item 5 below); nothing separate to land for (3). Pin: `tests/ais5SameTurnSwitch.test.ts`.

### (5) The player send-in: ROM "Go! X!" print start + 54 + nickname length (not 1 frame late, species dependent)

The player's `BattleScript_DoSwitchOut` `hidepartystatussummary` / `switchinanim` wait for the "Go! X!" text printer, so the ball-open SE (15) is the print's first-glyph frame + 54 + nickname length (12 species / turns, lengths 4..10):

| species (nickname) | len | ROM print -> SE 15 | species | len | ROM print -> SE 15 |
| --- | ---: | ---: | --- | ---: | ---: |
| Onix | 4 | 58 | Pidgey / Machop / Meowth / Weedle / Gengar | 6 | 60 |
| Rattata / Pikachu | 7 | 61 | Graveler | 8 | 62 |
| Charizard / Bulbasaur | 9 | 63 | Wigglytuff | 10 | 64 |

The engine used `max(13, glyphs) + 1` command rows then the shared 47-row ball-open elapsed (13 fit the 12-glyph RATTATA string only), so the engine's send-in SE was late by +1 / +2 / +3 for 6 / 5 / 4 letters (the 13 floor held the message too long), exact at 7 letters, and 1 early for 8+ letters (the pmo239 PIDGEY / MACHOP 1-frame offset is the 6-letter case).
Rule landed (`voluntaryPlayerSwitchInMessageTiming`, battler 0 + `BattleScript_DoSwitchOut` provenance): the "Go! X!" message holds glyphs + 1 rows with no floor. Every player send-in SE row is now +0 across the 12 species / turns in Scene OFF, and in Scene ON (`ais5-both-switch-on`, `ais5-sp19-6-on`, `ais5-sp75-40-on`: 2349 / 2447 / 3628 / 3726 etc.); the rows after it carry the same shift.
Forced replacements (`plr162`) and the opponent's lines are untouched (other provenance).

### Numbers

- labCompare SUMMARY before -> after (exact / offset / mass of 7 SE rows; ON rows are the first 9 of 15): OFF `ais5-both-switch` 3/4/4 -> 6/1/1, `ais5-ai-only` 3/2/2 -> 4/1/1, `sp19-6` 3/4/5 -> 6/1/1, `sp75-40` 2/5/6 -> 6/1/1, `sp1-52` 3/4/4 -> 6/1/1, `sp25-95` 3/4/11 -> 6/1/1, `sp13-94` 3/4/4 -> 6/1/1; ON `both-switch` 4/5/5 -> 6/3/3, `sp19-6` 3/6/7 -> 6/3/3, `sp75-40` 2/7/8 -> 7/2/2, `ai-only` 4/3/3 -> 4/3/3 (missing 6-9 = the Jolteon / Perish attack animations, unchanged).
- `npm run compare` matched frames before -> after (250-frame windows): OFF both-switch 1480:1729 91 -> 138, 2500:2749 119 -> 159, 2750:2999 189 -> 165; ai-only 2190:2439 176 -> 176, 2440:2689 90 -> 90; ON both-switch 2290:2539 92 -> 209, 3570:3819 102 -> 208, 3820:4069 207 -> 144; ai-only 2290:2539 92 -> 209, 3250:3499 169 -> 169, 3500:3749 21 -> 21; `pmo239-switch-0-to-2-reopen-off` 3 / 3 and `pmo239-reopen-identity-control-off` 1 / 1 both before and after (their capture frames do not include the send-in).
- `compare:differential` vs the base (`abs1-tackle-mash-a-off`, `abs1-tackle-hold-a-on`, `battle2-action-menu-dense`): 547 captures byte-identical.
- Census 0..199, both scenes (`lsd194Census.sh` + `rst197CensusDelta.py`): `eventsDigest` + error identical 200 / 200 each scene, 0 changed commands (62,225 OFF / 63,530 ON): the random-round AI never makes a voluntary player switch.
- T2 (`rescoreAll.sh`, `t2-{base,after}`): OFF 24 seeds and ON 25 seeds identical before and after (OFF exact 872 / offset 261 / mass 627, ON 3464 / 2413 / 7136, 0 missing / 0 extra); no T2 seed has a voluntary player switch, so the labs are the measure.
- Pins: `randomRoundSoak` M-B (c) "full" seed 1 frames 57658 -> 57662 (same battle 3 / depth 2 / turn 15 / roundLost; four voluntary player switches whose "Go! X!" is now glyphs + 1 rows instead of max(13, glyphs) + 1). New `tests/ais5SameTurnSwitch.test.ts`: the player recall / send-in SE rows equal the ROM in 7 labs (4 OFF, 3 ON).
- Play change: an input-ready move. After a voluntary player switch the next command (the opponent's move / the action menu) starts 1 frame later for nicknames of 8+ letters (glyphs 13+), the same for 7 letters (RATTATA, 12 glyphs), and 1 / 2 / 3 frames earlier for 6 / 5 / 4 letters.

### Residuals / open

- **The AI tray -> "sent out" print is 101 or 102 frames in the ROM.** Perish-sentinel labs: 102 in 12 of 14 observations (all Scene OFF labs, ON `both-switch` / `ai-only` / `sp19-6`); 101 in `mechanic-factory-ai-switch-receipt-b-off`, `ais5-sp75-40-on` and the ais2 seed 2741 (both scenes). The engine keeps 101 (ais2, `OPPONENT_SUMMARY_SWITCH_ORDER_FRAMES`), so the AI's print and send-in SE are -1 in the 12; with the player rows now exact this shows in `compare` (OFF 2750:2999 189 -> 165, ON 3820:4069 207 -> 144 matched frames: before, the carried player +1 cancelled it). Not a species or scene rule (sp75-40 is 102 OFF, 101 ON); looks like a one-frame ROM lag inside the 100-frame tray hold. No source rule found, left at 101.
- `mechanic-factory-ai-switch-receipt-b-off` (AI switch at turn 1) is a flat -20 frames (print ROM 412 / engine 392): the AI switch decision's command time, a different path, untouched.
- The player recall effect pixels (anchor / particle origin) still differ for non-RATTATA species even in a plain turn-3 switch (ais2 / ais3 fixture constants); not touched.
- Still open from #222: (2) the Pursuit / Focus Punch AI switches, and the Scene OFF `\p` clear after the faint text.

## ait1: the AI tray lag frame (D4 faithful timing) and #222's box clears

### Cause

No source branch. `OpponentHandleDrawPartyStatusSummary` sets `partyStatusDelayTimer = 0` and the controller func to `EndDrawPartyStatusSummary` (`timer++ > 92`, 94 calls; `CreatePartyStatusSummarySprites` plays SE 114); nothing in it, `Task_HidePartyStatusSummary` or the controller wait depends on the scene, species or turn. Per-frame ROM probe (`tools/integration/ait1TrayProbe.py`, `partyStatusDelayTimer` = `healthBoxesData + 12 * battler + 5`, plus the script exec flag / instruction):

| case | timer at draw d, d+1, d+2 | exec held | print rises |
| --- | --- | --- | --- |
| 102 (ais5 labs, seeds 26 / 61) | 0, 0, 1 | 95 frames | d + 101 |
| 101 (ais5 sp75-40 ON, seeds 15 / 28 / 99 / 2741) | 0, 1, 2 | 94 frames | d + 100 |

(`playTimeVBlanks` is stuck in labs and `vblankCounter1` counts every frame, so neither shows the lag; the controller timer and script state not advancing for one frame is the proof.) The main-loop iteration after the tray-creating one is skipped (a VBlank overrun of the iteration that builds the tray sprites): a CPU / VBlank-phase lag frame, not state-determined.

### Tally and policy (D4)

Voluntary AI-switch trays: stall (102) in 15, none (101) in 9. Stall: 10 of the 11 ais5 labs (all but ON sp75-40), the 2 c2 labs (from the table above, not re-measured), real play seed 26 (OFF + ON) and 61 (OFF). No stall: ais5 sp75-40 ON, `mechanic-factory-ai-switch-receipt-b-off`, real play seed 15 (OFF + ON), 28 (OFF + ON), 2741 (OFF + ON), 99 (OFF). Faint-replacement trays never stall (about 14 observations), so 100 / 123 are right. By the dominant-measured-phase rule (docs/faithful-timing-policy.md) the shipped value is 102, a separately labelled faithful-timing case (`OPPONENT_SUMMARY_SWITCH_TRAY_LAG_MEASURED = {event: 15, noEvent: 9}`, `lagFrames` on the party-summary command timing; the tray slide, ball states and SE use the shifted draw).

Caveat for a future revert: the 10 ais5 labs are replicas of one setup, and real play favours 101 (7 of 10 trays); the choice is one constant (`OPPONENT_SUMMARY_SWITCH_TRAY_LAG_FRAMES`).

### Numbers

- labCompare SE rows (exact / offset / mass): OFF `ais5-both-switch`, `ai-only`, `sp19-6`, `sp75-40`, `sp1-52`, `sp25-95`, `sp13-94` 6/1/1 -> 7/0/0 (`ai-only` 4/1/1 -> 5/0/0); ON `both-switch`, `sp19-6` 6/3/3 -> 7/2/2; ON `ai-only` 4/3/3 -> 5/2/2; ON `sp75-40` (a 101 tray) 7/2/2 -> 6/3/3.
- `npm run compare` matched frames: OFF both-switch 1480:1729 138 -> 138, 2500:2749 159 -> 159, 2750:2999 165 -> 237; OFF ai-only 2190:2439 176 -> 234, 2440:2689 90 -> 86; ON both-switch 2290:2539 209 -> 209, 3570:3819 208 -> 208, 3820:4069 144 -> 237; ON ai-only 2290:2539 209 -> 209, 3250:3499 169 -> 237, 3500:3749 21 -> 101. The 2440:2689 loss is the AI's next message, which stays ~40 frames early in both runs (pre-existing).
- Residual at 2824..2834 / 3874..3884 / 2283..2293: the AI's recall ball effect pixels (not the tray).
- Census 0..199 (both scenes): eventsDigest and error identical 200 / 200, no type-sequence change, 15 battles with changed command fields (the party-summary `frames`).
- T2 (aud249 rescore of the t2n seeds, missing 0 / extra 0): Scene ON exact 3507 -> 3513, offset 2370 -> 2364, mass 6735 -> 6726; Scene OFF exact 872 -> 869, offset 261 -> 264, mass 627 -> 628 (real-play OFF seeds with a 101 tray, e.g. 2741, lose a row; others gain).
- Pins: `tests/ais2AiSwitchFrames.test.ts` (seed 2741 pixel frames: exact before the tray, then the engine is the ROM one frame late except the 11 slide-in frames; the draw timing numbers 102 / 125), `tests/ais1AiSwitchWithdraw.test.ts` (party-summary 101 -> 102), `tests/aud253AiSwitchLowHp.test.ts` (2741 OFF send-in ball open and cry +0 -> +1; those rows match a 101 tray, which 2741 is), new `tests/ait1TrayLag.test.ts`.

### Play change

An AI voluntary switch's tray, "sent out" print and send-in ball / cry are one frame later; nothing else (census eventsDigest identical).

### #222

- (1) AI tray -> print 101 / 102: landed as the faithful-timing case above (closed for the dominant phase; the 101 trays stay 1 frame late).
- (2) Box clears, measured on the dense `compare` captures: the post-send-in clear blank runs (OFF both-switch 2523-2534, ON both-switch 2292-2303 / 3573-3584) are frame-exact ROM vs engine after the lag, so that residual was the 101 / 102 offset and is closed in these labs. The Scene OFF `\p` clear at A+1 did not show up as a separate residual in any ais5 window (the only blank-box difference, ai-only OFF 2201-2202, is the turn's action menu -> move menu transition, unrelated); no source rule was landed for it and it stays open.

