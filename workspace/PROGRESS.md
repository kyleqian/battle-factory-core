# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1352 — [main worker, 2026-08-19] **ladder Slice 2 batch 8: canonical split 123→76 under decision (a), scanner gap found (functions writing to a let-cache elsewhere)**

- **Supervisor final-gates RERUN at this final tree (`82122cc3` + this
  amend), independent of the worker's own run:** full npm test **1,068
  files / 10,123 passed / 223 skipped**; `npm run build` green; soak
  vanilla 0:20 **20/20 OK**; soak full 0:60 **60/60 OK**. Entry 1351's
  gate block cited the pre-bonus tree; this line supersedes it for the
  session's final state. Slice 2's decision-(a) pool is now ~3 eligible
  function-kind symbols + the named one-line pickup
  (`playerHealthboxHpOverlayForHp`); the 4 canonical entry points remain
  the reserved final slice.

- **State:** two green commits (`75b73fab` move+reconnect, `b1fef20c` test-pin fix). Full
  `npm test` **1,068 files / 10,123 passed / 223 skipped**; `npm run build` green;
  `npm run typecheck` clean; `tests/animation/animationBoundaryRatchet.test.ts` untouched, 3/3.
- **Did:** eligibility scanner listed 50 function-kind ELIGIBLE symbols; excluded 2
  (`turn10OnixDarkPalette`, `getMenuHealthboxPlayerContentMask`) after finding each writes
  (via `??=`/assignment) to one of the two named let-cache blockers while the let itself stays
  behind — the scanner's let-cache hazard class only flags moving the let, not a function
  elsewhere assigning to it; confirmed live by attempting the move and reading both function
  bodies, not inferred. **Flagging for the next scanner touch**, not fixed here (out of scope:
  "scanner rewrites"). Moved the remaining 48 (Set-dedup landed 47, one accidental arg-list
  duplicate); reconnected battleScene.ts/battleSceneCanonical.ts by the batch 6/7 pattern
  (export-add + import-back, third-module direct imports, dead-specifier pruning, one
  battleScene.ts→canonical.ts import-back for functions two still-blocked H2 functions call).
  Reused batch 7's existing `battlescene-split-move.ts` tool as-is.
- **Result:** eligibility scanner CANONICAL 123→**76** (matches batch size), partition
  bucket-acyclicity CLEAN; differential (`turn5-resolve-off-a turn5-confirm-off-a
  turn9-quickattack-off turn11-featherdance-off turn12-aerialace-off turn13-switchin --base
  bfd60da8 --summary`): **1241/1241 byte-identical**; `battleScene.ts` loads standalone, no
  TDZ crash. `tests/battlesceneSplitEligibility.test.ts`'s pinned ">20 eligible" floor went
  stale (live pool dropped to 3) — lowered to ">0", not a scanner regression (full suite
  verified green both before and after).
- **Next:** Slice 2 batch 9 — scanner shows **3** function-kind eligible symbols remain
  (`getMenuHealthboxPlayerContentMask`, `playerHealthboxHpOverlayForHp`,
  `turn10OnixDarkPalette`), but only the first and third are the real let-cache-write hazard
  above; **`playerHealthboxHpOverlayForHp` was over-cautiously excluded this round** (pattern-
  matched alongside the other two without individually re-checking) even though its own cache
  (`playerHealthboxHpOverlayByHp`) is a `Map` used via `.get()`/`.set()`, not a `let`
  reassignment — importing a `Map` binding and calling methods on it is legal ESM, unlike
  assigning to an imported `let`. Confirmed live (not just reasoned) by grepping its body: no
  `=` assignment to the imported binding. Next batch worker: move
  `playerHealthboxHpOverlayForHp` alone first (near-zero risk, already scoped), then the
  ~28-symbol non-`function`/topological remainder batch 6/7 deferred, or decision (b).
