# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 400 — S10 immutable battle decision-boundary ABI published

- **State:** the run is clean and green at **138 files / 1763 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes; the new headless
  battle-level ABI is published but deliberately not integrated into
  `core.ts`, `battleScene.ts`, or the incomplete Battle Script machine.
- **Did:** added a versioned, canonical-JSON `BattleState` whose returned
  immutable state alone persists Emerald LCG value/call count. One matching
  player/trainer command or explicit forced-switch submission runs an injected
  pure rules reducer and returns ordered frozen semantic events plus exactly
  one next request or terminal outcome. Builders validate the honest current
  Level-50 singles shapes: move, voluntary switch, and forced switch.
- **Next:** supervisor-verify commit `48a7408`. Any production script-machine
  adapter, native trainer AI, broader decision kinds, or facility integration
  must be a separately bounded S10 increment; do not imply those exist from
  this architecture checkpoint or resume the canonical Battle-2 march.
- **Notes:** focused **1 file / 12 tests**, integrated Tier-1 **138 files /
  1763 tests**, build, OFF v5 info (`9c89c741…`), and diff check green. Tests
  pin caller immutability/deep freezing, canonical serialization and replay,
  request mismatch rejection, state-owned/no-ambient RNG, both sides and
  forced switches, event order, boundary exclusivity, and rejection of
  presentation acknowledgements before rules/RNG execution. Pixel diff N/A.

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

---
## 398 — Gate-3 attack-canceler TAUNTED source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS through
  TAUNTED decisions only; opcode 0 remains unregistered and no phase loop exists.
- **Did:** added source-derived u8 `gBattleMoves[gCurrentMove].power`,
  `DisableStruct::tauntTimer:u8:4`, and `ProtectStruct::usedTauntedMove:1`.
  Ported battle_util.c 2134-2145 exactly through the immutable multi-turn
  helper, taunted script handoff, unable marker, effect 1, and one advance.
- **Next:** begin `CANCELER_IMPRISONED` only after its imprisoned-move
  predicate, protect flag, helper, script, marker, effect, and receipts are
  explicit. Do not loop phases or register opcode 0.
- **Notes:** zero PP Ups; timer **0/15** and invalid **16+**, generated
  zero/nonzero power, both flag values, all four battlers, presets/identities,
  missing role, u32 PC, deterministic deep freezing, and receipt ownership are
  pinned. Focused **4 files / 39 tests**; integrated Tier-1 **137 files / 1751
  tests**, build, and OFF v5 info (`9c89c741…`) green. Code commit `26d9a8b`;
  pixel diff N/A.
