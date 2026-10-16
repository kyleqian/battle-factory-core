# CAX31 next-session handoff — 2026-10-16

The user requested another 10-hour run after reviewing the remaining animation
work. Run the normal main supervisor on CAX31's `master` at
`/srv/pokebench/pokeemerald-factory-core/workspace`: Opus 5.5 supervisor,
Sonnet 5.5 workers, headless in tmux. Keep the Mac supervisor stopped. Commit
locally; do not push automatically or enable recurring timers.

The prior recovery run finished cleanly at `d7a93289a`; its controller accepted
wind-down in the final 20 minutes. All worker branches were folded. Results,
worker refs, logs, briefs and supervisor evidence are imported to the Mac at
`.integration/validation/cax31-session-20261016/` and backed up to GitHub
before this launch. Do not redo trn178 / trn181 / fpc180 / snd182 / sub183.

## Work queue

Read the current `PROGRESS.md`, `ROADMAP.md`, `ISSUES.md` and integration
ledger. Continue the full user-authorized Factory finish-up scope under
`docs/factory-finish-scope.md`; preserve existing D3/D4 decisions. Audio stays
deferred. This is an implementation session: use the banked source/ROM work
and prioritize verified production fixes over repeating completed surveys.

1. **Player faint-replacement send-in (#146):** implement the plan at the end
   of `docs/pfr185-player-faint-replacement-send-in.md`. Use species,
   personality and scene for the clock rather than partySelect's fixed SEND
   OUT timing. The measured target is prompt B + D + 17, not the existing
   311 / 325 pins. Prove the actual generated faint/replacement route and
   dense production render, including where turn-end 8 and handoff 6 belong;
   the prior evidence did not yet compare those pixels. Attribute every re-pin.
2. **Prepared timing corrections:** `docs/btl188-scene-on-anchor-start.md`
   (post-waitanimation script rows), `docs/msg189-seeded-print-hold.md`
   (24-frame floor on short long-wait prints), and
   `docs/fpo187-focus-punch-on-prepass-row.md` (127 only after Fight confirm,
   otherwise 125). Batch related corrections in the shared presentation seam
   when their acceptance is clear, retaining per-case controls and attribution.
3. **Leech Seed drain:** `docs/lsd186-leech-seed-drain-timing.md`. The drain
   animation is still missing in Scene ON. Derive the lead, animation and HP
   timing from source before landing: the six-case fitted timing recipe alone
   is insufficient. Prove the drawn general animation as well as message rows.
4. **Remaining animation variants/visuals:** other live move bodies over a
   transformed battler, player back send-out and intro visuals, Castform and
   Substitute combinations, species/history/layer gaps and remaining scoped
   #146 / #168 / #143 / #145 / #152 items. Prioritize executable shared fixes.

Support for effects over transformed battlers is already in #153's approved
scope. Keep required-catalogue membership unchanged; accurate reporting of an
existing live Transform adapter does not require making a new body mandatory.
Do not block authorized implementation on that optional accounting distinction.

Independently verify every central claim and fold only green changes. Keep
required tests/censuses/differentials and truthful live inventory. One bounded
worker at a time; reserve final validation time early. When a new unknown
needs research, retain a bounded source/ROM proof and a concrete next action.

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

Final production src tree is `0eee3727b` (= union `a4b477dc1`; later commits
through `d7a93289a` are docs/tools). Supervisor final gates: 1,682 files /
13,940 tests passed, zero failed; production build passed; vanilla soak 0:20
20 / 20 OK. Logs are in `.integration/validation/sv-20261016-final/`.
Reuse this unchanged baseline under `ANIMATION_VERIFICATION.md`; documentation
alone does not invalidate it. New production changes need affected semantic /
dense render controls, worker full gates and supervisor independent acceptance;
run the final union gates required by that policy. Preserve presentation-only
kernel/RNG equality; gameplay corrections retain their separate stronger gates.

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full suite ~48 minutes; serialize heavy tests,
typecheck/build and census work. Read the CAX31 entries in `PAPERCUTS.md`.
Track long-running jobs by PID, log, exit status and summary, never by a future
notification. Bound any soak fan-out to measured memory and collect every
per-seed result. Avoid unbounded ten-shard launches and Mac path assumptions.
Use `/srv/pokebench/vendor/mgba-venv/bin/python` for direct probes.

Claude Code 2.1.280 is pinned; both exact models were verified. Oracle ON 8012
and OFF 8014 remain localhost-only. Preserve the pinned ROM/ELF/map, raw
reference evidence and worker refs. No copied provider credentials or new
infrastructure. Import this run's results before resuming a Mac writer.
