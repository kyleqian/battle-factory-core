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
| fb2d3ae88 (before) | 550 / 284 | 739 / 373 | 295 / 726 |
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
- `npm run compare:differential` over the 15 aud242e Scene ON move traces (97 captures each, frames 60..821 step 8; every one has changed table rows) against `3ecd1a6b9` plus the
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

| | before (`d20fdd641`) | after |
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
