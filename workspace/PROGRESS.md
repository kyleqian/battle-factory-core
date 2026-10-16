# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-15 / 16 — CAX31 recovery session wind-down (supervisor, Opus 5.5): trn178 / snd179 / fpc180 / trn181 / snd182 / sub183 / pfr185

- **State:** master clean; production src tree `0eee3727b` (= union `a4b477dc1`; later commits docs / tools only). No open DEFERRED items.
  All changes this session are presentation timing (kernel digests identical in every census); no gameplay / RNG change.
- **Folded (each independently verified):** trn178 (#167 (a') Scene OFF action-transition pause; predictor rows reproduced),
  snd179 (#146 evidence; 4 fresh ROM probes), fpc180 (#139 Focus Punch recall order / switch hold 7 / leads 5 and 5 + u; every OFF card 0),
  trn181 (#167 (a') same rule in Scene ON; 13 / 13 ON rows), snd182 (#146 Scene ON forced player send-in = max(91, cry + 66, T_back + 70);
  27 / 27 ROM cases), sub183 (#153 Substitute turn timing; fresh probes 291 / 291 rows 0 px both scenes), pfr185 (#146 player
  faint-replacement evidence; fresh probe byte-identical). Details: ANIMATION_INTEGRATION_PROGRESS.md 2026-10-15.
- **Decision:** `src/engine/switchInTail.ts` joined the engine -> animation ratchet allowlist (pure back send-out reducers, presentation
  timing only; precedent `battleResolutionPresentationRender.ts`).
- **Gates (final src):** supervisor full suite 1,682 files / 13,940 tests passed, 0 failed; build OK; worker censuses / differentials per
  step. Vanilla soak 0:20 (`--parallel 4`) started on the final tree (result below if it finished). Logs `.integration/validation/sv-20261016-final/`.
- **Next:** (1) pfr185 production step: route the player faint-replacement send-in through the forced-player model (prompt D + 17) instead
  of partySelect's fixed SEND OUT clock; (2) Transform accounting (live body outside the 276 catalogue, like Struggle) + other bodies over
  a transformed battler; (3) #167 ON body-tail anchor errors (-3 .. -6) and print-length residuals; (4) Focus Punch ON 125-vs-127 pre-pass
  row; (5) remaining #146 / #168 / #143 items. Budget on this host: full suite ~48 min at 2 workers; tell workers when to start it.
- **Notes:** worker refs kept (`worker/integration-20261015-{170019,184353,211449,222935}`, `worker/side-20261016-002710`); worktrees
  removed after copying evidence (`.integration/validation/from-workers/{trn181,sub183}`). Briefs in `.integration/validation/sv-20261015b/`.
  No push (commit locally only).

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

---

## 2026-10-14 — CAX31 session wind-down: enc160 / plr162 / enc173 / trf174 / msg175 / trn176 / fpc177 folded (supervisor)

- **Restart handoff:** user authorized commit + push + next CAX31 session. Finished commits/worker refs and logs imported to the Mac;
  updated `docs/cax31-session-handoff.md` for the trn176 / fpc177 implementation queue. This checkpoint changes documentation only.

- **State:** master `7ddbfbb7a`, clean; production src == `3937ecad0` (later commits: tests / tools / docs only). No open DEFERRED items.
  Worker refs retained: `worker/side-20261013-160913` (enc160), `worker/integration-20261013-163536` (plr162),
  `worker/side-20261014-062550` (enc173), `worker/integration-20261014-074723` (trf174), `worker/integration-20261014-104448` (msg175),
  `worker/side-20261014-131640` (trn176), `worker/side-20261014-133659` (fpc177); all merged. Worker logs `.codex-logs/workers/`,
  evidence `.integration/validation/{sv-20261014-*,from-workers/}`. Preview server not started (remote host; build verified instead).
- **Engine (gameplay/RNG):** enc160 (#172: a LOCKED + ENCORED battler takes the locked arm, no retarget draw; supervisor reran the
  hbenc ROM receipt fresh, byte-identical). enc173 (#171 closed): Encore residuals PASS at base, no engine change (3 new ROM receipts).
- **Presentation:** plr162 (#146 Scene OFF forced player send-in tail); trf174 (#153 Transform body + transformed field live, both
  scenes; supervisor fresh 8 / 8 windows 109 / 109 rows 0 px, field 140 / 140); msg175 (#167 (a): "used" print = printable length,
  Scene OFF Wish pause; supervisor reproduced anchors + a fresh Wish probe). Census digests identical for every presentation fold.
- **Evidence for next steps:** trn176 (#167 (a') action-transition rule P = d + 6 + u, 21 / 22 OFF + 12 / 12 ON receipts) and
  fpc177 (#139 Focus Punch edges: order, leads 7 -> 5, action lead 5 + u; 12 cards both scenes). Both reproduced by the supervisor.
- **Gates:** union `5e78e4030` (enc160 + plr162): typecheck, smoke 448, full suite 13,895 / 0 failed, build, all five gameplay gates
  (vanilla 20 / 20; full / winning / winning-swap 0:60 **60 / 60** each on the frozen engine tree; varied-RNG 4 x **100 / 100**).
  Final `3937ecad0`: typecheck 0, smoke 448, build OK, soak vanilla 0:20 **20 / 20**; full suite 1,676 files / 13,908 passed,
  4 failed = msg175 frame-position pins in `sc106StatsChangeCommand.test.ts` (durations / anchors unchanged), re-pinned with cause in
  `aec6435e8`, file 11 / 11 after, typecheck 0.
- **Next:** (1) land trn176's transition hold (#167 (a'), both scenes; re-pin OFF frames with cause); (2) land fpc177's three Focus
  Punch fixes (#139); (3) Substitute HP timing -6 (#153); (4) Transform inventory accounting + other bodies over a transformed
  battler; (5) #146 Scene ON forced player send-in message. Budget gates for this host: full suite ~47 min, vanilla soak ~45 min,
  0:60 gates need range fan-out (PAPERCUTS 2026-10-14).
---
