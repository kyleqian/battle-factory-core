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
## Current handoff

- **State:** **19 exact / 2 partial / 255 unsupported.**
- **Did:** Enumerated and RAM-probed DRAGON_RAGE's own target idle-bob
  residual, source-attributed it to `Anim_RapidHorizontalHops`
  (ONIX's own send-out front-anim, `pokemon_animation.c:3567-3599`),
  ported it generically (`src/engine/speciesIdleAnim.ts`), and wired it
  into DRAGON_RAGE's target-sprite path only. Fixed a double-counting bug
  (the fixture's own `spriteCorner` had the same residual baked in) along
  the way. Dense framebuffer match improved 86/150 → 127/150
  (player-attacker orientation, deterministic on two runs). See the dated
  section above for the full mechanism/port/residual accounting.
- **Evidence:** `npm test` 2207/2207, `npm run build` green.
- **Next:** DRAGON_RAGE's own remainder, in cost order: (1) the render-age-1
  shake creation-guard artifact; (2) the fire-spit rounding residual
  (render ages 86-96, not a lag question); (3) the newly-isolated
  fire-plume-window residual (render ages 98, 105-114) — needs either a
  fixture with less spawn overlap or a same-window differential technique
  to confirm the fire-plume lag independently; (4) the opponent-attacker
  orientation dense run, gated on porting CHARMELEON's own front-anim
  family (`ANIM_BACK_AND_LUNGE`, unexplored — a materially different,
  multi-phase step-function chain, not a copy of `Anim_RapidHorizontalHops`).
  Separately, FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own shared
  ONIX-opponent presentation presets (`sceneOnPresentation.ts`) still bake
  the same `+1` residual directly into their `spriteCorner.x=145` constant
  rather than modeling it — harmless today since none of those windows
  cross the residual's own reset boundary, but a future session
  generalizing further should be aware the hack is still there, untouched
  this step (out of scope: "wire it into the DRAGON_RAGE window... ONLY
  there"). Alternatively, the next ranked `dragon-fire-projectile`
  siblings FIRE_BLAST and FIRE_SPIN remain open, as does MIST_BALL's own
  remainder (see the archived "Interpreter generalization" section).
- **Housekeeping:** `ANIMATION_PROGRESS-archive.md` extended 2026-07-25;
  the DRAGON_RAGE enumeration/rungs-1-2/rungs-3-4 sections moved there
  (older than the "~3 most recent" convention), keeping rung 5, the rung 5
  remainder, and this idle-motion section as the live tail.
