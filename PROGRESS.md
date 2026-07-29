# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 654 — [BOUNDED MAIN WORKER 2026-07-28 ~19:01] Assigned CheckViability phase-1 step already complete — verified, not redone

- **State:** no implementation delta: the assigned phase-1 handler sequence
  was already committed in entries 463/466/467/468, and later work completed
  all **22/22** reachable `AI_CV_*` handlers. Tree green at **440 files /
  4791 tests**, production build, OFF oracle info, `git diff --check`, and
  the full banked CheckViability verifier **ALL PASS**.
- **Did:** read the mandatory ground-truth doc, including §§3/4's corrected
  RNG-site counts and CBM-before-CV reachability rule; inspected the production
  dispatch, per-handler trace fields, Tier-1 coverage, and historical commits
  (`7fec289e`, `07a5f6a6`, `9e951cc6`, `02784ecf`). Regenerated the census
  byte-identically at **214/214 effects, 355/355 moves, 276/276 distinct,
  2957/2957 weighted**, all **72** validations. The OFF verifier reproduced
  the banked **11/11/13** instrument-attributed scenarios and every later
  doc-cited handler ledger.
- **Next:** supervisor should correct or retire the stale brief premise that
  `AI_CheckViability` is dispatch-only. The named
  `factory-ai-check-viability` barrier remains tested for the unported,
  currently unreachable remainder of the 90-handler source table; do not
  reopen the completed 22-handler program without a newly reachable effect.
- **Notes:** unsupported-branch pin count unchanged: these AI dispatch barriers
  are plain tagged returns and are not part of `PINNED_BARRIER_COUNTS`
  (historical entry 463 records this explicitly). No source, test, census,
  issue, roadmap, presentation, animation, round, tick, or pixel change.

---

## 653 — [BOUNDED MAIN WORKER 2026-07-28 ~18:51] Switch-in entry hooks registered and follow-up pins closed

- **State:** implementation commits `2ec8ef8a` / `38da44ab` (+ final Forecast
  guard/docs commit); tree green at **440 files / 4791 tests**, production
  build, OFF oracle info, and `git diff --check`. Handler inventory
  pin updated **209→210** for the newly registered target opcode. Census
  byte-idempotent at **214/214 effects, 355/355 moves, 276/276 distinct,
  2957/2957 weighted**, all **72** validations.
- **Did:** consumed `docs/switchin-entryhooks-off-evidence.md`; ported the
  exact Truant counter write and grouped ON_SWITCHIN dispatch for permanent
  weather, Intimidate, Trace, Forecast, Cloud Nine, and Air Lock. Weather
  callbacks/no-ops, Trace's live opposing ability copy/message buffers, and
  Intimidate's STATUS3 marker, shared statbuffchange path, Substitute and
  all three source prevention abilities are Tier-1 pinned with exact messages
  and zero RNG draws. Battle-start ordering now pins faster Drizzle's weather
  message before slower Intimidate's stat drop. The new full-script pins
  exposed and fixed one real defect: removed a duplicate synthetic prevention
  event so the source script is the sole message owner.
- **Next:** supervisor verify `38da44ab` and this ledger commit; on-switch item
  breadth remains separate.
- **Notes:** switch-in unsupported-branch ratchet **6→4**; the retained
  barriers are unchanged: switchhandleorder cases 0/1, non-singles wrapped
  cross-clear, Arena init, and other `various` ids. The named Castform form
  barrier remains. No census, issue, roadmap, presentation, animation, round,
  tick, or pixel change.

---

## 652 — [BOUNDED MAIN WORKER 2026-07-28 ~18:27] ENDTURN abilities/items acceptance closed

- **State:** implementation commits `733042df` / `f424fd3b`; tree green at
  **439 files / 4781 tests**, production build, OFF oracle info, banked
  ability/item verifier **17/17**, and `git diff --check`. Census remains
  byte-idempotent at **214/214 effects, 355/355 moves, 276/276 distinct,
  2957/2957 weighted**, all **72** validations.
- **Did:** reconciled the already-landed source-complete
  `ENDTURN_ABILITIES` / `ENDTURN_ITEMS1` / `ENDTURN_ITEMS2` bodies and their
  three OFF item receipts against the mandatory ground-truth doc. Added the
  missing Cloud Nine suppression pin for Rain Dish. Replaced the shared
  zero-carrier item bucket with nine source-named (b) barriers and proved
  each has zero carriers in the generated 882-entry Factory L50 catalog.
- **Next:** supervisor verify these two commits and the ledger commit. Then
  continue entry 651's ranked ability/item census or CheckViability breadth;
  switch-in hooks and presentation remain separate.
- **Notes:** named barriers are `CONFUSE_SPICY`, `CONFUSE_DRY`,
  `CONFUSE_SWEET`, `CONFUSE_BITTER`, `CONFUSE_SOUR`, `DEFENSE_UP`,
  `SP_DEFENSE_UP`, `CRITICAL_UP`, `RANDOM_STAT_UP`. Unsupported-branch
  ratchet pins unchanged; no census, handler-set, issue, roadmap, round,
  tick, pixel, animation, or reachable Factory behavior change.
