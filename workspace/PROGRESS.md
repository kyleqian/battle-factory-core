# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-01 / 02 — CAX31 daily run (supervisor, Opus 5.5): IN PROGRESS — pmn238 / aud238 / cln237 folded, aud239 running

- **State:** master `c21f1e09f`+. Worker aud239 (S11 step 3, event type + sink) on `--lane integration`, launched 01:48, hard stop 04:45.
- **Folded:** Mac `worker/lib-v2-mac` tip `059579e32` (pmn238: the attendant's "The Nth match is next!" follows the battle number;
  7th match = "Finally, the 7th match is next!", +9 frames) as merge `d59e36b68`. Supervisor: typecheck 0; postwin +
  interactiveRouting 69 / 69; full suite 1,772 / 1,773 files reported, 14,305 passed, 0 failed (one fork died beside the aud238
  worker; the missing `battleScriptSnatchOpcode` reran alone 2 / 2) (`sv-20261101/gates-pmn238/`).
- **Folded:** aud238 (merge of `worker/side-20261101-213641`; `docs/aud238-sound-sources.md`): `tools/extract/extract-audio-sound-sources.ts`
  -> `src/data/gen/audio-sound-sources.json` (559 KB, not imported by src): 1,042 anim sound ops (873 / 97 / 48 / 2 / 22, exact),
  122 distinct ids over the three play ops (129 over all song ops; the design's 123 was a grep estimate, doc corrected), 59 C-side
  anim sites, 378 call sites, GetBattleBGM (all 300 Factory trainers MUS_VS_TRAINER 476, Brain 471), map music MUS_B_FACTORY 469
  (loop ticks 168..3720), 23 song loop structures. `tests/audioSoundSources.test.ts` 9 / 9 (incl. byte-for-byte regeneration;
  supervisor on master); supervisor grep matches the op counts and 122. Worker: typecheck 0, smoke 448 / 448, build 0.
- **Folded:** cln237 (cleanup step 1; merge `c21f1e09f`; `docs/cleanup-cln237-manifest.md`, list `docs/archive/cln237-deleted.txt`,
  tool `tools/cleanup/keepClosure.ts`): 2,103 of 28,419 files under tools/integration + tools/compare deleted (1,312 integration
  scripts, 456 integration fixtures, 208 compare scripts, 107 scratch, 15 evidence, 5 fixtures; 189,684 lines); kept tests read most
  fixtures by name, so the rest stays. Recovery: `git checkout 72c9d264c -- workspace/<path>`. Worker on the exact tree: typecheck 0;
  full suite **1,774 files / 14,316 passed, 0 failed**; build 0; differential 641 / 641; census both scenes 0..999 — supervisor `cmp`
  20 / 20 shards byte-identical to `pmo239-evidence/census/{on,off}-7f06071c8`; vanilla 0:3 ok; play:random 1 min ON 0 errors.
  Supervisor spot-check: deleted basenames appear in src only inside comments (the closure strips comments by design).
- **Next:** aud239 verify / fold; wind-down gates.

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
---

## 2026-10-30 / 31 — CAX31 daily run (supervisor, Opus 5.5): wind-down: cff230 / nch231 / cff232 / snd233 folded

- **State:** master `9670f00cc`+ (cff230 fast-forward; nch231 / cff232 / snd233 merges; src + tests == snd233 worker-tested `2cdc0b36d`).
- **Gate carried over from the last run, on `8d7916813` (src == pfb229 merge;
  `.integration/validation/sv-20261030/gates-8d7916813/`):** Scene ON `--policy full --vary-rng` 0:30 `--render-every 8` **30 / 30**
  (all `budget`); build 0; browser goal play 10 min / scene (seed 1): ON 30 battles / 13 swap screens, OFF 44 / 22, **0 page errors,
  0 overlays, 0 contained, 0 divergences**.
- **Folded:** cff230 (Castform weather forms, finish plan Phase 2 item 4; `docs/cff230-castform-forms.md`): Scene ON now draws the
  CASTFORM_CHANGE morph (the ROM's Transform mosaic ramp, form swap on body row 50, enemy shadow hidden rows 1..109, 117-row command);
  before it drew nothing and swapped the form at the next command. ROM windows, Castform box differing px total: ICE after Hail
  142,500 -> 0, WATER opponent after Rain Dance 125,327 -> 0, WATER send-in 98,040 -> 0. Ember by a rain / hail CASTFORM promoted
  approx -> live (`52:by:2`, `52:by:3`, dense 0 px windows). Worker: typecheck 0; full suite **1,716 files / 14,196 tests, 0 failed**;
  build 0; differential 641 / 641. Supervisor: OFF census shards byte-identical to `pfb229-evidence/census/off-c3a9fc037`; ON
  eventsDigest + error identical 1,000 / 1,000, only battles 603 / 643 / 651 / 950 changed (one morph command each; live 26,957 ->
  26,960); 3 touched test files 24 / 24 on master; rain strip eyeballed (ROM == ours). Found: the ROM plays the morph in Scene OFF
  too; ours does not (ISSUES #143 open line).
- **Folded:** nch231 (merge `6af3a1505`; branch `worker/integration-20261030-233859`; `docs/nch231-new-challenge.md`): in the free-roam
  Lobby, A facing the singles attendant ((4,8) facing north) starts a new challenge: fresh draft from the LIVE gameplay RNG cursor,
  presentation seed / scene / recorder kept, streak + rents reset per `InitFactoryChallenge` (battle_factory.c:208-212; a retire
  does not keep the streak either). Attendant dialogue / save prompt / door walk are skipped (documented divergence, untimed).
  Finding: a LOSS never reaches the Lobby on the app route — the record answer already auto-chains into the next challenge; only
  RETIRE-YES lands there (the old handoff line "no new-challenge path after a loss" was wrong). Opt-in `--lobby-new-challenge`
  on the soak and play:random (default results unchanged). Worker: typecheck 0; census both scenes byte-identical to cff230's
  (supervisor `cmp` 20 / 20 shards); differential 641 + 3,713 lobby / terminal captures identical; play:random flagged 4 min /
  scene: 2 new challenges each, 0 page errors; full suite **1,718 files / 14,208 tests, 0 failed**; build 0. Supervisor: the 3
  touched test files 21 / 21 on master.
- **Varied-RNG sweeps on `6af3a1505` (`gates-6af3a1505/`):** winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**.
- **Folded:** cff232 (merge `0a222a6c4`; branch `worker/integration-20261031-015154`; "Scene OFF" section of
  `docs/cff230-castform-forms.md`): the ROM plays the CASTFORM_CHANGE morph in Scene OFF too (no NO_ANIMATIONS gate); OFF now builds
  the same command and body. ROM finding: a battler-1 change after a weather print starts 3 rows later
  (`BattleScript_WeatherFormChanges` loops battler 0 then 1; OFF command 120 rows). OFF ROM windows, Castform box / text box before ->
  after: 142,500 / 181 rows -> 0 / 0; 128,321 / 185 -> 0 / 0; 98,040 / 180 -> 0 / 0. Worker: typecheck 0; full suite **1,719 files /
  14,213 tests, 0 failed**; build 0; differential 641 / 641. Supervisor: ON census shards byte-identical to nch231's; OFF eventsDigest +
  error identical 1,000 / 1,000, only 603 / 643 / 651 / 950 changed (+1 general-animation each, 117 / 120 rows); 2 touched test files
  14 / 14 on master; hail strip eyeballed. Scene ON keeps the 3-row battler-1 shortfall (snd233 part A).
- **Vanilla Scene OFF 0:20 on `0a222a6c4`** (cff232's OFF change; `gates-0a222a6c4/`): **20 / 20** (all `budget`).
- **Folded:** snd233 (merge `9670f00cc`; branch `worker/integration-20261031-031746`; `docs/snd233-scene-on-send-in-fixes.md`): (A) Scene
  ON gets the +3 battler-1 weather-loop rows (rain / opponent lab text box 1,253 px -> 0); (B) the "opponent Roar ball path 6,718 px"
  line was stale (bso225 / pfb229 already route it through the species-keyed arc); the real residual was the ball after landing for
  monY 80..84 species (landing ticks, closed ball, 5 open + 6 open-final rows above the terrain clip row), now drawn
  (`midBattleSwitchBallTail`). Roar windows mon region px before -> after: SKARMORY 74 -> 5, ONIX 272 -> 7, ALAKAZAM 33 -> 3,
  SHEDINJA 16 -> 0, ENTEI 2,079 -> 2,063 (glow-lag); the faint-replacement path shares it (CASTFORM 278 -> 13). Worker: typecheck 0;
  full suite **1,720 files / 14,219 tests, 0 failed**; build 0; differential 641 / 641. Supervisor: OFF shards byte-identical to
  cff232's; ON eventsDigest + error identical 1,000 / 1,000, only battle 651 changed (117 -> 120 rows); ONIX strip eyeballed.
- **Wind-down gates on `9670f00cc` (`.integration/validation/sv-20261030/gates-final/`):** **independent full suite 1,720 files / 14,219 tests,
  0 failed**; build 0; varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; vanilla
  0:20 `--scene on` **20 / 20** (all `budget`; OFF 20 / 20 on `0a222a6c4`, src since then Scene ON only); Scene ON winning first-round
  0:6 `--render-every 1` **6 / 6**; browser goal play `--lobby-new-challenge` 3 min / scene: ON 8 battles, OFF 17, 2 new challenges
  from the Lobby each, **0 page errors / overlays / contained / divergences**. The 0:60 full / winning / winning-swap gates were not
  run (hours each here; same practice as earlier sessions).
  Extra: Scene ON `--policy full --vary-rng` 0:16 `--render-every 8` on `9670f00cc` **16 / 16** (all `budget`).
- **Scout:** shd234 (read-only, 06:32): the SHEDINJA send-in healthbox residual is a compare-harness maxHP bug (no SHEDINJA max-HP-1
  rule), not the renderer; `factoryCorpusParty.ts:291` has the same omission, unverified downstream (ISSUES #146). Launched before I
  saw the user's mid-session re-aim; it made no edits.
- **User re-aim landed mid-session** (ops commits `736bdc78b`, `c038fad08`, `ed7f141c4`, `ea0e200ca`, docs only, already under the
  gates above): next run starts with the core library API (contract v2; fold `worker/lib-v2-mac` if present — absent on this box at
  wind-down), then audio (S11) and cleanup; #146 / send-out residuals are timing-class now.
- **Next:** handoff "Next work" item 1.
- **Notes:** no DEFERRED items. Worker refs kept (merged): `worker/integration-20261030-213142` (cff230), `-20261030-233859`
  (nch231), `-20261031-015154` (cff232), `-20261031-031746` (snd233). Evidence `.integration/validation/sv-20261030/`. No push.
