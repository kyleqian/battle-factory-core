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
