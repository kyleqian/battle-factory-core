# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 407 — Gate-3 attack-canceler THAW source phase integrated

- **State:** the run is clean and green at **148 files / 1850 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through THAW/END
  source decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** ported battle_util.c:2250-2264 plus the common effect-2 controller
  sync at 2270-2275. `EFFECT_THAW_HIT` alone clears `STATUS1_FREEZE`, pushes
  the cursor, selects `BattleScript_MoveUsedUnfroze`, and sets
  `B_MSG_DEFROSTED_BY_MOVE`; every frozen path returns effect 2 and records the
  exact active-battler/status-write/controller-mark ownership semantically.
- **Next:** keep THAW unlooped and opcode 0 unregistered until the supervisor
  selects the next explicit Gate-3 boundary; do not integrate the decision
  boundary or claim live controller/presentation ownership.
- **Notes:** battlers **0/1**, both sides, generated Flame Wheel/Sacred Fire
  thaw effects and Tackle control, non-frozen effect 0, frozen non-thaw effect
  2 with unchanged status/script, other status bits, preset chooser/rules
  state, missing/invalid context, exact zero-call RNG, one advance to
  `CANCELER_END`, immutability/determinism, and deep freezing are pinned.
  Focused **3 files / 33 tests**; integrated Tier-1 **148/1850**, build, OFF
  v5 info (`9c89c741…`), and diff check green. Code commits `faabbf0` +
  `aaf3f64`; pixel diff N/A.

---
## 406 — Gate-3 attack-canceler BIDE source phase integrated

- **State:** the run is clean and green at **146 files / 1840 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through BIDE source
  decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** ported battle_util.c:2220-2247 with source-ordered
  `STATUS2_BIDE_TURN(1)` subtraction, storage/no-energy/attack script handoffs,
  `MOVE_BIDE`, signed-s32 doubled scripting damage, and saved-target ownership.
  Published frozen `gBideDmg`/`gBideTarget`/scripting-damage/absent-bit state
  plus explicit receipts; Bide itself preserves `STATUS2_MULTIPLETURNS`.
- **Next:** begin `CANCELER_THAW` only after its freeze/effect predicate,
  status clear, cursor, chooser, status-controller write, effect, script, and
  tracker receipts are explicit. Do not loop phases or register opcode 0.
- **Notes:** singles battlers **0/1**, both sides/saved opposing slots, no-Bide,
  reachable counters **2→1→0** and rejected **3**, zero/positive releases,
  positive-s32 doubling through wrap boundaries, target replacement/
  preservation, status-bit and multi-turn preservation, invalid context, exact
  zero-call RNG ownership, immutability/determinism, and deep freezing are
  pinned. The absent-target fallback is explicitly unsupported because
  `gAbsentBattlerFlags` starts zero, singles `HasNoMonsToSwitch` returns FALSE,
  and switch-in clears the reused active slot; doubles-only `GetMoveTarget`
  RNG/Follow Me/Lightning Rod was not imported. Focused **4 files / 49 tests**;
  integrated Tier-1 **146/1840**, build, OFF v5 info (`9c89c741…`), and diff
  check green. Code commit `7b20bb8`; pixel diff N/A.

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
