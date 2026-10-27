# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  ~60 % through with no failure at the deadline (log `.worktrees/integration-20261027-065233/workspace/.integration/sfa214-fullsuite.log`);
  build not run. **Next run, first step:** read its final message in the launcher log
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

## 2026-10-26 — CAX31 session (supervisor, Opus 5.5): tl205 + tl206 folded; stopped by the user at 22:40 UTC for the finish-plan restart (entry above)

- **State:** master `80c0a8c56` (src tree `21f22b324`). Presentation only so far.
- **Folded:** tl205 + tl206 (Scene ON script tail, trail -1, for the 9 tl204-measured zero-tail moves; 13 tail-aware test re-pins).
  Supervisor gates on the exact merged code `80c0a8c56`: typecheck 0; full suite 1,691 files / 14,065 tests passed, 0 failed; build 0
  (`.integration/validation/sv-20261026/tl206/`). Census / tl204Compare were run on the union in the 2026-10-23 session (unchanged src).
- **Stopped mid-step:** exs207 (Explosion-breaks-Substitute faint, ROM rows both scenes): refs `worker/integration-20261026-213055`,
  `worker/integration-20261026-223044`, `worker/union-exs207` kept; not folded, no gates. Timing work: long tail under the finish plan.
- **Next:** tl204 body-window residuals + the other 14 zero-tail moves; msg175 residuals; #146 visuals.
---
