# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-04 / 05 — CAX31 daily run (supervisor, Opus 5.5): wind-down: aud241a / aud241b / frs247 / cln240 / aud241c-fx / aud241c folded

- **State:** master `f3440331d`+ (final src == aud241c merge). Tree clean, no active workers. Evidence `.integration/validation/sv-20261104/`.
  The long gates below ran on src `fef00b6c5`; the final src adds only the ratchet move `bc74a02d3` and aud241c (write-only sound),
  covered by the final full suite + build in `sv-20261104/final-suite/` on `f3440331d`: **1,793 files: 1,749 passed + 44 skipped,
  0 failed** (14,724 tests); build 0; build:lib 0.
- **Folded:** aud241a (S11 step 5, first slice; `docs/aud241a-battle-start-sounds.md`; branch `worker/integration-20261104-213051`):
  `src/engine/battleStartSounds.ts` emits from `tick()` (guarded by `soundCollecting()`) the battle BGM (476, Brain 471) with
  `m4aMPlayAllStop`, the ball tray ENTER / BALL / EXIT SEs (per-side pans, SE player field), SE_BALL_OPEN and the send-out cries
  (pan +-25, NORMAL / WEAK, duck) for the intro, mid-battle recall / send-in and the forced party-menu send-out. ROM windows (step
  mode): intro YOSHI / MAGNETON both scenes + canonical intro, Scene OFF voluntary switch, opponent replacement OFF, canonical forced
  send-out ON. Not ROM-proven (synthetic tests only): Brain 471, WEAK send-out cry, Scene ON voluntary / opponent mid-battle.
  Flow mismatches listed in the doc (MAGNETON ON player side 1 frame early; BGM-to-tray gap 348..374 across labs, engine 359).
  Worker: typecheck, build, build:lib 0; smoke 448; 17 files 233 tests; differential 28 traces 7,175 identical. Supervisor: 4 audio
  files 197 / 197.
  Supervisor differential over all 211 traces vs `de7557c52`: **38,532 / 38,532 identical**.
- **Folded:** aud241b (S11 step 5, second slice; `docs/aud241b-battle-sounds.md`; branch `worker/integration-20261104-231007`):
  `src/engine/battleHitSounds.ts` emits effectiveness SEs 12 / 13 / 14 (pan by target side), SE_FAINT, the FAINT-mode cry (duck +
  restore; restore length measured for 15 species, fitted for the rest, `src/data/faintCryFrames.ts`) and the low-HP loop
  (SE 90 start on a red bar, real stop on faint). ROM windows (step mode, ON + OFF): opponent / player faint (all deltas 0),
  super-effective, low-HP, low-HP then faint, 14 faint-cry lengths. Deltas recorded, not fixed: ISSUES #197. Not proven: the
  `battle-window{,-off}` RHYDON / GOLBAT fixtures (no engine staging; ROM facts pinned only), switch-in low-HP call, non-hit hp.
  Worker: typecheck, build, build:lib 0; 22 files 887 tests + 7 appTrace importers 90; differential 28 traces identical.
  Supervisor: 4 audio files 316 / 316; differential 211 traces vs `ccdfe68d3` **38,532 / 38,532 identical**.
- **Folded:** frs247 (handoff 4b(d), Kyle's white flash; `docs/frs247-faint-replacement-reshow.md`; branch
  `worker/integration-20261105-005010`): `renderBattleResolutionForcedPartySelect` blended the reshow toward white and drew the
  player ball tray; the ROM reshow is a brightness DECREASE (`BeginHardwarePaletteFade(0xFF,0,16,0,1)`) and flags 1 skip the player
  summary. Now `mgbaDarkenColor` with the same BLDY ramp, tray removed (`PARTY_SENDOUT_SUMMARY_TRAY_END`, view `partyStates` gone).
  ROM dense frames, 9 species x 2 scenes + a two-faint battle: the 15 fade rows (e56..70) went 576,000 px -> 0 in every window;
  later residuals unchanged (OFF ball / release ~300k px, pfr192). Fixture `tools/integration/fixtures/frs247/rom-frames.json` +
  `tests/frs247FaintReplacementReshow.test.ts` (10 / 12 fail on the parent). Re-pinned `battleResolutionPresentation.test.ts`
  (view shape). Worker: differential 211 traces identical (no trace covers this return); census 0..999 both scenes 1000 / 1000
  identical vs go246 baseline; 183 importing files 2,660 tests; typecheck, build, build:lib 0. Supervisor: the 2 files 51 / 51.
