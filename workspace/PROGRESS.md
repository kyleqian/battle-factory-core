# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-26 / 27 — CAX31 session (supervisor, Opus 5.5): finish plan Phase 1 started (in progress)

- **State:** master `6a021c074`+; production src tree `71e610860` (contain209 + perf211 + apx210).
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
- **Running:** contain213 (remaining containment seams, Opus worker); Scene ON census 0..999 with field [21] on `6a021c074`;
  10-minute browser run per scene.
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

## 2026-10-23 — CAX31 session (supervisor, Opus 5.5): lsd194/196 + rst197, lsd198/199, sst200, fnt201 + hpb202, tl204 folded

- **State:** master `f5d66d068`+ (production src tree `d8fda5802`, tested on `f96e8e805`). Presentation only; kernel digests identical
  in every census. One playable crash fixed (Shedinja KO health bar). No open DEFERRED items.
- **Folded (each with supervisor final-code gates on the exact code):** (1) the saved lsd194 / lsd196 branch + rst197 (print floor drop,
  Leech Seed drain rows, second-stat rows, Rest's OFF pause from the status icon; 15 / 15 Rest bodies -3 -> 0). (2) lsd198 + lsd199:
  Scene ON drain draws Move_ABSORB's body, 446 / 446 + 437 / 437 rows 0 px (supervisor reran fresh). (3) sst200: 26 second-stat ROM
  cases 0. (4) fnt201: every faint lacked the faint script's cry + 64-row pause + dispatch rows (-62 .. -76 per faint); now 16 / 16
  route x scene cases 0. (5) hpb202: `CalcNewBarValue` Q24.8 port; a SHEDINJA KO threw in ordinary play, now 0 px vs ROM; the census
  "invalid HP program" throws were a harness bug. (6) tl204 evidence (zero-tail bodies, below). Details: ANIMATION_INTEGRATION_PROGRESS.md.
- **Gates on the final src:** typecheck; census 0..999 both scenes fully attributed (faint + second-stat + Rest classes); differential
  641 / 641; full suite 1,690 files / 14,051 tests, 0 failed; build; soak vanilla 0:20 **20 / 20 OK**; varied-RNG first-round winning
  carry 0 / 14 / 28 and winning-swap carry 0 **100 / 100** each. The 0:60 soak profiles were not run (~7.5 h each here). Logs
  `.integration/validation/sv-20261022/`.
- **tl205 NOT folded (gates ran, suite red):** branch `worker/integration-20261023-060455` (tip `8dddfc698`, worker capped after committing),
  union with master `worker/union-tl205` (`875695e43`). It extends ont193's measured-trail table (trail -1) for the 9 tl204-measured
  zero-tail moves (Fake Tears held out). Supervisor checks on the union: typecheck 0; `tl204Compare.ts` Double Team / Rain Dance / Sunny
  Day / Hail / Leech Seed 0, Calm Mind -4, Charm -1, Scary Face -14, Light Screen +2, Fake Tears -1 (all |residual| improved or equal);
  census ON digests identical, only those 9 moves' move-animation tails +5 / +6 / +39; OFF 1000 / 1000 identical. Full suite: 13 failures
  in 8 files (`.integration/validation/sv-20261022/tl205/failing-files.txt`): live route tests assert "adapter active every age" over the
  whole command (now incl. the tail rows: liveDoubleTeamSides, liveLsbzTiming, liveNext5 / Prep9 / Prep11 / Random2R4 adapters,
  playableAnimationIntegration) and sgl138's route totals. tl206 (`worker/integration-20261023-080938`, tip `ea0846220`, on top of
  `worker/union-tl205`, tests / fixtures only) fixed all 13 (each file alone passes; the adapter holds the last body age through the tail,
  so the `every` assertions stay; shared helper `tests/helpers/iu120Rows.ts` ont193ScriptTail gained the nine moves; sgl138 ON route totals
  +18 / +20 / +12 / +10). Next: full suite + build on `ea0846220` (also covers liveWallMoveAdapters / tl204ZeroTailRows, not rerun), fold.
- **Next after tl205:** tl204's body-window remainders and the other 14 zero-tail moves; the Explosion-breaks-Substitute faint (+135,
  unmeasured); msg175 residuals (Toxic, Roar, Baton Pass, Snore); #146 non-MAGBY forced send-in visuals.
