# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  or excluded capture.

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

---
## 287 — Bounded worker (S7 turn 16 rung 2b): **GREEN — FAINT_ATTACK resolution tail**

- **State:** canonical `21047--21169` is **123/123 exact**. Rung 2a remains
  **221/221**, rung 1 canonical/delayed remain **81/81** each, turn-16
  verifier **233/233**, Tier-1 **1028/1028**, and build (**5.432 MB**) pass.
- **Did:** added confirmation-relative post-hit wobble/blink reducers,
  parameterized 1-HP/tick MAGBY drain `138→79`, atomic battle-HP and
  zero-chance secondary-roll state, then the target/current-move/attacker
  handoff and FIRE_PUNCH accuracy/text boundary. Committed the dense
  prefix-exact `turn16-rung2b.json`.
- **Next:** resume S7 at canonical **21170**, the first FIRE_PUNCH
  animation-owned frame. Do not reopen exact turn-16 rungs 1, 2a, or 2b;
  #38 remains parked.
- **Notes:** implementation commit `a24b857`; first FIRE_PUNCH text pixels
  are `M`/`MA` at 21168/21169, while the cast animation begins at 21170.
  No absolute-tick lookup, framebuffer asset, per-frame table, RGB/coordinate
  fitting, trace branch, or excluded capture. Supervisor independently
  reverified every number above. A second false usage-limit digest matched
  project text inside a successful structured command event; detection now
  parses only provider failure events, with both positive and negative logs
  checked.
