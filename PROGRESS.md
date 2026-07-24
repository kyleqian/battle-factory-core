# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 413 — Factory asleep decision reaches real script barrier

- **State:** the assigned S10 vertical composition is committed, clean, and
  green at **160 files / 1917 tests**. Gate 3 still has **27** source-safe
  executable opcodes; opcode 0 remains unregistered.
- **Did:** published a serializable machine barrier and read-only boundary RNG
  snapshot, then added one compact production adapter. A validated Level-50
  set-15 TYROGUE asleep state requests its four real Factory moves; submitting
  PROTECT slot 1 maps its real `BattleScript_EffectProtect` opcode-0 entry
  through the completed asleep admission helper into
  `BattleScript_MoveUsedIsAsleep`, executes source opcodes **16→18→100→40**,
  safely acknowledges controller presentation, and stops before unsupported
  move-end opcode **46**.
- **Next:** add the minimal injected Factory-AI seam on this same kernel
  boundary: source-faithful view + kernel-enumerated legal decisions + explicit
  RNG returns one legal decision, updated RNG, and inspectable trace, then
  submits through the identical `BattleDecisionBoundary`.
- **Notes:** ordered events are `STRINGID_PKMNFASTASLEEP` then status animation
  for TYROGUE; sleep **4→3**, PP **[30,10,15,20]** unchanged, explicit RNG
  **0xf4c96838 / 0 calls** unchanged, and barrier execution count **67**.
  Focused **3 files / 29 tests**, integrated **160/1917**, production build,
  OFF v5 info (`9c89c741…`), and diff check pass. Code commits `2fa3ce0` +
  `a71c0a9`; pixel diff N/A.

---
## 412 — Gate-3 Magic Coat intercept composed

- **State:** the run is clean and green at **158 files / 1906 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes. The pure
  attack-canceler chain now reaches Magic Coat immediately after continuing
  Factory obedience; opcode 0 remains unregistered and no Snatch, later
  intercept, machine, controller, decision, core, round, or presentation
  behavior was added.
- **Did:** added typed immutable per-battler `ProtectStruct::bounceMove`
  ownership and a post-obedience join driven by all **355** generated
  `gBattleMoves[].flags` rows. The taken branch delegates the exact
  `PressurePPLose(attacker,target,MOVE_MAGIC_COAT)` request, clears only the
  target bit, pushes the unchanged canceler PC onto an explicit resumable
  `BattleScriptsStack`, and hands off to `BattleScript_MagicCoatBounce`;
  not-taken continues before Snatch without mutation.
- **Next:** pause further isolated rule breadth. Prove one headless executable
  vertical slice from a currently requested legal move through the published
  `BattleDecisionBoundary` and a real source-complete Battle Script machine
  path, returning frozen next state/events/RNG and the next request, barrier,
  or outcome with canonical replay. Keep opcode 0 unregistered unless its full
  command is completed; otherwise use the smallest already-complete opcode
  sequence. Then add the minimal injected Factory-AI policy on the same kernel
  boundary.
- **Notes:** both singles sides, all **3** legal Level-50 Magic Coat sets,
  all generated affected/unaffected move membership, armed/unarmed target,
  exact clear, prior bits/markers, canceler effects **1/2**, Soundproof, no
  PP, invalid roles/protect/PC/stack/composition, deterministic replay,
  immutability, recursive freezing, full upstream receipt preservation, and
  zero RNG are pinned. Focused **3 files / 14 tests**; integrated **158/1906**,
  production build, OFF v5 info (`9c89c741…`), validated **684-frame** probe
  (arm **41**, PP **66/240**, clear **214**, bounce/resume **390–393**), and
  diff check green. Opcode 0's explicit remaining source work is executable
  Snatch, singles-unreachable-but-required Lightning Rod, Protect/fallthrough,
  delegated Pressure PP/resume/controller/history effects, and the complete
  machine adapter over the already-ported prefix. Code commit `57969b5`; pixel
  diff N/A.

---
## 411 — Factory-scoped obedience composed

- **State:** the run is clean and green at **156 files / 1898 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes. The pure
  attack-canceler chain now reaches the Factory-only obedience continuation;
  opcode 0 remains unregistered and no machine, controller, decision-boundary,
  core, round, presentation, OTHER, or IGNORED behavior was added.
- **Did:** added an explicit typed `BATTLE_FACTORY`/`BATTLE_TYPE_FACTORY`/
  `BATTLE_TYPE_FRONTIER` scope and an immutable join after selected-slot PP.
  Legal player-side Factory attackers return obedient at the Frontier check
  before ownership/badges/level/RNG; opponent-side attackers return even
  earlier. Successful admission preserves the source PC and prior receipts,
  consumes zero RNG, and sets exactly `HITMARKER_OBEYS`.
- **Next:** keep opcode 0 unregistered. The next exact source boundary is
  Magic Coat after obedience; Snatch, Lightning Rod, Protect, machine and
  controller integration remain separately unowned.
- **Notes:** both singles sides, preexisting OBEYS, multi-turn helper bypass,
  canceler effects **1/2**, Soundproof, and no-PP stops are pinned. Invalid/
  non-Factory scope, invalid input/composition/PC, deterministic replay, input
  immutability, recursive freezing, full receipt preservation, and zero RNG
  are covered. Focused **3 files / 20 tests**; integrated **156/1898**,
  production build, OFF v5 info (`9c89c741…`), and diff check green. Code
  commit `61641fa`; pixel diff N/A.
