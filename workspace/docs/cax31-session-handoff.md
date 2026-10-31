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

## Next work (in order) — user re-aim 2026-10-31; see `docs/finish-plan.md` for acceptance

Phases 1 and 2 are met (ROADMAP "Current execution priority — 2026-10-31").
Finish snd233 if it is green; do not brief further #146 / send-out / intro
residual steps — they are timing residuals (item 5). This repo is now the
**game core library**; a separate website repo (built from the Mac) owns
login, streaks, menus, the on-screen pad and hosting — never brief those
here. One worker at a time; each run folds the next item plus at least one
cleanup step.

1. **Core library API — first step of the next run.** `src/lib.ts` +
   `mountFactoryGame` and `src/headless.ts` + `replayChallenge`, with the
   exact **contract v2** in `docs/finish-plan.md` Phase 3 (names are fixed:
   the website is built against them). No save blob: resume = seeds + input
   trace fast-forward; `gameplaySeed` is the RNG start `--vary-rng` already
   sets; the recorder's runs gain an optional wall-clock `t`. Vite lib build
   with two entries + `package.json` `exports` (`@pokebench/factory`,
   `@pokebench/factory/headless`); `src/main.ts` a thin shell over the
   browser entry with every existing ABI / query / overlay unchanged. Gates:
   typecheck, new tests (resume equality, headless replay == browser events
   + digest), full suite + build, browser play both scenes, `npm pack`
   importable from a scratch Vite app; report the headless entry's built size.
   Emitted chunks must each stay under 20 MB (Cloudflare serves the package
   as static assets, 25 MiB per file): split the generated sprite / tile /
   species data with `manualChunks` or dynamic imports.
   **A Mac session is building this step on branch `worker/lib-v2-mac`
   (2026-10-31).** If that branch exists on this box when the run starts,
   treat it as a finished worker: merge master into it, run the gates above
   (full suite, build, census both scenes identical to master's, browser
   play both scenes), fold it, and move on. Build it yourself only if the
   branch is absent.
2. **Audio (S11), re-opened by the user:** design step first (docs only; the
   supervisor accepts it), then sound-event parity by census, then playback —
   `docs/finish-plan.md` "Audio (S11)". Expect this to be the main program for
   several runs; it alternates with cleanup, not with timing work.
3. **Cleanup (one commit per step, each verified by typecheck + full suite +
   build), in this order:** (1) delete one-off step scripts in
   `tools/integration` / `tools/compare` and the fixtures only they read —
   keep census, soak, compare, differential, probe runner, extract, preview,
   play:random and anything a kept test imports; (2) root ledgers → README,
   AGENTS, ROADMAP (≤ 200 lines), ISSUES (open only), PROGRESS (last 3
   entries), the rest to `docs/archive/` unchanged; (3) remove Codex /
   DeepSeek / OpenCode paths and the animation / rust lane supervisors — one
   supervisor script, one worker launcher, Claude only (keep
   `run-supervisor.sh --headless` and `tools/run-subagent.sh` working: the
   daily cron depends on them); (5) `npm run test:gate` ≤ 5 min for workers
   and drop frame-pin tests the census supersedes, full suite nightly; (4)
   `git subtree split -P core-rs -b core-rs-archive` then `git rm -r core-rs`
   + its adapter / tests; (6) prune merged `worker/*` refs; (7) evidence stops
   going into git.
4. **Bundle hygiene** (rest of Phase 3): test-only JSON out of `src/`, lazy-loaded sprite sheets and large tables, gamepad
   input through the library's `press` / `release`.
5. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak
   `--render-every 8` 0:30 plus a `--render-every 1` sample; varied-RNG sweeps; vanilla both scenes. Every overlay / pageerror /
   CRASH / HANG becomes a fix step before anything else.
6. **Timing / visible residuals** last, never while items 1–4 have ready work: #146 / #143 remainders (SHEDINJA healthbox =
   compare-harness maxHP bug + `factoryCorpusParty.ts:291` check, ISSUES #146 shd234; CASTFORM message region on the faint path, ENTEI / KINGDRA glow-lag frame, bso226 ONIX intro window, Castform
   "at"-role keys, Flamethrower +7 alignment, revert / switch-out unmeasured), #188, #189, the bso226 "Go!" wait, the Lobby
   attendant dialogue (nch231 skips it); exs207 refs kept.

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
