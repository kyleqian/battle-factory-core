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

## MOVE_PSYCHIC staged: 137/140, byte-identical to CONFUSION's own three-frame remainder — psychic family now fully staged (2026-07-26)

**Verdict: cheap-once-staged confirmed exactly as the ledger predicted.** `Move_PSYCHIC` (`battle_anim_scripts.s:4733-4748`) is byte-for-byte CONFUSION's own script shape, differing only in three literal argv values (blend tint color, target shake amplitude, target scale delta). No genuinely new task, curve, or palette mechanism appeared, so no RAM-probe-first gate was triggered beyond the routine per-move timeline probe. `MOVE_PSYCHIC` lands `partial` at 137/140 — the exact same count, and the exact same three relative-age boundary frames, as CONFUSION's own still-open banked remainder.

**Enumeration (rung 1, before writing code):** compared the real script against the already-proven CONFUSION component set — `monbg`/`SetPsychicBackground`/`setalpha`/`AnimTask_ShakeMon2`/`blend_color_cycle`/`AnimTask_ShakeMon`/`AnimTask_ScaleMonAndRestore` (objMode=1 blend path)/`UnsetPsychicBackground` are all identical instructions in identical order to `Move_CONFUSION`. Only three argv literals differ: `blend_color_cycle`'s target color (`RGB(31,23,0)`, not `RGB_WHITE`), the target `AnimTask_ShakeMon`'s x amplitude (`5`, not `3`), and the target `AnimTask_ScaleMonAndRestore`'s xDelta/yDelta (`-6,-6`, not `-4,-4`). KADABRA confirmed as the real carrier via `src/data/gen/battle-frontier-mons.json` (`FRONTIER_MON_KADABRA_2`), not assumed from the family map alone.

**RAM-probed (rung 2):** new fixture `tools/battle-lab/mechanic-psychic-kadabra-onix.json` (same KADABRA/ONIX pair, zero new sprite extraction), probed via the already-committed `tools/probe/dump-future-sight-psychicbg.py` (no new probe script), oracle ticks 70-260. This move's own `fadetobg BG_PSYCHIC` creation tick (age 0) lands at oracle tick 79 — 2 ticks earlier than CONFUSION/FUTURE_SIGHT's own tick 81 (shorter "PSYCHIC!" message text), a difference that lands entirely in the fixture's own age-0 anchor. Every RELATIVE age matched CONFUSION's own already-coded constants exactly: window 1 (attacker shake+blend, task `data[5]=767=RGB(31,23,0)` packed BGR555 confirming the real blend task) creates at age 37; window 2 (target shake+scale, task data reads `-6,-6,duration=15` directly, RAM matrix `250`/`244` at ticks 144/145) creates at age 65; fade 2 starts at age 101 with the identical 16/20/36 ramp/hold/ramp shape; the BG-palette-2 rotation pause lands at the same breakpoint age 97.

**Port (rung 3):** `src/engine/psychic.ts` reuses `blendColorCycleObjYAtAge`/`scaleMonAndRestoreAtAge`/`shakeMonOffsetAtTick`/`shakeMon2OffsetAtTick`/`psychicBackground.ts` verbatim — zero new mechanism code. Tier-1-pinned (`tests/psychic.test.ts`, 13/13, every constant checked against the probe output including the two directly-probed matrix values 250/244). Wired `sceneOnPsychicView` + `SceneOnPsychicConfig`/`View` into `sceneOnPresentation.ts` and a `battleScene.ts` `MOVE_PSYCHIC` draw case mirroring `MOVE_CONFUSION`'s structure exactly, with `PSYCHIC_BLEND_TINT_COLOR` (`RGB(31,23,0)` expanded 5-bit-to-8-bit as `(255,189,0)`, the same `(v5<<3)|(v5>>2)` expansion `RGB_WHITE` already uses) standing in for CONFUSION's hardcoded white attacker tint.

