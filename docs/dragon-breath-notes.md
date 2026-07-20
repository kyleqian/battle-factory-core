# DRAGON_BREATH ground truth (S7 slice E2 scout, worktree lane, oracle scout — no engine code)

Ground-truths battle-1 turn 2's second half: Onix's **DRAGON_BREATH** against
Grovyle, from the tail of ENDEAVOR's own resolution through the turn-3 menu
reopen. Scout only — no `src/engine/` changes, no edits to existing traces,
no edits to `docs/battle-menu-notes.md`/`PROGRESS.md`/`ISSUES.md` (worktree
contract). Extends `docs/battle-turn-notes.md` §12 (the turn-2 RNG ledger,
already correct for every roll — cross-checked below, nothing to fix there)
with the animation-level detail §12 explicitly didn't attempt: per-tick task/
sprite inventory, exact visual phase boundaries, and a source-cited asset
list.

## Scope correction (falsifiable, checked against RAM+pixels)

The assigned window was "~3095-3846 (PROGRESS cites ~3129-3846)". Both
guesses undersell how much of 3095-3136 is still **ENDEAVOR's own tail**,
not DRAGON_BREATH:

- `docs/battle-menu-notes.md` §15's own dense sweep found "settles by 3095"
  — true for the squish/blend/droplet/hitsplat/shake sub-mechanisms it was
  sweeping, but that sweep's own window (2999-3095) stops **exactly one tick
  before** ENDEAVOR's *second* visual phase even starts: the HP-bar sentinel
  for Onix's own damage appears at **3098** (`healthBar0Curr` -32768,
  `battle1-turn2-ram-dump.json`), drains 3099-3113 (pixel-diffed this
  session, one unique frame per tick — the same "1 unit/tick" convention as
  every prior HP-bar drain in this run), reads "done" (0) at 3115, and
  `gBattleMons[0].hp` itself updates to 101 at 3116. So ENDEAVOR is not
  actually finished settling until **~3116** (RAM) / pixel-flat from **3114**
  (dense oracle sweep this session, run below) — 19-21 ticks later than
  "3095" would suggest.
- DRAGON_BREATH's own first RAM write (`gBattlerTarget` 0→1) is at 3128,
  `gCurrentMove`→225 at 3129-3130 — matching PROGRESS's "3129" — but this is
  invisible (no pixel change) until **tick 3137** (dense oracle sweep, sha
  diff from the prior flat run), one tick after `gBattleControllerExecFlags`
  bit0 sets at **3136** (the established "RAM writes, pixel shows next tick"
  lag convention this run uses throughout).

**Corrected boundary: DRAGON_BREATH's own visible window is 3136(RAM)/3137
(pixel) → 3846 (still pixel-stable, confirmed below).** 3095-3136 belongs to
ENDEAVOR's own resolution tail (its own separate open item per PROGRESS
#148's "Next" list, not touched here). This document covers the full
3095-3846 span as assigned (so the handoff itself is ground-truthed), but
flags the ENDEAVOR-vs-DRAGON_BREATH ownership line precisely at 3136.

## Committed artifacts

- **`tools/compare/traces-groundtruth/battle1-turn2-dragonbreath.json`** —
  same 50-segment button script as `battle1-turn2.json`, **byte-for-byte
  identical prefix** (diffed programmatically, 0 mismatches through segment
  49; only `captureFrames` differs) — satisfies the CRITICAL RNG RULE, no
  input re-timed. 3846 total frames (unchanged), `captureFrames` = every
  tick 3095-3346 inclusive (**252 captures**, under the 256 cap) — dense
  coverage of the ENDEAVOR-tail handoff, DRAGON_BREATH's full kickoff/anim/
  HP-drain, the secondary-effect + turn-end RNG cluster, and the first ~6
  ticks of the turn-3 menu settle. Twice-run byte-identical (`bin/oracle
  run`, 0 sha mismatches across all 252 captures both runs). Cross-checked
  against the already-committed `battle1-turn2.json` at all 116 overlapping
  ticks — **0 sha mismatches**, confirming both traces agree.
- For 3346-3846 (turn-3 menu settle-and-hold), `battle1-turn2.json`'s own
  existing strided `captureFrames` (every 20 ticks) already cover this
  span and were re-verified this session (pixel-stable, see below) — not
  duplicated here since it's already committed and unmodified (contract:
  don't touch existing traces).
