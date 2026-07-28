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

---
## 557 — [BOUNDED MAIN WORKER 2026-07-28 ~00:04] Wish executes delayed positional heal generically

- **State:** committed `a325a3f`/`4b88f14`; tree green at **313 files / 3951
  tests** and focused **105/105**. Production build, both-oracle freshness,
  census regeneration, and `git diff --check` pass. Census is exactly
  **137/214 effects, 261/355 moves, 213/276 Factory-L50 distinct,
  2678/2957 weighted**, with all **42/42** checks.
- **Did:** registered exact six-byte `0xd4` `B_SCR_OP_TRYWISH` setup/heal
  modes with positional counter + original party-index ownership, pending and
  full-HP branches, prepared wishing-mon identity, and minimum-one negative
  half-max heal. `ENDTURN_WISH` now runs after screens/before weather in
  battler order, decrements through fainted slots without dispatch, and runs
  the genuine delayed-heal/full-HP scripts.
- **Next:** supervisor verify this executable-frontier increment and select
  the next finite source registration target; do not resume the retired
  canonical Battle-2 march.
- **Notes:** the generic two-turn Espeon/Tackle proof matches OFF HP
  **140→123→106→140** and Wish PP **10→9→8**, including pending failure and
  capped heal. No barrier/ratchet increase, recording import, scenario/tick/
  render branch, animation-lane edit, DEFERRED item, oracle lifecycle action,
  or PAPERCUT.

---
## 556 — [SUPERVISOR VERIFY 2026-07-27 ~23:49] Sleep Talk accepted; Wish and Rollout evidence merged

- **State:** reviewed union green at **312 files / 3945 tests**; production
  build, both-oracle freshness, census regeneration, and `git diff --check`
  pass. Census is **136/214 effects, 260/355 moves, 212/276 Factory-L50
  distinct, 2670/2957 weighted**, with all **42/42** checks.
- **Did:** accepted `c7b9822`/`6e33331`: the paired Sleep Talk opcodes own
  exact limitations, retry RNG, targeting, and no-stack called-effect
  dispatch, including a generic full-turn Whiscash→Fissure terminal win.
  Merged Wish evidence `e18ab8e` and Rollout evidence `f5dfb5d` after focused
  verification and twice reproducing each OFF manifest.
- **Next:** implement source-complete six-byte `B_SCR_OP_TRYWISH`, including
  positional counter/party-index state, pending-Wish failure, `ENDTURN_WISH`
  decrement/dispatch, delayed half-max heal, and full-HP route. Expected
  census is **137/214, 261/355, 213/276, 2678/2957**.
- **Notes:** Wish reproduces `b8f3eaea…40bf` (damage **140→123**, PP
  **10→9→8**, capped heal **106→140**); Rollout reproduces
  `4460104b…9677` (Defense Curl, PP **20→19**, locked HP
  **362→327→170→12→0**). No barrier/ratchet increase, recording import,
  animation edit, DEFERRED item, or oracle lifecycle action.
