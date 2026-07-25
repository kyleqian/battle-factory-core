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

## Idle-motion (species send-out front-anim) subsystem enumerated + ported, DRAGON_RAGE's target -1 drift closed (2026-07-25)

**Verdict: real subsystem, source-attributed and RAM-confirmed, ported
generically and wired into DRAGON_RAGE's target-sprite path only. Dense
framebuffer match improved 86/150 → 127/150 (player-attacker orientation,
verified deterministic on two independent live oracle runs). Three
pre-existing, differently-rooted residuals remain (none newly introduced);
`MOVE_DRAGON_RAGE` stays `partial`.**

**Rung 1 — enumeration + probe.** Per the step brief's own probe-first
rule, RAM-probed ONIX's own battler sprite directly by battler index
(`gBattlerSpriteIds[0]`/`[1]`, `tools/probe/dump-onix-front-idle-anim.py`,
`src/data/gen/onix-front-idle-probe.json`) across the whole
CHARMELEON-vs-ONIX fixture — sidestepping `gBattleAnimAttacker`/
`gBattleAnimTarget`, which are stale/zeroed until `DoMoveAnim` runs
(`battle_anim.c:201-206`); the prior rung's own full-move probe had
silently been reading battler 0 twice for its "target" rows before the
move's own `gAnimScriptActive` flip, not ONIX's real sprite. The clean
probe shows ONIX's sprite (`x2=1, y2=0, animNum=1`) with an active
callback resolving to `SpriteCallbackDummy` (`nm pokeemerald.elf`:
`0x08007428`) from the fixture's very first recorded tick — the
mechanicLab staging harness fast-forwards past the send-out intro before
the trace starts, so no committed window observes the animation
mid-flight, only its already-settled terminal state.

Mapped that callback back to source: `sMonFrontAnimIdsTable[SPECIES_ONIX]
= ANIM_RAPID_H_HOPS` (`pokemon.c:1501`) → `Anim_RapidHorizontalHops`
(`pokemon_animation.c:3567-3599`), triggered once at send-out
(`BattleAnimateFrontSprite`/`DoMonFrontSpriteAnimation`,
`pokemon.c:6803-6856`). It is NOT a continuous idle loop: its own
accumulator (`data[2]`) runs 0→2040 over 86 ticks through a 4-phase
piecewise formula, then permanently freezes `x2`/`y2` at the last active
tick's value and hands off to `WaitAnimEnd` → `SpriteCallbackDummy`
(`:5540-5544`) for the rest of the battle — until an unrelated mechanism
(here, `AnimTask_ShakeMon`'s own unconditional `x2 = gBattleAnimArgs[1]`
absolute set, `battle_anim_mon_movement.c:98-99`) overwrites it.
Hand-derived source arithmetic at the last active accumulator (2040)
gives `x2=1, y2=0` — matching RAM exactly, cross-checked independently of
the terminal-state probe.

**Enumeration answers:** per-species (keyed by `sMonFrontAnimIdsTable`,
opponent/front sprite only — the player's own back sprite uses a
completely separate table/function family, `sSpeciesToBackAnimSet`/
`BACK_ANIM_*`, not explored); plays once, not looped; triggered by
send-out; keeps one accumulator (`data[2]`) plus a terminal `data[6]=0`
reset. Which other committed-fixture species share this family: only
ONIX is currently rendered on the front-sprite side in a dense window;
DRAGON_RAGE's own reverse orientation would need CHARMELEON's own front
entry (`ANIM_BACK_AND_LUNGE`, a different, unexplored multi-phase
function) — named as out-of-scope below, not ported. This connects to
`docs/battle-menu-notes.md` §4's own open item (the settled action-menu's
"idle-bob" flagged unresolved for ONIX): that item is a DIFFERENT
mechanism (`DoBounceEffect`/`SpriteCB_BounceEffect`, a `y2`-only sine
bounce, already fully source+RAM-resolved by a sibling lane's
`docs/battle-menu-idle-notes.md` §1) — the two were conflated under one
"idle-bob" label in prior doc comments, but are unrelated source
functions (one writes only `y2` and loops forever; this one writes
`x2`+`y2` and freezes after 86 ticks). Named here so a future session
doesn't re-chase `DoBounceEffect` for this residual or vice versa.

