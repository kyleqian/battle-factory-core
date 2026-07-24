# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 367 — Gate-3 immutable scheduler state + wait commands

- **State:** S10 Gate 3 remains open with ten source-safe opcodes and an
  unwired immutable scheduler/controller/source-context seam.
- **Did:** modeled logical `MSG_DISPLAY` and shared `gPauseCounterBattle`
  state, plus budget-consuming same-PC scheduler progress distinct from
  identity-preserving external block. Added source-exact `WAITMESSAGE` and
  `PAUSE` with injected u16 operand resolution; `PRINTSTRING` now owns the
  display-active lifecycle while rules, RNG, and presentation stay isolated.
- **Next:** add another bounded source-mapped semantic family only when its
  complete battle context is explicit; do not wire production controllers or
  renderers and do not add message pixels/substitution here.
- **Notes:** exact supported IDs are
  **16/18/40/57/58/60/61/62/65/131**; committed IR remains **3306**.
  Tier-1 **109 files / 1455 tests** and build green; no new oracle/pixel claim.

---
## 366 — Gate-3 scheduler yield + first source command family

- **State:** S10 Gate 3 remains open with eight source-safe opcodes and an
  unwired deterministic controller/source-context port seam.
- **Did:** added a structured identity-preserving interpreter yield, distinct
  from halt/unsupported/budget exhaustion, then composed source-honest `NOP`,
  controller-gated `WAITSTATE`, and controller/message-context-gated
  `PRINTSTRING` with the existing five controls. Ready print emits one typed
  provenance-stamped message; blocked commands consume no instruction budget.
- **Next:** add another bounded source-mapped semantic family only when its
  complete rules context is explicit. Keep `WAITMESSAGE`/`PAUSE` unsupported
  until message-display and pause-counter state are modeled; do not wire
  production controllers/presentation yet.
- **Notes:** exact supported IDs are **16/40/58/60/61/62/65/131**; the
  committed IR remains **3306** instructions. Tier-1 **108 files / 1446
  tests** and build green; Scene-OFF oracle contract answered, with no new
  oracle/pixel claim.

---
## 365 — Gate-3 event seam + portable FLY state integrated

- **State:** S10 Gate 3 remains open with five source-safe control opcodes and
  an unwired immutable rules/RNG/event seam. Scene-ON remains **9 exact / 4
  partial / 263 unsupported**; FLY is a stronger honest partial.
- **Did:** extracted raw lexical facts for all **249** command handlers,
  preserving **718** script-pointer references and **93** `T1_READ_*` calls
  while retaining **549** unparsed line forms explicitly. Staged legal
  zero-PP-Up FLY in both orientations and added its source-relative charge /
  strike reducer, OAM evidence, and shared component track.
- **Next:** add the first source-safe scheduler/semantic handler family behind
  the generic event seam without fabricating battle context. In animation,
  install player-back MURKROW art and the portable FLY framebuffer/controller
  adapter; retain issue #34's seven-frame exclusion.
- **Notes:** canonical FLY charge **206/206**, strike **256/256**, and SAND
  **190/190** remain exact. Integrated Tier-1 **107 files / 1438 tests**,
  build, and coverage green; both FLY fixtures use `ppUps:[0,0,0,0]`.
