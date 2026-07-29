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

## 689 — [BOUNDED MAIN WORKER 2026-07-29 ~10:38] Issue #48 rental-count persistence landed

- **State:** implementation committed `4c9d38b0`; tree green at **497 files /
  5116 tests**, production build, `git diff --check`, and Battle Scene OFF
  oracle info. Both censuses are byte-identical at SHA-256
  **8b18f754…5261 / 76ec7ed2…c563**; no ratchet moved.
- **Did:** the generated-round orchestrator now owns returned
  `facilityState.rentsCount` plus source-shaped `performedRentalSwap`.
  Accepting any swap sets the challenge flag; only win 7 persists the capped
  count once and clears the flag. The next challenge's initial-rental
  generator consumes that returned count.
- **Lifecycle proof:** seed 17 deliberately accepts swaps after battles 1 and
  2; challenge 1 still completes and moves count **14→15 exactly once**.
  Challenge 2 crosses `GetNumPastRentalsRank`'s first band **rank 0→1**.
  The all-declined control remains **14 / rank 0**.
- **Sweep / next:** focused generated-round sweep is **24/24**. Existing
  cursors remain exact: **4:2415, 5:2156, 6:791 loss, 7:1337, 8:1922,
  11:2012, 13:2415, 14:1946, 15:1602, 16:1878, 17:2013, 18:2143,
  19:1691, 20:2326, 21:1911, 22:1389, 23:2114, 24:1751, 26:1680,
  29:1869, 30:1825**. Issue #48 is removed; supervisor resumes its ordered
  queue. No RNG, single-challenge outcome, presentation, animation, census,
  canonical recording, unsupported/import ratchet, or tick branch moved.
  PAPERCUT: none.

---

## 688 — [BOUNDED MAIN WORKER 2026-07-29 ~10:30] King's Rock state-12 mechanics landed

- **State:** committed `5a69d4e4` + census `9093d895`; tree green at **497
  files / 5111 tests**, production build, `git diff --check`, and Battle Scene
  OFF oracle info. Both censuses regenerate cleanly.
- **Did:** move-end state 12 now ports `HOLD_EFFECT_FLINCH` literally:
  holder/damage gates, the source-ordered `%100` draw, Gen-3
  `FLAG_KINGS_ROCK_AFFECTED`, surviving target, and synchronous non-certain
  `SetMoveEffect` (Shield Dust/Substitute/Inner Focus/turn-order included).
  Seed 1 pins the qualifying Strength proc at ledger call **5 = 3%** and the
  existing admission arm skips the slower action (**6 total calls**); seed 0
  pins **18%** failure and both actions (**10 calls**).
- **Census / sweep:** executable census is byte-identical
  (**8b18f754…5261**). Ability/item changes only FLINCH refs **3→2** (barrier
  removed), INNER_FOCUS **3→4**, and SHIELD_DUST **4→5** (live prevention
  gates), now **76ec7ed2…c563**. Seeds 4–30 match the checked-in post-R13
  baseline exactly: **25/27** seven-win; 6 loses battle 2 at 791 and 12 loses
  battle 7 at 1846. The brief's older 2478/2140/1911/1436 cursors were already
  2143/2326/1911/2114 at entry 687; this patch leaves the latter unchanged.
- **Notes / next:** non-damaging Double Team draws zero; damaging but Gen-3
  excluded Hyper Voice deliberately draws once before flag rejection, matching
  `battle_util.c:3776-3779`. State 12 has no remaining barrier; the module's
  ratchet intentionally drops **6→5**, leaving states 0/2/4/5/11. Next:
  supervisor resumes its ordered queue; no issue, canonical recording,
  presentation, animation, or tick branch moved. PAPERCUT: none.

---

## 687 — [BOUNDED MAIN WORKER 2026-07-29 ~10:10] R13-D breadth landed; B-control scorer remainder bounded

- **State:** evidence commit `c6d1648f`; tree green at **497 files / 5104
  tests**, production build, `git diff --check`, and Battle Scene OFF oracle
  info. Both censuses regenerate byte-identically at SHA-256
  **8b18f754…5261 / 52687085…257c**.
- **Did:** live-driver tests now run the same switch/no-switch fixtures at
  streaks 0/14/28 (masks 0/1/7) and the Brain override. They pin identical
  successful ledgers and failed prefixes, legal-slot filtering, mask-0 score
  ties, party/move-major helper ties, player-switch history clearing, and the
  subsequent scoring command. Receipt A success/control, B success, and both
  Natural Cure C variants reproduce their exact action, u16 ledger, cursor,
  and selected index from the cited OFF receipt docs.
- **Bounded remainder:** B control's exact `%3=2` precheck is reproduced
  (**4280**, cursor `5457c42e→10b8ec09`, no switch), then the honest four-move
  live fixture reaches the pre-existing `factory-ai-check-bad-move` barrier
  for Toxic (slot 2, move 92, `EFFECT_TOXIC`). Completing its 8-draw/action
  equivalence requires a dedicated Toxic scorer port and ratchet decrease,
  contrary to this step's no-new-production-barrier/no-ratchet scope; the
  test pins that exact boundary rather than narrowing legal moves.
- **Acceptance:** focused **168/168**; whole-battle + round sweep **24/24**;
  full **5104/5104**. Seeds **18/20/21/23** remain seven wins at exact
  **2143/2326/1911/2114** calls; the permanent carrier table remains green.
  **Next:** supervisor decides whether to schedule the Toxic CheckBadMove
  prerequisite, then upgrades B control to full receipt equivalence. No
  production, generated artifact, issue, presentation, animation, import/
  unsupported ratchet, canonical recording, or tick branch moved.
  PAPERCUT: none.
