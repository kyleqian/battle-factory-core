# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 144 — Bounded worker: S7 slice E1d droplets increment — **first ENDEAVOR sweat-droplet batch RAM-probed and landed green** (renders 3006-3007, real hardware sprite reads, not a pixel fit); `npm test` **674/674** (+2), `npm run build` green

- **State:** `npm test` **674/674**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` dense window now 2999-3007 (was 2999-3005);
  `tools/probe/dump-endeavor-droplets.py` and `dump-endeavor-squish-blend-
  ext.py` committed.
- **Did:** RAM-probed all 16 droplet sprites (`AnimFacadeSweatDrop`'s own
  static callback address, thumb-bit-adjusted, since it's not exported)
  across both squish cycles — found §15's own banked table had the two
  `CreateSweatDroplets` offset variants (upper/-20 vs lower/+20) mislabeled
  relative to which `tTimer` triggers which, corrected in `battleScene.ts`'s
  own doc comment. Landing the FIRST batch found a second bug: droplets
  aren't visible on their own `CreateSprite` tick — the naive "same render
  lag as the squish matrix" guess put every droplet one physics step ahead
  of the oracle; fixed via a fresher lag (`RAM=render-1`, matching blend's
  own) plus requiring the sprite's `n>=1` (not `n>=0`), reproducing both the
  previously-pinned clean tick (3005) and the newly-contaminated one (3006)
  at once. Also RAM-probed (not pixel-solved) the ENTIRE squish+blend window
  across both cycles (`gPlttBufferFaded` read directly, `coeff` solved via
  `BlendPalette`'s own real formula) and found/fixed an off-by-one in §15b's
  own prose (matrix lag is `render-2`, not `render-3` — the committed table
  values were always right, only the restated formula was wrong). Tried
  extending `ENDEAVOR_SQUISH_TABLE`/droplets through both full cycles but
  `npm run compare` showed real residual diffs starting render 3008 (batch-1
  droplet timing not yet re-verified past batch 0, and/or shake/hitsplat) —
  trimmed to the last green tick (3007) rather than commit red, per this
  run's own discipline. Full writeup: `docs/battle-menu-notes.md` §15c.
- **Next:** batch-1 (upper) droplet timing — verify/correct the same
  render-lag convention past render 3017 (the analogous first-visible tick);
  once both batches/cycles close, the already-RAM-probed extended squish
  table (banked, not wired) should drop in directly. After that: shake/
  hitsplat (still fully unmodeled, `gAnimMovePower` for ENDEAVOR still not
  RAM-confirmed).
- **Notes:** no papercuts.

---
## 143 — Supervisor: battle-2 scout merged (§17 debts closed + §18 battle-2 turn-1 ground truth); **new ISSUES #21** — RAM-observed base damage 19 vs formula 17 on ROCK_SLIDE-vs-KABUTO, a damageCalc generality gap

- **State:** `npm test` **672/672**, `npm run build` green, tree clean at
  merge `031bfc5`; no worktrees, no unmerged branches.
- **Did:** verified and merged worker/wt-20260719-184149 (3 commits):
  rentalMons[] probe fixed (root cause: global.h's field comments are
  SaveBlock2-absolute offsets, the old probe double-added frontier's
  0x64C base) and validated two ways (pre-swap == anchor dump 3/3 slots;
  post-swap slot0 == pre-swap slot3 per CopySwappedMonData); YES-branch
  LCG ledger committed (bonus: frontier RNG freeze begins tick 33286);
  battle2-turn1.json (33672f/168c, twice-run) + §18 ledger — new pinned
  mechanic: KABUTO's BATTLE_ARMOR short-circuits the crit roll's
  Random() call. Damage discrepancy honestly flagged → filed as ISSUES
  #21 (leads: probe defense/statStages at calc tick). Also
  verified+accepted #142 (squish+blend landed via RAM-probed matrices,
  turn2-endeavor-drain 111/112).
- **Next:** (1) main lane: ENDEAVOR droplets increment (spawn boundary
  pixel-pinned at 3006, physics banked in §15); (2) worktree: root-cause
  ISSUES #21; (3) wind down ~21:30-21:45 (deadline 22:16).
- **Notes:** none.

---
## 142 — Bounded worker: S7 slice E1d-retry — **ENDEAVOR squish RAM-probed and landed green** (renders 3000-3005, real hardware `gOamMatrices` values, not a pixel fit); `npm test` **672/672** (+3), `npm run build` green

- **State:** `npm test` **672/672**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` dense window now 2999-3005 (was bare 2999);
  `tools/probe/dump-endeavor-squish.py` committed.
- **Did:** RAM-probed the attacker's real `gOamMatrices[matrixNum]`
  per-tick (§15a's own recommendation) — found squish uses a DIFFERENT,
  non-inverting battle-anim subsystem (`SetSpriteRotScale`/
  `RunAffineAnimFromTaskData`) than mechanism 4's own inverting one, which
  is what actually caused §15a's X-axis miss (wrong subsystem, not a wrong
  axis — no swap needed, `xScale`→X/`yScale`→Y exactly as labeled).
  `drawSpriteSheetAffineStretch` already had the right (direct, unswapped)
  convention; added an opt-in `doubled` scan-window param (RAM-confirmed
  `ST_OAM_AFFINE_DOUBLE`, re-derived from `CalcCenterToCornerVec`) to let
  the silhouette grow past its native 64px box. Also found (pixel-solving
  the oracle's own captures, not assumed) that §15's "independently driven"
  palette blend is wrong — it's ALREADY ramping across this whole window,
  not scheduled later — and that the matrix/blend don't share one render
  lag (matrix: 2 ticks; blend: the usual 1). Landed squish+blend together
  (blend reused `drawSpriteSheetAffineStretch`'s own existing tint params,
  no new primitive). Droplets contaminate 1 tick earlier than §15 estimated
  (3006, not 3008) — window trimmed 3000-3007→3000-3005 rather than commit
  a knowingly-red pair; full analysis in `docs/battle-menu-notes.md` §15b.
- **Next:** droplets are the clear next increment (asset extracted, physics
  formula banked in §15, spawn boundary now pixel-pinned) — same
  land-green-then-extend discipline. After that: blend/shake/hitsplat per
  §15's leverage order, then DRAGON_BREATH (E2) or ISSUES #19/#20.
- **Notes:** no papercuts.
