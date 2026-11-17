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

Counts (turn 0, player attacker table): resolved ops 662 -> 734, unresolved 427 -> 373 over this commit (8 are the new task ops, the
other 64 were behind a `simple_palette_blend` wait; 721 ops in 294 variants over all turns / sides). All 8 task sites are emitted
on both sides. Remaining unresolved ops in the table: 357 `unmodelled-lifetime` (sprite / visual-task lifetimes: aud242b), 11 `waitsound`, 5
`unresolved-branch`. In the whole script 7 `panse*` sites and the PlaySE*WithPanning visual tasks stay silent for those reasons.

### 7.4 Acceptance receipt (aud242c)

Tested code: commit `6b71150f04028b2cf94140c6cb75b30afb565693`, tree `68e51f33d45e81b552eb775e85294573a6fb09c4` (the later commit only adds this section).
Per `ANIMATION_VERIFICATION.md` production code changed (`src/engine/moveAnimSounds.ts`, `src/data/gen/anim-sound-timing.json`); the brief for this step excluded the full
`npm test`, so the scoped set ran instead:

- `npm run typecheck`: clean. `npm run build`: built. `npm run build:lib`: both configs built.
- `npm run test:gate`: 362 files, 2,835 tests passed.
- Every test importing a changed module (18 files incl. `aud242a/b/c`, `audioProbeFixtures`, `audioSinkNeutral`, `audioHeadlessBoundary`, `audioSinkPlumbing`,
  `audioAnimSoundPan`, `aud240*`, `aud241*`, `obr251OpponentPartySummary`, `frf250a/b`): 738 passed, 18 skipped (the skips are the probe-fixture tests that
  need a live oracle).
- `npm run compare:differential` vs the step's parent `9bda7b916`, 22 traces (8 Scene ON move-animation traces: `turn13-dragonbreath-faint`,
  `turn2-dragonbreath-projectiles`, `battle2-turn1-rockslide`, `turn13-sandattack`, `turn14-fly-miss`, `turn15-fly-strike`, `presentation-rng-playable-live-bodies{,-seeded}-on`;
  14 menu / battle-flow traces): **4,181 / 4,181 captures byte-identical** (1,432 + 2,749).

## 8. aud242d: instant tasks and the palette-family lifetimes (Scene ON)

Fixtures: `tools/audio/fixtures/aud242d-*.json` (step mode, 822 frames, call log **plus the `BlendPalette` hook**: `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`
in `tools/audio/soundEventProbe.py` logs every `BlendPalette(offset, count, y, color)` call with r0..r3, which gives the exact blend schedule of a palette task),
test `tests/aud242dMoveAnimSounds.test.ts`. New labs `tools/battle-lab/aud242b-{hail,sunnyday,doubleedge,calmmind,metalclaw,steelwing}-player-on.json`, stages
`APP_STAGES["aud242b-*-on"]`; Thunderbolt / Icy Wind reuse the aud242b labs.

### 8.1 Audited instant visual-task table

`Cmd_createvisualtask` runs `taskFunc(taskId)` before `gAnimVisualTaskCount++` (battle_anim.c:437-439) and `DestroyAnimVisualTask` decrements it
(:274-277), so an entry function that is straight-line code ending in `DestroyAnimVisualTask(taskId)` nets 0 in the creating step: a following
`waitforvisualfinish` never waits for it (lifetime `{exact: -1}`). Sprites such a task makes through `CreateSprite` / `CreateTask` are not counted by the
script's counter. The table in the extractor (`INSTANT_STRAIGHT_LINE`, 42 names; `INSTANT_HAND_AUDITED`, 11 names read by hand, some with an if / else that
destroys in both arms) is **re-checked mechanically at extraction** (`auditInstantTasks`: the C body has no `return`, no `func =` assignment, and one trailing
destroy; the strict list also has no loop, `gTasks` state, `Random` or `CreateTask`); a task that fails the audit stops the extractor. Anything not provably
instant stays out (e.g. every task that sets `gTasks[].func`). Result: Level-50 emitted ops 550 -> 563 (all moves, turn 0, player: 739 -> 752 resolved).

### 8.2 `AnimTask_BlendBattleAnimPal` / `...Exclude` / `AnimTask_BlendParticle`

battle_anim_utility_funcs.c:156-198 (`StartBlendAnimSpriteColor`, `AnimTask_BlendSpriteColor_Step2`): the task blends when `data[9] == delay`, counting
`data[9]` up otherwise, steps y by one toward the target and destroys itself in the call whose y equals the target (after that call's blend). Call 0 is the script
step, call k >= 1 is `RunTasks` of iteration F + k - 1; blends are at calls d, 2d + 1, ..., the last at call d + |D|(d + 1). The task is gone **d + |D|(d + 1) - 1**
ticks after the creation tick (`blendAnimPalLength`). The scout's `|D|(d + 1) - 1` is wrong for d > 0 (it is the same for d = 0: that is why Thunderbolt's d = 0
matched first).

ROM check (the `BlendPalette` call log, independent of any per-move offset: the wait resumes the iteration after the last blend):

| window | blends (palette 16) | formula | next SE |
|---|---|---|---|
| Thunderbolt (d 0, y 0 -> 6) | frames 76..81 | last blend = F + 5 | SE118 at 94 = 81 + 1 + 12 (`delay 10`) |
| Hail (d 3, 0 -> 6) | 62, 66, ..., 86 (every 4) | first blend F + 2 (F = 60), last F + 26 | SE242 at 87 = 86 + 1 |
| Sunny Day (d 1, 0 -> 6) | 65, 67, ..., 77 | F = 65, last F + 12 | SE202 at 78 = 77 + 1 |
| Calm Mind (Exclude, d 0, 0 -> 16) | 64..79 | last F + 15 | SE184 at 80 = 79 + 1 |

