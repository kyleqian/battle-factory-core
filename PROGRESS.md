# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 157 — Supervisor: round 4 folded + **OPEN ESCALATION to the user (fire projectiles: 3 bounded attempts, each narrowing, none closing)** — swap-screen assets extracted & composite-verified; suite 711/711, build green, tree clean, no worktrees

- **State (supervisor-verified this minute):** `npm test` **711/711**,
  `npm run build` green, tree clean at the `99ec13e` merge + this docs
  commit, no worktrees/stray branches. Trace counts unchanged and
  supervisor-spot-checked: `turn2-dragonbreath.json` 84/84,
  `turn2-endeavor-drain.json` 201/201.
- **Did:** Worktree lane (`99ec13e`, merged): swap-screen assets
  extracted — `action-box`/`action-highlight` (slide buttons) +
  `swap-screen-windows.json` (BG/window templates, mechanically parsed
  from source), composite-verified vs FRESH oracle pixels at **0
  unexplained mismatches / 1404 opaque px** (supervisor reran the
  verification script itself); everything else the swap screen draws is
  source-confirmed verbatim reuse of draft-screen gen assets. §17
  ADDENDUM 3. Main lane (`f71448a`): projectile attempt #3 — the
  ember-palette-blend suspect is now CLOSED by source-level call-chain
  proof (not just empirics), and the residual is renamed precisely:
  salt-and-pepper edge OVER-DRAW when compressed (|matrixA|>256) vs an
  isolated MISSING blob when magnified, correct core both sides. Pulled
  again (no wrong pixels shipped).
- **ESCALATION (open, asked in-terminal 2026-07-20 ~00:35):** the fire
  projectiles have now taken 3 bounded attempts with real narrowing each
  time and no closure. Asked the user how to spend the remaining ~3.5h.
  Supervisor recommendation: ONE more targeted attempt on a specific new
  hypothesis (below), then park as a named remainder if it misses.
  Attempt #4 launched concurrently with the question (cancelable).
- **Supervisor hypothesis driving attempt #4** (`E2a-5`): the defect is
  in `drawSpriteSheetAffineRotate`'s SAMPLING CONVENTION (battleScene.ts
  ~2337), not in any DRAGON_BREATH value — correct core + wrong edges,
  opposite artifacts either side of 1:1 scale, is the signature of a
  half-texel/rounding mismatch in a backward-mapped affine sampler; and
  this sampler's only other rotating consumer (ball spin) never exceeds
  |pa|=255 while DRAGON_BREATH starts at 703, i.e. the bug's regime was
  never exercised before. Brief mandates hardware-semantics derivation +
  a 4-variant sweep + a hard regression gate on every shared consumer.
- **Next:** fold attempt #4 and the concurrent core.ts per-battle-moveset
  plumbing step (S8 prerequisite named in ROADMAP S8); then E2b (HP drain
  + turn end, 3347-3846), faint/forced-switch slice. ISSUES #22 open
  (idle fixture tick 2135, informational).