- **`src/data/gen/battle1-turn2-dragonbreath-tasks-sprites.json`** — new.
  Per-tick `gTasks[0..15].func`/`gSprites[0..63].callback` diff log, ticks
  3128-3346, symbol-resolved (thumb-bit-masked, nearest-symbol-at-or-below)
  against `arm-none-eabi-nm -n --defined-only
  reference/pokeemerald/pokeemerald.elf` (311191 defined symbols). Produced
  by the already-committed `tools/probe/dump-task-and-sprite-callbacks.py`
  (no new probe tooling needed) — 44 change-events, the full basis for the
  animation inventory below. Re-run once, used directly (this script's own
  header already documents it as a generic, reusable dumper from a prior
  session).
- `src/data/gen/battle1-turn2-ram-dump.json` (already committed, unmodified)
  supplies the RNG ledger / HP / status columns re-cited below — no new RAM
  dump needed for those, since it already spans ticks 2894-3846.

## Phase timeline (RAM- and pixel-confirmed this session)

All ticks are the trace's own absolute indices (same numbering as
`battle1-turn1.json`/`battle1-turn2.json`).

| ticks | phase | evidence |
|---|---|---|
| 3090-3092 | ENDEAVOR's own squish/hitsplat tail already flat (pixel-identical run, dense sweep) | oracle sha run `920f6ca4...` |
| 3093-3098 | one more ENDEAVOR-tail pixel change, then flat (message-box/hitmarker settle) — **not** DRAGON_BREATH | oracle sha run `6aa3d9d3...` |
| 3098 | Onix's own HP-bar sentinel appears (`healthBar0Curr` -32768) | ram-dump |
| 3099-3113 | Onix's HP bar drains 117→101 (one unique frame/tick, 1 unit/tick) | dense sweep, 15 distinct shas |
| 3114-3136 | flat — ENDEAVOR fully settled (`hp0`=101 from 3116, bookkeeping writes `gLastMoves[1]`=283 at 3126, `gBattlerTarget`→1 at 3128) | ram-dump + dense sweep (23-tick flat run) |
| 3129-3130 | `gCurrentMove`→225 (MOVE_DRAGON_BREATH), `gBattlerAttacker`→0 (Onix) — **RAM-only, not yet visible** | ram-dump |
| 3135 | **DRAGON_BREATH accuracy roll** (1 step, hits — same roll §12 already decoded) | ram-dump `rngLedger` |
| 3136 | `gBattleControllerExecFlags` bit0 sets (Onix/attacker's controller becomes busy) | ram-dump |
| **3137** | **first DRAGON_BREATH-attributable pixel change** (1-tick render lag from 3136) | dense sweep |
| 3137-3157 | "ONIX used\nDRAGONBREATH!" text draws, one unique frame/tick (≈char-by-char) | dense sweep, 21 distinct shas |
| 3158-3176 | full text held, pixel-flat (19 ticks) | dense sweep, sha `a040500b47cb` |
| 3161 | **crit roll** (1 step, no crit) — resolved silently under the held text, before any anim task exists yet | ram-dump `rngLedger` |
| 3162 | `gBattleMoveDamage` locks to 15 (post-damagecalc, pre-STAB/type) | ram-dump |
| 3163 | type/STAB step — flat (DRAGON vs GRASS neutral, no STAB) | ram-dump |
| 3164 | **damage-spread roll** (1 step); `gBattleMoveDamage` locks to 13 | ram-dump `rngLedger` |
| 3171 | `Task_InitUpdateMonBg`→`Task_UpdateMonBg` (task slot 0/1) — `monbg ANIM_DEF_PARTNER`/`splitbgprio ANIM_TARGET`, the script's own opening steps; no visible pixel delta (priority reorder only) | tasks-sprites dump |
| 3174 | `Task_LoopAndPlaySE` (SE_M_FLAME_WHEEL loop, `loopsewithpan`) + **1st fire-projectile sprite** spawns (slot 3, `AnimTranslateLinear_WithFollowup`) | tasks-sprites dump |
| 3174-3202 | **8 fire-projectile sprites**, spawned **every exactly 4 ticks** (3174/3178/3182/3186/3190/3194/3198/3202), each a 20-tick linear translation, self-destroying **exactly 20 ticks** after its own spawn (3194/3198/3202/3206/3210/3214/3218/3222) — RAM-confirmed regular cadence, no jitter | tasks-sprites dump (16 spawn+destroy events) |
| 3182 | attacker-blend task starts (task slot 2, `AnimTask_BlendSpriteColor_Step2` — the step function `AnimTask_BlendBattleAnimPal` hands off to; fades **target's** palette, `F_PAL_TARGET`, toward `RGB_RED`) | tasks-sprites dump + source |
| 3186 | target-shake task starts (task slot 3, `AnimTask_ShakeMon2_Step`; `x2=±2px`, `y2=0`, 21 toggles @ 1-tick cadence per script args `2,ANIM_TARGET,2,0,21,1`) | tasks-sprites dump + source |
| 3177-3255 | dense per-tick pixel activity (projectile motion + red blend + shake), visually confirmed (frame 3200: red-tinted Grovyle, visible fire streak) | dense sweep + PNG spot-check |
| 3236 | fade-out blend task starts (task slot 0 reused, `AnimTask_BlendSpriteColor_Step2`, coeff 9→0 back to neutral) | tasks-sprites dump |
| 3255 | `Task_ClearMonBg` (task slot 0) — script's own `clearmonbg ANIM_DEF_PARTNER` step, right before `end` | tasks-sprites dump |
| 3256-3263 | flat (8-tick run) — **pixel-identical** to the 3158-3176 hold (same sha `a040500b47cb`; coincidence, not a bug — same background composited the same way) | dense sweep |
| 3263-3283 | target-side hit-flash sprite (`SpriteCB_HitAnimHealthoxEffect`, slot 3) — white-flash-on-healthbox effect, generic (not DRAGON_BREATH-specific; `pokeball.c`); cyclic 4-shape pixel pattern matches its own flash cadence | tasks-sprites dump + dense sweep |
| 3298 | Grovyle's own HP-bar sentinel appears (`healthBar1Curr` -32768) | ram-dump |
| 3299-3311 | Grovyle's HP bar drains 100→88 (13 ticks, 1 unit/tick — matches the 13-damage roll) | ram-dump + PNG spot-check (frame 3306) |
| 3312 | bar "done" (0) | ram-dump |
| 3313 | `gBattleMons[1].hp` itself updates to 88 (1-tick lag, same rule as every prior drain) | ram-dump |
| 3310-3328 | flat (19-tick pixel run) — pure RNG/bookkeeping, no visual | dense sweep |
| 3318 | **secondary-effect (30% paralysis) roll** (1 step) — does **not** proc; `status1_0`/`status1_1` read 0 at every sampled tick 2894-3846 | ram-dump `rngLedger` + status columns |
| 3323 | `gLastMoves[0]`→225 (DRAGON_BREATH bookkeeping write) | ram-dump |
| 3326-3328 | `mainFunc` transitions 3× in 3 ticks (0x803d819→0x803b905→0x803b9bd→0x803be75) — turn-resolution state machine exits into turn-end bookkeeping | ram-dump |
| 3328 | `BattleTurnPassed`'s `gRandomTurnNumber` roll (1 step) | ram-dump `rngLedger` |
| 3329-3335 | new flat pixel run (`ef14ee5a7989`, 7 ticks) — message-box clearing/menu-materialize prep | dense sweep |
| 3333 | `ShouldSwitch()` group (2 steps) | ram-dump `rngLedger` |
| 3335 | `BattleAI_SetupAIData`+tie-break group (5 steps) | ram-dump `rngLedger` |
| 3336 | `SpriteCB_BounceEffect` ×2 (slots 3/4) — the turn-3 action-menu's own bounce-in effect (same generic effect as turn 1's/turn 2's own menu materialize, `menu-idle-onix-bounce.json`/`menu-idle-healthbox-bounce.json` assets already extracted) | tasks-sprites dump |
| 3337 | one-tick flicker (mid-bounce) | dense sweep |
| 3338-3346 | settled — "What will ONIX do?" menu, Onix 101/117 (PNG-confirmed, frame 3346) | dense sweep + PNG |
| 3346-3846 | pixel-stable through trace end (already-committed `battle1-turn2.json`'s own strided captures, re-verified this session) | existing trace |

**RNG ledger total for the DRAGON_BREATH-attributable portion: 5 rolls**
(accuracy 3135, crit 3161, spread 3164, secondary 3318, turn-pass 3328) plus
the shared turn-end cluster (ShouldSwitch 2 + AI-tie-break 5 = 7 more,
already counted once in §12's own 14-roll turn total). **No corrections
needed to §12's RNG ledger or damage math** — every roll/tick this session
re-derived from the already-committed `battle1-turn2-ram-dump.json`'s own
`rngLedger` field matches §12 exactly (LCG-distance-verified, not just
call-counted, same as §12's own method). The value this session adds is
entirely in the *animation*-level detail (task/sprite inventory, exact
pixel boundaries) §12 never attempted.

## Animation inventory (RAM-confirmed, source-cited)

`Move_DRAGON_BREATH` (`reference/pokeemerald/data/battle_anim_scripts.s:
4931-4963`) — **five independently-timed sub-mechanisms**, entirely
distinct from ENDEAVOR's five (§15):

1. **8 fire-projectile sprites** (`gDragonBreathFireSpriteTemplate`,
   `battle_anim_dragon.c:89-98`): `AnimDragonFireToTarget`→
   `StartDragonFireTranslation` (`:218-244,268-274`) — a linear translation
   from the attacker's own position to the target's, driven by the shared/
   generic `StartAnimLinearTranslation`/`AnimTranslateLinear_WithFollowup`
   primitive (not move-specific machinery — worth checking whether the
   engine already has an equivalent from another move before building a new
   one). RAM-confirmed: spawned every exactly 4 ticks, each a 20-tick
   translation, self-destroying on schedule (see timeline above) — a much
   more regular cadence than the nominal script reading (`delay 2` between
   most, `delay` omitted before the last) would suggest; the true cadence is
   uniform.
   - 3-frame yellow→red animated tile (`ANIMCMD_FRAME(16,3)`/`(32,3)`/
     `(48,3)`, i.e. 3 ticks/frame) plus a mirrored h/v-flip variant
     (`sAnim_DragonBreathFire_1`, used since the attacker here — Onix — is
     player-side; `StartDragonFireTranslation`'s `else` branch, confirmed by
     `GetBattlerSide(gBattleAnimAttacker) != B_SIDE_PLAYER` being false this
     turn).
   - Affine "pop": `sAffineAnims_DragonBreathFire_1` (attacker-relative
     variant used here) — `AFFINEANIMCMD_FRAME(0x50,0x50,127,0)` then
     `(0xD,0xD,0,100)`, on `gOamData_AffineDouble_ObjNormal_32x32` (each
     projectile gets its own OAM affine matrix — double-size mode, same
     convention as ENDEAVOR's hitsplat sprites needed per §15e).
2. **Attacker-side sound loop** (`Task_LoopAndPlaySE`, `SE_M_FLAME_WHEEL`,
   `loopsewithpan ... SOUND_PAN_ATTACKER, 7, 7`) — audio only, no pixel
   footprint (out of scope for a pixel-matching engine, flagged for
   completeness).
3. **Target palette blend** (`AnimTask_BlendBattleAnimPal`,
   `battle_anim_utility_funcs.c:48-56`, hands off to the generic
   `AnimTask_BlendSpriteColor_Step2` step): fades **Grovyle's own** palette
   (`F_PAL_TARGET`) toward `RGB_RED`, coeff 0→9 (script `createvisualtask
   AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 1, 0, 9, RGB_RED`), then a
   second instance un-fades 9→0 after `waitforvisualfinish`. **This is a
   different calling convention from ENDEAVOR's own blend** (§15's
   `AnimTask_BlendMonInAndOut`, attacker-side, direct `BlendPalette` calls
   from a squish-linked task) — a future engine slice implementing both
   needs to decide whether one shared primitive covers both call shapes or
   whether they stay separate; not decided here (scout only).
4. **Target shake** (`AnimTask_ShakeMon2`/`_Step`,
   `battle_anim_mon_movement.c:150-229` — **note: a different function from
   ENDEAVOR's `AnimTask_ShakeTargetBasedOnMovePowerOrDmg`**, §15's
   mechanism; don't conflate the two despite similar names): plain
   `x2 = ±2px` (fixed amplitude, not derived from `gAnimMovePower` the way
   ENDEAVOR's shake is), `y2` disabled (arg=0), 21 alternations at 1 tick
   each per the script's own `2, ANIM_TARGET, 2, 0, 21, 1` args.
5. **Target hit-flash** (`SpriteCB_HitAnimHealthoxEffect`, `pokeball.c:42,
   1288-1294` — generic, not DRAGON_BREATH-specific, likely already needed
   by any normal-hit move without a custom hit animation): a white-flash
   overlay on the target's healthbox, RAM-confirmed active 3263-3283.

## Asset inventory

| asset | source path | status |
|---|---|---|
| fire-projectile sprite sheet | `graphics/battle_anims/sprites/small_ember.png` (`gBattleAnimSpriteGfx_SmallEmber`/`gBattleAnimSpritePal_SmallEmber`, `src/graphics.c:113-114`) — 32×160px, 4bpp indexed, 5 frames of 32×32 (128px/frame ÷ 8px tiles = 16 tiles/frame × 5 = 80 tiles = 160px tall), `ANIM_TAG_SMALL_EMBER` | **not yet extracted** — no `src/assets/gen/*ember*`/`*dragon*` file exists (checked: `ls src/assets/gen/` has no match). Shared with `gOutrageFlameSpriteTemplate`/`gDragonRageFireSpitSpriteTemplate` (other moves, same tag) — extracting once covers all three eventually. Extraction site: `tools/extract/extract-battle-move-anim-assets.ts` (same file ENDEAVOR's droplet/hitsplat blocks were added to per §15's own convention). |
| fire-sprite palette | embedded in the same PNG (indexed, 12 used colors: transparent black + 8-color yellow→red ramp + 2 unused-looking entries) | not yet extracted (same file as above) |
| target-blend color | `RGB_RED` (a `constants/rgb.h` macro, `31,0,0`-family — not a gfx asset, just a blend-target constant) | no extraction needed, just the numeric constant |
| hit-flash sprite | `SpriteCB_HitAnimHealthoxEffect` — **no dedicated gfx**, operates on the existing healthbox sprite's own palette/OAM (a flash overlay, not a new sprite sheet) | nothing to extract; needs an engine primitive (palette-flash), not new pixels |
| menu bounce-in (turn-3 reopen) | already-extracted `menu-idle-onix-bounce.json`/`menu-idle-healthbox-bounce.json` | **already exists**, reused as-is |

No new gfx is needed beyond `small_ember.png` — everything else this
window needs (blend, shake, hit-flash, menu-bounce) is palette/task
machinery over sprites already in RAM (Onix/Grovyle's own front/back
sprites, the healthbox) or already-extracted menu assets.

## Handoff notes for the engine slice

- The true DRAGON_BREATH-owned window is **3136/3137→3846**; 3095-3136 is
  ENDEAVOR's own unfinished tail (HP-bar-drain phase, not yet landed per
  PROGRESS #148's own "Next" item 1) — land that first, or the two windows'
  engine work will fight over the same `captureFrames` span.
  `battle1-turn2-dragonbreath.json` (this session's trace) captures both
  halves so either order of implementation has ground truth ready.
- The 8-projectile cadence (every 4 ticks, 20-tick lifetime, dead simple
  arithmetic) is the cheapest sub-mechanism to land first — no RNG, no
  stat-dependent amplitude (unlike ENDEAVOR's shake), simple linear
  interpolation.
- `AnimTask_ShakeMon2`'s fixed ±2px amplitude (vs. ENDEAVOR's
  `gAnimMovePower`-derived one) means this shake is *simpler* to port, not
  harder — a plain constant, no extra RAM confirmation needed.
- The two `AnimTask_BlendBattleAnimPal` instances (fade-in/fade-out) and
  ENDEAVOR's `AnimTask_BlendMonInAndOut` are both "ramp a mon's palette
  toward a target color over N ticks" — worth a shared primitive, but that's
  an engineering call for whoever lands one of them first, not decided here.
- `SpriteCB_HitAnimHealthoxEffect`'s white-flash is generic to normal hits;
  worth checking whether it's already needed (and possibly already modeled
  under a different name) by the time this lands, since it isn't
  DRAGON_BREATH-specific.

## Verification

`npm test` and `npm run build` unchanged and green (no `src/engine/` touch,
no changes to any existing trace — this session added two new files under
`tools/compare/traces-groundtruth/` and `src/data/gen/`, plus this doc).
