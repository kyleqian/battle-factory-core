# aud242 -- move-animation sounds (S11 audio design step 6)

Scene ON only. Write-only: the emitter reads the presentation state and calls `emitSound`
behind `soundCollecting()`; no pixel, RNG or timing moves. Scene OFF skips move animations
(`HITMARKER_NO_ANIMATIONS`), so it emits nothing for them.

## 1. How a live move timeline exposes its source age

A live move-animation command (`battle-resolution` presentation, `type: "move"` effect) renders
a body at an *age*. The age comes from one function,
`liveMoveUniversalRowAge` (`src/engine/battleResolutionPresentationRender.ts`):

    age = max(0, phaseElapsed - seGate - pre - idleLead)

- `phaseElapsed` -- ticks since the command started presenting (`lifecycle.phaseElapsed`).
- `seGate` -- `command.timing.seGateFrames`: HandleMoveAnimation's `IsBattleSEPlaying` rows
  (a multi-hit's 2nd+ hit), presented before the pre rows.
- `pre` -- `liveMoveUniversalRows(...).pre`: 3 rows, 0 for the moves in `LIVE_MOVE_NO_PRE_ROW_SIDES`
  (per attacker side). `post` is 2 for `LIVE_MOVE_POST_ROW_SIDES`; it only holds the last body row
  after the body ends, so it does not move any sound.
- `idleLead` -- `liveMoveIdleLeadRows`: the per-move lead (`LIVE_MOVE_IDLE_LEAD_ROWS`).
- Declined / approximate / static commands (`liveMoveAnimationDuration === null`) have no
  ROM-faithful timing and must not emit.

Relationship to the decoded script: the first script command executes at body age 1, so a
command that the VM reaches at script frame `f` runs at body age `f + 1`.

`liveMoveSourceAge` (same file) exposes `phaseElapsed - seGate - pre` for the emitter. It does
NOT subtract `idleLead`: that lead was measured as the visual onset of the accepted window, but
the ROM script runs from the `gAnimScriptActive` rising edge, i.e. during the lead rows.

Script-frame costs (`battle_anim.c` / `battle_anim_scripts.s`):

| op | frames |
|---|---|
| `loadspritegfx`, `monbg` | +3 |
| `delay N` | N + 2 (`delay 0` is -1: also 2 frames) |
| `waitforvisualfinish`, `waitbgfadein/out`, `waitsound` | data-dependent: later frames are *gated* (not resolved) |
| `choosetwoturnanim a, b` | label `b` when the move turn is odd |
| `jumpifmoveturn n, L` | branch on equality |
| `jumpifcontest` | false in the Factory |
| `jumpret*` | data-dependent (unresolved) |

## 2. Anim-script sound ops

`Moves` table, decoded from `reference/pokeemerald/data/battle_anim_scripts.s` (a scratch
interpreter walking every move body for turn 0 and 1; counts are over those walks):

| op | pre-wait exact | gated (after a data-dependent wait) |
|---|---|---|
| `playsewithpan` | 944 | 849 |
| `loopsewithpan` | 100 | 71 |
| `waitplaysewithpan` | 72 | 16 |
| `panse` | 34 | 8 |
| `setpan` | 4 | 0 |
| `createsoundtask` | 4 | 12 |
| `playse` | 0 | 3 |
| `panse_adjustnone` / `panse_adjustall` | 0 | 2 / 2 |

Of 710 body/turn runs, 676 resolve end to end; the remaining 34 hit `jumprettrue` (17),
`jumpreteq` (10), `jumpretfalse` (5) or `jumpargeq` on an unset arg (4).

Semantics (battle_anim.c):

- `playsewithpan SE, pan` -> `PlaySE12WithPanning(SE, BattleAnimAdjustPanning(pan))`
  = `animSoundPan(pan, ...)`. SOUND_PAN_ATTACKER = -64, SOUND_PAN_TARGET = 63.
- `playse SE` -> `PlaySE(SE)` (no pan).
- `loopsewithpan SE, pan, wait, times` -> `Task_LoopAndPlaySE`: plays at t0, t0 + wait, then
  every wait + 1 frames, `times` plays in total.
- `waitplaysewithpan SE, pan, wait` -> `Task_WaitAndPlaySE`: plays at f + wait.
- `panse*` / `setpan` -> pan is the running `currentPan` (slice 2+).
- `createsoundtask` -> `SoundTask_*` C tasks (slice 3+).

## 3. The 59 C-side sites (`audio-sound-sources.json` `cAnimSites`)

By file: battle_anim.c 7 (the ops above), battle_anim_throw.c 12 (ball / shiny, not moves),
battle_anim_sound_tasks.c 13 (FireBlast 2, LoopSEAdjustPanning, cries 7, PlaySE1/2WithPanning),
battle_anim_effects_3.c 10, battle_anim_effects_1.c 5, battle_anim_effects_2.c 3,
battle_anim_utility_funcs.c 2 (stat up/down), battle_anim_rock.c 2 (Rollout),
battle_anim_ghost.c 2 (Confuse Ray), and one each in electric, fire, psychic.
Sprite-callback sites depend on per-sprite state (not the script clock), so they are
per-family slices.

## 4. aud242a implementation and ROM calibration

- `tools/extract/extract-anim-sound-timing.ts` (`npm run extract:anim-sound-timing`) walks every
  move body for move turns 0..5 with the VM clock above and writes
  `src/data/gen/anim-sound-timing.json` (356 moves, 257 distinct variants, 571 ops; the sound ops
  before the first data-dependent wait or unresolved jump; later ones are counted as `gated`).
- `src/engine/moveAnimSounds.ts` (`emitMoveAnimSounds`, called from `tick()` inside
  `soundCollecting()`): Scene ON only (`HITMARKER_NO_ANIMATIONS` clear), live commands only.
  An op at script frame `f` is emitted when `age == f + 1 + 7`; 7 is the Scene ON controller lag
  (`SCENE_ON_LAG`, battleHitSounds). Pan = `animSoundPan(op.pan, {attackerSide, targetSide})`.
  `loopsewithpan` expands to t0, t0 + wait, then every wait + 1.
- ROM comparison (27 hybrid `--fast` windows for calibration; 8 step-mode windows pinned in
  `tools/audio/fixtures/aud242a-*.json`, test `tests/aud242aMoveAnimSounds.test.ts`): ids and pans
  equal the ROM everywhere, including opponent-side `-63` / `63` swaps. Frames are exact for
  Slam, Razor Leaf (7 SEs), Swift (5), Slash, Quick Attack, Vice Grip (contact and projectile bodies, lead 0 or 13)
  on both sides. Constant per-move residuals (ROM minus ours), named not fitted:

| move | residual | note |
|---|---|---|
| Ember, Acid, Bite | +2 | idle-lead moves (lead 4/7/10); lead is a visual-onset measure |
| Twineedle | +10 | lead 10, script start aligned to the window instead |
| Double Slap, Fury Swipes | +9 | multi-hit bodies |
| Bind | +6 | `pre` 0 side |
| Psybeam | +2 | plus 4 SE_M_PSYBEAM2 task SEs (createsoundtask, aud242c) |
| Agility, Double Team, Swords Dance, Sand Attack, Light Screen, Harden | -4 / -2 / -4 / -2 / -4 / -5 | status moves |

- Not emitted: declined (static / approximate) bodies (`liveMoveAnimationDuration` null: Tackle,
  Vine Whip, Seismic Toss, ...), ops after a data-dependent wait, `jumpret*` runs, `panse*`,
  `setpan`, `createsoundtask` (slices b/c).

## 5. Slice plan

1. **aud242a (this slice)**: a generic emitter for the pre-wait deterministic prefix of
   `playsewithpan` / `playse` / `waitplaysewithpan` / `loopsewithpan`, data-driven from a
   generated timing table (`src/data/gen/anim-sound-timing.json`) built by a new extractor;
   pan from `animSoundPan`. ROM windows pin >= 5 Level-50 moves, both attacker sides.
2. **aud242b**: a wait resolver for the sounds after `waitforvisualfinish` (needs the
   per-body wait length: `liveMoveAnimationDuration` or sprite-task state), plus unresolved
   `jumpret*` / `jumpargeq` runs.
3. **aud242c**: `panse*` / `setpan` and the `createsoundtask` families (FireBlast, cries,
   LoopSEAdjustPanning, PlaySE1/2WithPanning).
4. **aud242d+**: the sprite-callback C sites (effects_1/2/3, rock, ghost, electric, fire,
   psychic, utility_funcs), one family per slice.
5. **aud243**: the census column.

## 6. aud242b: a wait resolver (Scene ON)

**Mechanism.** The extractor no longer stops at the first data-dependent wait. It keeps the VM
clock and a list of the visual tasks / sprites created since the last wait, each with a lifetime
(ticks after its creation tick at which it is gone). `waitforvisualfinish` resumes at
`max(creation + gone) + 1` (the RAM-verified rule of `src/animation/animScriptInterpreter.ts`,
dragonRage), or costs 0 when nothing is pending. A wait whose pending set cannot be resolved marks
the rest of the walk unresolved (its ops are counted, never emitted). Lifetimes (all source-derived
or RAM-probed numbers `src/animation` already uses):

| creation op | gone after |
|---|---|
| `AnimTask_ShakeMon`, `AnimTask_ShakeMon2` (same step structure) | `shakeMonSequence.length - 2` |
| `gSlideMonToOffsetSpriteTemplate` / `...OriginalPosSpriteTemplate` | `duration + 1` / `duration` |
| `create_dragon_rage_fire_spit_sprite` / `..._plume_sprite` | `duration + 1` / 26 (dragonRage.ts) |
| `create_basic_hitsplat_sprite` | upper bound 10 (8-tick affine anim); resolves a wait only when an exact lifetime in the same wait is larger |
| any other creation macro (found from the `.macro` bodies) | unknown -> the wait is unresolved |

`waitbgfadein` / `waitbgfadeout` (hardware palette fade, `Task_FadeToBg`) and `waitsound` are
unresolved. Branches resolve from the request: `jumpret*` / `jumpargeq ARG_RET_ID` read the value
the preceding task writes (`IsContest` 0 in the Factory, `GetAttackerSide`, `GetTargetSide`,
`IsTargetPlayerSide`, `GetTargetIsAttackerPartner` 0); any other return task stops the walk
(`unresolved-branch`). Variants are keyed by (turn, attacker side): `variants[turn * 2 + side]`
(table schema `anim-sound-timing/v2`, 230 distinct variants, 543 ops). The emitter is unchanged
otherwise (`age == f + 1 + 7`, `emitSound` behind `soundCollecting()`; Scene OFF emits nothing,
no `battleScene.ts` code). aud242a emission is a subset of the new one for every move / turn / side
(checked: 0 missing), and `tests/aud242aMoveAnimSounds.test.ts` is unchanged and green.

**Counts** (turn 0, player attacker, 356 moves; `npm run extract:anim-sound-timing`). aud242a
gated 497 sound ops (469 behind a mid-script wait, 28 in a final segment). aud242b emits 4 of them
(Dragon Rage `loopsewithpan` 145, Mega Punch `playsewithpan` 123 inside `call SetImpactBackground`,
Haze 246, Hi Jump Kick 143); 562 ops are resolved in total, 501 remain unresolved (this count also
enumerates ops behind resolved `jumpret*` runs that aud242a never walked): unmodelled lifetime 351,
bg-fade 134, waitsound 11, unresolved branch 5. The biggest blockers (op creating the pending item
the wait cannot resolve): sprite templates (Hydro Pump orbs, Fire Spin, Fire Plume, Sand Attack /
Mud Slap / Mud Shot, falling rock, flamethrower flame, ...) and `AnimTask_BlendBattleAnimPal` /
`simple_palette_blend`. Of the 34 `jumpret*` / `jumpargeq` stops of aud242a, the side / contest
branches now resolve; the SEs behind them are mostly behind a fade (Hyper Fang, Mach Punch) or an
unmodelled sprite.

**ROM windows** (step mode, 822 frames, `tools/audio/fixtures/aud242b-*.json`, test
`tests/aud242bMoveAnimSounds.test.ts`; labs `tools/battle-lab/aud242b-*.json` from
`tools/audio/makeAud242bLabs.py`; the Level-50 side is the attacker, the other side Lv 12 Pound-class
move 69). ids and pans equal the ROM in every row; frames are exact up to the named residuals
(ROM minus ours, named not fitted):

| window | emitted rows | ROM frames | residual |
|---|---|---|---|
| Dragon Rage, opponent | 78 SE171, 175 / 186 / 198 SE145 (-63) | exact | +3 constant on all 4 (lead 7 move); the loop SE after three waits is relative-exact |
| Dragon Rage, player | 74 SE171, 171 / 182 / 194 SE145 (63) | exact | +3 constant |
| Mega Punch, player / opponent | 77 / 81 SE140, 134 / 138 SE123 | exact first, +1 on SE123 | +1: the SE sits inside `call SetImpactBackground` (`changebg`, no script wait); candidate: a lag frame from `LoadMoveBg` decompression, not attributed |
| Hi Jump Kick, player / opponent | 101 / 105 SE143 | exact | second SE 123 (113 / 117) after the jump-kick sprite wait: not emitted (sprite lifetime unmodelled) |
| Haze, player | 52 SE246 | -6 | status body (aud242a's -4 class); later SEs are the next round's declined bodies |
| Hyper Fang, player | 69 SE161 | +2 (idle lead 4) | SE_M_LEER 115 behind `waitbgfadeout` / `waitbgfadein`: not emitted; the IsContest / IsTargetPlayerSide branch resolves |

Five moves (Dragon Rage, Mega Punch, Hi Jump Kick, Haze, Hyper Fang), both sides for the first
three. Also measured and not pinned (their gated rows stay unresolved; use `tools/battle-lab/aud242b-*.json`
and the matching `APP_STAGES` entries to re-run): Hyper Beam, Aurora Beam, Thunder, Thunderbolt, Crunch, Icy Wind,
Mach Punch, Ice Beam, Shadow Ball, Flamethrower. Their ROM rows after a fade or an unmodelled sprite
are the work list of the next slice; Hyper Beam 247 and Aurora Beam 183 series are `createsoundtask`
(aud242c).

Fade timing is the main blocker. The three fade windows measured (Hyper Fang 39, Crunch 40, Mach Punch 38
frames from `fadetobg` to the next op, after subtracting the move's offset) differ by the 3-frame poll
quantisation of `waitbgfade*` (a failed poll waits 1 -> resumes 3 frames later) and by the move offset,
so a constant is not source-proven; a frame-level model of `Task_FadeToBg` + `UpdateHardwarePaletteFade`
(delay 0, 0 -> 16 out then 16 -> 0 in) is the next step.

**ISSUES #198 constant per-move offsets (analysis only).** ROM minus generic clock = `delta`. Moves
with an idle lead (`LIVE_MOVE_IDLE_LEAD_ROWS`): lead 4 -> +2 (Ember, Hyper Fang), lead 7 -> +3 (Dragon
Rage) / +2 (Acid, aud242a), lead 10 -> +10 (Twineedle), lead 13 -> 0 (Razor Leaf); lead 0 -> 0 for
the damaging bodies and -4..-6 for the status bodies (Agility -4, Swords Dance -4, Haze -6). The offset
is therefore not a function of the lead alone: for lead 4 and 7 it is about half the lead (the ROM
script starts at the gAnimScriptActive edge, the adapters' window starts `lead` rows later at the
visual onset, and the first rows of the script change nothing on screen), but the lead-10 / lead-13
rows break the pattern. No fix is source-proven; the aud242a fixtures stay as they are.

## 7. aud242c: background fades, pan changes, sound tasks (Scene ON)

Fixtures: `tools/audio/fixtures/aud242c-*.json` (step mode, 822 frames, **with the probe's call log** and the
replay trace), test `tests/aud242cMoveAnimSounds.test.ts`. Labs `tools/battle-lab/aud242b-*.json`, stages
`APP_STAGES["aud242b-*-on"]` (the three new labs: Mach Punch player, Flamethrower player, Hyper Beam opponent).

### 7.1 `waitbgfadein` / `waitbgfadeout` (commit 1)

The model is the source state machine, with no fitted constant (comments in
`tools/extract/extract-anim-sound-timing.ts`, `FADE_OUT_DONE` / `FADE_IN_DONE`). `Cmd_fadetobg` /
`Cmd_restorebg` create `Task_FadeToBg` (priority 5) at iteration F; per main-loop iteration the order is
CB1 (the script), CB2 (`UpdatePaletteFade`, then `RunTasks`), VBlank (`TransferPlttBuffer` ->
`UpdateBlendRegisters`):

| iteration | event |
|---|---|
| F | task state 0: `BeginHardwarePaletteFade(0xE8, 0, 0, 16, 0)` (delay 0, 0 -> 16) |
| F+1 .. F+16 | `UpdateHardwarePaletteFade`: one y step per iteration |
| F+17 | y = 17 > 16: finishing; VBlank clears `active` |
| F+18 | task state 1: `sAnimBackgroundFadeState = 2` |
| F+19 | CB1: `waitbgfadeout` passes; task state 2: `LoadMoveBg` / `LoadDefaultBg`, `BeginHardwarePaletteFade(.., 16, 0, 1)` |
| F+20 .. F+36 | y 15 -> 0, finishing |
| F+37 | task state 3: `DestroyTask`, state 0 |
| F+38 | CB1: `waitbgfadein` passes |

`waitbgfadein` / `waitbgfadeout` do not install `WaitAnimFrameCount`: a failed poll sets
`sAnimFramesToWait = 1` and the callback stays `RunAnimScriptCommand`, so they re-poll every iteration and
resume at `max(poll iteration, F+19 / F+38)`; there is no 3-frame quantisation (the doc's section 6 guess
is withdrawn). `waitbgfadeout` only passes while the state is 2 (F+19 .. F+37). A fade started inside a
running fade, or a `waitbgfadeout` outside that window, stays `unresolved("bg-fade")`.

The 38 / 39 / 40-frame measurements (Mach Punch / Hyper Fang / Crunch) are the F+38 base (Mach Punch:
exact, both sides) plus a per-background load lag: `LoadMoveBg` (LZDecompressVram of the tilemap and
image, `LoadCompressedPalette`) overruns VBlank, so one wall-clock frame passes without a main-loop
iteration. The overrun is data dependent (decompress cost), so `BG_LOAD_LAG` in the extractor is a
**measured table, not derived**: BG_IMPACT 1 (Hyper Fang's fade and Mega Punch's `changebg`: two moves
agree, which retires section 6's "+1 on SE123 unattributed"), BG_HIGHSPEED 0 (Mach Punch), BG_DARK 0
(Crunch; its remaining +2 is the aud242a lead-4 class, no opening SE exists to calibrate it). I could not
read the lag directly (the `Cmd_*` / `LoadMoveBg` entry hooks log nothing: static functions); the
`UpdatePaletteFade` gaps in the call log are consistent with it but were not matched row by row. Other
backgrounds count 0 (a residual, named); `restorebg`'s `LoadDefaultBg` overrun is not modelled.

Result: the extractor resolves the 134 bg-fade-gated ops that were unresolved (turn 0 / player: 562 ->
643 resolved ops). Fixtures: Mach Punch both sides frame-exact (117 / 125 opponent, 113 / 121 player; the
opponent window was silent before), Hyper Fang 115 SE192 now emitted (+2, same as the opening SE), Crunch
109 emitted (+2). Mega Punch SE123 moved from +1 to exact (closer to the ROM; aud242b spec `extra` removed).
Two later move bodies became audible and are named in the aud242a / aud242b specs (`rowDelta`): Seismic
Toss's opening SE238 after Swords Dance / Haze (+1 / +2 short of the ROM).

### 7.2 `panse` / `panse_adjustnone` / `panse_adjustall` / `setpan` (commit 2)

New sound-event kind `"pan"` (`src/audio/soundEvents.ts`): `SE12PanpotControl(pan)`, `id` null, `pan` the new m4a pan
(the probe already logged it as `pan`). Ported from `battle_anim.c` (`Cmd_setpan`, `Cmd_panse*`,
`Task_PanFromInitialToTarget`, `CalculatePanIncrement`) into the table (`target`, `inc`, `wait` = framesToWait) and
`moveAnimOpRows` in `src/engine/moveAnimSounds.ts`:

- the script step plays `PlaySE12WithPanning(song, currentPan)` (a plain SE row) and creates a priority 1 task; the task's first
  row runs in the **same iteration's** `RunTasks` (ROM: the SE row and the first `pan` row share a frame), then every
  `framesToWait + 1` iterations; it adds the increment, and on reaching the target (or at once for a zero increment) writes
  the target pan and ends. Per iteration the order is: script rows, then task rows in creation order (Metal Sound's four
  overlapping tasks, ROM-verified).
- `panse` runs both pans through `BattleAnimAdjustPanning` and the increment through `CalculatePanIncrement` (sign from
  the direction); `panse_adjustnone` uses all three raw; `panse_adjustall` runs all three through `BattleAnimAdjustPanning2`
  (an opponent attacker negates the increment too). `setpan` is one pan row, `BattleAnimAdjustPanning`.
- The sound task count only gates `Cmd_end` (`waitforvisualfinish` counts visual tasks alone), so no wait changes.
- noop rows: the ROM keeps calling `SE12PanpotControl` after the SE it pans has ended (Metal Sound: every row from frame 112);
  the probe flags those `noop` (m4a RAM unchanged). The engine does not model m4a state, so it emits the whole call
  stream while the live body runs and presentation ignores a pan with no SE playing. The test checks both halves: every
  effective ROM row is ours in order, every other row of ours is a ROM noop call.

Counts (turn 0, player attacker table): 20 ops newly emitted (18 `panse`, 2 `setpan`), each `panse` expanding to 1 SE row +
the task's pan rows (Flamethrower: 63 rows opponent / 64 player; in general `ceil(|target - start| / increment)`); 662 resolved ops in
total in that table. 7 of the 25 script
command sites stay unemitted: Icy Wind, Sing, Grass Whistle, Blizzard (`BlizzardContinue`), Powder Snow, Sunny Day (the only
`panse_adjustnone`) and Wish (the only `panse_adjustall`) sit behind a `waitforvisualfinish` on a sprite or visual task whose
lifetime is not modelled (aud242b `unmodelled-lifetime`; aud242d). The two adjust variants therefore have **no ROM window**; their
arithmetic is tested against hand-derived source values (`panse variants`), not the ROM.

ROM windows (`aud242c-*.json`, both sides): Flamethrower opponent + player (63 / 64 pan rows, frame-exact relative to the SE, +5 per-move
offset: its idle lead is unknown, `LIVE_MOVE_NO_PRE_ROW_SIDES`), Metal Sound opponent (4 overlapping tasks, 252 pan calls; -2, status
class; cut at ROM frame 121, where the ROM loses two wall-clock frames, noop rows), Sweet Scent player (`setpan` 0 at 94, 63 at 141; -3, status
class), Icy Wind opponent (opening SE; its `panse` after sprite waits is the gated ROM-only part).

### 7.3 `createsoundtask` and the `simple_palette_blend` lifetime (commit 3)

`Cmd_createsoundtask` (`battle_anim.c`) is `CreateTask(func, 1); func(taskId); gAnimSoundTaskCount++`: the task function runs once at
once, inside the script step, and from then on in `RunTasks` (the same iteration's, so the iteration of creation holds two
calls). It gates `Cmd_end` / `Cmd_waitsound` only. The script has **8 `createsoundtask` sites, in 8 moves**, and only two task
functions are used: `SoundTask_LoopSEAdjustPanning` (Ice Beam, Psybeam, Aurora Beam, Hyper Beam, Psywave, Tri Attack, Shadow Ball)
and `SoundTask_FireBlast` (Fire Blast). They are table ops `soundtask_loopse` / `soundtask_fireblast`
(`step`, `gap`, `times`, `id2` on top of the pan fields) and rows in `loopSeRows` / `fireBlastRows` of `src/engine/moveAnimSounds.ts`:

- LoopSEAdjustPanning(song, srcPan, tgtPan, panInc, plays r10, pan-step interval r7, play gap r9): the play counter starts at
  r9, so call 0 (the script step) plays at once; later plays every r9 + 1 calls. The pan steps by the increment every r7 + 1
  calls, **after** the play of that call (a play sees the steps of the calls before it); the call that plays the last SE destroys
  the task first. Call n >= 1 is `RunTasks` of iteration n - 1, so offsets are 0, r9, 2 r9 + 1, ... (Hyper Beam: 0, 5, 11, ... with
  pan +6 per row, ROM 174, 179 ...).
- FireBlast(loop SE, end SE): no immediate call, so call n runs in iteration n. Step1 (calls 0..109) plays the loop SE when
  its counter wraps (call 0, then every 11) at the current pan and adds the signed increment 2 every call; call 110 switches to
  Step2, whose counter plays the end SE at the target pan at calls 111 and 117, then ends. 10 + 2 SEs.
- `SoundTask_PlaySE1WithPanning` / `PlaySE2WithPanning` are **not** `createsoundtask` sites: the script spells them `createvisualtask`
  (47 sites of the 58 `createvisualtask SoundTask_*` lines: Cosmic Power, Dragon Claw, Encore, Flatter, Luster Purge, Superpower, the
  Return power labels, Sky Attack, ...). `Cmd_createvisualtask` runs the function at once and the task plays with
  `BattleAnimAdjustPanning(arg 1)` and `DestroyAnimVisualTask`s itself in that step, so they are table ops `soundtask_se1` / `soundtask_se2`
  (one se row, `player` "SE1" / "SE2") with lifetime "gone before any wait" in the extractor. Emitted in the turn 0 / player table:
  **5 ops** (Dragon Claw 2 of 2, Flatter 1 of 3, Cosmic Power 1 of 2, Superpower 1 of 1; resolved ops 734 -> 739). The other 42 sites
  (Luster Purge, Return, Sky Attack, Encore and the later sites of the moves above) sit behind sprite / visual-task waits (aud242b / aud242d).
  The cry tasks (`PlayCryHighPitch`, `PlayDoubleCry`, `CryWithEcho`, `WaitForCry`) and `AdjustPanningVar` (no sound) are not in this slice: a
  cry is a `cry` event of another class (species and pitch from the battler), not ported here.

`simple_palette_blend` (a `gSimplePaletteBlendSpriteTemplate` sprite) is what Hyper Beam and Ice Beam wait on before their sound
task, so this family needed its lifetime (`simplePaletteBlendLength` in the extractor, from `AnimSimplePaletteBlend` and
`palette.c` `BeginNormalPaletteFade` / `UpdateNormalPaletteFade`): `BeginNormalPaletteFade` runs in the sprite's first callback
(`AnimateSprites` precedes `UpdatePaletteFade` in `BattleMainCB2`) and updates once; each y step is two update calls (BG half, OBJ half)
plus `delay` waiting calls (a negative delay raises deltaY to 2 - delay instead); the pair whose y equals the target starts the
five-call finishing count, the fifth call clears `active`, the sprite's step destroys it in the next `AnimateSprites` and the
script's wait passes one iteration later. Hyper Beam (delay 4, 0 -> 16) is 55 ticks, Ice Beam's first blend (delay 1, 0 -> 7) 19 ticks. The
ROM confirms the model: Hyper Beam's opening SE_M_HYPER_BEAM and the whole SE247 series are frame-exact on both sides (delta 0),
which a wrong wait length would break (every later row shifts with it).

ROM windows (`aud242c-*.json`; each (frame, kind, id, pan) equal after a per-move constant, same rows and pans):
Hyper Beam player + opponent (SE215, SE247 x 15 with pan -64 -> 63 / 63 -> -64: **0**), Aurora Beam player (SE182 + SE183 x 6: +2),
Psybeam player (SE189 + SE200 x 4 at pans -64 / -16 / 32 / 63: +2), Ice Beam opponent (SE183 x 4: +1; its seven SE137 rows, ROM 176..212,
sit behind ice-crystal sprite waits: ROM-only), Fire Blast player (SE144 x 10 with pan -64 -> 63 in steps of 22, SE145 x 2: +2).
PlaySE1/2WithPanning: Dragon Claw opponent (SE150 + SE136 x 2 at pan -63: **0**), Superpower player (SE140 + SE234 at pan 0: +2), Flatter player (SE223: -3),
Cosmic Power player (SE243 x 2 at one frame, one of them the SE2 task: -5); each window cut where its later, gated rows begin. Both attacker
sides are covered across the families (Flamethrower, Hyper Beam, Metal Sound opponent; Mach Punch, Sweet Scent, Fire Blast player).
The +2 is the aud242a idle-lead class (ISSUES #198), Hyper Beam's 0 and Ice Beam's +1 are named per-move constants, not derived.
Shadow Ball's opponent-side lab never plays its animation SE in the ROM window (no SE168 in 822 frames: not diagnosed), so Shadow Ball,
Psywave and Tri Attack are table ops without a ROM window of their own (same task arithmetic).
aud242a's Psybeam row moved: its four SE200 rows used to be ROM-only and are now emitted frame-exact (+2), closer to the ROM.

Counts (turn 0, player attacker table): resolved ops 662 -> 734, unresolved 427 -> 363 over this commit (8 are the new task ops, the
other 64 were behind a `simple_palette_blend` wait; 721 ops in 294 variants over all turns / sides). All 8 task sites are emitted
on both sides. Remaining unresolved ops in the table: 347 `unmodelled-lifetime` (sprite / visual-task lifetimes: aud242b), 11 `waitsound`, 5
`unresolved-branch`. In the whole script 7 `panse*` sites and the PlaySE*WithPanning visual tasks stay silent for those reasons.

### 7.4 Acceptance receipt (aud242c)

Tested code: commit `b134ef8af9c1264b7309710848210432a5c7926b`, tree `68e51f33d45e81b552eb775e85294573a6fb09c4` (the later commit only adds this section).
Per `ANIMATION_VERIFICATION.md` production code changed (`src/engine/moveAnimSounds.ts`, `src/data/gen/anim-sound-timing.json`); the brief for this step excluded the full
`npm test`, so the scoped set ran instead:

- `npm run typecheck`: clean. `npm run build`: built. `npm run build:lib`: both configs built.
- `npm run test:gate`: 362 files, 2,835 tests passed.
- Every test importing a changed module (18 files incl. `aud242a/b/c`, `audioProbeFixtures`, `audioSinkNeutral`, `audioHeadlessBoundary`, `audioSinkPlumbing`,
  `audioAnimSoundPan`, `aud240*`, `aud241*`, `obr251OpponentPartySummary`, `frf250a/b`): 738 passed, 18 skipped (the skips are the probe-fixture tests that
  need a live oracle).
- `npm run compare:differential` vs the step's parent `11a497622`, 22 traces (8 Scene ON move-animation traces: `turn13-dragonbreath-faint`,
  `turn2-dragonbreath-projectiles`, `battle2-turn1-rockslide`, `turn13-sandattack`, `turn14-fly-miss`, `turn15-fly-strike`, `presentation-rng-playable-live-bodies{,-seeded}-on`;
  14 menu / battle-flow traces): **4,181 / 4,181 captures byte-identical** (1,432 + 2,749).
