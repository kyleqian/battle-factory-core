# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 2026-10-13 — CAX31 next-session handoff (infrastructure only)

- **State:** separate `codex/cax31-arm-setup` branch from game snapshot `b3e988d67`,
  plus the Mac's committed charge-turn test re-pins `36b23e98c`; no new game code.
  Helsinki CAX31 validated; user authorized commit + push + the next remote main
  session. Remote `master` is assigned; the Mac supervisor is stopped at its
  previous 10-hour cap and must stay stopped until remote results are imported.
- **Did:** native ARM Node/mGBA/Python/Rust setup; both oracle hashes match, and two
  fresh stock-ROM rcp143 R1 probes reproduce the committed battle/RNG receipt.
  Typecheck, 448 smoke tests, Rust tests and WASM build/adapter checks passed;
  all 9,550 native-generated reference data targets == Mac SHA256;
  13,878 TypeScript cases verified (full run + 25 files / 174 cases retested
  after Mac test pins, reference asset generation and GNU tar PATH fixes); build passed.
  Fresh Claude Max login completed; CLI upgraded to 2.1.280 (required by Opus 5.5);
  Opus 5.5 and Sonnet 5.5 no-tools inference probes passed. Prepared the host
  assignment, portable supervisor prompt and `docs/cax31-session-handoff.md`.
- **Next:** remote supervisor first verifies/folds enc160 `worker/side-20261013-160913`
  (`09589b431`) and plr162 `worker/integration-20261013-163536` (`ca658cd6f`),
  runs required union gates, then continues the authorized Factory finish-up.
  Launch: Opus / Sonnet, headless tmux, 10-hour cap; no timers or automatic push.
- **Notes:** `docs/cax31-arm-runner.md` records access, validation and limits;
  raw receipts/logs are ignored under `.integration/validation/cax31-arm-20261013/`.

---

## 2026-10-13 — chg161: #167 (d) charge-turn EMPTYSTRING3 box per scene (main/ts, presentation only)

- **State:** local master, production src `b048842dc` (+ pins `8ac2edd8f`). off108's Dig / Razor Wind / Solar Beam windows re-probed fresh
  (6 / 6 r1 == r2 == off108). Charge print's first glyph vs ROM: OFF **0 / 0 / 0** (was +24), ON **0 / -1 / 0** (was +16 / +15 / +16;
  Razor Wind -1 = its 48-frame live adapter vs the 49-row ROM run).
- **Did:** `chargeTurnEmptyBoxTiming` (BattleScriptFirstChargingTurn's box, every two-turn move): OFF 1 row (the off108 pause counts it,
  P 42 -> 41); ON one frame per interpreter execution to the charge print (8). olnd113's 3 charge rows re-pinned (box from G + 1).
- **Ripple:** census 0..999: the same 252 battles in both scenes, 639 charge turns (ON -16, OFF -24 each); ON keys / live 27,084
  unchanged; `battleDigestExcludingFrames` identical outside the budget-stalled tails (796 ON, 881 OFF +1 command). Differential
  641 / 641 byte-identical.
- **Next:** #167 (d) remainder: the ON live charge animation starts 7 rows late (it needs a presented post-animation hold). The
  held print -> next "used" edge is -10 .. -14 (general: the Sand-Attack control is -12; same family as (a)).
- **Notes:** gates: typecheck 0, smoke 448, build OK; full `npm test`: 1,669 files / 13,874 passed, 4 failed = 4 attributed frame
  re-pins (seed 0 / 21 soak frames, sc106 seed 0 -16 x Dig box, sgl138 receipt 0-on -32 / 0-off -48), files 81 / 81 after.
  Docs `docs/chg161-charge-turn-print.md`; receipt
  `tools/integration/fixtures/chg161/receipt.json`; scratch `.integration/validation/chg161/`.
