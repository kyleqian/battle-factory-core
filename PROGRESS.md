# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 421 — move-end choice/change ownership landed and Baton Pass repaired

- **State:** dependency step 2a plus its evidence-driven Baton Pass repair are
  committed and green at **168 files / 1968 tests**. Opcodes **73** and **0**
  remain unregistered; no move-history, topology, controller, ability/item
  delegate, script-transfer, or presentation behavior was added.
- **Did:** extended the existing frozen rules record with source `u16`
  `chosenMove`, `choicedMove[4]`, and `changedItems[4]`; the independent
  BattleStruct absent `u8` mask; `dynamicMoveType`; and four Enigma held-effect
  bytes. Pure ownership reducers pin Choice Band/Baton Pass/stale-choice order
  and changed-item copy+clear behavior. Successful Baton Pass now preserves an
  unavailable choice by taking the source break; failed Baton Pass assigns the
  chosen move and runs membership cleanup. Generated numeric item effects and
  exact `GET_MOVE_TYPE`/Enigma resolvers cover normal, dynamic-Normal, masked,
  implicit-none, and invalid-corpus cases.
- **Next:** finish dependency step 2 with the six independent move-history
  arrays plus packed mirror-history owners and source-order reducers. Then add
  topology (`gBattlersCount`, type flags, positions), `WasUnableToUseMove`,
  controller requests, complete ability/item delegates, cleanup/next-target
  transfer, and loop/end-mode control before registering opcode 73.
- **Notes:** pinned `battle_script_commands.c:4302-4315`: only successful
  Baton Pass increments/breaks before assignment and stale-choice cleanup.
  Adjacent choice/change/type/item branches match source review. Integrated
  suite/build and OFF v5 (`9c89c741…`) pass. Code commits `7a6c741`,
  repair `d9b3575`; pixel diff N/A.

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
