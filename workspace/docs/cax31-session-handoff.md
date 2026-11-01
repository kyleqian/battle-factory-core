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

## State at restart (written at the 2026-11-01 ~06:45 UTC wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Nightly crash set green on the final src (PROGRESS top entry).
- **Core library package folded** (`f88653929`): `@pokebench/factory` (`mountFactoryGame`) + `@pokebench/factory/headless`
  (`replayChallenge`, `ENGINE_BUILD` = content hash `eb-<16 hex>` of the headless build), `npm run build:lib`, `npm pack` works
  from a scratch Vite app; `docs/library-package.md`. A consumer Vite app needs its `manualChunks` recipe (default = one 33 MB
  chunk). The Mac's `worker/lib-v2-mac` up to `b7e7dc345` is folded (forced party menu cursor, WIN_MSG refusals, Scene ON
  end-of-turn weather animations, party-card HP / fainted palettes). If the Mac moves that branch again, merge the new tip the
  same way.
- **Party menus in battle order** folded (pmo239, `da19bc407`): SwitchPartyOrder on every player switch-in; menus open on row 0.
- **Audio design accepted** (`docs/s11-audio-design.md`, incl. "Supervisor acceptance"); probe `tools/audio/soundEventProbe.py`.
  Probe step 1 (aud237) folded: hybrid == stepping on all 5 fixtures (11-13x vs the new stepper, 32-38x vs the original); its
  one f2096 RAM mismatch is explained (CPU stack, frame-boundary slack; aud238a) and the hybrid is census-grade.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

1. **Audio (S11)** — the main program for several runs: follow `docs/s11-audio-design.md` section 7 from the first unfinished
   step (aud238, the sound-source table). Each step's acceptance is in the doc; the supervisor's decisions on its open questions are in its last section.
2. **Cleanup (one commit per step, each verified by typecheck + full suite + build), in this order:** (1) delete one-off step
   scripts in `tools/integration` / `tools/compare` and the fixtures only they read (a ready brief from this run:
   `.integration/validation/sv-20261031/cln237.txt` — fill in its `<CENSUS_BASE>` / `<EVIDENCE>` / `<HARDSTOP>`; census base =
   `.integration/validation/sv-20261031/pmo239-evidence/census/{on,off}-7f06071c8`, which equals final master in both scenes);
   (2) root ledgers → README, AGENTS, ROADMAP (≤ 200 lines), ISSUES (open only), PROGRESS (last 3 entries), the rest to
   `docs/archive/` unchanged; (3) remove Codex / DeepSeek / OpenCode paths and the animation / rust lane supervisors — one
   supervisor script, one worker launcher, Claude only (keep `run-supervisor.sh --headless` and `tools/run-subagent.sh` working:
   the daily cron depends on them); (5) `npm run test:gate` ≤ 5 min for workers and drop frame-pin tests the census supersedes,
   full suite nightly; (4) `git subtree split -P core-rs -b core-rs-archive` then `git rm -r core-rs` + its adapter / tests;
   (6) prune merged `worker/*` refs; (7) evidence stops going into git.
3. **ISSUES #190** (party cards print "Lv50" where the ROM shows the FNT / status icon; `party_menu.c:2300-2313`, `:4203`) — a
   small visible fix; pair it with a cleanup run.
4. **Bundle hygiene** (rest of Phase 3): test-only JSON out of `src/`, sprite pixels out of the headless graph
   (`battleCommandFieldArt`, 11.8 MB chunk), lazy-loaded sprite sheets and large tables, gamepad input through `press` / `release`.
5. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak `--render-every 8` 0:16..0:30 plus a `--render-every 1` sample; varied-RNG sweeps;
   vanilla both scenes. Every overlay / pageerror / CRASH / HANG becomes a fix step before anything else.
6. **Timing / visible residuals** last, never while items 1–4 have ready work: #146 / #143 remainders (SHEDINJA healthbox =
   compare-harness maxHP bug + `factoryCorpusParty.ts:291`, ISSUES #146 shd234; CASTFORM message region on the faint path,
   ENTEI / KINGDRA glow-lag frame, bso226 ONIX intro window, Castform "at"-role keys, Flamethrower +7 alignment, revert /
   switch-out unmeasured), the party-menu entry one frame early after a switch (pmo239), #188, #189, the bso226 "Go!" wait, the
   Lobby attendant dialogue (nch231 skips it); exs207 refs kept.

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
