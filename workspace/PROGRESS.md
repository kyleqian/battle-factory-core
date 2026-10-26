# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
