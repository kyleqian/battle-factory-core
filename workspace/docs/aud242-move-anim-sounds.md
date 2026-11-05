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

Script-frame costs (`battle_anim.c` / `battle_anim_scripts.s`):

| op | frames |
|---|---|
| `loadspritegfx`, `monbg` | +3 |
| `delay N` | N + 2 (`delay 0`: 1 frame) |
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

## 4. Slice plan

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
