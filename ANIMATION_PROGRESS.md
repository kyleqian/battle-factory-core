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

## MOVE_FUTURE_SIGHT rung 6: register-level probe named and fixed defect B (the second-fade rotation-cadence pause); defect A untouched, stays `partial` at 85/114 (2026-07-25)

**Verdict: real fix, landed and pinned — defect B is closed.** Rung 5 left
two named defects: B (10/39 mismatched frames, 147-164, a 17230px
whole-upper-screen bbox in a period-4 pattern during the second/restore
psychic-BG fade) and A (29/39, KADABRA's own attacker box, frames
116-144). This rung's mandate was defect B first (register-level probe),
touching A only if the same instrument explained it.

**The instrument.** Re-ran the fixture's own already-committed dense-probe
script (`tools/probe/run-battle-lab-rgb.py`, invoked directly rather than
through `futureSightPortable.ts`'s auto-deleted temp dir, so the raw
`probe.json` could be inspected) — it already records `bldcnt`/`bldalpha`/
`bldy` and the full `bgPalette2Faded` row every frame, no new probe script
needed. Diffed the raw BG palette 2 row tick-by-tick across the whole
window.

**The exact divergence.** The psychic-BG rotation ring's own transition
ages land at 21, 25, ..., 65 — exactly the existing 4-tick cadence
already coded in `futureSight.ts`, RAM-confirmed byte-for-byte. Then the
ring holds for **6 ticks instead of 4**: the next transition is age 71,
not the naively-predicted 69. After that single pause, the clean 4-tick
cadence resumes, permanently shifted +2 (71, 75, 79, 83, 87, 91, all
RAM-confirmed). The pause window (ages 67-72) exactly spans the tick
range where `REG_BLDCNT`/`REG_BLDALPHA` both read 0 — the gap between the
attacker `blend_color_cycle`/`ScaleMonAndRestore` pair's own `blendoff`
cleanup and `UnsetPsychicBackground`'s own fade setup (`REG_BLDCNT` reads
`0xe8` again starting exactly at age 73, the same tick the existing
`futureSightBgBldyAtAge` ramp already starts, unlagged). `REG_BLDY`'s own
ramp was independently re-verified RAM-exact against the existing
(unchanged) formula through the whole window (e.g. frame 150/age 73 →
bldy 0, frame 151/age 74 → bldy 1) — confirming this is a
rotation-cadence-only defect, not a darken-register one, consistent with
rung 5's own negative result (extending the BLDY lag made things worse).

**The fix.** `rotationCountAtAge` (`src/engine/futureSight.ts`) now
applies a single documented breakpoint/pause (age 69, +2 ticks) before
computing the ring position — no lag-guessing, the exact RAM-probed
transition ages. Pinned with a new Tier-1 test asserting those ages
directly (`tests/futureSight.test.ts`, 9/9).

**Dense comparator, rerun twice:** `tools/compare/futureSightPortable.ts`
→ **85/114 both times** (up from 75/114). **Per-defect accounting:**
defect B — **10/10 frames fixed** (147, 148, 151, 152, 155, 156, 159,
160, 163, 164 all 0px diff, re-verified with
`future-sight-per-frame-bbox.ts` against the fresh scratch dir). Defect A
— **completely unchanged**: same 29 frames (116-144), identical magnitude
curve. The register instrument that closed B does not explain A (A is a
smooth continuous scale-magnitude curve, not a cadence artifact), so A
was left untouched per this rung's own scope — a clean, not blind, stop.

**Coverage:** `MOVE_FUTURE_SIGHT` stays `partial` in
`ANIMATION_COVERAGE.json` — 85/114, remainder is defect A alone.

**Evidence.** `npm test` 2452/2452 (2451 + 1 new). `npm run build` green.

**Next action for a future session (park rule — this closes
FUTURE_SIGHT's run this session):** defect A needs a *different*
instrument than either rung 5 or rung 6 used — both the OAM-matrix probe
(rung 5) and this rung's BG-palette/register probe came back clean or
irrelevant for A. Try a VRAM/OAM **tile-data** dump at the scale window's
peak ticks (~frame 130), the `dump-growth-ivysaur-vram.py` precedent, to
check for an asset/decode-adjacent mismatch the matrix-only probe
wouldn't catch (tile indices, or the affine-stretch sampling itself, not
just the matrix coefficients) — or a sub-pixel rounding difference in
`drawSpriteSheetAffineStretch`. Once A closes: extend to the
opponent-attacker orientation (KADABRA front sprite extraction; the
family map's own derivation says this is side-uniform, no new mechanism
expected) and re-run `futureSightPortable.ts` to confirm `exact`.

**Housekeeping (this session):** moved the "MOVE_FUTURE_SIGHT rung 5" entry
to `ANIMATION_PROGRESS-archive.md` to keep ~3 live (AGENTS.md's convention)
after adding this session's new top entry.
