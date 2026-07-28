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

---
## 587 — [BOUNDED MAIN WORKER 2026-07-28 ~04:25] IncrementGameStat executes through the save/meta seam

- **State:** committed `795366f`; tree green at **344 files / 4115 tests**,
  focused opcode/continuation coverage **305/305**, ratchets **6/6**, and
  production build. Both oracle infos, handler/program freshness, census
  regeneration, and `git diff --check` pass. Census is exactly **151/214
  effects, 279/355 moves, 228/276 Factory-L50 distinct, 2742/2957 weighted**,
  all **42/42**.
- **Did:** globally registered two-byte raw-u8 `0x60`. A resolved player-side
  attacker emits a frozen typed game-stat increment event; an opponent emits
  none, and both advance unconditionally with no opcode-local RNG, controller,
  message, or battle-state work. The separate decoded save/meta consumer owns
  valid indices **<52**, no-op invalid indices, and **0xFFFFFF** saturation.
  Shared Splash proves PP → event → message order. Source-shaped
  `MOVE_EFFECT_RECOIL_25` support carries Torment/Disable forced Struggle past
  the former barrier through the existing hit and quarter-recoil route.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next shared registration target; do not widen the generic
  seven-battle controller or extend the retired canonical Battle-2 march.
- **Notes:** handler inventory **158→159**. The event receipt remains decoded
  semantic save metadata; no encrypted save counter or Mauville story state
  entered rules, Factory, controller, or presentation state. No
  unsupported/import ratchet change, recording import, private handler,
  animation/presentation/tick branch, issue removal, DEFERRED item, or oracle
  lifecycle action.

---
## 586 — [SUPERVISOR VERIFY 2026-07-28 ~04:10] Refresh accepted; bounded Encore evidence folded

- **State:** reviewed union green at **343 files / 4106 tests** and focused
  **40/40**; production build, census regeneration, ratchets **6/6**, and
  `git diff --check` pass. Census is exactly **149/214 effects, 275/355
  moves, 226/276 Factory-L50 distinct, 2738/2957 weighted**, all **42/42**.
- **Did:** accepted global Refresh `0xcd` after source/diff review: exact
  status predicate, active/party zeroing, semantic status-data event, and
  shared pending-controller acknowledgement are pinned. Folded Encore
  source/OFF evidence after narrowing its public Tackle-window vocabulary;
  independently replayed manifest `329676e3…8bba2`.
- **Next:** register `B_SCR_OP_INCREMENTGAMESTAT` globally through a typed
  save/meta event seam, not Factory round state. Prove player-side
  gating, raw-u8 operand/range/saturation ownership, zero RNG/controller
  work, Splash ordering, and Struggle continuation through the shared hit
  route. Expected census:
  **151/214, 279/355, 228/276, 2742/2957**.
- **Notes:** handler inventory is **158**; Encore remains evidence only and
  its timer/forced-choice/cleanup claims are source-pinned. Refresh receipt
  remains `12571c44…a68012`. No unsupported/import ratchet, recording import,
  animation/presentation/tick branch, issue removal, DEFERRED item, or oracle
  lifecycle action.
