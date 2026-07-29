# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 684 — [BOUNDED MAIN WORKER 2026-07-29 ~09:20] entry-677 AI reveal-site remainder classified and wired

- **State:** implementation commits `0488e6e4`, `1ddfc68e`, `beb383cf`;
  tree green at **496 files / 5082 tests**, production build,
  `git diff --check`, Battle Scene OFF oracle info, and both censuses exact at
  pre-step SHA-256 **8b18f754…5261 / 52687085…257c**.
  All **17** entry-678 carriers remain exact; seeds **18/20/23** remain seven
  wins at **2478/2140/1436** calls. Final full-suite rerun is pending.
- **Did:** source owners now publish BattleHistory ability/item observations
  only on their successful activation arm; misses, failed procs, no-op weather/
  form/status branches, secondary/non-certain prevention, and absent abilities
  remain unrevealed. The live driver consumes the existing handoff unchanged;
  no RNG, outcome, controller, opcode registration, or switching path changed.
  Final full-suite diagnosis caught and fixed one stale-`lastUsedAbility`
  typecalc false reveal; fresh per-opcode activation flags restore the
  whole-battle fixture's original 12 AI turns/cursor and failed-Static silence.

- **Classification:** 27 sites wired class-A with quiet-arm pins; 11
  class-B sites each name their exact barrier/opcode dependency. Full table:
  `docs/ai-reveal-sites.md`.

- **Supervisor folds (post-step):** rung-14 presentation-seam map merged
  (`3fc5ee40`, docs-only — swap is the cheapest genuine gap; seventh-win
  terminal already generic). ROM ground-truth receipt §7A banked and merged
  (`055fc60e`): absorber switch draw attributed to
  `FindMonThatAbsorbsOpponentsMove+0x249`, odd 52937 → switch index 1
  delta 1; even 50708 control → ordinary ledger +1; both byte-identical
  across fresh processes. Supervisor reran full suite (**496/5082**),
  build, and re-drove seeds 18/20/21/23 = **2478/2140/1911/1436** unchanged.
- **Next / notes:** supervisor resumes R13 live switching / King's Rock /
  presentation queue. No unsupported/import ratchet, generated census byte,
  hook universe, issue, presentation, animation, canonical recording, or tick
  branch moved. PAPERCUT: none.

---

## 683 — [BOUNDED MAIN WORKER 2026-07-29 ~09:00] seed 21 end-turn budget halt retired; sweep blocker-free

- **State:** implementation committed `39b4dceb`; tree green at **495 files /
  5066 tests**, production build, `git diff --check`, Battle Scene OFF oracle
  info, and byte-identical executable + ability/item census documents.
- **Did / acceptance:** both end-turn script runners retain the **256
  PC-advancing source-instruction** ceiling and now independently allow
  **4096 scheduler/controller yields**, with distinct yield/source exhaustion
  diagnostics and the blocked-without-ack throw preserved. Ordinary generated
  seed 21 reaches Battle 0 turn 7's player forced-switch boundary with
  **GRANBULL 0 HP / SEAKING 116 HP**, then legitimately wins seven at exact
  facility cursor **1911**.
- **Sweep:** seeds 4–30 pass battles 0/1/2 at **27/27/27**; **26/27** win
  seven. Seed 12 remains the sole legitimate battle-7 loss (**1846** calls);
  blocker census is empty. The permanent **17-carrier** entry-678 table stays
  capped and every cursor remains exact.
- **Supervisor fold (post-step):** side-lane R13-A merged (`6961530a`) —
  pure `factoryAiSwitchPolicy.ts` port of `ShouldSwitch` +
  suitable-mon resolution with 15 receipt tests, not yet wired to the live
  driver; union green **496 files / 5081 tests**, production build,
  worktree/branch cleaned.
- **Next / notes:** supervisor resumes entry 681's ordered queue at the AI
  reveal-site remainder, then lane-owned R13/King's Rock/presentation work.
  No opcode/operand census byte, unsupported-branch/import ratchet, issue,
  presentation, animation, AI switching, canonical recording, or tick branch
  moved. PAPERCUT: none.

---

## 682 — [BOUNDED MAIN WORKER 2026-07-29 ~08:36] wake-up path retired; seeds 18/20 seven-win exact

- **State:** committed `20ad5cce` + stretch `b2afcc38`; tree green at **495
  files / 5065 tests**, production build, `git diff --check`, Battle Scene OFF
  oracle info, and byte-identical executable + ability/item census documents.
  Seeds **18/20/23** now win all seven generated battles at exact
  **2478/2140/1436** facility calls; the permanent 17-carrier table remains
  unchanged and exact.
- **Did:** registered `Cmd_bicword`'s third and final source operand,
  `HITMARKER_WAKE_UP_CLEAR` (bit 4, source says never set/checked), plus
  `gWokeUpStringIds`. The attack-canceler controller status write now also
  syncs the active mon's persistent party status, matching
  `REQUEST_STATUS_BATTLE`.
- **Acceptance:** Tier-1 drives sleep counter **1→0** through
  `BattleScript_MoveUsedWokeUp`, proving battler+party wake, ordinary woke-up
  message, status-icon update, return to `Cmd_attackcanceler`, PP use, real
  Tackle damage, and the next command. The former bicword barrier test is now
  a pass-through clear; normal/Uproar table selectors are both pinned.
- **Stretch / sweep:** seed 23's faster opponent used Attract; the player then
  took CANCELER_IN_LOVE's immobilized arm. Its explicit
  `BattleScriptPush(BattleScript_MoveUsedIsInLoveCantAttack)` now uses the
  machine's existing `call-explicit`, runs the in-love prelude, returns to the
  cant-attack string, and completes MoveEnd without PP/damage. Seeds 4–30 now
  pass battles 0/1/2 at **26/26/26**; **25/27** win seven, seed 12
  legitimately loses battle 7. The sole blocker is seed 21's end-turn
  instruction budget, explicitly untouched/out of scope.
- **Notes:** no new carrier, canonical recording, presentation, animation,
  tick branch, or SCRIPT_BUDGET change. Unsupported-branch call-site pin stays
  **4** for `battleScriptDamagingWeatherOpcode.ts`; its comment now names that
  the live wake-up operand is retired while the generic future-pair guard
  remains. Ability/item census's exact live-source pin moved only
  `battleScriptHitChainOpcode.ts:1091→1096` after the two-entry wake-up table
  added five lines. Stretch deliberately shrank
  `battleScriptAttackCancelerOpcode.ts`'s unsupported-branch pin **3→2**.
  Both generated docs remain byte-identical. PAPERCUT: none.
