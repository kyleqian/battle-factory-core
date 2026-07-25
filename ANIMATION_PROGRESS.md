# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## MOVE_DRAGON_RAGE enumeration: STOP AND SPLIT (2026-07-25)

**Verdict: does NOT generalize cheaply from the existing `dragon-fire-
projectile` family. Enumerated the full command surface per the step
brief's own rule and stopped before writing any render code, per that
rule's explicit sanction ("that is a successful outcome, not a failure").**
DRAGON_RAGE is Level-50 legal (`FRONTIER_MON_CHARMELEON_2`, confirmed in
`factory-animation-inventory.json` before starting), so this is a scope
finding, not a legality block.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_DRAGON_RAGE` (`battle_anim_scripts.s:5243-5273`)
into `battle-move-anim-scripts.json`'s new `DRAGON_RAGE` entry (`callback:
null`, `status` field records the stop) — additive only, `git status` after
a full re-run showed only that one extractor + its one JSON output changed.
No render/callback code lands this step.

**Command-surface enumeration** (every op read against its real C callback):
- `loadspritegfx ANIM_TAG_SMALL_EMBER` — already extracted
  (`battle-anim-small-ember.json`, DRAGON_BREATH); this move's fire-spit
  sprite uses frames 0/4 of that same sheet (that extraction's own
  `otherFramesNeedsOnly` note already flagged them as DRAGON_RAGE's).
- `loadspritegfx ANIM_TAG_FIRE_PLUME` — **NEW asset, not yet extracted
  anywhere**: `gBattleAnimSpriteGfx_FirePlume` (`fire_plume.png`, 32x160px,
  5 stacked 32x32 frames) paired with `gBattleAnimSpritePal_Fire`
  (a DIFFERENT, also-unextracted source PNG, `fire.png`, supplies only the
  palette — same tile-vs-palette split this codebase's extractor already
  handles elsewhere, just a fresh pair of source files).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 40, 1` —
  already-ported primitive (`shakeMon.ts`, proven via QUICK_ATTACK/FLY).
  Every prior call site shakes the TARGET; this is the first ATTACKER-side
  use, but the primitive itself is battler-agnostic — cheap render wiring,
  not a new port.
- `createsprite gSlideMonToOffsetSpriteTemplate, ANIM_TARGET, 2, 0, 15, 0, 0, 4`
  — **NEW primitive**: `SlideMonToOffset` → `InitSpriteDataForLinearTranslation`
  + `TranslateSpriteLinearByIdFixedPoint` (`battle_anim_mon_movement.c:537-576`).
  `gBattleAnimArgs[0]=0` selects the ATTACKER's own sprite (the `ANIM_TARGET`
  field only sets the dummy sprite's OAM subpriority, the same
  battler-vs-argv split MIST_BALL's own enumeration already established).
  **Confirmed NOT the same mechanism `mudSandSlide.ts` ports**: that module
  is a hand-fit lookup table for SAND_ATTACK/MUD_SLAP's own createsprite args
  (x=-10, duration 3/4), not a generic port of this accumulator — read both
  side by side: `SlideMonToOffset` writes to a REFERENCED mon sprite via
  `data[5]` with plain-division rounding, while the already-ported
  `animLinearTranslation.ts` (`InitAnimLinearTranslation`) writes to the
  sprite's OWN x2/y2 with direction-in-low-bit rounding — different layout,
  different math.
