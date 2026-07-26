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

## Defect A instrument named in the brief CONTRADICTED: the doubled scan window is RAM-byte-identical to hardware — both moves stay `partial`, unchanged counts (2026-07-26)

**Verdict: the "naive 2x bounding box overreaches hardware" hypothesis, as literally stated, is refuted by direct OAM evidence. No render fix attempted (per this step's own contingency: bank evidence and stop, don't chase a speculative fix once the mandate's hypothesis is contradicted).** Wrote `tools/probe/dump-scale-window-oam-scanline.py` (new, extends `dump-monbg-scale-window.py`'s own `sprite_record`) to dump the scaled OBJ's full OAM attr0/attr1 (shape/size/affine-mode bits, the real hardware x/y — not just the matrix, already RAM-confirmed in rung 5) plus raw whole-frame screen captures at the peak-scale ticks, against both fixtures.

**Confirmed exactly as assumed (no defect here):** at FUTURE_SIGHT's attacker peak (oracle tick 130, and its neighbors 116/144) and CONFUSION's target peak (tick 160, neighbors 146/176), OAM `shape=0` (SQUARE), `size=3` (64x64), `affineMode=3` (DOUBLE) — matches this engine's 64x64-tileset assumption exactly, ruling out a shape/size mismatch. More importantly: the real OAM `x`/`y` (`attr1&0x1FF`, `attr0&0xFF`, unwrapped) reads **(8,24)** for FUTURE_SIGHT's attacker throughout the scale window. `sprite.x(72)+x2(0)+centerToCornerVecX(-64, RAM-read directly, matches the doubled `-32*2` from `CalcCenterToCornerVec`'s own table, `reference/pokeemerald/src/sprite.c:137-157`) = 8` — and this engine's own `drawSpriteSheetAffineStretch(doubled=true)` computes its window's screen-space top-left as `ox(40)-halfW(32) = 8`. **Byte-identical.** Same match on Y (24) and on CONFUSION's ONIX target corner. This directly contradicts the brief's own framing that "our scan reaches further than hardware" — the doubled render window's real screen position and size are exactly what this engine already computes; the window itself is not the defect.

