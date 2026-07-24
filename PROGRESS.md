# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 426 — [USER-DIRECTED RE-SCOPE, between sessions] executable-frontier reset

**Read this before ROADMAP.md — it changes the next action.** No code changed;
suite **172 files / 1994 tests** and the production build are green at
`856b3b4`.

- **State:** a between-session survey found the kernel's *executable* frontier
  is not moving in proportion to output. **28 of 249** opcodes registered,
  almost all print/wait/goto; the entire executable surface is "a mon that
  cannot act does not act"; **no move resolves damage**; `roundController.ts`
  still consumes injected fixtures. ~5,000 lines of Tier-1-pinned
  `Cmd_attackcanceler` phase logic sit unwired
  (`battleScriptActionAdmission.ts:1208-3686`). The bottleneck is the
  registration gate, not throughput.
- **Did (docs only, three commits):** (1) synced ROADMAP Gate 2 / AGENTS.md /
  `tools/battle-lab/README.md` with the harness's shipped pre-battle party
  builder (`b30c5d8`/`d3a0cbb`, 14:10--14:18) — switch-in hooks, bench
  construction, and controlled opponent actions are **closed**, and Gate 2's
  remainder is exactly Noland's schema plus an earlier scouting-commentary
  checkpoint. (2) Added ROADMAP S10 **"Executable-frontier reset"**: a
  registration policy that replaces opcode-level all-or-nothing with explicit
  `unsupported-branch` barriers, the ordered next steps, a presentation-seam
  checkpoint, and an overfit-containment rule. (3) Filed ISSUES **#39--#41**
  (turn-keyed `battleScene.ts`; `featherDance.ts` recorded-table replay;
  production imports of canonical RAM dumps), added the animation lane's
  interpreter spike, and added SUPERVISOR.md's executable-frontier gate.
- **Next:** **not** move-end dependency step 5. Register **opcode 0** by wiring
  the fifteen existing phase reducers plus the canceler loop and Magic Coat,
  with Snatch/Lightning Rod as evidence-cited barriers. Then the seventeen
  hit-chain opcodes, then opcode 73, then a real terminal outcome consumed by
  `roundController.ts`. See ROADMAP S10's reset for the exact opcode list.
- **Notes:** leverage for the hit chain — **69 of 197** `BattleScript_Effect*`
  scripts reach it, covering **155 of 355 moves (44%)**. Prior entries 423--425
  describe the superseded move-end-first ordering; their landed work is intact
  and still used. No DEFERRED entries are open.

---
## 425 — vertical move-end dependencies and exact Thunder Punch integrated

- **State:** the vertical player/AI machine slice and move-end dependency steps
  1--4 are green at **172 files / 1994 tests**. Opcodes **73** and **0** remain
  unregistered; no delegate semantics, 17-state/end-mode loop, cleanup, or
  Factory continuation was added. Scene-ON coverage is **18 exact / 1 partial
  / 257 unsupported**.
- **Did:** landed same-PC controller return/call-current ownership and
  source-complete move-end states 1/8--10. Added a mechanical receipt for
  exactly four ability and two item delegate modes: **7** `Random()` sites,
  **2** controller emissions/marks, **42** script-transfer candidates, and
  **4** loops. Independently, THUNDER PUNCH is exact in both legal orientations
  at **104/104 component and 104/104 RGB frames** each, with source-relative
  palette, inversion, sprite, shake, monbg, and teardown behavior.
- **Next:** implement dependency step 5 from the committed delegate receipt:
  source-complete ability/item ports sharing the machine RNG ledger and
  exposing controller/script results. Keep the all-case loop,
  cleanup/next-target transfer, opcode registration, and Factory continuation
  behind their later gates.
- **Notes:** full suite/build, both oracle profiles, coverage, focused
  controller tests, receipt regeneration, and both Thunder Punch dense
  comparators pass. Fire/Ice Punch, Blaze Kick, Flamethrower, and Dragon Breath
  controls remain exact.

---
## 423 — move-end topology corrected and pure state prerequisites landed

- **State:** dependency step 3 is corrected and green at **170 files / 1986
  tests**. Opcodes **73** and **0** remain unregistered; no controller,
  script-transfer, cleanup, delegate, loop/end-mode, core, render, or oracle
  behavior was added.
- **Did:** narrowed active `gBattlersCount` to the exact `2 | 4` type and
  runtime set, requiring `BATTLE_TYPE_DOUBLE` iff count is 4; illegal counts
  and flag/count mismatches are rejected. The changed-item bound test now uses
  legal singles while preserving inactive-slot identity/data assertions.
  Position/partner lookup, nine-bit `WasUnableToUseMove`, and states 13/16
  were rechecked source-faithfully without expansion.
- **Next:** dependency step 4 only: add status-data and both visibility
  controller requests/resumption. Keep move cleanup, effect-script transfer,
  delegates, loop/end modes, and opcode registration behind their later gates.
- **Notes:** assignment audit: `battle_controllers.c:149-581` assigns active
  counts only `2` or `MAX_BATTLERS_COUNT` (4); `battle_main.c:157`'s zero is
  pre-init only. State 16 still stops before cleanup/script transfer.
  Suite/build and OFF v5 (`9c89c741…`) pass; pixel diff N/A.

