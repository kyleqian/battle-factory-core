# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