**Dense window (rung 4):** applied CONFUSION's own known lag conventions directly (window-1 shake -2, window-2 OAM-shadow -2 on target x2/scale, monbg copy -1, tint -1 — hardware-level, move-independent OAM-shadow-copy/framebuffer-capture latencies, not move-specific formulas) rather than a blind sweep, then verified by evidence: `tools/compare/psychicPortable.ts` landed **137/140 on the first run**, reproduced byte-identical on a second run (same 3 mismatched frames, same bbox sizes both times). The 3 remaining frames (117, 145, 174 — relative ages 38, 66, 95) sit at the EXACT SAME relative ages as CONFUSION's own still-open remainder (frames 119/147/176, ages 38/66/95): window 1's own creation-tick boundary, window 2's own creation-tick boundary, and window 2's own tail boundary. Strong evidence this is the identical banked defect transferring unchanged, not a new one — per this step's own OUT OF SCOPE list (CONFUSION's 3-frame remainder), not chased further here.

**Coverage (rung 5).** `MOVE_PSYCHIC`: new, `partial`, 137/140 (`psychicPortable.ts`, reproduced twice, byte-identical both times). Regression gates green, reproduced twice each: `MOVE_FUTURE_SIGHT` 114/114 ×2, `MOVE_CONFUSION` 137/140 ×2 (unchanged, its own 3-frame remainder is the same banked class, not chased here), `MOVE_GROWTH` 63/63 both orientations ×2 each, `MOVE_BIND` 45/45 both orientations ×2 each.

**Evidence.** `npm test` 2672/2672. `npm run build` green.

**Next action for a future session:** the psychic family's third and final sibling is now staged; all three (`GROWTH`'s own zero-new-mechanism representative aside) share the exact same 3-frame creation/tail-boundary remainder class. A future session chasing CONFUSION's 3-frame remainder (per that entry's own note: model the active/magnitude edges as a genuine 2-tick ramp rather than a hard step) should close all three moves' remainders together, not just CONFUSION's — they're evidently the same underlying mechanism, not three independent defects. Separately: PSYCHIC's opposite orientation (KADABRA front sprite, not yet extracted) remains open, same as CONFUSION/FUTURE_SIGHT's own still-open opposite-orientation gap.

