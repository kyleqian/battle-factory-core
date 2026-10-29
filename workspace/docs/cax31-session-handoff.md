# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-10-29)

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

## State at restart (written at the 2026-10-29 ~05:00 UTC wind-down; PROGRESS.md top entry has details)

- Phase 1: soak `--scene`, containment (contain209 / 213), render caches (perf211), Summary crash fixes (sfa214).
  `npm run play:random` plays the real Factory loop in headless Chromium (play216 goal mode; Playwright must exist in
  `.integration/browser/node_modules`, ignored; `cd .integration/browser && npm install playwright`). RETIRE-YES after a win no
  longer hangs (ret218). After a loss / retire the player ends in the walkable Lobby with no way to start a new challenge except
  reloading (silent NPCs, 2026-08-05 user decision) — Phase 3 title-screen work.
- Phase 2 move bodies: **Scene ON census 0..999 has 0 static move-animation commands** (2026-10-29, master `f07c843af`):
  live 26,956, approximate 207 (substitute-doll 74, transform 31, sprite-order-unknown 26, castform-form 18, extrasensory later
  target 17, endeavor-power 12, no-adapter 11, turn-0 7, idle-rest 4, hidden-target 3, allocator-unknown 3, seismic 1), pause
  12,941. Steps apx215 / 217 / 219-222; strips under `tools/integration/fixtures/approximate/<class>/`. New approximate bodies for
  the no-adapter moves + Ghost Curse live in `src/animation/approxScript.ts` (no oracle check yet; Ghost Curse's black stretching
  window not drawn). A no-case move without a script body would be `static:other:no-adapter-unscripted` (none in 0..999).
  Census baseline for the next step: `.integration/validation/sv-20261028/apx222-evidence/census/{on,off}-bad3db32c` (src == master).

## Next work (in order) — see `docs/finish-plan.md` for acceptance

1. **Rest of Phase 2:** player back send-out + battle-start intro send-outs drawn in Scene ON (ISSUES #71 and the #205-area
   "Open" lines; `docs/send-out-intro-animation-program.md`), Castform form changes, weather-continues takes battler 0 (#157).
   Then a cheap oracle spot-check of 1–2 apx222 bodies (Scene ON 8012) to size their residuals.
2. **Crashes, nightly:** `npm run build && npm run play:random -- --minutes 10 --scene both`; Scene ON soak bulk at
   `--render-every 8` plus a `--render-every 1` sample. Every overlay / pageerror becomes a fix step.
3. **Production + cleanup** per the plan, interleaved (cleanup steps 1–3 first; a "new challenge" path from the Lobby or a
   title screen belongs here).
4. **Timing** residuals last (ISSUES #188 Summary motion, #189 retire path; exs207 refs kept).

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
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. The Mac imports results through bundles; never push.
