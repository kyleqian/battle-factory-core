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

## 819 — [bounded worker, 2026-08-01] rank-2 predecessor audit checkpoint

- **State:** evidence checkpoint `14e4fe59`; no production change. Tier-1
  predecessor pin is green, standalone
  TypeScript is green, full `npm test` is green (**571 files, 5,729 passed +
  1 skipped**), and production build is green.
- **Did:** mapped `turn13Resolved` and its adjacent KO-dismiss lifecycle. The
  mirror cannot use the current FLY owner: the predecessor command needs
  DRAGON_BREATH **18/20**, while that already-completed following charge owns
  **17/20**. Typed redraw readiness and persisted-slot facts are also absent.
  `opponentFaintDismissElapsed` is live in cursor freeze and switch-in.
- **Next:** first publish a typed turn-13 completed-resolution/next-command
  handoff owning PP, persisted slot, and redraw/input readiness; only then
  retire `turn13Resolved`. Keep the variable dismiss edge until its lifecycle
  owns it.
- **Notes:** Tier-1 pins the 18-versus-17 boundary; full audit is in
  `docs/rank2-turn13resolved-predecessor-audit.md`. No mechanics/RNG/AI/
  outcome, runtime presentation, animation, trace/capture list, ratchet,
  barrier, recording import, or prohibited selector changed.

## 818 — [bounded worker, 2026-08-01] rank-3 dead KO-dismiss mirror retired

- **State:** implementation `88fd05f6`; focused owner/menu/scene/ratchet
  suites are **452/452**, standalone TypeScript is green, full `npm test` is
  green (**571 files, 5,728 passed + 1 skipped**) and production build is
  green.
- **Did:** mapped both rank-3 mirrors. `turn5KoDismissElapsed` had one writer,
  only its own one-shot guard as a reader, and zero render/continuation/PP/
  request consumers, so its dead field and producer branch are deleted. The
  immutable adapter lifecycle already owns KO→PIDGEOTTO→Sitrus→next-command
  content; `turn5Resolved` stays because it still has live turn-6 dispatch,
  PP, and next-reopen consumers. Clean-`7d65832d` app replay is byte-identical
  for all rank-3 + five insurance pins (**3,021 captures**) and three +30
  delayed-dismiss variants (**484**); census fell **2,496→2,487 refs**,
  **33,124→33,103 LOC**.
- **Next:** retire `turn5Resolved` only after a typed terminal/next-command
  boundary supplies all three live consumers; otherwise take rank 2's
  analogous `turn13Resolved` predecessor as a separately evidenced slice.
- **Notes:** no mechanics/RNG/AI/outcome, animation, trace/capture list,
  ratchet/barrier, recording import, or prohibited selector changed.

## 817 — [bounded worker, 2026-08-01] rank-8 exact owner mirrors retired

- **State:** implementation `d410cfe5`; focused exact/owner/terminal suites
  are **443/443**, generic seven-battle/round regressions are **69/69**, the
  executable ratchet is **6/6**, full `npm test` is green (**571 files,
  5,728 passed + 1 skipped**), and production build + standalone TypeScript
  build are green.
- **Did:** staged the documented MAGBY/MURKROW Scene-OFF full turn through the
  production reducer at its exact eight-call RNG cursor. Its immutable
  resolution now owns damage, PP, burn text/status-icon receipt, residual,
  and next-command facts; the compatibility owner carries its relative redraw
  edge into the existing terminal owner. Deleted `turn16Resolved` and the
  submenu redraw mirror. Clean-`60acda9c` app replay is byte-identical for all
  requested rungs plus delayed/rung-6b insurance (**2,163 captures**); census
  fell **2,506→2,496 refs**, **33,125→33,124 LOC**.
- **Next:** supervisor selects the next earlier #39 mirror/dispatcher slice;
  do not extend the canonical Battle-2 march.
- **Notes:** supervisor's starting union was green at **570 files / 5,726
  passed + 1 skipped** with build green; merged recharge/Bide hardening and
  OFF opponent-recharge evidence remain intact. No mechanics/RNG/AI/outcome,
  animation, trace/capture list, ratchet/barrier, recording import, or
  prohibited selector changed.
