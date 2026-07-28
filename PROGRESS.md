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
## 560 — [SUPERVISOR VERIFY 2026-07-28 ~00:40] Rollout accepted; Defense Curl evidence merged

- **State:** reviewed union green at **317 files / 3969 tests** and focused
  **52/52**; production build, both-oracle freshness, census regeneration,
  and `git diff --check` pass. Census is exactly **138/214 effects, 263/355
  moves, 215/276 Factory-L50 distinct, 2685/2957 weighted**, with all
  **42/42** checks.
- **Did:** accepted `adfada6` / `8407f7b` / `027c39f`: exact Rollout timer,
  lock, selected slot, Defense Curl power ladder, initial-only PP, symmetric
  automatic action selection, continuous RNG/events, miss unlock, and
  terminal routing all execute through the generic controller. Merged
  Defense Curl evidence `8ec52e5` after source review and two identical OFF
  replays.
- **Next:** register source-complete one-byte `0xbf`
  `B_SCR_OP_SETDEFENSECURLBIT`, including attacker-only unconditional bit
  ownership, script ordering before the +1 Defense attempt, maxed-stat bit
  persistence, and a generic Defense Curl→Rollout continuation. Expected
  census is **139/214, 264/355, 216/276, 2691/2957**.
- **Notes:** generic Rollout and OFF evidence both reach HP
  **362→327→170→12→0** with PP **20→19**; manifest
  `4460104b…9479677`. Defense Curl evidence observes PP **40→39**, bit 30,
  and Defense **6→7**. No barrier/import ratchet increase, recording import,
  animation edit, DEFERRED item, or oracle lifecycle action.

---
## 559 — [BOUNDED MAIN WORKER 2026-07-28 ~00:38] Rollout executes source-completely

- **State:** committed `adfada6` / `8407f7b` / `027c39f`; tree green at
  **316 files / 3966 tests**. Production build, focused **40/40**, OFF-oracle
  freshness/replay, census regeneration, and `git diff --check` pass. Census
  is exactly **138/214 effects, 263/355 moves, 215/276 Factory-L50 distinct,
  2685/2957 weighted**, all **42/42** checks.
- **Did:** registered operandless `0xb3`
  `B_SCR_OP_ROLLOUTDAMAGECALCULATION` with attacker-owned timer/start,
  `STATUS2_MULTIPLETURNS`, selected-slot + `gLockedMoves` persistence,
  initial-only PP, exact five-hit/Defense Curl power ladder, final unlock,
  and miss/no-effect cancellation. Full-turn selection now auto-confirms
  player, trainer, and simultaneous locks while retaining one RNG/event
  stream and ordinary faint/terminal routing.
- **Next:** supervisor verify this executable-frontier increment and select
  the next finite source registration target; do not resume the retired
  canonical Battle-2 march.
- **Notes:** controlled seed 32731 reproduces merged OFF evidence HP
  **362→327→170→12→0**, Rollout PP **20→19**, and player-win; fresh oracle
  manifest is byte-identical at `4460104b…9479677`. Defense Curl's separate
  setter remains the explicitly bounded next opcode, so the proof starts
  from its source/evidence-pinned post-state. No barrier/import ratchet
  change, recording import, scenario/tick/render branch, animation edit,
  issue removal, oracle lifecycle action, or PAPERCUT.

---
## 558 — [SUPERVISOR VERIFY 2026-07-28 ~00:07] Wish accepted; Secret Power evidence merged

- **State:** reviewed union green at **314 files / 3954 tests** and focused
  **105/105**; production build, both-oracle freshness, census regeneration,
  and `git diff --check` pass. Census is exactly **137/214 effects, 261/355
  moves, 213/276 Factory-L50 distinct, 2678/2957 weighted**, with all
  **42/42** checks.
- **Did:** accepted `a325a3f`/`4b88f14`: exact dual-mode Wish setup/heal,
  positional counter + party-index state, ordered end-turn decrement, and
  generic delayed heal reproduce the OFF two-turn outcome without a scenario
  branch. Merged Secret Power evidence `d2d9653` after source review and two
  byte-identical OFF replays.
- **Next:** implement source-complete `B_SCR_OP_SETROLLOUTTIMER` and locked
  multi-turn Rollout through the generic controller, including Defense Curl
  power, one-time PP, escalating damage, miss cancellation, and terminal
  outcome. Expected census is **138/214, 263/355, 215/276, 2685/2957**.
- **Notes:** Wish matches HP **140→123→106→140**, PP **10→9→8**. Secret
  Power replay hash is `dce99201…38474f`, with PP **20→19**, HP **362→311**,
  and paralysis **0→64** in the Factory building environment. No barrier/
  ratchet increase, recording import, animation edit, DEFERRED item, or
  oracle lifecycle action.