**Rung 2 — port.** `src/engine/speciesIdleAnim.ts`: a species → front-anim
family table (only `ONIX`/`RAPID_H_HOPS` populated, per the stop-threshold
rule) plus a faithful `rapidHorizontalHopsOffsetAtTick` port (all 4 phases)
and a generic `computeTerminalOffset` driver that runs the port to its own
natural stopping point rather than hardcoding the `{1,0}` result — adding
a second species/family later is a table entry plus its own step function,
not an ONIX-only special case. `tests/speciesIdleAnim.test.ts` (5 tests)
pins hand-derived per-tick values across all 4 phases plus the RAM probe's
own settled state.

**Rung 3 — wired, target-sprite path only.** `sceneOnPresentation.ts`'s
new `dragonRageTargetOffset` applies the species idle offset only when
`animationAge < schedule.targetShakeTick` AND the target is on the
opponent (front-sprite) side; at/after the shake's own creation tick,
`shakeMonOffsetAtRenderTick` alone is authoritative (matching source's
absolute-set clobber). A real bug surfaced wiring this in: the
player-attacker fixture's own `target.spriteCorner.x` was `145` (144 + the
same residual baked directly into the constant — the identical hack
`docs/aerial-ace-portable-staging-probe.md` independently used for
AERIAL_ACE's own opposite-side ONIX target, and the same one
FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own SHARED ONIX-opponent presets
still use). Adding the offset on top of the already-baked corner
double-counted (146, not 145) and regressed the dense run to 0/150 before
the fixture was corrected back to the generic `144` — caught immediately
by re-running the comparator, not left in. DRAGON_RAGE's own fixture is
NOT shared with any other move's config (confirmed: no other
`sceneOnPresentation.ts` preset references `CHARMELEON`), so this fix is
scoped to DRAGON_RAGE alone; FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own
shared `145` presets are untouched (their own windows never cross the
residual's reset boundary, so the baked hack still happens to be correct
for them — a real, differently-scoped remainder for whoever eventually
generalizes those, not touched this step).

