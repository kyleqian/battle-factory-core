# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-09 / 10 — CAX31 daily run (supervisor, Opus 5.5): wind-down: aud243d / abl261 / aip262 / dia263 folded

- **State:** master clean; final engine src == aip262 (`344dbf234`; later commits are docs / tools only). Evidence `.integration/validation/sv-20261109/`
  (gates in `gates/`). No DEFERRED items. No push. ENGINE_BUILD at the final src `eb-16ee24851bfb26a3` (moved this run: abl261, aip262; tell the website).
- **Folded:** aud243d (integration, ~50 min; `docs/aud243d-rom-driver.md`): closed-loop ROM driver (`tools/audio/romDecisionDriver.py`, `soundEventProbe.py lab
  --drive`, `romDriveSeed.sh`) replays the engine's decision list on the ROM by menu state to battle end; first sound segment diff (`soundSegmentDiff.py`).
  Supervisor reran seed 8 ON (6 / 9, same divergence frame) and read the ability map (4 ids). Found #202 / #203.
- **Folded:** abl261 and aip262 (entries below; supervisor full suites on each final tree, `gates/suite1.log` 1,752 passed and `gates/suite2.log` **1,753 files passed
  + 44 skipped, 0 failed, 14,433 tests**).
- **Folded:** dia263 (integration, diagnosis only, 65 min; `docs/dia263-leads.md`): #205 was a driver bug (party-menu slot through `gBattlePartyCurrentOrder`, fixed in
  tools); #206 root cause (type table row order); #204 ranked (`gender` first); new #208 (Reflect / Light Screen not passed to the live damage calc). Supervisor read
  both src sites (`applyTypeEffectiveness` loops defender types; screens only on the Future Sight path). Seeds 21..40: 11 full match, 8 diverge (per issue in the doc).
- **Unmerged, kept for the next run: dmg264** (#206 type-table row order + #208 Reflect / Light Screen; branch `worker/side-20261110-045211` `aba497135`, base
  `336e03b3b`; `docs/dmg264-type-order-screens.md` on the branch; evidence `sv-20261109/dmg264/`). Killed at its 95-min cap: ROM seeds 13 / 28 now match to battle
  end and the aligned set still matches; census 0 unexplained, BUT changed sets differ by scene (ON 190 vs OFF 181; earlier fixes were identical) -- explain this
  first. Its last full suite had a Razor Wind census-seed test with no unchanged re-stage seed found (reverted, unresolved); build / build:lib / soak not run.
  Next run: rebase or merge onto master, resolve the scene difference and that test, full suite + build, then fold.