- **Folded:** cln240 (finish plan Cleanup 5, first half; `docs/cln240-test-gate.md`; side branch `worker/side-20261105-022936`):
  `npm run test:gate` = `vitest.gate.config.ts` over `tools/test/test-gate.list` (364 files, 2,928 tests: all of test:smoke, named
  families, the cheapest importer of every src dir / large module, then a greedy coverage fill under 160 s summed test time),
  generated deterministically by `tools/test/generateTestGate.ts` from `tools/test/gate-durations.tsv` (`--check`), pinned by
  `tests/testGateSelection.test.ts`; `npm test` unchanged; AGENTS.md test tiers updated. Worker: 2 runs 218 / 217 s wall.
  Supervisor: 364 / 364 in 217 s, and again on `bc74a02d3`. Frame-pin deletion candidates listed in the doc (unverified; a later step).
- **Fixed by the supervisor (`bc74a02d3`):** the wind-down suite failed only `battlesceneSplitEligibility` (function-kind eligible
  pool 1, pinned 0): aud241a's pure `ballTraySoundTicks` in `battleScene.ts`. Moved to `battleStartSounds.ts` (the four tray tables
  exported). Split / aud241a / aud241b / sink / battleScene tests 361 / 361; typecheck, build, build:lib 0; test:gate 364 / 364.
- **Cleanup step 4, first half (supervisor):** `git subtree split -P workspace/core-rs -b core-rs-archive` -> local branch
  `core-rs-archive` `26ce8d051` (194 commits; tree `f35070e69` == `master:workspace/core-rs`). No tree change. The user pushes it
  to its own repo; the `git rm -r core-rs` half is next.
- **Scouts saved (read-only, unverified):** `docs/obr248-scout.md` (handoff 4b(e): ROM bar slides in 20 f, holds 100 f to the
  first glyph, fades 16 f, one SE_BALL_TRAY_ENTER, mirrored ball order; ours static 26 f; fix adds ~99 app frames per opponent
  replacement, kernel digest unchanged), `docs/aud241c-scout.md` (battle-end sounds map).
- **Folded:** aud241c-fx (evidence only; `docs/aud241c-fixtures.md`): six step-mode ROM fixtures
  `tools/audio/fixtures/aud241c-{win,loss,brain}-{on,off}-window.json` + labs `tools/battle-lab/aud241c-*`. Win: BGM 412 at
  dismiss+22, fade P+6, BGM 469 P+53, SE_EXIT P+79, heal P+201; loss: fade 476 P+6, same tail; Brain: 354, 469 at P+52, no
  SE_EXIT, fanfare 466 P+219; ON == OFF from the dismiss on. Supervisor: audioProbeFixtures + testGateSelection 306 / 306.
- **Folded:** aud241c (S11 step 5, last slice; `docs/aud241c-battle-end-sounds.md`; branch `worker/integration-20261105-050415`):
  `src/engine/battleEndSounds.ts` (tick() hook): SE_SELECT on each "fainted!" / terminal box dismiss, win victory BGM 412 (Brain 354)
  at dismiss+22 with the low-HP stop if playing, end fade P+6, BGM 469 P+53 (Brain P+52), SE_EXIT P+79 (none for Brain); loss
  SE_BALL_OPEN dismiss+24, fade 476 P+6, same tail. All six aud241c ROM windows: every delta 0. Generated-orchestrator route only
  (canonical battleScene route not wired). Gaps in the doc: our "fainted!" box is dismissable at F+30 vs ROM F+43 / F+46; the
  Explosion self-faint +18 victory gap; Brain loss unmeasured. Worker: typecheck, build, build:lib 0; test:gate 364 / 364; 66
  importing files 1,106 tests; differential 26 traces 9,615 identical. **S11 step 5 (aud241) is complete.**
