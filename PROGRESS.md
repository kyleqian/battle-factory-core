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


---
## 607 — [USER-DIRECTED TOOLING 2026-07-28 ~09:02] Hybrid supervisor ready; ordinary Codex effort is high-only

- **State:** `master` now includes `codex/hybrid-cloud-supervisor` through
  `bf0a08a` and is green at **366 files / 4239 tests**; launcher profiles **15/15**,
  production build, shell syntax, config smoke tests, and `git diff --check`
  pass.
- **Did:** added the Fable/Remote-Control supervisor with Terra or Sol Codex
  workers, then removed Sol/medium from every ordinary Codex workflow.
  Direct workers, all-Codex supervisors, and hybrid supervisors now default
  to high and mechanically reject any lower worker/supervisor effort. Added
  `-H` as the short form of `--hybrid` and fast-forwarded the feature into
  `master`.
- **Next:** launch the mixed workflow with `./run-supervisor.sh -H` (or
  `--hybrid`); otherwise resume finite Stage 8 selection from entry 605.
- **Notes:** max mode deliberately remains Sol/ultra with Sol/xhigh by
  default and permits high; its workers now reject sub-high overrides too.
  Entry 606 already retired the worktree papercuts encountered during this
  feature. No game logic, oracle lifecycle, issue, roadmap, census,
  animation, or unsupported-barrier change.

---
## 606 — [TOOLING FOLD 2026-07-28 ~08:48] Low-risk papercuts merged and union verified

- **State:** merged `codex/papercuts-guardrails` as `4e8a788`; the union is
  green at **366 files / 4231 tests**, production build, Python tooling
  checks **8/8**, both oracle infos, and `git diff --check`.
- **Did:** retired four recorded papercuts with worktree-safe harness
  resolution for freshness and terminal extraction, explicit commit-free
  `--read-only` / `--audit` worker postflight, terminal RAM-probe bitfield
  extraction, and a default battle-lab output ignore. The merge had zero
  changed-path overlap with the 195-file supervisor advance.
- **Next:** before further oracle-backed staging, the launcher/supervisor must
  refresh Scene-OFF after harness `0d4ad46`; then resume the accepted Trick
  target from entry 605.
- **Notes:** both endpoints answer bootstrap v5. Scene-ON freshness passes;
  Scene-OFF started 2026-07-27 22:36, before the harness's 2026-07-28 08:42
  commit, so freshness correctly fails. No oracle lifecycle action, game
  logic, issue, roadmap, census, animation, or unsupported-barrier change.

---
## 605 — [SUPERVISOR VERIFY 2026-07-28 ~06:24] Encore accepted after shared-seam repair

- **State:** independently reviewed the implementation and repair diffs and
  verified focused Encore/full-turn/end-turn/switch/ratchet coverage
  **112/112**, production build, both oracle infos, census regeneration,
  all **42/42** validation checks, and `git diff --check`. The worker's full
  suite is green at **366 files / 4229 tests**. Census is exactly **159/214
  effects, 288/355 moves, 236/276 Factory-L50 distinct, 2764/2957 weighted**.
- **Did:** accepted global Encore `0xa4` and the complete shared state,
  automatic choice, move-limitation, action-execution, end-turn, and switch
  seams. Supervisor review found an overwritten-slot path lacking a direct
  proof; the repair now matches `battle_util.c`: execute the live stored-slot
  move, clear Encore, and never misclassify it as Struggle. Exact duration
  RNG, both-side forced actions, PP/script order, repeat failure, expiry,
  switch cleanup, and multi-turn precedence are pinned.
- **Next:** implement source-complete `B_SCR_OP_TRYSWAPITEMS` through the
  shared item/change-state paths using the accepted Trick source/OFF evidence.
  Expected census: **160/214, 289/355, 237/276, 2769/2957**.
- **Notes:** handler inventory is **167**. No unsupported barrier, recording
  import, private RNG/controller/event seam, presentation/tick/round branch,
  issue removal, or DEFERRED item. Post-orient animation commits remain for
  the next supervisor's required orient fold; do not merge them mid-session.
