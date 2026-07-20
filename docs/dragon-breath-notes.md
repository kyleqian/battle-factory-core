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

## Engine slice E2a (S7, bounded worker, follows the scout above)

Landed the first two of the brief's five priorities against the banked
ground truth above; explicitly did NOT attempt priorities 3-5 this session
(see "Not landed" below for why and what a resuming worker needs).

**New committed trace**: `tools/compare/traces/turn2-dragonbreath.json` —
verbatim 50-segment script copied from
`tools/compare/traces-groundtruth/battle1-turn2-dragonbreath.json` (no
input re-timed), `captureFrames` dense every tick **3121-3176** (the quiet
ENDEAVOR-tail handoff through the kickoff text's full hold) — **56/56
green**.

**1. Kickoff text window (landed)**: `drawTurn2KickoffText`
(`src/engine/battleScene.ts`) now switches from ENDEAVOR's held "Foe
GROVYLE used\nENDEAVOR!" text to "ONIX used\nDRAGONBREATH!" once `t >=
dragonBreathTextStartTick(pressTick)` (`pressTick+192` = render 3137, the
scout's own RAM-confirmed first DRAGON_BREATH-attributable pixel — RAM 3136
`gBattleControllerExecFlags` bit0 set, render=RAM+1). Line 1 reuses
`ROCK_SLIDE_LINE1` ("ONIX used") verbatim — same attacker, same
`STRINGID_USEDMOVE` template. Line 2 is `moves.json`'s own
`MOVE_DRAGON_BREATH` display name ("DRAGONBREATH", no space) + "!", total
22 printable chars. Visible-char count uses the same
`Math.min(TOTAL, t-start+1)` mechanism every other kickoff message in this
file uses; oracle-confirmed exact against the dense sweep (char-by-char
3137-3157, full text holds flat 3158-3176, matching the scout's own phase
table to the tick). All new code lives in `battleScene.ts` (both new
consts/functions AND the edit to `drawTurn2KickoffText`'s own body) — none
of it touches `drawFightSubmenuWindow` or `battleMenu.ts`, both off-limits
this session per the sibling FIGHT-submenu-text worktree's file ownership.

**2. `small_ember.png` extraction (landed)**: new block in
`tools/extract/extract-battle-move-anim-assets.ts`, same tile-sheet
convention ROCK_SLIDE's `rocks.png` block already established (32x32 OAM
frames = 16 8x8 tiles each). Source is 32x160px (4x20 tiles = 80 total, 5
stacked frames per `src/graphics.c:113-114`/`battle_anim_dragon.c:47-98`) —
only frames 1/2/3 (tile offsets 16/32/48, `sAnim_DragonBreathFire_0/_1`)
are DRAGON_BREATH's own; frames 0/4 belong to sibling moves sharing
`ANIM_TAG_SMALL_EMBER` (OUTRAGE/DRAGON_RAGE), flagged needs-only, not
decoded. Output: `src/assets/gen/battle-anim-small-ember.json`.
Byte-verified independently (a fresh Python/PIL read of the raw PNG, not
just re-trusting the engine's own decoder): pixel indices 0/5120
mismatches; palette differs from the raw PNG bytes only by the expected
GBA 15-bit round-trip (`gbaRoundTrip`, e.g. 205→206) — the same pipeline
every other extracted asset in this codebase already goes through, not a
bug. Re-running the whole extractor regenerates every other output file
byte-identical — only the new small-ember JSON is new on disk. Not yet
wired into any renderer (extraction only, per the brief's own priority-2
scope: "extractor committed + gen asset byte-verified").

**Not landed this session (3-5, in priority order for the next worker):**
- **8-projectile mechanism**: the per-spawn/destroy tick cadence is already
  pinned (`battle1-turn2-dragonbreath-tasks-sprites.json`, every-4-ticks
  spawn, 20-tick life), but the exact per-tick x/y path within each 20-tick
  life is NOT yet RAM-probed. This codebase already has a precedent for
  this exact same primitive — `AnimTranslateLinear_WithFollowup` also
  drives the sendout window's trainer-exit slide (`TRAINER_EXIT_X2`,
  `battleScene.ts` ~line 1295) — and that precedent found the GBA
  fixed-point per-frame truncation does NOT reduce to a clean formula (two
  single-tick +0 stalls mid-slide); a resuming worker should expect to need
  a literal RAM-probed table here too, not a derived formula, and must
  RAM-probe BEFORE writing render code (mandatory per this run's method).
  The affine "pop" matrix (`sAffineAnims_DragonBreathFire_1`,
  `AFFINEANIMCMD_FRAME(0x50,0x50,127,0)` then `(0xD,0xD,0,100)`) and the
  3-tick-per-color-frame yellow→red cycle also need their own RAM/pixel
  confirmation, not assumed from the source constants alone (same
  discipline `ENDEAVOR_SQUISH_TABLE`'s own doc comments already model).
- **Target red-fade blend** (`AnimTask_BlendBattleAnimPal`) and
  **`AnimTask_ShakeMon2`** (fixed ±2px): both structurally simple (a plain
  `BlendPalette` ramp toward `RGB_RED`, a plain fixed-amplitude alternation)
  but neither has an oracle-cross-checked coefficient/tick table yet — same
  RAM-probe-first requirement.
- **Hit-flash sprite** (`SpriteCB_HitAnimHealthoxEffect`): generic to any
  normal hit, worth checking whether a later slice already needs/models it
  under a different name before building a DRAGON_BREATH-specific path.

**Verification**: `npm test` 693/693 (unchanged — no new Tier-1 tests this
session; both landed pieces are pixel/asset-verified via Tier-2 compare and
independent PIL byte-checks, not pure-logic functions needing a new unit
test), `npm run build` green. `turn2-dragonbreath.json` 56/56 green.
Regression spot-check `turn2-endeavor-drain.json` **200/201** (unchanged,
same pre-existing ISSUES #19 residual tick).

## Engine slice E2a-2 (S7, bounded worker, follows E2a above)

RAM-probed all 5 remaining priorities first (mandatory per this run's
method), landed 2 of them (shake, blend) fully oracle-verified, and pulled
a 3rd (fire projectiles) after finding it wasn't pixel-exact rather than
ship wrong pixels. Hit-flash not attempted this session.

**New probe**: `tools/probe/dump-dragonbreath-anim.py` — per-tick RAM dump
(ticks 3170-3350, `battle1-turn2-dragonbreath.json`) of: the target
battler's own sprite `x/y/x2/y2` and OBJ palette (`gPlttBufferFaded`/
`Unfaded`, for the shake and blend respectively), plus every sprite whose
`affineAnims` pointer matches `sAffineAnims_DragonBreathFire` (the 8 fire
projectiles — `x/y/x2/y2/animNum/animCmdIndex/matrixNum/matrixA/matrixD`)
or whose `callback` matches `SpriteCB_HitAnimHealthoxEffect` (the hit-flash,
never populated this session — see "Not landed" below). Same conventions
prior probes in this file established (affine-anims-pointer id for a
sprite whose `callback` reassigns mid-lifetime, thumb-bit-masked callback
compare for one that doesn't).

**1. Target shake (landed)** — `dragonBreathShakeX2` (`battleScene.ts`):
`AnimTask_ShakeMon2`'s setup writes `sprite->x2 = gBattleAnimArgs[1]` (=2)
directly at task-creation time, one step ahead of the step function's own
bare logic (same "one step already elapsed by the first observable tick"
pattern this run's prior probes keep finding at creation ticks generally).
RAM-verified sequence `-2,-2,+2,+2,-2,-2,+2,+2,...` (each polarity holding 2
real ticks) from `pressTick+241` (RAM 3186) through `pressTick+281` (RAM
3226, settles to 0 — the 21st internal "alternation" is applied and
immediately zeroed by `AnimTask_ShakeMon2_Step`'s own destroy branch in the
same execution, per source: `battle_anim_mon_movement.c:214-241`). Render
lag **1 tick** (oracle-confirmed via a pixel scan at ticks 3185-3188 — a
distinct value from the blend's own 2-tick lag in the very same window,
confirming the brief's own warning that a window can hold more than one lag
family).

**2. Target red-fade blend (landed)** — `dragonBreathBlendCoeff`
(`battleScene.ts`): two `AnimTask_BlendBattleAnimPal` instances
(`battle_anim_scripts.s`'s own `10, F_PAL_TARGET, 1, 0, 9, RGB_RED` then
`10, F_PAL_TARGET, 1, 9, 0, RGB_RED`) blend Grovyle's own palette toward
`RGB_RED` (248,0,0 8-bit) via the same `BlendPalette` bit-math
(`faded = unfaded + ((target-unfaded)*coeff)>>4`) ENDEAVOR's own blend
already uses (`blendComponentToward`, reused verbatim). RAM-solved coeff
sequence directly from `gPlttBufferFaded` vs `Unfaded`: holds 0 for 2 ticks
at creation (`pressTick+237`, RAM 3182), steps `+1` every 2 ticks to 9 by
`pressTick+255`, holds at 9 through `pressTick+291` (RAM 3236, second
instance's own creation) while the projectiles/shake finish under
`waitforvisualfinish`, then steps `-1` every 2 ticks back to 0 by
`pressTick+309` — an exact mirror. Render lag **2 ticks** (oracle-confirmed
by pixel-scanning a fixed Grovyle-body coordinate, (193,16), across ticks
3236-3245 — the observed 8-bit color sequence there only reduces cleanly to
the RAM coeff sequence under a 2-tick lag, not the 1-tick "text family" lag
this run's other mechanisms often use — this is the SAME `RAM=render-2`
family `ENDEAVOR_SQUISH_TABLE`/`ENDEAVOR_SHAKE_RENDER_LAG` already use,
just independently re-confirmed here rather than assumed).

**`drawSpriteSheetAffineStretch`** gained an optional `x2` param (default 0,
every other call site unaffected) so Grovyle's own draw could carry the
shake offset alongside its existing `y2`/tint machinery.

**`drawDragonBreathScene`** (new): the same static-backdrop-plus-procedural
shape `drawEndeavorSquish` established for its own window — draws the
`drawStaticBgShiftedY` backdrop, Onix (unaffected all window — the
`Task_LoopAndPlaySE`/`SE_M_FLAME_WHEEL` loop is audio-only), the healthbox,
and Grovyle via `drawSpriteSheetAffineStretch` at neutral scale (256/256)
with the shake `x2` and blend `tintCoeff` layered on. Wired into
`drawTurn2KickoffText` for `t >= dragonBreathTextStartTick(pressTick)`,
replacing the flat `drawActionMenuIdleContent` fallback that window used to
fall through to.

**Not landed — 8-projectile mechanism (pulled after a real attempt)**: the
position/cadence/frame-cycle ARE fully RAM-verified exact — banked here so
the next worker doesn't have to re-derive them:

- **Position** (`AnimTranslateLinear_WithFollowup`, `battle_anim_mons.c:
  1065-1139`): brute-force-solved fixed-point params `dx=104, dy=-44,
  duration=20` reproduce the RAM-probed `x2`/`y2` sequence EXACTLY at every
  one of 20 steps across all 8 spawns (unlike `TRAINER_EXIT_X2`'s own
  precedent for this same primitive, which needed a literal table because
  of two single-tick +0 stalls this window's own dx/dy don't happen to
  hit). Relative-age table (`n=0..20`, base = attacker's own `(72,88)`,
  `n=20` repeats `n=19` — the internal duration counter's own last no-op
  tick before `DestroySpriteAndMatrix`):
  `x2: 5,10,15,20,25,31,36,41,46,51,57,62,67,72,77,83,88,93,98,103,103`
  `y2: -2,-4,-6,-8,-10,-13,-15,-17,-19,-21,-24,-26,-28,-30,-32,-35,-37,-39,-41,-43,-43`
  Spawn ticks (every exactly 4, `pressTick`-relative): `229, 233, 237, 241,
  245, 249, 253, 257` (RAM 3174/3178/3182/3186/3190/3194/3198/3202,
  `pressTick=2945`). The spawn tick itself already shows step 1 applied
  (same "one step already elapsed" pattern as the shake/blend setups).
- **Frame cycle** (`animCmdIndex`, RAM-confirmed): sheet-frame index at
  relative age `n` is `((n+1)/3 | 0) % 3 + 1` (tile offsets 16/32/48 — the
  anim's own first frame is already 2 ticks in, matching the position
  table's own "one step already elapsed" quirk, then a plain 3-ticks/frame
  cycle, matching the script's own `ANIMCMD_FRAME(_, 3)` triplet).
- **What's NOT solved — the affine "pop"**: `sAffineAnims_DragonBreathFire_1`
  (`AFFINEANIMCMD_FRAME(0x50,0x50,127,0)` then `(0xD,0xD,0,100)`) RAM-reads
  as `matrixA`==`matrixD`, both NEGATIVE, shrinking in magnitude from -703
  (`n=0`) to -184 (`n=20`) — a near-180-degree rotation (127/256 turns ≈
  178.6°, `cos`≈-1, `sin`≈+0.02) applied once at spawn (that AFFINEANIMCMD
  frame's own `duration` is 0), with only the scale portion actually
  ramping over the second frame's 100-tick duration. This is a genuinely
  ROTATED affine sample (unlike `Anim_VerticalStretch`/`ENDEAVOR_SQUISH_
  TABLE`, both `rotation=0` always, which is why `drawSpriteSheetAffineStretch`'s
  existing direct-`matrixParam`-as-scale convention was even a candidate
  here) — a real attempt this session (`Math.abs(matrixA)` as a plain
  diagonal scale, ignoring the rotation's shear) got CLOSE (ticks 3174-3175
  matched exactly, since the sprite is still genuinely near-invisible at
  that extreme a magnitude) but NOT pixel-exact from `n≈2` on (a small,
  smoothly growing diff — dozens to ~1000px — through the projectiles'
  whole 3176-3235 span), and was pulled rather than leave `captureFrames`
  gapped by a known-wrong render. **What a resuming worker needs**: probe
  `gOamMatrices[matrixNum]`'s full `a/b/c/d` (this session only read `a`/`d`
  — assumed no shear from `AnimTask_ShakeMon2`-style symmetry, which turned
  out wrong) and render via the general 2x2 sampler already built for the
  ball-spin mechanism (`drawSpriteSheetAffineRotate`, `battleScene.ts`),
  not the diagonal-only `drawSpriteSheetAffineStretch`. `small_ember.png`
  (`battle-anim-small-ember.json`) is already extracted and ready; frame
  slicing is `tiles.slice(16*frame, 16*frame+16)`, `columns:4, rows:4`.

**Not landed — hit-flash sprite**: not attempted this session (time-boxed
out after the shake/blend/projectile work) — `SpriteCB_HitAnimHealthoxEffect`
RAM-confirmed active 3263-3283 (scout's own timeline above), but this
session's probe never actually caught one in the `hitFlashSprites` field
(the callback-match filter is wired and ready in
`tools/probe/dump-dragonbreath-anim.py`, just never exercised against that
exact sub-window — re-run the probe over 3260-3290 first).

**Trace**: `turn2-dragonbreath.json`'s `captureFrames` extended from
`3121-3176` (unchanged, 56 ticks) to ALSO include `3236-3263` (28 new
ticks, contiguous) — **84/84 green**. The `3177-3235` span (fire
projectiles active) is deliberately NOT captured yet — extending into it
requires the rotated-affine fix above; `3264+` needs the hit-flash
(3263-3283), Grovyle's own HP-bar drain (3298+, next slice's own scope per
the original brief), and the turn-3 menu materialize (3329+), all still
unmodeled. This is a **gap**, not a mistake — the brief's "dense... as far
as you land" is satisfied for the two ranges actually landed; filling the
gap is the very next worker's job, with all the position/cadence data
above already banked.

**Verification**: `npm test` 693/693 (unchanged, no new Tier-1 tests — same
rationale as E2a: these are pixel-timing render functions verified via
Tier-2 compare, not pure state logic), `npm run build` green.
`turn2-dragonbreath.json` **84/84** green (`3121-3176` + `3236-3263`).
Regression spot-check `turn2-endeavor-drain.json` **200/201** (unchanged,
same pre-existing ISSUES #19 residual tick).

## Engine slice E2a-3 (S7, bounded worker, follows E2a-2 above): Tier-1 pins backfilled; fire-projectile retry got MUCH closer (full RAM matrix, family confirmed) but still not pixel-exact — pulled again, richer data banked

**Tier-1 debt closed**: `tests/battleScene.test.ts` gained a
"S7 slice E2a-2 Tier-1 backfill" describe block (4 pins) for
`dragonBreathShakeX2`/`dragonBreathBlendCoeff`, which E2a-2 shipped with only
Tier-2 verification (against this run's own "pin every pure-logic fix with a
Tier-1 test" rule). Values are re-derived from a **fresh** scratch
`bin/oracle run` capture this session (ticks 3172-3225, not reused from any
committed PNG/trace) at Grovyle-body coordinate (193,16) — the same spot
`DRAGONBREATH_BLEND_RENDER_LAG`'s own doc comment already used for its own
lag derivation. Two tick-pairs isolate each mechanism from the other (a
shake-polarity flip while blend coeff is flat at 9; a blend-coeff step while
shake hasn't started yet), so each pin genuinely exercises one function's
formula rather than both entangled. `npm test` 707 (PROGRESS #153's own
merged baseline) →**711** (+4 new pins, this session's only Tier-1 change).

**Fire-projectile retry — real progress, still pulled.** Per the brief's
mandatory method: extended `tools/probe/dump-dragonbreath-anim.py` to read
`matrixB`/`matrixC` (previously only `matrixA`/`matrixD`) and re-ran over
ticks 3170-3230. Three findings that close open questions from E2a-2:

1. **The full matrix is clean, not just `a`/`d`.** Every one of the 8 spawns
   (RAM-read directly, not derived) shows `a === d` and `b === -c` at every
   relative age `n` (0..20), and — RAM-confirmed, not assumed — **identical**
   across all 8 spawns (spawn 7 reuses spawn 1's own matrix slot after it
   frees up, and reads back byte-identical). So the "genuinely rotated"
   affine reduces to one 21-entry `(a, b)` table, no per-spawn variation:
   ```
   n:  0     1     2     3     4     5     6     7     8     9    10    11    12    13    14    15    16    17    18    19    20
   a: -703  -617  -549  -495  -450  -413  -382  -355  -331  -311  -292  -276  -262  -249  -237  -226  -216  -207  -199  -191  -184
   b:  -17   -15   -13   -12   -11   -10    -9    -8    -8    -7    -7    -6    -6    -6    -5    -5    -5    -5    -4    -4    -4
   ```
   (`d = a`, `c = -b` always.) The position table (`x2`/`y2`) and frame
   formula E2a-2 already banked were re-verified byte-identical against this
   extended probe's own `x`/`y`/`x2`/`y2`/`animCmdIndex` fields (not just
   re-trusted) — both still exact.
2. **Family confirmed from source, per the brief's explicit ask**:
   `gDragonBreathFireSpriteTemplate` (`battle_anim_dragon.c:83-98`) has
   `.affineAnims = sAffineAnims_DragonBreathFire` — the generic sprite.c
   `RunAffineAnimFrame`/`ContinueAffineAnim`/`ObjAffineSet` system, the SAME
   family the thrown ball's own spin uses (`battleMenu.ts`'s
   `playerThrowBallSpin`/`BALL_SPIN_TABLE`, also RAM-probed-direct) — **not**
   squish's separate `SetSpriteRotScale`/task-data-driven system
   (`docs/battle-menu-notes.md` §15b), which is only reachable via a
   different sprite-template shape (no `.affineAnims` field). Since the
   matrix is RAM-read directly (the real, final hardware values), no
   `ConvertScaleParam`/`0x10000/x` inversion is needed before feeding
   `drawSpriteSheetAffineRotate` — confirmed both from source (only the
   AFFINEANIMCMD-table system, which converts scale params BEFORE calling
   `ObjAffineSet`, would need that inversion if computing the matrix from a
   script value; RAM-reading the OUTPUT sidesteps it entirely, same as the
   ball spin precedent) and empirically (every inversion/sign-swap variant
   tried scored worse than the direct convention — see below).
3. **Base position and render lag pinned empirically, much better than
   E2a-2's scale-only attempt, but not exact.** Oracle-cross-checked against
   a fresh scratch `bin/oracle run` (ticks 3172-3225) plus this session's
   own `renderBattleScene`-based clean-background diffing (not a naive PNG
   diff — the real engine's own idle-bounce/blend/shake render for
   everything ELSE was included, so only the projectile geometry itself was
   under test): the sprite's own RAM `x`/`y` (72,88, constant across all 8
   spawns) is the CENTER directly (no `+halfW`/`+halfH` correction needed —
   tried and scored worse), and render lag **1 tick** (the SAME family the
   ball spin/shake/text mechanisms already use in this window) fits far
   better than every other lag tried (0, 2, 3, 4, 5, 6 all scored
   worse — lag 3 in particular looked promising from a naive "first visible
   tick" read but a clean-background re-check showed that read was itself
   real DRAGON_BREATH content, not a false positive, and lag 3's own fit
   degrades badly past the first few ticks). Sign convention (`pb=b,
   pc=-b` vs the swap, vs an h/v-flip on the SOURCE sample — `small_ember
   .json`'s own `dragonBreathFireAnims.variant1` field literally says "vFlip
   +hFlip" for Onix's player-side case) was tested every combination; the
   plain direct convention (no source flip — the near-178.6° rotation
   itself already achieves the mirrored appearance, the flip note describes
   the VISUAL RESULT of the rotation, not an additional transform) won by a
   wide margin every time.

   **Still not pixel-exact**: with the best-fit config (base=(72,88) exact,
   lag=1, direct matrix, no source flip), per-tick whole-frame diff against
   fresh oracle PNGs stays small and roughly flat across the 8-spawn window
   (~15-100px/tick over ticks 3177-3210, not the "smoothly growing to
   ~1000px" pattern E2a-2's scale-only approximation showed) but never
   reaches 0. Inspecting individual residual pixels (`t=3178`) shows our
   render lighting a handful of real (non-zero-index) tile pixels that the
   oracle shows as plain background at that exact tick — a small silhouette
   over-draw at specific tile-boundary-adjacent source coordinates, not a
   wholesale position/scale/sign error (all of which were ruled out by the
   sweeps above). **What a resuming worker needs**: the residual is now
   small enough that it's very likely a narrow, specific bug (an edge-pixel
   truncation/rounding convention, or a tile-selection off-by-one at a
   specific `sx`/`sy` boundary) rather than a wrong fundamental — worth
   instrumenting `drawSpriteSheetAffineRotate`'s own sample loop against a
   single isolated spawn (ticks 3177-3197, only spawn 1 alive) pixel-by-
   pixel rather than whole-frame diffing, to localize exactly which `(dx,
   dy)` values disagree and why. The matrix/position/frame tables above are
   exact and don't need re-deriving; base=(72,88)/lag=1/direct-matrix are
   the correct starting point, not open questions anymore.

**Pulled, not shipped**: per this run's "keep every commit green, never ship
known-wrong pixels" rule (same call E2a-2 made for the scale-only attempt) —
the render code was written, oracle-tested, found short of pixel-exact, and
reverted (`git checkout -- src/engine/battleScene.ts`) rather than committed
red or gapped. `turn2-dragonbreath.json`'s `captureFrames` are UNCHANGED
this session (still `3121-3176` + `3236-3263`, 84/84) — the `3177-3235` gap
(fire projectiles) and the `3264+` remainder (hit-flash, HP drain, turn-end)
are still open, exactly as E2a-2 left them. Hit-flash was not attempted this
session (all remaining time went to the projectile retry + the Tier-1
backfill).

**Verification**: `npm test` **711/711** (+4, the Tier-1 backfill — no
other engine code changed or reverted-then-changed), `npm run build` green.
`turn2-dragonbreath.json` **84/84** unchanged. Regression spot-check
`turn2-endeavor-drain.json` **200/201** unchanged (same pre-existing
ISSUES #19 residual tick). `tools/probe/dump-dragonbreath-anim.py` gained
`matrixB`/`matrixC` fields (additive, existing `matrixA`/`matrixD`/
everything else unchanged) — committed, ready for the next worker to re-run
without modification.

## Engine slice E2a-4 (S7, bounded worker, follows E2a-3 above): fire-projectile attempt #3 — PRIME SUSPECT (concurrent ember-palette blend) definitively RULED OUT; residual RENAMED from "unknown ~15-100px/tick" to "a per-pixel affine-sampling edge artifact, asymmetric between the compressed and magnified halves of the scale sweep" — pulled a third time, no wrong pixels shipped

Per the brief's mandatory method: re-wired E2a-3's exact best-fit config
(base=(72,88), lag=1, direct matrix `pa=a,pb=b,pc=-b,pd=a`, `drawSpriteSheet
AffineRotate`, no source flip — all values taken verbatim from E2a-3's own
banked tables, nothing re-derived) and ran the **diff-COLOR dump first**,
before touching any other hypothesis, exactly as instructed.

**Prime suspect (concurrent `AnimTask_BlendBattleAnimPal` also blending the
embers) — RULED OUT, two independent ways:**

1. **Source proof.** `Move_DRAGON_BREATH`'s own two `createvisualtask
   AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, ...` calls
   (`battle_anim_scripts.s:4931-4963`, both instances confirmed re-read this
   session) pass `F_PAL_TARGET` only. Traced the full call chain: `AnimTask_
   BlendBattleAnimPal` → `UnpackSelectedBattlePalettes(gBattleAnimArgs[0])`
   (`battle_anim_normal.c:317-327`) decodes bit 2 (`F_PAL_TARGET`) → `GetBattle
   PalettesMask(..., target=TRUE, ...)` — this resolves to **the target
   battler's own currently-assigned OBJ palette bank specifically** (the same
   `gBattleAnimTarget`-indexed palette slot `dragonBreathBlendCoeff`'s own RAM
   probe already reads via `gPlttBufferFaded`/`Unfaded`). The ember sprites
   are loaded via `loadspritegfx ANIM_TAG_SMALL_EMBER` — an unrelated sprite
   gfx tag with its own independently-assigned palette slot, never selected
   by any bit of `UnpackSelectedBattlePalettes`'s selector (bits 0-6 only ever
   name battler-role palettes or two fixed BG anim palettes — there is no
   "all loaded anim sprites" bit). Structurally, this blend **cannot** reach
   the embers' palette regardless of slot-allocation timing.
2. **Pixel proof (the diff-color dump itself).** Extended `tools/compare/
   scratch/diffdump.mjs` (new, committed — reads two already-rendered
   `oracle-NNNNN.png`/`app-NNNNN.png` pairs and prints every differing
   pixel's exact RGB on both sides) over a scratch trace (`tools/compare/
   scratch/dragonbreath-projectile-window.json`, `captureFrames` 3177-3235,
   same 50-segment script) run through `npm run compare`. If the blend were
   incorrectly touching the app's own ember palette, the app's mismatched
   pixels would show wrong/blended (red-shifted) hues. They don't: every
   mismatched "app" pixel sampled (ticks 3178, 3181, 3208, 3220 — see below)
   is a clean member of the small-ember yellow-red ramp itself (`(255,0,0)`,
   `(255,99,16)`, `(255,148,24)`, `(255,198,33)`, `(255,255,123)` — the exact
   5 non-transparent palette entries `battle-anim-small-ember.json` already
   has). The defect is **which pixels** are lit, never **what color** they're
   lit — conclusively a shape/geometry residual, not a palette one.

**The residual itself, characterized precisely (new this session — E2a-3 had
only a whole-frame diff-pixel-count, not a classified pixel-by-pixel read):**
also added `tools/compare/scratch/diffmap.mjs` (new, committed — renders an
ASCII occupancy map of a screen region: `#`=fire on both sides, `A`=app-only
"extra" fire pixel, `O`=oracle-only "missing" fire pixel, using a simple
`r>140 && r-b>40` yellow-red-ramp classifier). Two qualitatively different
sub-patterns, split cleanly by which half of the scale sweep (§ E2a-3's own
`matrixA` table, `|a|` crosses 256 at n≈10) the spawn is in:

- **Compressed half (`n` small, `|a|>256`, the sprite is scaled DOWN from
  native — RAM-verified starting at -703 for `n=0`, i.e. ~2.7x
  shrunk):** the mismatch is **pure over-draw**, small in absolute pixel
  count (23px at tick 3178 = spawn 0's `n=3`; only 2px at tick 3208 — the
  closest this residual gets to exact anywhere in the window) and shaped as
  scattered "salt-and-pepper" `A`s around the border of a correctly-matching
  `#` core (`diffmap.mjs` dump, tick 3178, region (78,68) 28x28 — a compact
  ~4x9 `#` blob with stray `A`s on 3 sides, zero `O`s). Consistent with a
  coarse source-step-per-destination-pixel rounding artifact at high
  compression (each dest pixel advances ~2 source texels at this `|a|`, so
  which exact edge texel a boundary pixel samples is maximally rounding-
  sensitive) — NOT a wrong position (the core silhouette IS in the right
  place and shape) and NOT a wrong color (confirmed above).
  Pixel-level evidence at tick 3178, e.g. `(91,76)`: oracle `(82,74,74)`
  (Onix's own back-sprite gray — this region sits inside `ONIX_MATERIALIZE_
  CORNER`'s (40,48) bounding box, confirmed by coordinate arithmetic, not a
  flat backdrop color) vs app `(255,0,0)` — a real ember-ramp red painted
  where the real hardware still shows Onix's own sprite untouched.
- **Magnified half (`n` large, `|a|<256`, scaled UP from native):**
  qualitatively different — tick 3220 (spawn 7's `n=17`, the sole spawn
  alive at that tick per the position-table's own `n∈[0,20]` window,
  double-checked against all 8 spawn ticks) shows 342 diff pixels, but
  `diffmap.mjs`'s region dump (128,30)-(173,75) shows the diff is NOT
  uniform edge noise here — there's a large, correctly-matching `#` core
  (confirming position/scale/matrix are still right at this `n` too) plus
  one **spatially separate, contiguous ~15x15 blob of pure `O`** (oracle has
  real fire; app has nothing) below-left of the main silhouette. Tested and
  ruled out the obvious explanation (a 9th/extra tick of life —
  `DRAGONBREATH_PROJECTILE` duration read as 20 was too short by one and
  spawn 6's own tail, `n=21`, should still render): patched the draw to
  clamp `n` up to 21 (reusing `n=20`'s table row, mirroring the existing
  "`n=20` repeats `n=19`" convention) and reran the same scratch compare —
  tick 3220's diff got **worse** (342px → 649px), not better, so this is
  **not** an off-by-one in the spawn's own duration; reverted immediately
  (confirmed via `git diff --stat` showing only the intentional, still-
  present base implementation afterward). The missing blob's rough center
  (~137,57 from the map) doesn't correspond to any single table row's
  `(x2,y2)` for any spawn either (its x2/y2 would need to come from two
  different `n` values ~3 apart to fit both axes) — i.e. it is NOT simply
  "one whole spawn rendered at the wrong `n`". Left **unresolved** — named
  precisely rather than guessed at further, per this session's time budget.

**What a resuming worker needs** (this session's incremental narrowing, on
top of E2a-3's still-valid position/matrix/frame/lag/base tables, none of
which needed re-deriving):
- Don't re-open the palette/blend hypothesis — it's closed by source, not
  just by empirics (see the call-chain trace above).
- Don't re-open position/scale/sign/lag/base — E2a-3's sweep already covered
  these exhaustively and this session's own diffmap confirms the bulk
  silhouette matches at every `n` tested (2-3178px cores render correctly;
  only edges/one localized blob don't).
- The two sub-patterns (salt-and-pepper edge noise when `|a|>256`; one
  isolated missing blob when `|a|<256`) may be TWO separate bugs, not one —
  worth attacking them separately rather than one combined whole-frame fit.
  The compressed-half noise smells like a rounding-convention mismatch in
  `drawSpriteSheetAffineRotate`'s own `>>8` truncation at extreme scale
  ratios (worth comparing against the ball-spin precedent's own scale range,
  which never got this compressed — `BALL_SPIN_TABLE`'s largest `|pa|` is
  255, `DRAGON_BREATH`'s starts at 703, ~2.75x further into the regime where
  1-texel rounding differences flip more destination pixels). The magnified-
  half missing blob needs its own isolated-spawn pixel trace (mask out every
  OTHER draw call, render spawn 7 alone against a blank canvas, and diff
  against an oracle capture with all other content subtracted) rather than
  guessed at from whole-scene diffs, since the "which n" arithmetic above
  didn't resolve to a clean single-spawn explanation.
- `tools/compare/scratch/diffdump.mjs` and `diffmap.mjs` (both new, committed,
  generic — not DRAGON_BREATH-specific) and `tools/compare/scratch/
  dragonbreath-projectile-window.json` (a ready-made `captureFrames`
  3177-3235 scratch trace, byte-identical script to the committed
  ground-truth trace) are ready for the next worker to reuse without
  rebuilding this session's own harness.

**Pulled, not shipped**: same discipline as E2a-2/E2a-3 — the render code
was written, re-verified against the diff-color dump, found still short of
pixel-exact, and reverted (`git checkout -- src/engine/battleScene.ts`).
`turn2-dragonbreath.json`'s `captureFrames` are UNCHANGED this session
(still `3121-3176` + `3236-3263`, 84/84) — **checked, not assumed**: re-ran
`npm run compare` against the actual committed trace with the (about-to-be-
reverted) projectile code temporarily wired in, expecting a no-op since all
8 spawns' `n` window closes by render tick 3223 (well before the 3236 half
of the already-captured range). That expectation was **wrong on the OTHER
edge** — spawn 0's own `n=0` becomes visible at render tick `pressTick+229+1
= 3175`, which sits INSIDE the already-captured `3121-3176` range, and
produced real regressions there (`3175`: 12px diff, `3176`: 15px diff,
same salt-and-pepper compressed-half signature characterized above, not a
new failure mode). Caught by actually running the check rather than trusting
the arithmetic; reverted immediately after. This is exactly why the fix
can't be landed partially (e.g. "only draw for `t>=3177`") without also
special-casing the currently-green 3175-3176 pair — the residual reaches
back to a spawn's very first visible tick, not just its later, larger
frames. The `3177-3235` gap (and now also the fact that 3175-3176 would
regress if this draw call were ever added unconditionally) remains open,
with a precise negative result (palette ruled out by source+pixels) and a
precise positive characterization (two distinct scale-dependent artifact
shapes, present from a spawn's very first tick) rather than E2a-3's "narrow,
specific bug" placeholder.

**Verification**: `npm test` **711/711** unchanged (no engine/test code
changed or left changed), `npm run build` green, tree clean at this docs
commit. `turn2-dragonbreath.json` **84/84** unchanged. Regression spot-check
`turn2-endeavor-drain.json` **200/201** unchanged (same pre-existing
ISSUES #19 residual tick, untouched this session — out of this session's
file ownership per the brief).

## Engine slice E2a-5 (S7, bounded worker, follows E2a-4 above): fire-projectile attempt #4 — supervisor's SAMPLING-CONVENTION hypothesis tested and REJECTED by direct sweep (every alternative convention scores worse than the current one); pulled a fourth time, no wrong pixels shipped

This session's assigned method was narrower than E2a-2/3/4's own RAM-probe-
then-sweep cycle: re-wire E2a-3's exact settled config verbatim (base=
(72,88), lag=1, direct matrix `pa=a,pb=b,pc=-b,pd=a`, position/matrix/frame
tables all taken byte-for-byte from E2a-3/E2a-2's own banked data, nothing
re-derived) and test ONE specific hypothesis first: that
`drawSpriteSheetAffineRotate`'s own sampling convention (half-pixel
destination offset, `>>8` rounding, iteration-box size) — not any
DRAGON_BREATH-specific value — is the defect, since this is this codebase's
only other rotating-affine consumer besides the ball spin, and DRAGON_BREATH
scales far more extreme (`|pa|` starts at 703 vs the ball's max 255) than
the ball spin ever exercises.

**Iteration-box convention — already correct, confirmed from source, not
swept as a live variant.** `gDragonBreathFireSpriteTemplate.oam =
&gOamData_AffineDouble_ObjNormal_32x32` (`battle_anim_dragon.c:93`) — the
SAME `ST_OAM_AFFINE_DOUBLE` mode the ball spin's own sprite already uses
(`docs/battle-scene-notes.md` §7.17's own citation), i.e. hardware doubles
the destination scan window to 2×native-size, still centered on the
sprite's real x/y. `drawSpriteSheetAffineRotate`'s existing `for (dy=-h;
dy<h...) for (dx=-w; dx<w...)` loop (`w`/`h` = the NATIVE 32×32 frame size,
not doubled) already iterates exactly this 64×64 doubled window with
`halfW=w/2=16` as the native texture-space center — this is precisely the
double-size convention GBATEK/hardware specifies for `AFFINE_DOUBLE` OBJs,
already validated working for the ball spin. Re-testing a non-doubled
variant would contradict a source-confirmed fact and was skipped to spend
the session's time on the two conventions that were genuinely open
questions.

**Rounding/offset convention — SWEPT, hypothesis REJECTED.** Real GBA OBJ
affine sampling (GBATEK "Rotation/Scaling for OBJs", same formula Tonc's
`affine` chapter documents bit-for-bit and this codebase's own module doc
above already cites for the ball spin): for a destination screen pixel at
INTEGER offset `(dx,dy)` from the sprite's own center, `texX = ((dx*pa +
dy*pb) >> 8) + halfW`, `texY = ((dx*pc + dy*pd) >> 8) + halfH` — plain
integer pixel-corner sampling, no `+0.5` destination offset documented
anywhere in the hardware spec, and the `>>8` is a genuine arithmetic shift
(floor toward -infinity for negative operands, not truncate-toward-zero —
matters for the negative `pa`/`pb` DRAGON_BREATH's near-180°-rotated matrix
always has). This is EXACTLY what `drawSpriteSheetAffineRotate`'s existing
body already does — so the "default" convention is already the
hardware-documented one, not an unvalidated guess.

Swept it against E2a-3's settled config anyway, per the brief's explicit
instruction to test empirically rather than trust the reading alone.
`drawSpriteSheetAffineRotate` gained an optional `variant` param (`"default"
| "halfPixel" | "round" | "halfPixelRound"`) — **`"default"` is
byte-identical to the function's original body**, so the ball spin's own
call site (unchanged, still omits the param) carries zero regression risk
regardless of what the sweep found; only the (temporary, since-reverted)
projectile draw call passed a non-default variant. The two non-default
axes, kept in fixed-point (no floats, since a fractional intermediate would
make JS's `>>` truncate-toward-zero before shifting, which would NOT match
what real fixed-point hardware does — scaling `dx`/`dy` by 2 and shifting by
9 instead of 8 avoids that trap):
- **`halfPixel`**: sample at `(dx+0.5, dy+0.5)` instead of `(dx,dy)`
  (`dx2=2*dx+1`, shift 9).
- **`round`**: round-to-nearest via `+256` before the (now 9-bit) shift,
  instead of a bare floor.
- **`halfPixelRound`**: both together.

Ran all 4 through `npm run compare` against
`tools/compare/scratch/dragonbreath-projectile-window.json` (dense
3177-3235, 59 frames, unchanged from E2a-4), summing `diffPixels` across
every captured frame:

| variant | total diffPixels (59 frames) | vs default |
|---|---|---|
| **default** (current code, unchanged) | **8181** | baseline |
| halfPixel | 21469 | **2.6x worse** |
| round | 21933 | **2.7x worse** |
| halfPixelRound | 11410 | **1.4x worse** |

Every alternative convention is worse than the current one, most by a wide
margin — the opposite of what the hypothesis predicted. Spot-checked the
`default` run's own numbers against E2a-4's own banked per-tick reads to
confirm this session's re-implementation is a faithful reproduction (not a
different, accidentally-worse baseline): tick 3178 = 23px (E2a-4: "23px at
tick 3178"), tick 3208 = 2px (E2a-4: "only 2px at tick 3208 — the closest
this residual gets to exact anywhere in the window"), tick 3220 = 342px
(E2a-4: "342 diff pixels" at spawn 7's `n=17`) — all three exact matches,
confirming apples-to-apples before trusting the sweep's relative verdict.

**Verdict: the supervisor's hypothesis is REJECTED.** The defect is NOT in
`drawSpriteSheetAffineRotate`'s sampling convention — the function's
existing floor-based, no-half-pixel-offset, doubled-box convention already
matches the hardware-documented one, and empirically nothing beats it. The
residual E2a-4 characterized (salt-and-pepper edge over-draw when
compressed, one isolated missing blob when magnified) has some OTHER cause,
not yet identified. Two structural notes for whoever picks this up next:
- The `halfPixelRound` combination scoring meaningfully better than either
  half-pixel or round alone (11410 vs ~21700) but still worse than plain
  `default` is itself informative — it says the current convention isn't
  merely "close to right with the wrong rounding," since any rounding
  perturbation in either direction makes it worse, not better. That's the
  signature of matching the true convention already, with the residual
  coming from a different source entirely (a data value, not a formula).
- Per the brief's step 4 fallback (isolate the magnified-half blob against a
  blank canvas), that work was not attempted this session — the hypothesis
  test above consumed the full time budget. It remains the next concrete
  lead: render spawn 7 alone (the tick-3220 case already localized) against
  a blank canvas and diff against an oracle capture with all other content
  subtracted, since whole-scene diffing hasn't isolated it.

**Pulled, not shipped**: same discipline as E2a-2/3/4 — the render code +
`variant` sweep instrument were written, tested, found to confirm rather
than close the gap, and reverted in full (`git checkout --
src/engine/battleScene.ts`); `drawSpriteSheetAffineRotate` carries no
`variant` param in the committed tree, byte-identical to before this
session. `turn2-dragonbreath.json`'s `captureFrames` are UNCHANGED (still
`3121-3176` + `3236-3263`, 84/84) — the `3177-3235` gap remains open, and
(per E2a-4's own still-valid finding) an unconditional projectile draw call
would also regress the already-green `3175-3176` pair, so this can't be
landed as a partial/conditional fix either.

**Verification**: `npm test` **711/711** unchanged (no engine/test code
changed or left changed), `npm run build` green, tree clean at this docs
commit. Regression suite not re-run this session since the shared function
is byte-identical to its pre-session state (nothing to regress) — the
`variant` param and the projectile draw call both lived and died together
within this session, never landing in a state where `drawSpriteSheetAffineRotate`'s
committed behavior differed from E2a-4's own baseline.