**Rung 4 — dense re-run.** Player-attacker orientation: **86/150 →
127/150**, reproduced identically on two independent live oracle runs
(deterministic) and A/B-verified against the pre-fix baseline replayed
over the same cached oracle capture (`git checkout` of the prior commit's
two files against the same RGB dir) — zero regressions, only new matches
added. The three remaining named residuals are pre-existing and
unrelated to this rung's own fix (confirmed present in the pre-fix
baseline too): (1) a single-frame boundary artifact at render age 1
(shake lag-2 creation-guard interaction); (2) a fire-spit rounding
residual at render ages 86-96 (not a lag question — lag 0/1/2 all score
equal or worse); (3) newly isolated (previously hidden under the broader
pre-fix mismatch range) at render ages 98 and 105-114, coinciding with
the fire-plume spawns' own creation window — candidate cause is the
fire-plume framebuffer lag, already flagged as inferred-by-analogy rather
than independently confirmed. Per the step brief's own rule, since the
player orientation isn't fully clean, the opponent-attacker orientation
was not attempted this rung (it would also need CHARMELEON's own
`ANIM_BACK_AND_LUNGE` front-anim family ported first).

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` (19 exact / 2 partial
unchanged) — `remaining` updated with the new 127/150 count and the
narrowed residual list.

**Evidence.** `npm test` 2207/2207 (2202 + 5 new). `npm run build` green.

## DRAGON_RAGE rungs 1-3: render-age-1 guard fixed, fire-spit sheetFrame off-by-one root-caused from source, fire-plume window disciplined-probed but not resolved — 127/150 → 139/150, stays `partial` (2026-07-25)

**Verdict: two of the three named residuals fixed on hard evidence (one of
them overturning the prior rung's own "rounding question" hypothesis); the
third (fire-plume) got a genuine disciplined probe cycle — colors dumped,
RAM read, two candidate fixes tried and both rejected on evidence — but no
fix survived, so it stays named, not swept. `MOVE_DRAGON_RAGE` stays
`partial`, a strictly smaller remainder than last rung's.**

**Rung 1 — render-age-1 creation-guard artifact, fixed.** Pixel-dumped
frame 90 (render age 1) of the player-attacker dense window directly: the
oracle photo already shows the attacker's `AnimTask_ShakeMon` offset
applied one tick before the lag-2 model's own `renderTick < creationTick`
guard clears — a shifted-tileset color map confirmed the two images agree
everywhere except a small silhouette region matching exactly a 2px
`yOffset` shake state the app predicts as zero. `shakeMonOffsetAtRenderTick`
now special-cases `renderTick === creationTick - 1` to return the raw
`{xOffset,yOffset}` (the RAM-invisible collapsed `sequence[0]` write,
framebuffer-visible for exactly that one transient tick) instead of zero;
every other pre-creation tick is unaffected. Tier-1 pinned
(`tests/dragonRage.test.ts`).

**Rung 2 — fire-spit "rounding" residual, root-caused as a real bug, not a
rounding question.** Per the step brief's own probe-first method,
pixel-dumped the render-age-86-96 diff colors *first*: they were genuine
small-ember fire-ramp colors, but the oracle's true fire-spit silhouette
was consistently LARGER than the app's, correlated with WHICH of the 3
animation frames was active (frame 0 undercounted ~5x, frame 2
overcounted) — a shape signature, not a rounding/timing one, so the step
brief's own "further `drawSpriteSheetAffineRotate` rounding question"
hypothesis is falsified and recorded as eliminated. Source proof
(`reference/pokeemerald/src/battle_anim_dragon.c:126-131`):
`sAnim_DragonRageFire` is `ANIMCMD_FRAME(16,3),(32,3),(48,3),JUMP(0)` —
byte-identical tile offsets to `sAnim_DragonBreathFire_0` (`:47-52`), the
already-pixel-exact DRAGON_BREATH precedent, which `dragonBreath.ts`
already reads with a `+1` tile-row-block shift (RAM's own `animCmdIndex` is
an index into the 3-entry ANIMCMD array, not a tile-row-block number — tile
offsets 16/32/48 are blocks 1/2/3, block 0 belongs to a different animation,
`sAnim_OutrageOverheatFire_0`). `dragonRage.ts`'s own `sheetFrame` formula
was missing that shift, silently picking the wrong, unused-by-this-
animation tile block for frame 0. Fixed the formula and the two Tier-1
assertions that had pinned the old (wrong) `sheetFrame === animCmdIndex`
equality to the source-justified `animCmdIndex + 1`; fire-plume's own
`sheetFrame` is untouched (its own animcmd table legitimately starts at
tile 0, a separate asset). Dense sweep: every render age 86-96 frame now
matches, zero regressions.

**Rung 3 — fire-plume window (render ages 98, 105-114): disciplined-probed,
not resolved, negative results recorded.** Two sub-cases, investigated
independently:

- **Render age 98** (the exact tick both the target `AnimTask_ShakeMon` and
  fire-plume spawn 0 are created): a 1598px mismatch confined exactly to
  ONIX's own sprite box, using ONIX's own grayscale palette — NOT
  plume-palette colors (the step brief's own hypothesis for this family,
  checked directly and not confirmed). RAM-probed the target sprite's full
  state (position, x2/y2, animNum, animCmdIndex, invisible, subpriority,
  matrixNum) across the surrounding ticks: all clean and unchanged, so the
  mismatch isn't explained by any currently-modeled variable. Confirmed
  deterministic (byte-identical mismatch on a second, independent fresh
  oracle run). Not root-caused.
- **Render ages 105-114** (10 frames, 1px each): confirmed via direct pixel
  reconstruction (manually sampling each candidate spawn's own tileset at
  its RAM-read position/frame) to be a real tie-break bug between two
  overlapping same-subpriority fire-plume spawns — but not a single-knob
  fix. Reversing the paint order within each subpriority group fixes the
  105-113 overlap (spawn 0 vs spawn 1) but breaks a *different*,
  previously-clean overlap at render ages 114-118/123 (spawn 1 vs spawn 4) —
  tried, net smaller improvement, reverted, not shipped. A uniform
  fire-plume lag of 0 was also tried (ages 98-144 regress hard, 112/150,
  much worse) and rejected; lag 1 stays committed. The age-114 case further
  shows spawn 1's own rendered sheet frame sits one step behind what the
  uniform 1-tick lag model predicts at its OWN specific frame-boundary
  transition, while the same lag is exactly right for every other
  simultaneously-active spawn — a genuinely compound (z-order tie-break
  *and* a per-spawn frame-transition detail) residual, not a single
  constant to sweep. Isolating it cleanly needs a fixture where individual
  plume spawns don't spatially overlap each other, out of this rung's
  budget.

**Rung 4 — not reached.** Player orientation is 139/150, not the required
150/150, so per the step brief's own gate the opponent-attacker orientation
dense run and CHARMELEON's `ANIM_BACK_AND_LUNGE` front-anim port were not
attempted this step.

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
139/150 with the narrowed, single-family (fire-plume) residual.

**Evidence.** `npm test` 2209/2209 (2207 + 2 new: the rung-1 transient pin
and the rung-2 `sheetFrame` shift assertions). `npm run build` green. Both
fixes reproduced against a fresh, independent oracle capture (not just the
cached one used to iterate) — 139/150 byte-identical both times.

## Current handoff

- **State:** **19 exact / 2 partial / 255 unsupported.**
- **Did:** Fixed 2 of the 3 DRAGON_RAGE residuals named at the end of the
  prior rung: (1) the render-age-1 shake creation-guard artifact
  (`shakeMonOffsetAtRenderTick`'s own `renderTick === creationTick - 1`
  transient, Tier-1 pinned); (2) the fire-spit "rounding" residual, which
  turned out to be a real `sheetFrame` tile-row-block off-by-one
  (`dragonRage.ts` was missing the same `+1` shift `dragonBreath.ts`
  already carries for the byte-identical `sAnim_DragonRageFire`/
  `sAnim_DragonBreathFire_0` animcmd tables — source-proven, not fitted).
  Dense framebuffer match improved 127/150 → 139/150 (player-attacker
  orientation), reproduced byte-identical on a fresh independent oracle
  run. The third residual (fire-plume window, render ages 98/105-114) got
  a full disciplined probe cycle — pixel colors dumped, RAM state read,
  two candidate fixes (z-order reversal, lag=0) tried and both rejected on
  evidence — but no fix survived, so it's named, not swept. See the dated
  section above for the full accounting.
- **Evidence:** `npm test` 2209/2209, `npm run build` green.
- **Next:** DRAGON_RAGE's own remainder is now a single family (fire-plume,
  render ages 98 + 105-114), in cost order: (1) render age 98's 1598px
  ONIX-silhouette mismatch — RAM state is clean/unchanged through this
  window, so it needs a different investigative angle than RAM-state
  comparison (candidate: a fixture with less concurrent sprite creation at
  this tick, or direct emulator VRAM/OAM-buffer instrumentation rather than
  the CPU-RAM probe this track has used so far); (2) render ages 105-114's
  compound z-order-tie-break-plus-per-spawn-frame-transition interaction —
  needs a fixture where individual plume spawns don't spatially overlap
  each other to isolate the two sub-causes independently; (3) only once
  player orientation reaches a clean 150/150 twice, the opponent-attacker
  orientation dense run, gated on porting CHARMELEON's own front-anim
  family (`ANIM_BACK_AND_LUNGE`, unexplored — a materially different,
  multi-phase step-function chain, not a copy of `Anim_RapidHorizontalHops`).
  Separately, FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own shared
  ONIX-opponent presentation presets (`sceneOnPresentation.ts`) still bake
  the species-idle-anim `+1` residual directly into their `spriteCorner.x=145`
  constant rather than modeling it — harmless today since none of those
  windows cross the residual's own reset boundary, untouched again this
  step (out of scope). Alternatively, the next ranked `dragon-fire-projectile`
  siblings FIRE_BLAST and FIRE_SPIN remain open, as does MIST_BALL's own
  remainder (see the archived "Interpreter generalization" section).
- **Housekeeping:** `ANIMATION_PROGRESS-archive.md` extended 2026-07-25;
  the DRAGON_RAGE rung-5 section moved there (older than the "~3 most
  recent" convention), keeping the rung 5 remainder, the idle-motion
  section, and this rungs-1-3 section as the live tail.
