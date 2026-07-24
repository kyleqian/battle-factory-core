# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 405 — Gate-3 attack-canceler IN_LOVE source phase integrated

- **State:** the run is clean and green at **145 files / 1832 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through IN_LOVE source
  decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** ported battle_util.c:2200-2219 with the exact four-bit
  `STATUS2_INFATUATION` encoding, `CountTrailingZeroBits` scripting-battler
  ownership, conditional `Random() & 1`, odd cursor push, and even
  `BattleScriptPush(BattleScript_MoveUsedIsInLoveCantAttack)`. The even branch
  sets `loveImmobility` and the unable marker and executes
  `CancelMultiTurnMoves` immediately before the common in-love handoff.
- **Next:** begin `CANCELER_BIDE` only after its counter, stored-damage,
  target, move-damage, multi-turn, marker/effect, and script paths have explicit
  source receipts. Do not loop phases or register opcode 0.
- **Notes:** all four source bits and attackers/both sides, zero/no-draw,
  rejected nonzero multi-bit source-unreachable encodings, both RNG branches,
  u16 **0/1/65534/65535**, exact one-call LCG ownership, cursor-push vs
  script-push, scripting replacement, preset protect/marker/helper state,
  immediate helper mutation, exactly one advance to BIDE, missing/invalid
  context, immutability, determinism, and deep freezing are pinned. Focused
  **3 files / 26 tests**; integrated Tier-1 **145/1832**, build, OFF v5 info
  (`9c89c741…`), and diff check green. Code commit `1690b58`; pixel diff N/A.

---
## 404 — PARALYZED, Factory AI policy seam, and MUD SLAP integrated

- **State:** the merged run is clean and green at **144 files / 1825 tests**.
  S10 Gate 3 remains at **27** source-safe executable opcodes and the attack
  canceler remains deliberately unregistered/unlooped. Scene-ON Level-50
  coverage is **14 exact / 1 partial / 261 unsupported**.
- **Did:** independently accepted the immutable `CANCELER_PARALYZED` source
  phase, a pure generated-policy-backed Factory AI mask selector with explicit
  0/1/7 branch receipts, and MUD SLAP's distinct 16x16 mud program plus shared
  side-sensitive slide choreography. The AI script catalogue now also records
  **469** reachable labels, **1,034** control edges, and **60** native handler
  dependencies for later interpreter work.
- **Next:** implement `CANCELER_IN_LOVE` as one bounded source phase without
  looping or registering opcode 0. In parallel, prove another disjoint
  Level-50 animation/component window and stage a bounded native-AI behavior/RNG
  probe without defining the unfinished shared scorer interface.
- **Notes:** supervisor replayed MUD SLAP at source OAM + RGB **51/51** in both
  orientations and retained both SAND ATTACK controls at **269/269**. The AI
  selector's **32/32** focused tests and PARALYZED's **47** focused seam tests
  pass. Combined Tier-1 **144/1825**, build, both v5 oracle profiles
  (`9c89c741…`), animation coverage, and diff check are green. Merges
  `40336a1` + `1b28a45`; pixel diff N/A outside the cited ON windows.

---
## 403 — Gate-3 attack-canceler PARALYZED source phase integrated

- **State:** the run is clean and green at **142 files / 1789 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through PARALYZED
  source decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** ported battle_util.c:2188-2199 with the exact
  `status1 & STATUS1_PARALYSIS` predicate and conditional `Random() % 4`
  ownership. Modulo zero sets `ProtectStruct::prlzImmobility`, the unable
  marker, effect 1, and hands off to `BattleScript_MoveUsedIsParalyzed`;
  its later `cancelmultiturnmoves BS_ATTACKER` remains explicitly script-owned.
- **Next:** begin `CANCELER_IN_LOVE` only after its infatuation source,
  battler selection, conditional RNG/cursor/script branches, protect flag,
  helper ownership, marker/effect, and receipts are explicit. Do not loop
  phases or register opcode 0.
- **Notes:** all four battlers/both sides, non-paralyzed no-draw, all four
  modulo outcomes and boundaries **0/3/4/65535**, preset protect/marker,
  missing/invalid context, exact one-call LCG ownership, exactly one tracker
  advance, input immutability, deterministic replay, and deep freezing are
  pinned. Focused **4 files / 39 tests**; integrated Tier-1 **142 files / 1789
  tests**, build, OFF v5 info (`9c89c741…`), and diff check green. Code commit
  `e6a9b8e`; pixel diff N/A.
