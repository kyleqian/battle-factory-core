# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-02 / 03 — CAX31 daily run (supervisor, Opus 5.5): in progress

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
---

## 2026-10-31 / 11-01 — CAX31 daily run (supervisor, Opus 5.5): wind-down: library package / pmo239 / audio design + probe folded

- **State:** master `b8cf38262`+ (src == `da19bc407` pmo239 merge; later commits are docs + `tools/audio` + one hermetic test). Library fold `f88653929` (fast-forward of `fold238`): core library package (contract v2) + the Mac's `worker/lib-v2-mac`
  tip `b7e7dc345` (fsw235 forced party menu three-slot cursor + WIN_MSG refusals, wth236 Scene ON end-of-turn weather animations,
  the 11 re-pins, pmd237 party-card HP / fainted palettes / CANCEL highlight). Handoff "Next work" item 1 is DONE.
- **lib235** (branch `worker/integration-20261031-214213`, tip `60e816c2a`; `.integration/validation/sv-20261031/lib235-evidence/`):
  ENGINE_BUILD is a content hash of an in-memory headless build (`eb-<16 hex>`, `"dev"` outside builds; stable across rebuilds and
  docs / test / renderer-only edits, moves on a headless-graph change; `tests/engineBuildHash.test.ts`); lib-types parity test;
  contract audit: no mismatch (extras additive; `trace()` returns finished runs only, documented). Sizes: headless 22.3 MB raw /
  2.0 MB gz (largest chunk 11.8 MB, sprite pixels via `battleCommandFieldArt` = bundle hygiene), browser lib 40.2 / 3.4 MB, every
  file < 20 MB; a consumer app needs the documented `manualChunks` recipe (default Vite build = one 33 MB chunk). npm pack + scratch
  Vite app: both entries import, `replayChallenge` runs in node, Chromium mount gets `ready`. Soaks: winning vary-rng carry 0
  0:100 **100 / 100**; Scene ON full vary-rng 0:16 render-8 **16 / 16** (budget). A first lib235 launch was stopped at 21:50 when the
  Mac moved its branch; fsw237 (a fix step for the then-red suite) was stopped at 00:27 when the Mac pushed the same fixes — no edits.
