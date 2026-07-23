# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 290 — Bounded worker (S7 turn 16 rung 5): **GREEN — turn complete**

- **State:** canonical `21561--21735` is **175/175 exact**, every tick
  captured. Rung 4 is **155/155**, rung 3 **236/236**, rung 2b **123/123**,
  rung 2a **221/221**, rung 1 canonical/delayed **81/81** each, verifier
  **233/233**, Tier-1 **1040/1040**, and build (**5.456 MB**) pass.
- **Did:** completed the typed/held burn-residual message, reused the source
  Status_Burn flames, applied `floor(142/8)=17`, drained MURKROW `75→58`
  with BRN retained, committed HP at 21714, reproduced both tail AI/RNG
  boundaries, then cleared/redrew into turn 17's freshly-bouncing action
  menu. Committed dense `turn16-rung5.json`.
- **Next:** S7 may resume at **21736** with the already-settled turn-17
  action menu; turn-17 selection/resolution was explicitly out of scope.
  Do not reopen exact turn-16 rungs 1--5; #38 remains parked.
- **Notes:** implementation commit `5cbcd69`; all timing is local
  FIRE_PUNCH/action-menu age. No forbidden framebuffer, absolute-tick,
  per-frame table, trace branch, fitted color/coordinate, or excluded capture.
  Supervisor independently reverified the dense tail, predecessor rung,
  verifier, full Tier-1 suite, and build; the ROADMAP status is accepted.
