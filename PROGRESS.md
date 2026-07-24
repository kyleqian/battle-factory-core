# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 399 — S10 battle-kernel and trainer-AI architecture checkpoint queued

- **State:** the run is clean and green at **137 files / 1751 tests** with
  S10 Gate 3 still at **27** source-safe executable opcodes. The script machine
  is immutable and unit-testable, but no complete battle-level
  state/decision/result boundary or independently executable trainer AI exists.
- **Did:** recorded the user's S10 acceptance decision: RNG lives in immutable
  battle state after initialization; one submitted requested decision returns
  state, semantic events, and the next decision/outcome; forced switches are
  decision boundaries; presentation acknowledgements cannot own rules/RNG.
  Emerald AI is an injected pure policy over a source-faithful view, legal
  decisions, Factory policy, and explicit RNG.
- **Next:** before `CANCELER_IMPRISONED` or wider opcode breadth, brief one
  bounded Sol/high main-lane architecture step to publish and Tier-1 pin the
  battle-level decision-boundary ABI around the existing script machine. Keep
  production `core.ts` integration, AI implementation, further opcodes, and
  presentation migration out of that first step. A disjoint side audit may
  map native AI view/history/RNG/switch-item dependencies; animation may
  continue BIND's opposite orientation independently.
- **Notes:** unit-test builders may construct validated transient states; the
  Oracle still may not inject them. Current smells to contain rather than
  extend are the 16k-line `battleScene.ts`, legacy `turnNResolved`/absolute-tick
  production path, 1.9k-line canceler module, growing monolithic rules context,
  and move-specific Scene-ON dispatch. No code, tooling, or oracle lifecycle
  changed in this handoff; no deferred user decision is open.
