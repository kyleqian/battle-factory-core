# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-11-04)

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

## State at restart (written at the 2026-11-04 wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`f88653929`, `docs/library-package.md`). The Mac's
  `worker/lib-v2-mac` is folded up to `851ee1f4c`; if the Mac moves that branch again, merge the new tip the same way
  (typecheck, its touched tests, full suite).
- **Audio (S11):** design accepted (`docs/s11-audio-design.md`); steps 1-3 folded; **step 4 (screens) DONE**: aud240a (draft /
  swap / dialogs), aud240b (summary), aud240c (battle party menus, `docs/aud240c-party-menu-sounds.md`), aud240d (Lobby /
  PreBattleRoom / BattleRoom scripts, heal + BP fanfares, `docs/aud240d-script-sounds.md`). Emitters live in
  `src/engine/screenSounds.ts`. Prove windows in probe **step mode** (the hybrid `--fast` mode drops no-op SEs).
  aud240d left unmeasured: MUS_OBTAIN_SYMBOL, PauseChallenge SE_SAVE, the Brain SE_POKENAV_CALL absolute frame.
- **Cleanup:** steps 1, 2, 3 (cln239: Claude-only launchers, `docs/cln239-launchers.md`) and 6 are done.
- **User reports:** 4b(b) also covers Quick Attack / Aerial Ace now (qak248 / qak249). 4b(a) fully fixed (vis243a mid-battle send-in; go246 battle-start "Go!" intro waits for both species
  animations in Scene ON, `docs/go246-intro-wait.md`; Kyle's SPOINK was cut short by 137 frames, now exact); 4b(b) Agility
  clip fixed (agi245); 4b(c) rate check permanent (`tests/rng244OutcomeRates.test.ts`).
- Census baseline for the next delta: `.integration/validation/sv-20261103/go246-evidence/census/` (go246's tree; 1000 / 1000
  identical to `sv-20261102/vis243a-evidence/census-final/{on,off}-dac9cd2fe`, which stays valid too).

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

1. **Audio (S11)** — the main program for several runs: `docs/s11-audio-design.md` section 7. Next: **aud241** battle
   controller family (effectiveness, SE_FAINT, faint / send-out cries with mode + pan, ball / tray / low-HP, battle BGM start /
   fade / victory, the battle-return BGM / SE_EXIT that aud240d measured: fade P+6, BGM 469 P+53, SE_EXIT P+79). Map and
   proposed split: `docs/aud241-scout.md` (read-only worker report, unverified). Then aud242 (move-animation SEs).
2. **Cleanup (one commit per step, verified by typecheck + full suite + build), in this order:** (1), (2), (3), (6) DONE;
   (5) `npm run test:gate` <= 5 min for workers and drop frame-pin tests the census supersedes, full suite nightly (the full
   suite is ~75 min here and lost one fork beside a worker twice on 2026-11-03: rerun the unreported file);
   (4) `git subtree split -P core-rs -b core-rs-archive` then `git rm -r core-rs` + its adapter / tests (core-rs/README still
   links the archived RUST_* ledgers); (7) evidence stops going into git.
3. **Bundle hygiene** (scout: `docs/bnd-scout.md`): test-only JSON out of `src/`, sprite pixels out of the headless graph
   (`battleCommandFieldArt`, 11.8 MB chunk), lazy-loaded sprite sheets and large tables, gamepad input through `press` / `release`.
4. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak `--render-every 8` 0:16..0:30 plus a `--render-every 1` sample; varied-RNG sweeps;
   vanilla both scenes. Every overlay / pageerror / CRASH / HANG becomes a fix step before anything else.
4b. **User-reported visuals (Kyle, website, 2026-11-02): one step per run, after that run's audio + cleanup steps.**
   - (a) DONE (vis243a + go246). Named residuals in `docs/go246-intro-wait.md`: ELEKID / ARON frame animation one frame long,
     the long-cry (> 74) 4-frame early message clear (both scenes), bso226 release / ball-open frames.
   - (b) DONE (agi245 Agility; qak248 Quick Attack / Aerial Ace live clip 74 -> 160, `docs/qak247-clip-sweep.md`). Receipts:
     `tests/animation/quickAttackAerialAceOpponentClip.test.ts` (qak249). Open: ISSUES #194 (RATTATA Quick Attack residual, not the clip).
   - Flow gaps: ISSUES #191 (dialog cursors move on held repeat), #192 (summary flow gaps), #195 (party menu: cursor moves during the
     open fade; refusal text dismisses before it finishes printing).
5. **Timing / visible residuals** last, never while items 1–3 have ready work: #146 / #143 remainders (SHEDINJA healthbox =
   compare-harness maxHP bug + `factoryCorpusParty.ts:291`, ISSUES #146 shd234; CASTFORM message region on the faint path,
   ENTEI / KINGDRA glow-lag frame, bso226 ONIX intro window, Castform "at"-role keys, Flamethrower +7 alignment, revert /
   switch-out unmeasured), the party-menu entry one frame early after a switch (pmo239), the forced party card's other 486 px
   vs the ROM (pmf240, `turn15-party-select` f20100; `tools/integration/pmf240CardProof.ts`), #188, #189,
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
