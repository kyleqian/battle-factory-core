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

## Defect A instrument named in the brief CONTRADICTED: the doubled scan window is RAM-byte-identical to hardware — both moves stay `partial`, unchanged counts (2026-07-26)

**Verdict: the "naive 2x bounding box overreaches hardware" hypothesis, as literally stated, is refuted by direct OAM evidence. No render fix attempted (per this step's own contingency: bank evidence and stop, don't chase a speculative fix once the mandate's hypothesis is contradicted).** Wrote `tools/probe/dump-scale-window-oam-scanline.py` (new, extends `dump-monbg-scale-window.py`'s own `sprite_record`) to dump the scaled OBJ's full OAM attr0/attr1 (shape/size/affine-mode bits, the real hardware x/y — not just the matrix, already RAM-confirmed in rung 5) plus raw whole-frame screen captures at the peak-scale ticks, against both fixtures.

**Confirmed exactly as assumed (no defect here):** at FUTURE_SIGHT's attacker peak (oracle tick 130, and its neighbors 116/144) and CONFUSION's target peak (tick 160, neighbors 146/176), OAM `shape=0` (SQUARE), `size=3` (64x64), `affineMode=3` (DOUBLE) — matches this engine's 64x64-tileset assumption exactly, ruling out a shape/size mismatch. More importantly: the real OAM `x`/`y` (`attr1&0x1FF`, `attr0&0xFF`, unwrapped) reads **(8,24)** for FUTURE_SIGHT's attacker throughout the scale window. `sprite.x(72)+x2(0)+centerToCornerVecX(-64, RAM-read directly, matches the doubled `-32*2` from `CalcCenterToCornerVec`'s own table, `reference/pokeemerald/src/sprite.c:137-157`) = 8` — and this engine's own `drawSpriteSheetAffineStretch(doubled=true)` computes its window's screen-space top-left as `ox(40)-halfW(32) = 8`. **Byte-identical.** Same match on Y (24) and on CONFUSION's ONIX target corner. This directly contradicts the brief's own framing that "our scan reaches further than hardware" — the doubled render window's real screen position and size are exactly what this engine already computes; the window itself is not the defect.

**New, load-bearing correction: the earlier `(181,3)` pixel sample (rung 7) was itself using an un-lagged matrix reading and is not representative of the residual's true shape.** Re-checked properly this session: this engine's own `sceneOnFutureSightView` reads the scale matrix at `state.age-2` (the already-proven, RAM-validated GROWTH-derived display lag) — so a screen captured at oracle tick *T* shows the RAM matrix as of tick *T-2*, RAM-confirmed directly here too (matrix at tick114 = 252 = `futureSightAttackerEffectAtAge(0)`'s prediction for what tick116's screen should show; live matrix *at* tick116 itself is 244, which is what tick118's screen shows instead). Redid the per-pixel diff (`tools/compare/scratch/defect-a-scanline-diag.mjs`, new) against the real oracle RGB captures with this lag correctly applied both directions: the residual is **not** simply "oracle transparent, engine opaque" as the single `(181,3)` sample suggested. Most sampled mismatches (e.g. FUTURE_SIGHT tick130, pixel (96,58): app `(198,173,132)`, oracle `(210,86,82)`) are opaque-vs-opaque **color** differences, including pixels **inside the original non-doubled 64×64 footprint** (`dx=56,dy=4`, both within `[0,64)`) — a region the doubled-window-overreach hypothesis cannot touch at all, since that hypothesis only predicts mismatches in the doubled-only fringe. The true residual is a texture-space sampling/coordinate defect somewhere inside the correctly-sized window, not a boundary-clamping bug.

**Checked and ruled out the obvious alternative this evidence suggested (BG2-in-front-of-OBJ):** since `monbg`'s frozen BG2 tile copy stays live for the whole scale window (rung 7's own finding) and rung 7's underlay-fix was a no-op, the natural next guess was that BG2 might actually render *in front of* the scaled OBJ (hiding it under the frozen unscaled copy wherever both overlap, which would explain color-only interior mismatches with no transparency involved). Checked directly: OBJ priority reads `2` and `BG2CNT`'s own priority field also reads `2` throughout the window (`tools/probe/dump-monbg-scale-window.py` rerun ticks 126-132, plus `run-battle-lab-rgb.py`'s own `playerSprite.priority`). Real hardware's OBJ-vs-BG priority tie-break favors the OBJ at equal priority — so BG2 should *not* be winning this composite. Hypothesis checked and set aside, not assumed away.

**One genuinely new, smaller finding, flagged but not chased (out of this step's scope):** CONFUSION's target OAM `x` at tick160 reads `112`, one tick stale relative to the sprite struct's own `x2=3` that same tick (`176+3-64=115≠112`; `176+0-64=112` matches the *previous* tick's `x2=0` exactly) — a real one-tick OAM-copy latency on the shake offset specifically, distinct from the already-modeled scale-matrix display lag. This contradicts `sceneOnConfusionView`'s own doc comment claim that window 2 "needed NO scene-level lag at all." It's a small (±3px) translation effect on the shake, not obviously the driver of defect A's much larger, magnitude-scaling interior residual — banked here for a future session rather than folded in blind.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114. `MOVE_CONFUSION` stays `partial`, 108/140. No render code touched this session.

**Evidence.** `npm test` 2582/2582 at the branch base (unchanged — probe + scratch diagnostics only, no production code; supervisor-corrected from a stale 2463 copy). `npm run build` green.

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
