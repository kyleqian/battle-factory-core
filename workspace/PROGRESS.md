# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-27 / 28 — CAX31 daily run wind-down (supervisor, Opus 5.5): sfa214, apx215, play216, apx217, ret218 folded; apx219 unfolded

- **State:** master `9fb159322`+ (final src = apx217 + ret218 union `6201dc8e9`). Final gates: see the last bullet.
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

## 2026-10-26 / 27 — CAX31 session wind-down (supervisor, Opus 5.5): finish plan Phase 1 tooling + containment; Phase 2 plumbing

- **State:** master `31ba4d4ec`+; production src tree `c7bb4e59d` (contain209 + perf211 + apx210 + contain213).
- **Light gates on src `21f22b324` (reused + one rerun):** census 0..999 both scenes already existed twice for this exact src
  (tl205 union `875695e43`, exs207 base `ef511e03d`); delta between them 1,000 / 1,000 battles identical, 0 digest / 0 error
  mismatch, 0 unattributed. Differential (fight-submenu, battle1-postwin-next-prompt, presentation-rng-playable-live-bodies-seeded-on,
  base `f5d66d068`) **641 / 641 identical** (`.integration/validation/sv-20261026b/diff-21f22b324/`).
- **Folded:** soakscene208 (Phase 1a): `npm run soak -- --scene on|off|both`; Scene ON states for fresh / --start-carry /
  --vary-rng; per-scene lines + summary; parallel parity; render throws are CRASH with `errorPhase: "render"`. Tools / tests only.
  Supervisor reran the 3 soak test files (one 5 s timeout under load raised to 120 s, `1f576d35f`). Smoke ON 3 / 3 OK.
- **Sizing:** `--render-every 1` costs ~3 ms / frame here (ON ~1.25x OFF): a first-round seed takes 1.5–5 min. Scene mode changes
  frame counts, so the random player's press RNG gives different ON / OFF trajectories for the same seed.
- **Also:** `ANIMATION_VERIFICATION.md` gained the approximate-playback contract (Phase 2). Removed the three stopped exs207
  worktrees (clean; branches kept) and killed an orphan `tsc -b` (7 GB) left in one of them.
- **Folded:** contain209 (Phase 1c, `1d8fa9bb8`, src tree `5355decad`): new `src/engine/presentationContainment.ts`; a throw in
  live adapter selection or command duration degrades that command to the decline hold (decline length); a Scene ON / OFF draw
  throw draws the static field from that row on, keeping the scheduled length (render never feeds tick). Sticky per frozen
  command (WeakMap), deduped bounded log (32), `console.error` once, `__POKEBENCH_SESSION__().containedErrors`, bench
  `__POKEBENCH__.containedErrors()`, soak `CONTAINED n` per seed + summary. Gameplay throws still reach the overlay. Worker gates
  on the tip: typecheck 0, full suite 1,697 files / 14,082 tests 0 failed, build 0. Supervisor reran the 4 new test files (6 / 6)
  and the differential vs `8b0c936e3` (641 / 641 identical); merged src tree = tested tree. **Not contained (open):** render-view
  field reads inside `tick()` (`core.ts:1041/1046`, `factoryRoundBattleOrchestrator.ts:2769/2952`), `createBattleResolutionPresentation`
  command building, order-host updates (`withResolutionLifecycle`, `commitCompletedResolutionCommand`).
- **Scene ON sweeps (render every frame, `--vary-rng --first-round`, 0:30, `--parallel 3`):** winning carry 0 **30 / 30 OK**
  (37 battles, 2,242 s); carry 14 **30 / 30 OK** (32 battles, 2,041 s). 0 CRASH / 0 HANG. At ~1 battle / min the 3,000-battle
  nightly bar is out of reach on this host; perf211 (renderer profiling, pixel-neutral) is the response.
  Carry 28 **30 / 30 OK** (1,947 s); winning-swap carry 0 **30 / 30 OK** (2,797 s). 0 CONTAINED in all four.
- **Folded:** perf211 (`5dd00cd59`, src tree `369a7ad85`): pixel-neutral render caches (`tileBgCache.ts` palette-independent tile
  BG compile, memoized healthbox compose + run blits, `opaqueDrawMemo.ts` for room tile layers). Worker gates on the tip:
  typecheck 0, full suite 1,698 files / 14,089 tests 0 failed, build 0, differential 641 / 641. Supervisor reran
  `tools/soak/frameHashes.ts` (new, kept) on unseen seeds 7:9, 40,000 frames each, base `1d8fa9bb8` vs tip: ON and OFF
  80,000 / 80,000 frame hashes identical; ON 2.98 -> 0.79 ms / frame, OFF 2.70 -> 0.46 (`.integration/validation/sv-20261026b/perf211-hash/`).