**Housekeeping (this session):** moved the "Defect A's texture-space
instrument run to exhaustion" entry to `ANIMATION_PROGRESS-archive.md` to
keep ~3 live (AGENTS.md's convention) after adding this session's new top
entry.

## CONFUSION's banked OAM x-lag fixed: window 2 108/140 → 137/140; stays `partial`, 3 boundary-tick frames named as the honest remainder (2026-07-26)

**Verdict: real fix landed, closing 29 of 32 previously-failing frames. `MOVE_CONFUSION` stays `partial` (137/140, not the required complete 140/140) — the 3 remaining frames are all creation/tail-boundary ticks, the same class as the already-known window-1 frame-119 issue, named honestly rather than promoted past.**

**Instrument first (rung 12):** re-probed the full shake window on both windows via the already-committed `dump-scale-window-oam-scanline.py` (new script `tools/compare/scratch/confusion-oam-shadow-lag-probe.mjs`, committed for reproducibility) — reading the sprite struct's own `x2` field and its OAM-shadow `attr1` x bitfield at the identical instant, not a display-timing artifact. Result: `oamX(tick) == x(tick) + x2(tick-1) + centerToCornerVecX(tick)` holds for **28/29 window-2 ticks and 17/18 window-1 ticks** (the lone miss each time is the shake task's own creation tick, already absorbed by `confusion.ts`'s "+1" idiom) — a real, uniform **one-tick OAM-copy latency** present on BOTH `AnimTask_ShakeMon` and `AnimTask_ShakeMon2` alike, contradicting `sceneOnConfusionView`'s old "window 2 needs no lag" claim (which rested on a 13/30 sampled-pixel check at a single tick near the scale curve's own extremum, where a lag error is nearly invisible). The matrix (`gOamMatrices`) carries no analogous RAM-internal lag of its own (exact at zero shift, all 31 ticks) — but FUTURE_SIGHT's own attacker scale (the same `scaleMonAndRestoreAtAge`/`FUTURE_SIGHT_SCALE_PARAMS` mechanism) already documents a two-tick **display** lag, so the same was expected here too, independent of the x2 finding.

**Fix (rung 13):** `sceneOnConfusionView`'s target x2/scale now read at `state.age-2`, matching window 1's own already-coded shake lag exactly (the OAM-shadow latency + the same generic one-tick framebuffer-capture lag established everywhere else in this codebase). Dense sweep of every integer shift 0-4 (`tools/compare/scratch/confusion-cached-compare.ts`) confirmed -2 on BOTH shake and scale together is the real mechanism (either alone: unchanged at 108/140; both together: 122/140, every interior EVEN tick byte-exact). Two secondary corrections found by continuing the sweep: the `monbg` frozen copy is repanned by its own task (`Task_UpdateMonBg`), not the live sprite's shake task, so it only carries the generic one-tick capture lag (-1) — `battleScene.ts` now reads its x2 separately; and `targetTouched` (the idle-offset/window-2 handoff) moves one tick later to match the now-lagged x2 read. A third asymmetry (the active/inactive edge reaches the display one tick AHEAD of the numeric magnitude — RAM-confirmed same-tick for affineMode/objMode) closed the remaining transitional ticks. One dead end recorded in the code's own comment: forcing xScale/yScale to neutral 256 whenever the active edge reads false seemed "more correct" but made the comparator WORSE (frame176's residual grew from 33px to 881px) — kept the empirically-validated version instead.

**Coverage.** `MOVE_CONFUSION`: stays `partial`, **108/140 → 137/140** (`confusionPortable.ts`, reproduced twice, fresh oracle run both times). Remaining 3 frames: 119 (window 1's own creation-tick boundary, unchanged, still uninvestigated), 147 (window 2's own creation-tick boundary — the active-edge and magnitude reads disagree for exactly this one tick), 176 (window 2's tail boundary, reduced from 881px to 33px but not fully closed). Bounded time was spent on all three within this session's cap; none closed further without speculative per-tick special-casing beyond what the dense sweep already justified. Regression gates green, reproduced twice each, both orientations: `futureSightPortable.ts` 114/114, `growthPortable.ts` 63/63, `bindPortable.ts` 45/45 (component + framebuffer).

**New Tier-1 tests** (`tests/confusion.test.ts`) pin `sceneOnConfusionView`'s corrected values against literal oracle-tick numbers, including the active/magnitude read-parity asymmetry.

**Evidence.** `npm test` 2637/2637. `npm run build` green.

**Next action for a future session:** MOVE_PSYCHIC (this family's third sibling) and the second CONFUSION orientation remain unstarted — this session's own mandate made PSYCHIC staging conditional on a full CONFUSION close, which didn't happen, so it was correctly left untouched. The 3 remaining boundary-tick frames (119, 147, 176) are all narrow, single-tick transitional cases; a future session could try modeling the active/magnitude edges as a genuine 2-tick ramp (rather than a hard step) if it wants to chase them further, but the returns are small (3 frames out of 140).

## Defect A closed: DISPCNT-OBJ-off capture names the 2nd blend target directly, formula verified exact — `MOVE_FUTURE_SIGHT` promoted to `exact` (114/114); `MOVE_CONFUSION` stays `partial`, blocked on its own already-banked OAM x-lag, not the blend (2026-07-26)

**Verdict: real fix landed. `MOVE_FUTURE_SIGHT` is now `exact`, dense window fully green (114/114, reproduced twice), both regression gates green (reproduced twice each, both orientations). `MOVE_CONFUSION`'s own blend mechanism is now correctly implemented and formula-verified, but a separate, already-banked defect (one-tick OAM x-lag on the target's own shake, rung 8) keeps its window at `partial`, 108/140 — confirmed a true no-op there via stash-and-diff, not a swallowed regression.**

**Instrument (rung 10):** `tools/probe/dump-scale-window-underlayer.py` (new) captures the oracle's own pre-OBJ composite directly — clears DISPCNT's OBJ-display bit (bit 12) on the real hardware register immediately before the single `advance()` call that renders the target tick, so the PPU composes BG layers only for that one frame; a second, unmodified pass captures the same tick normally for a byte-exact cross-check against the already-cited oracle pixel. Getting there required a genuine harness finding, not assumed: `EmeraldOracle.write_u8`/`write_u16` (built on libmgba-py's `raw_write`) silently no-op for palette RAM, OAM, and IO registers — verified directly (a WRAM scratch byte round-trips correctly; a DISPCNT round-trip does not change on read-back at all, even though the write call itself doesn't error). The working path is the "bus" write (`MemoryView._bus_write`, the same side-effect-carrying path a real CPU store instruction uses) — confirmed to actually flip the bit, and confirmed the poke survives the following `advance()` call untouched (matches `gpu_regs.c`'s own per-register waiting-list flush model: a register only gets re-copied to hardware on a frame where `SetGpuReg` was called for it, and DISPCNT is only ever set once at battle-scene setup).

**Formula check (rung 10): exact.** `tools/compare/scratch/defect-a-blend-check-instrumented.mjs` (new): `oracle_pixel == blend(tinted_texel, captured_under_pixel)` reproduced **26/26** sampled interior mismatches at FUTURE_SIGHT tick130, using the real captured 2nd-target pixel (not a reconstruction). One correction to the mandate's own 5-bit framing, found empirically then confirmed by inspection: computing `min(255,(eva*top8+evb*bottom8)>>4)` directly on the already-8-bit-expanded RGB values (both `top`/`bottom` here are valid `rgb5` expansions of a native 5-bit color already) reproduces the oracle byte exactly; re-truncating to 5-bit first (`component8>>3`) and re-expanding throws away real sub-5-bit precision the hardware's own bit-replication expansion carries, undershooting by ~4/255 on affected channels. This is exactly `blendChannel` (`battleScene.ts`), already in the codebase for turn9's hitsplat — no new formula needed, just the right target pixel. CONFUSION tick160 matched **13/30** — every case where the coordinate mapping is already correct (including every transparent-OBJ-texel passthrough case) matched byte-for-byte; the other 17/30 sit exactly where rung 8's own already-banked one-tick OAM x-lag on this move's target shake puts the sample at the wrong texel — a separate, pre-existing, out-of-scope defect, not a blend-formula failure.

**Regression-gate recon (before touching code):** `GrowthEffect`'s and `BindWrapSqueezeTarget`'s own `createvisualtask AnimTask_ScaleMonAndRestore` calls both pass `objMode=0` literally in source (`data/battle_anim_scripts.s`) — neither move ever had a blend-mode OBJ, so a fix scoped only to FUTURE_SIGHT's attacker / CONFUSION's target draw call sites cannot touch them. Confirmed after the fact too: both regression fixtures stayed exact.

**Fix (rung 11):** extended `battleScene.ts`'s FUTURE_SIGHT attacker case (and, structurally, CONFUSION's target case) to draw `monbg`'s still-live frozen copy first, then composite the tinted, scaled sprite 50/50 on top via a new `drawSpriteSheetAffineStretchTintedBlend` (tint/sample step from `drawSpriteSheetAffineStretch` + the blend-over-live-`fb` output stage and `blendChannel` formula from the existing `drawSpriteSheetAffineStretchBlendedOverFb`). One non-obvious wrinkle found and fixed along the way: the frozen copy is **not** a static original-color snapshot — it shares the OBJ's own palette RAM, so `blend_color_cycle`'s live tint ramp applies to it too (a plain untinted copy left a constant, tintCoeff-sized brightness gap against the oracle at every sampled pixel). A second wrinkle, RAM-probed at the tail of the scale window (ticks135-150): OAM `objMode`/`affineMode` flip back to normal **one** tick before the affine matrix itself reaches neutral 256 (the matrix has its own already-established two-tick display lag; objMode/affineMode's is one tick) — `sceneOnFutureSightView` gained `attackerBlendActive` (age-1 lagged, reusing the tint state's own offset) to tell "still hardware-blending" apart from "matrix not yet neutral," and for that one-tick gap the native-size OAM box clips the still-slightly-enlarged opaque sprite at its edges, so the frozen copy has to stay drawn underneath (opaque, undoubled, no blend) through that tail too.

**Coverage.** `MOVE_FUTURE_SIGHT`: `partial` → **`exact`**, 114/114 (`futureSightPortable.ts`, reproduced twice). `MOVE_CONFUSION`: stays `partial`, 108/140 (`confusionPortable.ts`, reproduced twice, byte-identical mismatched-frame list with and without this session's target-side change — verified via stash-and-diff, a real no-op not a regression). Regression gates green, reproduced twice each, both orientations: `growthPortable.ts` 63/63, `bindPortable.ts` 45/45 (component + framebuffer).

**Evidence.** `npm test` 2590/2590. `npm run build` green.

**Next action for a future session:** name and fix CONFUSION's own one-tick OAM x-lag on the target's shake offset (rung 8's finding: real OAM x is one tick stale against the sprite struct's own `x2` that same tick) — once that's closed, window 2 should fall out for free since the blend mechanism itself is already proven correct (13/30 direct matches this session, blocked only by the wrong sample coordinate). Separately: FUTURE_SIGHT's window-1/CONFUSION's frame119 boundary-tick issue (unrelated to defect A) and the second orientation / PSYCHIC sibling remain open for a future session.

**Housekeeping (this session):** moved the "MOVE_CONFUSION ported" entry
to `ANIMATION_PROGRESS-archive.md` to keep ~3 live (AGENTS.md's convention)
after adding this session's new top entry.

**Housekeeping (this session):** moved the "Defect A instrument named in the
brief CONTRADICTED" entry to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention) after adding this session's new top entry.
