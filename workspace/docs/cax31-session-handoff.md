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

## State at restart (written at the 2026-11-02 ~07:00 UTC wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`f88653929`, `docs/library-package.md`; a consumer Vite app
  needs its `manualChunks` recipe). The Mac's `worker/lib-v2-mac` is folded up to `059579e32` (pmn238, the attendant's
  "Nth match is next!" line); if the Mac moves that branch again, merge the new tip the same way (typecheck, its touched tests,
  full suite).
- **Audio (S11):** design accepted (`docs/s11-audio-design.md`, incl. "Supervisor acceptance"); probe step 1 (aud237 / aud238a),
  step 2 source table (aud238, `src/data/gen/audio-sound-sources.json`, `tests/audioSoundSources.test.ts`) and step 3 event type +
  sink (aud239, `src/audio/soundEvents.ts`: `emitSound`, `FactorySession.attachSoundSink`, `animSoundPan`) are folded. No emitter
  exists yet, so every sink receives nothing.
- **Cleanup step 1 done** (cln237, `docs/cleanup-cln237-manifest.md`): 2,103 of 28,419 files under tools/integration +
  tools/compare deleted. The rest is kept because kept tests read the fixtures by name; cleanup step 5 (drop frame-pin tests the
  census supersedes) is what frees more, rerun `tools/cleanup/keepClosure.ts` after it.
- ISSUES #190 fixed (pmf240): party-menu cards draw FNT / ailment icons per GetMonAilment (FNT, then PSN, PAR, SLP, FRZ, BRN).
- Census baseline for the next delta: `.integration/validation/sv-20261101/cln237-evidence/census/{on,off}-4f6fa87e4` (== final
  master both scenes; pmf240 / aud239 do not touch battle commands; supervisor-verified 20 / 20 shards vs pmo239's).

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

1. **Audio (S11)** — the main program for several runs: follow `docs/s11-audio-design.md` section 7 from the first unfinished
   step (aud240, screens: draft / swap / summary / party menu / lobby SEs and lobby BGM / fanfares, proven by ROM probe windows;
   emitters call `emitSound` in the screen's existing input handler). Each step's acceptance is in the doc.
2. **Cleanup (one commit per step, each verified by typecheck + full suite + build), in this order:** (1) DONE (cln237);
   (2) root ledgers → README, AGENTS, ROADMAP (≤ 200 lines), ISSUES (open only), PROGRESS (last 3 entries), the rest to
   `docs/archive/` unchanged; (3) remove Codex / DeepSeek / OpenCode paths and the animation / rust lane supervisors — one
   supervisor script, one worker launcher, Claude only (keep `run-supervisor.sh --headless` and `tools/run-subagent.sh` working:
   the daily cron depends on them); (5) `npm run test:gate` ≤ 5 min for workers and drop frame-pin tests the census supersedes,
   full suite nightly; (4) `git subtree split -P core-rs -b core-rs-archive` then `git rm -r core-rs` + its adapter / tests;
   (6) prune merged `worker/*` refs; (7) evidence stops going into git.
3. **Bundle hygiene** (rest of Phase 3): test-only JSON out of `src/`, sprite pixels out of the headless graph
   (`battleCommandFieldArt`, 11.8 MB chunk), lazy-loaded sprite sheets and large tables, gamepad input through `press` / `release`.
4. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak `--render-every 8` 0:16..0:30 plus a `--render-every 1` sample; varied-RNG sweeps;
   vanilla both scenes. Every overlay / pageerror / CRASH / HANG becomes a fix step before anything else.
4b. **User-reported visuals (Kyle, playing the website, 2026-11-02): one step per run, after that run's audio + cleanup
   steps and ahead of item 5.** Both were reproduced on the Mac by replaying Kyle's own trace (challenge
   `09162a56c8e3bc089559492b246fc007`, seeds 432975742 / 148979268, engine 059579e32) through `FactorySession.replayStep`
   + `render()`; frames are in the Mac session scratchpad. Fix each as a **family**, not per species, and prove it against the ROM:
   - **(a) Send-in animations cut short.** Kyle's Koffing (player, mid-battle "Go! KOFFING!" after a voluntary switch) grows
     to its large GROW pose, holds frozen for about 9 frames (no pixel change on app frames 10539..10547), then snaps to normal
     size in one frame (10548) as the next turn's "Foe AIPOM used…" starts. Kyle saw the same on an opponent Spoink
     (`ANIM_H_JUMPS_V_STRETCH_TWICE`). Likely class: the app's send-in window is a fixed length. The ROM waits for the species
     animation to end before it goes on (bso226 found the same for the battle-start "Go!": 39..98 frames late on long
     animations). So any back or front animation longer than the window is clamped, then dropped. Expected fix shape: the
     send-in phase ends when the species animation ends (both sides, mid-battle and battle-start), not a per-species patch.
     First step: census every Factory species' back and front animation length against the window, to list who is clipped.
   - **(b) Agility clips the user's lower rows.** Kyle's opponent Aipom using Agility: the moving copies are cut at a fixed
     horizontal line through the feet. A small piece of the tail tip stays drawn at the rest position while the copies move.
     It is fine at rest before and after. Likely class: the monbg / clone path copies a fixed-height region, so tall species
     (art that reaches the bottom of the 64×64 frame) lose their bottom rows. Agility was proven only on LEDYBA / ONIX
     (`docs/animation-integration-readiness.md`). Check Aipom against the ROM first (it may be the ROM's own clip). Then sweep
     the monbg-using moves with two or three tall species on both sides.
   - **(c) Rate check for random outcomes (small; can ride with any step).** Kyle saw Nidorino's Double Kick crit on the
     second hit twice in a row (both real in the replay: vs Mawile 13 then 60, vs Aipom 31 then 82; Focus Band, no crit boost).
     The Mac ran the committed `BattleScript_EffectDoubleHit` from random RNG starts (the `battleScriptMultiHitFamily.test.ts`
     harness; the ledger reasons give hit order) and counted crits per hit. Result: no bug. The draw order is fixed:
     acc > crit > dmg > crit > dmg > effect, in every one of 6,000 runs. Hit 2's crit is a fresh roll, so it is exactly 1/16
     for a uniform start. Measured over 200,000 runs: hit 1 6.22 %, hit 2 6.40 %, both 0.394 % (independent 0.391 %).
     Kyle's pair was a 1-in-256 run of luck. Make the check permanent and general:
     - a test that, for each RNG-consuming draw site (crit per hit index, accuracy, damage roll, multi-hit count, secondary
       effect chance, Quick Claw, AI score rolls), runs the real script from N random RNG starts;
     - it compares each outcome rate with the source formula (binomial bound, for example 5 SD at N = 20,000);
     - it also checks that consecutive rolls in one action are not tied (hit-2 crit given hit-1 crit).
     This catches the class "a roll is reused, skipped or drawn from the wrong place" without needing a lucky player report.
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