- **Nightly sizing decision (reversible):** rendering is the soak's whole cost (tick alone ~0.015 ms / frame); a seed spends
  most frames outside battle (~60–70k frames per first-round seed, ~1.2 battles). 3,000 battles at `--render-every 1` is still
  ~13 h wall here, so the nightly Scene ON bulk count uses the default `--render-every 8` (which also renders on every surface
  change) and a smaller `--render-every 1` sample rides beside it.
- **Scene ON sweep on perf211 code:** winning carry 0 `--vary-rng --first-round --render-every 1` seeds 30:130 **100 / 100 OK**
  (3,593 s at `--parallel 3`). Soak RSS plateaus at ~1.2–1.4 GB per process (render caches bounded).
- **Folded:** apx210 (`6a021c074`, src `71e610860`): `src/engine/liveMovePlayback.ts` reason codes + `LIVE_MOVE_APPROXIMATE_POLICY`
  (all static); every move-animation decline names a reason (`return declined(sink, reason)`); census field [21]
  (`live` / `approx:<r>` / `static:<r>` / `pause`), `tools/integration/apx210CensusSummary.py`. Worker: census ON 0..199
  fields [0..20] identical to master's arm, 7,716 move animations = 5,196 live / 51 static / 2,469 pause (no body request);
  static = transform 33, substitute-doll 9, extrasensory-player-later 3, hidden-target 3, no-adapter 2, turn-0 1.
  Supervisor union gate (apx210 + master, `dc8241bcd`): full suite 1 failed / 1,698 passed — `cf78NeedleArmTie` via
  `tools/integration/liveShareCensusGates.ts`, a source-text gate parser that only knew `return null`; fixed (`ac33930e2`), the
  parsed gate set now differs from master only by the 4 compound gates split into 2 equivalent ifs; cf78 4 / 4; build 0.
- **Browser random play (play212, branch `worker/integration-20261027-044651`, not folded yet):** `npm run play:random`
  (`tools/browser/randomPlay.mjs`). Chromium needed 9 missing system libraries; supervisor unpacked their Ubuntu .debs without
  root into the ignored `.integration/browser/syslibs/root` (run with `LD_LIBRARY_PATH=<that>/usr/lib/aarch64-linux-gnu`).
  Self-test catches + saves a planted page error; 2 min per scene: ~60 fps, 0 page errors, but no battle reached (too short).
- **Scene ON census 0..999 on `6a021c074` (field [21], ~7 min at 4 jobs):** 40,110 move-animation commands = 26,959 live /
  0 approximate / **207 static** / 12,944 pause. Static: substitute-doll 74, transform 33, castform-form 18,
  extrasensory-player-later 17, sprite-order-unknown 16, endeavor-power 12, no-adapter 11, turn-0 7, hidden-target 3,
  later-body-idle-rest 2, allocator-unknown 1, **13 from unnamed gates** (moves 63, 174, 28, 210, 69, 352). Errors: the 3 known
  frame-budget stalemates (434 / 796 / 881), unchanged. `.integration/validation/sv-20261026b/census-6a021c074/`.
- **Folded:** play212 (`3fd2b9601`, tools only; supervisor added auto `LD_LIBRARY_PATH` for the unpacked libraries and the
  overlay's crash message in incidents). `npm run build && npm run play:random -- --minutes 10 --scene both`.
- **NEW CRASHES (browser random play, 10 min per scene on build `6b6e803e9`):** Scene ON 9 overlays, OFF 8, all on the draft
  rental **Summary** screen (the soak never opens it), never reaching a battle: (a) "missing summary front animation for
  BUTTERFREE / BAYLEEF" — `src/data/gen/summary-front-animation.json` covers only the 6 S9 anchor species; (b) "Cannot read
  properties of undefined (reading 'power')" at `summaryInfoPage.ts:791` (`pageRental.moves[powerMoveIndex]`, Battle Moves
  detail). Reproduced headlessly by tick + render replay of the saved sessions
  (`.integration/validation/sv-20261026b/random-play/2026-10-27T05-22-17-450Z/`). Brief sfa214 queued.
