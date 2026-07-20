# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 154 — Bounded worker: S7 slice E2a-3 attempt — Tier-1 pins backfilled for E2a-2's shake/blend (debt closed); fire-projectile RE-PULLED after a much-closer-but-not-exact retry; `npm test` **711/711** (+4), build green, zero regressions, no trace change

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (still `3121-3176` + `3236-3263`,
  84/84 green) — the `3177-3235` gap is still open. Regression:
  `turn2-endeavor-drain.json` 200/201 (unchanged, pre-existing ISSUES #19
  residual).
- **Did:** (1) **Tier-1 debt closed** (required per the brief): 4 new pins
  in `tests/battleScene.test.ts` for `dragonBreathShakeX2`/
  `dragonBreathBlendCoeff`, oracle-cross-checked against a FRESH scratch
  `bin/oracle run` capture (not reused data). (2) **Fire-projectile retry**:
  extended `tools/probe/dump-dragonbreath-anim.py` to read `matrixB`/
  `matrixC` (previously only `a`/`d`) — found the full matrix is clean
  (`a===d`, `b===-c` always, one 21-entry table, identical across all 8
  spawns, banked in docs). Confirmed from source (per the brief's explicit
  ask) that the sprite template uses the generic `RunAffineAnimFrame`/
  `ObjAffineSet` system (same family as the ball spin, NOT squish's
  `SetSpriteRotScale`) — no inversion needed feeding RAM-read values
  straight into `drawSpriteSheetAffineRotate`. Empirically swept base
  position + render lag + sign convention against fresh oracle PNGs: best
  fit is base=(72,88) exact (no half-width correction), lag=1 tick, direct
  matrix (no source flip) — MUCH closer than E2a-2's scale-only attempt
  (~15-100px/tick flat, not a growing-to-1000px curve) but still not 0.
  **Pulled again** (`git checkout -- src/engine/battleScene.ts`) rather
  than ship non-exact pixels — full writeup + exact tables +
  narrowed-down "what's likely still wrong" in
  docs/dragon-breath-notes.md's new "Engine slice E2a-3" section.
  Hit-flash not attempted (all time went to the above).
- **Next:** the fire-projectile residual is now small enough (a per-tile
  edge/rounding artifact, not a wrong position/scale/sign — all ruled out
  this session) that a resuming worker should instrument
  `drawSpriteSheetAffineRotate`'s own sample loop pixel-by-pixel against a
  single isolated spawn (ticks 3177-3197) rather than re-sweep whole-frame
  diffs — base=(72,88)/lag=1/direct-matrix and all three data tables
  (matrix/position/frame) are settled, not open questions. Then hit-flash
  (3263-3283), Grovyle's HP-bar drain (3298+) + turn-end (3329+) = E2b,
  then faint/forced-switch, ISSUES #19 root cause.
- **Notes:** no papercuts. This mechanism has now been attempted twice and
  pulled twice for the same reason (close but not pixel-exact) — if a
  third attempt also falls short, worth the supervisor considering whether
  to timebox it differently (e.g. a dedicated non-bounded session, or
  accepting the `3177-3235` gap as a named remainder past this slice) rather
  than repeating the same RAM-probe-then-sweep pattern a fourth time.

---
## 153 — Supervisor: round 2 folded — **ISSUES #20 CLOSED (FIGHT submenu on the live FONT_NARROW glyph pipeline, arbitrary movesets render)** + DRAGON_BREATH shake/blend/kickoff landed; suite **707/707**, build green, zero regressions, no worktrees

- **State (supervisor-verified this minute):** `npm test` **707/707**,
  `npm run build` green, tree clean at the `a7eb084` merge + this docs
  commit, no worktrees/stray branches. Supervisor-rerun on the MERGED
  tree: `fight-submenu.json` 234/235, `turn2-dragonbreath.json` 84/84,
  `turn2-endeavor-drain.json` 200/201 — the two lanes' shared
  `battleScene.ts` edits merged conflict-free and stayed exact.
- **Did:** Round 2 = three workers. Main lane #151 (`f0324d6`+`906734e`):
  DRAGON_BREATH kickoff text 3121-3176 green + `small_ember.png`
  extracted. Main lane #152 (`6e6b334`): probe-first landed
  `AnimTask_ShakeMon2` (±2px, lag=1) + both red-fade
  `AnimTask_BlendBattleAnimPal` instances (exact formulas, lag=2);
  fire-projectile attempt PULLED honestly — its affine pop is a genuine
  ~178.6° rotation (first rotating affine in this codebase), exact
  per-tick data banked in `docs/dragon-breath-notes.md`. Worktree lane
  (`a7eb084`, merged): ISSUES #20 remainder closed — new
  `src/engine/fightSubmenuText.ts` renders move names (FONT_NARROW),
  TYPE/ mixed-font run, PP digits + full 4-band PP-color state machine;
  identity preserved byte-exact on both submenu traces (same sole #19
  frames); KABUTO's real battle-2 moveset renders (+14 tests).
- **Next:** Round 3: main = E2a-3 fire-projectile retry (dump
  `gOamMatrices` per tick for the projectile slots — use REAL matrix
  values, not scale approximations; MUST also backfill #152's missing
  Tier-1 pins for shake/blend); worktree = ISSUES #19 root-cause scout.
  Then: E2b (HP drain + turn end 3347-3846), faint/forced-switch slice.
- **Notes:** worker costs $4.23/$14.25/$7.26 (10-34 min). #152 landed
  without Tier-1 pins (gap flagged, folded into E2a-3's brief).
  ISSUES #20 deleted (remainder = per-battle moveset wiring through
  `core.ts` is S8 engine scope, noted in ROADMAP S8).
