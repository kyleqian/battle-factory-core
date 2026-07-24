# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 402 — Gate-3 attack-canceler CONFUSED source phase integrated

- **State:** the run is clean and green at **140 files / 1777 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through CONFUSED
  source decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** ported `CANCELER_CONFUSED` from battle_util.c:2156-2187 with the
  source-ordered counter decrement and conditional `Random() & 1` LCG receipt.
  Added explicit chooser/cursor, target, battle-damage, protect flag,
  unable-marker, effect, and script ownership. The self-hit calculation records
  `MOVE_POUND`, side status 0, power override 40, type override 0, and same
  attacker/defender; `BattleScript_DoSelfConfusionDmg` retains the later
  `cancelmultiturnmoves` ownership from battle_scripts_1.s:3801-3803.
- **Next:** begin `CANCELER_PARALYZED` only after its status predicate,
  conditional `Random()%4`, protect flag, script/marker/effect, and receipts
  are explicit. Do not loop phases or register opcode 0.
- **Notes:** not-confused, snap at counter 1, continuing odd draw, even self-hit,
  source-reachable counters **0..5** and rejected **6/7**, missing/invalid
  damage context, exact LCG ownership, all four attackers/both sides, target
  replacement, preset chooser/damage/protect/marker, deferred multi-turn
  cancellation, exactly one tracker advance, input immutability, deterministic
  replay, and deep freezing are pinned. Focused **5 files / 49 tests**;
  integrated Tier-1 **140 files / 1777 tests**, build, OFF v5 info
  (`9c89c741…`), and diff check green. Code commit `9fdfba3`; pixel diff N/A.

---
## 401 — Gate-3 attack-canceler IMPRISONED source phase integrated

- **State:** the run is clean and green at **139 files / 1771 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through IMPRISONED
  source decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** added explicit `GetBattlerSide`, four `u16` move slots,
  `STATUS3_IMPRISONED_OTHERS`, and
  `ProtectStruct::usedImprisonedMove:1` ownership. Ported
  `GetImprisonedMovesCount` (battle_util.c 1142-1163) as a frozen,
  short-circuiting scan receipt and the IMPRISONED branch (2145-2155) through
  the multi-turn helper, imprisoned script, unable marker, effect 1, and one
  advance to `CANCELER_CONFUSED`.
- **Next:** begin `CANCELER_CONFUSED` only after its counter/RNG branches,
  cursor and multistring ownership, protect flag, self-hit calculation/script,
  marker/effect, and receipts are explicit. Do not loop phases or register
  opcode 0.
- **Notes:** all four battler identities, both explicit sides, ally/opponent
  layouts, all four move slots and short-circuit order, duplicate ownership,
  empty slots, u16 **0/65535** and invalid boundaries, both protect presets,
  missing/invalid context, multi-turn cancellation, script/marker/effect,
  exactly one tracker advance, deterministic deep freezing/input immutability,
  and no ambient RNG are pinned. Focused **3 files / 29 tests**; integrated
  Tier-1 **139 files / 1771 tests**, build, OFF v5 info (`9c89c741…`), and
  diff check green. Code commits `cdb9f4e` + `16ec3d6`; pixel diff N/A.

---
## 400 — S10 battle boundary published; BIND portability integrated

- **State:** the run is clean and green at **138 files / 1764 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes; the new headless
  battle-level ABI is published but deliberately not integrated into
  `core.ts`, `battleScene.ts`, or the incomplete Battle Script machine.
  Scene-ON coverage is **13 exact / 1 partial / 262 unsupported**.
- **Did:** added a versioned, canonical-JSON `BattleState` whose returned
  immutable state alone persists Emerald LCG value/call count. One matching
  player/trainer command or explicit forced-switch submission runs an injected
  pure rules reducer and returns ordered frozen semantic events plus exactly
  one next request or terminal outcome. BIND's opposite ONIX→MURKROW
  orientation is exact at task/OAM **45/45** and RGB **45/45**, promoting the
  move to exact without owning hit/result/residual logic.
- **Next:** resume the bounded `CANCELER_IMPRISONED` source phase without a
  phase loop or opcode-0 registration. In parallel, audit native Factory AI
  view/history/RNG/switch-item dependencies and prove MUD SLAP as the next
  bounded Level-50 animation unit with SAND ATTACK kept green.
- **Notes:** focused **1 file / 12 tests**, integrated Tier-1 **138 files /
  1764 tests**, build, both v5 oracle profiles (`9c89c741…`), and diff check
  are supervisor-green. Tests
  pin caller immutability/deep freezing, canonical serialization and replay,
  request mismatch rejection, state-owned/no-ambient RNG, both sides and
  forced switches, event order, boundary exclusivity, and rejection of
  presentation acknowledgements before rules/RNG execution. BIND's existing
  orientation also remains **45/45 + 45/45** exact; merge `86f1beb`.