**New, load-bearing correction: the earlier `(181,3)` pixel sample (rung 7) was itself using an un-lagged matrix reading and is not representative of the residual's true shape.** Re-checked properly this session: this engine's own `sceneOnFutureSightView` reads the scale matrix at `state.age-2` (the already-proven, RAM-validated GROWTH-derived display lag) — so a screen captured at oracle tick *T* shows the RAM matrix as of tick *T-2*, RAM-confirmed directly here too (matrix at tick114 = 252 = `futureSightAttackerEffectAtAge(0)`'s prediction for what tick116's screen should show; live matrix *at* tick116 itself is 244, which is what tick118's screen shows instead). Redid the per-pixel diff (`tools/compare/scratch/defect-a-scanline-diag.mjs`, new) against the real oracle RGB captures with this lag correctly applied both directions: the residual is **not** simply "oracle transparent, engine opaque" as the single `(181,3)` sample suggested. Most sampled mismatches (e.g. FUTURE_SIGHT tick130, pixel (96,58): app `(198,173,132)`, oracle `(210,86,82)`) are opaque-vs-opaque **color** differences, including pixels **inside the original non-doubled 64×64 footprint** (`dx=56,dy=4`, both within `[0,64)`) — a region the doubled-window-overreach hypothesis cannot touch at all, since that hypothesis only predicts mismatches in the doubled-only fringe. The true residual is a texture-space sampling/coordinate defect somewhere inside the correctly-sized window, not a boundary-clamping bug.

**Checked and ruled out the obvious alternative this evidence suggested (BG2-in-front-of-OBJ):** since `monbg`'s frozen BG2 tile copy stays live for the whole scale window (rung 7's own finding) and rung 7's underlay-fix was a no-op, the natural next guess was that BG2 might actually render *in front of* the scaled OBJ (hiding it under the frozen unscaled copy wherever both overlap, which would explain color-only interior mismatches with no transparency involved). Checked directly: OBJ priority reads `2` and `BG2CNT`'s own priority field also reads `2` throughout the window (`tools/probe/dump-monbg-scale-window.py` rerun ticks 126-132, plus `run-battle-lab-rgb.py`'s own `playerSprite.priority`). Real hardware's OBJ-vs-BG priority tie-break favors the OBJ at equal priority — so BG2 should *not* be winning this composite. Hypothesis checked and set aside, not assumed away.

**One genuinely new, smaller finding, flagged but not chased (out of this step's scope):** CONFUSION's target OAM `x` at tick160 reads `112`, one tick stale relative to the sprite struct's own `x2=3` that same tick (`176+3-64=115≠112`; `176+0-64=112` matches the *previous* tick's `x2=0` exactly) — a real one-tick OAM-copy latency on the shake offset specifically, distinct from the already-modeled scale-matrix display lag. This contradicts `sceneOnConfusionView`'s own doc comment claim that window 2 "needed NO scene-level lag at all." It's a small (±3px) translation effect on the shake, not obviously the driver of defect A's much larger, magnitude-scaling interior residual — banked here for a future session rather than folded in blind.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114. `MOVE_CONFUSION` stays `partial`, 108/140. No render code touched this session.

**Evidence.** `npm test` 2463/2463 (unchanged — probe + scratch diagnostics only, no production code). `npm run build` green.

**Next action for a future session:** the window-bounds hypothesis is closed out (confirmed correct, not the defect). The real next instrument is a texture-space one: at a fixed peak tick, for several interior mismatched pixels, brute-force search KADABRA's/ONIX's own tileset (accounting for the active tint coefficient) for which `(row,col)` actually produces the oracle's observed color, and compare that against this engine's own computed `(sx,sy)` — if they differ by a consistent delta, that names the exact rounding/coordinate bug in `drawSpriteSheetAffineStretch`'s sampling math directly rather than by further pixel-guessing. Separately worth a quick look: the newly-found one-tick OAM x-lag on CONFUSION's target shake (above) — resolve whether `sceneOnConfusionView`'s "no lag" claim needs a correction, independent of defect A.

## Defect A cracked open, not closed: monbg hypothesis RAM-CONFIRMED real, but the direct fix is a no-op — both moves stay `partial`, unchanged counts (2026-07-25)

**Verdict: real, RAM-proven mechanism found; the obvious fix built from it does not close the defect — reverted, not landed.** Mandate: instrument defect A (the scale-window sprite-interior residual, cross-move-triangulated to `monbg`) before touching render code. Wrote `tools/probe/dump-monbg-scale-window.py` (new, cites `Cmd_monbg`/`MoveBattlerSpriteToBG`/`Task_InitUpdateMonBg`/`Task_UpdateMonBg`, `battle_anim.c:591-837`) and ran it against FUTURE_SIGHT's own kadabra-onix fixture, ticks 105-150: reads `gSprites[].invisible`/x2/y2/matrix, `gBattle_BG1_X/Y`/`gBattle_BG2_X/Y`, and the real `BG1CNT`/`BG2CNT`/`BG1HOFS`/`BG1VOFS`/`BG2HOFS`/`BG2VOFS`/`DISPCNT` hardware regs.

**Confirmed:** the attacker OBJ's `invisible` bit is `TRUE` ticks 105-113 (post-`monbg`, pre-scale) and flips `FALSE` at exactly tick 114 — the same tick `attackerScale.active` goes true. Source read explains it exactly: `PrepareBattlerSpriteForRotScale` (`battle_anim_mons.c:1295-1307`), called at `AnimTask_ScaleMonAndRestore`'s own start, unconditionally re-clears the OBJ's `invisible` flag. So `monbg`'s hide is undone the instant the scale task begins — **both** the OBJ (now visible, scaled via its own OAM matrix, already RAM-exact per rung 5) **and** BG2's frozen `MoveBattlerSpriteToBG` tile copy (never rescaled, only re-panned/re-tinted every tick by `Task_UpdateMonBg`) are simultaneously live for the whole scale window. This is real, hard RAM evidence, not a guess.

**The fix built from it did not work.** Tried "draw the same sprite unscaled first, then the real scaled OBJ on top" (gated on `attackerScale.active`/`targetScale.active`) in both moves' `battleScene.ts` draw cases. Reran both dense comparators twice: FUTURE_SIGHT moved only 85/114 → 86/114 (one frame, plausibly noise), and CONFUSION was **byte-identical** at 108/140 — directly verified by stashing the fix and re-rendering the same age: pixel-for-pixel identical output, including inside the mismatch region. **Reverted** (`git checkout -- src/engine/battleScene.ts`) rather than landed.

**Why it was a no-op, and defect A's real shape:** cross-checking already-exact MOVE_BIND's own convention (xDelta=+10 on X drawn as a visible squeeze, i.e. a SHRINK) against `drawSpriteSheetAffineStretch`'s `sy=((ry*my)>>8)+halfH` formula shows a matrix value **below** 256 renders the sprite **bigger** (zoom in), not smaller. FUTURE_SIGHT/CONFUSION's `xDelta=yDelta=-4` is therefore a **GROW** (KADABRA/ONIX puff up), not a shrink — the opposite of this session's initial "shrink exposes a gutter" framing, which is why an underlay fix changed nothing (a grown OBJ already covers any underlay everywhere it matters). Direct pixel sampling (`tools/compare/scratch/confusion-pixel-list.mjs`, new) confirms the real symptom is the opposite of "missing fill": e.g. oracle pixel (181,3) reads `(255,0,0)`, a psychic-BG-swirl color, while this engine's own doubled-affine scan paints an opaque ONIX-gray `(189,181,181)` there — this engine's `doubled=true` scan reaches further than the real hardware's double-size OBJ actually paints.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114. `MOVE_CONFUSION` stays `partial`, 108/140. Neither ledger's pinned counts moved (the +1 FUTURE_SIGHT frame from the reverted fix is gone too).

**Evidence.** `npm test` 2463/2463 (unchanged — no engine/production code landed this session, only the new probe + scratch diagnostics). `npm run build` green.

**Next action for a future session:** the "gutter" framing is wrong; re-derive from the GROW direction. Dump the OBJ's real OAM attr0/attr1 (shape/size bits — this session's probe didn't capture them) plus a raw per-scanline sample at a peak-scale tick (~frame 130) to find exactly where the real hardware's double-size affine window stops painting, since this engine's current "naive 2x bounding box" doubled scan is now the prime suspect for over-reaching. Both moves share this one root cause and should close together once it's found.

**PAPERCUT:** none new this session beyond the already-known first-diff-only bbox report (already fixed by `--per-frame-bbox`, prior session).

## MOVE_CONFUSION ported (group-A sibling): window 1 (attacker) lands 19/20 exact, window 2 (target) carries FUTURE_SIGHT's own defect-A residual, stays `partial` at 108/140 (2026-07-25)

**Verdict: real port, not a fit — window 1 essentially exact, window 2's residual is new evidence for FUTURE_SIGHT's still-open defect A, not a new bug.** Per the archived enumeration, CONFUSION's own script (`battle_anim_scripts.s:4716-4730`, verified directly, not assumed) composes only already-proven pieces around TWO sequential simultaneous-task windows, not one: window 1 (attacker) `AnimTask_ShakeMon2`+`blend_color_cycle`; window 2 (target) `AnimTask_ShakeMon`+`AnimTask_ScaleMonAndRestore` (same xDelta/yDelta/duration as FUTURE_SIGHT's own attacker scale, here on the TARGET - the real composition risk this port existed to check). Reused FUTURE_SIGHT's own KADABRA/ONIX fixture pairing (`FRONTIER_MON_KADABRA_1` carries both moves) - zero new sprite extraction needed.