- **Wind-down gates** (`sv-20261104/gates-final/`, src `fef00b6c5` = final src minus the move above): typecheck 0; build 0;
  **full suite 1,792 files: 1,747 passed + 44 skipped, 1 failed (the ratchet above)**, 14,685 tests passed; play:random 4 min /
  scene: ON 23 battles / 9 swaps, OFF 35 / 16 (max streak 7); `--lobby-new-challenge` 2 min / scene: 0 page errors / overlays /
  contained / divergences; varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; vanilla 0:20 Scene ON
  **20 / 20**, Scene OFF **20 / 20** (all `budget`); Scene ON full vary-rng 0:16 `--render-every 8` **16 / 16** (all `budget`); Scene ON
  winning first-round 0:6 `--render-every 1` **6 / 6**. The 0:60 gates were not run (hours each here).

- **Next:** handoff "Next work": aud242 (move-animation SEs) is the next audio step; 4b(e) opponent replacement ball bar
  (`docs/obr248-scout.md`); cleanup 4 second half (`git rm -r core-rs`); ISSUES #196 / #197.
- **Housekeeping:** evidence `sv-20261101` deleted (older than the last three runs); ~25 GB free. No R2 remote on this host.
- **Notes:** no DEFERRED items. No push. Worker branches (all merged, deleted; commits reachable from master):
  integration-20261104-213051 (aud241a), -231007 (aud241b), -20261105-005010 (frs247), side-20261105-022936 (cln240),
  integration-20261105-045548 (aud241c-fx), -050415 (aud241c); two read-only scouts (no commits). New local branch
  `core-rs-archive` (keep; for the user to push to its own repo).

---

## 2026-11-03 / 04 — CAX31 daily run (supervisor, Opus 5.5): wind-down: aud240c / cln239 / aud240d / go246 / qak248 / qak249 folded

- **State:** master `07123061b`+ clean, src == qak248 fix `127def5d4` (suite + build green on it; the soak / play gates ran on src `710424ca8` = go246 merge). Evidence `.integration/validation/sv-20261103/`.
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
- **Folded:** aud240d (S11 step 4d, last screens slice; `docs/aud240d-script-sounds.md`; branch `worker/integration-20261104-000400`):
  extractor follows std msgbox scripts + shared call targets (adds MUS_OBTAIN_B_POINTS 459, SaveBattle SE_SAVE; regeneration test
  passes); write-only emitters for the post-win heal (MUS_HEAL fanfare + BGM stop / continue — new SoundEvent kind `continue`),
  PreBattleRoom record SE_SELECT / SE_SAVE, Lobby loss / won terminals (page SEs, BP fanfare, SE_SAVE), Brain heal SE_POKENAV_CALL
  (pinned as a 163-tick spacing only, absolute frame unmeasured). 5 fixtures: heal ON, record / loss / seventh-win OFF lab, Brain
  setup spacing. Supervisor re-probed `heal-window` on the ON oracle: 3 / 3 events equal. Not emitted (unmeasured):
  MUS_OBTAIN_SYMBOL, PauseChallenge SE_SAVE; battle-return BGM / SE_EXIT measured and left to aud241. Worker: typecheck, build,
  build:lib 0; differential 905 / 905 identical (3 standard + 2 lobby traces); importers 362 tests. Supervisor: 5 audio files 151 / 151.
- **Folded:** go246 (handoff 4b(a) remainder, Kyle's SPOINK; `docs/go246-intro-wait.md`; Opus worker, branch
  `worker/integration-20261104-013811`): the Scene ON battle-start intro now waits for the opponent's front animation before
  "Go!" and the player's back animation before the first menu (`generatedIntroOpponentAnimHold` / `generatedIntroPlayerAnimHold`
  in `battleResolutionPresentationRender.ts`, intro-local holds, no canonical-tick constant changed); Scene OFF holds are 0
  (OFF oracle: cry-only timeline). SPOINK was cut short by 137 frames; its window (seed 8, GRIMER vs SPOINK, ON oracle) went
  318,460 / 585,343 -> **132 / 0 px** (opponent / player mon) — supervisor reran it: 132 / 0 / 8,273. bso226 WAILMER / SPINDA
  need no fitted lag any more. Census 0..999 both scenes vs `vis243a` baseline: 0 bad, 1000 / 1000 identical (rows start after the
  intro; 918 ON battles get a hold, +53,941 frames). Differential 211 traces identical. bso226 harness restored from `4f6fa87e4^`.
  The worker reported "no pins re-pinned"; the wind-down suite found 2 (below).
