# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 428 — [SUPERVISOR] round-1 merges: hit-chain ground truth + anim interpreter

- **State:** merged tree green at **174 files / 2020 tests**, build green.
  Round 1 of the 2026-07-24 supervised session landed all three lanes:
  opcode 0 registered (entry 427), hit-chain ground truth banked, and the
  user-directed anim-script interpreter spike **succeeded** on FEATHER_DANCE.
- **Did (merges + docs):** folded `worker/side-20260724-150930` —
  `tools/probe/verify-hit-chain-ground-truth.ts` + `docs/hit-chain-ground-truth.md`
  (supervisor-rerun: exit 0, all PASS; hit = exactly 4 attributed `Random()`
  rolls, miss = 1; ROM damage matches `damageCalc.ts` exactly) — and
  `worker/animation-20260724-150928` — FEATHER_DANCE now runs a minimal
  script interpreter + 1:1 `AnimFallingFeather` port instead of replaying
  recorded probes (973/973 RAM fields per turn; comparators 235/235, 145/145,
  162/162 at recorded counts, feather self-destroy ticks 7557/8591/9637
  reproduced with zero per-turn constants). Deleted ISSUES #40 (retired).
  ROADMAP step (ii) corrected: no `orbyte` on the EffectHit miss path
  (supervisor source-verified, `battle_scripts_1.s:244`); eighteen total
  registrations.
- **Next:** round 2 — main: register the sixteen hit-chain opcodes as ordered
  rungs against the banked verify script; side: KO/faint + crit edge ground
  truth via `overrides.parties` (OFF oracle restarted to pick up harness
  `b30c5d8`); animation: interpreter generalization on MOVE_MIST_BALL
  (white-feather track).
- **Notes:** both stale oracle services (started 08:26, predating today's
  14:10 `overrides.parties` harness commit) restarted by the supervisor while
  all lanes were idle.

---
## 427 — opcode 0 (Cmd_attackcanceler) registered in the production machine

- **State:** S10 step (i) is complete. Opcode 0 is registered in
  `createBattleScriptStatusRulesHandlers` (`battleScriptAttackCancelerOpcode.ts`),
  composing the entry preflight, the 14-phase `AtkCanceler_UnableToUseMove`
  loop, the ability-moves-block/selected-PP/Factory-obedience join chain, and
  Magic Coat's bounce check into one real dispatcher. Six branches halt
  explicitly via a new `unsupported-branch` `BattleScriptHaltReason` instead
  of falling through: `gBattleOutcome`'s `B_ACTION_FINISHED` round-controller
  handoff (out of scope), `CANCELER_IN_LOVE`'s immobilized-by-love
  `BattleScriptPush(explicit label)` (the machine's call stack only models
  resume-at-this-PC, not an arbitrary return address), Magic Coat's
  unimplemented `PressurePPLose`, the Snatch loop, Lightning Rod redirection,
  and the final `DEFENDER_IS_PROTECTED` check (needs unmodeled battler-type/
  two-turn-move data). Suite is **173 files / 2016 tests**, build green.
- **Did:** wired the fifteen existing phase reducers (flags through thaw, plus
  PP) and `battleScriptAttackCanceler.ts`'s loop/`battleScriptMagicCoat.ts`
  into opcode 0 (`d74df11`). Added Tier-1 coverage driving the *registered
  opcode*, not the standalone reducers, through all 15 phase transfers and
  all 6 barriers (`f4e726e`) — Snatch/Lightning Rod barriers are
  Tier-1-constructed per the S10 testability decision, since real Factory
  data never sets `stealMove`/`lightningRodRedirected` (evidence already
  pinned in `attackCancelerMagicCoatSnatchAudit.test.ts` /
  `attackCancelerLightningRodProtectAudit.test.ts`). Rewired the staged
  asleep-move adapter to start its machine at the move's own entry (real
  opcode 0) instead of hand-calling the canceler loop; pins gained the
  post-loop `REQUEST_STATUS_BATTLE` controller-sync event
  (`set-battler-status-data`, battle_util.c:2270-2274) the manual adapter
  never modeled (`4809f06`). Updated the stale "28 registered opcodes" pin
  to 29.
- **Next:** S10 step (ii) — register the sixteen-opcode standard hit chain
  (`accuracycheck` through `tryfaintmon`) plus `orbyte` on the miss branch.
  A concurrent side-lane commit (`0b3fe0c`, landed mid-session, not mine)
  already corrected ROADMAP's count to **eighteen** registrations for a
  complete damaging move and cites `tools/probe/verify-hit-chain-ground-truth.ts`
  — read that before starting.
- **Notes:** enumerated remainder from this step: Snatch/Lightning Rod/Protect/
  `PressurePPLose`/the round-controller handoff are (b) barriers, not (a)
  ports — completing any of them is new-mechanics work (battler type data,
  two-turn-move gating, real PP-loss execution with a controller emission,
  `B_ACTION_FINISHED` consumption) explicitly out of this step's scope. No
  presentation/render files touched.

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
