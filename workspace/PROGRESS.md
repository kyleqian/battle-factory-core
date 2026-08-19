# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1355 — [supervisor wind-down, 2026-08-19] **Milestone M-A COMPLETE same-day (steps 1-3): play regularly passes challenge 1 (27-36%), ~5% enter challenge 3, NOTHING reaches carry 21 in 300 seeds — follow-on scope decision filed as DEFERRED D2; scanner H3 folded; walk-up ROADMAP line found stale TWICE and corrected to program-COMPLETE**

- **Final gates (at this tree, supervisor-run):** full `npm test`
  **1,068 files / 10,126 passed / 223 skipped**; `npm run build` green
  (exit 0); soak gates satisfied by this
  session's own sweep runs at the final code tree (all code folds landed
  BEFORE the sweeps; every commit after them is docs-only): vanilla
  0:20 **20/20 OK** (within vanilla 0:60 60/60, `a395d436`), full 0:60
  **60/60 OK** (`1e654c62`). DEFERRED.md now carries **D2 (OPEN)** — the
  post-M-A scope decision, reserved to the user by the M-A block itself.
- **Did (4 worker rounds + 1 read-only scout, 2 lanes):** (1) M-A step 1
  (entry 1354 below, supervisor-verified incl. a seed-0 diagnostics
  trajectory audit). (2) Side: scanner **H3-let-write** hazard
  (`e99c3511`, fold `79a0c6ad`) — batch-8's two hand-exclusions now
  auto-blocked, `playerHealthboxHpOverlayForHp` correctly still eligible
  (pool = 1 function-kind); union checks 26/26 + smoke 444/444; a stray
  main-tree copy of the edit (absolute-path papercut, hit #3) was
  byte-identical and discarded. (3) M-A steps 2-3 (`78f11bee`,
  `a395d436`, `1e654c62`): winning 0:180 + vanilla 0:60 + full 0:60,
  **all 300 seeds OK**, distributions + per-seed lines committed
  (`docs/soak-depth-measure-2026-08-19.{md,log}`); supervisor recounted
  winning carry≥7 from raw lines (64/180 exact match). Worker cap-killed
  at 90min mid-OPTIONAL-extension (full toward 0:180) — nothing lost,
  tree was clean and all goals committed. (4) Side scout on the
  "fixture 03 brainMoving cadence" residual returned **premise
  inverted**: the cadence was already derived and closed 256/256 by
  entries 1280/1296/1307/1308 (walk-up program fully COMPLETE per 1317);
  scout live-reverified 02+03 both 256/256, differential 563/563, full
  suite green, and correctly committed nothing. ROADMAP walk-up line
  corrected twice (`b1fd9734` — itself still stale-based — then
  `477e7570` program-COMPLETE).
- **The M-A number** (full table in the doc): winning 64/180 (35.6%)
  carry≥7, 10/180 (5.6%) carry≥14, 0/180 carry≥21; vanilla 16/60 /
  3/60 / 0/60, deepest anywhere = vanilla seed 24 at battle-depth 20
  (= standing in ladder battle 21); full policy 0/60 ever complete a
  round. ROADMAP M-A block updated with the result; the block's two
  pre-recorded outcomes bracket it, so the scope call goes to D2.
- **Next:** user resolves D2 (mechanically blocks the next supervisor
  session). #39 batch 9 landed same-day (`2f8edef2` move+reconnect,
  `dc89b145` test-pin fix): moved `playerHealthboxHpOverlayForHp`,
  scanner CANONICAL 76→75, function-kind eligible pool 1→0 (none left).
  Available filler regardless: the non-function/topological CANONICAL
  remainder (5 eligible non-function symbols + the ~70 hazard-blocked
  ones per the scanner's own summary), or decision (b).
- **Notes:** process lesson recorded on top of 1353's rule — verifying a
  queue item against the tree must grep for the artifact's NEWEST
  archive mention, not stop at the first hit near the cited entry (my
  scout brief and first ROADMAP "correction" both did the latter;
  the scout's live verification caught it). PAPERCUTS bumped:
  freshness false-positive (hit 7), side absolute-path edits (hit 3).
  Both lane branches (animation-main, rust-main) were EMPTY at orient
  and stayed empty. Commits local only — pushing is Kyle's step.

---

## 1354 — [main worker, 2026-08-19] **M-A step 1 DONE: real max-depth tracking (maxCarriedWinStreak/maxBattleDepth) added to the soak driver and surfaced in the CLI, old carriedWinStreak snapshot's lying doc comment corrected**

- **Supervisor verification + parallel side fold (same session):** step 1
  independently verified — test file rerun green, tracking hook read, live
  vanilla 0:3 run, and a seed-0 `winning` diagnostics probe reconciling the
  pasted `b2 / carry<=7 / depth<=7` line (round 1 complete at carry 0 →
  carry-7 round lost its FIRST battle, the true depth-7 point → post-loss
  re-chained carry-0 round lost at battle 2, which is where `b2` comes
  from; `opponentGenerationCount 2` confirms). Depth convention for step 3
  reports: during battle N of a carry-C round, `maxBattleDepth` = C+(N-1)
  (0-based ladder position). **Side-lane fold `79a0c6ad`:** scanner
  H3-let-write hazard (`e99c3511`) — both batch-8 hand-exclusions now
  auto-blocked, `playerHealthboxHpOverlayForHp` stays eligible (pool = 1);
  verified in-worktree (11/11 + live scanner run) and on the union
  (26/26 touched tests + smoke 444/444). A stray main-tree copy of the
  scanner edit (absolute-path papercut, hit #3) was byte-identical to the
  committed version and discarded. Freshness FAIL at orient =
  false-positive #7. PAPERCUTS bumped ×2, ISSUES #39 scanner-gap note
  trimmed to CLOSED.

- **State:** two green commits (`4570aa11` driver+test, `ecb2e5de` CLI).
  Full `npm test` **1,068 files / 10,124 passed / 223 skipped**; `npm run
  build`/`npm run typecheck` clean.
- **Did:** added `SeedResult.maxCarriedWinStreak` (max over the run of
  `orchestrator.config.factoryWinStreak`) and `maxBattleDepth` (max of
  `factoryWinStreak + battleIndex`, the internal depth formula at
  `factoryRoundBattleOrchestrator.ts:559`) to
  `tools/soak/randomRoundSoakDriver.ts`, tracked every tick in `observe()`
  (including the initial pre-loop call) and always populated — not gated
  behind `collectDiagnostics`. Left `RunDiagnostics.carriedWinStreak`'s
  value semantics untouched but fixed its false doc comment (it claimed
  to already be "the deepest ... value this run reached"; it is a
  snapshot that a later re-chain can reset to 0) and pointed it at the
  new max fields. `tools/soak/randomRoundSoak.ts`: appended the two new
  fields to each seed's existing OK/CRASH/HANG line, and added a "depth
  distribution" block to the summary (seeds reaching carry >= 7/14/21,
  labeled with the live-derived `challengeNum = floor(factoryWinStreak /
  7)` mapping from `factoryRentalGeneration.ts`/`factoryTrainerSchedule.ts`
  — not guessed — plus the deepest carry/battle-depth anywhere).
- **Result:** new Tier-1 test in `tests/randomRoundSoak.test.ts`
  (`describe("real max-depth tracking (Milestone M-A step 1)")`) pins the
  exact lying-field scenario: round 1 wins (carry → 7, scripted-strong
  664/678/527 trio), round 2 loses (arbitrary "weak" rentals, same recipe
  as `factoryRoundChaining.test.ts`'s "(c)" case), the run re-chains into
  round 3 within ~2,000 frames — `diagnostics().carriedWinStreak` reads
  **0** while `maxCarriedWinStreak`/`maxBattleDepth` correctly read **7**.
  RED-VERIFIED: `git stash`ed just the driver change (keeping the new
  test), reran — `maxCarriedWinStreak` was `undefined` and the assertion
  threw `TypeError: actual value must be number or bigint, received
  "undefined"`; restored via `git stash pop` before committing. Live spot
  checks pasted below.
- **Next:** M-A steps 2-3 (re-sweep `winning` 0:180 + `vanilla`/`full` for
  contrast using the now-real depth fields, report the distribution) —
  dispatch as the next worker step.
- **Notes:** no PAPERCUT. Spot-check output —
  `npm run soak -- --policy winning --seeds 0:3`:
  ```
  seed    0  OK     b2 t30  152641f  22.7s  roundLost  carry<=7 depth<=7
  seed    1  OK     b7 t26  151729f  22.2s  roundComplete  carry<=0 depth<=6
  seed    2  OK     b5 t14  161852f  24.3s  roundLost  carry<=0 depth<=4

  === soak summary: 3 seeds (policy winning) in 69.2s ===
  OK 3  CRASH 0  HANG 0

  === depth distribution ===
  carry >= 7  (challengeNum >= 1): 1/3
  carry >= 14 (challengeNum >= 2): 0/3
  carry >= 21 (challengeNum >= 3): 0/3
  deepest carry anywhere: 7
  deepest battle-depth anywhere: 7
  ```

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
