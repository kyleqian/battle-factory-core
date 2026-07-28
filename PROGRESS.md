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
## 572 — [SUPERVISOR VERIFY 2026-07-28 ~02:38] Corrected Minimize accepted; Skill Swap evidence folded

- **State:** reviewed union green at **330 files / 4040 tests** and focused
  **42/42**; production build, both-oracle freshness/info, census
  regeneration, ratchets, and `git diff --check` pass. Census is exactly
  **143/214 effects, 269/355 moves, 220/276 Factory-L50 distinct,
  2711/2957 weighted**, all **42/42**.
- **Did:** accepted Minimize only after `507fde7` unified the producer/consumer
  status constant and replaced a transient multiplier snapshot with the
  same-seed Stomp damage control (**25 vs 12**). Merged and independently
  replayed the successful Skill Swap OFF checkpoint: active abilities
  **39/5 → 5/39**, persistent party abilities unchanged, PP **10→9**, exact
  manifest `1bb13425…54cd241a`.
- **Next:** register operandless `0xca` `B_SCR_OP_SETFORCEDTARGET` globally:
  attacker-side timer **1**, attacker target, one-byte advance, PP-before-write,
  end-turn timer clear, zero RNG. Keep the generic controller honest in
  singles; source-pin doubles retarget readers without inventing doubles.
  Expected census: **144/214, 270/355, 221/276, 2716/2957**.
- **Notes:** no private handler, recording import, barrier/import ratchet
  change, animation/presentation/scenario branch, DEFERRED item, issue
  removal, or oracle lifecycle action.

---
## 571 — [BOUNDED MAIN WORKER CORRECTION 2026-07-28 ~02:35] Minimize consumer proof corrected

- **State:** committed `507fde7`; tree green at **329 files / 4037 tests**,
  focused **24/24**, and ratchets **6/6**. Production build, both-oracle
  freshness/info, census regeneration, and `git diff --check` pass. Census
  remains **143/214 effects, 269/355 moves, 220/276 Factory-L50 distinct,
  2711/2957 weighted**, all **42/42**.
- **Did:** removed `SETMINIMIZE`'s duplicate `STATUS3_MINIMIZED` declaration;
  its producer and the existing jump consumer now import one canonical source
  constant. Replaced the post-MoveEnd multiplier claim with a same-seed,
  same-+1-evasion Double Team control: Stomp leaves Minimize at **974 HP
  (25 damage)** versus control **987 HP (12 damage)**, with exact PP/stage/
  status outcomes; the isolated shared jump/setbyte exact-2 proof remains.
- **Next:** supervisor verify this bounded correction, then select the next
  finite shared registration target; do not extend the retired Battle-2 march.
- **Notes:** production semantics, census, evidence, and all ratchets are
  unchanged. No `MoveValuesCleanUp`, private override, scenario/presentation/
  animation change, issue removal, oracle lifecycle action, or PAPERCUT.

---
## 570 — [BOUNDED MAIN WORKER 2026-07-28 ~02:28] Minimize executes and Stomp consumes it generically

- **State:** committed `29f2a0c`; tree green at **329 files / 4037 tests**,
  focused **321/321**, and ratchets **6/6**. Production build, both-oracle
  freshness/info, census regeneration, and `git diff --check` pass. Census is
  exactly **143/214 effects, 269/355 moves, 220/276 Factory-L50 distinct,
  2711/2957 weighted**, all **42/42**.
- **Did:** globally registered operandless `0xc7`: it always advances and only
  `HITMARKER_OBEYS` ORs `STATUS3_MINIMIZED` onto the selected attacker.
  Source/program tests pin max-evasion persistence and the existing Stomp
  target branch's shared `setbyte sDMG_MULTIPLIER, 2`; a generic full turn
  proves manual Minimize PP/evasion/status3 before slower Stomp consumes it.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next shared registration target; do not extend the retired
  canonical Battle-2 march.
- **Notes:** existing battle-init, ordinary-switch, faint, and Baton Pass
  exclusion seams are pinned without widening their ownership. OFF evidence
  remains manifest `67c617f7…c842977`. No RNG/message/stat/lock ownership,
  barrier/import ratchet change, recording import, animation/presentation/
  scenario branch, oracle lifecycle action, issue removal, or PAPERCUT.
