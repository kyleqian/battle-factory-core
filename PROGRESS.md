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

---

## 681 — [SUPERVISOR SESSION OPEN 2026-07-29 ~08:25] animation-main folded (Sweet Kiss + Aromatherapy exact); union green; freshness FAIL judged false positive

- **State:** master fast-forwarded to `d166f9cf` (= animation-main union:
  the concurrent animation supervisor had already merged master in, so the
  fold was a clean ff bringing 9 animation commits — MOVE_SWEET_KISS and
  MOVE_AROMATHERAPY promoted exact). Union green at **493 files / 5061
  tests**, production build passes, tree clean.
- **Oracle freshness:** `check-oracle-freshness.sh` exits 1 for both ports
  (services started 2026-07-28 21:42, harness HEAD 807b449 22:08). Verified
  the sole intervening harness commit is docs-only (`NOTES.md`, +54 lines,
  no oracle/schema change), and the animation supervisor is live on port
  8012 — decision: **no restart**, false positive recorded here; both
  profiles answer `info` healthily.
- **Session plan (entry 680's ordered Next):** (i) sweep blockers — wake-up
  `Cmd_bicword` (seeds 18/20), end-turn instruction budget (seed 21),
  attack-canceler stop (seed 23); (ii) entry 677 AI reveal-site remainder;
  (iii) rung-13 mid-turn ShouldSwitch; (iv) King's Rock flinch; (v) rung 14
  presentation windows + Gate-6 matrix; (vi) ISSUES #48.
