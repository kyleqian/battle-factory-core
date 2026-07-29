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

## 688 — [BOUNDED MAIN WORKER 2026-07-29 ~10:25] King's Rock state-12 mechanics live; final sweep pending

- **State:** mechanics checkpoint green at focused **419/419**, production
  build, and `git diff --check`; Battle Scene OFF oracle healthy. Full suite,
  censuses, and seeds 4–30 sweep remain pending.
- **Did:** move-end state 12 now ports `HOLD_EFFECT_FLINCH` literally:
  holder/damage gates, the source-ordered `%100` draw, Gen-3
  `FLAG_KINGS_ROCK_AFFECTED`, surviving target, and synchronous non-certain
  `SetMoveEffect` (Shield Dust/Substitute/Inner Focus/turn-order included).
  Seed 1 pins the qualifying Strength proc at ledger call **5 = 3%** and the
  existing admission arm skips the slower action (**6 total calls**); seed 0
  pins **18%** failure and both actions (**10 calls**).
- **Notes / next:** non-damaging Double Team draws zero; damaging but Gen-3
  excluded Hyper Voice deliberately draws once before flag rejection, matching
  `battle_util.c:3776-3779`. State 12 has no remaining barrier; the module's
  ratchet intentionally drops **6→5**, leaving states 0/2/4/5/11. Next:
  regenerate both censuses, run the unchanged-cursor sweep, full suite/build,
  and finalize this entry. PAPERCUT: none.

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

---

## 686 — [BOUNDED MAIN WORKER 2026-07-29 ~09:55] R13-C live ShouldSwitch driver integration landed

- **State:** tree green at **496 files / 5094 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Both censuses
  regenerate byte-identically at SHA-256 **8b18f754…5261 /
  52687085…257c**.
- **Did:** the live trainer driver now runs R13-A `ShouldSwitch` first on the
  original kernel request/cursor. A selected switch replays only its precheck
  ledger and submits through the original R13-B reducer; no-switch threads the
  advanced cursor into the unchanged mask chooser, then replays the combined
  ledger through that same original request. The switch filter/substitute
  policy-state path and `factory-ai-switch-precheck-unimplemented` retired;
  `frontier-trainer-items-source-unreachable` remains.
- **Receipts:** absorber success is **N=1** draw and switches to party 1;
  failed Alakazam/Marowak precheck is **N=2**, followed by exact old-policy
  suffixes of **11** and all-Surf **13** draws from the post-precheck seed.
  Whole-battle cursor moves **188→196** (four later 2-draw prechecks), same
  win/HP outcome.
- **Sweep:** seed 17 **1787→2013**. Permanent table plus required extras:
  **4:2415, 5:2156, 7:1337, 8:1922, 11:2012, 13:2415, 14:1946,
  15:1602, 16:1878, 18:2143, 19:1691, 20:2326, 21:1911,
  22:1389, 23:2114, 24:1751, 26:1680, 29:1869, 30:1825**; all win seven.
  Seed **6** now honestly loses battle 2 at **791**, player HP `[0,0,0]`
  versus opponent `[0,0,126]`. The table saw no voluntary switch: divergence
  is from source-required precheck draws shifting downstream battle/generation
  RNG, not a contradictory switch/reducer outcome.
- **Supervisor fold (post-step):** ROM receipt §7C Natural Cure merged
  (`be762f2d`): odd 52937 → sentinel + switch (one
  `ShouldSwitchIfNaturalCure+0x89` draw); even control falls through to the
  final Natural Cure coin (30881) → two-draw switch; both twice-fresh
  byte-identical. Perish variant precisely un-banked (shared countdown
  faints both actives first); a follow-up staging attempt is running.
  Supervisor verified union suite **496/5094**, build, and re-drove
  18/20/21/23 = 2143/2326/1911/2114 matching the worker's table.
- **Supervisor fold (post-step):** ROM receipt §7C2 Perish Song merged
  (`e23eb685`): a legal player-switch schedule reaches a live AI timer-zero
  command; seeds 1/2 draw ZERO RNG, switch, deterministically select party
  index 1 — §7C's zero-draw sentinel/scoring prediction fully verified,
  twice-fresh byte-identical. All four §7 receipt variants are now
  ROM-pinned. Supervisor verified union **497/5104** + build. Rung 13
  (R13-A/B/C/D) is complete; the sole named remainder is B-control
  equivalence behind the pre-existing `EFFECT_TOXIC` CheckBadMove barrier.
- **Next / notes:** supervisor resumes R13-D or its ordered queue. No
  unsupported/import ratchet, census byte, generated artifact, issue,
  presentation, animation, canonical recording, or tick branch moved.
  PAPERCUT: none.
