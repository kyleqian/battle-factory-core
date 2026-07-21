# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 193 — Worktree scout (supervisor-folded): turn 9 ground truth BANKED — the pinned ATK-floor test came back NEGATIVE (Pidgeotto uses QUICK_ATTACK, not a 4th FD; "won't go lower" variant still untested) and **both published lines reconverge RNG-exactly at turn 9** (BIND-miss and ROCK_SLIDE-miss consume identical Random() counts → same gRngValue); `battle1-turn9-dense.json` (12272 frames, 256/256 captures) + `docs/turn9-notes.md`; merged `782eaab`, suite 801/801 on the merged tree

- **State:** merged into master, `npm test` 801/801 + build green
  post-merge (docs+trace+probe-spec only). Supervisor re-verified: prefix
  chain (turn8-dense ⊂ turn9-dense ⊂ winline-b-swap, script-exact), cited
  shas reproduced fresh, submenu label frames read as images. **One row
  corrected in the fold** (supervisor pixel-diff evidence, two fresh
  oracle runs byte-identical): the "no visible change during the press"
  claim at 10869-10877 hid a real 5-tick healthbox-region transient
  (bea3024eb2f3, bbox x:127-229 y:74-110, bounce-family) — turn9-notes §5
  row now carries both shas. Verification lesson holds: representative-
  tick sha citations can mask un-itemized sub-phases; diff the WHOLE
  cited span when a row claims "no change".
- **Did:** turn 9 = QUICK_ATTACK (Pidgeotto, 82→61... Onix 31→24) vs
  ROCK_SLIDE (hit, Pidgeotto 82→61); first turn in the arc where both
  sides land damage — first "not very effective" (0.5×) message
  PNG-confirmed, first healthbar color-zone transitions pixel-sampled
  (Pidgeotto green→yellow at 50%, Onix yellow→red). Cursor persistence
  reconfirmed in RAM across the closed action menu (gMoveSelectionCursor
  holds BIND before reopen; LEFT flips it inside the press window). The
  turn-2 "unattributed RNG step" recurs (+14 ticks before next accuracy
  roll) specifically when both combatants use damaging moves — still
  unattributed to a call site. The 4-frame shared box-open prefix theory
  refined: holds box-region-only, within matched transition categories.
- **Next:** M-4 (Sitrus rungs c-e: GrantingStars 6970→~7040, tint/
  sparkle/ring/message/HP-climb, settled menu ≥7307); then turn-6/7/8/9
  engine slices against the four dossiers.
- **Notes:** scout stayed in contract; no papercuts.

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