- **Fixed by the supervisor (`f40d5cea6`):** the wind-down suite failed only `sc106StatsChangeCommand` (4) and `sgl138SeGateLive`
  (4), each by exactly the route battle's intro hold computed per seed with the two helpers (sc106 seeds 0 / 6 / 10 / 13: +106 /
  +61 (+1 parity) / +65 / +118; sgl138 receipt regenerated: 0-on +106, 9-on +86, 19-on +12, 808-on +88; anchors, OFF and summary
  unchanged). Both files green (11 / 11, 6 / 6).
- **Scout saved:** `docs/aud241-scout.md` (battle controller sound map + proposed split; read-only worker report, unverified).
- **Wind-down gates** (`sv-20261103/gates-final/`, src `710424ca8`): typecheck 0; build 0; **full suite 1,787 files: 1,741 passed +
  44 skipped, 2 failed (the re-pins above)**, 14,458 tests passed; play:random 4 min / scene: ON 23 battles / 9 swaps, OFF 35 / 16
  (max win streak 7); `--lobby-new-challenge` 2 min / scene: 1 + 3 new challenges; **0 page errors / overlays / contained /
  divergences**; varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; vanilla
  0:20 Scene ON **20 / 20**, Scene OFF **20 / 20** (all `budget`); Scene ON full vary-rng 0:16 `--render-every 8` **16 / 16** (all
  `budget`); Scene ON winning first-round 0:6 `--render-every 1` **6 / 6**. The 0:60 gates were not run (hours each here).
- **Evidence:** qak247 (`docs/qak247-clip-sweep.md`, evidence-only worker): opponent Quick Attack / Aerial Ace used the PIDGEOTTO
  74-row clip on the live field; the ROM has none (trace clone is a plain OBJ, `battle_anim_utility_funcs.c:243-246`,
  supervisor-read); 160 = 0 px on 87 / 88 runs (worst at 74: SLAKING AA 175 px, TROPIUS 124, RAIKOU QA 106). New ISSUES #194
  (RATTATA QA residual above the clip row, not the clip), #195 (aud240c's two party-menu flow gaps).
- **Fixed by the supervisor:** qak248 (`127def5d4`): the two live clips are 160 (staged path unchanged). Typecheck 0; Quick Attack /
  Aerial Ace / fast-contact / sceneOn / Agility-clip / later58 tests 64 / 64; supervisor rendered SLAKING / TROPIUS AA vs qak247's
  ROM frames: 0 px (were 175 / 124). Render-only: the soaks above (logic) are unaffected; full suite + build on `127def5d4`:
  build 0, **1,787 files: 1,742 passed + 44 skipped, 1 failed** = `substituteDollDefenderLive` now finds `prep38-quick-attack-opponent`
  row 9 exact (its documented 1 px PERSIAN residual was this clip; residual dropped, file 60 / 60). No standard trace or census change expected (no hermetic receipt added yet: follow-up).
- **Folded:** qak249 (test-only): hermetic ROM receipts `tools/compare/fixtures/{aerial-ace-opponent-slaking,quick-attack-opponent-raikou}-player-onix.json`
  (two fresh probes each, identical) + `tests/animation/quickAttackAerialAceOpponentClip.test.ts`. Supervisor: 4 / 4; with the 74 clip
  restored 2 fail (9 rows each, = qak247); smoke 448 / 448 on master.
- **Next:** handoff "Next work": aud241 (scout `docs/aud241-scout.md`), cleanup step 5 / 4, bundle hygiene, ISSUES #194 / #195.
- **Housekeeping:** evidence `sv-20261031` deleted (older than the last three runs; 2.8 GB); 27 GB free. No R2 remote on this host,
  so `tools/backup-logs-to-r2.sh` was not run.
- **Notes:** no DEFERRED items. No push. Worker refs (merged; names moved to `refs/archive/worker-merged-20261104/`, restore with
  `git branch <name> refs/archive/worker-merged-20261104/<name>`): integration-20261103-213048 (aud240c), -224443 (cln239),
  -20261104-000400 (aud240d), -013811 (go246), -044203 (qak247), -062420 (qak249); -032754 (aud241 scout, no commits, deleted).

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
