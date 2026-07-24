# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 408 — Complete attack-canceler source loop composed (focused green)

- **State:** the pure `AtkCanceler_UnableToUseMove` do/while composition is
  implemented and focused-green at **1 file / 9 tests** plus `tsc -b`. Opcode
  0 remains unregistered; no decision-boundary, controller, round, or
  presentation integration was added. Full regression/build verification is
  the remaining closeout.
- **Did:** added one typed immutable dispatcher over the existing FLAGS→THAW
  phase helpers. It starts at the state tracker, stops at END or the first
  nonzero effect, returns the advanced resumable rules/RNG state, ordered
  phase decisions, final script handoff, cumulative RNG value/call receipt,
  and the source-common effect-2 status-controller synchronization.
- **Next:** run the complete canceler-focused set, full `npm test`, production
  build, OFF oracle info, and final diff audit; then record exact totals and
  the next opcode-registration boundary.
- **Notes:** both singles sides, full all-clear traversal, asleep/Truant/Bide
  source-order stops, exact FROZEN→PARALYZED→IN_LOVE and FROZEN→CONFUSED RNG
  chains, skipped-later-phase zero consumption, effect-2 sleep/freeze/thaw
  sync, effect-1/effect-2 resumptions through END, invalid state/tracker/PC/RNG
  accounting, determinism, immutability, and recursive deep freezing are
  pinned. Pixel diff N/A.

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
