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
## 569 — [BOUNDED MAIN WORKER CORRECTION 2026-07-28 ~02:17] Fury Cutter mirrors raw C integer widths

- **State:** committed `0d638cb`; tree green at **328 files / 4031 tests**,
  focused **84/84**, and ratchets **6/6**. Production build, both-oracle
  freshness/info, census regeneration, and `git diff --check` pass. Census
  remains **142/214 effects, 268/355 moves, 219/276 Factory-L50 distinct,
  2706/2957 weighted**, all **42/42**.
- **Did:** replaced the general JS clamp/exponentiation with exact source
  widths: raw u8 counters increment modulo 256 unless exactly 5, and source
  power plus every doubling stores through u16. Tests pin raw **5→5**,
  **6→7**, **255→0**, and overflow **250×2⁹→62464**.
- **Next:** supervisor verify this bounded correction and select the next
  finite shared registration target; do not extend the retired canonical
  Battle-2 march.
- **Notes:** normal gameplay remains **1..5 / 10..160**; no-effect reset,
  registration, zero RNG/lock, and generic full turns remain green. Entry
  568's “cap” wording is narrowed below to that normal producer invariant.
  No barrier/import ratchet, census, evidence, animation, issue, or PAPERCUT
  change.

---
## 568 — [BOUNDED MAIN WORKER 2026-07-28 ~02:10] Fury Cutter executes source-completely

- **State:** committed `7b92344`; tree green at **327 files / 4025 tests**,
  focused **326/326**, and ratchets **6/6**. Production build, both-oracle
  freshness, census regeneration, and `git diff --check` pass. Census is
  exactly **142/214 effects, 268/355 moves, 219/276 Factory-L50 distinct,
  2706/2957 weighted**, all **42/42**.
- **Did:** globally registered operandless `0xb5`: the normal attacker-owned
  **0..5** producer sequence reaches and holds five with powers
  **10/20/40/80/160**, plus exact no-effect jump/reset, both
  `BattleScript_FuryCutterHit` passes, and zero lock/RNG ownership. Generic
  full turns prove six manual PP spends, Double Team persistence, and the
  normal fixed point; Protect now shares `CancelMultiTurnMoves`, while
  existing switch/faint clears are pinned.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next shared registration target; do not extend the retired
  canonical Battle-2 march.
- **Notes:** OFF evidence remains manifests `9ca031ee…2057c9`,
  `eb76399c…e3ce7`, and `7a7a04d8…dbf9d3`. Used-item/failed-run
  `ClearFuryCutterDestinyBondGrudge` owners are not executable here, so no
  unreachable subsystem was invented. No barrier/import ratchet change,
  recording import, animation/presentation/scenario branch, oracle lifecycle
  action, issue removal, or PAPERCUT.

---
## 567 — [SUPERVISOR VERIFY 2026-07-28 ~01:59] Corrected Disable accepted; three evidence checkpoints merged

- **State:** reviewed union green at **325 files / 4016 tests** and focused
  **366/366**; production build, both-oracle freshness, census regeneration,
  ratchets, and `git diff --check` pass. Census is exactly **141/214 effects,
  267/355 moves, 218/276 Factory-L50 distinct, 2701/2957 weighted**, all
  **42/42**.
- **Did:** accepted Disable only after corrective `31a2fd7` removed the private
  full-turn opcode overrides. Exact `0xa3`, target-owned timer/start,
  duplicate-id admission, direct canceler, switch/faint clear, and ordered
  end-turn expiry remain generic; forced Struggle stops honestly at shared
  `B_SCR_OP_INCREMENTGAMESTAT`. Merged and independently replayed Fury Cutter,
  Minimize/Stomp, and Follow Me OFF evidence.
- **Next:** register operandless `0xb5` `B_SCR_OP_FURYCUTTERCALC`: attacker
  normal **0..5** sequence fixed at 5 with powers **10/20/40/80/160**,
  normal-move persistence, no-effect/Protect/switch/faint clears, and no
  lock/RNG ownership. Expected census is **142/214, 268/355, 219/276,
  2706/2957**.
- **Notes:** Fury Cutter manifests `9ca031ee…2057c9` and
  `7a7a04d8…dbf9d3`, Minimize `67c617f7…c842977`, Follow Me
  `e150f267…889ece`. The latter two source-pin hidden status/timer semantics
  without claiming unavailable singles observations. No barrier/import
  ratchet change, recording import, animation edit, DEFERRED item, or oracle
  lifecycle action.
