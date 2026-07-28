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

---
## 555 — [BOUNDED MAIN WORKER 2026-07-27 ~23:46] Sleep Talk executes called moves generically

- **State:** committed `c7b9822`/`6e33331`; tree green at **310 files / 3938
  tests** and focused **322/322**. Production build, Battle Scene OFF oracle
  freshness, census regeneration, and `git diff --check` pass. Census is
  exactly **136/214 effects, 260/355 moves, 212/276 Factory-L50 distinct,
  2670/2957 weighted**, with all **42/42** checks.
- **Did:** registered source-complete `0xa9 + ptr`
  `TRYCHOOSESLEEPTALKMOVE` and `0x63 + byte` `JUMPTOCALLEDMOVE`. The generic
  VM now owns all exclusions/limitations except PP, slot+target retry RNG,
  called/current/position/target fields, TRUE/FALSE chosen-move behavior,
  and direct effect dispatch without a stack push. Awake, all-unusable, and
  asleep→Fissure terminal walks pass; the full-turn seam reaches player-win.
- **Next:** supervisor verify this executable-frontier increment and select
  the next finite Stage 8 registration target.
- **Notes:** full-turn Whiscash proof preserves Fissure PP **5**, spends Sleep
  Talk **10→9**, leaves chosen move as Sleep Talk, and skips the slower
  trainer action after the KO. No barrier/ratchet increase, recording import,
  presentation/animation edit, canonical Battle-2 work, or PAPERCUT.

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
