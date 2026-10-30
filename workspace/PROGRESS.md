# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-29 / 30 — CAX31 daily run wind-down (supervisor, Opus 5.5): bso225 / bso226 / apx227 / pfb228 folded; pfb229 unfolded

- **State:** master `1a78dbea8`+; final src == `fa622452c` == apx227 suite-tested `885f2deba` src.

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
- **NOT folded — pfb229** (`worker/integration-20261030-050141`): implements the pfb228 recipe. Started 05:01 with no room for the
  session's soak gates after it; left for the next run (handoff "Next work" 1). Its status at the cap is in the line below.
- **Notes:** no DEFERRED items. Worker refs kept (merged): `worker/integration-20261029-213114` (bso225), `-20261029-233450`
  (bso226), `-20261030-023040` (apx227), `-20261030-042229` (pfb228). Evidence `.integration/validation/sv-20261029/`. No push.
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

## 2026-10-27 / 28 — CAX31 daily run wind-down (supervisor, Opus 5.5): sfa214, apx215, play216, apx217, ret218 folded; apx219 unfolded

- **State:** master `3f6754b25`+ (final src = apx217 + ret218 union `6201dc8e9`). **Final gates on `9fb159322` (same src): typecheck 0;
  build 0; full suite 1,709 files / 14,141 tests, 0 failed** (`.integration/validation/sv-20261027/final-9fb159322/`).
- **Folded:** sfa214 (Summary-screen crashes found by browser random play). Supervisor finished the cut-off branch: merged
  master, added `appRoute` to its 5 new compare traces (the only red test). Gates on `b28ebe50a`: typecheck 0; full suite
  **1,705 files / 14,121 tests, 0 failed**; build 0; the 18 saved random-play sessions replay clean with `--render`;
  differential 641 / 641; census 0..999 ON + OFF vs contain213 **1,000 / 1,000 identical**; anchor Summary traces exact.
  Open: QUILAVA V_STRETCH replacement 48 / 91, 137 species frame-program-only motion -> ISSUES #188 (non-crash).
- **Folded:** apx215 (first approximate class): unproven Substitute-doll cells draw the body (subbed attacker: doll slides off,
  mon in, body, doll back; defender doll: body on the doll). Gates on the union `1d25251b6`: typecheck 0; full suite 1,706 files
  / 14,125 tests 0 failed (one vitest fork OOM-killed under a parallel worker; its file `liveR2GatesRoutes` rerun alone 8 / 8);
  build 0; census vs sfa214: OFF **1,000 / 1,000 identical**; ON 982 identical, 16 changed only in the 74 substitute commands'
  fields [16][18][21] + later timing; 796 / 881 (frame-budget stalemates) partial digests moved because bodies are longer
  (worker: 796 matches base at a 600k budget, 881 is an exact prefix). **Scene ON census: static 207 -> 133, approximate 74.**
  Strips `tools/integration/fixtures/approximate/substitute-doll/` eyeballed (Attract, Dream Eater, Focus Punch).
- **Folded:** play216 (tools): `npm run play:random` goal mode is the default — a node mirror engine runs the soak policies and
  feeds the page through `__POKEBENCH__.advance` (lockstep, canvas-hash checked); supervisor made the page draw every frame
  (`--render-every`, default 1). ON seed 3, 6 min: 14 battles, 8 swap screens, 0 errors / 0 divergences; worker 7 min / scene:
  ON 34 battles, OFF 53, 0 errors. Uniform key fuzz on `ce7e3b7ab` (10 min / scene): 0 errors but never left the draft.
  Playwright must be installed in `.integration/browser/node_modules` (ignored; reinstalled this run with `npm install playwright`).
- **Found:** RETIRE -> YES after a win draws the Lobby arrival but the state never leaves the post-win question (no
  `factoryTerminal`, never `lobbyFreeRoam`): a player hang. Brief `.integration/validation/sv-20261027/ret218.txt` queued.
- **Soak (Scene ON, `--policy full --vary-rng`, seeds 0:30, render every 8, on `ee22a664f`):** **30 / 30 OK**, 0 CRASH / 0 HANG.
- **Folded:** apx217: the 13 unattributed static gates named (Sand-Attack / Hyper Beam / Curse / Water Pulse -> sprite-order-unknown,
  Seismic Toss -> other:seismic-toss-damage-branch, Fury Cutter -> other:later-body-idle-rest); bodies with a transformed battler
  draw from the copied species' art (approximate). Worker on `d8ebb1239`: full suite 1,707 files / 14,130 tests 0 failed, build 0,
  differential 641 / 641, census OFF 1,000 / 1,000. Supervisor (union `cfa1242c0`, same src): typecheck 0, build 0, new tests;
  independent census ON: 7 battles changed, 0 digest / error mismatch. **Scene ON static 133 -> 102 (sprite-order-unknown 26,
  castform 18, extrasensory 17, endeavor 12, no-adapter 11, turn-0 7, idle-rest 4, hidden 3, allocator 3, seismic 1);
  approximate 105 (substitute 74, transform 31); unnamed 0.** Magic Coat x2 in seed 197 moved transform -> allocator-unknown.
- **Browser goal play on `91984abfe` (10 min / scene, seed 7):** ON 29 battles / 16 swap screens, OFF 46 / 19, 0 errors.
- **Folded:** ret218: RETIRE-YES after a win hands off to the loss `factoryTerminal` at the warp's Lobby-arrival frame (was a
  permanent hang); source: WarpToLobbyLost == the loss script. Worker on `edc45e88f`: full suite 1,708 / 14,136 0 failed, build 0,
  differential 641 / 641, winning-swap 0:10 per-seed identical, every postwin-* / loss-terminal-* trace unchanged; new
  `retire-yes-lobby-freeroam-off` 1243 / 1482 (ISSUES #189). Supervisor on the union: typecheck 0, new test 2 / 2, the four
  compares rerun. (Supervisor full suite + build on the union were OOM-killed beside apx219; covered by the final gates below.)
- **NOT folded — apx219** (sprite-order-unknown 26 + allocator-unknown 3 -> approximate; branch `worker/animation-20261028-040709`,
  7 commits; stopped by the supervisor at 06:05 to keep the final gates safe). Census on `c7f8a558a`: ON 10 changed / 0 bad, OFF
  1,000 / 1,000; **static 102 -> 73**. Full suite unfinished (many gate-pin tests re-pinned to `liveMoveAnimationPresentationProven`);
  no strips yet. Handoff "Next work" 1 has the fold recipe.
- **Wind-down soak gates on src `f5f8c945e` (= final src minus ret218's retire-only branch, which no soak reaches):** varied-RNG
  first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; vanilla 0:20 `--scene both`
  **ON 20 / 20, OFF 20 / 20** (all `budget`). The 0:60 full / winning / winning-swap gates were not run (hours each here).
- **Host:** two workers at once (separate lanes) OOM-killed a supervisor full suite and two builds; keep one worker at a time.
- **Notes:** no DEFERRED items. Worker refs kept: `worker/integration-20261027-065233` (sfa214), `-20261027-213054` (apx215),
  `-20261027-232252` (play216), `-20261028-005213` (apx217), `-20261028-023556` (ret218) — merged; `worker/animation-20261028-040709`
  (apx219) unmerged. Evidence `.integration/validation/sv-20261027/`. No push.
---