**RAM-probed first** (`tools/battle-lab/mechanic-confusion-kadabra-onix.json`, the already-committed generic `run-battle-lab-rgb.py`, no new probe script): fade 1 is byte-identical in shape to FUTURE_SIGHT's own (same subroutine); window 1 creates at age 37 - the SAME age FUTURE_SIGHT's own attacker effect starts at; window 2 creates at age 65; fade 2 starts later (age 101, not 73 - window 2's own longer task chain runs first) but shares FUTURE_SIGHT's exact ramp/hold/ramp shape; the BG-palette rotation ring carries the SAME rung-6 pause mechanism at its own breakpoint (age 97, not 69) - directly RAM-confirmed against the raw palette row (clean 4-age cadence 21->93, then a jump to 99, not 97).

**Factored, not duplicated** (per this step's own instruction): extracted the shared `SetPsychicBackground`/`UnsetPsychicBackground` fade-ramp and rotation-pause formulas out of `futureSight.ts` into a new `src/engine/psychicBackground.ts` - a pure, behavior-preserving refactor (`futureSight.test.ts` 9/9 unchanged before touching anything else). Ported `src/engine/confusion.ts` on top of it, reusing `blendColorCycleObjYAtAge`/`scaleMonAndRestoreAtAge`/`shakeMonOffsetAtTick`/`shakeMon2OffsetAtTick` verbatim (all already-proven), Tier-1-pinned (`tests/confusion.test.ts`, 11/11, every constant checked directly against the RAM probe's own output - including the already-established `AnimTask_ShakeMon(2)` "+1, guard age<creationAge" idiom from `dragonBreath.ts`/`blazeKick.ts`/`fly.ts`, RAM-confirmed to apply here too).

**Wired** through the Scene-ON seam (`sceneOnConfusionView`, `battleScene.ts`'s CONFUSION draw case, reusing `kadabraBackSprite`/`onixFrontSprite`/`battleAnimPsychicBg` - no new assets). Per-mechanism lag bisection against the dense fixture (not a blind sweep - the ledger's own warning that one window can carry several lag conventions held true here): window 1's `AnimTask_ShakeMon2` needed its OWN scene-level lag (-2, distinct from GROWTH/FUTURE_SIGHT's own tint lag of -1), closing window 1 to 19/20 exact. Window 2's target (both `AnimTask_ShakeMon`'s x2 and `AnimTask_ScaleMonAndRestore`'s matrix) needed NO scene-level lag at all - RAM and pixels already agree at raw age, ruling lag out as window 2's problem.

