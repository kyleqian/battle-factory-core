# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
- **Next:** keep opcode 0 unregistered. The next exact source boundary is the
  Snatch intercept after a continuing Magic Coat result; Lightning Rod,
  Protect, Pressure PP mutation, resume-script role swapping, and every
  integration layer remain separately unowned.
- **Notes:** both singles sides, all **3** legal Level-50 Magic Coat sets,
  all generated affected/unaffected move membership, armed/unarmed target,
  exact clear, prior bits/markers, canceler effects **1/2**, Soundproof, no
  PP, invalid roles/protect/PC/stack/composition, deterministic replay,
  immutability, recursive freezing, full upstream receipt preservation, and
  zero RNG are pinned. Focused **3 files / 14 tests**; integrated **158/1906**,
  production build, OFF v5 info (`9c89c741…`), validated **684-frame** probe
  (arm **41**, PP **66/240**, clear **214**, bounce/resume **390–393**), and
  diff check green. Code commit `57969b5`; pixel diff N/A.

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

---
## 410 — Gate-3 selected-slot PP admission composed

- **State:** the run is clean and green at **154 files / 1887 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes. The pure
  attack-canceler composition now reaches the selected-slot PP admission and
  its success-only `HITMARKER_ALLOW_NO_PP` clear; opcode 0 remains unregistered
  and no machine, controller, decision-boundary, core, round, or presentation
  integration was added.
- **Did:** added an immutable source-order join from a supplied
  canceler+moves-block result into the existing typed PP preflight. Canceler
  effects 1/2 and Soundproof blocks bypass PP; a continuing result delegates
  the exact five-part no-PP predicate, `BattleScript_NoPPForMove`/missed
  handoff, or continuation clear without duplicating PP mechanics. The joined
  receipt exposes prior receipts, branch ownership, source PC, and zero added
  RNG while preserving cumulative rules/RNG/call state.
- **Next:** keep opcode 0 unregistered. The next exact source boundary is
  obedience after successful PP admission; do not add Magic Coat, Snatch,
  Lightning Rod, Protect, a machine adapter, or controller integration until
  separately assigned.
- **Notes:** both singles orientations; no-PP, Struggle, allow-no-PP,
  no-attack-string, multi-turn, sufficient-PP, canceler effects **1/2**, and
  Soundproof are pinned with exact marker/result/PC receipts. Invalid
  composition/PC inputs, deterministic replay, input immutability, recursive
  freezing, and zero additional RNG are covered. Focused **3 files / 30
  tests**; integrated **154/1887**, production build, OFF v5 info
  (`9c89c741…`), and diff check green. Code commit `5474ea2`; pixel diff N/A.
