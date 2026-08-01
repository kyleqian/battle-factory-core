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

## 820 — [solo session, 2026-08-01] papercut burn-down: eight dev-loop fixes landed (run + harness)

- **State:** tooling-only session, no engine/runtime behavior changed. Full
  `npm test` is green (**572 files, 5,736 passed + 1 skipped**, +7 new
  tooling tests) and production build is green.
- **Did:** (1) missing-`appRoute` compares now print a pointed notice and
  `tests/compareTraceAppRoute.test.ts` exact-set-pins the 66 legacy traces
  (shrink-only) with valid-value checking; (2) default compare output is a
  fresh `tools/compare/out/run-*` dir per invocation with an `out/latest`
  symlink to the newest run (parallel compares can no longer clobber each
  other) plus pruning beyond 12; (3) new `npm run inspect-frame` —
  `tools/compare/inspect-frame.ts` prints diff count/bbox, 8-connected
  per-cluster bboxes (`clusterPixelIndices` in `diffBounds.ts`), RGB
  samples, and writes diff/crop PNGs; (4) 13 portable comparators now print
  per-frame diff bboxes capped at 32 lines (3 others already did); (5) the
  switchin-entryhooks and magic-coat probes dump the full labeled
  `statStages[]` (old `attackStages` read index 0 = HP; magic-coat's 0x3A
  was the last nickname byte, not a stage at all); (6) `run-subagent.sh`
  postflight names cap/deadline (124) and signal (>=128) exits instead of
  mislabeling them as auth failures; (7) `run-subagent.sh --base REF` pins
  a side/animation worktree to a named green commit; (8) `bin/oracle
  run|lab --quiet` prints only the manifest path, and the run's client
  gained the harness's `preCheckpointCaptures` file extraction. Harness
  side: `bin/oracle` gained the same `--quiet`, and `_template`'s launcher
  + compare runner carry the same three fixes.
- **Next:** unchanged from entry 819 — publish the typed turn-13
  completed-resolution/next-command handoff, then retire `turn13Resolved`.
- **Notes:** PAPERCUTS.md pruned by 8 fixed entries per its delete-on-fix
  policy. Verification: `growthPortable` reran **63/63 exact** post-codemod;
  `anchor.json` compare passed 1/1 through a fresh `run-*` dir with the
  `latest` symlink migrated from the legacy directory; the launcher's
  `--base` guard and help text exercised directly.

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

