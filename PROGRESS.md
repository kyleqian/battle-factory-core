# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 194 — Bounded worker (S7 slice M-4): rung (c) LANDED — `GrantingStarsEffect`'s two star sprites RAM-probed fresh (spawn ticks 10 apart, corrects the source's own "8 ticks" framing) and byte-exact; `turn5-sitrus-b.json` 82/82, 0 diff, 6960-7041; rungs (d)/(e) NOT reached (out of session time) — precisely scoped for the next session

- **State:** `npm test` **805/805** (+5), `npm run build` green, tree
  clean. New committed trace `turn5-sitrus-b.json` (82 captures,
  6960-7041) 0 diff. Regression sweep: `turn5-sitrus-a.json` 110/110,
  `turn5-healthbox.json` 55/55, `turn5-switchin.json` 241/241,
  `turn5-sentout.json` 141/141 — zero regressions.
- **Did:** RAM-probed the two `gGrantingStarsSpriteTemplate` sprites fresh
  (`tools/probe/specs/turn5-sitrus-star-scan.json`, a 64-slot sweep then a
  targeted slot-3/4 x/y/x2/y2/animCmdIndex/flags trace) rather than
  trusting `General_HeldItemEffect`'s own "8 ticks apart" prose — real
  spawn gap is **10 ticks** (RAM 6968/6978), fixed screen anchors
  `(57,88)`/`(84,83)`, anim frame `floor(local/7)%8` (matches the
  source-cited 8-frame/7-tick shape exactly), and a genuinely new-this-
  session finding: a slow `y2` creep, `floor(local/8)` (0..7 over each
  star's own 62-tick life) — no prior citation predicted this. Corner
  convention `(ramX-16, ramY+y2-16)`, RAM-to-render lag **+1**, bisected
  against 6 independent (tick,star,frame) triples via brute-force pixel
  search, all 0px. Found and fixed two real bugs via the committed trace
  (not guessed up front): a 1px z-order overlap (GBA composites lower
  sprite-slot indices in front — draw order reversed) and creation-tick
  invisibility (`local===0` never renders, same shape as the switch-in
  particle burst's own `age = tick - spawnTick - 1`). Wired
  `turn5GrantingStarPlacement` (pure, exported) + `drawGrantingStars`
  into `drawTurn5RockSlideAttack`. +5 Tier-1 tests.
- **Next:** rung (d) — tint (Onix's own palette recolor, first diff 7042,
  same `gPlttBufferFaded` method §8c already used for materialize),
  ring (`ANIM_TAG_THIN_RING`, gfx extracted/cited two sessions running,
  affine-scale placement search still not attempted — bounded effort,
  exclude precisely if it resists per the brief), heal message ("ONIX's
  SITRUS BERRY.../restored health!", start 7078, 1 char/tick to 7112) +
  HP climb (1->31, §2's pinned formula, needs digit-overlay+bar-refill
  render) + wait-cursor bounce (~7180-7209, period 9, `turn5Fainted-
  CursorYOffset`'s own family, likely reusable). Then rung (e): settled
  turn-6 menu to >=7307 — §11 already flagged the tail is NOT static (HP
  digits/bounce still cycling at 7306), needs the live formula threaded
  through, not a frozen harvest.
- **Notes:** no papercuts (one self-inflicted ~10min detour: an early `cd`
  into a stale sibling worktree left the shell's cwd there, so several
  early probe/compare commands silently ran against that worktree's
  unmodified tree until `pwd` caught it — no bad data landed, just lost
  time; worth remembering `cd` in Bash calls doesn't get reset between
  calls). Docs: `faint-switch-notes.md` §14 added.

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
