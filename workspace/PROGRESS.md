# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1353 — [planning session, 2026-08-19] **Next-milestone reset: the chained-round distribution-parity program is COMPLETE (all 3 steps landed 08-16/17; the queue line was stale), #39 split + ladder Slice 3 DEMOTED, new milestone M-A = measure how deep play actually gets**

- **State:** planning/audit session at the TOP layer. No `src/`, `tools/`, or
  test change. Three docs edited: `ROADMAP.md` (new 2026-08-19 user-decision
  block), `docs/chained-round-distribution-parity-plan.md` (STATUS header),
  `PROGRESS.md` (this entry, plus archiving 1349/1350). Docs-only — no suites
  required per the standing judicious-cadence rule.
- **Did:** the user asked, in plain terms, how the last run went and what was
  next; then asked to reorganize so the substantive program — not the
  housekeeping — became the next milestone. Auditing what that program
  actually *is* inverted the premise twice:
  1. **The queue line was stale.** ROADMAP's "chained-round
     distribution-parity breadth" had been carried as unstarted since
     2026-08-14 and was reported to the user that way. All three dispatchable
     steps of `docs/chained-round-distribution-parity-plan.md` §4 had in fact
     landed on 2026-08-16/17 — step 1 `96e1dd4b` (4-hop chaining test,
     silver Brain reached at hop 3 by real carry), step 2
     `factoryRentalGeneration.ts:229-239` (challengeNum-8 retail-OOB
     rationale), step 3 `6366ee33` + sweeps `6d92ddf1` (`winning` policy;
     standing coverage `vanilla` 0:60 / `full` 0:180 / `winning` 0:180, all
     green) — with step 4 already marked SATISFIED inline. Corrected to the
     user in-session.
  2. **The program's own completion hid a bigger gap.** Every one of those
     sweeps proves *crash-freedom*; none measures *depth*.
     `randomRoundSoakDriver.ts:163` declares `carriedWinStreak` with a doc
     comment naming it "the deepest chained-streak value this run reached ...
     used by the soak depth report", `:907` populates it on every result, and
     `rg carriedWinStreak` (run live) shows **nothing in the tree reads it** —
     no CLI output, no test, no sweep doc. So whether play ever gets past
     challengeNum 1 is unmeasured: it is fully consistent with all 420 clean
     seeds that every one lost in round 1, leaving the escalated rental
     tiers/IVs, the challenge-2+/4+ AI tiers, and the battle-21 silver Brain
     touched only by step 1's scripted test.
- **Result:** ROADMAP carries a new user-decision block recording the
  correction and **milestone M-A ("how deep does play actually get?")**, user
  pick *measure first, then scope*: (1) print `carriedWinStreak` per seed and
  as a distribution in the sweep summary — report layer only; (2) re-run over
  already-swept, known-green ranges; (3) report how many seeds reach streak
  7/14/21 and the deepest anywhere. The follow-on scope decision explicitly
  returns to the user *with the measurement in hand*. ISSUES #39's canonical
  split (76 of 226 symbols left) and ladder Slice 3 are demoted in writing to
  filler — not the next objective, and not to be reported as such again.
- **Next:** dispatch M-A step 1 to a workspace worker (report-layer change to
  `tools/soak/randomRoundSoak.ts` + the driver's summary; no engine, no
  policy, no new standing gate), then steps 2-3 as one evidence step.
- **Notes:** PAPERCUT-adjacent process finding, recorded rather than fixed:
  the stale queue line survived ~5 supervisor sessions because a ROADMAP
  "next runs" order is written once and never re-validated against the tree,
  while the work that satisfies it lands under a different heading (soak
  sweeps). Both prior stale-doc catches this month (the seam ladder's §0
  correction; this one) were found the same way — re-running the doc's own
  claims live. Cheap rule: any session that reports a queue item's status to
  the user verifies it against the tree first, at least by `git log -S` on the
  item's named artifact.

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

