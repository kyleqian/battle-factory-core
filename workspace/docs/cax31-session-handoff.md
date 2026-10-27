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

## State at restart (written at the 2026-10-27 09:xx UTC wind-down; PROGRESS.md top entry has details)

- Phase 1 tooling landed: `npm run soak -- --scene on|off|both` (soakscene208); in-app containment of presentation throws
  (contain209 + contain213: adapter / duration / draw / tick-side field reads / command projection / order hosts); render
  caches ~4x faster, pixel-identical (perf211; `tools/soak/frameHashes.ts`); `npm run play:random` drives the built bundle
  in headless Chromium (play212; Playwright + Chromium + unpacked system libraries live in the ignored
  `.integration/browser/`, picked up automatically; no root needed).
- Phase 2 plumbing landed: apx210 reason codes / `LIVE_MOVE_APPROXIMATE_POLICY` (all static) / census field [21].
  Scene ON census 0..999 on `6a021c074`: 207 static commands (table in PROGRESS.md), 0 approximate.
- Scene ON soaks so far all clean: winning carry 0 / 14 / 28 + winning-swap (0:30 each) and carry 0 30:130 at
  `--render-every 1`, vanilla 0:20 ON; 0 CRASH / 0 HANG / 0 CONTAINED.
- Browser random play found real crashes on the draft **Summary** screen in both scenes (6-species front-animation table;
  Battle Moves detail `moves[powerMoveIndex]`; Contest Moves cancel row). sfa214 fixes them — see PROGRESS.md for whether it
  was folded; if not, its branch is named there: verify (tests, differential, the 17 saved sessions replayed with render,
  full suite + build on the union) and fold first.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

1. **Crashes.** After sfa214: `npm run build && npm run play:random -- --minutes 10 --scene both`; every overlay /
   pageerror becomes a fix step (replay saved sessions with tick + render). Extend soak exploring policies whenever the
   browser finds a screen the soak does not reach. Nightly Scene ON bulk: `--render-every 8` (rendering every frame is
   ~1 battle / min / process here; see PROGRESS sizing note) plus a `--render-every 1` sample.
2. **Every animation plays.** Brief ready: `.integration/validation/sv-20261026b/apx215.txt` (substitute-doll, 74
   commands). Then by weight: transform 33, castform-form 18, extrasensory-player-later 17, sprite-order-unknown 16,
   endeavor-power 12, no-adapter 11, turn-0 7, hidden-target 3; first name the 13 `other:unattributed-gate-*` commands.
   Then player back send-out + intro send-outs in Scene ON, weather-continues side (#157).
3. **Production + cleanup** per the plan, interleaved (cleanup steps 1–3 first).
4. **Timing** residuals last (exs207 refs kept: `worker/integration-20261026-213055`, `-223044`, `worker/union-exs207`).

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
