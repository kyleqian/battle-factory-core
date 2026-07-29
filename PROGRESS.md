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

## 653 — [BOUNDED MAIN WORKER 2026-07-28 ~18:40] Switch-in entry hooks registered

- **State:** implementation commit `2ec8ef8a` (+ final Forecast guard/docs
  commit); tree green at **439 files /
  4784 tests**, production build, and `git diff --check`. Handler inventory
  pin updated **209→210** for the newly registered target opcode. Census
  byte-idempotent at **214/214 effects, 355/355 moves, 276/276 distinct,
  2957/2957 weighted**, all **72** validations.
- **Did:** consumed `docs/switchin-entryhooks-off-evidence.md`; ported the
  exact Truant counter write and grouped ON_SWITCHIN dispatch for permanent
  weather, Intimidate, Trace, Forecast, Cloud Nine, and Air Lock. Weather
  callbacks/no-ops, Trace's live opposing ability copy/message buffers, and
  Intimidate's STATUS3 marker, shared statbuffchange path, Substitute and
  Clear Body prevention branches are Tier-1 pinned with zero RNG draws.
- **Next:** supervisor verify `2ec8ef8a` and this ledger commit. A follow-up
  should pin Hyper Cutter/White Smoke alongside Clear Body and add an
  orchestration-level two-battler weather→Intimidate ordering test; on-switch
  item breadth remains separate.
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

---

## 651 — [SUPERVISOR CHECKPOINT 2026-07-28 ~18:15] Census CLOSED 214/214 (100% all four metrics); Fake Tears seam 322/322 consumed cross-program; audit 4/4 fixed; ISSUES #41 deleted

- **State:** union green at **439 files / 4770 tests**, production build,
  `git diff --check`, census byte-idempotent at **214/214 effects, 355/355
  moves, 276/276 distinct, 2957/2957 weighted (100%)** with all **72**
  validations. Production recording-import allowlist **0**; **60** named
  barriers remain across 22 kernel modules (the enumerated ability/item/
  doubles remainder). Six animation folds this session; final fold verified.
- **Did (19 workers over 2 lanes, 0 failures, 0 regressions):** frontier
  tail closed — rows 4 (Charge+Sports), 5a-c (Lock On/Imprison/Snatch incl.
  turn-order steal arbitration), 6a-b (Assist/Beat Up), 7 (Transform), 8
  (Metronome gate-closure) — each at its exact predicted census delta, each
  consuming a side-lane falsification/OFF-receipt pack (3 scout packs banked;
  5 dossier corrections). Stat-drop seam handoff: Fake Tears **322/322 twice
  fresh both orientations** (middle phases via typed controller receipts;
  residual closed by fight-menu handoff + text-printer display lag, NOT the
  hypothesized Delcatty idle); the live animation supervisor consumed it and
  promoted Fake Tears exact same-session. Read-only interaction audit over
  the new effects: **4 CONFIRMED defects, all 4 fixed + verified** (called
  charging/rampage/Bide continuation; recharge lock restore; rain/sun/Solar
  Beam damage block ported into damageCalc; Focus Band source-complete,
  barriers 16→13). ISSUES #41 closed and deleted (allowlist 4→0; 19 swap
  traces + rockslide/faint traces exact). OFF oracle restarted at orient
  (freshness FAIL); both profiles fresh since.
- **Next (recommended order):** (1) ability/item census generator — turn the
  60 barriers + source hook tables into a ranked worklist like the move
  census; (2) register ENDTURN_ABILITIES/ITEMS1/2 bodies (ground truth +
  receipts already banked in docs/endturn-abilities-items-ground-truth.md);
  (3) CheckViability handler bodies (ground truth banked); (4) switch-in
  entry-hook breadth (6 switchin barriers); (5) ISSUES #39 window-by-window
  retirement (pattern proven again by Fake Tears).
- **Notes:** DEFERRED.md empty — no open questions. No usage-limit events.
  The animation supervisor session (started 15:06, deadline ~21:06) may
  commit after this wind-down; an unfolded animation-main at next orient is
  expected and fine. PAPERCUTS: bumped the generated-JSON broad-search entry
  (2 new hits).
