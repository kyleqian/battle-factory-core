# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  capture. ROADMAP status is proposed, not accepted; S7 remains `[~]`.

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

---
## 291 — Bounded worker (S7 turn 17 rung 1): **GREEN — dispatch prefix exact**

- **State:** canonical `21736--21853` is **118/118 exact**, every tick
  captured. Turn-16 rungs 5/4 remain **175/175** and **155/155**; verifiers
  pass **233/233** (turn 16) and all turn-17 checks (**245 captures**);
  Tier-1 is **1048/1048** and build passes (**5.457 MB**).
- **Did:** added honest turn-17 epoch/redraw state, preserved MAGBY
  `79/138` and MURKROW `58/142 BRN`, reopened FIRE_PUNCH at `14/15` PP,
  accepted the 21801 confirm, and pinned MURKROW-first ownership,
  FAINT_ATTACK currentMove, no-crit RNG, and the RAM `52` damage roll.
  Added a direct source-accurate burned-physical-damage regression and
  committed dense `turn17-rung1.json`.
- **Next:** resume at **21854**, confirmed as the first FAINT_ATTACK
  animation-owned render. Animation body, HP drain, FIRE_PUNCH response,
  faint/WIN flow, and everything later remain untouched; #38 stays parked.
- **Notes:** implementation commit `210ace5`; all scheduling derives from
  the stored turn-16/17 confirmation and redraw ages. No absolute battle
  tick, framebuffer/screenshot asset, per-frame table, trace branch,
  coordinate/RGB fitting, or excluded capture. Supervisor independently
  reverified the dense window, both oracle verifiers, full Tier-1 suite, and
  build; ROADMAP status accepted. The dossier's old burn-halving inference
  is corrected: DARK is special in Gen 3, so the exact 52 is variance.
