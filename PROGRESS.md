# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 414 — Factory AI mask-0 boundary composed

- **State:** the assigned S10 vertical composition is committed and green at
  **161 files / 1932 tests**. The production policy supports only ordinary
  Level-50 Factory singles mask **0**; masks 1/7, switching, forced switching,
  and non-Level-50 views are explicit rejections.
- **Did:** added a frozen minimal source view and pure injected move policy over
  the kernel's legal decisions plus explicit `BattleRngState`. It consumes four
  setup draws in slot order, including illegal slots, scores legal moves
  **100** and illegal moves **0**, executes no scripts, consumes the mandatory
  tie draw even at modulus 1, and returns one `BattleDecisionSubmission`, RNG,
  and a recursively frozen trace. A generic wrapper submits that choice through
  the published `submitBattleDecision` boundary and synchronizes all policy
  draws into the kernel-owned cursor before rules execution.
- **Next:** keep opcode 0 unregistered. The next AI breadth unit is mask 1's
  source `AI_CheckBadMove` scorer with its required pure mechanics helpers;
  do not claim mask 7 or switch policy until their separate source paths and
  path-dependent RNG are complete.
- **Notes:** canonical replay, legal-list authority, exact five-draw receipts
  (`0x12345678` → `0x2684ad1f`), raw/simulated values, scores/best slots/tie,
  mask-selection receipt, immutability, malformed/unsupported inputs, and
  import boundaries are pinned. Focused **3 files / 60 tests**; integrated
  **161/1932**, production build, OFF v5 info (`9c89c741…`), and diff checks
  pass. Code commit `d29a950`; pixel diff N/A.

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
