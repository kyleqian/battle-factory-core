# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-16 / 17 — CAX31 session wind-down (supervisor, Opus 5.5): pfr192 / ont193 folded; lsd194 unfolded (triaged lsd195)

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
  `budget`). Logs `.integration/validation/sv-20261016b/{pfr192,ont193,soak-73fe07e4f,final}/`.
- **Not folded:** lsd194 (msg189 floor drop + lsd186 Leech Seed drain rows, both scenes; branch `worker/integration-20261017-013328`,
  tip `66e89d36e`). Capped mid re-pin; triage `docs/lsd195-lsd194-triage.md`: everything is a legitimate pin except the Scene OFF Bulk
  Up anchor 0 -> -3 (the second stat's 4 script rows before DEFENSE's print are unpriced once the 24 floor stops masking them;
  extend `statsChangeNextReceiptHoldFrames` to the second stat) and the off148 Rest pause hidden by a `proxyFrames` 24.
- **Next:** (1) finish lsd194 on its branch: Bulk Up second-stat rule (ROM rows in off108 `rom-r1.json`), Rest P from real print
  lengths, chg161 pin `[0,-1,0]` / `[0,0,0]`, then one full suite and fold. Split it: the fix + re-pins first, the suite as its own
  step. (2) Scene ON LEECH_SEED_DRAIN animation drawing (lsd194 holds 208 rows). (3) Double Team window tail (-5); 24 moves with
  0-frame tails need ROM scenarios. (4) non-MAGBY forced send-in renderer visuals (#146). Full suite ~48 min here.
- **Notes:** worker refs kept: `worker/integration-20261016-{191306,224922}` (merged), `worker/integration-20261017-013328`
  (unmerged). Worktrees removed after copying logs. Briefs in `.integration/validation/sv-20261016b/`. No push.
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

## 2026-10-15 — repair headless supervisor waiting; prepare fresh 10-hour recovery

- **State:** master game code remains `0c8e67acc` / production `3937ecad0`; no game edits in this repair. Prior supervisor exited
  while waiting for notifications; trn178 and snd179 finished on worker branches, not merged. Both refs/logs/briefs backed up locally.
- **Did:** `run-claude-supervisor.py` owns the original deadline, waits on scoped worker PIDs and resumes the same Claude session
  after a premature turn exit. Notification waiting disabled; clean completion requires an explicit stop record. Errors/account
  limits do not retry; deadline/cancellation terminate owned model/worker groups. Launcher profile checks 62 / 62; controller
  lifecycle cases 11 / 11 locally and on ARM; live Opus stop + same-session resume smoke passed. No full game-suite rerun for tooling only.
- **Next:** start the authorized fresh 10-hour CAX31 run. Verify/fold `worker/integration-20261015-041827` (`4a8a25431`, trn178,
  Scene OFF transition; worker 13,918 tests / 0 failed + build) and `worker/side-20261015-041923` (`84b46c795`, snd179 evidence only).
  Then Focus Punch corrections, Scene ON transition, Substitute HP timing and remaining Factory finish-up. Mac stays stopped.
- **Notes:** `docs/cax31-session-handoff.md` records recovery, acceptance and the stop protocol. Prior evidence remains on CAX31;
  copied refs/logs/briefs are in `.integration/validation/cax31-session-20261015/`. No timers or automatic push.
