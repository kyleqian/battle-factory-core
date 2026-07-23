# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 286 — Supervisor wind-down (S7 turn 16 rung 2a): **CANONICAL GREEN; +30 REGISTER-RACE FRAME PARKED AS #38**

- **State:** canonical `20826--21046` is **221/221 exact**. The requested
  delayed twin is **220/221**: only delayed tick **21006** differs. Rung 1
  remains **81/81** each, frozen send-out rung 6 **195/195** each,
  turn-16 verifier **233/233**, Tier-1 **1024/1024**, and build
  (**5.430 MB**) pass.
- **Did:** implemented source-extracted `BG_DARK`, BG3 darken/restore,
  Murkrow's source sine ellipse and alpha handoffs, Magby shake, and the
  generic hitsplat; added pure boundary reducers/tests and a dense,
  prefix-verbatim canonical trace. A fresh two-oracle SHA comparison and
  direct RAM/register probes falsified relative identity at age 150:
  animation task state is identical, but canonical hardware `BLDALPHA` is
  `0x0e02` while delayed is `0x0d03`.
- **Next:** resume S7 at canonical **21047** with FAINT_ATTACK's HP-drain/
  move-handoff tail. Do not reopen exact canonical rung 2a; #38 parks the
  extra delayed-control frame unless a general cycle/register-queue model is
  introduced.
- **Notes:** implementation/evidence commit `d74ab10`; the delay sweep
  `+0..+8,+15,+16,+30,+31,+32` reproduced the early register exposure only
  at +30. No framebuffer assets, per-frame tables, RGB/coordinate fitting,
  absolute-tick lookup, trace branch, or red delayed trace was committed.
  Supervisor independently reverified every number above. The launcher's
  first post-run verdict was a false usage-limit positive: its broad regex
  matched `--no-rate-limit` inside a late `ps` listing; no provider limit
  occurred, and the detector is now hardened.
