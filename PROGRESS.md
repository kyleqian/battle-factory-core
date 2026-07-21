# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 192 — Bounded worker (S7 slice M-3): Sitrus rotation window LANDED — the "small-angle rounding gap" §12 flagged was actually a +2 (not +1) render-tick lag miswiring, NOT a sampler bug; `drawSpriteSheetAffineRotate` needed zero changes; `turn5-sitrus-a.json` 110/110, 0 diff; rungs (c)-(e) not attempted (out of time)

- **State:** `npm test` **801/801** (+8), `npm run build` green, tree
  clean. New committed trace `turn5-sitrus-a.json` (110 captures,
  6860-6969) 0 diff, twice-run identical. Full 47-trace sweep: every trace
  at its own previously-established count, zero regressions —
  `turn5-healthbox.json` 55/55 (the trace this exact change regressed last
  session), `turn5-switchin.json` 241/241, `turn5-sentout.json` 141/141,
  `turn5-rockslide.json` 256/256, `sendout.json` 255/256,
  `s6-acceptance.json` 224/228, `turn2-dragonbreath.json` 237/237 (ISSUES
  #23's parked residual — unaffected, as expected: the sampler itself
  wasn't touched).
- **Did:** RAM-probed the full 32-entry Sitrus rotation matrix table fresh
  (`tools/probe/dump-onix-sitrus-rotate-matrix.py`, battler-0 variant of
  §12's own probe) — reproduces §12's cited values exactly. Bisected the
  render-vs-RAM tick correspondence directly against oracle PNG hashes
  (not assumed): the render stays byte-identical to the flat pose through
  tick 6874 and first visibly changes at 6875, which pins the lag at **+2**
  (not this run's usual +1) — RAM tick `T`'s matrix first shows at render
  `T+2`. §12's reverted attempt used lag 0, which is the actual root cause
  of last session's regression — **not** a sampler rounding bug. Re-verified
  with a from-scratch pixel classifier (oracle PNG vs. simulated output,
  background resolved via the identity frame's own confirmed-transparent
  set): at the correct lag + `y2` threaded alongside the full matrix (not
  instead of it), `drawSpriteSheetAffineRotate` reproduces the oracle
  exactly — every residual the naive classifier still flagged traced to a
  separately-drawn drop-shadow sprite (constant color, bottom-edge rows
  only) this function was never asked to model, confirmed zero via the
  real `npm run compare` renderer. Swept 6 alternate sampler conventions
  (round-to-nearest, pixel-center bias, axis transpose, matrix inverse)
  against the oracle — the existing plain floor (`>>8`) convention was
  already the best fit at every one, confirming no sampler change was
  needed. Wired `onixSitrusRotateMatrix(t)` into `drawTurn5RockSlideAttack`'s
  existing Onix draw call, identity/null fall-through to the unchanged
  plain static draw. +8 Tier-1 tests (`drawSpriteSheetAffineRotate` pinned
  against a hand-built fixture at identity/tiny/90° angles;
  `onixSitrusRotateMatrix` pinned at the window edges and both bisection
  ticks).
- **Next:** rung (c) `GrantingStarsEffect` (~6968-~7040, confirmed this
  session to start exactly at render 6970 where the rotation's own window
  ends — probed the boundary two-sided before trimming the committed trace,
  diffs there are a real new element, not sampler noise) — two
  `gGrantingStarsSpriteTemplate` sprites, gfx not yet extracted. Then rung
  (d) (tint/sparkle/ring/message/HP-climb, §11's own scope) and rung (e)
  (settled turn-6 menu, coverage to ≥7307).
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §13 added (root
  cause, the lag bisection method, what landed, exactly where rung (c)
  starts). Ladder rungs (a)+(b) both closed this session — (c)-(e) not
  attempted, ran out of the session's own time budget partway through
  writing up the (a)/(b) findings rather than starting (c) half-done.

---
## 191 — Worktree scout (supervisor-folded): turn 8 ground truth BANKED — winline-b takes **BIND, and it MISSES** (8 Random() calls, miss short-circuits crit/spread/effect); ATK stage hits its floor (2→0) yet prints the ordinary "harshly fell" (source-traced: the "won't go lower" variant needs the stat already AT floor before the attempt); `battle1-turn8-dense.json` (10826 frames, 226/226 captures) + `docs/turn8-notes.md`; merged `fc0d23c`, suite 793/793 on the merged tree

- **State:** merged into master, `npm test` 793/793 + build green
  post-merge (docs+trace only). Supervisor re-verified: prefix chain
  (turn7-dense ⊂ turn8-dense ⊂ winline-b-swap, script-exact), 5/5 cited
  boundary shas reproduced fresh, cursor-on-BIND submenu frame (9420, PP
  20/20 TYPE/NORMAL) read as an image. Scout PNG-read every text label
  per the new discipline.
- **Did:** turn 8 on the committed line = Pidgeotto's 3rd FEATHER_DANCE
  (Onix ATK floor 2→0) then Onix's BIND miss (acc 75 — corrects §14's
  prose "85"; roll at RAM 9844 fires under the PREVIOUS text, 2 ticks
  before the box transition). No HP change either side. BIND's trap
  mechanic (EFFECT_TRAP/STATUS2_WRAPPED, maxHP/16 end-of-turn) inventoried
  from source but NOT exercised (missed; RAM wrap-status flat). The
  4-frame shared box-open prefix reconfirmed 3× within this turn; the
  stat-write→"fell"-text gap is 293 ticks (vs 294/293 turns 6/7).
  "Won't go lower" variant's real trigger pinned = a 4th FD (turn-9
  scout's falsifiable test). Minor flag: BIND's description text
  ("2 to 5 turns") vs source-implemented 3-6 wrap duration — noted in
  the doc, not chased.
- **Next:** M-3 (affine-sampler small-angle fix per §12's bisect-at-6887
  instrument, then the Sitrus stages); turn-6/7/8 engine slices against
  the three dossiers (turn 8 = text-only resolution, cheapest of the
  three).
- **Notes:** scout stayed in contract; no papercuts.

---
## 190 — Bounded worker (S7 slice M-2): Onix "idle bob" ROOT-CAUSED and NAMED — it's the Sitrus proc's own opening animation stage (`General_HeldItemEffect`, a genuine GBA affine-OAM rotation), starting at tick 6869 not ~7042; render fix attempted and REVERTED (regresses the protected healthbox trace on a small-angle rounding gap) — NOT landed, no new committed traces

- **State:** `npm test` 793/793 (unchanged), `npm run build` green, tree
  clean. No `src/` changes committed (one attempted engine change was
  tried, found to regress `turn5-healthbox.json`, and reverted per this
  run's own no-red-trace discipline). Regression check clean:
  `turn5-healthbox.json` 55/55, `turn5-switchin.json` 241/241,
  `turn5-sentout.json` 141/141, `turn5-rockslide.json` 256/256, all still
  0 diff/unchanged.
- **Did:** ladder rung (a) ("NAME the bob mechanism") fully closed, source-
  cited AND RAM-verified 100%. §11's "idle bob" isn't idle - it's the
  OPENING stage of the Sitrus Berry proc's own battle animation
  (`General_HeldItemEffect`, `B_ANIM_HELD_ITEM_EFFECT`), launched at RAM
  tick 6869 via `TryHandleLaunchBattleTableAnimation`
  (`battle_gfx_sfx_util.c`) - ~170 ticks before the sparkle/tint every
  prior session assumed was the proc's start. Its first 3 steps
  (`AnimTask_RotateMonToSideAndRestore` x3) are a genuine GBA affine-OAM
  ROTATION of Onix's sprite, not a y-only bounce: `y2 = |gOamMatrices[
  matrixNum].c| >> 3` is a BYPRODUCT of the rotation matrix
  (`SetBattlerSpriteYOffsetFromRotation`, `battle_anim_mons.c`), RAM-
  verified exact at every probed tick (matrix `(a,b,c,d)` cross-read
  directly against `y2`, 100% match). This is exactly why the prior
  session's "apply y2 as a signed pixel offset" attempt failed BOTH
  directions - a rotation shears every row horizontally too; §11's own
  hypotheses (a)/(b)/(c) are superseded, not confirmed. 3 back-to-back
  32-tick rotation cycles (identity at RAM ticks 6872/6904/6936/6968),
  then a genuinely new, still-unitemized `GrantingStarsEffect` stage
  (~6968-~7040) BEFORE the tint/ring/message stage §11 already scoped -
  the "flat window" framing is gone entirely; the whole 6869-7222+ span is
  actively animating. Attempted to wire the fix in (reusing the engine's
  existing, already-proven `drawSpriteSheetAffineRotate` primitive built
  for the thrown ball's own spin - no new renderer needed, just a 32-entry
  RAM-read table) - but it regresses the PROTECTED `turn5-healthbox.json`
  (ticks 6873/6874 go from 0 diff to 600px), a genuine small-angle
  sub-pixel rounding gap in the existing sampler (ruled out a simple
  pb/pc axis swap as the cause). Reverted rather than ship red.
- **Next:** audit `drawSpriteSheetAffineRotate`'s nearest-neighbor
  rounding at SMALL rotation magnitudes specifically (bisect against the
  oracle at a fixed large-in-cycle tick like 6887 first, `a=251,b=49,
  c=-49,d=251`), then reuse the table/call-site banked in
  `faint-switch-notes.md` §12 verbatim - no need to re-derive the
  mechanism. After that: `GrantingStarsEffect` gfx/timing (unitemized),
  then §11's own tint/sparkle/ring/message/HP-climb/settled-menu chain.
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §12 added (full
  mechanism, RAM proof, the reverted attempt's exact diagnostic data, and
  the corrected 3-stage timeline); small dev-tool addition (`isActive`
  field in `tools/probe/dump-task-and-sprite-callbacks.py`, not `src/`);
  archived #187 to keep the ledger to 3 entries.

---

