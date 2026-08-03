# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 868 — [interactive user session, 2026-08-02 evening] D1 adopted → DEFERRED clear; papercut fixes landed; play-preview retired

- **State:** master = this entry's commit on top of `f6452d7a`; no engine or
  test code touched (tooling/docs only), `npm run test:smoke` green (7
  files / 339 passed, ~23 s). **DEFERRED.md has NO open entries — the next
  `run-supervisor.sh` session is unblocked.**
- **Did (all user-directed):**
  1. **D1 RESOLVED:** communication contract moved into `SUPERVISOR.md`
     § "Communicating with the user", D1 entry deleted. Amended same
     evening at user request: cut to a short plain-English rule (no
     mandated status format, no per-item numeric requirement).
  2. **Worker self-abort papercut:** EXECUTION DISCIPLINE clause folded into
     `tools/run-subagent.sh`'s standing preamble (both prompt branches, all
     providers) — briefs no longer restate it. PAPERCUTS entry updated;
     delete it after a few clean worker rounds.
  3. **New `npm run test:smoke`** (~25 s: frontier ratchet, ability/item
     census, decision boundary, kernel full-turn, roundController,
     roundScenarioMatrix, battleScene) for mid-step sanity checks;
     documented in AGENTS.md Tests. Never substitutes for the full suite at
     a finish requirement.
  4. **Scene-ON battle-lab papercut entry DELETED** — verified fixed live:
     POST `/v1/battle-lab/run` on :8012 answers 400 mode-validation,
     identical to :8014 (the running service now carries the route).
  5. **Play-preview retired:** nothing was listening on :5199 (server
     already down); `.worktrees/play-preview` removed (detached at
     `105c72d5`, an ancestor of master; only untracked node_modules).
     Rebuild a fresh preview after the next user-visible fix lands.
- **Next (unchanged from 867):** (1) slice-9 fold completion from `a6d88eaa`
  per the banked design `docs/turn4-fold-pp-freshness-design.md`; (2) slice
  10; (3) #66(a) capped-stat banner fix (+(b) after an oracle probe); (4)
  species-dossier slices.
- **Notes:** `animation-main` still ~8 commits ahead with its own ledger —
  fold at next orient (unchanged from 867's note).