- **Supervisor gates on the exact folded tree `f88653929`** (`sv-20261031/fold238-evidence/`): typecheck 0; census 0..999 both scenes
  byte-identical to lib235's; lib235's census vs master `snd233` baseline: OFF 10 / 10 shards identical, ON 997 / 1,000 digests
  identical, 330 battles pure insertions of 1,986 weather `general-animation` commands, seeds 434 / 796 / 881 budget-truncated
  (prefix of master's stream minus the weather commands, supervisor-verified); differential vs master: fight-submenu +
  presentation-rng identical, battle1-postwin 216 frames 23800..26009 changed (the party-menu window; f25800 eyeballed: correct
  fainted palettes and "0/117", MAGBY now 0 HP as it should be); **full suite 1,726 files / 14,260 tests, 0 failed** (a first run
  was OOM-killed beside a worker's vitest; rerun clean); build 0; build:lib 0; play:random 3 min / scene: ON 8 battles / 6 swaps,
  OFF 27 / 10, **0 page errors / overlays / contained / divergences**.
- **New:** ISSUES #190 (party cards print "Lv50" where the ROM shows the FNT / status icon).
- **Folded:** pmo239 (merge `da19bc407`; branch `worker/integration-20261101-002825`; `sv-20261031/pmo239-evidence/`): party menus
  list rows in the ROM's battle order (SwitchPartyOrder on every player switch-in: voluntary, forced send-out, Roar / Whirlwind;
  battle start = active first, then ascending), both menus and scenes; the cursor opens on row 0 (the active mon / the fainted mon).
  Kernel keeps raw indexes. Post-battle party / swap screens stay in raw order (source-read only). Oracle: voluntary 0 -> 2 switch
  then reopened menu, capture frames 888 -> 0 px; a one-frame-early menu entry remains (non-capture frames 1,920 -> 1,467 px; timing
  class); the forced case is ROM-observed (SHEDINJA probe) + Tier-1, no pixel proof (harness maxHP, ISSUES #146 shd234). Census both
  scenes identical 1,000 / 1,000 (commands + digests; supervisor-verified); differential: only battle1-postwin's second forced menu
  (216 frames, now MAGBY / ONIX / BAYLEEF = ROM [1,0,2]; eyeballed). Worker: typecheck 0; full suite 8 shards 14,276 passed / 0
  failed (shards 1-6 on `7f06071c8`, 7-8 on `ecf05802b`; the 12 soak-importing files rerun on `ecf05802b`); build 0; play:random 3 min /
  scene 0 errors; open-on-active replay check 192 voluntary + 44 forced menus, 0 problems. Soak pins re-rolled: #89 Baton Pass halt
  seed 739 -> 19 (pin weakened: `frames > haltFrame` bound dropped, every hit now halts in the post-decision grace window), M-B (c)
  seeds 0 / 1 new frames, #104 (b) winning seed 3 -> 2. Supervisor on master: 6 focused files 111 / 111.
- **Folded:** aud236 (S11 audio design, `docs/s11-audio-design.md`; accepted, open questions decided in its last section) and aud237
  (probe step 1, `b8cf38262`): `tools/audio/soundEventProbe.py` logs `(frame, kind, id, pan)` per sound by single-stepping the PC onto
  `m4aSongNumStart` / `PlayCryInternal` / the SE / BGM / fanfare wrappers + fade / volume / stop / continue hooks (libmgba-py has no
  debugger); fixtures draft, battle ON / OFF, intro ON / OFF; Scene OFF drops only the move-animation SEs and is its own timeline;
  hybrid fast mode (RAM signature, re-step changed frames) byte-equal to stepping on all 5 fixtures, 11-13x vs the new 2.9x-faster
  stepper (32-38x vs the original; the 20x target vs the new stepper is NOT met); one unexplained 5-byte RAM mismatch at f2096 on
  the full battle-1 trace, then EXPLAINED by aud238a (`a29d8df38`): CPU-stack bytes 0x03007d40..4c (above linked IWRAM end
  0x030078ac, supervisor-checked in the map) from `run_frame` vs stepping stopping 1-2 instructions apart mid-`push`; one-instruction
  catch-up leaves 0 bytes; the probe now records the catch-up proof. Hybrid judged census-grade for effective events.
  `tests/audioProbeFixtures.test.ts` 27 / 27 (supervisor on master).
- **Wind-down gates on `a3c1e1642`** (src == final; `sv-20261031/gates-final/`): **independent full suite 1,728 files / 14,276 tests,
  0 failed**; build 0; play:random 4 min / scene: ON 20 battles / 8 swaps, OFF 36 / 17; `--lobby-new-challenge` 2 min / scene: 4 + 2
  new challenges from the Lobby; **0 page errors / overlays / contained / divergences**; varied-RNG first-round winning carry 0 / 14 /
  28 **100 / 100** each, winning-swap carry 0 **100 / 100**; vanilla 0:20 Scene ON **20 / 20**, Scene OFF **20 / 20** (all `budget`);
  Scene ON winning first-round 0:6 `--render-every 1` **6 / 6**; Scene ON full vary-rng 0:16 `--render-every 8` **16 / 16** (all `budget`, 1,535 s). The 0:60
  full / winning / winning-swap gates were not run (hours each here; same practice as earlier sessions).
- **Housekeeping:** evidence `sv-20261027`, `sv-20261028`, `apx215-census` deleted (older than the last three runs; 6 GB). Branch
  `worker/lib-v2-mac` is fully merged at `b7e7dc345`.
- **Next:** handoff "Next work": audio step aud238 (the sound-source table; the f2096 mismatch is explained), a cleanup step
  (cln237 brief ready), #190.
- **Notes:** no DEFERRED items. Worker refs kept (merged): `worker/integration-20261031-214213` (lib235), `-20261101-002825` (pmo239),
  `worker/side-20261101-044531` (aud236), `-20261101-052631` (aud237), `-20261101-064219` (aud238a). Stopped workers this run: lib235 first launch (21:42, Mac branch
  moved; its commit became the base), fsw237 (00:27, the Mac pushed the same fixes; no edits). No push.
