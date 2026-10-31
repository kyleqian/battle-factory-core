# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
---


## 2026-10-29 / 30 — CAX31 daily run wind-down (supervisor, Opus 5.5): bso225 / bso226 / apx227 / pfb228 / pfb229 folded

- **State:** master `bb9029a37`+ (pfb229 merge); final src + tests == pfb229 worker-tested `c3a9fc037`.

- **Folded:** bso225 (`633d97700`, fast-forward; branch `worker/integration-20261029-213114`): Scene ON player BACK send-out
  animation on the mid-battle switch-in (voluntary + Roar / Whirlwind "dragged out"); banked back reducers, selector species +
  `personality % 25`, reducer tick 0 at view elapsed 66; 625 / 625 Factory (species, nature) pairs have a reducer. 5 ROM windows
  (SHEDINJA, SKARMORY, ALAKAZAM, ONIX, ENTEI) exact from elapsed 88 (was 8–186k px); ball / emerge / sparkle residual before e 88
  unchanged; ENTEI glow 1 lag frame (e 68). Doc `docs/bso225-player-back-send-out.md`, strips
  `tools/integration/fixtures/back-send-out/`. Worker on the exact tip tree: typecheck 0, full suite **1,713 files / 14,173 tests,
  0 failed**, build 0, differential 641 / 641. Supervisor: OFF census shards byte-identical to `off-bad3db32c`; ON eventsDigest +
  error identical on 1,000 / 1,000 (3 changed = the known apx224 rows); new test 6 / 6; ENTEI strip eyeballed.
  Not wired: faint-replacement send-in (path B; the pfr192 emerge route is not pixel-aligned yet), battle-start player (path C).
- **Folded:** bso226 (merge `5a9cb0fc5`; branch `worker/integration-20261029-233450`, src == tested `ebe23c6bb`): the Scene ON
  battle-start intro plays the opponent FRONT and player BACK species animations (banked reducers; new presentation-only
  `sceneOn` on the intro state; the ONIX-only settle hand-fit is replaced by the dispatcher in Scene ON, kept in OFF). 5 ROM windows,
  differing px opp / player before -> after: yoshi 106,807 / 16,697 -> 12 / 0; wailmer 24,840 / 62,540 -> 132 / 7,903 (ball +
  sparkles); spinda 41,645 / 35,115 -> 11 / 1,855; koffing 42,765 / 63,669 -> 12 / 97; onix 62,261 / 48,993 -> 40,787 / 14,502
  (lab opponent gender differs + release frames unattributed). Timing residual found: the ROM waits for the opponent's front
  animation before "Go!", 39–98 frames later than our fixed timeline on long animations (ISSUES #146 timing line). Doc
  `docs/bso226-battle-start-intro-send-outs.md`, strips `tools/integration/fixtures/battle-start-intro/`. Worker: typecheck 0;
  full suite (12 shards) **1,714 files / 14,180 tests, 0 failed**; build 0; differential 641 / 641 (the committed ON traces capture
  after the intro). Supervisor: census OFF + ON vs bso225: eventsDigest + error identical 1,000 / 1,000 each; merged src ==
  tested src; bso225 + bso226 tests 13 / 13; SPINDA strip eyeballed.
- **Folded:** apx227 (merge `fa622452c`; branch `worker/integration-20261030-023040`, src == suite-tested `885f2deba`):
  **#157 fixed** — the only reader of the weather-continues event battler was the Scene ON x2 history (`liveBattlerX2History.ts`);
  sandstorm / hail continues (WEATHER_VAR 12 / 13) with battler 1 erased the opponent's zeroed rest pose; the seam now takes battler
  0 (kernel event unchanged). Seed 27 window: 2,166 frames move (opponent ONIX pose); 6 other opponent-weather seeds identical; seed
  851 Fury Cutter approximate -> live (live 26,956 -> 26,957). Conversion 2 body (16x16 blended tile grid on the user): ROM residual
  median 3,253 -> 119 px. Ghost Curse (stretching black window, later nail, longer hold): median 47 -> 0, exact frames 144 -> 228;
  ghost icon palette not changed (cause not isolated). Worker: typecheck 0; census ON eventsDigest + error 1,000 / 1,000 identical
  (supervisor re-checked), static 0, 7 battles changed as expected; OFF not reachable (x2 host and approx bodies are Scene ON only;
  supervisor read the diff); differential 641 / 641; full suite on `885f2deba` 1,713 / 1,714 files, 1 stale Curse row pin ->
  re-pinned test-only (`1a5ecb4ab`); build 0 on the tip. Supervisor: the 3 re-pinned files 43 / 43 on master.
- **Merged:** pfb228 (`d4b136a80`, fast-forward; evidence / tools only, no src / tests diff — checked): the Scene ON faint-replacement
  send-in already starts ball / release / emerge on the ROM's ticks (B = 91 + name length; the bso225 "-4..+3" offset was a
  delta-search boundary artifact); the gap is content (generic release, one-species ball arc, fixed particle y). Recipe + RAM
  schedules in `docs/pfb228-faint-replacement-emerge.md`; scratch prototype predicts 7 windows 110k–325k px -> 16–2,079 px.
