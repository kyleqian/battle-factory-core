# CAX31 next-session handoff — 2026-10-14

The user requested another commit, push and remote session. Continue the normal
main supervisor on CAX31's `master` at
`/srv/pokebench/pokeemerald-factory-core/workspace`, with Opus 5.5 supervising
Sonnet 5.5 workers, headless in tmux, capped at 10 hours. The preceding session
finished cleanly at `3d13717a9`; its commits, all worker refs, logs and supervisor
receipts have been imported to the Mac. The launch checkpoint and retained
worker refs are pushed to GitHub before launch. This session commits locally;
it does not push automatically or enable recurring timers. Keep the Mac's
supervisor stopped while this remote writer owns main.

## Continue from the finished run

All seven prior worker branches are merged. Do not repeat the enc160 / plr162
folds or redo Transform's landed live body. Read the top `PROGRESS.md` entry,
`ROADMAP.md`, `ANIMATION_INTEGRATION_PROGRESS.md` and the current issue backlog.

1. Implement trn176's action-transition hold (#167 (a')) in both scenes. Read
   `docs/trn176-action-transition.md`: P = d + 6 + u, source-derived receipts
   21 / 22 OFF and 12 / 12 ON. Preserve the named Baton Pass and anchor residuals;
   the formula alone does not eliminate every existing timing error. Re-pin
   affected frame expectations only with source/oracle attribution.
2. Implement fpc177's Focus Punch corrections (#139), using
   `docs/fpc177-focus-punch-edges.md` and its twelve twice-fresh ROM cards:
   voluntary-switch recall order, pre-pass/switch entry timing, and the measured
   leads (including the action-specific 5 + u rule).
3. Continue Substitute HP timing (-6 frames, #153), Transform inventory
   accounting and other move bodies over transformed battlers, and Scene ON
   forced player send-in messages (#146), then the remaining authorized Factory
   animation/presentation/engine finish-up gaps. Audio stays deferred; existing
   D3/D4 permissions and acceptance limits remain in force.

Delegate bounded changes under the existing ownership contract; independently
verify central claims, fold only green results, retain worker refs/evidence,
and update the ledgers. No new user-level decisions are open. Continue useful
in-scope work through the session; leave a clean handoff before the cap.

## Baseline and host budget

Production is unchanged since `3937ecad0`; later commits are tests/tools/docs.
The preceding session passed typecheck, 448 smoke checks, production build and
vanilla soak 20 / 20. Its full suite had 13,908 passes and four msg175 frame-pin
failures, corrected with attribution in `aec6435e8`; the affected file then
passed 11 / 11 and typecheck passed. The entire suite was not rerun after that
test-only change. Earlier union `5e78e4030` passed 13,895 tests / zero failures
and all five gameplay gates. Reuse unchanged receipts under
`ANIMATION_VERIFICATION.md`; new production changes require their scoped and
union gates. Do not report a fresh whole-suite pass without running it.

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full tests take ~47 min; vanilla 0:20 soak ~45 min.
Read the 2026-10-14 CAX31 entry in `PAPERCUTS.md` before scheduling gates.
Serialize full tests/typecheck/build; run long gates in a retained background
job with a PID, log, exit status and summary, rather than killing/retrying at a
tool timeout. Do not leave orphaned Vitest forks. Keep worker/census concurrency
bounded; any soak seed-range fan-out must fit measured free memory, preserve
identical per-seed inputs and collect every exit/result. Avoid Mac defaults and
unbounded ten-shard launches. Reserve gate time early instead of filling the
last hour with new production work.

Claude Code 2.1.280 is pinned and fresh Claude Max auth was verified on both
exact models. Oracle services stay localhost-only, ON 8012 / OFF 8014. Use the
host path helpers and `/srv/pokebench/vendor/mgba-venv/bin/python` for direct
probes; do not reuse hard-coded Mac paths. Preserve the pinned ROM/ELF/map.
No copied provider credentials, additional infrastructure or automatic push.

Prior raw evidence remains on the VM under `.integration/validation/`, with
committed receipts in the repo. The Mac backup is
`.integration/validation/cax31-session-20261014/` (results bundle plus logs and
supervisor evidence). Import the next session's results before resuming a Mac
writer; do not delete remote worktrees that hold the only copy of ignored data.
