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

## State at restart (written at the 2026-10-28 ~06:20 UTC wind-down; PROGRESS.md top entry has details)

- Phase 1: soak `--scene`, containment (contain209 / 213), render caches (perf211), Summary crash fixes (sfa214, folded
  2026-10-27). `npm run play:random` now plays the real Factory loop in headless Chromium (play216 goal mode: node mirror
  engine + soak policies through `__POKEBENCH__.advance`, every frame drawn; ~30 battles / 10 min ON, ~45 OFF; 0 errors so
  far). Playwright must exist in `.integration/browser/node_modules` (ignored; `cd .integration/browser && npm install playwright`).
  RETIRE-YES after a win no longer hangs (ret218). After a loss / retire the player ends in the walkable Lobby with no way to
  start a new challenge except reloading (silent NPCs, 2026-08-05 user decision) — Phase 3 title-screen work.
- Phase 2: approximate class live for substitute-doll (74, apx215) and transform (31, apx217); all 13 unattributed gates
  named. Scene ON census 0..999 on master: **static 102**, approximate 105, live 26,956.
- **apx219 UNFOLDED** (stopped at the deadline): branch `worker/animation-20261028-040709` (7 commits, base `03fbb15a6`):
  sprite-order-unknown 26 + allocator-unknown 3 -> approximate using the known-entry first-action input; census on
  `c7f8a558a` ON 10 battles changed / 0 bad, OFF 1,000 / 1,000 identical, static 102 -> 73
  (`.integration/validation/sv-20261027/apx219-worktree-evidence/`). Its later commits re-pin gate-pin tests to
  `liveMoveAnimationPresentationProven`; full suite NOT run to completion. First step next run: merge master into it, run
  the full suite under nohup ALONE (no second worker; it was OOM-killed twice beside another worker), rerun census ON on the
  union vs `census-apx217/on-cfa1242c0`, strips under `tools/integration/fixtures/approximate/sprite-order/` (NOT made yet; add them),
  build, fold.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

1. **Fold apx219** (above).
2. **Every animation plays**, by weight: castform-form 18, extrasensory-player-later 17, endeavor-power 12, no-adapter 11
   (needs adapters), turn-0 7, later-body-idle-rest 4, hidden-target 3, seismic-toss-damage-branch 1. Then player back
   send-out + intro send-outs in Scene ON, weather-continues side (#157). Pattern: apx215 / apx217 (policy flag, census
   delta, strips, Tier-1 test).
3. **Crashes, nightly:** `npm run build && npm run play:random -- --minutes 10 --scene both`; Scene ON soak bulk at
   `--render-every 8` plus a `--render-every 1` sample. Every overlay / pageerror becomes a fix step.
4. **Production + cleanup** per the plan, interleaved (cleanup steps 1–3 first; a "new challenge" path from the Lobby or a
   title screen belongs here).
5. **Timing** residuals last (ISSUES #188 Summary motion, #189 retire path; exs207 refs kept).

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
