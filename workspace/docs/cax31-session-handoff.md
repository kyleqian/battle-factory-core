# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-10-31)

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

## State at restart (written at the 2026-10-31 ~06:50 UTC wind-down; PROGRESS.md top entry has details)

- Phase 1: soak `--scene`, containment, render caches, Summary crash fixes done. `npm run play:random` plays the real Factory loop
  in headless Chromium (Playwright in `.integration/browser/node_modules`, ignored; `cd .integration/browser && npm install
  playwright`; not linked into worker worktrees — symlink it). 2026-10-31 nightly gates: see PROGRESS (all green).
- New challenge without reload (nch231): a LOSS already auto-chains into the next challenge at the record answer; RETIRE-YES lands
  in the walkable Lobby, where A facing the singles attendant now starts a new challenge from the live RNG. `--lobby-new-challenge`
  (opt-in) on the soak and play:random crosses into it.
- Phase 2: Scene ON census 0..999 static 0 (approximate 203, live 26,960). Send-out animations drawn in Scene ON on every path
  (mid-battle, Roar, faint replacement, battle-start intro). Castform: the form-change morph is drawn in both scenes, 0 px vs the ROM
  on the measured classes (cff230 / cff232 / snd233).

## Next work (in order) — see `docs/finish-plan.md` for acceptance

1. **#146 / #143 visible remainders:** SHEDINJA genderless healthbox (3,016–4,170 px per send-in window), CASTFORM message region on
   the faint path, ENTEI / KINGDRA glow-lag frame (D4 class), bso226 ONIX intro window; Castform "at"-role keys (Fly / Ice Ball /
   Rest / Hail / Rain Dance / Scary Face), Flamethrower +7 alignment, revert / switch-out unmeasured.
2. **Crashes, nightly:** `npm run build && npm run play:random -- --minutes 10 --scene both` (add a `--lobby-new-challenge` run);
   Scene ON soak `--render-every 8` bulk plus a `--render-every 1` sample. Every overlay / pageerror becomes a fix step.
3. **Production + cleanup** per the plan: cleanup steps 1–3 first; title screen; the Lobby attendant dialogue (nch231 skips it,
   documented divergence).
4. **Timing** residuals last (ISSUES #188, #189, the bso226 "Go!" wait on long front animations; exs207 refs kept).

**Host note (2026-10-28):** two workers at once on 16 GiB caused repeated OOM kills (each worker's full suite / census plus a
supervisor build). Keep ONE worker at a time; the launcher allows one per lane, so a second worker needs another lane anyway.

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
Disk: each run leaves ~5 GB under `.integration/validation/`, and the daily
launcher refuses to start under 15 GB free. At wind-down delete evidence
folders older than the last three runs (keep the census baselines the next
run's delta needs; the user approved this on 2026-10-31, when the folders
from before 2026-10-28 were removed).
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. The Mac imports results through bundles; never push.
