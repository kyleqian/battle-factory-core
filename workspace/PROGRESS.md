# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-03 / 04 — CAX31 daily run (supervisor, Opus 5.5): in progress: aud240c / cln239 folded, aud240d running

- **State:** master `065046720`+ (src == aud240c merge `30360d7cf`). Worker aud240d (lobby / script sounds) running on
  `worker/integration-20261104-000400`. Evidence `.integration/validation/sv-20261103/`.
- **Folded:** aud240c (S11 step 4c; `docs/aud240c-party-menu-sounds.md`; branch `worker/integration-20261103-213048`): voluntary +
  forced battle party menus emit SE_SELECT on row moves (only when the slot changes), A on a mon, action-window cursor (NoWrap,
  silent at the ends), action-window A (**one** SE: `party_menu.c:2560` passes `APressMuted = TRUE`, supervisor-read; the scout's
  double SE was wrong), action-window B (two SEs, ROM-confirmed), voluntary cancel, refusal dismiss; SE_FAILURE (32) on forced B /
  A-on-CANCEL. Voluntary SEs gated until the open fade ends (the ROM ignores input then; our cursor still moves, recorded). 3 step-mode
  ROM fixtures (forced 25 events on `turn15-party-select`, voluntary 25 via a lab request, SUMMARY entry 9). Supervisor re-probed the
  forced window on the ON oracle: 25 / 25 events equal. Worker: differential 211 traces 38,532 / 38,532 identical; typecheck, build,
  build:lib 0; 28 importing test files pass. Supervisor: 4 audio test files 117 / 117; **full suite on `30360d7cf`: 1,741 passed +
  44 skipped, 0 failed, 14,465 tests**; one fork died beside a worker (`randomRoundSoakParallel` not reported), rerun 6 / 6.
- **Folded:** cln239 (cleanup step 3; `docs/cln239-launchers.md`): `run-supervisor.sh` / `tools/run-subagent.sh` are Claude only;
  Codex / DeepSeek / OpenCode paths, max mode, the animation / rust lanes and supervisors, `tools/autonomy` campaign scripts deleted
  (supervisor checked each deleted file had only Codex / lane users); 8 ANIMATION_* / RUST_* ledgers to `docs/archive/`
  (ANIMATION_COVERAGE.json, ANIMATION_LATCHES.md, ANIMATION_INTEGRATION_* and ANIMATION_VERIFICATION.md stay: read by tools / tests).
  Supervisor: both `--print-config` forms incl. the cron form exit 0, `-S codex` / `--lane animation` rejected,
  `tools/test_run_claude_supervisor.py` 11 OK, `tests/launcherProfiles.test.ts` 19 / 19, lane dir unchanged; aud240d launched with
  the new launcher. The worker briefly committed docs on master in the main checkout and reset it itself (reflog `178aed1d9`; PAPERCUTS).
