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

---

## 679 — [FINAL BOUNDED MAIN WORKER 2026-07-29] end-turn forced-switch + move-end blockers retired

- **State:** committed `9fdc4a26` and `70012fc6`; tree green at **487 files /
  5042 tests**, production build, `git diff --check`, Battle Scene OFF oracle
  info, and byte-identical executable + ability/item census regeneration. All
  **17 pinned carriers remain exact** at their entry-678 cursors; the pinned
  set stays capped there to keep the orchestrator suite fast.
- **Diagnosis / source fix:** seed 9 battle 3 hit the generic throw at
  `factoryBattleScriptFullTurnDecision.ts:1478` after Double-Edge recoil took
  the player **38→24**, Toxic advanced **0x280→0x380**, and its **30 HP**
  end-turn tick fainted the active. The ROM preserves
  `turnEffectsTracker/turnEffectsBattlerId` across each effect script
  (`battle_util.c:1464-1478,1770-1778`), then calls field effects → battler
  effects → `HandleFaintedMonActions` → Wish/Perish → cleanup
  (`battle_main.c:3956-3974`). The reducer now tags this forced request and,
  after entry 677's existing fainted-actions cursor completes replacement,
  resumes at Wish/Perish instead of rerunning the field/battler loops.
- **Acceptance / RNG:** full-turn pins cover player poison KO → forced choice
  → replacement → the remaining trainer burn fires once → next command
  (**8 calls paused, 9 at the next boundary**); trainer poison KO selects its
  healthy replacement with **9 calls**; last-mon poison KO reaches the real
  outcome with **8 calls**. Seeds **9/10/25/27** now win seven at
  **1521/1930/1497/1691** calls.
- **Bonus move-end family:** seed 18's state-11 Chesto/Sleep branch now clears
  Sleep + Nightmare, syncs party status, consumes the berry, and transfers to
  `BattleScript_BerryCureSlpRet` (`battle_util.c:3639,3677-3685`). Seeds
  12/28's state-12 Shell Bell branch now records first non-passive target
  damage, applies the exact gate/divisor/minimum-one heal, clears the receipt,
  preserves the item, and draws no RNG
  (`battle_script_commands.c:1870,1878,1932-1933`;
  `battle_util.c:3769-3804`). The sole named state-12 remainder is **King's
  Rock flinch** (`HOLD_EFFECT_FLINCH`, `battle_util.c:3774-3785`); other
  state-11 cure branches remain behind their pre-existing generic barrier.
- **Final sweep / Next:** seeds **4–30** pass battles 0/1/2 at
  **26/24/24**; **22/27** win seven, seed 12 reaches battle 7 and loses
  legitimately, and the remaining blocker census is wake-up
  `BattleScript_MoveUsedWokeUp: Cmd_bicword` (**2**, seeds 18/20), end-turn
  instruction budget (**1**, seed 21), and
  `BattleScript_HitFromAtkCanceler: Cmd_attackcanceler` (**1**, seed 23).
  Next main step should retire those in that order.
- **Notes:** retired the exact forced-switch throw plus move-end states 11
  (Chesto) and 12 (Shell Bell). No unsupported/import ratchet or census
  artifact moved; no issue, probe, presentation, animation, canonical
  recording, or tick branch changed. This is the session's last worker entry.
  PAPERCUT: none.

