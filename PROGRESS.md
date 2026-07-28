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
## 554 — [SUPERVISOR VERIFY 2026-07-27 ~23:25] Substitute accepted; Sleep Talk evidence merged

- **State:** reviewed union green at **309 files / 3911 tests**; production
  build, both-oracle freshness, and `git diff --check` pass. Census is
  **135/214 effects, 259/355 moves, 211/276 Factory-L50 distinct,
  2662/2957 weighted**.
- **Did:** accepted `b179bd5`/`2c84860`: source-complete
  `B_SCR_OP_SETSUBSTITUTE` matches the strict quarter-HP branches and its
  generic two-turn proof preserves HP **155→117**, PP **10→9→8**, and the
  live substitute. Merged `6791d53` after independently replaying the OFF
  Sleep Talk scenario twice at manifest `6cc123e5…c3b`.
- **Next:** implement paired `B_SCR_OP_TRYCHOOSESLEEPTALKMOVE` /
  `B_SCR_OP_JUMPTOCALLEDMOVE`, including exact exclusions, retry RNG,
  called-move targeting, direct no-return effect dispatch, and awake/all-
  unusable/asleep-call terminal routes. Expected census is
  **136/214, 260/355, 212/276, 2670/2957**.
- **Notes:** the replay observes awake PP **10→9**, real Spore sleep, asleep
  Sleep Talk PP **9→8**, called Fissure with its PP still **5**, and the KO.
  Hidden selection/PC fields are source-pinned. No new barrier, recording
  import, animation edit, DEFERRED item, or oracle lifecycle action.

---
## 553 — [BOUNDED MAIN WORKER 2026-07-27 ~23:21] Substitute executes and persists across real actions

- **State:** tree green at **308 files / 3908 tests**; focused **277/277**,
  production build, OFF-oracle freshness, and `git diff --check` pass. Census
  is **135/214 effects, 259/355 moves, 211/276 Factory-L50 distinct,
  2662/2957 weighted**, exact **+1/+1/+1/+10**, with all **42/42** checks.
- **Did:** committed `b179bd5`/`2c84860`: registered source-complete one-byte
  opcode `0x9c` / `Cmd_setsubstitute`, including strict HP boundary,
  minimum-one quarter, attacker field ownership, and zero direct HP/event/
  controller/RNG side effects. Genuine success, low-HP failure, and
  already-live routes reach `END`; the generic two-turn Golem→Harden proof
  matches HP **155→117** and PP **10→9→8** with the live state preserved.
- **Next:** supervisor verify this increment, then choose from the regenerated
  top frontier led by Sleep Talk's two-opcode set or `B_SCR_OP_TRYWISH`.
- **Notes:** added the source `gSubstituteUsedStringIds` table and the existing
  full-turn pause port's missing `B_WAIT_TIME_SHORT=32` literal. Existing
  hit-chain/MOVEEND tests still pin persistence until `substituteHP==0`, then
  clear. No barrier/ratchet increase, recording import, animation/render edit,
  canonical Battle-2 work, oracle lifecycle action, or PAPERCUT.

---
## 552 — [SUPERVISOR VERIFY 2026-07-27 ~23:10] Destiny Bond terminal path accepted; Substitute evidence merged

- **State:** reviewed union green at **307 files / 3898 tests**; focused
  **266/266**, production build, oracle freshness, and `git diff --check`
  pass. Census is **134/214 effects, 258/355 moves, 210/276 Factory-L50
  distinct, 2652/2957 weighted**.
- **Did:** accepted `410c751`/`5eb6a0f`: the reusable ordered multi-push VM
  control reproduces Destiny Bond's nested avenging→original-faint→caller
  returns, and a generic Wobbuffet→Snorlax Explosion turn reaches terminal
  with both faints exactly once. The hit-chain barrier ratchet shrank
  **23→22**.
- **Next:** register the one-byte `B_SCR_OP_SETSUBSTITUTE` /
  `EFFECT_SUBSTITUTE` from merged source/OFF evidence. Implement both strict
  low-HP failure and success mutations, plus already-live and cross-action
  persistence routes; regenerate the expected **+1/+1/+1/+10** delta.
- **Notes:** merged `f48d51f` after twice reproducing Golem Substitute at
  manifest `19e525d9…f7c7d`: HP **155→117**, PP **10→9→8**, and the live bit
  persist through a second real failed use. Low-HP internal fields are
  source-pinned but not oracle-exposed. No new barrier, recording import,
  animation edit, DEFERRED item, or oracle lifecycle action.
