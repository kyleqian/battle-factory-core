# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 296 — Bounded worker (S7 turn 17 rung 6): **GREEN — faint hold/dismiss latency exact**

- **State:** canonical `22531--22826` is gaplessly **296/296 exact** in
  adjacent dense traces (**255/255 + 41/41**). Rung 5 remains **113/113**,
  `verify-turn17.ts` passes **245/245**, Tier-1 is **1061/1061**, and build
  passes (**5.460 MB**).
- **Did:** added confirmation-relative faint input readiness, dropped early
  edges/indefinite idle, stored the real dismiss A, froze its cursor phase,
  modeled the dismiss+17 WIN write and dismiss+26 first-render boundary, and
  suppressed the impossible post-KO residual-burn flame. Committed both
  fully dense adjacent traces.
- **Next:** resume at **22827**, the first visible `"Player defeated..."`
  typing frame. Its typing/hold, second dismiss, trainer transition/loss
  quote, and #38 remain untouched; S7 stays `[~]`.
- **Notes:** implementation commit `ed2b46a`. Source chain:
  `BattleScript_HandleFaintedMon` → `Cmd_checkteamslost` →
  `HandleEndTurn_BattleWon`/frontier win script; RAM pins outcome 0→1 at
  22818 with frozen pixels through 22826. No forbidden absolute tick,
  framebuffer/per-frame table, fitted geometry/color, trace branch,
  excluded capture, or thinning.

---
## 295 — Bounded worker (S7 turn 17 rung 5): **GREEN — lethal faint through typed gate exact**

- **State:** canonical `22418--22530` is **113/113 exact**, every tick
  captured. Turn-17 rung 4 remains **200/200**, `turn5-faint.json` remains
  **110/110**, `verify-turn17.ts` passes all **245** checks, Tier-1 is
  **1056/1056**, and build passes (**5.460 MB**).
- **Did:** parameterized the shared FIRE_PUNCH profile for the atomic
  `58→0` write, lethal secondary RNG/no-op, seven-step opponent sink,
  healthbox+BRN teardown/status clear, faint glyph cadence, settle, and
  fully typed wait-cursor/input gate. Committed dense `turn17-rung5.json`.
- **Next:** resume at **22531**. The long button-gated faint-text hold,
  dismiss A at 22801, battle outcome/victory/trainer transition, and #38
  remain untouched; S7 stays `[~]`.
- **Notes:** implementation commit `de79bdf`. Fresh RAM replays confirmed
  HP age 227, secondary +5, sink S=KO+73/n=7, teardown +90, text +92, and
  gate +112. No forbidden framebuffer/absolute-tick/per-frame/trace branch,
  fitted coordinate/color, excluded capture, or thinned trace. Supervisor
  independently reverified the dense window, both reuse regressions,
  turn-17 verifier, full Tier-1 suite, and production build; ROADMAP status
  accepted.

---
## 294 — Bounded worker (S7 turn 17 rung 4): **GREEN — lethal FIRE_PUNCH pre-write exact**

- **State:** canonical `22218--22417` is **200/200 exact**, every tick
  captured. Turn-17 rung 3 remains **143/143**, Turn-16 rung 3 remains
  **236/236**, `verify-turn17.ts` passes all **245** checks, Tier-1 is
  **1054/1054**, and build passes (**5.458 MB**).
- **Did:** reused the shared FIRE_PUNCH cast at confirmation-relative reducer
  age 27, parameterized MURKROW's `58→0 BRN` resolution profile, and modeled
  source `CalcBarFilledPixels` lethal-target behavior so the final positive
  controller values do not force a 1px sliver. Committed dense
  `turn17-rung4.json`.
- **Next:** resume at **22418**, the atomic `gBattleMons[1].hp 58→0` write.
  Secondary roll/no-op, faint sink/text, victory flow, and later ticks remain
  untouched; #38 stays parked.
- **Notes:** implementation commit `aad02b4`. Fresh two-frame comparison
  matched 22417 and intentionally diverged at 22418, independently confirming
  the RAM/verifier write boundary. No forbidden framebuffer, absolute tick,
  per-frame table, trace branch, fitted coordinate/color, excluded capture,
  or thinned trace. Supervisor independently reverified the dense window,
  both reuse regressions, turn-17 verifier, full Tier-1 suite, and production
  build; ROADMAP status accepted.
