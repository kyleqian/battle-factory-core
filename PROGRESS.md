# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 420 — move-end battler metadata owner landed

- **State:** dependency step 1 is committed and green at **166 files / 1960
  tests**. Opcodes **73** and **0** remain unregistered; no move-end case,
  delegate, controller, core, render, animation, or oracle behavior was added.
- **Did:** extended each existing frozen rules battler with source `u16 item`,
  all **8** `s8 statStages`, SpecialStatus `restoredBattlerSprite` plus signed
  `physicalDmg/specialDmg`, and ProtectStruct `chargingTurn`. The constructor
  validates widths/cardinality and freezes nested owners; immutable SETBYTE
  updates preserve battler/metadata identity. The Factory vertical derives
  real item IDs **196/171** and source-neutral stages for TYROGUE/PLUSLE.
- **Next:** follow dependency step 2 in the ownership map: add separately
  tested choice/change-item and move-history owners, both absent masks, and
  dynamic/Enigma move-data resolution. Keep opcode 73 unsupported.
- **Notes:** focused **4 files / 23 tests**; integrated **166/1960**, production
  build, OFF v5 info (`9c89c741…`), and diff checks pass. Canonical JSON and
  both player/AI replays preserve the metadata. Code commit `c7dab21`; pixel
  diff N/A.

---
## 419 — executable decision vertical proven; honest MOVEEND boundary mapped

- **State:** the integrated tree is green at **165 files / 1956 tests**. Both
  player and Factory-AI decisions traverse the published boundary and real
  Battle Script machine through source-complete SETBYTE, then stop honestly at
  unregistered opcode **73**; opcode **0** also remains unregistered.
- **Did:** proved frozen validated state, explicit/synchronized RNG, ordered
  semantic events, controller barriers, next unsupported-command barrier, and
  canonical serialized replay for player TYROGUE/Protect and trainer
  PLUSLE/Wish. The minimal source mask-0 AI uses the same legal-decision
  boundary. A generated MOVEEND receipt plus
  `docs/battle-script-move-end-state-ownership.md` now maps all **17** cases,
  **24** sites, modes, durable owners, delegates, and the safe dependency
  order without registering staged semantics. Independently, Scene ON reached
  **16 exact / 1 partial / 259 unsupported** after exact two-orientation
  Extreme Speed and Flamethrower checkpoints.
- **Next:** keep opcode 73 unsupported. Add the small immutable move-end
  battler metadata owner first (item, signed stat stages, special status,
  charging bit), then the separately tested choice/history, topology,
  controller, and source-complete ability/item delegate owners documented in
  the ownership map. Register only after the final all-cases/end-modes gate.
- **Notes:** full `Cmd_moveend` was rejected on the current rules shape rather
  than supplied no-effect delegates. Current exact Flamethrower evidence is
  **126/126 RGB+component frames in both orientations**; the reusable
  persistent sprite-order seam models allocation, destruction/reuse,
  wrapped-Y insertion sorting, and stable ties without frame lookup.

---
## 418 — MOVEEND remains honest behind a complete source boundary

- **State:** the bounded opcode-73 decision checkpoint is green at **163 files /
  1948 tests**. `Cmd_moveend` is not implemented or registered; both asleep
  verticals still stop at the existing honest barrier.
- **Did:** added a regenerable pinned-source receipt covering all **17**
  executable move-end states plus sentinel, all **24** assembled opcode sites,
  fixed `[1,1]` operands, end modes **0/1/2 = 6/4/14**, five wrapper families,
  and every case's verbatim body plus lexical call/global/mutation/controller/
  return/script-transfer boundary.
- **Next:** define durable item/stat-stage, special/protect, choice/change-item,
  battle-position/doubles, and move-history owners; then implement explicit
  ability/item/cleanup/controller/script-transfer delegates. Register opcode
  73 only when every receipt case and end mode is source-complete.
- **Notes:** a staged no-effect delegate suite was rejected as unsound. The
  receipt pins source-layout item cases 11–12 before visibility cases 8–10
  while preserving numeric dispatch. Focused **1 file / 5 tests**; integrated
  **163/1948**, production build, OFF v5 info (`9c89c741…`), and diff checks
  pass. Pixel diff N/A.
