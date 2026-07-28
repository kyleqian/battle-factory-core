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


---
## 590 — [SUPERVISOR VERIFY 2026-07-28 ~04:45] Taunt accepted; Foresight evidence folded

- **State:** reviewed union green at **348 files / 4130 tests** and focused
  **85/85**; production build, both-oracle info, census regeneration,
  freshness/ratchets **15/15**, and `git diff --check` pass. Census is exactly
  **152/214 effects, 280/355 moves, 229/276 Factory-L50 distinct, 2744/2957
  weighted**, all **42/42**.
- **Did:** accepted global Taunt `0xd0`, functional-timer representation,
  end-turn expiry, and generic Factory admission/canceler proof after
  source/diff review. Folded Foresight source/OFF evidence and independently
  replayed exact manifest `2c4a774e…05c181864`: Low Kick is immune before
  Foresight, then reduces Haunter **152→141** after the exposed target bit is
  set; repeat Foresight is source-confirmed idempotent success, not failure.
- **Next:** register operand-free `B_SCR_OP_SETFORESIGHT` globally. Prove
  unconditional target-owned `STATUS2_FORESIGHT`, repeat success, zero local
  RNG/controller/message work, and the already-shared accuracy/type consumers
  through a full-turn pre/post Ghost-immunity scenario. Expected census:
  **153/214, 282/355, 230/276, 2747/2957**.
- **Notes:** handler inventory is **160**; Foresight switch/faint/Baton-Pass
  clearing remains source-bounded while the setter and public immunity window
  are exact. No unsupported/import ratchet, recording import, private handler,
  controller widening, animation/presentation/tick branch, issue removal,
  DEFERRED item, or oracle lifecycle action. Animation branch advanced after
  orient and remains intentionally unmerged until a future orient.

---
## 589 — [BOUNDED MAIN WORKER 2026-07-28 ~04:42] Taunt executes and expires through shared mechanics

- **State:** committed `22c5095` + `11c0d5a` + `18d50ec`; tree green at
  **347 files / 4127 tests**, focused cross-layer Taunt coverage **96/96**,
  ratchets **6/6**, and production build. Both oracle infos, census
  regeneration/freshness, all **42/42** checks, and `git diff --check` pass.
  Census is exactly **152/214 effects, 280/355 moves, 229/276 Factory-L50
  distinct, 2744/2957 weighted**.
- **Did:** globally registered five-byte pointer opcode `0xd0`; success writes
  target-owned functional `tauntTimer=2` and falls through, while any nonzero
  timer jumps to duplicate failure unchanged. Both paths own zero local RNG,
  controller, or message work. Replaced `ENDTURN_TAUNT`'s case barrier with
  one source-ordered nonzero decrement per present battler (**2→1→0**) and no
  event/controller/RNG work. A shared full-turn Factory scenario proves
  Taunt PP→success-message order, the target's already-collected Splash
  rejected by the existing attack canceler without PP spend, next-boundary
  Splash rejection by the existing limitation/admission mask at timer 1,
  and restored admissibility after expiry.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next shared registration target; do not widen the generic
  singles controller or extend the retired canonical Battle-2 march.
- **Notes:** handler inventory **159→160**. Full pinned-tree usage inspection
  found `tauntTimer2` written only by `Cmd_settaunt` and never read or
  decremented; it is intentionally not represented, avoiding a fictitious
  second functional lifetime. No unsupported/import ratchet change,
  recording import, private handler, animation/presentation/tick branch,
  issue removal, DEFERRED item, or oracle lifecycle action.

---
## 588 — [SUPERVISOR VERIFY 2026-07-28 ~04:29] IncrementGameStat accepted; Perish Song evidence folded

- **State:** reviewed union green at **345 files / 4118 tests** and focused
  **47/47**; production build, both-oracle info, census regeneration, ratchets
  **6/6**, and `git diff --check` pass. Census is exactly **151/214 effects,
  279/355 moves, 228/276 Factory-L50 distinct, 2742/2957 weighted**, all
  **42/42**.
- **Did:** accepted global IncrementGameStat `0x60` plus the source-required
  shared 25%-recoil effect after source/diff review: save/meta ownership stays
  outside battle and Factory state, Splash ordering is typed, and forced
  Struggle now completes the common hit/recoil path. Folded independently
  replayed Perish Song source/OFF evidence (`e0f1d6d6…93c6a61`): the public
  receipt pins the observed shared countdown only; immunity, switching,
  terminal faint, and Baton Pass remain source-bounded.
- **Next:** register `B_SCR_OP_SETTAUNT` globally from accepted evidence and
  remove the generic end-turn Taunt case barrier. Preserve exact duplicate
  failure, target timer **2**, shared status-move admission/attack-canceler
  paths, and per-battler end-turn decrement without widening the singles
  controller. Expected census:
  **152/214, 280/355, 229/276, 2744/2957**.
- **Notes:** handler inventory is **159**; the source-only `tauntTimer2` mirror
  is not consulted by Emerald end-turn/action logic and must not create a
  second controller timer. No unsupported/import ratchet, recording import,
  animation/presentation/tick branch, issue removal, DEFERRED item, or oracle
  lifecycle action. Animation branch has advanced since orient and was not
  folded mid-session.
