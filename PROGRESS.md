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
  counter cap 5, powers **10/20/40/80/160**, normal-move persistence,
  no-effect/Protect/switch/faint clears, and no lock/RNG ownership. Expected
  census is **142/214, 268/355, 219/276, 2706/2957**.
- **Notes:** Fury Cutter manifests `9ca031ee…2057c9` and
  `7a7a04d8…dbf9d3`, Minimize `67c617f7…c842977`, Follow Me
  `e150f267…889ece`. The latter two source-pin hidden status/timer semantics
  without claiming unavailable singles observations. No barrier/import
  ratchet change, recording import, animation edit, DEFERRED item, or oracle
  lifecycle action.

---
## 566 — [BOUNDED MAIN WORKER CORRECTION 2026-07-28 ~01:56] Full-turn execution uses the shared opcode frontier

- **State:** committed `31a2fd7`; tree green at **322 files / 4007 tests**,
  focused **90/90**, and ratchets **6/6**. Production build, both-oracle
  freshness, census regeneration, and `git diff --check` pass. Census remains
  exactly **141/214 effects, 267/355 moves, 218/276 Factory-L50 distinct,
  2701/2957 weighted**, all **42/42**.
- **Did:** removed the full-turn controller's private `incrementgamestat` and
  Struggle-recoil `seteffectwithchance` handlers; both execution sites now use
  only `createBattleScriptStatusRulesHandlers`. Full-turn Disable still proves
  duplicate filtering, direct selected-move cancellation, forced Struggle, and
  zero Tackle PP spend, then stops honestly at `B_SCR_OP_INCREMENTGAMESTAT`.
- **Next:** supervisor verify this correction and select the next finite shared
  registration target. `incrementgamestat` and Struggle recoil remain separate
  executable-frontier units; do not extend the retired Battle-2 march.
- **Notes:** this supersedes entry 565's full-turn claims of Struggle history,
  recoil, end-turn expiry, and same-state Tackle resumption past that barrier.
  Isolated Disable opcode/end-turn/switch/faint coverage remains green. No
  unsupported-branch barrier count, recording import, animation file, issue,
  oracle lifecycle action, or PAPERCUT changed.

---
## 565 — [BOUNDED MAIN WORKER 2026-07-28 ~01:49] Disable executes source-completely

- **State:** committed `e566e53`; tree green at **322 files / 4007 tests**
  and focused **324/324**. Production build, both-oracle freshness, census
  regeneration, and `git diff --check` pass. Census is exactly **141/214
  effects, 267/355 moves, 218/276 Factory-L50 distinct, 2701/2957
  weighted**, all **42/42**.
- **Did:** registered exact five-byte opcode `0xa3`, target-owned first-slot
  match/PP predicate, one-draw 2–5 timer/start, zero-mutation failure jumps,
  switch/faint clearing, and source-ordered `ENDTURN_DISABLE`. Generic legal
  decisions intersect Disable with Encore, disable every duplicate-id slot,
  force real Struggle, and preserve direct-attempt canceler ownership.
- **Next:** supervisor verify this executable-frontier increment and select
  the next finite source registration target; do not resume the retired
  canonical Battle-2 march.
- **Notes:** controlled seed 9 reproduces merged OFF PP **20→19→18**, prevents
  selected disabled Tackle PP loss, forces all-Tackle Struggle, expires with
  `BattleScript_DisabledNoMore`, and restores Tackle legality/PP. No new
  unsupported barrier, recording import, animation/presentation/scenario
  branch, issue removal, oracle lifecycle action, or PAPERCUT.
