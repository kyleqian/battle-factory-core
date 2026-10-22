# CAX31 next-session handoff — 2026-10-22

The user authorized another 10-hour run. Continue on CAX31's `master` at
`/srv/pokebench/pokeemerald-factory-core/workspace`, Opus 5.5 supervisor and
Sonnet 5.5 workers, headless in tmux. Keep the Mac supervisor stopped. Commit
locally; do not push automatically or enable recurring timers.

The last session finished cleanly at `d1a9f66a8`, with pfr192 and ont193 folded.
Do not repeat those completed fixes. Master is green; the unmerged Leech Seed /
message work below is NOT accepted. All master/worker refs, logs, briefs and
supervisor evidence were imported to the Mac under
`.integration/validation/cax31-session-20261022/` and pushed before launch.
Preserve the raw evidence still on the VM.

## First: finish the saved implementation, then validate and fold

Start from `worker/integration-20261017-041629` at `d057453ab` (lsd196), which
already includes lsd194 at `66e89d36e` from
`worker/integration-20261017-013328`. These worktrees were removed; recreate a
bounded worker with `tools/run-subagent.sh --lane integration --base
worker/integration-20261017-041629`, or an equivalent isolated verification
checkout with the usual reference/node/WASM prerequisites. Do not start again
from master and lose the saved fixes or re-pins.

Read `docs/lsd195-lsd194-triage.md` on master and the lsd194/lsd196 docs on the
retained branch. The latest branch has the print-floor drop, Leech Seed drain
holds and Bulk Up's second-stat row rule. Eleven touched test files passed
alone; this is NOT a full-suite/typecheck/build receipt. A prior typecheck
OOMed. No new user decision is needed to finish this presentation-only work.

1. Repair Rest's pause using the real print lengths and the ROM row; remove
   off148's masking `proxyFrames` 24. Keep Bulk Up's measured residual at 0;
   do not accept the old triage suggestion to pin a known -3 regression.
   Independently verify source/ROM claims and attribute every changed frame pin.
2. Separate repair from final validation so a worker cap cannot strand a
   48-minute suite again. A repair checkpoint with affected tests is staged
   work, not acceptance. Then run serialized typecheck, scene ON/OFF census
   0..999 (especially message -> stat -> message chains), affected/differential
   gates, the complete suite and build on the exact repaired code. Retain each
   log/exit status and the tested commit/tree. Give the validation step enough
   wall-clock budget, or have the supervisor own it directly. No overlapping
   heavy jobs, no suite hand-chunking, and no uncommitted repair folded into main.
3. Only after green final-code gates and independent supervisor acceptance,
   fold into master and update the issues/integration/progress ledgers. Reuse
   same-code receipts under `ANIMATION_VERIFICATION.md`; new union code,
   conflicts or missing receipts require fresh gates. A passing re-pin must
   never hide a regression against the ROM.

## Continue the animation finish-up

- Draw Scene ON `LEECH_SEED_DRAIN`: lsd194 currently holds 208 rows of the right
  duration without the animation body. Timing alone is not animation acceptance;
  prove the actual production renderer with dense source/ROM windows.
- Correct Double Team's ending (-5) and measure the 24 moves with zero-frame
  tails where required; reuse the current source/evidence rather than repeating
  completed surveys.
- Continue non-MAGBY forced send-in visuals, player back send-out/intro visuals,
  transformed-battler effects, Castform/Substitute/species/history variants and
  other current Factory finish-up issues. Keep catalogue membership unchanged;
  fixing already-authorized transformed-battler support needs no new permission.

Read the current roadmap, backlog and integration ledger. The full
`docs/factory-finish-scope.md` authorization and D3/D4 policies remain active;
audio stays deferred. Prefer verified implementation progress. Keep one worker
at a time and reserve final union-gate time before launching another change.

## Headless execution discipline

`tools/run-claude-supervisor.py` owns the one original campaign deadline.
Never use Monitor, ScheduleWakeup or end your turn waiting for notifications.
Retain worker PIDs/logs and poll with bounded foreground calls. If a turn
accidentally ends, the controller waits for worker completion and resumes the
same conversation; it does not reset the clock or duplicate the worker.

State lives next to the raw log in `.controller.json`. Before a genuine final
exit, commit a clean handoff and write the JSON file named by
`POKEBENCH_SUPERVISOR_STOP_FILE`, with `session_id` from
`POKEBENCH_SUPERVISOR_SESSION_ID`, `status=complete|blocked|wind_down` and a
nonempty `reason`. This is not a waiting mechanism. A stop cannot leave active
workers or a dirty checkout; wind-down is accepted only in the last 20 minutes.
Usage limits/provider failures stop the controller without automatic retries.
Use one worker at a time on this 16 GiB machine. Budget validation before
launching more production work; do not dispatch a worker whose cap exceeds
remaining campaign time. Apply the normal scoped verification/fold policy and
leave a truthful committed handoff before the cap.

## Baseline and host budget

Current master production src tree `9e7ac718f` equals ont193 `6b6d1d128`;
later commits through `d1a9f66a8` are documentation. Supervisor final gates:
1,684 files / 13,955 tests passed, zero failed; build passed; vanilla soak
20 / 20; varied-RNG winning carries 0 / 14 / 28 and winning-swap carry 0
100 / 100 each. The long 0:60 soak profiles were not run in this presentation-
only session. Evidence is in `.integration/validation/sv-20261016b/`.
Reuse the unchanged master baseline under `ANIMATION_VERIFICATION.md`; this
launch changes documentation only. The unmerged lsd branch has NO matching
final-code full-gate receipt yet. Do not confuse the two baselines.

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full suite ~48 minutes. Serialize typecheck, full
suite, build and census work; use retained PID/log/status files for long jobs
and keep polling in bounded calls. Do not kill/retry a job just because its
shell tool yielded. Read CAX31 `PAPERCUTS.md`; bound any soak fan-out to free
memory and collect every per-seed result. Use host path helpers and
`/srv/pokebench/vendor/mgba-venv/bin/python`, not Mac-specific paths.

Claude Code 2.1.280 and the Opus/Sonnet model defaults remain pinned. The
controller owns one deadline and resumes the same supervisor conversation.
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. Import the results before resuming a Mac writer.
