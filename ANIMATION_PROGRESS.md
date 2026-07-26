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

## Defect A's texture-space instrument run to exhaustion: zero texel matches at any tint coefficient — real cause is a missing alpha-blend composite (OAM `objMode=1`), not a coordinate bug; both moves stay `partial`, unchanged counts (2026-07-26)

**Verdict: the mandated instrument returned a clean, exhaustive negative — no texel-space coordinate delta exists — and that negative pointed straight at the actual mechanism: the scaled OBJ is hardware alpha-blended with what's behind it, and this engine paints it fully opaque. Real, RAM-proven finding; no fix landed, since the correct 2nd blend target isn't nailed down yet, and this step's own contingency says don't guess.**

**Instrument, run as specified.** `tools/compare/scratch/defect-a-texel-search.mjs` (new): at FUTURE_SIGHT's attacker peak (oracle tick 130 — RAM tick 128's own matrix, 196, applies via the already-proven 2-tick display lag, NOT tick 130's own RAM value 204 — re-confirmed directly this session by re-dumping ticks 112-132) and CONFUSION's target peak (oracle tick 160 — this window carries NO scene lag per rung 8's own finding, so RAM tick 160's own matrix, 196, applies directly), brute-forced KADABRA's/ONIX's full 16-entry palette × every tint coefficient 0-16 (not just the one computed value, to rule out a tint-coefficient bug specifically) against 27 and 30 interior mismatched pixels respectively, including the ledger's own `(96,58)`-class candidates. Fixed the previous session's own diag-script call convention along the way (its `ox` argument is the sprite's *native, non-doubled* corner per its own header comment — the previous session's OAM-derived doubled corner (8,24) was passed in error; using the correct native corner (40,56) reproduces the ledger's own cited example exactly: tick130 pixel (96,58) app=(198,173,132) oracle=(210,86,82)).

**Result: zero matches, everywhere, at any coefficient.** Not one of the 57 sampled pixels' oracle color exists anywhere in either sprite's own tileset under any tint. This rules out the mandate's own named candidate bugs as a group (`>>8` truncation vs rounding, half-texel center offset, matrix-from-corner-vs-center, mx/my sign swap) — a coordinate bug would still sample *some* real texel, just the wrong one; here no texel anywhere matches, so the pixel isn't a texel sample at all.

**Why: found by finally reading a field rung 8's own probe already dumped.** `dump-scale-window-oam-scanline.py`'s `objMode` column (captured in rung 8, but that session's writeup only discussed `shape`/`size`/`affineMode`) flips `0`→`1` at the *exact* tick each scale task starts (RAM tick 114 for FUTURE_SIGHT's attacker; RAM tick 146 for CONFUSION's target — re-probed both this session, same mechanism, same relative timing). `objMode=1` is `ST_OAM_OBJ_BLEND`, and it's not incidental: `AnimTask_ScaleMonAndRestore`'s 5th script arg literally IS the sprite's objMode (`battle_anim_mon_movement.c:820-826`, `PrepareBattlerSpriteForRotScale(spriteId, gBattleAnimArgs[4])`), and both moves' own scripts pass `1` for that arg (already quoted in this ledger's own earlier rungs: `createvisualtask AnimTask_ScaleMonAndRestore, 5, -4, -4, 15, ANIM_ATTACKER, 1`). GBA hardware forces a semi-transparent OBJ to act as alpha-blend target 1 regardless of `BLDCNT`'s own OBJ-select bit (GBATEK). Re-ran `dump-monbg-scale-window.py` for the live blend registers at tick130: `BLDCNT=16192`/`BLDALPHA=2056` decode to mode=1 (alpha blend), target2 = every layer (BG0-3+OBJ+backdrop), `eva=8`/`evb=8` (a flat 50/50 blend) — RAM-read, not assumed. This fully explains the zero-texel-match result: the true displayed pixel is `(tinted sprite texel + whatever's underneath) / 2`, never a pure texel sample.

**Consistent with the already-reported symptom shape.** Pixels sampled at the sprite's true screen center (~72,88) aren't in the mismatch list at all (`defect-a-scanline-diag.mjs`) — "exact at center, wrong toward edges, growing with scale magnitude" (this ledger's own repeated observation) is exactly what a blend-with-something-that-tracks-the-OBJ-near-center-but-diverges-toward-the-edges would produce.

**No fix landed — the 2nd blend target isn't identified yet.** Tried blending the engine's own tinted texel 50/50 against two candidate "bottom" layers (`tools/compare/scratch/defect-a-blend-check.mjs`, new): (a) the raw psychic-BG swirl pixel already at that screen position before the sprite draws, (b) the frozen, unscaled `monbg` BG2 copy of the same sprite (rung 7's own mechanism) sampled at its native 1:1 position. **Neither reproduces the oracle color.** (a) gets the green channel exactly right on several sampled pixels but red/blue diverge by a large, non-constant amount; (b) is transparent at most sampled positions (the unscaled 64×64 footprint doesn't cover where the doubled, scaled OBJ paints), so it can't be the sole 2nd target either. The real 2nd target is likely a fuller PPU composite (BG2's frozen copy over BG1's swirl, with per-pixel transparency fallthrough) that neither single-layer guess captures on its own — modeling that correctly needs its own instrument, not a guess, so per this step's own contingency (no consistent single-formula match → bank evidence, don't speculate) no render code was touched this session.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114 (`futureSightPortable.ts`, reproduced twice). `MOVE_CONFUSION` stays `partial`, 108/140 (`confusionPortable.ts`, reproduced twice). Regression gates checked green: `growthPortable.ts` 63/63 both orientations (×2 each), `bindPortable.ts` exact 45/45 both orientations (×2 each) — the shared affine path is undisturbed.

**Evidence.** `npm test` 2590/2590 (no test file touched this session, only new probe/scratch scripts — recorded as the actually-observed number; this branch's own count has drifted from the previously-stated 2582 across sibling merges, not from anything in this session). `npm run build` green.

**Next action for a future session:** name the real 2nd blend target before attempting a fix. Candidates to instrument directly: dump VRAM/`gPlttBufferFaded` at a scale-window tick to see exactly what's resident on BG2 across the OBJ's full *scaled* footprint (not just its native 64×64 one, since `Task_UpdateMonBg` only re-pans/re-tints the frozen copy, never rescales it); or, if the harness's probe tooling allows a register poke, capture the oracle's own pre-OBJ composite (temporarily disable the OBJ layer via `DISPCNT`) to read the true 2nd-target color directly instead of reconstructing it from asset data. Once that formula is nailed down: extend `drawSpriteSheetAffineStretch` (or a sibling) with a real alpha-blend step gated on the caller requesting blend mode, verify against both dense fixtures twice each, and only then promote. Separately, still banked and not chased: CONFUSION's target one-tick OAM x-lag (rung 8) remains unresolved.

**Housekeeping (this session):** moved the "MOVE_CONFUSION ported" entry
to `ANIMATION_PROGRESS-archive.md` to keep ~3 live (AGENTS.md's convention)
after adding this session's new top entry.

**Housekeeping (this session):** moved the "Defect A instrument named in the
brief CONTRADICTED" entry to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention) after adding this session's new top entry.