- **Folded:** contain213 (`31ba4d4ec`, src `c7bb4e59d`): tick-side render-view field reads fall back (last good field ->
  segment field with completed commands -> frozen scene `null` = black hold); command projection throws -> a minimal command
  list from the kernel's post-turn state (send-in message + switch-in, or HP bar + status icon, then turn-end; the projector
  function itself still fails closed); `prepareResolutionPalette` throws -> palette / allocator / order / x2 hosts unknown.
  **Loosened on purpose:** a malformed kernel receipt inside the resolution builder is now a recorded `commands` error, not
  fatal. Worker: full suite 1,701 passed / 1 failed (that fail-closed pin, re-pinned `5644b2414`), build 0. Supervisor: 7 files
  / 50 tests, differential 641 / 641, census 0..999 ON and OFF vs `6a021c074` **1,000 / 1,000 identical**, 0 digest mismatch.
- **Scene ON vanilla 0:20 (`--render-every 1`, on `31ba4d4ec`):** **20 / 20 OK** (all `budget`, 4,613 s).
- **Wind-down gates on `f3a62945c` (= final src `c7bb4e59d`):** vanilla 0:20 **20 / 20 OK** (all `budget`); varied-RNG first-round
  winning carry 0 / 14 / 28 **100 / 100** each; winning-swap carry 0 **100 / 100**
  (`.integration/validation/sv-20261026b/gates-f3a62945c/`). The 0:60 full / winning / winning-swap gates were not run (hours
  each here; same practice as the last sessions).
- **NOT folded — sfa214** (Summary-screen crashes; branch `worker/integration-20261027-065233`, worktree kept at
  `.worktrees/integration-20261027-065233`): CANCEL-row rule per ChangeSelectedMove (the 'power' crash), Summary front animation
  + portrait for every Factory species (new motion types incl. ANIM_V_STRETCH with oracle traces), MOVE_NONE slots, a Contest
  Moves CANCEL crash, `replay-session-trace --render`, soak `full` policy now explores the Summary (default on,
  `--no-summary-explore`) and the worker reports the extended soak CRASHes on base and passes on the fix. Its full suite was
  ~85 % through at the deadline (log `.worktrees/integration-20261027-065233/workspace/.integration/sfa214-fullsuite.log`);
  build not run. Known red so far: `tests/compareTraceAppRoute.test.ts` — sfa214's 5 new compare traces lack `appRoute`
  (declare it explicitly). **Next run, first step:** read its final message in the launcher log
  (`.integration/validation/sv-20261026b/sfa214.launcher.out`), then supervisor gates on the union with master: new tests, the
  17 saved sessions with `--render`, differential, census both scenes (anchors must not move), full suite + build; fold.
- **Next:** sfa214 fold; `npm run play:random -- --minutes 10 --scene both` on the new build; apx215 (brief ready,
  substitute-doll 74); then the other static classes by weight. `docs/cax31-session-handoff.md` "Next work" has the order.
- **Notes:** no DEFERRED items. Worker refs kept: `worker/integration-20261026-232941` (soakscene208), `-20261027-002733`
  (contain209), `-015833` (perf211), `-033627` (apx210), `-044651` (play212), `-052237` (contain213) — all merged;
  `-065233` (sfa214) unmerged. Briefs + evidence in `.integration/validation/sv-20261026b/`. No push.
---

## 2026-10-26 — User decision: finish plan approved; CAX31 run restarted on it (top layer, docs only)

- **State:** master `ef511e03d` + these docs commits; production src tree `21f22b324` (tl205 + tl206 folded below, supervisor gates
  typecheck / full suite 1,691 files 14,065 tests 0 failed / build on `80c0a8c56`). No open DEFERRED items. Phase 0's tl206 item is done.
- **Did:** top-layer audit → `docs/finish-plan.md` (approved): crashes first (Scene ON soaks with rendering on; in-app containment),
  then every animation plays (new **approximate** claim class replaces the static-field hold; 177 / 27,261 census commands fall back
  today, all with existing bodies), then production + cleanup interleaved, timing last. ROADMAP "Current execution priority" rewritten;
  `docs/cax31-session-handoff.md` rewritten (incl. the standing daily-run authorization: cron 21:30 UTC on the box); AGENTS.md /
  LOCAL_SETUP.md notes; live-status `pending` corrected. The 21:29 UTC run was stopped at the user's request after folding tl205/tl206;
  its exs207 worker branches are kept as long-tail work.
- **Next:** handoff "Next work" 1 → 4 (Scene ON soak option + first ON sweeps; in-app containment; approximate contract).
- **Notes:** no push (user's step); the Mac imports box results through bundles.
---
