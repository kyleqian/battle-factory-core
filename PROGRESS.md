# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 415 — Factory AI self-target fidelity repaired

- **State:** the bounded S10 mask-0 repair is committed and green at **161
  files / 1933 tests**. The policy still supports only ordinary Level-50
  Factory singles mask **0**; no masks, switching, opcodes, mechanics, or
  interfaces were broadened.
- **Did:** corrected the decision boundary to accept the kernel-resolved
  singles target, then made the AI choose strictly by move slot and return the
  exact listed legal decision. The real `FRONTIER_MON_PLUSLE_2` tuple now gives
  Wish slot 3 its source `MOVE_TARGET_USER` battler **1**; seed **1** selects
  it and `submitBattleDecision` preserves that target. Multiple legal
  decisions for one slot are rejected as ambiguous.
- **Next:** return to the supervisor. Keep opcode 0 unregistered; mask 1 and
  all previously recorded breadth remain separate future units.
- **Notes:** the original seed's five exact draws/RNG, canonical replay, and
  recursive freezing remain pinned; the new self-target seed also ends after
  five draws at `0x79e39ac4`. Focused **2 files / 29 tests**; integrated
  **161/1933**, production build, OFF v5 info (`9c89c741…`), and diff checks
  pass. Code commit `1f32342`; pixel diff N/A.

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
