# CAX31 session handoff — 2026-10-26 (finish plan)

The user approved `docs/finish-plan.md` on 2026-10-26 and restarted the
running CAX31 session on it. Run on CAX31's `master` at
`/srv/pokebench/pokeemerald-factory-core/workspace`, Opus 5.5 supervisor,
Sonnet 5.5 workers, headless in tmux. Commit locally; never push. Keep the
Mac supervisor stopped. Read the plan first, then PROGRESS.md's top entry.

## Standing user authorization (2026-10-26): daily runs

The user asked on 2026-10-26 for a 10-hour run every day. The pokebench
crontab starts `/srv/pokebench/ops/daily-run.sh` at 21:30 UTC, and each run
it starts is authorized. This supersedes the "fresh user authorization" and
"no recurring timers" wording in earlier handoffs, AGENTS.md and
LOCAL_SETUP.md; automatic push stays off. Do not edit or disable the
schedule. Leave this handoff ready for the next day's run and keep this
section when rewriting it. An OPEN entry in DEFERRED.md stops the next runs
from starting until the user resolves it, so use one only for a real user
decision. The run that was killed on 2026-10-26 (`cax31-20261026.jsonl`, exs207
worker on `worker/integration-20261026-213055`) was timing work; its branch is
kept and is long-tail.

## State at restart

- master `ef511e03d` + the 2026-10-26 re-aim commit (docs only). Production src tree `21f22b324`: tl205 + tl206 (Scene ON
  script tails, 13 tail-aware re-pins) were folded by the 21:29 UTC run before it was stopped; supervisor gates on the exact
  merged code `80c0a8c56`: typecheck 0, full suite 1,691 files / 14,065 tests 0 failed, build 0
  (`.integration/validation/sv-20261026/tl206/`). Census / differential / soaks were not rerun after that fold: run census
  both scenes + differential once as the first light gate of this session (presentation-only change, kernel digests must match).
- exs207 (Explosion-breaks-Substitute faint timing) was stopped mid-step: refs `worker/integration-20261026-213055`,
  `worker/integration-20261026-223044`, `worker/union-exs207` kept, worktrees under `.worktrees/` may be removed after copying
  logs. Not folded, no gates. Timing: long tail (Next work 4).
- No open DEFERRED items. The 5 dead tmux sessions were killed at restart.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

1. **Phase 1, crash hardening.** (a) Worker: `tools/soak` gains
   `--scene on|off|both`; with `on`, `createInitialState({battleSceneMode:"on"})`
   and `--render-every 1` so the Scene ON renderer runs every frame. Smoke it
   on 3 seeds. (b) Supervisor: vanilla 0:20 ON, then full 0:60 ON
   `--vary-rng` with `--parallel` bounded to free memory (one full suite OR one
   soak fan-out at a time on 16 GiB). Every CRASH / HANG becomes a worker step
   with a source-rule fix and a Tier-1 test. (c) Worker: in-app containment
   — a throw raised while computing or drawing a presentation command
   degrades that command to the pause, logs the error + session trace, and
   the battle continues; gameplay-state throws keep the overlay; tests pin
   both. (d) Playwright random play (10 min, both scenes) against the built
   bundle, collecting `pageerror`; make it a tool, not a one-off.
2. **Phase 2, every animation plays.** First the approximate contract in
   `ANIMATION_VERIFICATION.md` + a census column, then promotions by weight:
   Substitute doll cells (74 commands), order / allocator unknown (51),
   Castform (~20), Endeavor (12), turn 0 (7), hidden target (3), the 12
   no-adapter cases; then player back send-out + intro send-outs in Scene ON
   and the weather-continues battler (#157). Acceptance: Scene ON census
   0..999 with 0 static-field commands.
3. **Phase 3, production** and **Cleanup** per the plan, interleaved: start
   cleanup steps 1–3 (one-off scripts, ledger archive, provider / lane code)
   as soon as a worker slot is free, each one commit, each verified by
   typecheck + full suite + build.
4. **Timing** residuals (tl204 body windows, msg175 edges, the Explosion /
   Substitute faint) only when nothing above is ready. Record them in ISSUES.

## Gate recipe (unchanged)

Serialize heavy jobs; at most one worker beside them. typecheck;
`lsd194Census.sh` both scenes with `LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4` +
`rst197CensusDelta.py`; `compare:differential` (3 traces); full suite under
`nohup` with an exit file (~47–66 min; diff reported files against
`git ls-files` if a vitest fork dies); build; soaks at wind-down. A supervisor
verification checkout made with `git worktree add` needs the `reference`
symlink, `node_modules` and `artifacts/wasm/factory_wasm.wasm` (the launcher
does this for worker worktrees). Production changes need full suite + build on
the exact folded code; evidence / tooling-only changes use the affected gates.

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
remaining campaign time. Leave a truthful committed handoff before the cap:
rewrite "State at restart" and "Next work" above, keep the daily-runs section.

## Host budget

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full suite ~48 minutes. Serialize typecheck, full
suite, build, census and soak fan-outs; use retained PID/log/status files for
long jobs and keep polling in bounded calls. Do not kill/retry a job just
because its shell tool yielded. Read CAX31 `PAPERCUTS.md`; bound any soak
fan-out to free memory and collect every per-seed result. Use host path
helpers and `/srv/pokebench/vendor/mgba-venv/bin/python`, not Mac-specific
paths. Claude Code 2.1.280 and the Opus/Sonnet model defaults remain pinned.
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. The Mac imports results through bundles; never push.