- **Next:** fold aud240d; then 4b(a) remainder (battle-start "Go!" wait, Kyle's SPOINK) or aud241; cleanup step 5 / 4.

---

## 2026-11-02 / 03 — CAX31 daily run (supervisor, Opus 5.5): wind-down: Mac 851ee1f4c / aud240a / aud240b / vis243a / agi245 / rng244 / cln238 / cleanup 6 folded

- **State:** master `54aafa87d`+ (final src == agi245 merge `c88d897f2`); the long soak / play gates ran on src `5d39f2c79`; agi245
  (one render line) got its own full suite + build + Scene ON render checks (below). Tree clean, no active workers.
- **Folded:** Mac `worker/lib-v2-mac` tip `851ee1f4c` (sum241 battle party action window + SUMMARY; spn242 species names keep
  apostrophes / periods / gender symbols, summary portraits keyed by SPECIES_) as merge `0f39a60`. master had only .md changes since
  the Mac base `c5b7861e0`, so the merged non-docs tree == `851ee1f4c` (checked by `git diff`); the Mac's full suite 14,363 / 0
  (re-run by the top layer) is reused. Supervisor: typecheck 0; touched tests (sum241, spn242, inbattlePartyMenuVisualBind,
  contain213 helper users) 85 / 85.
- **Folded:** cln238a (cleanup step 2, first half, `ee189a74a`, supervisor): 8 root ledgers nothing reads moved unchanged to
  `docs/archive/` (git grep: no test / tool / launcher / coverage-JSON reference). ANIMATION_COVERAGE.json + ANIMATION_LATCHES.md
  stay (evidence paths), launcher-named lane files wait for cleanup step 3, ROADMAP / ISSUES rewrite = cln238b.
- **Folded:** aud240a (S11 step 4a; `docs/aud240a-screen-sounds.md`; branch `worker/integration-20261102-213642`):
  `src/engine/screenSounds.ts` `playSelectSe` + SE_SELECT emits in the draft (yes/no, cursor, menu), swap (pickers, options,
  yes/no, duplicate species) and postwin dialog menus (question, continuation, swap offer; B silent per menu.c, NoWrap only
  when the cursor moved, A-on-NO = two SEs). ROM windows (step mode; hybrid `--fast` drops the no-op second SE): draft 3 + 12
  events, swap 10, decline 3, all equal; supervisor re-probed the decline window on the ON oracle: events equal the fixture.
  Worker on the tested tree: differential 2,430 / 2,430 identical, full suite 1,737 files / 14,384 passed / 0 failed, typecheck,
  build, build:lib 0. Supervisor on master: the 4 audio test files 56 / 56. New ISSUES #191 (dialog cursors move on held repeat).
- **Folded:** vis243a (handoff 4b(a), Kyle's "send-in cut short"; `docs/vis243a-sendin-census.md`; branch
  `worker/integration-20261102-230300`; evidence `sv-20261102/vis243a-evidence/`): the voluntary player send-in (also Baton Pass)
  had a fixed 91 + 11 window; it now uses the forced path's ROM chain (SwitchIn_CleanShinyAnimShowSubstitute waits the back
  animation in Scene ON, SwitchIn_HandleSoundAndEnd the cry): `max(91, cry + 66, T_back + 70) + 11` ON, `max(91, cry + 66) + 11` OFF.
  Census before the fix: 343 / 376 species clipped for some nature, worst 95 frames of animation / 111 frames early. 16 dense ROM
  probes (12 ON, 4 OFF) equal. Opponent mid-battle send-in already waited (no change); the battle-start "Go!" intro does NOT
  (fixed canonical timeline, plan in the doc section 7) — Kyle's SPOINK is probably that path. Census 0..999 both scenes vs
  `cln237` baseline: 0 bad battles, only `switch-in` durations rose (ON 929 battles / 1,725 commands, OFF 918 / 1,638), digests
  equal; differential all 211 traces 38,532 / 38,532 identical (no standard trace has a clipped voluntary send-in). Worker full
  suite on the src-identical tree: 3 failed = the 3 soak / seam pins it then re-pinned with per-pin reasons (exploring-policy
  trajectories; #89 Baton Pass pin seed 19 -> 30 after a 0..127 re-scan); its second run hit the 180-min cap. Supervisor on
  master: the 8 touched test files 145 / 145; the wind-down full suite covers the rest.
- **Folded:** aud240b (S11 step 4b; `docs/aud240b-summary-sounds.md`; branch `worker/integration-20261103-020655`): draft, swap
  and in-battle party summaries emit SE_SELECT (close, page / mon change, move select), the open / mon-change cry (NORMAL / WEAK,
  pan 0, volume 120, priority 10), the BGM duck 85 / restore 256 and the cry stop; **A on the Info page now closes the summary**
  (`pokemon_summary_screen.c:1556-1560`, supervisor-read). Probe fix: CRY_MODE WEAK / WEAK_DOUBLES were swapped. 6 step-mode ROM
  windows equal (one pinned 1-frame difference, ISSUES #193); supervisor re-probed `summary-close-during-cry`: 8 / 8 events equal.
  Worker: typecheck 0, smoke 448, 41 importing files 504 tests, build + build:lib 0, differential 4,377 / 4,377 identical over 48
  summary / draft / party / swap traces (a scratch A-on-Info trace differs from the close on, intended). Full suite not run by
  the worker (supervisor wind-down suite). Supervisor: 5 audio / summary files 108 / 108. New ISSUES #192 (summary flow gaps),
  #193 (scheduler debt).
- **Folded:** cln238b (cleanup step 2b, worker, docs only): ROADMAP.md 2,487 -> 169 lines, ISSUES.md 3,814 -> open only (~280
  lines; #72 / #121 dropped, settled records moved to ROADMAP "Settled exceptions"); old copies `docs/archive/{ROADMAP,ISSUES}-pre-cln238.md`
  (supervisor `cmp`: identical to the parent's files; open issue list checked).
- **Folded:** rng244 (handoff 4b(c), test only): `tests/rng244OutcomeRates.test.ts` + `tests/helpers/rngRateHarness.ts`, 12 checks
  through the real scripts from random RNG starts (crit per hit index + independence, accuracy 100 / 85 / 70 / stage -1, damage
  roll uniform over 16, Spike Cannon 3/8 3/8 1/8 1/8, Body Slam 30 % / Thunderbolt 10 %, Quick Claw via gRandomTurnNumber
  `battle_main.c:4653`; AI score roll skipped, no cheap path); a deliberate crit-roll reuse fails it (z = 84.8). Supervisor: 12 / 12, 43 s.
- **Cleanup step 6 (supervisor):** 74 merged `worker/*` branch names moved to `refs/archive/worker-merged-20261103/` (restore with
  `git branch <name> refs/archive/worker-merged-20261103/<name>`); kept `worker/lib-v2-mac` + 3 unmerged exs207 refs; a leaked
  `/tmp/app-differential-*` worktree removed.
- **Fixed by the supervisor:** the wind-down suite failed 1 pin (M-B (c) full seed 0): aud240b's A-on-Info close moves the
  exploring trajectory (38,729 / t28 -> 43,417 / t39, same battle / end state); with both A-close sites undone the old pin passes.
  Re-pinned (`5d39f2c79`), file 64 / 64.
- **Folded:** agi245 (handoff 4b(b), Kyle's "Agility clips the lower rows"; scout `docs/agi245-scout.md`; branch
  `worker/integration-20261103-050850`): `battleScene.ts:21369` the live opponent-attacker Agility clip is now 160 (the healthbox
  covers the feet, as in the ROM); `corner.y + 55` stays only on the staged path. ROM 87-frame window 0 px for AIPOM, FEAROW,
  CROBAT, DRAGONITE, LEDYBA, SUNKERN (before: AIPOM 62 frames / 14,833 px); new fixture `agility-opponent-aipom-player-onix` +
  `tests/animation/agilityOpponentClip.test.ts` (supervisor: fails with the fix undone); differential 641 / 641 identical;
  Agility / ont193 / scd112 tests 26 / 26. Quick Attack / Aerial Ace keep the 74 clip (LEDYBA-like species unverified, follow-up).
  **agi245 gates** (`sv-20261102/gates-agi245/`, tree `c88d897f2`): typecheck 0; full suite 1,785 files, 14,441 passed, 1 failed =
  gate6 manifest missing rng244's new test (regenerated `54aafa87d`, rerun 7 / 7); build 0; play:random 3 min / scene: ON 16
  battles / 9 swaps, OFF 26 / 10, 0 page errors / overlays / contained / divergences; Scene ON full vary-rng 0:8 `--render-every 8`
  **8 / 8** (all `budget`).
- **Scout:** agi245 (`docs/agi245-scout.md`, read-only): Kyle's Agility clip is ours, not the ROM's — the live path still uses a
  LEDYBA-calibrated clip row `corner.y + 55` (`battleScene.ts:21369`, supervisor-read), cutting 257 opponent species; a 160 clip
  gives 0 px on 6 species vs the ROM.
- **Wind-down gates** (`sv-20261102/gates-final/`, src `7717b55a4` == `5d39f2c79` src): typecheck 0; **independent full suite
  1,783 files: 1,738 passed + 44 skipped, 1 failed (the pin above, fixed)**, 14,427 tests passed; build 0; play:random 4 min / scene:
  ON 22 battles / 9 swaps, OFF 34 / 16 (max win streak 7); `--lobby-new-challenge` 2 min / scene: 1 + 3 new challenges; **0 page
  errors / overlays / contained / divergences**; varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap
  carry 0 **100 / 100**; vanilla 0:20 Scene ON **20 / 20**, Scene OFF **20 / 20** (all `budget`); Scene ON winning first-round 0:6
  `--render-every 1` **6 / 6**; Scene ON full vary-rng 0:16 `--render-every 8` **16 / 16** (all `budget`). The 0:60 gates were not
  run (hours each here; same practice as earlier sessions).
- **Housekeeping:** evidence `sv-20261030` deleted (older than the last three runs; 5 GB). Census baseline for the next delta:
  `sv-20261102/vis243a-evidence/census-final/{on,off}-dac9cd2fe`.
- **Next:** handoff "Next work": aud240c (party menu SEs), aud240d (lobby scripts; extractor fix for MUS_OBTAIN_B_POINTS first),
  cleanup step 3 (providers / lanes), 4b(a) remainder (battle-start "Go!" wait; Kyle's SPOINK), ISSUES #191 / #192, a Quick Attack /
  Aerial Ace live-clip sweep on LEDYBA-like species (agi245 scout).
- **Notes:** no DEFERRED items. No push. Worker refs (merged, archived): integration-20261102-213642 (aud240a), -230300 (vis243a),
  -20261103-020655 (aud240b), -032257 (cln238b), -041808 (rng244), -050850 (agi245); -043917 (agi245 scout, no commits).
---

## 2026-11-01 / 02 — CAX31 daily run (supervisor, Opus 5.5): wind-down: pmn238 / aud238 / cln237 / aud239 / pmf240 folded

- **State:** master `c5b7861e0`+ (final src == gates commit `530e835ba`; after it only the audioSinkPlumbing test fix `ffeb4b2c4` + docs).
- **Folded:** Mac `worker/lib-v2-mac` tip `059579e32` (pmn238: the attendant's "The Nth match is next!" follows the battle number;
  7th match = "Finally, the 7th match is next!", +9 frames) as merge `d59e36b68`. Supervisor: typecheck 0; postwin +
  interactiveRouting 69 / 69; full suite 0 failed (one fork died beside the aud238 worker; the missing file reran 2 / 2).
- **Folded:** aud238 (S11 step 2; `docs/aud238-sound-sources.md`): `tools/extract/extract-audio-sound-sources.ts` ->
  `src/data/gen/audio-sound-sources.json` (559 KB, not imported by src): 1,042 anim sound ops (873 / 97 / 48 / 2 / 22, exact),
  122 distinct ids over the three play ops (129 over all song ops; the design's 123 was a grep estimate, doc corrected), 59 C-side
  anim sites, 378 call sites, GetBattleBGM (all 300 Factory trainers MUS_VS_TRAINER 476, Brain 471), map music MUS_B_FACTORY 469
  (loop ticks 168..3720), 23 song loop structures. `tests/audioSoundSources.test.ts` 9 / 9 incl. byte-for-byte regeneration;
  supervisor grep matches the op counts and 122.
- **Folded:** cln237 (cleanup step 1; `docs/cleanup-cln237-manifest.md`, list `docs/archive/cln237-deleted.txt`, tool
  `tools/cleanup/keepClosure.ts`): 2,103 of 28,419 files under tools/integration + tools/compare deleted (189,684 lines); kept tests
  read most fixtures by name, so the rest stays. Recovery: `git checkout 72c9d264c -- workspace/<path>`. Worker on the exact tree:
  full suite 1,774 files / 14,316 passed, 0 failed; build 0; differential 641 / 641; census both scenes 0..999 — supervisor `cmp`
  20 / 20 shards byte-identical to `pmo239-evidence/census/{on,off}-7f06071c8`. Deleted names survive in src only inside comments.
- **Folded:** aud239 (S11 step 3; `docs/aud239-sound-events.md`): `src/audio/soundEvents.ts` (SoundEvent, write-only SoundSink,
  `emitSound` / `collectSoundTick`, `animSoundPan` / `animSoundPan2` / `keepPanInRange` / `calculatePanIncrement`, supervisor-checked
  line by line vs `battle_anim.c:1263-1347`); `FactorySession.attachSoundSink` (live `tick()` only; replay / resume never). No
  emitter yet. Worker: full suite 1,778 files / 14,339 passed, 0 failed; build + build:lib 0; differential 641 / 641; headless +1.3 KB,
  ENGINE_BUILD `eb-07b2b0d824275e3f` -> `eb-443e35a630a2ccd4`.
- **Folded:** pmf240 (ISSUES #190 removed): party-menu cards draw FNT / ailment icons per GetMonAilment (`party_menu.c:1909-1935`:
  FNT, then PSN, PAR, SLP, FRZ, BRN; supervisor-checked), level text only without an ailment; one shared renderer, both menus and
  scenes. ROM `turn15-party-select` f20100: level cell 73 -> 0 px, icon box 147 -> 0, frame 633 -> 486 (rest = other card residuals,
  handoff item 5). Differential: only battle1-postwin's party-menu captures (216, 305 px each; FNT icon eyeballed). One pin re-pinned
  to the ROM status order (`inbattlePartyMenuVisualBind`). `battle1-postwin-next-prompt` is not ROM-aligned near f25800.
- **Fixed by the supervisor:** the gate suite failed 2 tests in `tests/audioSinkPlumbing.test.ts` (aud239): with `isolate: false`
  an earlier file in the fork had loaded the real core, so the hoisted `vi.mock` never applied. Reproduced (snatch test first,
  `--no-isolate --maxWorkers=1`), fixed with `vi.resetModules` + `vi.doMock` undone in `afterAll` (`ffeb4b2c4`), 10 / 10 in the same run.
- **Wind-down gates on `530e835ba`** (`sv-20261101/gates-final/`): typecheck 0; **independent full suite 1,778 files: 1,733 passed +
  44 skipped, 1 failed (the 2 audioSinkPlumbing tests above, fixed and rerun)**, 14,339 passed; build 0; play:random 4 min / scene: ON
  21 battles / 8 swaps, OFF 35 / 17 (max win streak 7); `--lobby-new-challenge` 2 min / scene: 4 + 2 new challenges; **0 page errors /
  overlays / contained / divergences**; varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0
  **100 / 100**; vanilla 0:20 Scene ON **20 / 20**, Scene OFF **20 / 20** (all `budget`); Scene ON
  winning first-round 0:6 `--render-every 1` **6 / 6**; Scene ON full vary-rng 0:16 `--render-every 8` **16 / 16** (all `budget`). The 0:60
  full / winning / winning-swap gates were not run (hours each here; same practice as earlier sessions).
- **Housekeeping:** evidence `sv-20261029` deleted (older than the last three runs; 5.1 GB). Census baseline for the next delta:
  `sv-20261101/cln237-evidence/census/{on,off}-4f6fa87e4`.
- **Next:** handoff "Next work": aud240 (screens; scout `docs/aud240-scout.md`), cleanup step 2 (root ledgers; scout
  `docs/cln238-ledger-scout.md`), bundle hygiene (scout `docs/bnd-scout.md`: headless 22.3 -> ~11 MB by dropping tile pixels). The scouts are read-only worker reports, saved unverified.
- **Notes:** no DEFERRED items. Worker refs kept (merged): `worker/side-20261101-213641` (aud238), `-20261101-232920` (cln237),
  `worker/integration-20261102-014838` (aud239), `-20261102-030844` (pmf240). No push.
