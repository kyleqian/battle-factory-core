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

## 682 — [BOUNDED MAIN WORKER 2026-07-29 ~08:36] wake-up path retired; seeds 18/20 seven-win exact

- **State:** committed `20ad5cce`; tree green at **494 files / 5064 tests**,
  production build, `git diff --check`, Battle Scene OFF oracle info, and
  byte-identical executable + ability/item census documents. Seeds **18/20**
  now win all seven generated battles at exact **2478/2140** facility calls;
  the permanent 17-carrier table remains unchanged and exact.
- **Did:** registered `Cmd_bicword`'s third and final source operand,
  `HITMARKER_WAKE_UP_CLEAR` (bit 4, source says never set/checked), plus
  `gWokeUpStringIds`. The attack-canceler controller status write now also
  syncs the active mon's persistent party status, matching
  `REQUEST_STATUS_BATTLE`.
- **Acceptance:** Tier-1 drives sleep counter **1→0** through
  `BattleScript_MoveUsedWokeUp`, proving battler+party wake, ordinary woke-up
  message, status-icon update, return to `Cmd_attackcanceler`, PP use, real
  Tackle damage, and the next command. The former bicword barrier test is now
  a pass-through clear; normal/Uproar table selectors are both pinned.
- **Sweep / Next:** seeds 4–30 pass battles 0/1/2 at **26/25/25**; **24/27**
  win seven, seed 12 legitimately loses battle 7. Remaining blockers are
  end-turn instruction budget (**seed 21**, untouched/out of scope) and
  `BattleScript_HitFromAtkCanceler: Cmd_attackcanceler` (**seed 23**). Next:
  seed 23 is the authorized stretch if time remains; otherwise return to the
  supervisor with this green wake-up checkpoint.
- **Notes:** no new carrier, canonical recording, presentation, animation,
  tick branch, or SCRIPT_BUDGET change. Unsupported-branch call-site pin stays
  **4** for `battleScriptDamagingWeatherOpcode.ts`; its comment now names that
  the live wake-up operand is retired while the generic future-pair guard
  remains. Ability/item census's exact live-source pin moved only
  `battleScriptHitChainOpcode.ts:1091→1096` after the two-entry wake-up table
  added five lines; both generated docs remain byte-identical. PAPERCUT: none.

---

## 681 — [SUPERVISOR SESSION OPEN 2026-07-29 ~08:25] animation-main folded (Sweet Kiss + Aromatherapy exact); union green; freshness FAIL judged false positive

- **State:** master fast-forwarded to `d166f9cf` (= animation-main union:
  the concurrent animation supervisor had already merged master in, so the
  fold was a clean ff bringing 9 animation commits — MOVE_SWEET_KISS and
  MOVE_AROMATHERAPY promoted exact). Union green at **493 files / 5061
  tests**, production build passes, tree clean.
- **Oracle freshness:** `check-oracle-freshness.sh` exits 1 for both ports
  (services started 2026-07-28 21:42, harness HEAD 807b449 22:08). Verified
  the sole intervening harness commit is docs-only (`NOTES.md`, +54 lines,
  no oracle/schema change), and the animation supervisor is live on port
  8012 — decision: **no restart**, false positive recorded here; both
  profiles answer `info` healthily.
- **Session plan (entry 680's ordered Next):** (i) sweep blockers — wake-up
  `Cmd_bicword` (seeds 18/20), end-turn instruction budget (seed 21),
  attack-canceler stop (seed 23); (ii) entry 677 AI reveal-site remainder;
  (iii) rung-13 mid-turn ShouldSwitch; (iv) King's Rock flinch; (v) rung 14
  presentation windows + Gate-6 matrix; (vi) ISSUES #48.

---

## 680 — [SUPERVISOR WIND-DOWN 2026-07-29 ~03:35] ability/item parity closed; Gate-5 plan executed to 22/27 seven-win seeds in one session

- **State:** master `15c549e2`, union green at **489 files / 5048 tests**,
  production build, `git diff --check` clean, both censuses byte-idempotent
  (**moves 214/214; hold effects 42/42 = 850/850; abilities 69/69 =
  1096/1096 + 4 without Factory battle hooks**). DEFERRED.md **empty** —
  no deferred questions all session. No orphan worktrees/branches;
  `animation-main` fully folded (twice at wind-down: `d057f085`,
  `15c549e2` — 25 commits, 10 moves promoted exact overnight).
- **Session (17 rounds / ~33 workers, 0 failed steps):** (1) closed the
  user-confirmed ability/item parity objective — turn-order input wiring,
  the systemic **turn-boundary RNG gap** found/fixed/oracle-corroborated to
  exact LCG equality, Quick Claw, ON_DAMAGE family, trapping trio +
  voluntary switching, Run Away/Pickup source-proven closures, census
  generator §A3 fix. (2) Executed the Gate-5 facility-round-loop plan
  (docs/facility-round-loop-scout.md) rungs 1-12 same-day: battle-start
  receipts (A/tie/B), fresh initializer + entry hooks (barrier-free),
  party adapter (850 sets), rental+opponent generators, live AI driver,
  controller-owned generated battles, swap/heal + commentary +
  trainer-identity seams (canonical pixels proven unchanged). (3) The
  seed-sweep instrument (seeds 4-30) drove breadth: blockers retired
  serially (faint-replacement scoring, multi-hit/EQ resumption, confusion
  self-hit, end-turn forced-switch resumption, Chesto/Shell Bell) —
  **22/27 seeds win seven battles** at exact pinned cursors; seed 12 loses
  legitimately in battle 7. (4) Two read-only audits: 3 interaction
  defects found and fixed same-session (double-faint cursor, deferred
  switch-in hooks + White Herb, AI reveal wiring); ISSUES #48 filed.
- **Next (ordered):** (i) remaining sweep blockers: wake-up
  `Cmd_bicword` (seeds 18/20), end-turn instruction budget (21),
  attack-canceler stop (23); (ii) entry 677's AI reveal-site remainder
  (listed line-by-line there); (iii) rung-13 implementation from
  docs/factory-ai-switch-scout.md (mid-turn ShouldSwitch); (iv) King's
  Rock flinch (state-12 named remainder); (v) rung 14 remaining
  presentation windows + Gate-6 interaction matrix; (vi) ISSUES #48
  two-challenge lifecycle. Oracle services are fresh (restarted this
  session); both profiles healthy.
- **Notes:** the cwd-reset launcher policy held all session (zero cwd
  bites in 17 rounds). PAPERCUTS observed by workers: compare-out race
  (~2 min), probe log volume (~4 min) — both minor, not filed.
