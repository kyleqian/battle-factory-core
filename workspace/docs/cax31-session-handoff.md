# CAX31 recovery-session handoff — 2026-10-15

The user requested a launcher fix and a fresh 10-hour run. Continue on CAX31's
`master` at `/srv/pokebench/pokeemerald-factory-core/workspace`, Opus 5.5
supervisor and Sonnet 5.5 workers, headless in tmux. Keep the Mac supervisor
stopped. Commit locally; no automatic pushes or recurring timers.

The preceding supervisor exited after about 14 minutes while relying on
background notifications. Its workers finished and committed the two branches
below, but neither was verified/folded by the supervisor. Their refs, logs and
briefs are backed up on the Mac under
`.integration/validation/cax31-session-20261015/`. Preserve remote raw evidence.

## First: verify and fold the saved work

1. `worker/integration-20261015-041827` at `4a8a25431`: trn178, Scene OFF
   action-transition hold (#167 (a')). Read its
   `docs/trn178-action-transition-live.md`, independently reproduce the central
   timing claim and review each attributed re-pin. Worker final gates:
   13,918 tests / zero failed, build, typecheck and 448 smoke checks. The
   implementation intentionally leaves Scene ON unchanged. Reuse matching
   full-suite/build receipts only under `ANIMATION_VERIFICATION.md`; do not
   claim supervisor acceptance before independently checking the change.
2. `worker/side-20261015-041923` at `84b46c795`: snd179, evidence only for
   Scene ON forced player send-in timing (#146). Read
   `docs/snd179-scene-on-forced-player-send-in.md`. The predictor matches
   338 / 339 sweep rows; preserve the named LAIRON/nature issue and verify
   message-anchor compatibility before wiring production. The worker ran
   smoke, typecheck and build; it changed no production modules and ran no
   full suite. Independently verify representative source/ROM claims and fold
   the evidence without inventing implementation credit.

Then implement fpc177's Focus Punch corrections (#139), using
`docs/fpc177-focus-punch-edges.md` and its twelve twice-fresh ROM cards.
Continue Scene ON action-transition timing, Substitute HP timing (-6 frames,
#153), Transform inventory/other live bodies over transformed battlers and
Scene ON forced player send-in messages. Read the current roadmap, issue
backlog and integration ledger; all previous Factory finish-up scope and D3/D4
permissions remain valid. Audio stays deferred.

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