- **Notes:** worker refs kept (merged): `worker/integration-20261022-230803`, `-20261023-{000807,010407,014655,021547,034106,045023,052730}`,
  `worker/union-fnt201-hpb202`; unmerged: `worker/integration-20261023-060455`, `worker/union-tl205`, `worker/integration-20261023-080938` (tl206, the one to fold). Worktrees removed after their evidence was committed or copied. No push.
---

## 2026-10-16 / 17 — CAX31 session wind-down (supervisor, Opus 5.5): pfr192 / ont193 folded; lsd194 unfolded (triaged lsd195)

- **Restart 2026-10-22:** user authorized another 10-hour run. Master and retained lsd194/lsd196 refs, logs and briefs imported
  to the Mac. Updated `docs/cax31-session-handoff.md`: Rest repair, isolated final-code validation, then fold and draw the drain.
- **State:** master clean; production src tree `9e7ac718f` (= ont193 tip `6b6d1d128`; later commits docs only). Presentation timing
  only this session (kernel digests identical in every census); no gameplay / RNG change. No open DEFERRED items.
- **Folded:** pfr192 (#146 player faint-replacement send-in): SEND OUT clock keyed on species / nickname / nature / scene (ball
  B = 91 + len(name), prompt B + D + 17; turn-end 8 + handoff 6 inside the ROM span). Supervisor reran `pfr192Prod.ts`: 24 / 24 ROM
  prompt rows 0; real routes 9 / 20 / 33 / 61 / 84 both scenes 0 (seed 76 has a trailing message, documented). Census 0..999 0
  unattributed; differential 641 / 641. ont193 (#167 btl188 Scene ON no-hit script tail; #139 fpo187 Focus Punch menu-SE wait
  127 / 125): supervisor reran `btl188Rows.ts` (Protect / Detect / Sand-Attack short 0). Census ON 5,830 changed commands, 0
  unattributed; differential 641 / 641. Both docs: `docs/pfr192-*.md`, `docs/ont193-scene-on-tails.md`.
- **Gates (supervisor):** full suite on `740eb2938` (pfr192) 13,948 / 0 failed; on `6b6d1d128` (= final src) 1,684 files / 13,955
  passed / 0 failed; build OK on the final src; vanilla soak 0:20 `--parallel 4` on `73fe07e4f` (= final src) **20 / 20 OK** (all
  `budget`); varied-RNG first-round sweeps on the final src: winning carry 0 / 14 / 28 and winning-swap carry 0 **100 / 100** each.
  The 0:60 full / winning / winning-swap gates were not run (~7.5 h each here; presentation-only session). Logs
  `.integration/validation/sv-20261016b/{pfr192,ont193,soak-73fe07e4f,final}/`.
- **Not folded:** lsd194 (msg189 floor drop + lsd186 Leech Seed drain rows, both scenes; branch `worker/integration-20261017-013328`,
  tip `66e89d36e`). Capped mid re-pin; triage `docs/lsd195-lsd194-triage.md`: everything is a legitimate pin except the Scene OFF Bulk
  Up anchor 0 -> -3 (the second stat's 4 script rows before DEFENSE's print are unpriced once the 24 floor stops masking them;
  extend `statsChangeNextReceiptHoldFrames` to the second stat) and the off148 Rest pause hidden by a `proxyFrames` 24.
- **lsd196 (late, unfolded):** branch `worker/integration-20261017-041629` (tip `d057453ab`, on top of lsd194) adds the second-stat rule
  (a `stat` between two prints presents `exec(print2) - exec(print1) - hold + 1` rows, floor 2): Bulk Up -3 -> 0 both scenes, chg161 pins
  to the ROM, Curse / Agility 0; 11 touched files pass alone. Typecheck (OOM in the worker), build, census, full suite NOT run.