- **Wind-down gates on src `fa622452c` (`.integration/validation/sv-20261029/gates-fa622452c/`):** build 0; varied-RNG first-round
  winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; vanilla 0:20 `--scene both` **ON 20 / 20, OFF
  20 / 20** (all `budget`); Scene ON `--policy full --vary-rng` 0:30 `--render-every 8` **30 / 30**; Scene ON winning first-round 0:6
  `--render-every 1` **6 / 6**; browser goal play 10 min / scene (seed 13): ON 24 battles / 11 swap screens, OFF 41 / 14, **0 page
  errors, 0 overlays, 0 contained, 0 divergences**. Full suite: no independent supervisor rerun (one worker + one suite at a time on
  this host; pfb229's gates ran then) — covered by apx227's full suite on the same src plus the supervisor's rerun of the re-pinned
  files. The 0:60 full / winning / winning-swap gates were not run (hours each here; same practice as earlier sessions).
- **Folded at 06:46:** pfb229 (merge `bb9029a37`; branch `worker/integration-20261030-050141`): the pfb228 recipe — Scene ON
  faint-replacement player send-in drawn with the path-A composition (bso225 back animation at B+66), `playerSendOutBallArc(monY)`,
  particle y = final ball y2 + 59 (monY 93 reproduces the old table). 7 ROM windows mon px before -> after: SKARMORY 110,236 -> 74,
  ALAKAZAM 129,564 -> 33, ONIX 124,807 -> 272, ENTEI 324,706 -> 2,079, SHEDINJA 120,589 -> 16, KINGDRA 263,209 -> 1,493, CASTFORM
  153,995 -> 278 (= the prototype's prediction); healthbox residual 0 in 6. No row / digest change. Worker on the exact tree:
  typecheck 0; census OFF shards byte-identical, ON eventsDigest + error 1,000 / 1,000 (supervisor re-checked both); static 0;
  differential 641 / 641; full suite (12 shards) **1,715 files / 14,187 tests, 0 failed**; build 0. Supervisor short gates on the
  merge: see the line below. **Not run on this src:** the 0:30 Scene ON render-8 soak (45 min); green on the parent `fa622452c`
  above, and pfb229 changes only Scene ON forced-send-in drawing. Next run: run it first.
- **Short gates on the pfb229 merge `bb9029a37` (`.integration/validation/sv-20261029/gates-bb9029a37/`):** build 0; varied-RNG
  first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; Scene ON winning first-round 0:6
  `--render-every 1` **6 / 6**; browser goal play Scene ON 3 min (seed 17): 8 battles / 6 swap screens, 0 page errors / overlays /
  divergences; vanilla 0:20 `--scene on` (`--parallel 5`, 606 s) **20 / 20** (all `budget`; OFF unaffected by this Scene ON-only
  change, 20 / 20 on the parent).
- **Next:** handoff "Next work" 1 (the Scene ON render-8 soak on `bb9029a37`+, then the #146 remainder), 2 Castform form changes.
- **Notes:** no DEFERRED items. Worker refs kept (merged): `worker/integration-20261029-213114` (bso225), `-20261029-233450`
  (bso226), `-20261030-023040` (apx227), `-20261030-042229` (pfb228), `-20261030-050141` (pfb229). Evidence `.integration/validation/sv-20261029/`. No push.
---

## 2026-10-28 / 29 — CAX31 daily run wind-down (supervisor, Opus 5.5): apx219-224 folded; Scene ON static 0

- **State:** master `c7d99ba26`+ (apx219-222 fast-forward; apx223 / apx224 merges; final src == apx224 worker-tested tree `25e824041`).
- **Folded:** apx219 + apx220 (sprite-order-unknown 26 + allocator-unknown 3 -> approximate, known-entry first-action input).
  Worker (Sonnet, branch `worker/integration-20261028-213053`): clean merge of master; typecheck 0; full suite 1,754 files: 1,708
  passed / 2 failed -> both re-pinned (liveDiveSetupAdapter, liveWallMoveAdapters: decline pins now read
  `liveMoveAnimationPresentationProven`), rerun 30 / 30; build 0; differential 641 / 641. Supervisor: OFF census 0..999 shards
  **byte-identical** to `census-apx215/off-1d25251b6` (the `lsd194CensusDelta.py` OFF FAIL is a tool misfire on identical data);
  ON delta vs `census-apx217/on-cfa1242c0`: 10 battles changed, **bad 0**, only field [21]; the 3 touched test files 30 / 30;
  Sand-Attack strip eyeballed. **Scene ON static 102 -> 73**, approximate 134. Evidence `.integration/validation/sv-20261028/`.
- **Folded:** apx221 (`c55913015`, fast-forward; branch `worker/integration-20261028-225012`): castform-form 18 (form art the field
  shows), extrasensory player-later target 17 (later-body branch regardless of top line), endeavor-power 12 (`request.power`),
  later-body idle rest 4 (current rest offsets), seismic-toss damage branch 1 (nearest 33..65) -> approximate. Worker: typecheck 0;
  full suite on `e2aab6d79` (src == tip) 1,710 / 1,711 files, 1 failed (cf78NeedleArmTie: census-gate needles; fixed tools-only,
  rerun with the 24 dependent files green); build 0; differential 641 / 641; 8 tests re-pinned (listed in the commit range).
  Supervisor: OFF shards **byte-identical** to `off-a21dd5f89`; ON delta 27 changed, **bad 0**, field [21] only; census src == tip
  src; apx221 + cf78 tests 15 / 15; Castform Icy Wind strip eyeballed. **Scene ON static 73 -> 21** (no-adapter 11, turn-0 7,
  hidden-target 3), approximate 186.
- **Folded:** apx222 (`f07c843af`, fast-forward; branch `worker/integration-20261029-012954`): hidden-target 3 (body drawn, hidden
  battler kept hidden), turn-0 7 (= Ghost-type Curse, a new `CurseGhost` body; its black stretching window is not drawn) and the 7
  no-adapter moves (Peck, Odor Sleuth, False Swipe, Gust, Pay Day, Barrage, Conversion 2: new bodies built from their `Move_*`
  scripts in `src/animation/approxScript.ts`, assets `src/assets/gen/battle-anim-apx222.json`) -> approximate. A no-case move without
  a script body is `static:other:no-adapter-unscripted` (none in 0..999). Worker: full suite on `bad3db32c` (src == tip) 1,711 /
  1,712 files, 2 tests failed in liveCurseStatsAdapter -> re-pinned, 7 / 7; build 0; differential 641 / 641; boundary ratchet
  untouched. Supervisor: OFF shards byte-identical to `off-04dc4e102`; ON delta 15 changed, bad 0; **eventsDigest + error identical
  on all 1,000 ON battles** (the new bodies lengthen those commands, fields [16][18]); Ghost Curse + Pay Day strips eyeballed.
- **Scene ON census 0..999 on master: static 0** (finish plan Phase 2 census bar met), approximate 207, live 26,956, pause 12,941.
- **Wind-down gates on src `f07c843af` (`.integration/validation/sv-20261028/gates-f07c843af/`):** full suite **1,712 files /
  14,167 tests, 0 failed**; build 0; varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0
  **100 / 100**; vanilla 0:20 `--scene both` **ON 20 / 20, OFF 20 / 20** (all `budget`). The 0:60 full / winning / winning-swap
  gates were not run (hours each here; same practice as earlier sessions).
- **Merged:** apx223 (evidence only, no src; `4b30bb883`): `docs/apx223-approximate-oracle-check.md` compares the 8 apx222 bodies
  with Scene ON ROM windows (`tools/integration/apx223OracleCheck.ts`, PNGs `tools/integration/fixtures/approximate/oracle-check/`).
  Ghost Curse / False Swipe middles near-exact; Gust (funnel ~15 px low, no target shake), Barrage (ball too fast), Odor Sleuth
  (duplicate target), Conversion 2 (no white blend) clearly wrong; every ROM body has 7–15 idle lead-in frames ours skips. The 4
  importing approximate tests 31 / 31 after the merge; Gust PNG eyeballed (confirms the funnel offset).
- **Folded:** apx224 (`c7d99ba26`; src `src/animation/approxScript.ts` + the apx222 test threshold 0.4 -> 0.3 for idle lead-in
  rows): Gust funnel 16 px higher, Odor Sleuth clone blink order, Barrage ball rotation / aim, Peck (exact over its staged visible
  body), Pay Day and False Swipe lead-ins; table in `docs/apx223-approximate-oracle-check.md` ("after apx224"). Conversion 2 and
  Ghost Curse not touched. Worker: full suite on the final src **1,712 files / 14,167 tests, 0 failed**; build 0; differential
  641 / 641. Supervisor: census ON vs `apx222-evidence/on-bad3db32c` 3 battles changed (Peck / False Swipe / Pay Day row counts),
  bad 0, **eventsDigest + error identical on all 1,000**; static still 0. (The wind-down soaks / browser play below ran on
  `f07c843af`; apx224 changes only Scene ON approximate-body pixels / lengths, which `--render-every 0` soaks do not draw.)
- **Next:** handoff "Next work" 1 (send-out intros in Scene ON, #157, Conversion 2 / Ghost Curse body fixes).
- **Notes:** no DEFERRED items. Worker refs kept (merged): `worker/animation-20261028-040709` (apx219),
  `worker/integration-20261028-213053` (apx220), `-20261028-225012` (apx221), `-20261029-012954` (apx222), `-045744` (apx223),
  `-052326` (apx224). Evidence `.integration/validation/sv-20261028/`. No push.
- **Browser goal play on build `f07c843af` (10 min / scene, seed 11):** ON 17 battles / 7 swap screens, OFF 47 / 23; 0 page errors,
  0 overlays, 0 contained, 0 divergences.
---
