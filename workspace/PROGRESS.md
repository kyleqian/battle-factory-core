# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-14 — CAX31 session: enc160 + plr162 folded (supervisor, in progress)

- **State:** master `5e78e4030` = enc160 (`worker/side-20261013-160913`, #172 engine: a LOCKED + ENCORED battler takes
  `HandleAction_UseMove`'s locked arm, no retarget draw) + plr162 (`worker/integration-20261013-163536`, #146 Scene OFF forced
  player send-in tail; presentation only). Both refs retained. `4f65407b8`: oracle freshness check works on Linux and compares
  against oracle-code commits (it failed on every game commit since the graft).
- **Verified:** source order `battle_util.c:107-128` (locked arm before Encore arms). Fresh CAX31 ROM rerun of enc160-hbenc
  twice: r1 == r2, rebuilt receipt identical to the committed one, verify PASS. plr162 CASTFORM Scene OFF window fresh through
  `plr162Compare.ts`: message 0 px, healthbox 2 px (sprite edge), next text 103 == duration, as the doc claims. Affected tests 17 / 17.
- **Union gates (`5e78e4030`):** typecheck 0; smoke 448; full `npm test` 1,674 files / **13,895 passed, 0 failed** (2,842 s);
  build OK; soak vanilla 0:20 --parallel 2 **20 / 20 OK** (all budget; 2,710 s). Varied-RNG fifth gate: running.
- **Gate scheduling decision:** on CAX31 a 0:20 vanilla soak takes 45 min, so the three 0:60 gates would take ~6 h serially.
  They run once on the session's final engine tree (covering every engine fold); per-step folds run vanilla + the varied sweeps.
- **Next:** enc173 (#171 Encore residuals, engine, side worktree) running; then Transform live body (#153), Substitute HP
  timing, Focus Punch edge routes (#139), Wish / charge "used" handoffs (#167).

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

---

## 2026-10-13 — sub157: #153 Scene OFF plays the Substitute / Transform attack animations (main/ts, presentation only)

- **State:** local master `62b8de71f`, production src `ca4ea3618` (kernel) + `eec0aca08` (OFF x2). 5 / 5 dense Scene OFF Substitute ROM windows
  (PERSIAN<->SLOWBRO, GOLEM<->ONIX both sides, prep37 OFF) **87 / 87 rows 0 px** through production `renderBattleResolutionLiveView`.
- **Did:** `Cmd_attackanimation` exempts Transform / Substitute from HITMARKER_NO_ANIMATIONS (`:1748`). OFF command streams now == ON
  (30 / 30 uses, seeds 0..399). OFF bodies / fades read x2 {0,0} (no front animation in OFF, `pokemon.c:6805`; GOLEM -> ONIX was
  94,917 px). `liveShareCensus.ts --scene=on|off` + `sub157Census.sh`.
- **Ripple:** census 0..999 ON 10 / 10 shards byte-identical. OFF: 27 battles changed, all attributed (47 bodies live +50 frames each,
  1 Transform 39 -> 32, 6 fades now live, battle 881's stalled tail -1 command); `battleDigestExcludingFrames` identical.
  Differential 641 / 641 byte-identical.
- **Next:** #153 remainder (both scenes): Substitute HP command −6 vs ROM (Scene ON route timing); Transform has no live adapter
  (ROM 108 rows, production 32 undrawn); unmeasured OFF fade window and doll <-> mon swaps.
- **Notes:** gates: typecheck 0, smoke 448, build OK; soak vanilla 0:20 --parallel 10 20 / 20 OK, per-seed lines identical to a base
  (`bbd9c6748`) run; full `npm test` (4 shards) 1,667 files / 13,851 tests,
  0 failing after one attributed re-pin (`substituteDollFieldState` BLISSEY 60/28 asserted the old OFF doll-from-prompt; its file 7 / 7).
  Docs
  `docs/sub157-scene-off-substitute.md`; receipt `tools/integration/fixtures/sub157/receipt.json`; scratch `.integration/validation/sub157/`.