- **Next:** (1) finish lsd194 + lsd196 from `worker/integration-20261017-041629`: Rest P from real print lengths (drop off148's
  `proxyFrames`), typecheck, census 0..999 (message -> stat -> message chains), full suite, then fold. Split it: the fix + re-pins first, the suite as its own
  step. (2) Scene ON LEECH_SEED_DRAIN animation drawing (lsd194 holds 208 rows). (3) Double Team window tail (-5); 24 moves with
  0-frame tails need ROM scenarios. (4) non-MAGBY forced send-in renderer visuals (#146). Full suite ~48 min here.
- **Notes:** worker refs kept: `worker/integration-20261016-{191306,224922}` (merged), `worker/integration-20261017-013328`
  and `worker/integration-20261017-041629` (unmerged). Worktrees removed after copying logs. Briefs in `.integration/validation/sv-20261016b/`. No push.
---

## 2026-10-15 / 16 — CAX31 recovery session wind-down (supervisor, Opus 5.5): trn178 / snd179 / fpc180 / trn181 / snd182 / sub183 / pfr185 / lsd186 / fpo187 / btl188 / msg189

- **Restart 2026-10-16:** user authorized another 10-hour CAX31 run. Finished commits/worker refs and logs imported to the Mac;
  `docs/cax31-session-handoff.md` now starts with pfr185 production, banked timing fixes and remaining visuals. Launch prep is docs-only.
- **State:** master clean; production src tree `0eee3727b` (= union `a4b477dc1`; later commits docs / tools only). No open DEFERRED
  items. All changes this session are presentation timing (kernel digests identical in every census); no gameplay / RNG change.
- **Folded (each independently verified):** trn178 (#167 (a') Scene OFF action-transition pause; predictor rows reproduced), snd179
  (#146 evidence; 4 fresh ROM probes), fpc180 (#139 Focus Punch recall order / switch hold 7 / leads 5 and 5 + u; every OFF card 0),
  trn181 (#167 (a') same rule in Scene ON; 13 / 13 ON rows), snd182 (#146 Scene ON forced player send-in = max(91, cry + 66, T_back +
  70); 27 / 27 ROM cases), sub183 (#153 Substitute turn timing; fresh probes 291 / 291 rows 0 px both scenes), pfr185 (#146 player
  faint-replacement evidence; fresh probe byte-identical), lsd186 (#153 Leech Seed drain evidence; fresh probe byte-identical), fpo187
  (#139 ON +2 = SE_SELECT wait before playanimation; fresh probe byte-identical), btl188 (#167 ON -3 .. -6 = unpresented
  post-waitanimation script rows; rows reproduced), msg189 (24-frame floor on short long-wait prints; code confirmed; committed
  directly on master by the worker, doc only). Details: ANIMATION_INTEGRATION_PROGRESS.md 2026-10-15.
- **Decision:** `src/engine/switchInTail.ts` joined the engine -> animation ratchet allowlist (pure back send-out reducers,
  presentation timing only; precedent `battleResolutionPresentationRender.ts`).
- **Gates (final src):** supervisor full suite 1,682 files / 13,940 tests passed, 0 failed; build OK; worker censuses / differentials
  per step. Vanilla soak 0:20 (`--parallel 4`) **20 / 20 OK** (all `budget`, the rigid canary) on the final tree. Logs
  `.integration/validation/sv-20261016-final/`.
- **Next:** (1) pfr185 production step: route the player faint-replacement send-in through the forced-player model (prompt D + 17)
  instead of partySelect's fixed SEND OUT clock (file:line plan appended to docs/pfr185-player-faint-replacement-send-in.md); (2)
  other live bodies over a transformed battler (Transform's inventory count is accounting only and, per the trs190 audit, would need a
  user call to make a Metronome-only body "required" like Struggle; optional, not blocking); (3) #167 ON body-tail anchor errors (-3
  .. -6; btl188 rule) and print-length residuals (msg189: drop the 24 floor in `WAITMESSAGE_LONG_TIMING`, re-pin + census); (4) Focus
  Punch ON pre-pass SE wait (fpo187 rule: 127 only after a Fight-menu confirm, else 125); (5) Leech Seed drain (lsd186: no ON drain
  animation, ON print ~-190); (6) remaining #146 / #168 / #143 items. Budget on this host: full suite ~48 min at 2 workers; tell
  workers when to start it.
- **Notes:** worker refs kept (`worker/integration-20261015-{170019,184353,211449,222935}`,
  `worker/side-20261016-{002710,013921,015119,015610}`); worktrees removed after copying evidence
  (`.integration/validation/from-workers/{trn181,sub183}`). Briefs in `.integration/validation/sv-20261015b/`. No push (commit locally
  only).

---