- **Gates** (on aip262's src): build / build:lib 0; play:random 2 min / scene: ON 8 battles / 6 swaps, OFF 15 / 6, 0 page errors / console errors / overlays;
  vanilla 0:20 OFF **20 / 20**, ON **20 / 20** (all `budget`); 0:60 default **60 / 60**, winning **60 / 60**, winning-swap **60 / 60**; varied-RNG first-round winning
  carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**.
- **Next:** handoff "Next work" 1: the ROM-driver gameplay fixes (finish dmg264 #206 + #208 from its branch, then #204 `gender`, #207), then seeds 41..80, then the sound segment diff.
  Bundle bnd257d (lazy sprite chunk; brief ready in the handoff's bnd-d line, scout `docs/bnd-d-scout.md`) and Cleanup 7 did not fit this run.
- **Coverage notes:** abl261 dropped 3 sag130 classes and aip262 the apx222 Peck 64 row (no unchanged census seed carries them; regenerate seg127 `exposure.json`
  from the new census to restore). One Castform body in battle 950 now declines (cf78 comment).

---

## 2026-11-10 — aip262 (ts lane worker): live AI view fills `usablePartyMons`; ISSUES #203 fixed (removed)

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-43a8872b3b6234fe` -> `eb-16ee24851bfb26a3` (tell the website). `docs/aip262-usable-party-mons.md`.
- **Did:** `countUsablePartyMons` (`factoryAiLiveDriver.ts`, C `battle_ai_script_commands.c:1292-1334`) fills both AI views, so Baton Pass / Explosion / Memento / Roar score on real counts.
  `tests/aip262UsablePartyMons.test.ts` (6; fail unfixed). ROM: seed 2 ON 23/23, aligned set still full, fresh seeds 9..20: 8 match fully, 4 lead divergences (not this bug). Census 0..999: 97 changed seeds,
  identical ON / OFF, 0 unexplained (`aip262Instrument.py` / `aip262Classify.py`). 9 re-pins (coverage loss: apx222 Peck 64 row). Gates: typecheck / build / build:lib 0, soak vanilla 0:20 OFF 20/20; full suite in 6 shards on the final tree 14,433 passed, 0 failed.
- **Next:** ISSUES #204 (unfilled AI view fields, gender), #205 (Roar `SwitchPartyOrder`), #206 (Fire Punch 46 vs 45), #207 (confusion self-hit hold items).
- **Notes:** the worker's scene-ON soak timed out; the supervisor ran it on this tree: vanilla 0:20 ON 20 / 20 (session entry above).

---

## 2026-11-10 — abl261 (ts lane worker): one full ability id->name resolver; ISSUES #202 fixed (removed)

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-b885d2de87ddf075` -> `eb-43a8872b3b6234fe` (tell the website). `docs/abl261-ability-damage.md`.
- **Did:** `src/engine/abilityNameById.ts` (from `ability-item-hooks.json`) replaces the 4-id map in the hit chain; Huge / Pure Power, Thick Fat, Plus / Minus, Marvel Scale and the
  Overgrow / Blaze / Torrent / Swarm pinch now reach CalculateBaseDamage; confusion self-hit sees the live ability; WEATHER_HAS_EFFECT counts Cloud Nine + Air Lock with the hp test.
  `tests/abl261AbilityDamage.test.ts` (10; 7 fail unfixed). ROM: seeds 6 / 8 ON now 16/16 / 9/9, the 14-run aligned set still full. Census 0..999: 179 seeds change in
  both scenes (same set), 0 unexplained against the unfixed observation tree (`abl261Instrument.py` / `abl261Classify.py`). Gates: build / build:lib 0, soak vanilla 0:20 ON and OFF 20/20,
  full suite in 6 shards green after 5 re-pins (scene parity 467 -> 466, orchestrator seeds 7 / 16, cf78 battle 950, sag130 re-staged with a 3-class coverage gap).
- **Next:** ISSUES #203 (AI usable party count). Follow-ups: regenerate seg127 `exposure.json` from the new census (restores 3 sag130 classes); one Castform body in battle 950 declines.
- **Notes:** report-only: confusion self-hit calc has no hold-item inputs; Future Sight's Plus / Minus field list has an hp filter C lacks.
- **Supervisor verify:** reran `romDriveSeed.sh 8 on` before the fix (6 / 9, same divergence frame); read the classifier report (179 / 179 changed, 0 unexplained);
  re-pin diffs read; ONE full suite on the final tree `2e5b0cc13` (`sv-20261109/gates/suite1.log`): **1,752 passed + 44 skipped, 0 failed; 14,428 tests**. New census
  baseline: `sv-20261109/abl261/census/{on,off}-6dce29c5d` (src unchanged to HEAD).

---

## 2026-11-08 / 09 — CAX31 daily run (supervisor, Opus 5.5): wind-down: aud243a / bnd256c / aud242g / cln244 / aud243b / aud243c / sub260 / sum259 folded

- **State:** master clean, no active workers; final src == `1613c285a` (bnd256c install fix). Evidence `.integration/validation/sv-20261108/`
  (gates in `gates/`). No DEFERRED items. No push. ENGINE_BUILD at the final src `eb-b885d2de87ddf075` (moved this run: aud243a, bnd256c,
  aud242g, sub260, sum259; tell the website). Baseline at start: src unchanged since the last full suite (`23a641cb4`), receipts reused.
- **Folded:** aud243a (S11 step 7 first half; branch `worker/integration-20261108-213051`, 102 min; `docs/aud243a-sound-census.md`):
  `tick()`'s post-tick sound block moved verbatim into `emitTickSounds` (`src/engine/tickSounds.ts`); `lsd194Census.ts` writes per-seed
  `sound` / `soundDigest` / `soundAnim` (null on older trees); `tools/integration/soundCensusDelta.py` (arm-vs-arm and `--t1`). T1 0..999
  Scene ON (self-consistency, NOT ROM parity): exact 236,527, missing-gated 14,353, cry-task 240, other 400, extra 0, unclassified 0;
  Scene OFF 0 move-anim sounds. ENGINE_BUILD `eb-7b7399877f107136` -> `eb-808efc83d08831db`. Worker: typecheck / build / build:lib 0,
  full suite (8 shards) 1,746 passed + 44 skipped, 0 failed; 40-seed old-vs-new rows identical once the 3 new fields drop. Supervisor:
  `rst197CensusDelta.py` vs `sv-20261106/obr251-evidence` 1000 / 1000 identical both scenes (ON 322,634 / OFF 317,269 commands); the
  `core.ts` diff is a verbatim move. New census baseline: `sv-20261108/aud243a/full/{on,off}-858ea0343`.
- **Folded:** bnd256c (bundle hygiene bnd-c; side branch `worker/side-20261108-231401`, 69 min; `docs/bnd256c-pixel-provider.md`): sprite
  pixels leave the headless graph through a provider (`src/engine/monPicPixels.ts`; `monPicPixelsInstall.ts` statically imported by `lib.ts`
  only, plus `tests/setup/monPicPixels.ts` and 290 render tools); `speciesPic` / the Transform branch read `tileset` / `frame2` lazily.
  `dist-lib` headless 22.5 -> 10.7 MB raw (2.14 -> 1.19 MB gzip), `assets-sprites` an empty 1-byte stub; browser unchanged (chunk split =
  bnd-d). ENGINE_BUILD -> `eb-01603ce9f24e6eec` (tell the website). Worker: typecheck / build / build:lib 0; full suite (6 shards) 1,747
  passed + 44 skipped, 0 failed; built-headless replays of 4 battle traces digest-identical; differential 38 traces 7,561 / 7,561 identical.
  Six verifier source-hash pins re-pinned for the import line. Supervisor: `chunks-headless` 7.59 MB measured; census seeds 0..19 both
  scenes with the install line stripped (no pixels at all): 40 / 40 rows identical to the aud243a arms, 0 errors.
- **Folded:** aud242g (S11 step 6, seventh slice; branch `worker/integration-20261109-002442`, 35 min; doc section 11): C-cited lifetimes
  for SetPsychicBackground (instant), Tri Attack triangle 81, water bubble D + 23, SwayMon (simulated), Thunderbolt orb, Spark flashing.
  Level-50 emitted 674 -> 692 (gated 160 -> 142), all resolved 868 -> 894. ROM windows Dream Eater +1, Tri Attack / Bubblebeam /
  Thunderbolt +2 (ISSUES #198). Census T1 0..99 ON: exact 24,430 -> 24,616, extra / unclassified 0. ENGINE_BUILD -> `eb-52789eb6d9c84998`.
  Worker: typecheck / build / build:lib 0, test:gate 362 / 362, differential 10 Scene ON traces 1,047 identical. Supervisor: table
  regenerated byte-identical; aud242d / e / g 37 / 37.
- **Folded:** cln244 (Cleanup 5 remainder; side branch `worker/side-20261109-010053`, 44 min; `docs/cln244-dive-incremental.md`):
  `hardwareOrderAtAge` in `src/animation/dive.ts` extends a cached track (key: JSON digest of every `diveAtAgeRaw` input, LRU 32) instead
  of re-simulating from tick 0 per row. `liveDiveAttackAdapter` 196 -> 16 s, `liveDiveSetupAdapter` 100 -> 9 s; full suite (5 workers,
  unsharded) 17.1 min: 1,749 passed + 44 skipped, 0 failed (target < 15 min not met; next: `summaryAllFactorySpecies` 134 s,
  `substituteDollDefenderLive` 80 s, spread over shared sprite-order code). ENGINE_BUILD unchanged. Worker: reference test vs a verbatim
  copy of the old code (40 configs, all ages, random order); census r0 100 / 100 both scenes; differential 3 traces 827 identical.
  Supervisor: reference + both Dive adapters 20 / 20.
- **Folded:** aud243b (S11 step 7 second half, Phase 1 gate; branch `worker/integration-20261109-014605`, 15 min; `docs/aud243b-rom-replay.md`):
  **gate FAILED, stopped as briefed.** Tools committed (`soundEventProbe.py lab --setup-out`, `soundCensusRomReplay.ts` request / replay /
  scan, `romStateTimeline.py`, `romTurnNumber.py`). Seed 224 ON: parties and the first action-menu `gRngValue` align, but the first opponent
  move differs (ROM Scary Face, engine a damaging move); ROM `gRandomTurnNumber` sits 7 draws before the menu (engine 0) on 4 seed / scene
  runs. Supervisor's lead: the lab stages streak `challengeNum*7` (14 -> AI_SCRIPT_CHECK_BAD_MOVE) while the replay engine may build at streak
  0 (mask 0). Diagnosis rebriefed to Opus as aud243c (no src/ change allowed in that step).
- **Folded:** aud243c (Opus; branch `worker/integration-20261109-020226`, 18 min; `docs/aud243c-alignment.md`): **the census ROM replay
  aligns.** The ROM's action-menu `gRngValue` is post-AI (turn number, 2 ShouldSwitch, 4 simulatedRNG, 1 tie-break draws run while the menu
  is open; the engine spends the same 7 at commit, outcome-neutral). Mask hypothesis refuted (both sides mask 1 / 7). Replay now aligns on
  `gRandomTurnNumber`; turn 1 matches (HP + RNG) on 224 ON / OFF, 552 ON, 177 ON; 224 / 552 through turn 2 and the forced switch; frame-timed
  inputs drift after the first faint (next: a ROM-side semantic input driver). New tool `tools/audio/romAiDecision.py`, `compare` mode.
  **Found an engine bug** (seed 177 turn 2): `Cmd_datahpupdate` does not clear HITMARKER_IGNORE_SUBSTITUTE in its no-substitute branch
  (`battle_script_commands.c:1895`), so after Leftovers (`BattleScript_ItemHealHP_Ret` orword, `battle_scripts_1.s:4381`) the next turn's
  first attack bypasses Substitute. Supervisor checked both C sites and the engine handler (only IGNORE_BIDE / PASSIVE_HP_UPDATE cleared).
  ISSUES #201; fix briefed as sub260.
- **Landed:** sub260 (ts lane, authorized gameplay correction, ISSUES #201 removed; 117 min; `docs/sub260-ignore-substitute.md`):
  `Cmd_datahpupdate` clears HITMARKER_IGNORE_SUBSTITUTE in its no-substitute branch (`battle_script_commands.c:1895`); audit of every C set /
  clear site found no other wrong one. **Census 0..999: the same 13 seeds change in ON and OFF** (26, 164, 177, 186, 221, 391, 418, 506, 564,
  587, 649, 881, 961), each one exactly a stale-bit hit on a Substitute holder (origins Leftovers 12, Leech Seed 1), 0 unexplained; an unfixed
  instrumented tree reproduces the baseline 1000 / 1000. ROM proof seed 177 ON: turn 2 now 11 / 165, RNG 2525390639, last moves [213, 247] ==
  ROM (was a player KO). `tests/sub260IgnoreSubstitute.test.ts` (6; 4 fail unfixed); `battleScriptSetsubstituteOpcode` re-pinned (bit 0 after
  the script's own datahpupdate). ENGINE_BUILD -> `eb-12d5aa7535f49c46` (tell the website). Worker: typecheck / build / build:lib 0,
  test:gate 0, vanilla 0:20 20 / 20, full suite 6 shards green except `substituteSwapAttdollCells` (its route relied on the bug).
  **sub260b** (10 min) re-pinned that test to seed 862 / streak 35 (scan of 0..999 x 7 streaks, `tools/integration/substituteToxicRouteScan.ts`);
  every assertion unchanged. Supervisor: C sites read; sub260 + setsubstitute tests 16 / 16; census classifier output read (both scenes).
  New census baseline: `sv-20261108/sub260/census`.
- **Landed:** sum259 (ts lane, ISSUES #192, 63 min; `docs/sum259-summary-flow.md`): (a) the draft cursor follows `gLastViewedMonIndex`
  after the summary closes (`sum259-draft-return-cursor` 113 / 113, `-reopen-after-return` 73 / 73 exact); (b) summary input ignored until
  open+63 (`gPaletteFade.active` outlives the visible fade by 4 ticks; B at +60 / +62 ignored, +63 closes, all three traces exact; test helpers
  settle at 63 instead of 59); (c) the swap summary does UP / DOWN over its 3 mons (clamp) and returns on the last viewed mon
  (`sum259-swap-summary-mon-change` 208 / 242: #188-class sprite frames, two frames of 18 / 68 px, ball shading 30036..30056 after a
  non-zero-cursor return; ISSUES #192). Worker: typecheck / build / build:lib 0, test:gate 362 / 362; differential 24 summary / party / swap
  traces vs `3ce21fcd6` 2,576 identical (before (c)). Soak canary, factoryLibrary and the battle differential were left to the supervisor
  (below).
- **Supervisor fixes at wind-down:** (1) the full suite on `4a7ccad9f` had 2 sum259 failures (1,749 passed + 44 skipped, 2 failed): five new
  draft traces lacked `appRoute` (added `generated-orchestrator`, the default they replay on; `sum259-input-ready-b60` still 84 / 84 vs the
  ROM) and `summaryAllFactorySpecies` MOVE_NONE settled at 59 ticks instead of the new open+63 gate (`b55a293ad`). (2) **bnd256c broke the
  browser build:** `package.json` `"sideEffects": false` let vite drop `lib.ts`'s bare `import "./engine/monPicPixelsInstall.ts"`, so
  play:random hit pageerror "mon pic pixels not installed" in both scenes (vitest / node run unbundled and never saw it). `lib.ts` now calls
  `installBundledMonPicPixels()` in `mountFactoryGameInternal`; ratchet updated (`1613c285a`). headless chunks still 7.59 MB.
- **Gates** (`gates/`): varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100** (on `b55a293ad`,
  engine src == final except `lib.ts`); vanilla 0:20 Scene OFF **20 / 20**, Scene ON **20 / 20** (all `budget`); play:random 2 min /
  scene seed 7 after the fix: ON 6 battles / 2 swaps, OFF 16 / 8, 0 page errors / console errors / overlays / contained / divergences;
  differential 5 battle traces vs `3ce21fcd6` (pre-sum259) 1,078 identical; typecheck, build, build:lib 0. The 0:60 gates were not run.
- **Final full suite** (`gates/suite2.log`, HEAD `1613c285a` == final src): **1,795 files: 1,751 passed + 44 skipped, 0 failed; 14,418 tests
  passed**, 17.3 min at 5 workers.
- **Scout:** aud243d read-only (`docs/aud243d-scout.md`, unverified): a closed-loop Python driver in the lab reads `gBattlerControllerFuncs[0]`
  (ELF-only local handler addresses) to detect the action / move / party menus, freezes the executed segments as the trace; 2-hour plan.
- **Next:** handoff "Next work": aud243d (ROM-side semantic input driver for the census replay, then the K >= 20 sound diff; each HP / RNG
  mismatch is a gameplay lead, as #201 was), more aud242 lifetimes (`docs/aud242g-scout.md`), al198a (`docs/al198-scout.md`), bnd-d,
  ISSUES #192 / #196..#200.
- **Notes:** worker branches (all merged, deleted): integration-20261108-213051 (aud243a), side-20261108-231401 (bnd256c),
  integration-20261109-002442 (aud242g), side-20261109-010053 (cln244), integration-20261109-014605 (aud243b), integration-20261109-020226
  (aud243c); sub260 / sub260b / sum259 ran in the main tree. Deleted evidence `sv-20261105`.
