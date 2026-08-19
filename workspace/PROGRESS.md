# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1348 — [main worker, 2026-08-19 session 9] **ladder Slice 1 CLOSED: turns 9/11/12 idle-bounce residuals all full bars (finisher for 3 salvaged fixes, one docs+pins commit)**

- **State:** one green commit (`7a914770`, Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,114 passed (+30 new pin
  assertions) / 223 skipped**; `npm run build`/`npm run typecheck` green.
  The three fixes themselves (`62a36f66`/`511c8c7f`/`eb0be62b`) were landed
  and supervisor-verified by a prior, cap-killed worker; this session was
  the finisher only (pins + docs + differential), no fix logic touched.
- **Did:** added 4 "ISSUES #39 rank-5 slice 1 (`<sha>`)" describe blocks to
  `tests/battleScene.test.ts`, pinning each fix's raw-sine-index offset
  directly against the fixed `menuIdleBounce` closed form at named ticks
  (turn9: +191 flat + +205-with-2-tick-freeze; turn11: +114; turn12:
  +237), each paired with a pre-fix (offset 0) mismatch proof. Exported 5
  previously-file-local symbols in `battleScene.ts` to make this possible
  (no logic change — `git diff` is 5 lines, each just adding `export`).
  Red-verified by zeroing the three named offset constants in source: 6 of
  the new pins failed as expected; restored (byte-identical to pre-edit)
  and reconfirmed green before committing.
- **Result:** `turn9-quickattack-off` **233/233**, `turn11-featherdance-off`
  **191/191**, `turn12-aerialace-off` **247/247** — all three CLOSED (full
  bars). Differential guard (`compare:differential -- turn10-aerialace-off
  turn10-rockslide-off turn10-menu-off turn9-rockslide-off
  turn11-rockslide-off turn12-rockslide-miss-off --base c4441e8e --summary`)
  **1312/1312 captures byte-identical**. Spot-guards `turn5-resolve-off-a`
  196/196, `turn5-confirm-off-a` 132/132 (both #97-family, unaffected).
  Docs: dated landed-addendum in `docs/idle-bounce-phase-attribution.md`;
  row 5 of `docs/battle-scene-retirement-inventory.md` updated to full
  bars; `docs/presentation-seam-retirement-ladder.md` Slice 1 marked
  LANDED with final counts.
- **Next:** ladder Slice 1 is fully closed. Ladder Slice 2 (the
  `battleScene.ts` -> `battleSceneCanonical.ts` split, ~35-45% executed,
  `docs/presentation-seam-retirement-ladder.md` §3) is the next open item
  on this doc's own ladder — not started this session, out of this step's
  scope. The idle-bounce doc's own §5 prediction
  (`TURN8_MENU_REDRAW_DELAY≈434`, the turns 6-8 upstream OFF re-timing
  that would let these three per-turn offsets be replaced by one shared
  upstream fix) remains open and unpursued — named for whoever retimes
  turns 6-8, not blocking anything today.
- **Notes:** no PAPERCUT.