Result: Level-50 563 -> 583. The engine's emitted frames equal the ROM's at a named constant per move (Thunderbolt +2 with Icy Wind, Double-Edge, Metal Claw and Steel Wing: the
aud242a idle-lead class; the status bodies Hail -4, Sunny Day -4, Calm Mind -5: aud242a's status class -4..-6; ISSUES #198), asserted by the test.

### 8.3 `complex_palette_blend` (`gComplexPaletteBlendSpriteTemplate`)

battle_anim_normal.c:344-398. The sprite's init callback blends y1 in the script step and `Step1` runs from the same iteration's `AnimateSprites`: `delay` countdown calls
(F .. F + d - 1), a blend at F + d (y2 first, then y1, ...), the timer reloads to `delay`, so blends are d + 1 iterations apart; after `numBlends` blends one more countdown, a call
moving to `Step2`, and `Step2` (when `gPaletteFade.active` is clear) blends 0 / 0 and destroys the sprite: gone **(n + 1)(d + 1)** ticks after F. ROM: Double-Edge (d 4, n 2)
logs `BlendPalette` at 70 (init), 74, 79, 85: 15 ticks; the next SE (after `delay 10`) is at 98 = 85 + 1 + 12, and the engine's pair 68 -> 96 has the same 28-frame spacing
(+2 on all three rows, plus SE_M_SWAGGER's second row at +8). The model does not track a concurrent `gPaletteFade.active` (a hardware / normal fade running at the same time would
stall `Step1`); I did not check the 30 table sites for that overlap.

### 8.4 `metallic_shine` (`AnimTask_MetallicShine`, battle_anim_dark.c:822-882 init, :896-935 step)

The step adds 4 to `data[10]` per call and wraps every 128 (32 calls); the third wrap (96 calls) destroys the task: gone **95** ticks after the creation tick
(`METALLIC_SHINE_LENGTH`). Its init decompresses a tilemap, an image and a palette in the creating step: the ROM loses wall-clock frames there (a VBlank overrun, like `BG_LOAD_LAG`).
Measured on two moves that agree (Metal Claw, Steel Wing): **4** wall frames between the creation step and the first op after the wait (`METALLIC_SHINE_LOAD_LAG`); 2 of them are
localised, because `loopsewithpan SE_M_HARDEN, ..., 28, 2` is a `Task_LoopAndPlaySE` call counter (iterations) and its second SE is 2 wall frames late (ROM 69 -> 99, engine 67 -> 95
at +28); the other 2 are not (somewhere in the 96-call shine or its destroy, which clears the BG tilemap). The model shifts every later op by 4, so the loop's second SE is the
named residual (+2, `extra` in the test). Metal Claw: SE120 x 2 then SE136 x 2 (ROM 173 / 187); Steel Wing: SE120 x 2, SE157 x 2 (175 / 195), SE136 (220), all +2 once the shine
is accounted for.

### 8.5 Counts (turn 0, player attacker)

| step | Level-50 emitted / gated (276 moves) | all moves resolved / unresolved | variants / ops |
|---|---|---|---|
| 8fd959d32 (before) | 550 / 284 | 739 / 373 | 295 / 726 |
| instant-task table | 563 | 752 | |
| BlendBattleAnimPal / Exclude / BlendParticle | 583 | 774 | 312 / 765 |
| complex_palette_blend + metallic_shine | **592 / 242** | **783 / 329** | **314 / 776** |

Gain +42 Level-50 ops against the scout's ~+45 (the `blend_color_cycle` and `HardwarePaletteFade` shares are not in it, see below).

### 8.6 Residuals and what is not done

- **Thunderbolt**: SE215 (ROM 172) and SE119 (239, 258) need `AnimTask_ElectricBolt` (a task with sprite-driven lifetime, aud242e): ROM-only rows in the test.
  After the third `playsewithpan` the ROM's SE215 lands one frame later than the delay arithmetic predicts (171 vs 172); not diagnosed (its wait is unmodelled anyway).
- **Double-Edge**: SE141 (ROM 136) sits behind `AnimTask_TranslateMonEllipticalRespectSide` (task lifetime, aud242e): ROM-only.
- **Sunny Day** / **Hail**: the ROM rows after the window cut (Sunny Day SE202 at 763; Hail SE242 x 7 at 767..821, 9 frames apart) are not emitted and not diagnosed (the cut of the
  test is the next move's body at 380 / 390 for Hail / Sunny Day).
- **Not ported** (no source-proven, ROM-checked lifetime yet): `AnimTask_BlendColorCycle` (`BeginNormalPaletteFade` chains: the task polls `gPaletteFade.active` once per iteration, so each
  fade's tail interleaves with the task's own call order and needs its own ROM windows) and `AnimTask_HardwarePaletteFade`. Both stay `unmodelled-lifetime`.
- A live adapter is not whole-playable arbitrary-history exactness: the windows pin the move body inside the replay staged by each lab.


## 9. aud242e: fixed-length sprite and mon-task lifetimes (Scene ON)

Fixtures: `tools/audio/fixtures/aud242e-*.json` (15 moves, player attacker, Level 50, 822 frames, step mode with the call log and `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`),
cut by `tools/audio/soundEventProbe.py ... lab LAB.json --frames 822 --profile on` over labs `tools/battle-lab/aud242e-*-player-on.json` (made by `tools/audio/makeAud242bLabs.py`,
prefix via `AUD242_LAB_PREFIX`) and stages `aud242e-*-player-on` in `tools/compare/appTrace.ts`. Test `tests/aud242eMoveAnimSounds.test.ts`; the fixtures are also listed in
`tests/audioProbeFixtures.test.ts`. Every lifetime below is read from the C step code; the ported reducers were only a cross-check.

### 9.1 The lifetime model

`exact` is the number of ticks after the creation tick at which the thing is gone (the wait resumes at `max(at + exact) + 1`). Call numbering: a script `createsprite` runs
`CreateSpriteAndAnimate` (sprite.c:591-616), so the sprite's callback call 0 and the first `AnimateSprite` happen in the script step; call k >= 1 is the `AnimateSprites` of
iteration F + k - 1. A sprite that destroys itself at callback call K is gone **K - 1** ticks after F. A task entry is call 0 of the script step; call k >= 1 is `RunTasks` of
iteration F + k - 1 (script CB1 first). Sprites that a task makes with `CreateSprite` / `CreateTask` are not counted by `gAnimVisualTaskCount`, so only the task's own life gates the wait.

| op | exact | C source |
|---|---|---|
| `gToxicBubbleSpriteTemplate` | 20 | `AnimSpriteOnMonPos` battle_anim_mons.c:1515-1536, then `animEnded` of `sAnim_ToxicBubble` battle_anim_poison.c:16-23 (4 frames x 5) |
| `gFangSpriteTemplate` | 32 | `AnimFang` battle_anim_effects_3.c:1515-1519, `gFangAnimCmds` :321-328 (8 + 16 + 4 + 4) |
| `gSludgeProjectileSpriteTemplate` (args[5]), `gWaterGunProjectileSpriteTemplate` (args[7]), `gWaterPulseRingSpriteTemplate` (args[5]) | D (the arc duration) | `InitAnimArcTranslation` + `TranslateAnimHorizontalArc` battle_anim_mons.c:785-801, `AnimTranslateLinear` :1111; data[0] = D, D translating calls, call D + 1 destroys; ring `AnimWaterPulseRing_Step` battle_anim_water.c:1541-1556 |
| `gWaterPulseBubbleSpriteTemplate` | args[8] - 1 | `AnimWaterPulseBubble_Step` battle_anim_water.c:1508-1516 (`--data[3] == 0` at call A8) |
| `create_absorption_orb_sprite` | `wave_period` | the orb's wave counter step (period = `wave_period`; proven by the Giga Drain / Mega Drain / Absorb ROM windows, not re-cited line by line) |
| `create_overheat_flame_sprite` | `duration` | `AnimOverheatFlame_Step` battle_anim_dragon.c:443-452 (`++data[0] > duration` at call duration + 1) |
| `gHorizontalLungeSpriteTemplate` | 2 * args[3] + 3 | `DoHorizontalLunge` / `ReverseHorizontalLungeDirection` battle_anim_mon_movement.c:427-445, battle_anim_mons.c:651-663 (N translating calls, a swap call, the reverse call, N calls, a swap call, destroy at 2N + 4) |
| `shake_battle_platforms` / `AnimTask_ShakeBattlePlatforms` | shakes * (delay + 1) - 2 | battle_anim_normal.c:957-993: the entry runs the step once; a shake takes delay + 1 calls; the call index shakes * (delay + 1) - 1 destroys |
| `AnimTask_TranslateMonElliptical` / `...RespectSide` | calls - 2 | battle_anim_mon_movement.c:358-402: the entry runs the step once; `data[5]` += `1 << min(speed, 5)` per call (wraps at 256), `loops` decrements on every wrap to 0, that call destroys; simulated in the extractor |
| `AnimTask_ElectricBolt` | 10 | battle_anim_electric.c:685-724: the entry only sets `func`; `data[10]` counts calls 1.. and call 11 destroys; the five segment sprites are `CreateSprite`'d by the task |

Correction to section 7.3 (found by two independent ROM logs, Overheat's and Double-Edge's `BlendPalette` calls): a `simple_palette_blend` (palette.c `BeginNormalPaletteFade` /
`UpdateNormalPaletteFade`) runs update call 1 in the script step and call 2 in the same iteration's CB2, so call n is iteration F + n - 2; the sprite is destroyed at F + n - 1 and
the wait passes at F + n: **exact = n - 1** (the old model used n). `simplePaletteBlendLength` now returns `calls + 4`. This moves Hyper Beam by +1 (`aud242c` delta 0 -> +1, both attackers)
and Ice Beam into the +2 idle-lead class (delta 1 -> 2); the aud242c test specs say so.

### 9.2 ROM windows (ROM minus ours, constant over every row of a window)

| window | delta | rows | note |
|---|---|---|---|
| Toxic | +3 | 14 | window cut at ROM 280 (the opponent's body) |
| Rock Tomb | +2 | 5 | proves the platform shake `shakes * (delay + 1) - 2` (the scout's "one call earlier" is not supported) |
| Overheat | +2 | 2 + 4 | the four SE147 flame rows carry a named +3 (below) |
| Counter | -16 | 5 | Counter is used second; the ROM's opponent body (SE214 / SE131) is ROM-only; the relative SE122 -> SE123 gap of 21 proves the elliptical (loops 1, exact 14) |
| Giga Drain / Mega Drain / Absorb | -1 | 10 / 10 / 11 | absorb moves start 1 frame before ours |
| Thunderbolt | +2 | 4 | SE215 (ROM 172) carries a named +1; SE119 (239, 258) ROM-only |
| Sludge / Poison Fang / Water Pulse / Rolling Kick / Double-Edge | +2 | all | Double-Edge's SE141 (ROM 136) is now emitted: the elliptical (loops 2, exact 30) created at 98 resumes the script at 129, where the ROM's BG `BlendPalette` starts (test) |
| Water Gun | 0 | 4 | |
| Poison Tail | +2 | 9 | later rows carry a named +2 (below) |

### 9.3 Counts (turn 0, player attacker)

| step | Level-50 emitted / gated (276 moves) | all moves resolved / unresolved | variants / ops |
|---|---|---|---|
| aud242d | 592 / 242 | 783 / 329 | 314 / 776 |
| **aud242e** | **640 / 194** | **833 / 279** | **315 / 826** |

+48 Level-50 ops against the scout's estimate. Remaining unresolved reasons: `unmodelled-lifetime` 262, `waitsound` 11, `unresolved-branch` 6.
The largest remaining blockers are the hyper beam orb (52), Hydro Pump orb (44), Fire Spin (42), aurora ring (40), air wave (40), power absorption orb (35) and
`blend_color_cycle` (32). Moves whose rows did not change: Quick Attack, Agility, Iron Tail, Metal Claw, Brick Break, Knock Off (blocked by another unmodelled lifetime).

### 9.4 Residuals (named, not hidden)

- **Overheat flame**: the four SE147 rows land 3 frames later in the ROM than modelled (ROM 170, 178, 188, 198 vs ours 165, 173, 183, 193 plus the +2). The creation step makes eight flame
  sprites; a VBlank-overrun (like `BG_LOAD_LAG`) is the hypothesis (Thunderbolt's nine-sprite step shows +1), but the flame lifetime itself was not independently proven. Named `extra` +3.
- **Poison Tail**: the first SE120 / SE123 / first SE148 are +2, the later SE148 x 5 and the second SE120 are +4. Undiagnosed; named `extra` +2 on those rows. Order and count are exact.
- **Thunderbolt** SE215: ROM 172 against 171 from the delay arithmetic (aud242d note); the same one-frame lag appears after a nine-sprite creation step. SE119 x 2 (239, 258) stay behind `ElectricityEffect` waits (ROM-only).
- **Counter**: the opponent's body before ours (SE214 at ROM 221, SE131 at 239) is ROM-only; our body starts 16 frames after the ROM's (turn-order offset of the live adapter, ISSUES #198 class).
- Not done (out of scope): `blend_color_cycle` / `HardwarePaletteFade`, cry tasks, the waitsound SE-length table, the census column (aud243).

### 9.5 Acceptance receipt (aud242e)

- `npm run extract:anim-sound-timing` regenerates the committed table byte-identically (`cmp` of the committed file against the regenerated one: identical).
- `npm run typecheck`, `npm run build`, `npm run build:lib`: each exit 0 (separate commands).
- `npm run test:gate`: 362 files, 2,835 tests passed. aud24* + audio* + frf250* + obr251* in one vitest call: 21 files, 896 passed, 18 skipped (probe tests that need a live oracle).
- `npm run compare:differential` over the 15 aud242e Scene ON move traces (97 captures each, frames 60..821 step 8; every one has changed table rows) against `494e7a213` plus the
  aud242e stage definitions only (so the base can build the new stages): **1,455 / 1,455 captures byte-identical, 0 pixel diffs**.

## 10. aud242f: BowMon / HornHit, Ice Beam / Ice Punch crystals, fist sprite, mon scale / grow tasks (Scene ON)

aud242f models the next lifetimes in `tools/extract/extract-anim-sound-timing.ts` (`lifetimeOf`, the `aud242f` block). Same call numbering as section 9.1 (sprite call 0 = the script-step
init, call k >= 1 = AnimateSprites of iteration F + k - 1; destroyed at call K = gone K - 1 ticks after F; task entry call 0 = script step, step call k = RunTasks of iteration F + k - 1).

### 10.1 Re-rank (L50 scope = `factory-animation-inventory.json`, turn 0, player attacker)

The aud242e headline blockers (Overheat flame, elliptical mon task, ...) have 0 gated L50 ops. The real L50 blockers, by gated ops behind each lifetime (`.integration/evidence/aud242f/rank.txt`):
Horn Drill (BowMon, 12 ops), Headbutt / Horn Attack / Drill Peck (BowMon, 1 each), Blizzard (11), Tri Attack (9), Ice Punch (7), Ice Beam, Bubblebeam, Luster Purge, Extremespeed, Psychic, Curse (4), Swagger (3), Spark, Attract, Growth.

### 10.2 Lifetimes derived (C step code; citations are also in the extractor comments)

| lifetime | C | exact (ticks after F) | ops freed (L50) |
|---|---|---|---|
| `gBowMonSpriteTemplate` (AnimBowMon, arg 0 = kind) | battle_anim_effects_1.c:4400-4496 | kind 0 / 2: 12, kind 1: 6, other: 0 | Horn Drill (12 gated ops), Headbutt, Horn Attack, Drill Peck (1 each) |
| `gHornHitSpriteTemplate` (AnimHornHit) | battle_anim_effects_1.c:5108-5163 | clamp(duration, 2, 127) - 1 | none yet (Fury Attack stays gated by `AnimTask_RotateMonSpriteToSide`); modelled because the C is fixed-length |
| Ice Beam outer / inner crystal (AnimIceBeamParticle) | battle_anim_ice.c:610-624, battle_anim_mons.c:1093-1145 | D + 1 | Ice Beam (7 SE137 rows) |
| `gIceCrystalSpiralInwardSmall` / `Large` (AnimIcePunchSwirlingParticle) | battle_anim_ice.c:592-602, battle_anim_mons.c:468-486 | 30 | Ice Punch |
| fist / foot sprite (`create_fist_sprite`, `gFistFootSpriteTemplate`, AnimBasicFistOrFoot) | battle_anim_fight.c:452-464, battle_anim_mons.c:551-557 | duration + 1 | Ice Punch, the fist family |
| `AnimTask_ScaleMonAndRestore` | battle_anim_mon_movement.c:823-865 | 2 * duration - 1 (duration = script args[4]; args[1] is the priority) | Hidden Power (+2 ops; Growth / Bind etc. are still gated by other waits) |
| `AnimTask_GrowAndShrink` (affine frames 12 + 24 + 12, END on call 49) | battle_anim_effects_2.c:543-549, 2235-2248, battle_anim_mons.c:1787-1862 | 48 | Swagger, Bulk Up |
| `gBreathPuffSpriteTemplate` (AnimBreathPuff, data[0] = 52) | battle_anim_effects_2.c:2250-2272, battle_anim_mons.c:607-621 | 53 | Swagger, Bulk Up |

### 10.3 ROM windows (probe STEP mode, call log + BlendPalette hook; ROM minus ours, constant over every row)

Fixtures `tools/audio/fixtures/aud242f-*.json`, labs `tools/battle-lab/aud242f-*.json`, stages `aud242f-<move>-player-on`, test `tests/aud242fMoveAnimSounds.test.ts`.

| window | delta | notes |
|---|---|---|
| Horn Drill | 0 | frame-exact (same class as Water Gun) |
| Headbutt | +2 | idle-lead class; cut at ROM frame 120 (the next move's body) |
| Ice Punch | +2 | every row of the window |
| Ice Beam | +2 | the seven SE137 rows (ROM 176..212 in aud242c's opponent window) now match too |
| Hidden Power | +2 | three rows: pins ScaleMonAndRestore (exact 21 before the 30-frame delay) |
| Swagger | -3 | status class; five rows incl. the GrowAndShrink (48) and BreathPuff (53) waits; the twelve later SE176 rows are the next move's body (cut at 300) |
| Growth | -4 | first SE152 only; the second SE152 (ROM 90) stays ROM-only behind `blend_color_cycle` |

Re-pin of an older window: `tests/aud242cMoveAnimSounds.test.ts` `icebeam-opponent` listed the seven SE137 rows (ROM 176, 182, ..., 212) as ROM-only; the ROM log has them
and the model now emits them at the same +2 as the rest of the window, so the `romOnly` list was removed (no frame changed; rows were added). No other aud242* window changes.

### 10.4 Counts (turn 0, player attacker)

| | before (`15f3bab4d`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 833 / 279 | 868 / 244 |
| L50 (276 moves): emitted / gated | 640 / 194 | 674 / 160 |
| table: distinct variants / ops | 315 / 826 | 317 / 863 |

Moves whose rows changed: Ice Punch, Headbutt, Horn Attack, Horn Drill, Ice Beam, Drill Peck, Swagger, Hidden Power, Bulk Up (all 12 variants each).

### 10.5 Residuals and what is not done

- **Blizzard (11 ops), Tri Attack (9), Bubblebeam, Luster Purge, Extremespeed, Psychic, Curse, Spark, Attract, Growth's blend_color_cycle** stay unresolved. Blizzard's snowball /
  crystal lifetimes (AnimSwirlingSnowball, AnimMoveParticleBeyondTarget, battle_anim_ice.c:666-830) end when the sprite leaves the screen along a fixed-point line whose slope
  depends on `BATTLER_COORD_Y_PIC_OFFSET` of the attacker and target species, so the lifetime is per-species and not a per-move constant; it needs a species-aware table
  (not a table row) and is left for a later slice.
- Hidden Power uses the move-id script (type-independent); the three rows are pinned by the one window.
- Growth, Swagger delta are the -4 / -3 status class (ISSUES #198), unchanged by this slice.

## 11. aud242g: Psychic background, Tri Attack triangle, Bubblebeam bubbles / SwayMon, Thunderbolt electricity sprites (Scene ON)

Seventh slice of the move-animation SE lifetimes (`tools/extract/extract-anim-sound-timing.ts`, `lifetimeOf`). The same call numbering as sections 8-10: call 0 is the
creation in the script step, call k >= 1 is iteration F + k - 1; a thing destroyed at call K is gone K - 1 ticks after F; `waitforvisualfinish` resumes at max(F + exact) + 1.
Every lifetime below is derived from the C; the only measured constant in the slice is the BG load lag (the existing `BG_LOAD_LAG` method), which turned out to be 0 for BG_PSYCHIC.

### 11.1 Lifetimes derived

| lifetime | C | exact (ticks after F) | ops freed (L50) |
|---|---|---|---|
| `AnimTask_SetPsychicBackground` (instant: sets the BG, destroys itself in the entry) | battle_anim_effects_3.c:1372-1376 | -1 | Dream Eater +9 |
| `gTriAttackTriangleSpriteTemplate` (AnimTriAttackTriangle) | battle_anim_effects_3.c:2015-2046, battle_anim_mons.c:1093-1101, 1111-1146 | 81 | Tri Attack +1 (`gLargeFlameScatterSpriteTemplate` and `AnimTask_ShakeTargetInPattern` still gate the rest) |
| `gWaterBubbleProjectileSpriteTemplate` (arg 6 = D) | battle_anim_water.c:529-607, :101-107 | D + 23 (73 for Bubblebeam) | Bubblebeam |
| `AnimTask_SwayMon` (simulated: index += period, half-wave crossings counted) | battle_anim_mon_movement.c:751-815 | call K - 1 of the simulated crossing | Bubblebeam |
| `gThunderboltOrbSpriteTemplate` (AnimThunderboltOrb, d = arg 0) | battle_anim_electric.c:605-627 | max(d, 0) (44) | Thunderbolt +2 (the two SE_M_THUNDERBOLT2 rows) |
| `gSparkElectricityFlashingSpriteTemplate` (the init runs the step in call 0; d = arg 3) | battle_anim_electric.c:629-666 | max(d, 0) - 1 (43) | none yet (Spark ends in an unmodelled `ElectricityEffect` wait); modelled because the C is fixed-length |

### 11.2 ROM windows (probe STEP mode with the call log and `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`; ROM minus ours)

Fixtures `tools/audio/fixtures/aud242g-*.json`, labs `tools/battle-lab/aud242g-*.json` (Bubblebeam reuses `aud242f-bubblebeam-player-on.json`), stages `aud242g-*-player-on`,
test `tests/aud242gMoveAnimSounds.test.ts`. Recipe: `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette python3 tools/run-mgba-probe.py --rm-log-on-success OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json lab <lab>.json --frames N --profile on --compact`.

| window | delta | notes |
|---|---|---|
| Dream Eater | +1 | two-turn lab (Spore, then Dream Eater: the move fails on an awake target and the ROM plays no animation); window from ROM 700; Spore's SE169 rows are frame-exact (delta 0); BG_PSYCHIC load lag 0 |
| Tri Attack | +2 | the 81-tick triangle is also confirmed by the ROM's BlendPalette log (first call at ROM 151 = 69 + 82); the ROM-only rows are behind the still-gated flame scatter / shake |
| Bubblebeam | +2 | 24 rows; the SE126 rows (ROM 237..277) keep the +2 of the first rows, which confirms both the 73 and 85 lifetimes |
| Thunderbolt | +2, +1 named extra on the three rows after the nine-sprite step | the ROM-only rows 239 / 258 (aud242d / e) are now emitted at the same constant as the SE_M_HYPER_BEAM row |

Re-pin of older windows: `tests/aud242dMoveAnimSounds.test.ts` and `aud242eMoveAnimSounds.test.ts` `thunderbolt-player` listed `239:119:63` / `258:119:63` as ROM-only; the model now emits
them (ours 236 / 255, ROM minus ours 3 = the +2 class plus the named +1) so the `romOnly` entry became two `extra` entries. No frame of an existing row changed.

### 11.3 Counts (turn 0, player attacker)

| | before (`09ea8b3a7`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 868 / 244 | 894 / 218 |
| L50 (276 moves): emitted / gated | 674 / 160 | 692 / 142 |

### 11.4 Residuals

- Not done (out of scope): Blizzard, cry tasks, the waitsound SE-length table, unresolved branches, `ElectricityEffect` (Thunderbolt / Spark tails), `blend_color_cycle`.
- The per-window offsets (+2 idle-lead, +1 / +3 named extras) are recorded, not fixed (ISSUES #198).
- A live adapter is not whole-playable arbitrary-history exactness: the windows pin the move body inside the replay staged by each lab.

### 11.5 Acceptance receipt (aud242g)

Tested code commit `470c0b94e` (tree `HEAD^{tree}` at that commit; the later commits of this slice touch only docs).

- `npm run extract:anim-sound-timing` run twice: byte-identical (sha256 `6cd5bdd2...1039f35`), equal to the committed table.
- `npm run typecheck`, `npm run build`, `npm run build:lib`: each exit 0. `npm run test:gate`: 362 files, 2,835 tests passed. `tests/aud24*.test.ts` + `tests/audio*.test.ts` (incl. audioSinkNeutral): 20 files, 935 passed, 18 skipped (live-oracle probe tests).
- `npm run compare:differential` (`--harness-from-head`, base `09ea8b3a7`) over 10 Scene ON move traces (aud242g Dream Eater / Tri Attack / Bubblebeam, aud242e Thunderbolt, aud242f Psychic / Swagger / Ice Beam / Growth / Luster Purge / Curse; frames 60..821 step 8, Dream Eater 60..1519): **1,047 / 1,047 captures byte-identical**.
- ENGINE_BUILD (headless graph; the table is in it): `eb-01603ce9f24e6eec` (`09ea8b3a7`) -> `eb-52789eb6d9c84998`.
- Census (`LSD194_SHARDS=0`, seeds 0..99 Scene ON, `soundCensusDelta.py --t1`) vs the aud243a arm `on-858ea0343` shard r0: exact 24,430 -> 24,616 (+186), missing-other 237 -> 51 (the 186 `inside the command` rows are gone: Bubble Beam 78, Thunderbolt 56, Dream Eater 27, Curse 22, Tri Attack 3), missing-gated 1,052 -> 1,052 (unchanged), missing-cry-task 16, extra 0, unclassified 0.

## 12. aud242h: `blend_color_cycle`, Shadow Ball ball, vertical dip (Scene ON)

Ranked by T1 census weight (`missing-gated`, seeds 0..99 Scene ON). Port the `AnimTask_BlendColorCycle` lifetime and two sprite lifetimes; Sludge Bomb (198 gated ops, the top blocker) stays open (see 12.4).

### 12.1 Lifetimes derived (C; also cited in the extractor)

| lifetime | C | exact (ticks after F) |
|---|---|---|
| `blend_color_cycle` / `_exclude` / `_bytag`, `AnimTask_BlendColorCycle*` | `battle_anim_normal.c:447-560` (task: n fades, fade 1 `0 -> targetY`, then alternating `targetY <-> initialY`, last fade back to 0), `palette.c:114-200, 406-520` (a fade costs 2 calls per y value + `delay` waits + 5 finishing calls; a negative delay raises deltaY to `2 - delay`), `battle_main.c:1863-1869` | `blendColorCycleLength(delay, numBlends, initialY, targetY)`: sum over fades of `fadeCalls - 2` (first) / `- 1` (rest) |
| `gShadowBallSpriteTemplate` | `battle_anim_ghost.c:400-458`: init, then `AnimShadowBall_Step` cases 0 / 1 / 2 take `max(a0,1)` / `max(a1,1)` / `max(a2,1)` calls, case 3 destroys | `a0 + a1 + a2` (a0 or a2 < 1 divides by zero: declined) |
| `gVerticalDipSpriteTemplate` | `battle_anim_mon_movement.c:451-471` + `battle_anim_mons.c:651-663`: D translating calls, set-callback call, Reverse call, D calls, set-callback call, destroy | `2D + 3` |

`gPaletteFade` is shared and `BeginNormalPaletteFade` returns FALSE while a fade is active, so a `blend_color_cycle` that overlaps another running fade (an earlier fade that has not finished, or a `fadetobg` still inside its fade-in) is left gated (`fadeBusy` in `walk`).

### 12.2 ROM windows (probe step mode, `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`, Scene ON, player attacker)

Fixtures `tools/audio/fixtures/aud242h-{psychic,bodyslam}-player.json` (+ the existing `aud242f-growth-player.json`), labs `aud242f-psychic-player-on.json`, `aud242h-bodyslam-player-on.json` (stage in `appTrace.ts`), test `tests/aud242hMoveAnimSounds.test.ts` (Growth is pinned in `aud242fMoveAnimSounds.test.ts`).

| window | rows | ROM minus ours |
|---|---|---|
| Psychic | SE184 x3 (ROM 132 / 142 / 153; the `loopsewithpan` behind `blend_color_cycle`); BlendPalette log y 0..8..0 matches the model | +2 (idle-lead class) |
| Growth | second SE152 (ROM 90; was ROM-only) | -4 (the existing Growth status class, same as its first row) |
| Body Slam | SE152, then SE141 x2 (ROM 108 / 118) behind the vertical-dip wait | +2 |

Shadow Ball has no ROM window: the harness stages Rattata vs Rattata and Ghost into Normal has no effect (no animation plays), so the ball lifetime is C-derived only.

### 12.3 Counts (turn 0, player attacker)

| | before (`f205895b4`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 894 / 218 | 899 / 213 |
| L50 (276 moves): emitted / gated | 692 / 142 | 697 / 137 |

Census T1 (seeds 0..99 Scene ON, arm baseline `on-f205895b4`, the old table read against the new arm for the "before"): exact 23,547 -> 23,795, missing-gated 1,066 -> 950, missing-other 51 -> 51, extra 0, unclassified 11,093 -> 11,093 (unchanged: SEs outside any move window, i.e. stat-change / status / held-item SEs, a tooling gap that predates this step). Census `commands` / `eventsDigest` identical on 100 / 100 seeds (`rst197CensusDelta.py`).

### 12.4 Residuals

- Sludge Bomb (198), Blizzard (88), Faint Attack (62), Confuse Ray (47), Dig (37), Spark (32), Struggle (30), Attract (28) remain the top gated census moves. Sludge Bomb needs the SE-length table (`waitsound` must keep `pending`, `Cmd_waitsound` `battle_anim.c:1635-1658`), the hit-particle and poison-bubble lifetimes; Blizzard needs a target-species resolver.
- Faint Attack needs `AnimTask_SetAttackerInvisibleWaitForSignal`; Struggle `gMovementWavesSpriteTemplate`; Shadow Ball a Ghost-able target in the harness for a ROM window.
- Per-window offsets are recorded, not fixed (ISSUES #198).

### 12.5 Acceptance receipt (aud242h)

Tested code commit `dbc3f7178` (later commits are docs only).

- `npm run typecheck`, `npm run build`, `npm run build:lib`: each exit 0. `npm run test:gate`: 362 files, 2,843 passed. aud24x / aud25x / moveAnimSounds / tickSounds importer tests: 26 files, 282 passed. `npm test` run as shards 1-6 of 6 (the unsharded run exceeds the foreground cap): all green.
- `npm run compare:differential` (`--harness-from-head`, base `f205895b4`) over 3 Scene ON traces (Psychic, Growth, Body Slam; frames 60..692 step 8): 240 / 240 captures byte-identical.
- Census (seeds 0..99 Scene ON, `soundCensusDelta.py --t1`, arm baseline `on-f205895b4`; "before" = the base-commit table): exact 23,547 -> 23,795, missing-gated 1,066 -> 950, extra 0, unclassified 11,093 -> 11,093 (unchanged). `rst197CensusDelta.py`: 100 / 100 battles identical (`commands`, `eventsDigest`).

## 13. aud242i: `waitsound` as an SE-length bound, Sludge Bomb, Faint Attack (Scene ON)

Ranked by T1 census weight: Sludge Bomb (198 gated ops) first, then Faint Attack (62).

### 13.1 Lifetimes derived (C; also cited in the extractor)

| lifetime | C | model |
|---|---|---|
| `waitsound` | `battle_anim.c:1635-1658` (`Cmd_waitsound` polls `IsSEPlaying`) | the SE's length is a **bound** (m4a songs from `sound/songs/midi/*.s`: `N*tbs/2` -> BPM = N*tbs, minimum BPM), resolved by the visual finish that follows, so `waitsound` stays `pending` unless a visual wait ends it later (the SE-length parse was wrong for `se_m_bubble3`: `220*tbs/2`) |
| Sludge Bomb hit particles / poison bubbles | `battle_anim_poison.c` (`gSludgeBombHitParticleSpriteTemplate`, `AnimSludgeBombHitParticle`), `battle_anim_mons.c` (`AnimTranslateLinear` family) | exact lifetimes of the particle sprites; `blend_color_cycle` as in section 12 |
| `AnimTask_AttackerFadeToInvisible` / `FromInvisible` (and the `attacker_fade_*` macros) | `battle_anim_dark.c:191-263` (16 steps, one every `step_delay + 1` calls) | `16 * (d + 1) - 1` |
| `AnimTask_SetAttackerInvisibleWaitForSignal` | `battle_anim_utility_funcs.c:1079-1092` (destroyed in its first call) | exact `-1` |
| `Task_ClearMonBg` (`clearmonbg` after a `monbg`) | `battle_anim.c:852-910`: two `ResetBattleAnimBg` calls, which overrun VBlank by 2 frames when a mon BG was active | a `{after, frames: 2}` lag after the clearmonbg step (guarded by `monbg` having run) |
| `loadspritegfx` / `monbg` | `Cmd_loadspritegfx` (+3), `Cmd_monbg` sets `sAnimFramesToWait = 1` (+3) | previously both counted +3 together |

### 13.2 ROM windows (probe step mode, Scene ON, player and opponent attacker)

Fixtures `tools/audio/fixtures/aud242i-{sludge,faint}-{player,opponent}.json`, labs `tools/battle-lab/aud242i-{sludgebomb,faintattack}-{player,opponent}-on.json` (stages in `appTrace.ts`), test `tests/aud242iMoveAnimSounds.test.ts`.

| window | rows | ROM minus ours |
|---|---|---|
| Sludge Bomb, both sides | 10 x SE126, 3 x SE175, then 6 x SE148 (`SE_M_TOXIC`, after the `waitsound` and the hit-particle wait): 19 / 19 rows | +2 (idle-lead class) |
| Faint Attack, both sides | SE190 (ROM 112 / 116), SE123 (155 / 159) behind the fade, elliptical task and invisible signal | +3 on both rows (named residual: a script-start offset the first row already had; the interval is exact) |
| Poison Tail (aud242e fixture) | the SE148 rows after its `clearmonbg` | +4 -> +2 (the `Task_ClearMonBg` overrun explains the old "undiagnosed" extra; the five `extra` entries are gone) |

### 13.3 Counts (turn 0, player attacker)

| | before (`d39e33b3c`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 899 / 213 | 906 / 206 |
| L50: emitted / gated | 697 / 137 | 704 / 130 (the two moves are in the Level-50 inventory: +6 Sludge Bomb, +1 Faint Attack) |

Census T1 (seeds 0..99 Scene ON, fresh arms `on-d39e33b3c` and `on-04b803f5f`, each scored against its own table): exact 23,795 -> 24,055, missing-gated 950 -> 690, missing-other 51 -> 51, missing-declined 1, extra 0, unclassified 11,093 -> 11,093 (unchanged: SEs outside any move window, a tooling gap that predates this step; not 0). `rst197CensusDelta.py`: `commands` / `eventsDigest` identical on 100 / 100 battles.

### 13.4 Residuals

- Still the top gated census moves: Blizzard 88, Confuse Ray 47, Dig 37, Spark 32, Struggle 30 (`gMovementWavesSpriteTemplate`, `AnimTask_ShakeMonInPlace`), Attract 28 (`AnimRedHeartProjectile`, `AnimParticleBurst`), Silver Wind 25, Tri Attack 24.
- Faint Attack's +3 is a recorded offset, not fixed (ISSUES #198).

### 13.5 Acceptance receipt (aud242i)

Tested code commit `04b803f5f` (later commits are docs only).

- `npm run typecheck`, `npm run build`, `npm run build:lib`: each exit 0. `npm run test:gate`: 362 files, 2,843 passed. aud24x / aud25x / moveAnimSounds / tickSounds importer tests: 27 files, 287 passed. The full `npm test` was not run (the supervisor runs it).
- `npm run compare:differential` (`--harness-from-head`, base `d39e33b3c`) over 3 Scene ON traces (Sludge Bomb player, Faint Attack player and opponent; frames 60..692 step 8): 240 / 240 captures byte-identical.

## 14. aud242j: Struggle / Attract / Dig unleash / Silver Wind lifetimes

Ranked by T1 census weight among the moves whose gated ops depend only on C-derivable fixed lifetimes: Struggle 30, Attract 28, Dig 37, Silver Wind 25.
Skipped: Blizzard (per-species pic offset), Confuse Ray (BallBounce translation, blend state machine, `SoundTask_AdjustPanningVar`), Spark (`ElectricityEffect`, delay -31 colour cycles).

### 14.1 Lifetimes derived (C; also cited in the extractor, `lifetimeOf(cmd, attackerSide)`)

| lifetime | C | exact (ticks after F) |
|---|---|---|
| `AnimTask_ShakeMonInPlace` (Struggle) | `battle_anim_mon_movement.c:251-299` | `max(shakes-1, 0) * (delay+1) - 1` |
| `gMovementWavesSpriteTemplate` (`AnimMovementWaves`, Attract) | `battle_anim_effects_2.c:3173-3216` | `n*33 - 1` (`n == 0`: -1) |
| `gRedHeartProjectileSpriteTemplate` / `gRedHeartBurstSpriteTemplate` | `battle_anim_effects_2.c:3624-3666`, `1130-1150` | 95 / 40 |
| `AnimTask_DigUpMovement` (`FALSE` half) | `battle_anim_ground.c:386-418` | 0 (the `TRUE` half stays unmodelled) |
| Silver Wind sparks (`gSilverWind{Big,Medium,Small}SparkSpriteTemplate`, `AnimFlyingParticle`) | `battle_anim_effects_1.c:3517-3590` | `ceil((272 or 264) / speed)`, width by the anchor's side |

### 14.2 ROM windows (probe step mode, Scene ON)

Fixtures `tools/audio/fixtures/aud242j-{struggle-player,silverwind-player,silverwind-opponent,dig-player}.json`, labs `tools/battle-lab/aud242j-*-on.json` (stages in `appTrace.ts`), test `tests/aud242jMoveAnimSounds.test.ts`.

| window | rows | ROM minus ours |
|---|---|---|
| Struggle (player) | SE162 x4 (ROM 75 / 87 / 100 / 113), SE141 (141) behind `ShakeMonInPlace` | +7 (interval exact; the move starts later than the idle-lead class) |
| Silver Wind (player) | SE132 + SE228 (ROM 70), SE133 (208) behind the spark particles | +2 |
| Silver Wind (opponent) | SE132 + SE228 (ROM 74), SE133 (215) | +2 |
| Dig unleash (second turn, player) | SE114 (ROM 1048) behind `AnimTask_DigUpMovement` | 0 |

- Attract is C-derived only: a same-gender Rattata lab does not animate it (no SE212 / 226 / 227 in the ROM log); a ROM window needs opposite-gender parties.
- Dig's turn-0 rows (SE175 x5 at ROM 60..196, ours 66..202: -6; the opponent's SE141 at ROM 585 vs ours 562: +23) predate this step and are not changed by it; the `DigSetUp` end lifetime is the open item.
- Silver Wind's ROM stat-raise SE239 (ROM 360) is not emitted by us (secondary-effect stat change; named gap in `tests/aud248StatChangeSounds.test.ts`).

### 14.3 Counts (turn 0, player attacker)

| | before (`70b923b38`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 906 / 206 | 910 / 202 |
| L50: emitted / gated | 704 / 130 | 707 / 127 (+3 emitted; Dig's turn-0 op is unchanged) |

Census T1 (seeds 0..99 Scene ON, arms `on-04b803f5f` and fresh `on-4e31b7675`, each scored against its own table): exact 24,055 -> 24,175, missing-gated 690 -> 570, missing-other 51, missing-declined 1, extra 0, unclassified 11,093 -> 11,093 (unchanged, pre-existing tooling gap, not 0). `rst197CensusDelta.py`: 100 / 100 battles, `commands` / `eventsDigest` identical.

Gates on `4e31b7675` + the aud248 residual row: `npm run typecheck` 0; `npm run test:gate` 362 files / 2,843; aud24x / aud25x / moveAnimSounds / tickSounds importer tests 28 files / 292; `npm run build`, `npm run build:lib` 0. `npm run compare:differential` (`--harness-from-head`, base `70b923b38`, Struggle, Silver Wind, Dig two-turn traces): 303 / 303 captures byte-identical.

### 14.4 Residuals

- Top gated census moves now: Blizzard 88, Confuse Ray 47, Spark 32, Tri Attack 24, Ancient Power 23, Petal Dance 22, Fire Punch 21, Yawn 20.
- Struggle +7 and Dig's -6 / +23 are recorded offsets, not fixed (ISSUES #198).

## 15. aud242k: Fire Punch / Ancient Power / Yawn / Smokescreen / Safeguard / Scary Face / Crunch / Lovely Kiss / Wish / Recover lifetimes

Ranked by T1 census gated weight among the moves whose gated ops depend only on fixed or arithmetic C lifetimes: Ancient Power 23, Fire Punch 21, Yawn 20, Smokescreen 19, Wish 17, Safeguard 15, Scary Face 15, Crunch 13, Lovely Kiss 12, Recover 13.
Skipped: Blizzard 88 (the snowball path needs a per-species pic offset), Confuse Ray 47, Spark 32 (`ElectricityEffect`, delay -31 colour cycles), Petal Dance 22 (`create_petal_dance_*_flower_sprite`), Tri Attack (`gLargeFlameScatterSpriteTemplate`, `invert_screen_color`, lightning, ice crystals still open), Rollout (`AnimTask_Rollout`), Flail (`AnimTask_FlailMovement` plus a damage-dependent shake).

### 15.1 Lifetimes derived (C; also cited in the extractor, `lifetimeOf`, aud242k block)

Call numbering as in section 8: a sprite whose callback destroys at call K is gone K - 1 ticks after F.

| lifetime | C | exact (ticks after F) |
|---|---|---|
| `gFireSpiralInwardSpriteTemplate` | `battle_anim_fire.c:466-478`, `battle_anim_mons.c:468-486` | 30 |
| `gFireSpreadSpriteTemplate` / `gGrantingStarsSpriteTemplate` | `battle_anim_fire.c:481-492`, `battle_anim_effects_1.c:4099-4113`, `battle_anim_mons.c:607-621` | `D + 1` |
| `AnimTask_DeepInhale` / `gYawnCloudSpriteTemplate` | `battle_anim_effects_3.c:3474-3510`, `3532-3563`, `battle_anim_mons.c:780-788` | 64 / 65 |
| `gBlackBallSpriteTemplate` (`AnimThrowProjectile`) / `gBlackSmokeSpriteTemplate` | `battle_anim_mons.c:1572-1589`, `battle_anim_effects_3.c:1182-1209` | `D` / `T` |
| `gGuardRingSpriteTemplate` / `gAncientPowerRockSpriteTemplate` | `battle_anim_effects_2.c:3799-3820`, `battle_anim_rock.c:571-582`, `battle_anim_mons.c:1093-1100` | 14 / `D + 1` |
| `shake_mon_or_platform` | `battle_anim_normal.c:853-915` | `T` |
| `gDevilSpriteTemplate` | `battle_anim_effects_2.c:3580-3610` | 89 |
| `gEyeSparkleSpriteTemplate` | `battle_anim_effects_2.c:3504-3514`, `1011-1019` | 20 |
| `AnimTask_ScaryFace` | `battle_anim_effects_2.c:3324-3410` | 77, plus `SCARY_FACE_LOAD_LAG` 6 (below) |
| `AnimTask_ShakeTargetInPattern` | `battle_anim_fire.c:1344-1375` | `maxShakes - 2` (needs >= 1) |
| `create_sharp_teeth_sprite` / `gSharpTeethSpriteTemplate` / `gClampJawSpriteTemplate` | `battle_anim_dark.c:320-352` | `2H - 1` |
| `gWishStarSpriteTemplate` | `battle_anim_effects_3.c:2104-2140` | 64 |
| `gHealingBlueStarSpriteTemplate` (`AnimSpriteOnMonPos`) | `battle_anim_mons.c:1515-1536`, `battle_anim_effects_1.c:1825-1836` | 21 (2+2+2+3+5+3+2+2) |
| `create_power_absorption_orb_sprite` | `battle_anim_effects_1.c:2230-2240` (`StartAnimLinearTranslation`) | `D + 1` |

`AnimTask_ScaryFace` loads its BG tilemap, image and palette in the creating step like `AnimTask_MetallicShine`; the ROM window puts the first op after its wait 6 wall frames after the 77-call count, so the extractor applies `SCARY_FACE_LOAD_LAG = 6` to every later op (same mechanism as `METALLIC_SHINE_LOAD_LAG`, section 8).

### 15.2 ROM windows (probe step mode, Scene ON, player attacker)

Fixtures `tools/audio/fixtures/aud242k-{ancientpower,firepunch,yawn,smokescreen,scaryface,wish,safeguard,lovelykiss,crunch,recover}-player.json`, labs `tools/battle-lab/aud242k-*-player-on.json` (made by `tools/audio/makeAud242bLabs.py`, `AUD242_LAB_PREFIX=aud242k`; Recover's trace is two turns because the move fails at full HP), stages in `appTrace.ts`, test `tests/aud242kMoveAnimSounds.test.ts`. Recipe: `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette python3 tools/run-mgba-probe.py --rm-log-on-success OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json lab <lab>.json --frames N --profile on --compact` (N = 600; Recover 1900).

| window | rows timed by the new lifetimes (ROM frames) | ROM minus ours |
|---|---|---|
| Ancient Power | SE171 77, SE177 144 | +2 |
| Fire Punch | SE144 78, SE147 115 | +2 |
| Yawn | SE237 62, SE232 127, SE237 205 | +1 |
| Smokescreen | SE135 71, SE159 111 | -2 |
| Scary Face | SE189 67, SE192 126, SE130 210 (behind `AnimTask_ScaryFace`) | -2 (+4 before the 6-frame lag) |
| Wish | SE207 91, SE195 218 / 234 / 251 | -5 |
| Safeguard | SE225 65, SE102 92 | -4 |
| Lovely Kiss | SE200 71, SE226 161 (behind the Devil) | 0 |
| Crunch | SE161 109, SE161 135 (behind the sharp-teeth sprites) | +2 |
| Recover (second turn) | SE140 x3 ROM 1087 / 1100 / 1114, SE179 1207 | -2 |

Every row of a window carries one offset, so the intervals the lifetimes produce are ROM-exact; the offsets are the known start classes (idle lead +2, status -2..-5, ISSUES #198).

- The first Scary Face window had its last row 6 frames later than the first two rows' offset, which gave `SCARY_FACE_LOAD_LAG`.
- Lovely Kiss's SE197 rows (ROM 224 / 517 vs ours 221 / 499, +3 / +18) are the Status_Sleep animation of the sleeping target (SE_M_SNORE, the status-animation step), not the move under test; they predate this step.
- The `aud242c` Crunch window's "ROM only" row (135) is now emitted and matches, so its `romOnly` entry was removed. `tests/aud248StatChangeSounds.test.ts` names the new windows' stat-SE residuals: Ancient Power null (secondary effect, not run as a stats-change command), Scary Face +14, Smokescreen 0.

### 15.3 Counts (turn 0, player attacker)

| | before (`b5bb454a9`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 910 / 202 | 924 / 188 |
| L50 (276 moves): emitted / gated | 707 / 127 | 720 / 114 |

Moves whose turn-0 gated count fell to 0: Fire Punch, Smokescreen, Lovely Kiss, Scary Face, Safeguard, Synthesis, Crunch, Ancient Power, Nature Power, Wish, Tickle, Yawn (2 -> 0) and Recover.

Census T1 (seeds 0..99 Scene ON, fresh arms `on-b5bb454a9` (the parent) and `on-d4502e1b0`, each scored in its own tree against its own table): exact 24,175 -> 24,404, missing-gated 570 -> 396, missing-other 51, missing-declined 1, extra 0. unclassified is 128 in BOTH arms (not 0): SE148 in the message / HP windows, the sound-only Status_Poison tail added by `36e9335ab` (psn2) after the `bd46a5fbf` t1cls arm, which the classifier does not attribute; this step does not change it. `rst197CensusDelta.py`: 100 / 100 battles, 31,264 commands identical, bad 0; `soundCensusDelta.py` arm-vs-arm: 53 seeds with added SE rows only (no removed or moved rows).

### 15.4 Residuals

- Top gated census moves now: Blizzard 88, Confuse Ray 47, Spark 32, Tri Attack 24, Petal Dance 22, Rollout 17, Flail 15 (ranking aids: `ANIM_SOUND_BLOCKERS=1`, `ANIM_SOUND_BLOCKERS_BY_MOVE=file`).
- Unmodelled lifetimes with the most gated L50 ops behind them: `create_hyper_beam_orb_sprite` 52, `gEndureEnergySpriteTemplate` 45, `gHydroPumpOrbSpriteTemplate` 44, `gFireSpinSpriteTemplate` 42, `gAuroraBeamRingSpriteTemplate` 40, `gAirWaveCrescentSpriteTemplate` 40.

## 16. aud242l: Blizzard (snowball and ice crystal lifetimes per battler pic Y)

Blizzard was the largest gated T1-census move (88 ops over seeds 0..99 Scene ON): 11 `SE_M_ICY_WIND` ops per cast wait behind `waitforvisualfinish` for the `gSwirlingSnowballSpriteTemplate` and `gBlizzardIceCrystalSpriteTemplate` sprites (`Move_BLIZZARD`, `BlizzardIceCrystals` x2, then `IceCrystalEffectLong`). Both sprites run until they leave the screen along a line fixed by the attacker's and the target's `BATTLER_COORD_Y_PIC_OFFSET`, so the lifetime is a function of two per-species values. `SE_M_BLIZZARD` (panse) and `SE_M_BLIZZARD2` were already resolved; only the ICY_WIND ops move.

### 16.1 Lifetimes derived (C; also cited in the extractor, `swirlingSnowballLifetime` / `moveParticleBeyondTargetLifetime`)

Call numbering as in section 8 (call 0 = the creating script step, call k >= 1 = `AnimateSprites` of iteration F + k - 1; a sprite destroyed at call K is gone K - 1 ticks after F).

| item | C |
|---|---|
| pic Y per species | `GetBattlerSpriteFinal_Y(battler, TRUE)` (`battle_anim_mons.c:112-170, 172-292`): player `back yOffset + 80 + 8`, opponent `front yOffset - elevation + 40`, both clamped to 104; data `mon-pic-coords.json`, `enemy-mon-elevations.json`. Singles battler X 72 / 176 (`sBattlerCoords`, `:20-26`) |
| fast linear translation | `InitAnimFastLinearTranslation*` / `AnimFastTranslateLinear` (`battle_anim_mons.c:1171-1258`): u16 fixed point, sign in bit 0 of the step, `duration = (|dx| << 4) / speed` |
| start position | both sprites are first placed `|arg0|` behind the attacker and then run the reversed translation until off screen (`:833-847`, `battle_anim_ice.c:666-721, 788-844`); the snowball keeps its pre-init data row, the crystal the initialised one |
| snowball | `AnimSwirlingSnowball` -> `AnimFastTranslateLinearWaitEnd` -> Step1 -> 32 Step2 swirl calls -> End (one fast step per call until off screen, bounds 256 / -16, `battle_anim_ice.c:723-776`) |
| ice crystal | `AnimMoveParticleBeyondTarget` -> `AnimWiggleParticleTowardsTarget` (`:847-863`) until `data[0] == 1` and the sprite is off screen (bottom 160) |

Extractor: the sprite walks above reuse the C arithmetic (sine table parsed from `trig.c`), and `walk` is repeated for every (attacker pic Y, target pic Y) class of the side pair (`picYs`: 17 player values, 31 opponent values). A class grid whose cells are not all equal is stored in `picGrids` (cell = pooled variant index; row = attacker class, column = target class); the move's `pic[slot]` points at it (-1 = pic independent). A player-attacker Blizzard is species independent (the first ICY_WIND is always at impact age 208, the grid collapses to the plain variant); an opponent attacker spans 194..206 over 31 x 17 classes (13 distinct variants).

Runtime: `liveMoveSourceAge` now also returns `picOffsetY(battler)` (the live battler's pic Y through `liveBattlerAnchors(...).picOffsetPoint.y`, which is the same formula), and `variantOf` indexes the grid with it; an unknown class falls back to the middle-class reference walk. Sound only; no gameplay, RNG or presentation state is read or written.

Cross-check: `tests/aud242lMoveAnimSounds.test.ts` compares every one of the 1,054 classes (17 x 31 x 2 sides) against the ROM-validated visual port (`blizzardImpactStartAge`, `src/animation/blizzard.ts`): the first ICY_WIND row follows the panse row by `impactAge - 45`, 0 mismatches. The extractor was written from the C and validated against the port, not fitted to the ROM windows.

### 16.2 ROM windows (probe step mode, Scene ON)

Fixtures `tools/audio/fixtures/aud242l-blizzard-{fearow-bulbasaur,bulbasaur-charizard,bulbasaur-bulbasaur}-opponent.json` and `aud242l-blizzard-bulbasaur-fearow-player.json`, labs `tools/battle-lab/aud242l-*-on.json` (`AUD242_LAB_PREFIX=aud242l tools/audio/makeAud242bLabs.py name:side:59:attackerSpecies:targetSpecies`), stages `aud242lBlizzardStage` in `appTrace.ts`, test `tests/aud242lMoveAnimSounds.test.ts`. Recipe as section 15 (`--frames 700`). The attacker is Lv50, the target Lv12 Seismic Toss; the species only change the staged battlers' `species` (the ICY_WIND rows come before any damage).

| window (attacker / target) | attacker, target pic Y | ROM: BLIZZARD2 -> first ICY_WIND | ROM - ours, all 13 rows |
|---|---|---|---|
| opponent Fearow / player Bulbasaur | 34, 104 | 80 | +2 |
| opponent Bulbasaur / player Charizard | 54, 92 | 91 | +2 |
| opponent Bulbasaur / player Bulbasaur | 54, 104 | 87 | +2 |
| player Bulbasaur / opponent Fearow | 104 (player), 34 | 93 | +2 |

Per window the 13 rows (panse, BLIZZARD2, 11 ICY_WIND at the 6-frame spacing) are frame-, id- and pan-exact after one constant +2 that is the older idle lead class of the Blizzard panse row itself (the panse is at ROM 111 vs ours 109), not a lifetime residual; the four different BLIZZARD2 -> ICY_WIND spacings (80 / 91 / 87 / 93) are each reproduced, which a single reference walk cannot.

### 16.3 Counts (turn 0, player attacker)

| | before (`651824b21`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 924 / 188 | 935 / 177 |
| L50 (276 moves): emitted / gated | 720 / 114 | 731 / 103 |

Census T1 (seeds 0..99 Scene ON, `LSD194_SHARDS=0`, arms `on-d4502e1b0` (the aud242k head's code and table; reused from `.integration/evidence/aud242k`) and fresh `on-085998622`, each scored inside its own tree against its own table): exact 24,404 -> 24,492, missing-gated 396 -> 308, missing-other 51, missing-declined 1, extra 0, unclassified 128 in both (the aud242k psn2 / SE148 note). `rst197CensusDelta.py`: 100 / 100 battles, 31,264 commands, `eventsDigest` identical, bad 0; `soundCensusDelta.py` arm-vs-arm: 4 seeds with added ICY_WIND rows only. The census harness now records the battlers' pic Y per move command (`soundAnim` element 10) and `soundCensusExpected.ts` picks the grid cell with it.

Frame hashes: `npm run compare:differential -- <3 Blizzard Scene ON traces> --base 651824b21 --harness-from-head`: 240 / 240 captures byte-identical (opponent Fearow / Bulbasaur, opponent Bulbasaur / Charizard, player Bulbasaur / Fearow; captures 60..692 step 8).

### 16.4 Residuals

- T1 is self-consistency: the ROM check of the class grid is the four windows above (three distinct opponent classes and one player class); a class between them is covered by the visual-port cross-check, not by its own ROM window.
- Top gated census moves now: Confuse Ray 47, Spark 32, Tri Attack 24, Petal Dance 22, Frustration 19, Rollout 17, Flail 15, Dive 10.

## 17. aud242m: Frustration, Return and Flail (T1 family 1, slice 12)

Extractor `lifetimeOf` / `returnValue` in `tools/extract/extract-anim-sound-timing.ts` (aud242m block); table regenerated (356 moves, 358 distinct variants, 1172 ops).

### 17.1 Ports (C-cited, none fitted to a ROM window)

- **Friendship branch (`returnValue`).** `AnimTask_GetFrustrationPowerLevel` (`battle_anim_mons.c:1993-2006`, `<= 30` -> 0) and `AnimTask_GetReturnPowerLevel` (`battle_anim_effects_3.c:5060-5073`, `< 60` -> 0) read `gAnimFriendship`. Every Factory mon has friendship 0 (`battle_factory.c:459`, `:820`; the controllers copy the mon's friendship into the move-animation buffer, `battle_controller_player.c:2477`, and the engine adapter passes 0), so Frustration takes `Frustration_Strongest` and Return `ReturnWeak`.
  The `mechanicLab` template's mons have friendship 70 (Frustration Strong / Return Medium); the aud242m labs therefore set `friendship: 0` on every mon (`AUD242_FRIENDSHIP=0 AUD242_LAB_PREFIX=aud242m tools/audio/makeAud242bLabs.py`), the Factory value. The first, friendship-70 windows took the Strong / Medium branches, which is how the labs' value was found; they were replaced, not kept.
- **`gAngerMarkSpriteTemplate` = 17 ticks** (`battle_anim_effects_2.c:2281-2299`: init sets `callback = AnimAngerMark`, which runs the two 8-tick affine commands, `battle_anim_mons.c:586-591`, `:729-733`, then destroys). Cross-checked against the ROM-validated visual port `src/animation/swagger.ts` (17 ticks) and the Frustration ROM window below (two marks 18 script frames apart = 17 + the following `playsewithpan` frame).
- **`AnimTask_FlailMovement`** (`flailMovementLength()`): the task's `sin` angle state machine is simulated with s16 arithmetic (amplitude 0x800 shrinking by 0x40 per 9-count after 0x20 shrinks) and its end call is the sprite lifetime; nothing is measured.

### 17.2 ROM windows (probe step mode, `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`, Scene ON, player attacker Lv50, friendship 0)

Fixtures `tools/audio/fixtures/aud242m-{frustration,flail,return}-player.json`, labs `tools/battle-lab/aud242m-*-player-on.json`, stages `aud242m-*-player-on` in `appTrace.ts`, test `tests/aud242mMoveAnimSounds.test.ts`. Recipe as section 15 (`--frames 700`).

| window | rows | ids / pans | ROM minus ours |
|---|---|---|---|
| Frustration (Strongest) | 9 (DRAGON_RAGE 171, SWAGGER2 194 x2, COMET_PUNCH 139 x6) | equal | **+1** (the idle class) |
| Flail | 3 (162 x2, MEGA_KICK2 141) | equal | **+2** |
| Return (Weak) | 3 (TAIL_WHIP 167 x2, COMET_PUNCH 139) | equal | **+1** |

Every row's id, pan and relative spacing equal the ROM's; the constant is the existing #198 idle lead class (recorded, not fitted).

### 17.3 Counts (turn 0, player attacker)

| | before (`b8f8e9203`) | after |
|---|---|---|
| all moves: ops resolved / unresolved | 935 / 177 | 948 / 174 |
| L50 (276 moves): emitted / gated | 731 / 103 | 744 / 100 |

Only Frustration, Return and Flail changed (semantic old-vs-new table diff); they are fully resolved in all turn / side variants.

Census T1 (seeds 0..99 Scene ON, arms `on-085998622` (aud242l head) and fresh `on-d5ea5c8fb`, each scored inside its own tree): exact 24,492 -> 24,678, **missing-gated 308 -> 274**, missing-other 51, missing-declined 1, extra 0, unclassified 128 in both (the psn2 / SE148 note). `rst197CensusDelta.py`: 100 / 100 battles, 31,264 commands, bad 0.
Frame hashes: `npm run compare:differential -- <Frustration, Flail, Return Scene ON traces> --base b8f8e9203 --harness-from-head`: 240 / 240 captures byte-identical (captures 60..692 step 8).

### 17.4 Residuals

Remaining top gated census moves: Confuse Ray 47 (ball-bounce translation needs the target's pic Y, a blend oscillation state machine and the `AdjustPanningVar` task), Spark 32 (`AnimSparkElectricity` plus overlapping `blend_color_cycle`), Tri Attack 24, Petal Dance 22, Rollout 17 (depends on the battle's rolloutCounter, not a lifetime), Dive 10.

## 18. aud242n: Confuse Ray and Spark (T1 family 1, slice 13)

Extractor `lifetimeOf` / the walk in `tools/extract/extract-anim-sound-timing.ts` (aud242n blocks); table regenerated (356 moves, 359 distinct variants, 1175 ops). Both lifetimes are ported from the C with the same integer arithmetic; nothing is fitted to a ROM window.

### 18.1 Confuse Ray (ports)

`Move_CONFUSE_RAY` waits on four things: a `BlendColorCycleByTag` (119 ticks, already modelled), `gConfuseRayBallBounceSpriteTemplate`, `gConfuseRayBallSpiralSpriteTemplate` and `SoundTask_AdjustPanningVar`.

- **`SoundTask_AdjustPanningVar`** (`battle_anim_sound_tasks.c:370-407`, `adjustPanningVarLength()`): source / target pans go through `BattleAnimAdjustPanning` (`battle_anim.c:1263-1303`, singles: a player attacker keeps the pan, an opponent attacker negates; clamp [-64, 63]); the step moves the pan by `+-|inc|` every `wait + 1` calls (s16 arithmetic, clamped) and the task ends the call after the pan equals the target. **62 ticks (player attacker) / 61 (opponent)**.
- **`AnimConfuseRayBallBounce`** (`battle_anim_ghost.c:220-311`, `confuseRayBallBounceLength()`): the start x is the attacker's x offset by `SetAnimSpriteInitialXOffset` (`battle_anim_mons.c:741-850`), the duration is `(|targetX - x| << 8) / speed`, Step1 / Step2 count it with the `data[6]` / `data[7]` blend counter (`UpdateConfuseRayBallBlend`, `:288-311`, wraps 0x101..0x10d to 0, direction toggled at 0 / 16). Only the x coordinates enter, so the lifetime does not depend on the battler's pic Y, RNG or damage. **75 ticks**.
- **`gConfuseRayBallSpiralSpriteTemplate`** (`:313-341`): the init installs the step and runs it once, so call 60 destroys: **59 ticks**.

The 119-tick blend cycle dominates the wait, so the sprite (75) and the pan task (62 / 61) are only needed to resolve it; they are not independently pinned by the ROM window.

### 18.2 Spark (ports)

- **`gSparkElectricitySpriteTemplate`** (`AnimSparkElectricity`, `battle_anim_electric.c:515-569`): sets `data[0] = gBattleAnimArgs[3]` (script args[6]) and installs `DestroyAnimSpriteAfterTimer` (`battle_anim_flying.c:539-551`); call k >= 1 destroys when `data[0]-- <= 0`: gone `max(d, 0)` ticks after the creation iteration (10..13 in `Move_SPARK`).
- **Refused colour cycles (the shared `gPaletteFade`).** `BeginNormalPaletteFade` returns FALSE without touching anything while `gPaletteFade.active` (`palette.c:156-163`); `AnimTask_BlendColorCycle` (`battle_anim_normal.c:447-500`) still decrements `tNumBlends`, so a one-blend cycle created while another fade runs starts nothing and `AnimTask_BlendColorCycleLoop` destroys it in the RunTasks of the iteration the running fade clears `active`. Spark creates six overlapping delay -31 cycles in 56 frames, so the walk now gives such a cycle `exact = fadeBusy - frame` (it does not extend the busy window). A multi-blend cycle inside the window can start the next fade in that same RunTasks (task order decides who gets it): that case, and a refusal behind a multi-blend chain, stay unmodelled (`life = null`) exactly as before.
- **`gPaletteFade.deltaY` is a 4-bit field** (`palette.h:52`): `BeginNormalPaletteFade` adds `-delay` to 2 and the field truncates, so delay -31 steps y by `(2 + 31) & 15 = 1`, not 33. `paletteFadeCalls()` now masks it. The ROM BlendPalette log confirms it (y 0, 1, 2, ... one per 2 frames). The only delay below -13 in the scripts is Spark's; the semantic table diff against the previous commit changes Spark only.

### 18.3 ROM windows (probe step mode, `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`, Scene ON, attacker Lv50 on the named side)

Fixtures `tools/audio/fixtures/aud242n-{confuseray,spark}-{player,opponent}.json`, labs `tools/battle-lab/aud242n-*-on.json` (`AUD242_LAB_PREFIX=aud242n tools/audio/makeAud242bLabs.py <name>:<side>:<moveId>`), stages `aud242n-*-on` in `appTrace.ts`, test `tests/aud242nMoveAnimSounds.test.ts` (`--frames 700` for Confuse Ray, 450 for Spark).

| window | rows | ids / pans | ROM minus ours |
|---|---|---|---|
| Confuse Ray, player | 1 (SE_M_STRING_SHOT2 130 at ROM 229, pan 63) | equal | **0** |
| Confuse Ray, opponent | 1 (130 at ROM 233, pan -63) | equal | **0** |
| Spark, player | 5 (THUNDERBOLT2 119 x3 at ROM 69 / 85 / 111 pan -64, HYPER_BEAM 215 at 138 pan 63, 119 at 149) | equal | **+5** on the three opening rows, **+6** on the last two |
| Spark, opponent | 5 (119 x3 at 73 / 89 / 115 pan 63, 215 at 142 pan -63, 119 at 153) | equal | **+5**, then **+6** |

The +5 is the aud242a idle-lead class (two `loadspritegfx` before the first SE; recorded, ISSUES #198). The extra +1 behind Spark's first wait is a ROM VBlank overrun in the step that creates the eight flashing sprites (script frame 50): the BlendPalette log shows that cycle's second fade call one frame late (BG y0 at 111, OBJ y0 at 112, against 69 / 69 for the first cycle). It is recorded as the test's `extra`, not modelled; the intervals inside each group (16, 26 and 11 frames) equal the ROM's.

Named gap: the ball bounce sprite itself plays SE_M_CONFUSE_RAY (196) with `gAnimCustomPanning` (`battle_anim_ghost.c:249-256`), 13 ROM rows per cast, a sprite-callback site the table does not model. The test asserts they are ROM-only (13 / 0).

### 18.4 Counts and census

| | before (`9cc3398ff`) | after |
|---|---|---|
| all moves: ops resolved / unresolved (turn 0, player attacker) | 948 / 174 | 951 / 171 |
| all-moves ops in the table | 1172 | 1175 |
| L50 (276 moves): emitted / gated | 744 / 100 | 747 / 97 |

Only Confuse Ray (gated 1 -> 0) and Spark (2 -> 0) changed (semantic old-vs-new table diff).

Census T1 (seeds 0..99 Scene ON, arms `on-9cc3398ff` (aud242m head), `on-b5005d97b` (Confuse Ray) and `on-05e2d0bc6` (Spark), each scored inside its own tree, which needs a `reference` symlink): exact 24,678 -> 24,725 -> **24,757**, **missing-gated 274 -> 227 -> 195**, missing-other 51, missing-declined 1, extra 0, unclassified 128 in all three. Sound sequence delta base -> final: 27 of 100 seeds changed, all by added rows (Confuse Ray +47 SE130 rows, Spark +32 SE119 / SE215 rows, matching the exact-count deltas; the scorer's per-tuple `added` histogram counts distinct tuples, not rows); none removed. `rst197CensusDelta.py` base vs final: 100 / 100 battles identical (31,264 commands, bad 0).
Frame hashes: `npm run compare:differential -- <Confuse Ray player, Confuse Ray opponent, Spark player Scene ON traces> --base 9cc3398ff --harness-from-head`: 240 / 240 captures byte-identical (captures 60..692 step 8).

### 18.5 Residuals

The Confuse Ray sprite SE196 rows (13 per cast, ROM-only). Spark's +5 / +6 (idle lead plus one overrun frame). Remaining top gated census moves: Tri Attack 24, Petal Dance 22, Rollout 17 (rolloutCounter, not a lifetime), Dive 10.

## 19. aud242o: Petal Dance, Confuse Ray ball SE, Tri Attack, Dive, Rollout (T1 family 1, slice 14)

Table regenerated (356 moves, 367 distinct variants, 1202 ops). Every lifetime is ported from the C with the same integer arithmetic; nothing is fitted to a ROM window. Extractor blocks: `lifetimeOf`, `rolloutShape`, `confuseRayBallBounceLength`, the Dive ball simulation and the `sprite_confuseray_ball` / `task_rollout` events in `tools/extract/extract-anim-sound-timing.ts`; rows in `src/engine/moveAnimSounds.ts` (`confuseRayBallRows`, `rolloutRows`).

### 19.1 Ports

- **Petal Dance flowers** (`gPetalDanceBigFlowerSpriteTemplate` / `gPetalDanceSmallFlowerSpriteTemplate`): the flower sprite is gone `D - 1` ticks after its creation iteration (`exact: d - 1`, `D` = the script's duration arg).
- **Confuse Ray ball bounce SE196** (`battle_anim_ghost.c:249-256`, `:258-286`): the ball sprite plays `SE_M_CONFUSE_RAY` from its callback (a sprite-callback sound source, a non-task row) on the bounce phase counter; its pan comes from the `SoundTask_AdjustPanningVar` that shares the sprite's frame (`animSoundPan`, `calculatePanIncrement`, `keepPanInRange`, simulated in `confuseRayBallRows`). 13 rows per cast per side; the aud242n "named gap" test is now part of the `confuseray-*` specs.
- **Tri Attack** (`battle_anim_effects_3.c` / `battle_anim_fire.c`): `gLargeFlameSpriteTemplate` / `gLargeFlameScatterSpriteTemplate` are gone `intArg(args[5]) - 1` ticks after creation (script arg 2, n 1..0x7fff); `gLightningSpriteTemplate` 28; `AnimTask_InvertScreenColor` / `invert_screen_color` is a net-zero task destroyed in its creating step (`exact: -1`).
- **Bug fix, `AnimTask_ShakeTargetInPattern`** (`battle_anim_fire.c:1344-1375`): `maxShakes` is `gBattleAnimArgs[0]`, i.e. script `args[2]` (createvisualtask args are `name, priority, arg0...`); the extractor read `args[3]`. Every ShakeTargetInPattern lifetime was wrong; the Tri Attack ice rows were 12 frames early until this was fixed. The semantic table diff old-vs-new moves Tri Attack only.
- **Dive** (`gDiveBallSpriteTemplate`): a simulation of the ball step (pic-Y dependent): `y = pic.attackerY + a1`, `wait = args[5]`, `accel = args[6]`; Step1 rises until `y + y2 <= -32`, 22 hidden calls, Step2 falls by `d2 >> 8` until `y2 > 0`; `exact: call - 1`. The table is per pic class (`picGrids`, aud242l mechanism).
- **Rollout** (`AnimTask_Rollout`, `battle_anim_normal.c`; counter 1..5 = `GetRolloutCounter`, `request.rolloutCounter`): the live counter is a new table dimension (`counter` slot per move, `counterGrids`, 5 variants per slot, deduplicated). `rolloutShape(c)`: length 32 for counter 1, else `48 - 8c`; dirt period `max(trunc(length / 8) - 1, 1)`; the task is destroyed at call `max(41 + length, lastDirtCall + 19)` (a task whose entry only sets `func` has its first step at call 1). Rows: `SE_M_HEADBUTT` x10 at offsets 0..9 (pan -64), `SE_M_DIG` every `period` dirt steps from offset 40 with the pan stepping `trunc((pan2 - pan1) / length)` before each play, and `SE_M_MEGA_KICK2` at frame 101 / 101 / 95 / 87 / 79 (counters 1..5; the bodies' lengths 167 / 167 / 161 / 153 / 145 minus the same constant). The emitter passes `request.rolloutCounter` (outside 1..5 -> the counter 1 variant); the census learned the counter as `soundAnim` element 11 (`lsd194Census.ts`, `soundCensusDelta.py` `counter_key`, `soundCensusExpected.ts`; an older arm without it scores the counter 1 variant).

### 19.2 ROM windows (probe step mode, `AUD242_FRIENDSHIP=0 AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`, Scene ON, attacker Lv50)

Fixtures `tools/audio/fixtures/aud242o-*.json` (and the rewritten `aud242n-confuseray-*`, `aud242g` Tri Attack), labs `tools/battle-lab/aud242o-*-on.json`, stages `aud242o-*-on` in `appTrace.ts`, test `tests/aud242oMoveAnimSounds.test.ts` (+ the specs moved in `aud242n` / `aud242g`).

| window | rows | ids | ROM minus ours |
|---|---|---|---|
| Petal Dance, player | 2 (SE202, SE141) | equal | **+2** |
| Confuse Ray, player / opponent | 14 each (SE130 + 13 SE196, pans from the pan task) | equal | **0** / **0** |
| Tri Attack, player | 17 | equal | **+2** (all rows) |
| Dive, player (set-up turn) | 2 (SE162, SE233) | equal | **-7** |
| Rollout, player, one cast (counter 1) | 21 (10 SE162, 10 SE175, SE141) | equal, pans equal | **+3** |
| Rollout, player, 5 turns behind an opponent Defense Curl (counters 1..5) | 111 | equal, pans equal | **+9 / +22 / +37 / +57 / +86**, constant inside each turn |

Notes. The +2 is the idle-lead class (#198). Dive's -7 is a charge-turn presentation offset (every row of the window, including the headbutt, so it is not a lifetime error). The Rollout one-cast +3 and the five-turn offsets are presentation offsets of the turn start, not of the rows: every row of a turn moves by the same amount, so the in-turn intervals (the SE162 run, the SE175 pan steps and gaps, the MEGA_KICK2 gap) equal the ROM's for all five counters; the accumulated drift (+13, +15, +20, +29 turn over turn) is not diagnosed here (candidates: the turn bodies' per-counter lengths and the per-counter lag ages in `liveMoveTimingPolicy.ts`, or the non-Rollout part of each turn); it is outside the sound table (the window's Defense Curl stat SE rows drift by 2 / 16 / 31 / 51 / 80, i.e. the same per-turn amounts minus the constant 6-7 frames between the stat-change row and the Rollout rows; `tests/aud248StatChangeSounds.test.ts` takes them as a per-row residual list). The five-turn lab uses an opponent Defense Curl and a Lv100 target because a Seismic Toss / Tail Whip opponent made the stage's RNG miss Rollout (the stage is calibrated for the existing windows).

### 19.3 Counts and census

| | before (`23c5c3279`) | after |
|---|---|---|
| all moves: ops resolved / unresolved (turn 0, player attacker) | 951 / 171 | 964 / 160 |
| all-moves ops in the table | 1175 | 1202 |
| L50 (276 moves): emitted / gated | 747 / 97 | 760 / 86 |
| table: distinct variants | 359 | 367 |

Moves changed (semantic old-vs-new table diff): Petal Dance, Confuse Ray, Tri Attack, Rollout, Dive (gated 1 -> 0, 0 -> 0 (+SE196 rows), 8 -> 0, 1 -> 0, 1 -> 0 at turn 0 player).

Census T1 (seeds 0..99 Scene ON; base arm `on-05e2d0bc6` = the aud242n head, scored inside its own tree; final arm `on-67eacbe83` scored here): exact 24,757 -> **25,795**, **missing-gated 195 -> 122**, extra 0, missing-other 51, missing-declined 1, unclassified 128 unchanged. Rollout, Petal Dance, Tri Attack, Dive and Spark are off the missing-gated list. Sound sequence delta base -> final: 35 of 100 seeds changed, all by added rows (SE196 26 tuples of 12 / 13 rows, SE141 x7, SE162 / SE175 rows), none removed. `rst197CensusDelta.py` base vs final: 100 / 100 battles identical (31,264 commands, bad 0).
Frame hashes: `npm run compare:differential -- <aud242o rollout, triattack, dive, petaldance player Scene ON traces> --base 23c5c3279 --harness-from-head`: 320 / 320 captures byte-identical.

### 19.4 Residuals

Idle-lead +2 / +3 and Dive's -7 (#198). Rollout's turn-over-turn presentation drift (+13 / +15 / +20 / +29). Remaining top gated census moves: Dynamic Punch 10, Extrasensory 8, Leaf Blade 8, Flatter 8, Secret Power 8, Heal Bell 8, Ice Ball 6 (the next counter-dimension candidate), Fury Cutter 6.

## 20. aud242p: Encore, Flatter, Reversal, Taunt, Karate Chop, Revenge, Mist Ball, Leaf Blade (T1 family 1, slice 15) and the Scene ON T2 re-score

Base `67a98cf93` (aud242o). Goal (A): re-score Scene ON T2 over the 21 aligned seeds. Goal (B): port the next ROM-only move-SE families from the C, each with a file:line citation, none fitted to a window. Conventions as section 19: "gone n ticks after F", RunTasks / AnimateSprites order (sprites run before tasks inside one iteration), `delay N` = N + 2, a script sprite's init is call 0.

### 20.1 Lifetimes ported (`tools/extract/extract-anim-sound-timing.ts`, `lifetimeOf`)

| lifetime | C | exact (ticks after F) |
|---|---|---|
| `AnimTask_HardwarePaletteFade` (Encore / Flatter backdrop) | `battle_anim_utility_funcs.c:199-216`, `palette.c:728-785` | `(delay + 1) * abs(targetY - y) + 1` |
| `gSpotlightSpriteTemplate` (Flatter) | `battle_anim_effects_3.c:1545-1604`, affine anims `:330-376` | 125 |
| `AnimClappingHand` / `AnimClappingHand2` (Encore) | `battle_anim_effects_1.c` (the clap sprites) | `12 n - 1`, plus the N `soundtask_se1` SE_M_ENCORE rows the sprite plays (side arg 0 only) |
| `AnimReversalOrb` | `battle_anim_effects_3.c` | `2 d - 2` |
| `AnimSpinningSparkle` | `battle_anim_effects_1.c` (RunStored) | 16 (a first guess of 15 missed the RunStored install call) |
| falling rock (Fall Rock) | `battle_anim_rock.c` | 49 |
| `AnimThoughtBubble` | `battle_anim_effects_1.c:5490-5517` | `d + 18` |
| `AnimTauntFinger` | `battle_anim_effects_1.c:5606-5651` | 45 |
| `AnimLeechLifeNeedle` / linear stinger (`StartAnimLinearTranslation` shape) | `battle_anim_effects_1.c` | `d + 1` (init does not run the step; calls 1..D translate, D + 1 installs the stored callback, D + 2 destroys) |
| `gBasicHitSplatSpriteTemplate` / `create_basic_hitsplat_sprite`, animations 1..3 | `battle_anim_mons.c` hit splat, `gBasicHitSplatSpriteTemplate` | **10 (ROM-measured, see 20.3)**; animation 0 and a non-literal animation stay `{bound: 10}` |
| `gKarateChopSpriteTemplate`, `gJumpKickSpriteTemplate`, `gRockBlastRockSpriteTemplate` (`AnimTravelDiagonally` shape) | `battle_anim_effects_1.c`/`_2.c`/`_3.c` (per template) | `d + 1` (d = duration, >= 1) |
| `gMistBallSpriteTemplate` (`AnimThrowMistBall`, installs the callback from call 1) | `battle_anim_effects_1.c`/`_2.c`/`_3.c` (per template) | `d + 2` |
| `gRevengeSmallScratchSpriteTemplate` / `gRevengeBigScratchSpriteTemplate` | `battle_anim_effects_1.c`/`_2.c`/`_3.c` (per template) | 13 |
| `AnimTask_LeafBlade` / `create_leaf_blade_task` | `battle_anim_effects_1.c:3255-3466`, Step2 `:3476-3496`, trail callback `:3498-3512`, `AnimTranslateLinear` `battle_anim_mons.c:1111` | 136 |

Timing rules used. A callback chain that ends in `RunStoredCallbackWhenAnimEnds` over a regular anim of total T ticks: END at call T, the install at T + 1, the destroy at T + 2, so exact T + 1; a callback that checks `animEnded` itself (DestroyAnimSprite, AnimSpriteOnMonPos) gives exact T. `StartAnimLinearTranslation` with duration D: exact D + 1 (above); a callback installed by an intermediate function that itself runs in call 1 (AnimThrowMistBall) adds one more.

Leaf Blade (the one new task shape): the task entry only sets up the first arc and installs `AnimTask_LeafBlade_Step` (calls 1..). Seven arc states (0, 2, .., 12) of 11 calls each (`data[0] = 10`: ten translating calls, the 11th returns TRUE), six 0xFF holds of 6 calls (`++data[1] > 5`) and six one-call setup states (1, 3, .., 11) put the end of the last arc at call 119 and state 13 at call 120. Every arc call (77 of them) first creates a trail sprite (Step2) that flips every second callback call and dies on its 9th flip; `data[0] = (#trails before) & 1` picks the phase. The last trail (76 before, even phase) is created in call 119 and dies on its 18th callback call, i.e. iteration F + 137 before RunTasks; state 13 then sees `data[12] == 0` and destroys: gone **136** ticks after F. The first `waitforvisualfinish` therefore passes at F + 136 and frees the SE_M_LEER row behind it.

### 20.2 ROM windows (probe step mode, Scene ON, level 50, player attacker, friendship 0)

Fixtures `tools/audio/fixtures/aud242p-*-player.json`, labs `tools/battle-lab/aud242p-*-player-on.json`, stages `aud242p-*-player-on` in `tools/compare/appTrace.ts`, test `tests/aud242pMoveAnimSounds.test.ts` (ROM frame minus ours, per row, 0 = exact).

| window | rows (ids) | ROM - ours | reading |
|---|---|---|---|
| Encore | 222, 223 (10 rows) | -1 on all 10 | the clap SE rows are timed; a flat -1 on every row, not diagnosed further |
| Flatter | 223, 229 (3 rows) | -3, -3, 0 | SE223 is the known -3 (Flatter SE223 class); the two SE229 rows drift 3 frames against each other in the ROM. **Undiagnosed**, listed as a residual, not fitted |
| Reversal | 209, 217, 123 | +2, +2, +2 | the aud242a idle-lead class (#198) |
| Taunt | 186, 167, 194 (5 rows) | -4 on all | a flat presentation offset (the thought-bubble 63-tick and finger 45-tick waits and the anger-mark rows are exact among themselves) |
| Karate Chop | 135, 139 | 0, 0 | |
| Mist Ball | 129, 159, 246 | +2, +2, +2 | idle-lead class |
| Revenge | 152, 193, 123, 141 | -10 on all four | the opponent (Pound, priority 0 before Revenge) moves first and its body is not a live adapter in the engine; the inter-row gaps 75 / 17 / 10 are exact |
| Leaf Blade | 128 x3, 192 | 0 on all four | the SE_M_LEER row at 224 verifies the 136-tick task |
| Hi Jump Kick (aud242b windows, existing) | 113 / 117 rows | 0 | the former `romOnly` rows (113:123:63, 117:123:-63) are now emitted exactly; the `aud242bMoveAnimSounds` specs became `{ delta: 0 }` |

Hit splat animations 1..3 = 10: my derivation of the affine anim frame handling (`sprite.c`) gave 11 and was one tick wrong (it broke the aud242n Spark and aud242e Poison Tail windows); the ROM window of Poison Sting (animation 2) measures exactly 10 and the aud242n / aud242e windows agree, so 10 is the measured value and the affine derivation above it is not trusted.

### 20.3 What is emitted but cannot be seen, and what has no window

- Moves with no live presentation adapter never reach `emitMoveAnimSounds` (`liveMoveSourceAge` needs `liveMoveAnimationDuration(...) !== null`, `src/engine/liveMoveAnimation.ts`): **Poison Sting (40), Leech Life (141), Rock Smash (249), Jump Kick (26)** and the other adapterless moves emit nothing in the engine however complete the table row is. Their table rows are now fully timed (Poison Sting 8 ops, Rock Smash 2) but that is invisible to T1 / T2; the labs and fixtures that I built for Poison Sting / Leech Life produced no engine SE and were removed. Adding a live adapter is presentation work (out of scope here).
- **Disable** (55 % accuracy) and **Rock Blast** (90 %): no window is possible, because the engine stage RNG differs from the lab seed. Disable is emitted from the same C ports without a ROM window; Rock Blast is not engine-visible.

### 20.4 Counts, census, T2

| | before (`67a98cf93` table) | after (`ffbccb113`) |
|---|---|---|
| all moves: ops resolved / unresolved (turn 0, player attacker) | 964 / 160 | 1008 / 125 |
| all-moves ops in the table | 1202 | 1247 |
| L50 (276 moves): emitted / gated | 760 / 86 | 785 / 70 |
| table: distinct variants | 367 | 370 |

Moves changed in the table: Encore, Flatter, Disable, Reversal, Taunt, Leech Life, Poison Sting, Rock Smash, Karate Chop, Jump Kick, Hi Jump Kick, Revenge, Mist Ball, Rock Blast, Leaf Blade.

T1 census (seeds 0..99 Scene ON; base arm `on-67eacbe83`, final arm `on-ffbccb113`, each scored inside its own tree): exact 25,795 -> **25,840**, **missing-gated 122 -> 95**, extra 0, missing-other 51, missing-declined 1, unclassified 128 unchanged. `rst197CensusDelta.py`: 100 / 100 battles identical (events digest and commands). The arm-vs-arm sound delta: 13 seeds change, all sequence changes by added rows (SE123, SE229 both pans, SE170, SE192, SE222, SE223), none removed.

T2 (Scene ON, the 21 aligned seeds; ROM side unchanged, only the engine replay regenerated, no ROM run): move-animation SE exact / offset / missing / extra **286 / 3592 / 113 / 0 at the aud242o head -> 288 / 3627 / 76 / 0** (the aud251 measurement at an older engine was missing 206). Stat-change, cry and battle-controller rows unchanged.

Frame hashes: `npm run compare:differential -- <Encore, Leaf Blade, Revenge player Scene ON traces> --base 67a98cf93 --harness-from-head`: 240 / 240 captures byte-identical.

### 20.5 Remaining top missing-gated census moves and what each one is

| move | gated | class | blocker |
|---|---|---|---|
| Dynamic Punch | 10 | `waitsound` SE length | `waitsound` after SE_M_VITAL_THROW2: `seBound` has only an upper bound of the track; 50 % accuracy, so no window either |
| Extrasensory | 8 | unresolved task lifetimes | `AnimTask_BlendMonInAndOut`, `AnimTask_ExtrasensoryDistortion` |
| Secret Power | 8 | branch dimension | a script branch the table cannot take statically; not examined in detail |
| Heal Bell | 8 | unresolved sprite lifetimes | `gBellSpriteTemplate`, `gHealBellMusicNoteSpriteTemplate`, `gThinRingExpandingSpriteTemplate` and the palette-blend task |
| Ice Ball | 6 | per-battle counter | the same counter dimension as Rollout (the next counter candidate) |
| Fury Cutter | 6 | per-battle counter + branch | `AnimTask_GetFuryCutterHitCount` and `IsFuryCutterHitRight` |
| Soft Boiled | 5 | lifetimes + `setarg` | `gSoftBoiledEggSpriteTemplate` and `setarg 7, 0xFFFF` before the wait |
| Eruption | 4 | unresolved task | `AnimTask_EruptionLaunchRocks` |

Other single-blocker live moves not yet ported: Recycle, Milk Drink, Pain Split, Air Cutter, Smelling Salt, Will-O-Wisp, Needle Arm, Extreme Speed, Luster Purge. Torment's `AnimTask_TormentAttacker` plays SE_M_METRONOME from inside the task (a task-internal SE op). No pan or id difference was found in any of the windows above: every remaining difference is an offset class (idle-lead +2, Flatter -3, Revenge -10 from the non-live opponent body, Taunt -4, Encore -1) or a missing lifetime.

## 21. aud242q: Fury Cutter, Ice Ball, Secret Power / Strength, Extrasensory, Super Fang, Rage (T1 family 1, slice 16)

Base `df38eca58` (the aud242p table). Code: `tools/extract/extract-anim-sound-timing.ts` only (plus the regenerated `src/data/gen/anim-sound-timing.json`); no sound-side resolver change was needed.

### 21.1 What was ported

| item | C | rule |
|---|---|---|
| `BATTLE_ENVIRONMENT_*` constants | `include/constants/battle.h` | now parsed into the script constants |
| `AnimTask_GetBattleEnvironment` (Secret Power -> Strength / Rock Smash / ... branch) | `battle_anim_mons.c`, `battle_anim_scripts.s` Move_SECRET_POWER 9643 | writes `gBattleAnimArgs[0]`; the Factory's `gBattleEnvironment` is `BATTLE_ENVIRONMENT_BUILDING` (8; the engine's rules context pins it, `factoryBattleScriptDecision.ts:362`), so the Strength branch is taken |
| `AnimTask_GetIceBallCounter` (arg index = script arg 2), `AnimTask_GetFuryCutterHitCount`, `AnimTask_IsFuryCutterHitRight` | `battle_anim_effects_*.c` | indexed `gBattleAnimArgs` write from the Rollout counter slot (`counterGrids` machinery); `jumpargeq` now compares its first argument against the index the task wrote (it was hard-wired to arg 7) |
| `AnimTask_ShakeAndSinkMon` | `battle_anim_mon_movement.c:316-348` | the entry runs the step once; destroyed in call D - 1 (D = script arg 6): exact D - 2 |
| `AnimTask_BlendMonInAndOut` | `battle_anim_mons.c:1714-1768` | func-only entry; a step fires every max(delay, 1) calls, coeff up-fires then coeff down-fires per repeat, the last down-fire destroys: exact 2 * coeff * times * delay - 1 (Extrasensory 23, Super Fang 95) |
| `AnimTask_ExtrasensoryDistortion` | `battle_anim_psychic.c:954-1050` | 24 case-0 calls, case 1, destroy in call 26: exact 25 |
| `AnimTask_TransparentCloneGrowAndShrink` | `battle_anim_psychic.c:1052-1117` | 12 + 12 step calls, two cleanup states, destroy in call 26: exact 25 |
| argument splitting | the extractor's `splitArgs` | a plain `split(",")` cut `RGB(27, 27, 0)` into three arguments and shifted every later argument of the command (BlendMonInAndOut's coeff / delay / times). Splitting on top-level commas fixes it, and also resolves Super Fang (`RGB(31, 6, 1)`); Rage resolves through the BlendMonInAndOut lifetime (delay 0 fires every call, like delay 1; not ROM-windowed). Only the commands that carry an `RGB(...)` change |

Ice Ball and Fury Cutter produce identical events for all five counters, so no counter grid is emitted for them (`counterGrids` still has the Rollout entry only); Fury Cutter's SE136 row sits at frame 6 on every hit count, Ice Ball's SE137 / SE198 at 6 / 36.

Moves that resolve (gated 1..3 -> 0 at turn 0, player): Ice Ball, Fury Cutter, Secret Power, Strength, Extrasensory, Super Fang, Rage.

### 21.2 ROM windows (probe step mode, Scene ON, level 50, player attacker, friendship 0)

Fixtures `tools/audio/fixtures/aud242q-*-player.json`, labs `tools/battle-lab/aud242q-*-player-on.json` (`AUD242_FRIENDSHIP=0 AUD242_LAB_PREFIX=aud242q tools/audio/makeAud242bLabs.py name:player:move`; Ice Ball is the aud242o Rollout five-turn lab with the move changed), stages `aud242q-*-player-on` in `tools/compare/appTrace.ts`, test `tests/aud242qMoveAnimSounds.test.ts` (ROM frame minus ours per row; 0 = exact). Recipe as section 14 (`AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`, `--frames 700`, Ice Ball `--frames 3000`).

| window | rows (ids) | ROM - ours | reading |
|---|---|---|---|
| Fury Cutter | 136 | +2 | the aud242a idle-lead class (#198); the branch-resolved row is timed |
| Secret Power | 152, 141 x3 | +2 on all four | the idle-lead class; the ROM plays the Strength body (SE152, three SE141 at +47 / +53 / +59), which verifies `BATTLE_ENVIRONMENT_BUILDING` in the lab and the ShakeAndSink lifetime |
| Extrasensory | 170, 170, 192 | +3 on all three | idle-lead class; the 26-tick gaps between the three rows are exact in the ROM (the BlendMonInAndOut / ExtrasensoryDistortion / TransparentClone lifetimes above) |
| Super Fang | 171, 161 | -1, -1 | the 162-tick gap between the two rows is exact in the ROM; the flat -1 is not diagnosed further |
| Ice Ball x 5 turns (Lv100 Defense Curl target) | 137, 198 on each turn | turn starts 9 / 21 / 38 / 64 / 95, gap 30 on every counter | SE137 -> SE198 is 30 in the ROM on all five counters (counter 5's BG_ICE load lag does not change it), so the table needs no counter dimension; the turn-start drift is presentation, not sound (same class as the aud242o Rollout five-turn drift 9 / 22 / 37 / 57 / 86) |

Strength itself (move 70) has no live presentation adapter (`liveMoveAnimationDuration` null), so it never reaches `emitMoveAnimSounds`: its window produced no engine row and was removed; the Secret Power window is the Strength-body proof.

### 21.3 Counts, census, T2

| | before (`df38eca58` table) | after |
|---|---|---|
| all moves: ops resolved / unresolved (turn 0, player attacker) | 1008 / 125 | 1021 / 115 |
| all-moves ops in the table / distinct variants | 1247 / 370 | 1257 / 372 |
| L50 (276 moves): emitted / gated | 785 / 70 | 794 / 64 |

T1 census (seeds 0..99 Scene ON, `soundCensusDelta.py --t1`, each arm scored inside its own tree; base arm `on-df38eca58`, final arm `on-44abf84b8`): exact 25,840 -> **25,894**, **missing-gated 95 -> 65**, missing-other 51, missing-declined 1, unclassified 128 unchanged. `extra` is 109 in BOTH arms (Double Team SE239 rows; first seen at the base commit, not caused by this step: the aud242p arm `on-ffbccb113` had extra 0, so it came in with the ais1 / ais2 / pin1 engine changes between `ffbccb113` and `df38eca58`). `rst197CensusDelta.py`: 100 / 100 battles identical (`commands`, `eventsDigest`).

T2 (Scene ON, the 21 aud251 seeds, fresh `aud248RunSeed.sh` ROM runs at this head, then the base tree re-scored against the same ROM files with `aud249Rescore.sh`): move-animation SE exact / offset / missing / extra **287 / 3628 / 76 / 0 -> 287 / 3628 / 76 / 0**. None of the moves ported here occur in the 21 seeds, so T2 cannot move; the stat-change row is 13 / 72 / 0 / 0 in both (the aud242p numbers 288 / 3627 / 76 / 0 and 14 / 56 / 15 / 0 belong to the engine before the ais changes).

Frame hashes: `npm run compare:differential -- <Fury Cutter, Secret Power, Extrasensory player Scene ON traces> --base df38eca58 --harness-from-head` (captures 60..492 step 8): 165 / 165 byte-identical.

### 21.4 Remaining top missing-gated census moves

| move | gated | blocker |
|---|---|---|
| Dynamic Punch | 10 | `waitsound` after SE_M_VITAL_THROW2 (exact SE length not modelled; 50 % accuracy, no window) |
| Heal Bell | 8 | `gBellSpriteTemplate`, `gHealBellMusicNoteSpriteTemplate` (x12), `gThinRingExpandingSpriteTemplate` (AnimSpriteOnMonPos over a 30-tick affine anim, END_ALT) |
| Soft Boiled | 5 | `gSoftBoiledEggSpriteTemplate` (two eggs wait on `gBattleAnimArgs[7] == 0xFFFF`, set by `setarg 7, 0xFFFF` in the script: both die in the iteration after the setarg, the second callback for data[7] == 0) and the two thin rings. The egg chain (about 56 + 21 + 60 + 57 ticks) is only about 9 ticks inside the setarg time (215 - 12 = 203), so it needs an exact affine-loop simulation and a ROM window before it is safe |
| Eruption | 4 | `AnimTask_EruptionLaunchRocks` (pic-dependent rock state machine) |
| Memento / Moonlight / Spike Cannon / Curse | 4 each | not examined |

## 22. aud242r: Heal Bell, Spike Cannon, Eruption, Moonlight, Curse (Ghost)

Step aud242r (Audio S11, ISSUES #219 family 1) ports the sprite / visual-task lifetimes behind five more gated census moves into `lifetimeOf` (`tools/extract/extract-anim-sound-timing.ts`). Every number is derived from the C (`reference/pokeemerald`), none is fitted; each move has a committed ROM window (`tools/audio/fixtures/aud242r-<move>-player.json`, `tests/aud242rMoveAnimSounds.test.ts`) that pins the ROM-minus-ours offset as a flat delta. Inter-row gaps are exact in every window.

### 22.1 Lifetimes (ticks after F, section 8 numbering)

| lifetime | C | exact |
|---|---|---|
| `gBellSpriteTemplate` (Heal Bell) | `gBellAnimCmds` `battle_anim_effects_2.c:848-862` (6 6 15 6 6 6 15 6 6 6 15 6 6 = 105) under `AnimSpriteOnMonPos` `battle_anim_mons.c:1515-1536` | 105 |
| `gThinRingExpandingSpriteTemplate` / `gBlendThinRingExpandingSpriteTemplate` | `AnimBlendThinRing` `battle_anim_effects_1.c:2551-2575`, `gThinRingExpandingAffineAnimCmds1` `:710-716` (0-duration frame, then 30), `sprite.c:1055-1112, 1165-1178, 1330-1345` | 31 |
| `gHealBellMusicNoteSpriteTemplate` | `AnimHealBellMusicNote` `battle_anim_effects_2.c:3053-3065` (D = `gBattleAnimArgs[4]`), `StartAnimLinearTranslation` | D + 1 |
| `gSparklingStarsSpriteTemplate` | `AnimSparklingStars` `battle_anim_effects_1.c:4115-4150` (D = `gBattleAnimArgs[5]`), the AnimGrantingStars shape | D + 1 |
| `AnimTask_WindUpLunge` (Spike Cannon) | `battle_anim_mon_movement.c:637-690`, a3 + a4 + a6 - 1 | per args |
| `gHandleInvertHitSplatSpriteTemplate` / `create_handle_invert_hitsplat_sprite` | `battle_anim_normal.c:1036-1047`, then the AnimHitSplatBasic lifetime | 10 |
| `AnimTask_EruptionLaunchRocks` (Eruption) | `battle_anim_fire.c:796-1013`, `PrepareEruptAnimTaskData` / `UpdateEruptAnimTask` `battle_anim_mons.c:1958-1991`; `PrepareBattlerSpriteForRotScale` makes the battler double-affine, so `centerToCornerVecY` is -64 (`sprite.c:687-700`); the rocks' flight is simulated per pic-Y class (`PicContext`, same grid mechanism as aud242l) | `max(77, 43 + slowest rock) - 1`, two classes |
| `AnimTask_AlphaFadeIn` (Moonlight) | `battle_anim_mons.c:1654-1715`: a step every `a4 + 1` calls, odd steps move coefficient 1, even steps coefficient 2, destroy when both reach their targets | `(a4 + 1) * steps - 1` (63 for `0, 16, 16, 0, 1`) |
| `AnimTask_MoonlightEndFade` | `battle_anim_effects_1.c:5003-5115` with `BeginNormalPaletteFade` / `UpdateNormalPaletteFade` / `IsSoftwarePaletteFadeFinishing` (`palette.c:156-203, 406-489, 807-826`): first fade clears `active` at F + 21, state 2 counts 31 calls, the second fade (18 passes + 4 finishing) ends at F + 74 | 74 |
| `gMoonSpriteTemplate` / `gMoonlightSparkleSpriteTemplate` | `AnimMoon` / `AnimMoonlightSparkle` `battle_anim_effects_1.c:4946-5100`: wait for the end-fade task's state-1 call (`data[0] = 1`) and are destroyed by `AnimateSprites` of F + 22 of that task | tied to the task: `(taskF + 22) - spriteF` (the creating walk resolves them when `AnimTask_MoonlightEndFade` is created) |
| `AnimTask_CurseStretchingBlackBg` | `battle_anim_ghost.c:945-1042`: Step1 calls 1..16 grow the window, call 17 runs `BeginNormalPaletteFade(mask, 0, 16, 16, black)` (start == target: BG pass in the Begin, OBJ pass sets `softwareFadeFinishing`, 4 counter iterations, clear on the 5th), Step2 destroys | 22 |
| `gCurseNailSpriteTemplate` | `AnimCurseNail` `battle_anim_ghost.c:1044-1120`: 60 count-down calls, three 4-call moves separated by 40-call waits (calls 61..152), `WaitAnimForDuration` 30 + the stored-callback swap (153..183), Step2 arm (184) + 16 blend steps of 3 calls (187..232), End destroys at 233 | 232 |

### 22.2 ROM windows (ROM frame - our frame; Scene ON, player attacker, `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette`, stepping probe)

| move | fixture / ids | rows | offset | note |
|---|---|---|---|---|
| Heal Bell | `aud242r-healbell-player` SE195 / SE228 / SE102 | 5 | -4 flat | status-move class (ROM earlier than ours) |
| Spike Cannon | `aud242r-spikecannon-player` SE160 / SE166 | 6 | +9 flat | multi-hit class (section 3) |
| Eruption | `aud242r-eruption-player` SE178 / SE131 | 14 | +2 flat | idle-lead class (Fury Cutter / Secret Power) |
| Moonlight | `aud242r-moonlight-player` SE211 / SE179 | 2 | -4 flat | status-move class; the 257-frame gap between the rows is exact (BlendPalette hooks: entry 1303, y 0..16 on 1303..1319, second Begin 1355, destroy 1377) |
| Curse (Ghost) | `aud242r-curse-player` SE170 x3 / SE121 | 4 | +1 flat | Misdreavus (species 200, `TYPE_GHOST`) on a Lv12 Rattata; the NIGHTMARE row is gated by the nail, its 93-frame gap after the last BIND is exact |

The Heal / Moonlight labs use the aud242k recover lab's two-turn trace (a heal move fails at full HP). The Curse stage (`aud242r-curse-player-on`) overrides the attacker's types to Ghost so the engine takes `BattleScript_GhostCurse` (gAnimMoveTurn 0 = CurseGhost), like the ROM's real Misdreavus.

Two first models were wrong and are recorded: Eruption with `centerToCornerVecY` -32 gave a 5-tick shorter task (the ROM hook showed the rock at y = 103); the double-affine -64 fixed it. Zero-duration affine frames appear to cost one extra call versus the plain "sum of durations" rule (the Thin Ring row above); this may be related to the undiagnosed Flatter SE229 drift, not investigated here.

### 22.3 Counts (before = the `19078a38b` table, after = this step's head)

| | before | after |
|---|---|---|
| all moves: ops resolved / unresolved (turn 0, player attacker) | 1021 / 115 | 1032 / 104 |
| unresolved by reason | unmodelled-lifetime 109, unresolved-branch 1, waitsound 5 | unmodelled-lifetime 98, unresolved-branch 1, waitsound 5 |
| all-moves ops in the table / distinct variants | 1257 / 372 | 1280 / 378 |
| L50 (276 moves): emitted / gated | 794 / 64 | 805 / 53 |

T1 census (seeds 0..99 Scene ON, `soundCensusDelta.py --t1`, each arm scored inside its own tree; base arm `on-19078a38b`, final arm `on-161c1958c`): exact 25,894 -> **25,948**, **missing-gated 65 -> 41**, missing-other 51, missing-declined 1, unclassified 128, extra 109 in BOTH arms (the Double Team SE239 rows from aud252, not this step). `rst197CensusDelta.py`: 100 / 100 battles, 31,470 commands, `eventsDigest` identical, bad 0; `soundCensusDelta.py` arm-vs-arm: 8 seeds with added SE rows only (no removed or moved rows). The aud242q census arm `on-44abf84b8` was NOT reusable as the base: master gained engine changes between it and `19078a38b` (commands differ), so a fresh base arm was built.

Frame hashes: `npm run compare:differential -- <Curse, Moonlight, Eruption player Scene ON traces> --base 19078a38b --harness-from-head --summary`: 155 / 155 captures byte-identical (44 + 57 + 54).

### 22.4 Remaining missing-gated moves

| move | gated | blocker |
|---|---|---|
| Dynamic Punch | 10 | `waitsound` after SE_M_VITAL_THROW2 (SE length not modelled; 50 % accuracy, no window); declined again |
| Soft Boiled | 5 | `gSoftBoiledEggSpriteTemplate` (needs `setarg 7, 0xFFFF` plus the exact affine-loop simulation; lab `aud242r-softboiled-player-on.json` is written but there is no probed window, so nothing is ported) |
| Memento | 4 | `AnimTask_MoveAttackerMementoShadow` (pic-dependent shadow tasks, not derived) |
| Air Cutter | 4 | not examined |
| Torment | 4 | not examined |
| Cosmic Power | 3 | not examined |
| Fake Out / Recycle | 2 each | not examined |

Census top missing-gated moves after this step (`t1-161c1958c`): Dynamic Punch 10, Soft Boiled 5, Memento 4, Air Cutter 4, Torment 4, Cosmic Power 3, Fake Out 2, Recycle 2 (41 in total). Curse (4) and Moonlight, Heal Bell, Spike Cannon, Eruption (all gone from the list) are resolved. Curse's non-Ghost body (`CurseStats`): `AnimTask_DrawFallingWhiteLinesOnAttacker` is listed as an unmodelled lifetime but no SE follows it, so no census row is gated by it.

## 23. aud257: Cosmic Power (AnimTask_BlendNonAttackerPalettes), Sweet Kiss (gAngelSpriteTemplate)

Extractor changes in `lifetimeOf` (`tools/extract/extract-anim-sound-timing.ts`); `npm run extract:anim-sound-timing` changes only moves 322 and 186 of `anim-sound-timing.json`.

- **AnimTask_BlendNonAttackerPalettes** (`battle_anim_utility_funcs.c:725-739`): the task shifts `gBattleAnimArgs` up by one (:735-736) and runs StartBlendAnimSpriteColor, so the script's delay / initial_y / target_y are `args[2..4]` and the lifetime is `blendAnimPalLength(delay, start, target)`, the same Step2 as AnimTask_BlendBattleAnimPal. Cosmic Power (`Move_COSMIC_POWER`, `battle_anim_scripts.s:9061`) waits on it with `waitforvisualfinish`, then runs the bg fade / slide and `delay 70`; SE 228 (SoundTask_PlaySE1WithPanning, pan -64) is now ungated at frame 128, after the two SE 243. ROM window (Scene ON, player): `tools/audio/fixtures/aud257-cosmicpower-player.json` (243 at 64 twice, 228 at 189 pan -64, 239 at 308): 125 frames from first 243 to 228, as the table. Engine rows sit a flat +5 after the ROM's (presentation offset). Pinned by `tests/aud257CosmicPowerSounds.test.ts` (table entry + engine rows vs the fixture). Stage `aud257-cosmicpower-player-on` in `tools/compare/appTrace.ts`, lab `tools/battle-lab/aud257-cosmicpower-player-on.json`.
- **gAngelSpriteTemplate** (`AnimAngel`, `battle_anim_effects_2.c:3516-3540`): the template callback has no init stage; `data[0]` counts every call and DestroyAnimSprite runs at `data[0] > 100`. Lifetime `{ exact: 99 }`, checked against the ROM's Sweet Kiss rows (SE 226 lands 50 frames after the third Heal Bell). It resolves the `waitforvisualfinish` that gated SE_M_ATTRACT 226 (frame 106 after the three Heal Bells at 6 / 31 / 56). `Move_SWEET_KISS` is ungated. Pinned in the same test file (table entry). Evidence: T2 seed 830 (226 row removed, offset -12).
- **Not done:** the Soft-Boiled egg (`gSoftBoiledEggSpriteTemplate`) still needs a deferred lifetime resolved at `setarg 7, 0xFFFF` and a bound on when the egg reaches its last affine step (`gSoftBoiledEggAffineAnimCmds3`, LOOP(0) then LOOP(1)); the loop-count semantics of `sprite.c` were read but the arrival bound was not settled, so nothing is ported. Soft Boiled stays gated (5 census rows, T2 seed 1028 179 x2).

T1 census 0..99 Scene ON: missing-gated 38 / missing-other 54 -> 51 (Cosmic Power's three rows are now emitted). T2 numbers and the sound-only proof are in docs/aud251-s11-scoreboard-refresh.md (aud257).

## 24. aud258: Seismic Toss (damage level), Torment (AnimTask_TormentAttacker), Shock Wave (charging particles, orb, progressing bolt)

Extractor changes in `tools/extract/extract-anim-sound-timing.ts` (`lifetimeOf`, the createvisualtask event walk, three small shape functions) and one runtime op in `src/engine/moveAnimSounds.ts`; `npm run extract:anim-sound-timing` changes moves 69, 259 and 351 of `anim-sound-timing.json` (356 moves, 386 variants). L50 emitted / gated 807 / 51 -> **821 / 47**, all-moves resolved ops 1034 -> 1048 (distinct variants 378 -> 386). Call numbering throughout is the one of ElectricBolt / Torment: the entry is call 0, RunTasks calls 1.., an SE on call c sits at script frame + c - 1 and a task destroyed on call c has the lifetime c - 1; a sprite `CreateSprite`d by a task on call c first runs in the next frame (BattleMainCB2 runs AnimateSprites before RunTasks, so the task sees the sprite's destruction in the same call).

- **Seismic Toss** (`Move_SEISMIC_TOSS`, 9 T2 rows): `AnimTask_MoveSeismicTossBg` is `{ exact: 119 }`; the `jumpreteq` on `AnimTask_GetSeismicTossDamageLevel` (`battle_anim_rock.c:836-846`: gAnimMoveDmg < 33 -> 0, 33..65 -> 1, > 65 -> 2) is resolved per level (the extractor's `keepsRet` keeps the return value across the two bg tasks). The table gets a damage grid (`damageGrids`, a third dimension next to the pic and counter grids) and the runtime picks the level from `request.damage`: Weak SE 238@31, 214@151, 131@169; Medium 238@31, 214@151, 131@167, 214@183; Strong 238@31, 131@151, 214@163, 131@175, 214@187. A Lv50 attacker is Medium, a Lv12 attacker (the labs' opponents) Weak, a Lv100 attacker Strong.
- **Torment** (`Move_TORMENT`, 8 rows): `AnimTask_TormentAttacker` (`battle_anim_effects_3.c:1892-2004`, `sAffineAnims_Torment` :435-441, `gThoughtBubbleSpriteTemplate` `battle_anim_effects_1.c:2035-2079`) is `{ exact: 128 }` and plays SE_M_METRONOME (186) on its state-0 calls 1, 26, 51, 66, 81, 96 (cycles of 25 / 25 / 15 / 15 / 15 calls); the two SE 194 after the wait follow at frames 135 and 157.
- **Shock Wave** (`Move_SHOCK_WAVE`, 18 rows): the table was gated at the first `waitforvisualfinish` after the charge SE; three lifetimes and one task open it.
  - `AnimTask_ElectricChargingParticles` (`battle_anim_electric.c:805-896`, restricted to Shock Wave's argument set 20 / 0 / 2 so Charge, 60 / 2 / 12, stays as it was): a particle per call (interval 0), duration 40 - 5 * data[8] (data[8] steps every 2 particles to 6), each particle lives call + 8 + D (anim 0 is 4 x 1 tick, AnimElectricChargingParticles at sprite call 6, AnimTranslateLinear calls 7.., `battle_anim_mons.c:1065-1139`); the task waits for data[7] == 0: destroyed on call 50, `{ exact: 49 }`.
  - `gGrowingShockWaveOrbSpriteTemplate` (:1135-1150): affine anim 2 (a duration-0 frame, two 30-tick frames), `{ exact: 61 }`.
  - `AnimTask_ShockWaveProgressingBolt` (:1153-1266): simulated by `shockWaveBoltShape(attackerY)`: five sweeps of one bolt sprite per call (13 ticks each), y from the attacker's BATTLER_COORD_Y_PIC_OFFSET up to 4, down to 68, ..., five-call pauses (and the data[11] = 12 countdown) between them. The task is destroyed 13 calls after the last bolt; the SE_M_THUNDERBOLT (118) plays on the 8th call of the two down sweeps. The attacker pic Y makes the first sweep 2 calls longer per 16 pixels, so the move is a pic-grid move (three variants: 362 / 363 / 364 for back pic Y 88..92 / 93..100 / 101..104, one SE gap of 70 / 71 / 72 frames after the charge SE). The new op `task_shockwave_bolt` carries the SE ordinal; the runtime row (`shockWaveBoltRows`) computes the pans (`animSoundPan(-64)` plus 1 and 2 times `trunc((animSoundPan(63) - pan) / 3)`: -22 / 20 for a player attacker, 21 / -21 for an opponent attacker).
  - SE_M_TRI_ATTACK2 (221, `SOUND_PAN_TARGET`) follows the wait. `AnimTask_ShockWaveLightning` (the last wait, no SE after it) is left unmodelled: it needs the target's BATTLER_COORD_Y and nothing in the table depends on it.
- **ROM windows** (probe step mode, Scene ON, `AUDIO_PROBE_EXTRA_HOOKS=BlendPalette python3 tools/run-mgba-probe.py --rm-log-on-success OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json lab tools/battle-lab/<lab>.json --frames 700 --profile on --compact`; labs by `AUD242_LAB_PREFIX=aud258 python3 tools/audio/makeAud242bLabs.py name:player:moveId[:attackerSpecies:otherSpecies]`, stages in `tools/compare/appTrace.ts`, fixtures `tools/audio/fixtures/aud258-*.json`, test `tests/aud258MoveAnimSounds.test.ts`):

| Window | ROM rows (frame relative to the first) | ROM minus ours |
| --- | --- | --- |
| Seismic Toss Weak (aud242a swordsdance-opponent, aud242b haze-player, aud242e counter-player) | 238, 214 +120, 131 +138 | 1 / 2 / 0 (the opening SE's own offset, the same on every row) |
| Seismic Toss Medium (`aud258-seismictoss-player`, Lv50 vs Lv12) | 238, 214 +120, 131 +136, 214 +152 | 0 |
| Seismic Toss Strong (`aud258-seismictossstrong-player`, Lv100 vs Lv12) | 238, 131 +120, 214 +132, 131 +144, 214 +156 | 0 |
| Torment (`aud258-torment-player`) | 186 +0 / 25 / 50 / 65 / 80 / 95, 194 +129 / +151 | -4 (every row) |
| Shock Wave, Rattata back pic (101, `aud258-shockwave-player`) | 213, 118 +72 (pan -22), 118 +100 (20), 221 +129 | 0 |
| Shock Wave, Blaziken back pic (88, `aud258-shockwavelow-player`) | 213, 118 +70, 118 +98, 221 +127 | 0 |

The Shock Wave windows verify the particle / orb / bolt lifetimes and the pic-Y dependence on both ends of the grid. Torment's -4 is a constant over the whole window (the ROM gaps are exact), so it is the idle-lead / action-transition class (#198), not a lifetime error.

T1 census 0..99 Scene ON: exact 26,060 -> 26,079, missing-gated 38 -> 33, missing-other 51, extra 0. T2 numbers and the sound-only proof are in docs/aud251-s11-scoreboard-refresh.md (aud258).

## 25. aud259: Soft-Boiled egg, Block X, Dynamic Punch (`waitsound`), Fake Out, Crabhammer

Every lifetime is ported from the C (file:line below), not fitted; each new row has a ROM window (probe step mode) and a Tier-1 pin in `tests/aud259MoveAnimSounds.test.ts` with its ROM-minus-ours offset. L50 emitted / gated 821 / 47 -> **832 / 39**; all-moves resolved ops (turn 0, player attacker) 1048 -> **1059**.

- **Soft Boiled** (`gSoftBoiledEggSpriteTemplate`): the script's `setarg 7, 0xFFFF` makes the wait follow the egg's own arrival (`AnimSoftBoiledEgg_Step4`, simulated for the lifetime), so SE 179 (the egg landing, pan 63) is resolved at frame 217 after SE 167 (12) and 166 (143). T2 seed 1028 was the ROM window (SE 179 x2).
- **Block** (T2 seed 165 res17: SE 205 x2 + 192): `gBlockXSpriteTemplate` (`AnimBlockX` / `AnimBlockX_Step`, battle_anim_effects_3.c:4878-4953) is a local static, so the probe's `via` only names the nearest preceding global (`AnimTask_MonToSubstitute`). The X lands on call ceil(144 / 10) = 15 (attacker opponent) or ceil(96 / 10) = 10 (player attacker), SKETCH again 32 calls later (ceil(128 / 4)), LEER ceil(128 / 6) + 9 = 31 calls after that; pan `SOUND_PAN_TARGET`. Variants: player attacker 205 @ 12 / 44, 192 @ 75 (plus the 193 at 3), opponent attacker 17 / 49 / 80.
- **Dynamic Punch** (`waitsound` after SE_M_VITAL_THROW2): new `seExact` in the extractor resolves `Cmd_waitsound` (battle_anim.c:1635-1661) from the m4a tick loop (`MPlayMain` m4a_1.s:1150-1370, `ply_tempo` :920-930, `ply_fine` :750-777, `MPlayStart` m4a.c:634-637, `IsSEPlaying` sound.c:606-613): both tracks read FINE at tick 25, the tick-26 status goes PAUSE, and at TEMPO 220 (tempoI 150 until the TEMPO read in tick 1) MPlayMain reaches it in VBlank 19, so the script resumes 19 iterations after the SE: SE 123 @ 18, then SE 177 @ 37 / 45 / 53 / 61 / 69 (pan 63). Only a single `playse` with an exact length is resolved; `loopsewithpan` and an unknown song keep the bound.
- **Fake Out** (`AnimTask_FakeOut`, battle_anim_effects_2.c:3080-3131): the entry only sets Step1; data[0] += 13 / data[1] -= 13 from 0 / 240 until data[0] >= data[1] (13k >= 240 - 13k: k = 10, call 10 installs Step2); Step2 counts data[10] from call 11, the BlendPalettes at 5, and destroys the next call (16): exact 15, so SE 205 (pan 63) follows the FLATTER by 16 frames.
- **Crabhammer**: the first wait is on `gWaterHitSplatSpriteTemplate` (battle_anim_normal.c:191-200), the same `AnimHitSplatBasic` (:1006-1018) as the basic splat, animation 0 = `sAffineAnim_HitSplat_0` (:134-138, one 8-tick frame). Anims 1..3 (a zero-duration frame, then the same 8-tick frame) were already exact 10; the zero-duration frame adds no tick, so anim 0 is the same exact 10, and the ROM window below confirms the 27-frame gap. This also lets the loop SE 142 (`loopsewithpan`, 3 x 20) resolve at frame 36.
- Harness (not game code): `midBattleSwitchStage` gained `rngSeed` (default 1; the staged battle's 50%-accuracy Dynamic Punch missed in the engine at seed 1 while the ROM lab hits, so that window uses seed 2) and `firstTurn` (both battlers' `isFirstTurn` 1, else Fake Out fails in the engine's staged mid-battle state).

| Window | ROM rows (frame relative to the first) | ROM minus ours |
| --- | --- | --- |
| Soft Boiled (`aud259-softboiled-player`, the second turn's heal) | 167, 166 +131, 179 +205 | -5 |
| Block, player attacker (`aud259-block-player`) | 193, 205 +9, 205 +41, 192 +72 | -3 |
| Block, opponent attacker (`aud259-block-opponent`) | 193, 205 +14, 205 +46, 192 +77 | -3 |
| Dynamic Punch (`aud259-dynamicpunch-player`) | 123, 177 +19 / +27 / +35 / +43 / +51 | +5 (first five rows; the fifth SE 177 falls after the engine's presented window, the census's "after the command's last presenting frame" class) |
| Fake Out (`aud259-fakeout-player`) | 229, 205 +16 | +4 |
| Crabhammer (`aud259-crabhammer-player`) | 123, 142 +27 / +47 / +68 | 0 |

The constant offsets are the idle-lead / action-transition class (#198), not lifetime errors (the ROM gaps are exact).

### 25.1 Deferred (measured or read, not committed)

- Closed in aud260 (section 26): Air Cutter, Recycle, Glare (including the +2-frame LEER), Brick Break turn 2, Will-O-Wisp. Air Cutter closed in aud260 too. Still open: **Memento** (needs `BATTLER_COORD_ATTR_TOP`, the species sprite size), see 26.1.

T1 census 0..99 Scene ON: exact 26,079 -> 26,100, missing-gated 33 -> 15 (Memento 4, Air Cutter 4, Recycle 2, Glare 2, Brick Break 2, Will-O-Wisp 1), missing-other 51 -> 53 (Dynamic Punch's fifth SE 177, after the last presenting frame), extra 0. T2 and the sound-only proof are in docs/aud251-s11-scoreboard-refresh.md (aud259).

## 26. aud260: Brick Break turn 2, Glare, Will-O-Wisp, Recycle, Air Cutter; sound-only tail for move animations

Every lifetime is ported from the C (file:line below), not fitted, except the Glare LEER lag split (measured, see below); each new row has a ROM window (probe step mode, labs `tools/battle-lab/aud260-*.json`, fixtures `tools/audio/fixtures/aud260-*.json`) and a Tier-1 pin in `tests/aud260MoveAnimSounds.test.ts` with its ROM-minus-ours offset. L50 emitted / gated 832 / 39 -> **839 / 35** (`factory-animation-inventory.json` level50 moves, turn 0, player attacker).

- **Move-animation sound-only tail** (Dynamic Punch's fifth SE 177): `Cmd_end` waits for gAnimSoundTaskCount and `waitsound` (battle_anim.c:482), so an SE past the command's last presenting frame still plays; the aud259 T1 census had 53 of them in 0..99 ("after the command's last presenting frame"). `liveMoveSourceAge` now returns `lastAge`, and `scheduleMoveAnimationTail` (`src/engine/moveAnimSounds.ts`) schedules every row after the last presenting script row through `scheduleAfter` (`screenSounds.ts`, the psn2 `scheduleStatusAnimationTail` mechanism). The window is not lengthened (sound only). `soundCensusDelta.py` counts those rows as exact (`MOVE_TAIL_CLAIMED`, listed as "tail rows" in its command line). T1 scan for the same class (0..999 Scene ON, 439 tail rows): Dynamic Punch's fifth SE 177 (18 rows) has a ROM window (`aud259-dynamicpunch-player`, six rows); the other 421 are the `panse` sweeps of Signal Beam (SE 182 pan row at 17, 371 rows) and Mud Shot (SE 165 at 14, 50 rows), whose sweep outlives the command's last presenting frame. They were the 51 "missing-other" rows of the aud258 / aud259 census (51 + Dynamic Punch's 2 = 53 in 0..99). The mechanism follows the C (battle_anim.c:482) for them too, but they have no ROM window of their own in aud260, so their frames are table-consistent only (T1), not ROM-measured.
- **Brick Break turn 2** (`gBrickBreakWallSpriteTemplate`, `AnimBrickBreakWall` battle_anim_fight.c:690-742): the wall sprite is created with args (a3 = 90, a4 = 10) and is gone `a3 + a4 - 1` ticks later (a4 = 0 uses a3), so the first `waitforvisualfinish` ends at the fist's SE 123 and the shard SE 198 follows 12 frames after it. Turn-2 variants gain SE 198 @ 126 (122 @ 24 / 53, 123 @ 114). The lab needs a Lv50 target (a Lv12 one dies to the first Brick Break) and the two-turn trace against the turn-1 Reflect.
- **Glare** (`AnimTask_GlareEyeDots`, battle_anim_effects_3.c:3989-4087): lifetime 88, so SE LEER follows SE PSYBEAM2 by 107 frames in the ROM. The +2 the aud259 table was short is the LEER's position in the script: it sits in the same script step as the `AnimTask_ScaryFace` creation, and the BG-load stall of that creation (`SCARY_FACE_LOAD_LAG`, 6 frames) is paid 2 frames by ops of the same step and 4 later (`SCARY_FACE_SAME_STEP_LAG` 2). The 2 / 4 split is a measured value (the ROM window pins it); the C only shows that the SE shares the step with the creation, not how the stall is distributed over it.
- **Will-O-Wisp** (`AnimWillOWispOrb`, battle_anim_fire.c:1101-1164): the orb lives `32 + |target X - x|` ticks (x = the attacker's X plus the call-32 sine fold `gbaSin(124, -4 / +4)`), so the first wait ends 153 (player attacker) / 152 (opponent attacker) frames after the first SE_M_EMBER and SE_M_FLAME_WHEEL2 follows (table 9 / 19 / 162 and 9 / 19 / 161). The orbs' own SE_M_FLAME_WHEEL rows (the gAnimCustomPanning sweep) are not modelled: they stay ROM-only rows.
- **Air Cutter** (`AnimTask_AirCutterProjectile`, battle_anim_effects_2.c:1485-1750 and `AnimAirWaveProjectile` :1526-1614): the task's entry is call 0 and `AirCutterProjectileStep1` creates one air wave on calls 1 / 4 / 7 (data[0] starts 0, reloads a3 = 2, so every 3rd call; the third creation installs Step2), each creation playing SE_M_BLIZZARD2 with `BattleAnimAdjustPanning(SOUND_PAN_ATTACKER + 1)` (pan -63 for the player, +63 for the opponent). A wave's data[0] = data[5] - data[6] = 11 for the 136-pixel span (data[5] = xDiff * (0x10000 / (a2 & ~1)) / 256 = 22, data[6] = data[5] / 2; the player's target X is +32 off the opponent, the opponent's -32 off the player, both 136 from the attacker), so the init runs 12 calls, Step1 9 (data[0] = 8) and Step2 31 (data[0] = 30): 52 calls, and the sprite is gone at task call c + 52 (AnimateSprites before RunTasks). Step2 destroys the task on the call the last wave's destruction is seen (call 59): gone 58 ticks after the creation, so SE_M_CUT follows the wait at 75 (BLIZZARD2 at 16 / 19 / 22). The script's `6 * 256` argument needed a product parser in the extractor (`productArg`).
- **Recycle** (`gRecycleSpriteTemplate`, `AnimRecycle_Step` battle_anim_effects_3.c:5437-5489): lifetime 138 (case 0 fires every 2nd call, 32 fires, call 64; case 1 waits to call 74; case 2 32 fires, call 138; destroy 139), so the post-wait SE_M_TAKE_DOWN follows the loop's first by 139 (loop at 9, SE at 148). Recycle fails without a consumed held item, so the lab gives the player's Rattata a Sitrus Berry (eaten at the end of turn 1: HP-threshold berries are end-of-turn) and Recycle animates in turn 2 (`aud260-recycle-player-on`, two-turn trace).

| Window | ROM rows | ROM minus ours |
| --- | --- | --- |
| Brick Break turn 2 (`aud260-brickbreak-player`) | 122 @1113, 122 @1142, 123 @1203, 198 @1215 | +2 (constant) |
| Glare (`aud260-glare-player`) | 200 @67, 192 @174 (+107) | +2 |
| Will-O-Wisp, player attacker (`aud260-willowisp-player`) | 151, 151 +10, 145 +153 | +1 |
| Will-O-Wisp, opponent attacker (`aud260-willowisp-opponent`) | 151, 151 +10, 145 +152 | +1 |
| Recycle (`aud260-recycle-player`, turn 2) | 152 @1466 / 1490 / 1515 / 1605 | -4 |
| Air Cutter, player attacker (`aud260-aircutter-player`) | 154 @80 / 83 / 86 (pan -63), 128 @139 (pan 63) | 0 |
| Air Cutter, opponent attacker (`aud260-aircutter-opponent`) | 154 @84 / 87 / 90 (pan 63), 128 @143 (pan -63) | 0 |

The constant offsets are the idle-lead / action-transition class (#198), not lifetime errors (the ROM gaps are exact).

### 26.1 Deferred

- **Memento** (4 gated ops in T1 0..99): the attacker shadow task (`AnimTask_MoveAttackerMementoShadow`, battle_anim_dark.c:408-540) steps `data[4]` from `BATTLER_COORD_ATTR_TOP - 7` (the species' sprite height, `GetBattlerSpriteCoordAttr`, battle_anim_mons.c:2277) down by 8 per call, so its lifetime (and the post-wait SE_M_PSYBEAM rows) depend on a per-species sprite size the table's grids do not carry (they key on the pic Y offset, the damage and the counter). It needs a new per-species TOP grid in the extractor and the engine's `variantOf` key, plus `AnimTask_MementoHandleBg` / `AnimTask_MoveTargetMementoShadow` ports; not started.

T1 census 0..99 Scene ON: exact 26,100 -> 26,176, missing-gated 15 -> 4 (Memento), missing-other 53 -> 0 (the tail rows are now emitted and scored exact), extra 0. T1 0..999 and the sound-only proof are in docs/aud251-s11-scoreboard-refresh.md (aud260).

## 27. aud261: T1 0..999 missing-gated tail (14 moves)

Every lifetime is ported from the C (file:line in the `lifetimeOf` comments of `tools/extract/extract-anim-sound-timing.ts`), not fitted. Each move has a ROM window for both attacker sides (probe step mode, Scene ON, labs `tools/battle-lab/aud261-*.json`, stages `aud261-<move>-<side>-on` in `tools/compare/appTrace.ts`, fixtures `tools/audio/fixtures/aud261-*.json`) and a Tier-1 pin in `tests/aud261MoveAnimSounds.test.ts`. L50 emitted / gated (`factory-animation-inventory.json` level50 moves, turn 0, player attacker) 839 / 35 -> **862 / 12** (the 12 are Luster Purge 6, Rapid Spin 2, Present 1, Magnitude 1, Memento 1, Water Spout 1; Luster Purge has no row in the 0..999 census). Extractor (turn 0, player attacker): 1066 -> 1091 resolved ops, 86 -> 61 unresolved; the table gained only rows that were previously gated.

Lifetimes added (call numbering as in the earlier sections: a sprite's init is call 0, destroyed on call K = exact K - 1; a task's entry is call 0):

| Move | Object | Lifetime | Source |
| --- | --- | --- | --- |
| Extreme Speed | `AnimTask_AttackerStretchAndDisappear`, `AnimTask_ExtremeSpeedImpact`, mon-edge hit splats | 8, 59, 10 | battle_anim_effects_2.c:2792-2873 |
| Milk Drink | `AnimMilkBottle_Step1` | simulated by `milkBottleDestroyCall` | battle_anim_effects_1.c:4003-4062 |
| Pain Split | `AnimPainSplitProjectile`, `AnimTask_PainSplitMovement` | 19, 12 | battle_anim_effects_3.c:2937-3033 |
| Flame Wheel | `AnimFireSpiralOutward` | D + W + 1 (W = 56) | battle_anim_fire.c:738-772 |
| Swallow | `AnimTask_SwallowDeformMon`, `AnimSwallowBlueOrb` | 86, pic-Y dependent | battle_anim_effects_3.c:2217-2248 |
| Octazooka | `gOctazookaBallSpriteTemplate` | D + 1 = 21 | battle_anim_effects_1.c:1691 (`TranslateAnimSpriteToTargetMonLocation`) |
| Zap Cannon | ball, `AnimZapCannonSpark` | D + 1 = 31, D - 1 = 29 | battle_anim_electric.c:130, 572-603 |
| Razor Wind | `AnimRazorWindTornado` (`TranslateSpriteInCircle`), `AnimAirWaveCrescent` | D, D + 1 | battle_anim_effects_2.c:1883, battle_anim_flying.c:430 |
| Covet | `AnimMagentaHeart`, `AnimTask_RockMonBackAndForth` | 58, 4 (8 - 2 i) n | battle_anim_effects_2.c:3067, battle_anim_effects_3.c:2702 |
| Needle Arm | `AnimNeedleArmSpike` | D | battle_anim_effects_1.c:3623-3694 |
| Aromatherapy / Refresh | flowers (`AnimFlyingParticle`, shared with Silver Wind), `AnimTask_StatusClearedEffect` | ceil(272 or 264 / s), 89 | battle_anim_effects_1.c:3517, battle_anim_effects_3.c:3904, battle_anim_utility_funcs.c:812-936 |
| Smelling Salt | `AnimSmellingSaltsHand`, `AnimTask_SmellingSaltsSquish` | 45 + 14 (n - 1), 13 n - 1 | battle_anim_effects_3.c:4232-4343 |
| Gust | `AnimEllipticalGust`, `AnimTask_AnimateGustTornadoPalette` | 69, n - 1 | battle_anim_flying.c:353-405 |
| Spider Web | `AnimTranslateWebThread` (x14), `AnimSpiderWeb` | (84 << 8) / unk2 = 42, 52 | battle_anim_bug.c:258-355, battle_anim_mons.c:1111, 1155 |

The web thread's distance is the singles one: the thread starts at the attacker's X_2 +- 20 and ends at the target's X_2, 84 pixels on both sides (the macro `create_web_thread_sprite` carries `unk2=` / `targets_both=` as named arguments, so the extractor reads them with `intNamed`).

| Window | ROM rows | ROM minus ours |
| --- | --- | --- |
| Extreme Speed (`aud261-extremespeed-*`, Snorlax target) | 160 x3, 139 +39 / +12, 123 +12, 135 x4 +44 | 0 |
| Milk Drink (turn 2) | 142 x3, 225 +62, 179 +94 | -2 |
| Pain Split | 194 x3 25 apart | -4 |
| Flame Wheel | 144 x7 four apart, 145 +88 | +2 |
| Swallow (player; after a Stockpile turn) | 152, 232 +40, 179 +102 | -4 |
| Octazooka | 141, 177 +22 later | +2 |
| Zap Cannon | 138 @6, shake / electricity rows +50 / +69 | +2, +3, +3 (named residual below) |
| Razor Wind, turn 1 charge | GUST 132, GUST2 133 | -10 |
| Razor Wind, turn 2 unleash | 160 @9 / 13 / 17, 136 @36 | +1 (player), +14 (opponent) |
| Covet | 212 x3, loop 176 | +2 |
| Needle Arm | 166 loop, 123 | +3 |
| Aromatherapy | ROM gaps 0 / 197 / 291 / 363 (player), 0 / 193 / 287 / 359 (opponent) | rows 3 / 4 +4 |
| Refresh | ROM gaps 0 / 94 / 166 | rows 2 / 3 +4 |
| Smelling Salt | 134 loop, 194 loop +32 | +4 |
| Gust | 132, 133 +70 | +1 |
| Spider Web | 129 loop x6, 130 +82 | -3 |

All offsets are constant across their window except where named; the ROM gaps equal the table's. They are the idle-lead / action-transition class (#198), not lifetime errors.

Named residuals (measured, not attributed; the table keeps the C-derived value and the tests pin the residual):

- **Zap Cannon +1 across the wait**: the ROM's gaps are 50 / 69 against the table's 49 / 68. A CreateSpriteAndAnimate hook shows 7 sparks at the SE frame and the eighth one frame later (candidate: a VBlank overrun from nine sprite inits in one script step). Zap Cannon is 50% accurate; the engine stages use rngSeed 2 (player) / 10 (opponent), the first seeds that hit.
- **AnimTask_StatusClearedEffect +4** (Aromatherapy, Refresh): the C gives 89, the ROM destroys it 93 ticks after the STAT_INCREASE. The creating step decompresses a tilemap and image and loads a palette, so it is the `METALLIC_SHINE_LOAD_LAG` class; a lag constant for this task is a candidate, not added.
- **Extreme Speed against a Rattata opponent**: x2 = 1 at the task entry shortens the case-3 return by one call (a residual of 1). The windows use a Snorlax target (x2 = 0).
- **Razor Wind per-turn offsets**: the charge turn is -10 and the unleash turn +1 / +14 on one trace; `expectConstantOffset` does not apply across both turns, the test asserts them per turn.

Window notes: the Swallow opponent window is absent because the engine's opponent AI does not Stockpile (the player window carries the pin). Refresh needs a Thunder Wave from the other side to have a status to clear (opponent-move-86 stages). Razor Wind and Refresh use two-turn traces; Milk Drink's first turn fails at full HP.

### 27.1 Deferred (read, not committed)

- **Rapid Spin** (20 rows): `AnimTask_RapinSpinMonElevation` steps by the opponent-side battler's species elevation (4..16, clamped at 0), which the table's pic-Y grid folds into the pic Y; a lifetime that depends on the elevation alone needs a new elevation dimension in the grid and the engine's `variantOf` key.
- **Water Spout** (8): the droplet count depends on the attacker's HP quarter (a power / HP variant dimension).
- **Magnitude** (23): `AnimTask_IsPowerOver99` selects the intense branch from the move's random power (a power variant dimension; the engine knows the power, the table does not key on it).
- **Memento** (6): a per-species sprite-height grid (see 26.1).
- **Present** (4): `AnimTask_IsHealingMove` branches on the random power.
- Luster Purge has 6 gated L50 rows but no 0..999 census row.

T1 census 0..999 Scene ON: missing-gated 467 -> 64 (Magnitude 23, Rapid Spin 20, Water Spout 8, Memento 6, Present 4, Odor Sleuth 1, False Swipe 1, Pay Day 1), extra 0, unclassified 0. Scoreboard: docs/aud251-s11-scoreboard-refresh.md (aud261).
