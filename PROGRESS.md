# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 141 — Supervisor: swap-YES scout merged — **the factory swap screen is fully ground-truthed** (entry fade → party picker → popup → opponent picker → accept → completed swap → battle 2's menu: swapped-in GROVYLE 143/143 vs KABUTO); S8 ground truth is now essentially complete on both swap branches

- **State:** `npm test` **669/669**, `npm run build` green, tree clean at
  this merge; no worktrees, no unmerged branches.
- **Did:** verified (suite in worktree, 34081-frame trace re-run, final
  frame visually confirmed) and merged worker/wt-20260719-181044:
  `battle1-swapyes-{a,b}.json` (30001f/235c, 34081f/194c, verbatim
  prefix off battle1-winline-b-swap.json's committed swap-offer prompt
  at tick 29601, both twice-run byte-identical), §17 (swap-screen UI
  sequence + asset inventory: nearly all draft-screen assets literally
  shared; only action-button pills + swap text bank are new). Worker
  honestly deleted a broken `rentalMons[]` probe (offset bug, §17 open
  item) rather than commit implausible data; YES-branch LCG ledger also
  still open.
- **Next:** (1) main lane: ENDEAVOR squish X-axis via RAM-probing the
  real affine matrices (§15a's own recommendation) — second landing
  attempt; if it fails again, park the anim and move to E2/#19/#20;
  (2) worktree: §17 debt (rentalMons offset fix + YES-branch ledger) +
  battle-2 opening-turns ground truth; (3) wind-down prep ~21:45.
- **Notes:** none.

---
## 140 — Bounded worker: S7 slice E1d — ENDEAVOR squish wired + oracle-fitted, X-axis MISFITS — reverted, nothing landed; suite unchanged **669/669** (`docs/battle-menu-notes.md` §15a FITTED addendum has the full empirical writeup)

- **State:** `npm test` **669/669** (unchanged), `npm run build` green,
  tree clean, no trace changes. Engine code was written and tested this
  session but **reverted** (`git checkout`) once it was clear it only
  half-fit — this run's own "never commit red" rule, not a scope call.
- **Did:** confirmed `drawSpriteSheetAffineStretch` (already in
  `battleScene.ts`, built for GROVYLE_STRETCH) is the renderer §15 asked
  for — no new primitive needed, just pre-invert the accumulator
  (`0x10000/acc`) before calling it, since squish is table-driven
  (`AFFINEANIMCMD_FRAME`/real `ObjAffineSet`, same family as materialize)
  unlike GROVYLE_STRETCH's own bespoke direct-write function. Ran a fresh
  dense oracle probe (`turn2-endeavor-drain.json`'s own prefix, captures
  2996-3012) that sharpened §15's bbox table to the exact tick: 2999
  neutral, 3000 first visible, 3006 widest, 3008 target-side contamination
  starts — pins `ENDEAVOR_SQUISH_START_DELAY=54`. Fitting against that
  data found the **Y axis matches the oracle exactly** (`dxScale`'s own
  accumulator maps to rendered Y, not X — a real axis-label correction)
  but the **X axis doesn't**: oracle wants a 76px-wide silhouette (12px
  past the 64px neutral canvas), the fitted renderer only reaches 63px —
  a whole-silhouette misalignment, not an edge residual. Tried both
  remaining axis-mapping directions and an `ST_OAM_AFFINE_DOUBLE`-style
  doubled destination box (added as a backward-compatible opt-in param,
  since reverted with everything else) — neither closed the gap.
- **Next:** RAM-probe `gSprites[]`'s own affine data fields for X directly
  (same `dump-rockslide-sprites.py`/`sendout-grovyle-stretch.json`
  precedent this run already has) rather than continuing to pixel-fit
  blind — recommended over more guessing, per §15a's own "open questions"
  list (possible causes: a transcription error in the extracted step
  table, or a concurrent mechanism, e.g. the blend task, already
  contributing pixels earlier than assumed). Once X fits, land exactly
  per the original brief's staged order (squish sub-window 3000-3007 →
  droplets → blend → shake → hitsplat).
- **Notes:** no papercuts. Time-boxed session spent its remaining room on
  pixel-fit attempts rather than switching to a RAM probe soon enough —
  flagged in §15a so the next session doesn't repeat the same dead ends.