- **Notes:** worker costs $5.26 + $5.10 (17/16 min). ISSUES #19's fix
  left `battle1-fight-submenu-idle.json` at 255/256 (tick 2135 = #22).

---
## 156 — Bounded worker: S7 slice E2a-4 attempt — fire-projectile attempt #3: PRIME SUSPECT (concurrent ember-palette blend) definitively RULED OUT by source+pixel evidence; residual precisely characterized (two scale-dependent artifact shapes, present from a spawn's very first tick) but NOT closed — pulled a third time; `npm test` **711/711** (unchanged), build green, zero regressions, no trace change

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (`3121-3176` + `3236-3263`,
  84/84 green) — `3177-3235` still open. Regression spot-checks:
  `turn2-endeavor-drain.json` **201/201** (unchanged, ISSUES #19 already
  closed by #155).
- **Did:** Per the brief's mandatory method, re-wired E2a-3's exact
  best-fit config (base=(72,88), lag=1, direct matrix, `drawSpriteSheet
  AffineRotate`) and ran a diff-COLOR dump FIRST (`tools/compare/scratch/
  diffdump.mjs`/`diffmap.mjs`, both new, committed, generic — reusable by
  the next worker). Findings: (1) **prime suspect ruled out two ways** —
  source trace shows `AnimTask_BlendBattleAnimPal`'s `F_PAL_TARGET`
  structurally cannot reach the embers' own palette slot (unrelated gfx
  tag), and every mismatched pixel this session sampled is a clean
  small-ember yellow-red-ramp color, never a blended/wrong hue — this is a
  shape defect, not a color one. (2) The residual splits into two distinct
  scale-dependent shapes: salt-and-pepper edge over-draw when the sprite is
  compressed (`|matrixA|>256`, small `n`) vs. one isolated ~15x15 missing
  blob when magnified (`|matrixA|<256`, large `n`) that doesn't reduce to a
  spawn-duration off-by-one (tested clamping `n` to 21 — made tick 3220
  WORSE, 342px→649px, hypothesis killed and reverted within the session).
  (3) **Caught a false claim before it shipped**: initially assumed the
  reverted code was a no-op over the already-green `3121-3176`/`3236-3263`
  captures; actually re-ran `npm run compare` with the code temporarily
  back in and found it regresses `3175`/`3176` (12px/15px) — spawn 0's
  first visible tick falls inside the currently-captured range. Docs
  corrected to reflect the checked result, not the assumption. Pulled
  (`git checkout -- src/engine/battleScene.ts`) per the no-wrong-pixels
  rule — full writeup in `docs/dragon-breath-notes.md`'s new "Engine slice
  E2a-4" section.
- **Next:** per the brief, this was the last attempt before escalation —
  **recommend the supervisor treat this as the escalation trigger**: three
  bounded-worker attempts (E2a-2/E2a-3/E2a-4) have each made real, provable
  progress (scale-only → full rotated matrix → palette ruled out + shape
  characterized) without closing the gap, and the remaining work needs
  either a dedicated non-bounded session (isolated single-spawn pixel
  tracing, masking out every other draw call — sketched in the docs) or
  accepting `3177-3235` as a permanently named remainder and moving on to
  hit-flash (3263-3283)/E2b (HP drain 3298+, turn-end 3329+)/faint-switch,
  none of which depend on this gap closing first.
- **Notes:** no papercuts. `tools/compare/scratch/dragonbreath-projectile-
  window.json` (a ready `captureFrames` 3177-3235 scratch trace) also left
  committed for the next attempt to reuse without rebuilding the harness.

---
## 155 — Supervisor: round 3 folded — **ISSUES #19 ROOT-CAUSED AND CLOSED (asset harvest 1 row short): fight-submenu 235/235, turn2-endeavor 77/77, turn2-endeavor-drain 201/201 — all three now PERFECT**; shake/blend Tier-1 debt backfilled (711/711); fire-projectile pulled a 2nd time (findings banked, 3rd attempt briefed with a new instrument)

- **State (supervisor-verified this minute):** `npm test` **711/711**,
  `npm run build` green, tree clean at the `779e484` merge + this docs
  commit, no worktrees. Supervisor-rerun on the MERGED tree:
  `fight-submenu.json` **235/235**, `turn2-endeavor.json` **77/77**,
  `turn2-endeavor-drain.json` **201/201**, `s6-acceptance.json` 224/228
  (unchanged, #5/#18 policy-settled), `turn2-dragonbreath.json` 84/84.
- **Did:** Worktree lane (`779e484`, merged): #19 was never a timing
  mechanism — `extract-menu-idle-window.ts` hardcoded the healthbox
  bounce harvest at height:37, cropping row 111 of the rare y2=2 sine
  peak (once per ~256-tick lap); bbox→38 + regenerated asset fixed all
  three affected traces with zero code changes and a 30-trace sweep
  clean. Its sibling anomaly tick 2135 in the idle groundtruth fixture
  is NOT the same family (769px vs 99px) — filed as new ISSUES #22
  (informational fixture, low priority); tick 2071 IS closed. Main lane
  (`6a11221`): E2a-2's untested shake/blend formulas now pinned (4
  tests, fresh-capture cross-checked; 707→711); fire-projectile retry
  PULLED again per the no-wrong-pixels rule — but the matrix is now a
  settled 21-entry table (a==d, b==-c, identical across all 8 spawns,
  non-inverting family confirmed from source), base=(72,88), lag=1;
  remaining residual is flat ~15-100px/tick, mechanism unnamed.
- **Next:** Round 4: main = E2a-4 projectile attempt #3 with a NEW
  instrument — diff-COLOR dump first (geometry vs palette
  discrimination), prime suspect: a concurrent AnimTask_BlendBattleAnimPal
  instance also blends the EMBER palette while the engine renders it
  unblended. If #3 misses, ESCALATE to the user (options: park as named
  remainder / dedicated deep session). Worktree = S8 swap-screen asset
  extraction (from §17's inventory). Then E2b (3347-3846), faint/switch.
- **Notes:** worker costs $3.66 + $8.60 (15/28 min). ISSUES #19 deleted,
  #22 opened. Convergence per the strictly-smaller-named-gap rule is
  real but slowing on the projectile — attempt #3 is the last before
  escalation.
