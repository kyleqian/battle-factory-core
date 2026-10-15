# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-15 (evening, in progress) — CAX31 recovery session (supervisor, Opus 5.5)

- **State:** master folds trn178 (`40793066b`, Scene OFF action-transition pause, #167 (a')) and snd179 (`a641cc285`, Scene ON
  forced player send-in evidence, #146); union smoke 448 / 448. Production now differs from `3937ecad0` by trn178 + fpc180 + trn181 + snd182 (presentation only).
- **Did:** independently verified both saved refs (trn176Predict OFF rows reproduced; 17 / 17 targeted tests; 4 fresh snd179 ROM
  probes exact); worktrees removed (only wasm artifacts), refs kept. Details in ANIMATION_INTEGRATION_PROGRESS.md.
- **fpc180 folded** (`5cf23a253`): fpc177's four Focus Punch presentation fixes (#139); supervisor reproduced every OFF card row 0.
- **trn181 folded** (`253a9ff9e`): the action-transition pause in Scene ON (#167 (a')); 13 / 13 ON rows reproduced; union typecheck,
  smoke 448. Worker capped during its full suite; the saved log shows 13,930 / 0 failed on the final src.
- **snd182 folded** (`ecf277b0e`): Scene ON forced player send-in timing (#146), 27 / 27 ROM cases reproduced; union smoke 448.
  Decision: `switchInTail.ts` joins the engine->animation ratchet allowlist (pure back-anim reducers, presentation timing only).
- **Running:** sub183 (integration lane, cap 140) — Substitute turn HP timing -6 (#153). Reserve the final
  ~1 h 45 min for one independent full suite + build on the final tree.

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
