# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 364 — S10 Gate-3 immutable rules/event execution seam

- **State:** S10 Gate 3 remains open; the typed interpreter now has a pure,
  unwired cross-layer contract, but still supports only the five source-safe
  control opcodes.
- **Did:** made each handler transition atomically return control, one frozen
  rules context, audited Gen-3 RNG state/ledger, and immutable sequenced
  semantic events (message, HP/status/stage, animation, switch, outcome).
  Added an events-only presentation replay boundary with no rules/RNG input.
- **Next:** add source-mapped mutating opcode families behind this seam,
  preserving structured unsupported behavior; do not wire production
  controllers or presentation until their shared rules context is proven.
- **Notes:** synthetic architecture tests pin immutable/deterministic
  transitions, RNG provenance, neutral controls, replay isolation, budgets,
  unsupported exits, and the existing **3306**-instruction IR. Tier-1 **105
  files / 1428 tests** and build green; no opcode semantics or pixel claim.

---
## 363 — SAND ATTACK exact; Gate-3 source/control foundation integrated

- **State:** S10 Gate 1 remains closed and Gate 3 remains open. Scene-ON is
  now **9 exact / 4 partial / 263 unsupported**; FLY portability is moving
  independently while the production interpreter remains unwired.
- **Did:** accepted SAND ATTACK through complete legal zero-PP-Up portable
  windows in both orientations and the canonical regression. Linked all
  **249/249** Battle Script dispatch slots to exact enum/table rows and C
  handler-definition spans with no missing, duplicate, or aliased handlers.
- **Next:** extend the generic interpreter with an explicit rules-context and
  semantic-event seam before battle-mutating opcodes. Keep FLY source-relative
  and retain issue #34's seven-frame affine exclusion without a special case.
- **Notes:** SAND **269/269 + 269/269 + 190/190**; integrated Tier-1 **104
  files / 1422 tests** and build green. Both new mechanic fixtures use
  `ppUps:[0,0,0,0]`; the independent Gate-2 PP builder remains untouched.

---
## 362 — S10 Gate-3 typed Battle Script control slice

- **State:** S10 Gate 3 remains open; its first typed, inspectable program and
  pure control-machine foundation is green but is not wired to production.
- **Did:** compiled all **619 labels / 3275 source invocations / 6948
  emissions / 3306 opcode starts** from the four committed catalogs into
  immutable width-tagged IR, preserving source/wrapper provenance and honest
  empty-label aliases. Added a generic PC/call-stack/budget machine with
  injected handlers and source-safe `GOTO`, `RETURN`, `END`, `END2`, `CALL`.
- **Next:** extend the generic interpreter with source-mapped battle-context
  and semantic-event contracts before adding battle opcodes; keep unsupported
  commands structured and do not wire the controller until the rules seam is
  proven.
- **Notes:** `END3` remains deliberately unsupported because it owns the
  external callback stack; all other battle mutation, RNG, presentation, and
  **244/249** opcodes remain out of scope. Tier-1 **102 files / 1413 tests**
  and build green; no oracle/pixel claim.
