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

## `blend_color_cycle` group A extended: enumeration priced CONFUSION/PSYCHIC/FUTURE_SIGHT at 2 net-new components each; MOVE_FUTURE_SIGHT ported (cheapest, attacker-only), lands `partial` — BG swap/rotation exact, attacker-sprite residual named (2026-07-25)

**Verdict: real port, not a fit — but a genuine residual remains, same
class as GROWTH's own history.** Enumeration (30-min phase, MANDATORY
ORDER step 1): read the real scripts for all three group-A siblings
(`battle_anim_scripts.s:4716-4767`) against the already-ported set
(`battle-animation-components.json` + a live check of `src/engine/`).
All three tie at exactly 2 net-new substantive components beyond what's
already proven — `SetPsychicBackground`/`UnsetPsychicBackground`'s own
`AnimTask_SetPsychicBackground` (a BG-palette-2 11-entry ring rotation) plus
its `BG_PSYCHIC` asset. `blend_color_cycle` itself, `AnimTask_ShakeMon`
(proven via `MOVE_FLY`), `AnimTask_ShakeMon2` and `AnimTask_
ScaleMonAndRestore` (both proven via `MOVE_GROWTH`/`MOVE_BIND`), and the
whole `monbg`/`clearmonbg`/`fadetobg`/`restorebg`/`waitbgfadein`/
`waitbgfadeout`/`setalpha`/`blendoff`/`setarg` visual-command family are all
already-ported reuse, verified directly against each move's real
`componentIds` in the graph, not assumed. **MOVE_FUTURE_SIGHT picked as the
cheapest to port**: it's an attacker-only self-effect (`blend_color_cycle` +
`ScaleMonAndRestore` on `ANIM_ATTACKER`, the identical shape to already-exact
`MOVE_GROWTH`) with zero target-side task composition — CONFUSION/PSYCHIC
additionally wire `AnimTask_ShakeMon2`(attacker) + `AnimTask_ShakeMon`
(target) simultaneously with the blend, a real composition risk FUTURE_SIGHT
doesn't carry. Factory-legal at Level 50: `FRONTIER_MON_KADABRA_1`
(`SPECIES_KADABRA`, moves include `FUTURE_SIGHT`) vs `FRONTIER_MON_ONIX`
(already this lane's common fixture opponent).

**RAM-probed first** (`tools/probe/dump-future-sight-psychicbg.py` against a
fresh legal `mechanicLab` fixture, player KADABRA/FUTURE_SIGHT vs opponent
ONIX, oracle ticks 60-200), before any render code: `REG_BLDY`'s two
fade-cover ramps around the BG swap are asymmetric (a 4-tick hold on the
way in, a 5-tick hold on the way out — RAM-probed, not assumed symmetric);
the BG palette 2 rotate-right-by-1-every-4-ticks ring was confirmed
byte-exact against the extracted `psychic.png` palette including the
wraparound entry (entry 11's original color correctly lands in entry 1);
the attacker blend/scale pair's own creation tick is age 37 relative to the
fade's own start tick.

**Ported** as `src/engine/futureSight.ts`, Tier-1-pinned (`tests/
futureSight.test.ts`, 8/8, all values checked directly against the RAM
probe's own output). `BG_PSYCHIC` extracted (`tools/extract/
extract-psychic-bg.ts`, same `indexedPng`/tilemap pipeline as
`MOVE_EXTREME_SPEED`'s `BG_HIGHSPEED` — no compression concern, since the
committed source graphics are plain PNG/bin, not the ROM's own LZ-compiled
bytes). KADABRA's battle back sprite extracted (`extract-battle-mon-pics.ts`,
same dimensions/`yOffset` as HAUNTER's, spriteCorner reused). Wired through
the Scene-ON seam (`sceneOnFutureSightView`, `battleScene.ts`'s
`FUTURE_SIGHT` draw case): psychic-BG-vs-default-BG selection, `REG_BLDY`
darken (reusing the SHADOW_PUNCH/EXTREME_SPEED `gpuDarken` pattern), and the
attacker blend/affine path (reusing GROWTH's own `drawSpriteSheetAffineStretch`
tint/affine seam). A 1-tick display lag on the BG-palette-rotation read was
pixel-confirmed and fixed (same framebuffer-lags-RAM-write class as GROWTH/
BLAZE_KICK); GROWTH's own `(scaleLag=2, tintLag=1)` attacker pair was then
tried on this move's identical blend+scale seam and **partially transfers**
(improved the match count, did not fully resolve it — see below), confirming
the step brief's own caution that per-mechanism lag is not automatically
portable.

**Dense comparator** (`tools/compare/futureSightPortable.ts` + `tools/
compare/fixtures/future-sight-player-kadabra-opponent-onix.json`), one
orientation only (player-back KADABRA → opponent-front ONIX; the family
map's own derivation says the OBJ-row/task arithmetic is side-uniform, so
the opposite orientation is expected to need only a KADABRA front-sprite
extraction, not a new mechanism — not yet staged, so marked `partial` per
this step's own orientation rule), 114-frame window (oracle ticks 77-190,
every frame): **framebuffer 75/114**. The BG swap/rotation/fade, target
ONIX, healthboxes, and message printer are pixel-exact for their own
frames. The remaining 39/114 mismatches are confined to KADABRA's own
attacker sprite box (bbox 44,65-100,111) during the blend/scale window —
the same class of species-specific attacker residual GROWTH itself carried
for a full prior session (which turned out to be a display-lag bug, not an
asset/idle-offset issue) before being promoted to exact. Not RAM-probed
further this session (out of this rung's time budget) — named, not chased
blind, per this run's no-blind-fit policy.

**Coverage:** added `MOVE_FUTURE_SIGHT` to `ANIMATION_COVERAGE.json` as
`partial`.

**Evidence.** `npm test` 2451/2451 (2443 + 8 new `futureSight.test.ts`).
`npm run build` green.

**Next action for a future session:** RAM-probe KADABRA's own attacker-box
residual directly (VRAM/OAM dump at a clean pre-move tick and window ticks,
the `dump-growth-ivysaur-vram.py` precedent) to find whether it's a further
display-lag refinement or a genuine asset/idle-anim gap, then extend to a
second orientation (KADABRA front sprite) and re-run `futureSightPortable.ts`
to confirm `exact`. The `blend_color_cycle` family map's own group B-F
sibling clusters (target-flash, longer-flicker, whole-screen, side-selector,
degenerate-snap) remain untouched, parked in the archived family-map entry.

**Housekeeping:** moved the "blend_color_cycle family map" section (this
same family, its argv survey table stays in the archive for future group
B-F reference) to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention); MOVE_GROWTH's own two most recent entries stay
live alongside this one.

## MOVE_GROWTH promoted to `exact`: last named residual (IVYSAUR attacker salt-and-pepper) was a display-lag bug, not species idle offset or asset decode — both dense windows 63/63, twice each (2026-07-25)

**Verdict: real fix, RAM-probe-first as directed — both suspected classes
from the step brief were checked and disproved with hard evidence before
any code changed; the actual cause was a third class the brief didn't
name.** `tools/probe/dump-growth-ivysaur-vram.py` read IVYSAUR's own
attacker-battler OAM (`x2`/`y2`, tileNum, paletteNum) plus the full VRAM
tile bytes and OBJ palette row (faded + unfaded) at a clean pre-move tick
and window ticks, both orientations: `x2`/`y2` are 0 at every tick (no
idle-anim rest offset — also confirmed from source: `speciesIdleAnim.ts`'s
own doc notes IVYSAUR's front `ANIM_V_STRETCH`/back `ANIM_H_SLIDE` families
both explicitly zero out on completion, unlike ONIX's `RAPID_H_HOPS`, so
the "missing from `SPECIES_FRONT_ANIM_FAMILY`" theory named last session
was never going to explain a residual here), and the extracted
tileset+palette are byte-identical to live VRAM/PLTT (all 64 tiles, all 16
colors, at every probed tick) — ruling out an asset/decode bug too.

**The real cause.** `growthAnimationAtAge`'s own mechanism is RAM-exact
against the live OAM matrix with NO lag (unchanged, still true) — but the
CAPTURED FRAMEBUFFER lags the matrix write, the same class of latency
already documented for BLAZE_KICK ("OAM one frame after the reducer,
palette one more VBlank after that"), except inverted: here the affine
SCALE lags the reducer by 2 ticks and the BLEND TINT lags by only 1.
Bisected empirically (all 9 (scaleLag, tintLag) pairs up to 2, both
fixtures) using the real render pipeline, not a reimplementation — (2, 1)
is the only pair landing 63/63 in both. Fixed in `sceneOnGrowthView`
(`src/engine/sceneOnPresentation.ts`) by reading the scale and tint
components at independently lagged ages. Updated `growthPortable.ts`'s own
component check to compare the RAW (unlagged) mechanism against RAM
directly, since that check's job is verifying `growthAnimationAtAge`'s own
math, not the display-lag presentation choice.

**Dense comparator, both orientations, twice each:** component 63/63,
framebuffer 63/63 — reproduced byte-identical on a second independent run
each. **Coverage: `MOVE_GROWTH` promoted to `exact`.**

**Evidence.** `npm test` 2443/2443 (unchanged — no Tier-1 logic touched,
only the presentation seam and a comparator diagnostic). `npm run build`
green.

## MOVE_GROWTH rung 3 completed, rung 4 done: scene-wired and dense-compared both orientations, lands `partial` (target exact, attacker residual named) (2026-07-25)

**Verdict: real progress, not a fit.** Completed rung 3 (`GrowthEffect` =
`blend_color_cycle` + `AnimTask_ScaleMonAndRestore`, both RAM-probed to
share one creation tick per call, second call starting exactly 32 ticks
after the first) as `growthAnimationAtAge` (`src/engine/growth.ts`,
`tests/growth.test.ts` 4/4). Extracted IVYSAUR's battle back/front sprites
(CHARMELEON/HAUNTER precedent, `extract-battle-mon-pics.ts`). Wired
`sceneOnGrowthView` + a `battleScene.ts` GROWTH draw case through the
existing `drawSpriteSheetAffineStretch` tint/affine path other moves
already use for palette flashes — `doubled` follows BIND's own precedent
(ANY active affine transform sets `ST_OAM_AFFINE_DOUBLE` on real hardware,
not just over-256 scales).

**Dense comparator (rung 4).** `tools/compare/growthPortable.ts` + two
fixtures, whole 63-frame window per orientation (oracle ticks 211-273,
every frame captured), against the committed `mechanic-growth-*` fixtures.
Component check (attacker affine matrix vs RAM) is **63/63 both
orientations** — the newly-ported mechanism is RAM-exact at every tick,
including age 0's already-nonzero scale. First run surfaced a **full-window
framebuffer loss (0/63)**; pixel-dumped the diff before guessing and found
it traced entirely to the TARGET (ONIX), not the new mechanism — ONIX
(opponent-side front) was missing the already-ported send-out front-sprite
idle residual (`speciesIdleAnim.ts`'s `speciesFrontIdleRestOffset`, the same
"settles at x2=+1" finding DRAGON_RAGE/SHADOW_PUNCH's own dense windows
already required) because GROWTH never runs `AnimTask_ShakeMon` on its
target to overwrite it. Wiring that residual in made the target box
pixel-exact in both orientations.

**Lands `partial`: framebuffer 3/63 both orientations**, reproduced
byte-identical (component and framebuffer counts, bbox, px counts) on two
independent runs each — deterministic. Every remaining mismatch is confined
to IVYSAUR's (the attacker's) own sprite box in both orientations
(player-back: 728px, bbox 48,67-96,111; opponent-front: 585px, bbox
156,28-196,72), a salt-and-pepper pattern on high-detail regions (the
flower bud), not a shift or color swap. Since the affine-matrix component
check is exact at these same frames, the newly-ported blend mechanism isn't
implicated — the pattern matches `speciesIdleAnim.ts`'s own already-named
gap (IVYSAUR isn't yet in `SPECIES_FRONT_ANIM_FAMILY`, and the back-sprite
send-out idle family is explicitly documented there as a separate, unported
mechanism). Not probed/ported this step (a new RAM probe, out of this
rung's time budget) — named, not chased blind, per this run's own
no-blind-fit policy.

**Coverage:** added `MOVE_GROWTH` to `ANIMATION_COVERAGE.json` as `partial`.

**Evidence.** `npm test` 2443/2443 (2439 + 4 new `growth.test.ts`). `npm run
build` green. Both comparators reproduced byte-identical on two independent
runs each.

**Next action for a future session:** RAM-probe IVYSAUR's own send-out
settle offset (both front and back sprite forms — `tools/probe/dump-onix-
front-idle-anim.py` is the direct precedent) and extend
`speciesIdleAnim.ts`'s `SPECIES_FRONT_ANIM_FAMILY`, or add an attacker-side
equivalent of `speciesFrontIdleRestOffset` for the back-sprite family, then
re-run `growthPortable.ts` to confirm `exact`.

**Housekeeping:** moved the superseded "rungs 1-2 done, rung 3 partial"
section (this same move, now complete through rung 4), the "BG-swap
pipeline" dissolution section, and the "SHADOW_PUNCH lands partial (third
session)" section to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention); `blend_color_cycle` family map and DRAGON_RAGE
rung 6/7 stay live alongside this one.
