# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 871 — [bounded MAIN worker, 2026-08-02] slice 10 (final interface cut) LANDED for drawFightSubmenuWindow/currentPPForActiveMon; battleScene.ts's broader Turn1-13 type usage stays open (scope gap, reported)

- **State:** master `7bd37eab` (two commits on top of `d4a89680`:
  `ad0cfa07` the cut, `7bd37eab` a two-assertion test fix). Full `npm test`:
  **626 files / 6,348 passed / 1 skipped**; `npm run build` green (tsc + vite).
  Differential: `compare:differential` over the row-10 union (53 traces) vs
  base `d4a89680` — **PASS, 9,238/9,238 captures byte-identical**, every
  per-trace count matching the brief's table exactly. Census
  (`tools/census-next-command-handoffs.sh`): `drawFightSubmenuWindow`
  handoff parameters **0** (was 13), `currentPPForActiveMon` handoff
  parameters **0** (was 13), state/initial/advance-copy entries stay **0**,
  completed-handoff type declarations **13** (unchanged, as directed —
  the turnNResolutionAdapter.ts files keep their own).
- **Did:** `drawFightSubmenuWindow`'s only production call site always
  passed `null` for all 13 turn1-13 params, so the signature drops to
  `(fb, t, submenu, latest, resolutionOwner, trainerPresentation)` and the
  four internal compatibility-fn calls inline literal `null` in place of the
  removed params (byte-identical by construction, confirmed by the
  differential). `currentPPForActiveMon` is now the design's final
  `(moveset, latest, lockedResolution, followingResolution)` signature —
  the retired 13-arg legacy body is gone and `currentPPForActiveMonFromLatest`
  is folded into the `currentPPForActiveMon` name. `drawFightSubmenuChrome`
  (out of this slice's own scope, its 13-param signature untouched) is the
  one remaining internal consumer of the old chain; since its own callers
  never supply turn5-13, it now calls a small local
  `drawFightSubmenuChromeTurn1Through4PP` helper in `battleScene.ts` that
  keeps only the turn1-4 subset of the retired formula. Rewired
  `tests/battleMenu.test.ts`, `battleSetup.test.ts`, `fightSubmenu.test.ts`,
  and (necessary consequence, not in the row-10 file list but required for
  the signature change to compile/pass) `tests/turn{5..13}
  ResolutionAdapterEquivalence.test.ts` to build `LatestCompletedCommandHandoff`
  fixtures via each turn's own `resolveTurnNLatestCompletedCommandHandoff`
  instead of hand-chaining 13 positional legacy receipts; the shadow
  legacy-vs-generic equivalence tests (whose entire purpose was proving this
  exact cut safe) are replaced with direct regression pins on the now-sole
  generic path. One post-differential test fix: two `fightSubmenu.test.ts`
  assertions had substituted `TURN4_LATEST_HANDOFF` (correctly pinned to
  turn 3's own prior receipt through the turn-4-settled/turn-5-reopen window
  per `docs/turn4-fold-pp-freshness-design.md` §3) where the test actually
  wanted turn 4's own fresh completed-receipt PP fact (7/10, not 8/10) —
  fixed by calling `resolveTurn4CompletedResolutionNextCommandHandoff(4312)`
  directly for those two assertions only; every other `TURN4_LATEST_HANDOFF`
  use in that file was already correct (real production state fixtures).
  Did NOT add a `tests/helpers/battleSceneState.ts` fixture helper — the
  actual per-file transform needed was call-site substitution (raw
  positional chain → one `resolveTurnNLatestCompletedCommandHandoff()`
  value), which didn't need a shared constructor; flagging this as a
  deliberate deviation from the row-10 file list rather than a silent skip.
- **Next:** slice 10's remaining acceptance item (below); ISSUES #66(a)
  capped-stat banner fix (+(b) after an oracle probe, may already be
  in flight per entry 869's dispatch); species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md`.
- **Notes — scope gap, reported per the brief's failure mode:** the
  acceptance bullet "grep confirms battleScene.ts + battleMenu.ts import
  zero TurnNCompletedResolutionNextCommandHandoff types" is met for
  `battleMenu.ts` (**0** refs, confirmed) but NOT for `battleScene.ts`
  (**144** refs remain: turn1 17, turn2 17, turn3 18, turn4 20, turn5 12,
  turn6 11, turn7 10, turn8 9, turn9 8, turn10 7, turn11 6, turn12 5,
  turn13 4). These are NOT dead ABI on `drawFightSubmenuWindow`/
  `currentPPForActiveMon` (both already at 0) — they're live parameters on
  dozens of OTHER per-turn rendering helpers this slice's own SCOPE bullet
  never named (e.g. `drawFightSubmenuChrome`, `drawTurn5RockSlideAttack`,
  `drawTurn6FieldBase`, and the per-turn `drawTurnN...` window functions for
  turns 6-13, which still take raw typed handoffs for field/HP/bounce
  content — exactly the "named content-routing blocker" the design doc's
  own "Named content-routing blocker" section flags as unfinished, distinct
  from the dispatcher ABI this slice targets). Retiring those would mean
  auditing and likely rewriting dozens of unrelated rendering functions
  across a 34k-line file — a materially bigger, unscoped, unverified change
  I did not attempt inside this session's cap. Recommend either a
  follow-up slice (11?) scoped explicitly to that content-rendering type
  usage, or accepting the census's own numeric checks (all satisfied) as
  the real acceptance surface and treating the grep bullet as describing an
  aspiration the design doc's file list undersized.

---
## 870 — [bounded MAIN worker, 2026-08-02] slice-9 fold LANDED — turn4-fold-pp-freshness-design.md implemented, 14/14 differential clean, salvage branch merged+deleted

- **State:** master `c5563c72` (fast-forward merge of
  `salvage/slice9-fold-20260802`, now deleted). Full `npm test`: **626
  files / 6,349 passed / 1 skipped**; `npm run build` green (tsc + vite).
  Slice-9 fold is fully landed — both root causes from entry 866/867 are
  now closed (eviction-class HP fix was already in `a6d88eaa`; this
  session closed the PP-freshness root cause per the banked design).
- **Did:** implemented `docs/turn4-fold-pp-freshness-design.md` §3 exactly
  (no re-derivation): `resolveTurn4LatestCompletedCommandHandoff`
  (`turn4ResolutionAdapter.ts`) gained a `priorLatest` parameter and now
  sources `playerPp`/`persistedMoveSlot` from it instead of turn 4's own
  fresh receipt; `content` (HP/bounce/kickoff) stays turn-4-fresh,
  untouched. `core.ts`'s one call site (~1289) passes the pre-reassignment
  `latestCompletedCommandHandoff` as the second arg (non-null asserted,
  matching existing precedent at `core.ts:1467`). Added the §3.3 pinning
  unit test to `turn4ResolutionAdapterEquivalence.test.ts`; updated
  `fightSubmenu.test.ts`'s turn-4-confirm fixture's expected PP tuple from
  `[7,20,19,10]` (turn 4's own fresh) to `[8,20,19,10]` (turn 3's, pinned)
  per §3.4 — the only fixture found hard-coding the fresh tuple across the
  turn-4-settled→turn-5-reopen window.
- **Verification:** risk probes (design §6) both went byte-identical
  BEFORE the full run — `turn5-action-off` 32/32 (was 6/32),
  `turn5-confirm-off-a` 132/132 (was 121/132); their `captureFrames`
  cover the exact dense 5926-5957/5958-6089 reopen-edge ranges, so the
  clean per-tick result also confirms no new one-tick PP flicker (risk 2).
  Full 14-window matrix vs base `105c72d5`: **14/14 byte-identical**,
  matching every per-window count in design §5's table exactly (255,
  161, 256, 256, 256, 32, 132, 132, 196, 196, 196, 196, 46, 128 — sum
  **2,438**; the design doc/brief state "sum 2,436" for this same table,
  which is an arithmetic slip, not a real 2-capture discrepancy — the
  per-window acceptance, the actual criterion, is exact). Census
  (`tools/census-next-command-handoffs.sh`): state/initial/advance-copy
  handoff entries **0/0/0**, completed-handoff type declarations **13**,
  `drawFightSubmenuWindow` handoff parameters **13**,
  `currentPPForActiveMon` handoff parameters **13** — all exactly as
  design §5 specified.
- **Next:** slice 10 (final 13-param/type declaration cut, deferred per
  `docs/next-command-handoff-dispatcher-design.md` row 10); ISSUES #66(a)
  capped-stat banner fix (+(b) after an oracle probe, side lane, may
  already be in flight per entry 869's dispatch); species-dossier slices
  per `docs/species-render-entry-point-retirement-design.md`.
- **Notes:** the §6-risk-4 oracle-direction question (whether turn 5's
  reopen-hold window's PP freshness itself matches real hardware, vs just
  the parent) remains explicitly out of scope, per this fold's own
  byte-identity-to-parent brief. `animation-main` fold status unchanged
  from entry 869.

---
## 869 — [supervisor session, 2026-08-02 evening] animation-main folded (fast-forward); slice-9 + #66 two-lane round dispatched

- **State:** master `e3d7a0bc` = fast-forward fold of `animation-main`
  (animation supervisor live in its worktree; fold SHA pinned at orient).
  Union verified by supervisor: full `npm test` **626 files / 6,348
  passed / 1 skipped**, `npm run build` green. Oracle freshness PASS (both
  services current). DEFERRED.md remains clear.
- **Fold contents:** 7 accepted front-animation families since the last fold
  (glow black, rising wobble, orange glow, fast-short concave, rotate-up
  slam-down, deep V squish bounce, rotate-to-sides twice) — all inside
  `src/animation/` + `tests/animation/` + fixtures; no main-lane files.
  `ANIMATION_PROGRESS.md` top entry carried no "For the main program:" line.
- **Did:** (dispatch record; outcomes land in the next entry)
  1. MAIN lane: slice-9 fold completion from `a6d88eaa` per
     `docs/turn4-fold-pp-freshness-design.md` — implement-only brief with
     the §5 14-window acceptance table and §6 risk probes verbatim.
  2. SIDE lane: ISSUES #66(a) capped-stat banner fix (mirror `c7461398`)
     + (b) discriminating oracle probe (fix only on confirmation) —
     file-disjoint from the slice-9 touch list (verified: #65's fix touched
     only `battleResolutionPresentation.ts`).
- **Next:** verify both lanes; then slice 10 (final 13-param/type cut);
  then species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md`.


