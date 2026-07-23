# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 289 — Bounded worker (S7 turn 16 rung 4): **GREEN — burn proc + BRN badge**

- **State:** canonical `21406--21560` is **155/155 exact**, every tick
  captured. Rung 3 is **236/236**, rung 2b **123/123**, rung 2a **221/221**,
  rung 1 canonical/delayed **81/81** each, verifier **233/233**, Tier-1
  **1037/1037**, and build (**5.455 MB**) pass.
- **Did:** added local-age atomic HP/status/RNG/reset state, the source/RAM
  three-flame burn animation, exact burned/residual-message handoff, and the
  reusable opponent BRN compositor including `HEALTHBOX_GFX_0/65` end caps.
  Committed dense `turn16-rung4.json`; closed and deleted ISSUE #16.
- **Next:** resume S7 at canonical **21561** with the already-started burn-
  residual message, then residual HP damage/turn-end. Do not reopen exact
  turn-16 rungs 1--4; #38 remains parked.
- **Notes:** implementation commit `f7a8629`; every-tick comparison corrected
  the old dossier/verifier label: first burned-message `F` is 21453, while
  21465 is only its cited partial-text SHA. No forbidden pixel/trace mechanism
  or excluded capture. Supervisor independently reverified the dense window,
  predecessor rung, verifier, full Tier-1 suite, and production build; the
  factual ROADMAP status note and ISSUE #16 deletion are accepted.

---
## 288 — Bounded worker (S7 turn 16 rung 3): **GREEN — complete FIRE_PUNCH cast**

- **State:** canonical `21170--21405` is **236/236 exact**, every tick
  captured. Rung 2b remains **123/123**, rung 2a **221/221**, rung 1
  canonical/delayed **81/81** each, turn-16 verifier **233/233**, Tier-1
  **1034/1034**, and build (**5.454 MB**) pass.
- **Did:** source-extracted FIRE_PUNCH's shared ember and fist assets and
  added confirmation-relative reducers for target red blend/restore, four
  spiral embers, fist + hitsplat, target shake, seven spread embers with
  RAM-backed stable OAM ordering, generic hit wobble/blink, and the visible
  `142→75` HP drain. Committed dense `turn16-rung3.json`.
- **Next:** resume S7 at canonical **21406**, FIRE_PUNCH's atomic opponent-HP
  write. Secondary burn roll/message, BRN badge, burn residual, and turn-end
  are also untouched; #38 remains parked.
- **Notes:** implementation commit `acd37de`; no framebuffer/screenshots,
  absolute-tick lookup, per-frame pixel/SHA table, trace branch,
  coordinate/RGB fitting, or excluded capture.
