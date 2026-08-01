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

## 827 — [supervisor wind-down, 2026-08-01] 10-step session: three predecessor retirements, slice-0 OFF evidence complete, #61/#64 resolved-or-blocked honestly

- **State:** master `5825886a` (second animation fold, 18 commits, included).
  Final union full `npm test` **5,987 passed + 1 skipped** and build green at
  13:45. DEFERRED empty; no worker failures, no exit-42, all worktrees clean
  (only the permanent animation-main + its live nested worker remain).
- **Did (main lane, Terra/max):** retired `turn13Resolved` (rank-2 remainder,
  entry 822), `turn5Resolved` (824), `turn6Resolved` (825), `turn7Resolved`
  (826) — each via the typed completed-turn/next-command handoff recipe with
  clean-parent differential replays byte-identical (1,742 / 1,461 / 1,413
  captures) and supervisor-rerun spot compares exact. #61 stopped honestly at
  a green evidence checkpoint (823): all four openings share the source
  `9/11/6` BG-copy batches; turn 3 alone polls before the final VBlank drain,
  so the fix needs a source-backed controller/VBlank-phase event, not a
  constant. **(side lane, Sol/high):** send-out selector source-pins test
  (the rung-1 extraction the animation ledger requested already existed —
  `6d568f0d`, folded that morning); the complete owner-chain audit
  (`docs/turn-resolved-owner-chain-audit.md`); slice-0 OFF ground truth for
  turns 5-6, 7-8, and 13 (three docs + probes; delayed-dismiss answer: OFF
  shifts +30 exactly, accepted-edge semantics confirmed); #64 bisected to
  rank-5 slice-3 `59a3fa7d`, verdict (b) accepted-behavior/stale-record —
  entry deleted, `docs/issue64-turn13-menu-bisect.md` is the record.
  **(supervisor):** `turn14-fly-miss` route-pinned back to 213/213 and #63
  filed (generated-route Sitrus-string resolver crash); vitest per-worker
  cap landed (user request): `POKEBENCH_VITEST_MAX_WORKERS` in
  `vite.config.ts`, exported (default 4) by `run-subagent.sh`, mirrored to
  `_template` (harness `9cadad7`); PAPERCUTS entry pending cross-session
  verification. Oracle freshness FAILs remain the known client-only
  false-positive (harness HEAD `9cadad7` is template/tooling-only).
- **Next:** continue the audit's slice order — `turn8Resolved` (slot-1 PP
  trap), then turns 9-12 one field per worker at their enumerated
  differential sets; then turns 1-4 need typed HP/bounce presentation epochs
  first. #63 is a small standalone fix. #61 needs a controller/VBlank-phase
  design decision before implementation. Turns 5-8 OFF re-timing remains an
  un-adopted policy question — ground truth is now banked for a future
  proposal; nothing this session presupposed it.
- **Notes:** worker scorecard 10/10 briefs landed or blocked honestly (0
  failures); two animation folds (30 + 18 commits) both union-green.

## 826 — [bounded MAIN worker, 2026-08-01] turn-7 predecessor handoff retired

- **State:** proof `74f4a0d5`, implementation `8a73efc3`; source/test census
  has no `turn7Resolved` reference.
- **Did:** published the immutable completed-turn-7/next-command handoff with
  canonical PP **[4,20,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-8 dispatch, slot-0 PP reconstruction, and the turn-9 reopen
  guard onto it without composing FEATHER_DANCE/ROCK_SLIDE stages.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch `turn8Resolved` or another field into this completed retirement.
- **Notes:** clean-`74f4a0d5` differential app replay is byte-identical across
  all requested turn-7 primary/boundary, turn-8 reader, and turn-6 upstream
  windows (**1,413/1,413 raw RGBA captures**). Full `npm test`: **575 files,
  5,920 passed + 1 skipped**; `npm run build` green. No trace/capture-list,
  timing/presentation, ratchet/barrier, recording-import, or prohibited
  selector change.