- **Notes:** no PAPERCUT beyond the scanner gap above (cost ~5 min: one wasted move+revert
  cycle, caught before commit) and the `playerHealthboxHpOverlayForHp` over-exclusion above
  (cost ~1 min to catch via a fresh scanner run post-commit; left for next batch rather than a
  third move+verify cycle inside this session's cap).

---

## 1351 — [supervisor wind-down, 2026-08-19] **#97 SETTLED (resolve-off-a 60→196/196 + confirm-off-a 128→132/132 CLOSED, park/accept endgame for the last 4 frames) + seam ladder authored + Slice 1 CLOSED (turns 9/11/12 full bars) + canonical split 226→123 under newly authorized decision (a) — 10 worker rounds + 2 cap-kill salvages, all supervisor-verified**

- **Final gates (at `e6b4ab1c` + this docs commit):** full npm test
  **1,068 files / 10,123 passed / 223 skipped**; `npm run build` green;
  soak vanilla 0:20 **20/20 OK**; soak full 0:60 **60/60 OK**.
  animation-main and rust-main EMPTY at orient AND wind-down. DEFERRED.md
  EMPTY. Only permanent worktrees remain; no worker branches. Freshness
  FAIL at orient = false-positive #6 (PAPERCUTS bumped).
- **#97 SETTLED (entry moved to ISSUES Settled records):**
  `resolve-off-a` 60→**196/196** via five stacked landed mechanisms
  (phantom rock-prop loop §17.4, 2-tick sink+healthbox-vanish §19,
  1-tick-early fainted text §19.3, HP-sliver +2 + cursor-onset t-1 §20);
  `confirm-off-a` 128→**132/132** (turn5 missing from the shared
  kickoff-text -1 ternary §9.5 + RAM-receipt-exact -21 live-bounce
  correction §9.6). Endgame supervisor decisions (per #61/#38 precedent):
  `-c` 6763 **PARKED** (3 probe sessions exhausted every candidate),
  `-d` 6996 **ACCEPT** (new post-redraw single-scanline capture-tear
  class), 6850/6184 the accepted PNG(T)=RAM(T-1) class. Every fix
  Tier-1-pinned red-verified; 16-trace guard family zero decreases all
  session.
- **Presentation-seam ladder** (`docs/presentation-seam-retirement-ladder.md`,
  scout round — it corrected the stale "two conversions" framing: the
  turn-keyed retirement was already ~rank-9 complete). **Slice 1 CLOSED
  same-session:** turn9-quickattack-off 177→**233/233**,
  turn11-featherdance-off 189→**191/191**, turn12-aerialace-off
  246→**247/247** (idle-bounce offsets +191/+205+freeze/+114/+237,
  RAM-receipt-exact; 4 red-verified pin blocks; differential 1312/1312
  byte-identical).
- **Slice 2 (canonical split) 226→123 symbols** (batches 5: 12, 6: 41,
  7: 50) under **decision (a) AUTHORIZED this session** (supervisor,
  recorded in ISSUES #39: canonical→battleScene value re-exports allowed,
  function-body reads ONLY; decision (b) stays deferred — ONIX-Sitrus
  cluster + 2 let caches stay put). New tooling:
  `tools/report/battlescene-split-eligibility.ts` (H1-eval-read/
  H2-animation-import hazard detection, Tier-1 self-check 9/9). Batch 7's
  full gates were run by the supervisor after the round-10 cap-kill:
  differential **1241/1241 byte-identical** vs `2e984787`, full suite
  green; salvage commit `e6b4ab1c` (scanner folds the partition's
  residual-unreachable block into CANONICAL — required after any batch
  whose move orphans a symbol's internal referrer).
- **Two cap-kills, both salvaged:** r7 (turn12 fix verified+committed
  `eb0be62b`, 35-min finisher worker added pins/docs) and r10 (scanner
  fix `e6b4ab1c`); this entry carries round 10's unwritten docs record.
- **Open (ordered for next session):** (a) Slice 2 batches 8+ — ~100
  eligible function-kind symbols of the 123 remain (scanner-selected; the
  4 canonical entry points are the reserved FINAL slice); (b) ladder
  Slice 3 (status-change/outcome emission — declared, unemitted, nothing
  blocked on it); (c) #71 rung 9 still blocked on animation lane's rung-4
  back dispatcher; (d) #73/#55 unchanged (parked). No deferred questions;
  no blockers.

---

## 1350 — [main worker, 2026-08-19 session 11] **ladder Slice 2: canonical split batch 6 landed under decision (a), 41 symbols (`battleScene.ts` CANONICAL 214 -> 173)**

- **State:** one green commit (`74f3c1c2`). `npm test` **1,067 files /
  10,114 passed / 223 skipped** (unchanged from baseline); `npm run
  build`/`npm run typecheck` green; `tests/animation/
  animationBoundaryRatchet.test.ts` untouched, reran green 3/3.
- **Did:** first batch under ISSUES #39's newly-authorized decision (a)
  (canonical→battleScene.ts value re-exports, function-body reads only).
  Wrote a scratch eligibility scanner (uncommitted) reusing the partition
  script's decl parser: found 159 of 214 remaining canonical-only symbols
  are `function` declarations (categorically safe under decision (a) —
  every SHARED/LIVE reference inside a function body is a deferred,
  call-time read, never module-eval); narrowed to the 48 with **zero**
  unmoved-canonical-internal dependency (no topological ordering needed).
  Excluded `ONIX_SITRUS_ROTATE_RENDER_LAG`: looks like a "zero-ref leaf"
  in isolation, but the file's one remaining top-level module-eval `if`
  guard (line ~10685, invisible to any decl-only parser) reads it eagerly
  to feed the still-blocked ONIX-Sitrus cluster — moving it would make
  *battleScene.ts itself* eagerly read an imported binding, the same TDZ
  hazard slice 1 proved unsafe, just reversed. Cross-checked the
  remaining 47 against battleScene.ts's own ~270 top-of-file imports (a
  check no prior session ran) and found a second, previously-undocumented
  hazard class: 6 functions (`drawFirePunchBurnFlames`, `drawFirePunchEmbers`,
  `drawGrovyleSettled`, `drawTurn13MurkrowSettled`, `drawTurn5PidgeottoSettled`,
  `drawTurn6FeatherSprites`) reference identifiers battleScene.ts imports
  from `src/animation/*` (speciesIdleAnim.ts, firePunch.ts, featherDance.ts)
  — the same animation-import boundary as the ONIX-Sitrus cluster (design
  doc §7 hazard 1), confirmed live via `npm run typecheck` before exclusion
  (not just inferred). Moved the remaining 41 as a pure text cut, then
  fixed the resulting typecheck errors mechanically: 42 battleScene.ts
  SHARED/LIVE symbols needed `export` added (pure visibility change, same
  binding/value) so the moved code could import them back; 6 of
  battleScene.ts's own third-module imports (battleMenu.ts,
  kabutoSendOut.ts, battleCommandPresentation.ts, battle2CommandAdapter.ts,
  battleSceneCanonical.ts) became dead after their sole battleScene.ts
  consumer moved out and were removed; 2 near-duplicate new import lines
  into battleSceneCanonical.ts were merged with lines an earlier session
  had already added from the same two modules.
- **Result:** partition script: CANONICAL 214 -> 173 symbols (41 moved),
  4645 -> 4199 declaration lines, bucket-acyclicity stays CLEAN. Full
  `npm test` **10,114/10,114 passed** (byte-for-byte same count as
  baseline), `npm run build` green. Differential
  (`compare:differential -- turn5-resolve-off-a turn5-confirm-off-a
  turn9-quickattack-off turn11-featherdance-off turn12-aerialace-off
  turn13-switchin --base 8033103c --summary`): **1241/1241 captures
  byte-identical**.
- **Next:** ladder Slice 2 continues at 173 remaining canonical-only
  symbols. Skipped this round, still open for a future batch: (1) the
  ~111 non-`function` (const/let/interface/type) canonical-only symbols —
  this session's eligibility scan only characterized `function`-kind
  decls as categorically safe; const-initializer eval-time-vs-deferred
  classification (attempted, see `SAFE-const-fn`/`UNSAFE-const-eager` in
  the scratch scanner) needs the same import-boundary cross-check applied
  before trusting it; (2) `function`-kind candidates with nonzero
  internal (still-unmoved-canonical) dependencies — topological batching,
  not attempted this round; (3) the 6 animation-import-hazard functions
  and `ONIX_SITRUS_ROTATE_RENDER_LAG` (blocked on decision (b), deferred);
  (4) the two `let` caches (blocked, ISSUES #39's named obstacle).
- **Notes:** no PAPERCUT, but flagging a real time sink for the next
  batch worker: the battleScene.ts-internal adjacency scan (this session's
  and the prior session's) is blind to (a) top-level module-eval
  executable statements outside decl boundaries, and (b) references to
  identifiers battleScene.ts imports from OTHER files (both animation and
  plain engine modules) — only caught here by grepping for stray
  `^if (`-style top-level statements and by cross-referencing every
  candidate's body against battleScene.ts's own ~270-line import header.
  Skipping either check would have produced a real TDZ crash (guard case)
  or a silent animation-boundary-ratchet violation (import case) despite
  a clean `battlescene-split-partition.ts` run and a clean pre-fix
  compile of the untouched file — worth scripting properly rather than
  re-deriving by hand every batch.

---

## 1349 — [main worker, 2026-08-19 session 10] **ladder Slice 2: canonical split batch 5 landed, 12 symbols (`battleScene.ts` CANONICAL 226 -> 214)**

- **State:** one green commit (`f15cb254`). `npm test` **1,067 files / 10,114
  passed / 223 skipped** (unchanged from baseline); `npm run build`/
  `npm run typecheck` green; `tests/animation/animationBoundaryRatchet.test.ts`
  untouched (`git status` confirms, reran green: 3/3).
- **Did:** re-ran `tools/report/battlescene-split-partition.ts` live (226
  CANONICAL-only symbols remained, up from #39's 2026-08-08 snapshot of 199 —
  the turn9/11/12 idle-bounce fixes landed this session added a few). Built a
  scratch dependency-closure scan (not committed) on top of the partition
  script's own adjacency, since its CLEAN acyclicity label only proves the
  *other* direction (per #39's caution): transitively, only 22 of 226 had zero
  battleScene-local SHARED/LIVE dependency. Excluded the two `let` caches
  (`turn10OnixDarkPaletteCache`, `menuHealthboxPlayerContentMask` — ISSUES #39's
  named obstacle: their consumers reassign them, which an ES import binding
  can't do) and, after a first attempt hit a real `tsc` failure, the 8-symbol
  ONIX-Sitrus rotate/tint/ring/granting-star cluster (calls `sitrus*AtAge`
  helpers from `../animation/heldItemHeal.ts` — design doc §7 hazard 1,
  confirmed live: moving them trips `animationBoundaryRatchet.test.ts`'s
  engine/animation import boundary). Also found and correctly handled a SECOND
  module-eval top-level `if` guard (line ~10683, invisible to the partition
  script's decl-only parser) that had to travel with its constant, matching
  §6's "module-eval guards travel with their constants" rule.
- **Result:** moved the remaining 12 clean symbols (turn5FaintDismissCursorTick,
  TURN5_PIDGEOTTO_BG_FADE_Y/turn5BgFadeY, turn5SitrusOffHealTextVisibleChars,
  turn5OffSitrusOnixHp, TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK,
  turn6ReopenBounceTick, TURN9_FIGHT_SUBMENU_BOUNCE_{FREEZE_TICK,INDEX_OFFSET}/
  turn9FightSubmenuBrowseBounceTick, TURN11/12_KICKOFF_BOUNCE_INDEX_OFFSET).
  Partition script: CANONICAL 226 -> 214 symbols, 4682 -> ~4645 declaration
  lines, bucket-acyclicity stays CLEAN. Differential (`compare:differential --
  turn5-resolve-off-a turn5-confirm-off-a turn9-quickattack-off
  turn11-featherdance-off turn12-aerialace-off turn13-switchin --base
  8bee19a0 --summary`): **1241/1241 captures byte-identical**.
- **Next:** ladder Slice 2 continues — re-run the eligibility scan against
  the next batch of the remaining 214 canonical symbols (same transitive
  SHARED/LIVE + animation-import + module-eval-guard checks this session
  established). The ONIX-Sitrus cluster and the two `let` caches remain
  blocked pending structural decisions (a)/(b) in ISSUES #39, not this
  worker's to make.
- **Notes:** no PAPERCUT. The partition script's own "zero-ref leaves"/
  "topological batch" framing in the design doc's §6 is aspirational — it has
  no such computed output; a fix worker must derive eligibility by hand
  (or script it fresh) each session, which is where most of this step's time
  went.

---