**Dense comparator, rerun twice** (`tools/compare/confusionPortable.ts`, new `--per-frame-bbox` flag - this session's own fix for the PAPERCUT rung 5 named): **108/140 both times**, deterministic. Window 1 (attacker, frames 118-137, 20 frames): **19/20 exact**, only frame 119 (a single creation-tick boundary frame) mismatches. Window 2 (target, frames 146-176, 31 frames): **0/31 exact** - a whole-sprite-interior residual growing with the scale magnitude, exact at the sprite's center pixel, wrong toward the edges, surviving a full per-mechanism lag bisection. **New evidence for FUTURE_SIGHT's own open defect A, not a new bug**: FUTURE_SIGHT's attacker (has `monbg ANIM_ATK_PARTNER`) shows this residual class, BIND's target (no `monbg` at all) does not, and CONFUSION's target (has `monbg ANIM_DEF_PARTNER`) now shows it too - `monbg`'s own `MoveBattlerSpriteToBG` mechanism (moving the battler onto a BG2 tile copy instead of a plain OBJ) is now a live, named suspect. Not chased here - defect A remains FUTURE_SIGHT's own open item, out of this move's scope.

**Coverage:** `MOVE_CONFUSION` added to `ANIMATION_COVERAGE.json` as `partial`, 108/140.

**Evidence.** `npm test` 2463/2463 (2452 + 11 new `confusion.test.ts`). `npm run build` green.

**Next action for a future session:** PSYCHIC (this family's third and final sibling, not started - identical shape to CONFUSION with different color/deltas per the family map, should port cheaply once staged); the opposite orientation (KADABRA front sprite, not yet extracted); and defect A's real root cause, now with a concrete `monbg`-driven hypothesis shared between FUTURE_SIGHT and CONFUSION to chase (a VRAM/OAM tile-data dump at a scale-window peak tick, or checking whether `MoveBattlerSpriteToBG`'s BG2-copy path changes the affine-stretch sampling itself).


**Housekeeping (this session):** moved the "MOVE_FUTURE_SIGHT rung 5" entry
to `ANIMATION_PROGRESS-archive.md` to keep ~3 live (AGENTS.md's convention)
after adding this session's new top entry.
