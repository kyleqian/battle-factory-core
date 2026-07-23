# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 293 — Bounded worker (S7 turn 17 rung 3): **GREEN — FAINT_ATTACK resolution exact**

- **State:** canonical `22075--22217` is **143/143 exact**, every tick
  captured. Turn-17 rungs 2/1 remain **221/221** and **118/118**;
  `verify-turn17.ts` passes all **245** checks; Tier-1 is **1052/1052** and
  build passes (**5.458 MB**).
- **Did:** parameterized the shared tail by the actual `79→27` HP delta,
  reproducing wobble/blink, visible drain, tick-22168 atomic HP write,
  secondary/accuracy/crit/damage RNG, battler/target/currentMove and PP
  handoffs, plus FIRE_PUNCH text/controller lead-in. Committed dense
  `turn17-rung3.json`.
- **Next:** resume at **22218**, freshly proven as the first
  FIRE_PUNCH-animation-owned displayed state. Animation body, lethal hit,
  faint/WIN flow, and later ticks remain untouched; #38 stays parked.
- **Notes:** implementation commits `d147fa6` and `ff3bc44`. Fresh
  `gBattleBufferA`/animation RAM plus source corrected the expected ~22197
  endpoint: PRINTSTRING still owns that lead-in; MOVEANIMATION queues at
  22216 and `gAnimScriptActive` first displays at 22218. No forbidden
  framebuffer/absolute-tick/per-frame/trace-fitting mechanism or excluded
  capture. Supervisor independently reverified the dense window, predecessor
  rung, turn-17 verifier, full Tier-1 suite, and production build; ROADMAP
  status accepted. S7 remains `[~]`.

---
## 292 — Bounded worker (S7 turn 17 rung 2): **GREEN — repeated FAINT_ATTACK body exact**

- **State:** canonical `21854--22074` is **221/221 exact**, every tick
  captured. Turn-17 rung 1 remains **118/118**; turn-16 rung 2a is
  **221/221**, rung 5 **175/175**; verifiers pass **233/233** (turn 16)
  and all **245** turn-17 checks; Tier-1 is **1049/1049** and build passes
  (**5.457 MB**).
- **Did:** reused the confirmation-relative FAINT_ATTACK BG_DARK fades,
  Murkrow ellipse/alpha, Magby shake, hitsplat, and source field compositor;
  parameterized MAGBY `79→27` and explicit MURKROW `58/142 BRN` state.
  Pinned animation ownership ages `0..220` and committed dense
  `turn17-rung2.json`.
- **Next:** resume at **22075**, after the final animation-owned VBlank.
  Post-hit wobble/blink, MAGBY HP drain/handoff, FIRE_PUNCH response,
  faint/WIN flow, and later ticks remain untouched; #38 stays parked.
- **Notes:** implementation commit `4dcdcaf`; no absolute battle tick,
  framebuffer/screenshot asset, per-frame table, trace branch,
  coordinate/RGB fitting, or excluded capture. Supervisor independently
  reverified the dense window, predecessor rung, turn-17 verifier, full
  Tier-1 suite, and production build; ROADMAP status accepted.
