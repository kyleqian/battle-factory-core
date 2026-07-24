# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 417 — SETBYTE reaches the honest Cmd_moveend barrier

- **State:** the bounded S10 opcode-46 increment is green at **162 files /
  1942 tests**. `Cmd_setbyte` is source-complete for the committed generated
  program; opcodes **0** and **73** remain unregistered.
- **Did:** added one immutable byte-lvalue resolver over the existing rules
  context. Registry creation mechanically validates all **214** concrete
  opcode-46 starts, their fixed **[4,1]** operands, all **96** value spellings,
  and the complete **24-expression** pointer universe before enabling the
  shared six-byte write/advance handler. The player and trainer-AI asleep
  verticals now execute SETBYTE, set `moveendState=0`, and stop at honest
  `B_SCR_OP_MOVEEND` / `Cmd_moveend` opcode **73**.
- **Next:** return to the supervisor. The next move-end unit must implement
  complete `Cmd_moveend` source semantics across every case and delegated
  hook before registering opcode 73; do not add a case-specific shortcut.
- **Notes:** every concrete start executes in Tier 1; all 24 lvalue classes,
  signed `gBattleMoveDamage` byte preservation, triple-kick halfword
  preservation, unknown rejection, immutability, replay, ordered events/PP,
  zero SETBYTE RNG/controllers/events, player zero-call RNG, and trainer AI
  `0x79e39ac4 / 5 calls` are pinned. Focused **5 files / 53 tests**;
  integrated **162/1942**, production build, OFF v5 info (`9c89c741…`), and
  diff checks pass; pixel diff N/A.

---
## 416 — Factory AI reaches the production script machine

- **State:** the assigned bounded S10 composition is committed and green at
  **161 files / 1936 tests**. The staged production adapter now accepts either
  singles command side; no opcode, mechanic, AI-mask, switching, render, core,
  or oracle breadth was added, and opcode 0 remains unregistered.
- **Did:** generalized the existing asleep state/reducer around one explicit
  command owner and source-derived singles targets, preserving TYROGUE's
  player path. A trainer-asleep real set-291 `FRONTIER_MON_PLUSLE_2` state
  enumerates Thunderbolt/Thunder Wave/Seismic Toss at player battler **0** and
  Wish at trainer battler **1**. Seed **1** makes the ordinary mask-0 policy
  choose Wish, synchronize all five draws into the kernel cursor, then the
  same reducer executes asleep opcodes **16→18→100→40** and returns the honest
  move-end SETBYTE barrier.
- **Next:** return to the supervisor. Keep opcode 0 unregistered and retain the
  recorded S10 ordering; masks, switching, move end, and other mechanics remain
  separate bounded units.
- **Notes:** PLUSLE sleep **4→3**, PP **[15,20,20,10]** unchanged, ordered
  message/status events, battler-1 controller ownership, persisted RNG
  `0x79e39ac4 / 5 calls`, canonical replay, recursive freezing, no split RNG,
  player regression, and import boundaries are pinned. Focused **3 files / 39
  tests**; integrated **161/1936**, production build, OFF v5 info
  (`9c89c741…`), and diff checks pass. Code commit `8e186dc`; pixel diff N/A.

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
