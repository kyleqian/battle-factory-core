# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-11-02)

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

## State at restart (written at the 2026-11-03 ~05:30 UTC wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`f88653929`, `docs/library-package.md`). The Mac's
  `worker/lib-v2-mac` is folded up to `851ee1f4c` (sum241 battle party action window + SUMMARY, spn242 species names); if the
  Mac moves that branch again, merge the new tip the same way (typecheck, its touched tests, full suite).
- **Audio (S11):** design accepted (`docs/s11-audio-design.md`); steps 1-3 folded (probe, source table, event type + sink);
  step 4 screens: **aud240a** (draft / swap / dialog-menu SE_SELECT, `docs/aud240a-screen-sounds.md`) and **aud240b** (summary
  SEs, cries, BGM duck / restore, cry stop; A on the Info page closes the summary, `docs/aud240b-summary-sounds.md`) folded.
  Emitters live in `src/engine/screenSounds.ts`. Prove windows in probe **step mode**: the hybrid `--fast` mode drops no-op SEs.
- **Cleanup:** step 1 (cln237), step 2 (cln238a: 8 unread ledgers to `docs/archive/`; cln238b: ROADMAP 169 lines, ISSUES open
  only, old copies `docs/archive/{ROADMAP,ISSUES}-pre-cln238.md`) and step 6 (74 merged `worker/*` names moved to
  `refs/archive/worker-merged-20261103/`; kept: `worker/lib-v2-mac`, the 3 unmerged exs207 refs) are done.
- **User reports:** 4b(a) mid-battle voluntary send-in fixed (vis243a, `docs/vis243a-sendin-census.md`); 4b(b) Agility
  clip fixed (agi245); 4b(c) rate check
  is permanent (`tests/rng244OutcomeRates.test.ts`, 12 checks, ~43 s).
- Census baseline for the next delta: `.integration/validation/sv-20261102/vis243a-evidence/census-final/{on,off}-dac9cd2fe`
  (vis243a's tree; aud240b / rng244 do not build battle commands, not re-run).

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

1. **Audio (S11)** — the main program for several runs: `docs/s11-audio-design.md` section 7. Next: **aud240c** party menu
   (voluntary + forced; the action window now exists from sum241: double SE on submenu A / B, SE_FAILURE on the forced SEND_OUT
   cancel; party-route SEs at 20191 / 20206 / 20246 / 20257 on `turn15-party-select`), then **aud240d** Lobby / PreBattleRoom /
   BattleRoom script SEs + fanfares + lobby BGM (first fix the aud238 extractor: `MUS_OBTAIN_B_POINTS` 459 via
   `Std_MsgboxGetPoints` is missing), then aud241 (battle controller family). Map: `docs/aud240-scout.md` (unverified).
2. **Cleanup (one commit per step, verified by typecheck + full suite + build), in this order:** (1), (2), (6) DONE;
   (3) remove Codex / DeepSeek / OpenCode paths and the animation / rust lane supervisors — one supervisor script, one worker
   launcher, Claude only (keep `run-supervisor.sh --headless` and `tools/run-subagent.sh` working: the daily cron depends on them;
   the lane-named root ledgers ANIMATION_* / RUST_* go to `docs/archive/` in the same step, except ANIMATION_COVERAGE.json and
   ANIMATION_LATCHES.md, which ~280 tests / tools read as evidence paths; fix the stale "Stage 8 reset in ROADMAP.md" prompt
   text in `run-agent.sh:85` / `tools/run-subagent.sh:584`); (5) `npm run test:gate` <= 5 min for workers and drop frame-pin
   tests the census supersedes, full suite nightly; (4) `git subtree split -P core-rs -b core-rs-archive` then `git rm -r core-rs`
   + its adapter / tests; (7) evidence stops going into git.
3. **Bundle hygiene** (scout: `docs/bnd-scout.md`): test-only JSON out of `src/`, sprite pixels out of the headless graph
   (`battleCommandFieldArt`, 11.8 MB chunk), lazy-loaded sprite sheets and large tables, gamepad input through `press` / `release`.
4. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak `--render-every 8` 0:16..0:30 plus a `--render-every 1` sample; varied-RNG sweeps;
   vanilla both scenes. Every overlay / pageerror / CRASH / HANG becomes a fix step before anything else.
4b. **User-reported visuals (Kyle, website, 2026-11-02): one step per run, after that run's audio + cleanup steps.**
   - (a) remainder: the **battle-start "Go!" intro** still runs a fixed canonical timeline instead of waiting for the species
     animations (`Intro_WaitForShinyAnimAndHealthbox`; bso226: 39..98 frames late). Kyle's opponent SPOINK
     (`ANIM_H_JUMPS_V_STRETCH_TWICE`) is probably this path: check first. Exact plan: `docs/vis243a-sendin-census.md` section 7.
   - (b) DONE 2026-11-03 (agi245, `docs/agi245-scout.md`). Follow-up: Quick Attack / Aerial Ace use the 74-row live clip;
     the scout measured 74 off by one for LEDYBA on Agility, so sweep both moves on a LEDYBA-like species vs the ROM.
   - Flow gaps found by aud240a / b: ISSUES #191 (dialog cursors move on held repeat), #192 (summary: draft cursor does not follow
     the last viewed mon, input 4 frames early, swap summary has no mon change).
5. **Timing / visible residuals** last, never while items 1–3 have ready work: #146 / #143 remainders (SHEDINJA healthbox =
   compare-harness maxHP bug + `factoryCorpusParty.ts:291`, ISSUES #146 shd234; CASTFORM message region on the faint path,
   ENTEI / KINGDRA glow-lag frame, bso226 ONIX intro window, Castform "at"-role keys, Flamethrower +7 alignment, revert /
   switch-out unmeasured), the party-menu entry one frame early after a switch (pmo239), the forced party card's other 486 px
   vs the ROM (pmf240, `turn15-party-select` f20100; `tools/integration/pmf240CardProof.ts`), #188, #189, the bso226 "Go!" wait,
   the Lobby attendant dialogue (nch231 skips it); exs207 refs kept. Note: `battle1-postwin-next-prompt` is not ROM-aligned
   around f25800 (the oracle is already in the Lobby); use `turn15-party-select` for party-menu ROM proofs.

**Host note (2026-10-28, again 2026-11-01):** two full suites at once on 16 GiB OOM-kill forks. Keep ONE worker at a time, and
the supervisor runs no suite / census while a worker may run vitest.

**Test note (2026-11-02):** the suite runs `isolate: false`; a test that mocks an engine module must use `vi.resetModules()` +
`vi.doMock` and undo both in `afterAll` (`tests/audioSinkPlumbing.test.ts`, contain209 / contain213), or it passes alone and
fails depending on file order.

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
