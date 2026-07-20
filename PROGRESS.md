# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 158 — Bounded worker: S7 slice E2a-5 attempt — fire-projectile attempt #4: SUPERVISOR'S SAMPLING-CONVENTION HYPOTHESIS TESTED AND REJECTED by direct 4-variant sweep (every alternative to the current convention scored 1.4x-2.7x WORSE); pulled a fourth time, no wrong pixels shipped, `npm test` **711/711** (unchanged), build green

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (`3121-3176` + `3236-3263`,
  84/84 green) — `3177-3235` still open. No engine code left changed
  (shared `drawSpriteSheetAffineRotate` is byte-identical to E2a-4's own
  baseline — nothing to regress-check against).
- **Did:** Per the brief, tested the supervisor's specific hypothesis
  FIRST (not a fresh RAM-probe cycle): re-wired E2a-3's exact settled
  config verbatim, then swept `drawSpriteSheetAffineRotate`'s sampling
  convention. (1) **Iteration-box question answered from source, not
  swept**: `gDragonBreathFireSpriteTemplate.oam =
  &gOamData_AffineDouble_ObjNormal_32x32` (`battle_anim_dragon.c:93`) —
  same `ST_OAM_AFFINE_DOUBLE` mode the ball spin already uses; the
  existing `-w..w`/`-h..h` loop already implements exactly this
  doubled-window convention (source-confirmed correct, not an open
  question). (2) **Rounding/offset convention swept, 4 variants**
  (`"default"` = unchanged original body, `"halfPixel"` = sample at
  `dx+0.5`, `"round"` = `+128`-before-`>>8` round-to-nearest,
  `"halfPixelRound"` = both — all kept in fixed-point, no floats, to
  avoid JS's truncate-toward-zero-before-shift trap) against the dense
  3177-3235 scratch trace, summed `diffPixels` over 59 frames: default
  **8181** (baseline) vs halfPixel 21469 (2.6x worse), round 21933 (2.7x
  worse), halfPixelRound 11410 (1.4x worse) — **every alternative is
  worse**, the opposite of the hypothesis's prediction. Cross-checked the
  default run's own per-tick numbers against E2a-4's banked reads (23px@
  3178, 2px@3208, 342px@3220 — all three exact matches) to confirm this
  was an apples-to-apples reproduction before trusting the sweep.
  GBATEK/Tonc's documented OBJ affine formula (plain integer
  floor-via-arithmetic-shift, no half-pixel destination offset) is
  already what `"default"` implements, consistent with the sweep result.
  **Verdict: hypothesis REJECTED** — the residual's cause is something
  else, not the sampler's rounding/offset convention. Full writeup
  (formula citation, fixed-point sweep mechanics, the table, the
  `halfPixelRound`-beats-neither-alone signal and what it implies) in
  `docs/dragon-breath-notes.md`'s new "Engine slice E2a-5" section.
  Pulled (`git checkout -- src/engine/battleScene.ts`) per the
  no-wrong-pixels rule — `drawSpriteSheetAffineRotate` carries no
  `variant` param in the committed tree.
- **Next:** the brief's own step-4 fallback (isolate the magnified-half
  missing blob: render spawn 7 alone against a blank canvas, diff against
  an oracle capture with all other content subtracted) was NOT attempted
  — the hypothesis test consumed the full time budget. That's the next
  concrete lead, not a fresh sweep of position/scale/sign/lag/box (all
  now closed questions across E2a-3/4/5). Per #157's own open
  escalation: this is a 4th bounded attempt with a real, provable
  negative result (one more hypothesis eliminated) but still no closure —
  worth the supervisor/user weighing a dedicated non-bounded session
  (isolated single-spawn pixel trace) against parking `3177-3235` as a
  named remainder and moving to E2b (3347+)/faint-switch, none of which
  depend on this gap.
- **Notes:** no papercuts. Scratch sweep infra (`tools/compare/out/e2a5-*`,
  gitignored, not committed) reproduced E2a-4's own numbers exactly — no
  new committed scratch tooling this session (reused E2a-3/E2a-4's
  `dragonbreath-projectile-window.json` and `dump-dragonbreath-anim.py`
  unchanged).

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

