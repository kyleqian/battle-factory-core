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

---
## 564 — [SUPERVISOR VERIFY 2026-07-28 ~01:24] Corrected Future Sight accepted; Disable evidence merged

- **State:** reviewed union green at **321 files / 3994 tests** and focused
  **276/276**; production build, both-oracle freshness, census regeneration,
  and `git diff --check` pass. Census is exactly **140/214 effects, 266/355
  moves, 217/276 Factory-L50 distinct, 2696/2957 weighted**, all **42/42**.
- **Did:** accepted the Future Sight increment only after corrective `3e949d1`
  made delayed ownership source-exact: prior move/effect/power and history
  persist, while stored move drives explicit accuracy/message/animation and
  `adjustnormaldamage2` alone omits False Swipe. Merged and independently
  replayed Disable evidence `9cb0921`.
- **Next:** register exact five-byte `0xa3`
  `B_SCR_OP_DISABLELASTUSEDATTACK`, target-owned first move-id match against
  `gLastMoves`, one-draw 2–5 timer/start value, all failure branches, ordinary
  move admission, switch clearing, and `ENDTURN_DISABLE`. Expected census is
  **141/214, 267/355, 218/276, 2701/2957**.
- **Notes:** Future Sight retains Tackle **33 / effect 0 / power 35** and HP
  **140→103**. Disable OFF evidence observes PP **20→19→18**, forced Struggle,
  then Tackle resumption; manifest `ea9f5139…a1019`. No barrier/import ratchet
  change, recording import, animation edit, DEFERRED item, or oracle lifecycle
  action.