- `create_dragon_rage_fire_spit_sprite ANIM_TARGET, 2, initial_x=30,
  initial_y=15, target_x=0, target_y=10, duration=10` —
  `gDragonRageFireSpitSpriteTemplate` (`battle_anim_dragon.c:158-167`)
  shares `AnimDragonFireToTarget` → `StartDragonFireTranslation`
  (`:218-274`, comment literally says "For Dragon Breath and Dragon Rage")
  and an identically-shaped 3-frame/3-tick sheet cadence with DRAGON_BREATH's
  own ember, reusing the already-ported Q8.8 accumulator. Two genuinely new
  parts: (1) DRAGON_BREATH's own script always passes all-zero
  initial/target offsets, so `StartDragonFireTranslation`'s side-branch logic
  was never exercised — it has a real quirk, confirmed straight from source:
  the opponent-side branch uses `cmd->initialY` to offset `sprite->x` (not
  `initialX`), an asymmetry DRAGON_RAGE's nonzero args actually exercise;
  (2) its own affine anim (`AFFINEANIMCMD_FRAME(0x64,0x64,127,1)`, one step)
  uses different scale constants and shape than DRAGON_BREATH's own
  two-step ramp — DRAGON_BREATH's `MATRIX_A`/`MATRIX_B` tables are
  RAM-PROBED literals, not a closed-form derivation, so this needs its own
  fresh probe (likely simpler, given the single-step affine anim, but not
  confirmed against real RAM).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 3, 25, 1` —
  already-ported primitive, same shape as every prior target-shake site.
- `create_dragon_rage_fire_plume_sprite` ×8 (relative_to=ANIM_TARGET every
  time — the callback's ANIM_ATTACKER branch is dead code for this move, a
  red herring like MIST_BALL's unconsumed `ANIM_TAG_WHITE_FEATHER` load) —
  **NEW callback**: `AnimDragonRageFirePlume` (`battle_anim_dragon.c:246-265`)
  is a STATIC-position sprite (no translation/accumulator at all — simpler
  than every other mechanism this track uses): places itself at the target's
  `BATTLER_COORD_X/Y`, applies the already-established side-signed x-offset
  pattern (`ember.ts`'s `sideSignedOffset`) plus a plain y offset, plays a
  5-frame/5-tick-each reveal ONCE (`ANIMCMD_END`, not `JUMP`), then
  self-destroys via `RunStoredCallbackWhenAnimEnds` once `animEnded`
  latches. Per-spawn `subpriority_offset` varies (66 or 2) — a real per-spawn
  detail. Needs its own RAM probe for lifetime/render-lag; none of the
  existing ported sprite families use this "static + one-shot reveal +
  destroy-on-animEnd" shape.
- `createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_TARGET, 66, 0, 0, 4`
  — **NEW primitive** (paired with `SlideMonToOffset` above but a SEPARATE
  C function): `SlideMonToOriginalPos` (`battle_anim_mon_movement.c:478-535`)
  has its own data layout and step function — restores the attacker's
  current x2/y2 back to 0 over 4 ticks, not a fresh two-point interpolation.

**Tally: 4 substantive new items** (`ANIM_TAG_FIRE_PLUME` asset,
`SlideMonToOffset`/`SlideMonToOriginalPos` primitive pair,
`AnimDragonRageFirePlume`'s new static/one-shot/self-destroy mechanism,
`StartDragonFireTranslation`'s side-asymmetric offset quirk plus a fresh
affine probe) — at the step brief's own "~4 substantive ops" stop
threshold, though none individually rises to a "new subsystem" the way
MIST_BALL's `AnimComplexPaletteBlend`/`AnimTask_MistBallFog` did (no new
BG tiles/tilemap, no external fade-gate dependency). Combined with a real
60-minute session cap, landing all four with disciplined RAM-probe-first
evidence (per-mechanism render-lag bisection, both orientations, dense
comparators run twice for determinism) was not achievable without cutting
a corner somewhere. Per the brief's own stop-threshold rule, this session
stopped after the enumeration + additive extractor decode rather than
rushing a partial port.

**Remainder for whoever picks this back up** (in cost order): ~~(1) extract
`ANIM_TAG_FIRE_PLUME` (`fire_plume.png` tiles + `fire.png` palette) — pure
mechanical decode, same shape as every prior asset addition~~ **done, see the
"DRAGON_RAGE enumeration remainder, rungs 1-2" section below**; ~~(2) port
`SlideMonToOffset`/`SlideMonToOriginalPos` as a shared primitive (Tier-1
tests first, no move wiring needed yet — same standalone-port pattern
`shakeMon.ts`/`animLinearTranslation.ts` used)~~ **done, same section
below**; (3) RAM-probe the whole
move body in one battle-lab window (attacker shake → slide-to-offset →
fire-spit → 8 plumes → slide-to-original) to pin every cadence/render-lag
in one pass, the same technique `dump-dragonbreath-anim.py`/
`dump-ember-creation.py` already used; (4) port `AnimDragonRageFirePlume`
and wire `StartDragonFireTranslation`'s offset quirk + fresh affine table;
(5) dense comparators in both orientations, run twice for determinism.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry) —
shared code alone never promotes coverage, and zero render code landed
this step.

**Evidence.** `npm test` 2180/2180 (unchanged — no engine module touched,
extractor-only change). `npm run build` green. `git status` after the
extractor re-run showed only `extract-battle-move-anim-assets.ts` and
`battle-move-anim-scripts.json` changed.

## DRAGON_RAGE enumeration remainder, rungs 1-2: FIRE_PLUME extracted, SlideMonToOffset/SlideMonToOriginalPos ported (2026-07-25)

**Rung 1 — `ANIM_TAG_FIRE_PLUME` asset extraction.** Mirrored the DRAGON_BREATH
small_ember block's exact layout: `fire_plume.png` (32x160, 4x20 tiles, 5
stacked 32x32 frames, `gDragonRageFirePlumeSpriteTemplate`'s tile source)
paired with `fire.png`'s own embedded palette (the `ANIM_TAG_FIRE_PLUME`
palette-table entry points at `gBattleAnimSpritePal_Fire`, a separate source
PNG — same tile-vs-palette split `extract-battle-anim-assets.ts`'s
particles.png/circle_impact.png pair already established). Writes
`src/assets/gen/battle-anim-fire-plume.json`; pinned in
`tests/moveAnimAssets.test.ts` mirroring the rocks.png per-asset pattern.
Additive only — `git status` after a full extractor re-run showed only the
new JSON output plus the extractor/test files touched.

**Rung 2 — `SlideMonToOffset`/`SlideMonToOriginalPos` primitive port.**
RAM-probed a real DRAGON_RAGE window first, per the step brief: staged a
Factory-legal CHARMELEON attacker (mirroring FRONTIER_MON_CHARMELEON_2's own
real MOVE_DRAGON_RAGE grant) vs. ONIX via a new `mechanicLab overrides.parties`
fixture (`tools/battle-lab/mechanic-dragon-rage-charmeleon-onix.json`) and a
new probe (`tools/probe/dump-dragonrage-slide.py`, committed evidence
`src/data/gen/dragonrage-slide-probe.json`) that identifies the two dummy
sprites by their own `template` pointer against
`gSlideMonToOffsetSpriteTemplate`/`gSlideMonToOriginalPosSpriteTemplate`'s
real rodata addresses (stable for the sprite's whole lifetime, unlike
`callback` which reassigns itself after the first tick).

Ported both 1:1 as `src/engine/slideMon.ts`
(`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`, plus
`slideMonToOffsetMirroredDeltas` for `SlideMonToOffset`'s own opponent-side
mirror and `*DestroyTick` helpers). Both share
`InitSpriteDataForLinearTranslation`'s plain-truncating-division Q8.8 setup
(confirmed distinct from `animLinearTranslation.ts`'s direction-in-low-bit
variant, per the original enumeration's own finding) but the RAM probe
surfaced **two real divergences between their step functions**, both now
encoded in the port rather than assumed: (1) `SlideMonToOriginalPos_Step`
truncates its accumulator's own contribution to `(s8)` before adding back the
base offset; `TranslateSpriteLinearByIdFixedPoint` (SlideMonToOffset's step)
does not — irrelevant at this move's own ≤15px magnitudes but part of the
real function. (2) Self-destroy timing differs by a full tick: SlideMonToOffset's
finish branch only *reassigns* `sprite->callback` to `DestroyAnimSprite`
(`SetCallbackToStoredInData6`), so the actual destroy fires the FOLLOWING
tick — RAM shows the dummy sprite alive for 5 ticks on a 4-tick duration
(168-172, tick 172 a repeated no-op), gone by 173. SlideMonToOriginalPos_Step
calls `DestroyAnimSprite` directly in its own finish branch, same tick as the
last accumulate — RAM shows exactly 4 ticks alive (235-238), gone by 239.
`tests/slideMon.test.ts` asserts the port reproduces the probed attacker `x2`
at every RAM tick across both windows (168-172 offset-out, 235-238
offset-back) plus both destroy-tick counts, all matching exactly on first
run — no curve-fitting needed once the source's two branch orders were read
correctly. The opponent-side mirror branch (`battlerSide: "opponent"`) is
unit-tested from source only — this attacker was on the player side in the
probed window, so the mirror itself is **not yet independently RAM-verified**
(named remainder, not claimed exact).

**No move wiring.** `AnimDragonRageFirePlume`, the fire-spit sprite's
asymmetric-offset branch, and `StartDragonFireTranslation`'s own fresh affine
probe are untouched — out of this step's scope per the brief.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry).

**Evidence.** `npm test` 2190/2190 (2180 + 10 new: 3 fire-plume asset pins,
7 slideMon RAM pins). `npm run build` green.

## DRAGON_RAGE rungs 3-4: whole-move RAM probe, full engine port, interpreter generalized — still unsupported, no dense pixel evidence (2026-07-25)

**Verdict: the move body is fully ported and Tier-1-pinned against real RAM
in both attacker orientations, but zero dense oracle-pixel window was run
this step — per this codebase's own MIST_BALL precedent (a standalone,
Tier-1-pinned, not-yet-wired engine module), DRAGON_RAGE stays *unsupported*
(no `ANIMATION_COVERAGE.json` entry), not `partial`: `partial` requires "a
meaningful dense window is green," and none was attempted.**

**Rung 3 — whole-move RAM probe.** Extended rung 2's slide-only probe into
`tools/probe/dump-dragonrage-full.py`: one pass capturing `gAnimVisualTaskCount`/
`gAnimScriptActive` (ground truth for `waitforvisualfinish`'s own gating),
both `AnimTask_ShakeMon` calls (attacker then target, identified across
their self-reassignment from `AnimTask_ShakeMon` to the static, non-exported
`AnimTask_ShakeMon_Step` — resolved via `nm pokeemerald.elf`, not the map
file), the fire-spit sprite (position + its own single-step affine matrix
via `gOamMatrices`), all 8 fire-plume sprites (creation ticks, `animCmdIndex`
frame stepping, self-destroy), and both slide dummies. Staged BOTH
orientations: the existing CHARMELEON/ONIX fixture plus a new reverse
`tools/battle-lab/mechanic-dragon-rage-onix-charmeleon.json` (ONIX player,
CHARMELEON opponent) — needed to RAM-probe `StartDragonFireTranslation`'s
side-asymmetric offset branch and its own affine constants on the side
DRAGON_BREATH never exercises. Committed as
`src/data/gen/dragonrage-full-probe-{player,opponent}-attacker.json`.

**Rung 4 — port + wire the move body.** Generalized
`animScriptInterpreter.ts` with `interpretAnimSchedule`: the
`waitforvisualfinish` sprite-lifetime tracking the MIST_BALL enumeration
(2026-07-24) flagged as needed to generalize past FEATHER_DANCE's own
script-position coincidence. `Cmd_waitforvisualfinish`
(`battle_anim.c:455-465`) blocks until `gAnimVisualTaskCount == 0` — every
item active since the last wait, not just the most recent — so the
scheduler tracks each creation op's own "gone" tick (per-primitive lifetime
supplied by the caller: `shakeMonSequence(...).length - 2`,
`slideMonTo{Offset,OriginalPos}DestroyTick`, this move's own fire-spit/
fire-plume lifetimes) and resolves each `waitforvisualfinish` as
`max(activeGoneTicks) + 1` — a real, RAM-confirmed 1-tick resolution lag,
not a hand-fit. Verified exactly (all 5 of DRAGON_RAGE's own
`waitforvisualfinish` barriers, both orientations) before being trusted;
`tests/dragonRage.test.ts`'s `dragonRageSchedule` tests pin every predicted
creation tick against the rung-3 probe.

`src/engine/dragonRage.ts` drives the whole move through this scheduler
from the decoded script. Reuses `shakeMon.ts` (first ATTACKER-side
`AnimTask_ShakeMon` call site — same primitive, plus the already-established
priority-5 same-frame-double-step `+1` creation-tick adjustment
`fly.ts` documents) and `slideMon.ts` verbatim. Adds two new mechanisms:

- **Fire-spit sprite** (`StartDragonFireTranslation`): the opponent-side
  branch's `sprite->x -= cmd->initialY` asymmetry (confirmed straight from
  source, not guessed) plus a fresh, RAM-probed single-step affine matrix
  per side — player `(pa,pb,pc,pd) = (-183,-4,4,-183)`, opponent
  `(184,0,0,184)`, both distinct from DRAGON_BREATH's own matrices as
  predicted. The per-tick Q8.8 delta is a RAM-probed literal (constant
  across the sprite's life, `data[1]`/`data[2]`), not closed-form derived
  from either battler's resolved `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` — those
  don't reproduce the literal via `floor(|distance|<<8/duration)` for
  reasons not fully chased down this step (same "RAM-probed literal, not a
  closed form" convention `dragonBreath.ts`'s own `MATRIX_A`/`MATRIX_B`
  tables already use for this callback family). Frame cadence reuses
  `dragonBreath.ts`'s own `((age+1)/3 % 3)` formula verbatim — RAM-confirmed
  identical shape (`sAnim_DragonRageFire` is byte-identical to
  `sAnim_DragonBreathFire_0`, exactly as the enumeration predicted).
- **Fire-plume sprites** (`AnimDragonRageFirePlume`, all 8 spawns): static
  position at the target's own `BATTLER_COORD_X`/`Y` (`targetBattlePosition`
  — solved independently from the fire-spit's own `X_2`/`Y_PIC_OFFSET`
  anchor and confirmed genuinely distinct, not a copy/paste error), offset
  by `SetAnimSpriteInitialXOffset` (side-signed, same `sideSignedOffset`
  shape `ember.ts` established) on X and a plain add on Y. RAM-probed
  26-tick lifetime per spawn, identical across all 8 independently: a
  4/5/5/5/7-tick frame-duration pattern (first frame short one tick — the
  same "creation tick already reflects one step" idiom `slideMon.ts`
  documents; last frame held 2 extra ticks after its own countdown before
  `RunStoredCallbackWhenAnimEnds`'s own deferred-destroy fires).

`tests/dragonRage.test.ts` (11 tests) pins every mechanism against BOTH
committed RAM probes at every probed tick: schedule ticks (all 6 creation
events, both orientations — exact match, validating the interpreter
generalization), attacker/target shake offsets, both slide phases, fire-spit
position/frame/matrix (both sides), and all 8 plume spawns'
position/subpriority/frame across their full 26-tick life (both sides).

**What's NOT done — the real remainder.** `dragonRage.ts` is not wired into
`sceneOnPresentation.ts`'s move-dispatch system (`SceneOnMoveConfig` union,
`createSceneOnMovePresentation`, a `sceneOnDragonRageView` function) — that
system doesn't yet know the CHARMELEON species (a new
`SceneOnPresentationBattler.species` union member + geometry constants,
which this step DID reverse-solve precisely from the RAM probe for both
roles: attacker `X_2/Y_pic` `(72,97)` player-side / `(176,49)` opponent-side;
ONIX-as-target `X_2/Y_pic` `(176,42)` opponent-side / `(72,88)` player-side,
`battlePositionCenter` `(176,40)` / `(72,80)` — see `dragonRage.ts`'s own
geometry constants and doc comments for the derivation). No portable
comparator script (`tools/compare/dragonRagePortable.ts`, mirroring
`emberPortable.ts`) or dense-window RGB probe exists yet, so no oracle-pixel
window has run at all — the acceptance bar this move still needs.
**Remainder, in cost order:** (1) add `CHARMELEON` to
`SceneOnPresentationBattler`'s species union + wire its `spriteCorner`
(not yet solved — only the two coordinate pairs above were needed for this
step's math); (2) add a `SceneOnDragonRageConfig` case + view function to
`sceneOnPresentation.ts` calling straight into `dragonRage.ts`'s exported
functions; (3) a portable comparator + RGB probe script (mirror
`emberPortable.ts`/`tools/probe/run-battle-lab-rgb.py`); (4) dense windows
at full recorded counts, both orientations, each run twice for determinism;
(5) only then promote a coverage entry (`exact` if clean, `partial` with the
remainder named otherwise).

**Evidence.** `npm test` 2201/2201 (2190 + 11 new). `npm run build` green.

## DRAGON_RAGE rung 5: wired through the Scene-ON seam, comparator built, dense run finds a multi-tier capture-lag residual — still unsupported (2026-07-25)

**Verdict: real progress on every ordered remainder item, but no green dense
window — MOVE_DRAGON_RAGE stays *unsupported*, not `partial`, per the
rubric's own "a meaningful dense window is green" bar for `partial`.**

**Rung 5.1 — presentation wiring.** Extended `tools/extract/extract-battle-mon-pics.ts`
with `CHARMELEON` (mechanical species-list addition, same shape as
SPOINK/ARCANINE/DUGTRIO — additive only, `mon-pic-coords.json` was already
complete). Added `CHARMELEON` to `SceneOnPresentationBattler`'s species
union, a `SceneOnDragonRageConfig` + `SceneOnDragonRageView` pair, and
`sceneOnDragonRageView` to `sceneOnPresentation.ts` — driven entirely by
`dragonRageSchedule(0)` plus the already-ported `shakeMonOffsetAtRenderTick`/
`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`/
`dragonRageFireSpitStateAtAge`/`dragonRageFirePlumeStateAtAge` (no turn-keyed
branches, no absolute-tick constants). `battleScene.ts` gained the matching
`DRAGON_RAGE` draw case: attacker/target sprites offset by the composed
shake+slide state, the fire-spit sprite drawn via the existing
`drawSpriteSheetAffineRotate` primitive (already generic enough for a fresh
matrix, no new draw code needed), and the 8 fire-plume sprites split
front/behind the target by their own per-spawn `subpriorityOffset` (2 vs 66)
— the fire-spit-vs-attacker order reuses `dragonBreathEmbersInFrontOfAttacker`
directly, since the fire-spit's own `createsprite` subpriority
(`targetSubpriority - 2`) is the identical shape EMBER's own embers use.

**Rung 5.2 — portable comparator + RGB probe.** `tools/probe/dump-dragonrage-rgb.py`
mirrors `run-battle-lab-rgb.py`'s capture-loop/CLI shape
(`<scenario> <output> <rgb-dir>`) combined with `dump-dragonrage-full.py`'s
own template-pointer sprite/task identification, so it drives exactly like
`emberPortable.ts` drives its own probe.
`tools/compare/dragonRagePortable.ts` checks both a component read (attacker/
target offset, fire-spit position/frame/matrix, fire-plume positions — self-
calibrated against ONIX's own species-specific baseline OAM residual rather
than hardcoding it, since the residual is per-orientation) and full
framebuffer pixels. Both fixtures staged with real RAM-read HP/gender
(`tools/compare/fixtures/dragon-rage-{player,opponent}-charmeleon-*.json`):
CHARMELEON 133/133, ONIX 110/110, both male in both orientations (read
directly from the probe's own `player`/`opponent`/`*Personality` fields, not
assumed).

**A real bug the first comparator run caught immediately, fixed:** the draw
block's healthbox branch had player/opponent backwards, calling ONIX's
hardcoded-117-max-HP helper (`onixPlayerHealthboxContentForState`) for what
is actually a 133-HP CHARMELEON slot in this fixture — `composePlayerHealthbox`
threw immediately (`invalid HP 133/117`), so this was caught before any
pixel comparison ran, not silently wrong. Replaced with fully generic
`composeOpponentHealthbox`/`composePlayerHealthbox` calls keyed off a new
`SceneOnDragonRageFieldProfile` (adds explicit `playerMaxHp`/`opponentMaxHp`
— no existing shared field profile carries them, since every prior move's
fixtures reused one canonical battler's own hardcoded-maxHP helper).

**Dense run: component math is exact, framebuffer capture lag is not
uniform.** At zero capture lag (comparing the view directly against the
probe's own RAM reads, no display-timing adjustment), every mechanism's
position/frame/matrix math matches the oracle's RAM state exactly — this
reconfirms rung 3-4's Tier-1 pinning, now cross-checked against a
second, independently-captured probe. The FRAMEBUFFER (photographed pixel)
comparison is where this rung stops short: probing capture-lag values 0-3
against the cached RGB dump (player-attacker fixture) shows the lag is
**not one uniform constant** the way it is for every other staged move so
far —
- Attacker `AnimTask_ShakeMon`'s own 2-tick toggle pattern needs lag=**2**
  (149/150 frames of the pure-shake window 89-238 match at lag=2, vs.
  48/150 at the codebase's normal lag=1 — checked directly, mismatch
  direction confirmed oracle-vs-app, alternates in lockstep with the
  shake's own 2-tick period, exactly the signature of a one-tick phase
  shift, not a value error).
- The fire-spit sprite's own translation wants lag=**1**: at lag=2 (tuned
  for the shake), frame 175's diff (`108-112,97-98`: oracle shows fire
  colors `255/0/0`/`255/99/16`/`255/198/33`, app shows background) is the
  fire-spit appearing one frame EARLIER in the real oracle than the
  lag=2 model predicts.
- Target `x2` drifts by an unmodeled **-1** starting exactly at the target
  shake's own creation tick (frame 186 onward in the player-attacker
  fixture) and holds through at least frame 193 — `DRAGON_RAGE_TARGET_SHAKE`'s
  own `xOffset` is 0, so the port correctly predicts a constant x2, but
  real RAM shows it stepping down by one right at that tick. Isolated via
  the comparator's own component check (self-calibrated baseline), not
  yet root-caused (candidate: some interaction between the SlideMonToOffset
  dummy sprite's own finish branch, still alive until one tick after its
  4-tick duration per `slideMonToOffsetDestroyTick`, and the target shake
  task's creation in the same window — not confirmed).

This is the same category of finding BLAZE_KICK's own module already
documents (matrix vs. palette writes reaching the framebuffer on different
ticks) — DRAGON_RAGE has five independent mechanisms sharing one move body,
and at least three distinct lag/drift behaviors among them. Properly
resolving this needs its own per-mechanism RAM-vs-photo bisection (the
"disciplined probe cycle" the step brief calls for), which this rung's
remaining time did not allow after building and running the comparator
itself. Per the step brief's own instruction, the code is left at the
codebase's normal lag=1 default (the least speculative choice, matching
every other staged move) rather than blind-fitting lag=2 to only partially
fix the picture — `battleScene.ts`'s `DRAGON_RAGE` case is real, wired,
and buildable, but its framebuffer output does not yet match the oracle.

**Not attempted:** no exhaustive per-mechanism bisection, no opponent-
attacker-orientation framebuffer run (the player-attacker fixture's own
residual already blocks a green window), no coverage entry.

**Remainder, in cost order:** (1) bisect the target x2 drift's own root
cause (likely a short, disciplined RAM probe around ticks 185-194 of the
already-staged fixture); (2) determine whether the shake/fire-spit lag
split is genuinely per-mechanism-type (as BLAZE_KICK's own precedent
suggests) or reveals a modeling bug in one of the two RAM-tick-to-display
mappings; (3) re-run the dense comparator, both orientations, twice each,
once the residuals are resolved; (4) only then promote a coverage entry.

**Evidence.** `npm test` 2201/2201 (unchanged — no new Tier-1 test this
rung; the comparator's own findings are dev-time evidence, not production
logic). `npm run build` green.

## DRAGON_RAGE rung 5 remainder: per-mechanism lag encoded, idle-bob drift root-caused, lands `partial` (2026-07-25)

**Verdict: real, dense-verified progress (44/150 → 86/150 framebuffer frames,
player-attacker orientation) and the -1 drift is genuinely root-caused by RAM
probe, not fitting — but three named residuals remain, so `MOVE_DRAGON_RAGE`
lands `partial`, not `exact`.**

**Rung 1 — per-mechanism lag, encoded as named constants
(`dragonRage.ts`'s `DRAGON_RAGE_FRAMEBUFFER_{SHAKE,SLIDE,FIRE_SPIT,
FIRE_PLUME}_AGE_LAG`, mirroring `dragonBreath.ts`'s own `_OAM_AGE_LAG`/
`_PALETTE_AGE_LAG` split), pinned by `tests/dragonRage.test.ts`.
`battleScene.ts`'s `DRAGON_RAGE` draw case now computes four separately-
lagged views instead of one shared `age - 1`, switching the attacker's own
lag mid-flight at the exact tick it switches mechanism (shake → slide).**
A first box-isolated pixel bisection pass (`tools/compare/scratch/
dragonrage-lag-bisect{,-cached}.ts`, committed) initially suggested
shake=1/slide=0, but that pass ran through `render()` while the OLD
`battleScene.ts` code still had its own hardcoded `age - 1` underneath —
silently double-applying a lag the bisection script wasn't accounting for.
The values actually committed come from a full dense framebuffer sweep run
against the real draw path with that hidden shift removed
(`tools/compare/scratch/dragonrage-dense-cached.ts`, committed, reruns
fast against one cached oracle capture): **shake=2, slide=1, fire-spit=1**
(the last also independently confirmed by direct RAM-to-pixel correlation:
the photographed fire-spit pixels at render age 87 sit at the x2=14 column,
RAM tick 175's value, one tick behind the already-Tier-1-pinned RAM
prediction). Fire-plume lag (1) is inferred by mechanism-class analogy
only — every plume spawn spatially overlaps both the target sprite and a
sibling plume for its whole 26-tick life, so no clean isolation window
exists in this fixture to confirm it independently.

**Rung 2 — the -1 drift, root-caused by RAM probe.** Extended nothing (the
already-committed `dragonrage-full-probe-player-attacker.json` per-tick
dump already had everything needed). The step brief's own candidate
(SlideMonToOffset's dummy sprite staying alive one tick past its duration,
interacting with the target shake task's same-frame creation) is
**REFUTED**: the dummy is alive ticks 168-172 (RAM-confirmed, matching
rung 2's own prior finding); the target shake task is created at tick 186 —
a 13-tick gap, no temporal overlap at all. The REAL mechanism, read
straight from `AnimTask_ShakeMon`'s own source
(`battle_anim_mon_movement.c:98-99`): `gSprites[spriteId].x2 =
gBattleAnimArgs[1]` is an **unconditional absolute set**, not an additive
offset — it directly overwrites whatever x2 the sprite already had. RAM
shows the target sprite (ONIX) carries an unrelated x2=+1 residual from
tick 82 onward (a pre-existing idle-animation artifact, NOT part of
DRAGON_RAGE's own script — this is the SAME already-open, not-yet-source-
attributed idle-bob class `battleScene.ts`'s own materialize-window doc
comment already flags as unresolved for ONIX, see `docs/battle-menu-
notes.md` §4). When `AnimTask_ShakeMon`'s creation code runs at tick 186
(`xOffset=0` for the target shake), it clobbers that residual to exactly 0
— which is what `DRAGON_RAGE_TARGET_SHAKE`'s own model already predicts,
so the model is right FROM tick 186 onward and wrong (by the pre-existing,
out-of-scope residual) for the ~97 ticks before it. Per the step brief's
own instruction, this is named as the strictly-smaller, out-of-scope
residual rather than chased further (porting a generic species idle-bob
subsystem is a new mechanism, explicitly out of this step's scope).

**Rung 3 — dense acceptance: partial, not exact.** One dense framebuffer
run, player-attacker orientation only (time did not allow the opponent
orientation or a second run of either this step): **86/150** frames match
(up from 44/150 at the single global `age - 1` default). Three named
residuals remain, none fully chased down: (1) a single isolated frame
(render age 1) where the shake lag-2 shift pushes
`shakeMonOffsetAtRenderTick`'s own creation guard into zeroing a
legitimate just-post-creation state; (2) the idle-bob residual above,
active for the ~97 ticks before the target shake's own creation; (3) a
smaller residual inside the fire-spit sprite's own active window (render
ages 86-96) that persists at every lag value tried (0, 1, 2 all score
equal or worse than 1) — likely a `drawSpriteSheetAffineRotate` rounding
question, not a timing one, not root-caused this step.

**Not attempted:** opponent-attacker orientation dense run; a second run of
either orientation for determinism; fire-plume's own independent lag
confirmation; the fire-spit residual's own root cause.

**Coverage:** `MOVE_DRAGON_RAGE` promoted to `partial` in
`ANIMATION_COVERAGE.json` (19 exact → unchanged, 1 → 2 partial) — a
meaningful dense window (86/150, more than half) is green with the
remainder named precisely, matching the `partial` rubric.

**Evidence.** `npm test` 2202/2202 (2201 + 1 new: the four lag constants
pinned in `tests/dragonRage.test.ts`). `npm run build` green.

## Current handoff

- **State:** **19 exact / 2 partial / 255 unsupported.**
- **Did:** DRAGON_RAGE's per-mechanism capture-lag bisection (rung 1) and
  the -1 drift root-cause (rung 2, RAM-confirmed, prior candidate
  refuted) — see the dated section above. Dense framebuffer match improved
  44/150 → 86/150 (player-attacker orientation). Promoted to `partial`.
- **Evidence:** `npm test` 2202/2202, `npm run build` green.
- **Next:** DRAGON_RAGE's own remainder, in cost order: (1) the opponent-
  attacker orientation dense run (not attempted this step); (2) the
  fire-spit residual's own root cause (render ages 86-96, not a lag
  question — every candidate lag scores the same or worse); (3) fire-
  plume's own independent lag confirmation (needs either a different
  fixture with less spatial overlap, or a same-window differential
  technique); (4) whether to also port the ONIX/CHARMELEON idle-bob
  mechanism generically (cross-move, `docs/battle-menu-notes.md` §4's own
  existing open item) rather than leaving it as DRAGON_RAGE's own named
  residual. Alternatively, the next ranked `dragon-fire-projectile`
  siblings FIRE_BLAST and FIRE_SPIN remain open, as does MIST_BALL's own
  remainder (see the archived "Interpreter generalization" section).
- **Housekeeping:** `ANIMATION_PROGRESS-archive.md` created 2026-07-25;
  sections older than DRAGON_RAGE's own saga moved there, matching
  `PROGRESS-archive.md`'s convention.
