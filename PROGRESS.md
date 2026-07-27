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
## 518 — [SUPERVISOR ORIENT 2026-07-27 ~14:30] animation-main folded (SWAGGER + SELF_DESTRUCT exact); round 1 dispatched

- **State:** master green at **3520 tests** (fold merge `b1f86cd`),
  `npm run build` clean, oracle services fresh (both profiles PASS). Folded
  6 animation commits (tip `3dcf03c`): SWAGGER and SELF_DESTRUCT promoted
  exact — animation coverage now **45/276 exact, 3 partial**. The animation
  supervisor's own session wound down clean (no worker branches or stale
  worktrees on their side).
- **Round 1 (dispatched):** main → top-2 ranked census sets
  `B_SCR_OP_TRYINFATUATING` (EFFECT_ATTRACT, 45 weighted) +
  `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` (EFFECT_SWAGGER + EFFECT_FLATTER,
  25 weighted) ∥ side → §13 presentation prep-scout (scout picks the next
  window by §10's smallest-input-surface method; the §12.3-step-3
  apostrophe-charmap residual is documented context, not fixed there).
- **Next:** verify round 1; continue ranked-table descent + seam cadence;
  §24.5 sites 6/7 + §19.5 sites 3-6 recipe-only breadth remain optional.

---
## 517 — [SUPERVISOR WIND-DOWN 2026-07-27 ~14:00] session complete: 7 rounds / 14 workers, all verified and merged

- **State (final):** tree committed and green at **263 files / 3512 tests**
  (session start: 245/3363; 247/3370 after the orient animation fold),
  `npm run build` clean, clean `git status`, zero unmerged side branches,
  zero stale worktrees, `animation-main` folded twice (11 commits at
  orient — fast-forward onto the live animation supervisor's own
  sync-merge — and 32 at wind-down: Poison Tail/Hyper Fang/Sludge
  Bomb/Toxic tooling; animation coverage now 43/276 exact; 0 unfolded at
  close, later commits fold next orient). **No DEFERRED entries — nothing
  blocks the next `run-supervisor.sh`.** All 14 workers across 7 rounds
  completed (0 failures, 0 salvages, no usage limits).
- **Census:** 94/214 → **105/214 effects**, 191/355 → **206/355 moves**,
  153/276 → **167/276 Factory-L50**, 1900/2957 → **2251/2957 weighted
  (64.3% → 76.1%)** via 4 ranked-table sets: EARTHQUAKE target-iteration
  pair (+147, incl. a hidden per-operand `Cmd_bicword` barrier the census
  cannot see — standing warning recorded), SETPROTECTLIKE (+61, new
  `protectUses` field + real block/endure composition proofs),
  NEGATIVEDAMAGE+TRYSETREST (+98), JUMPIFSTAT+PLAYSTATCHANGEANIMATION
  (+45). Next top blocker: `B_SCR_OP_TRYINFATUATING` (EFFECT_ATTRACT, 45).
- **ISSUES #47 closed and deleted** in 3 pipelined rounds: logic-ID-major
  restructure + Channel 2 first-slot model (entry 504) → side evidence
  pack (§27 22-handler write audit + index-1 fixtures, live divergence
  confirmed) → per-slot funcResult value propagation (entry 511) → §27.5
  conditional-predecessor A/B pair CONFIRMED. 5 dedicated fixtures, zero
  contradictions; remaining 6 unstaged predecessors = optional breadth
  (§27.5 recipe), not debt.
- **Presentation seam:** two windows re-driven from kernel events —
  `turn4-doubleteam.json` kickoff (§11.3, 250/250 preserved) and
  `turn6-featherdance.json` (§12.3, 90/90; first opponent-target,
  two-sourceLabel bridge) — plus §12 prep-scout banked and executed in the
  same session. ENDTURN `RESTORE_HP`/`RESTORE_PP` registered with a live
  Sitrus fixture (+30 heal at the exact ≤50% gate, zero draws, berry
  consumed). CV ground truth: §24.5 DRAW SITEs 2 and 5 live-verified
  (2 recipe-only remain: 6 ingrain, 7 curse) incl. a real Gate-A polarity
  correction.
- **Next (in order):** TRYINFATUATING census set (then descend the ranked
  table); next presentation prep-scout (§13) per the §8-§12 cadence —
  note entry 514's apostrophe-charmap prerequisite before wiring
  `TURN6_ATKFELL` text; §24.5 sites 6/7 + §19.5 sites 3-6 (recipe-only);
  ISSUES #41/#39 keep retiring window by window.
- **Notes:** 1 new PAPERCUTS entry (mash-rep calibration doesn't transfer
  between move-animation classes, 2 hits). Entry 516's process note: check
  `git status` right after any tsc-triggered fix. Oracle services fresh
  all session. The user's `codex/oracle-tooling-papercuts` worktree left
  untouched.

---
## 516 — [BOUNDED WORKER 2026-07-27 ~14:00] B_SCR_OP_JUMPIFSTAT + B_SCR_OP_PLAYSTATCHANGEANIMATION registered; EFFECT_TICKLE/COSMIC_POWER/BULK_UP/CALM_MIND/DRAGON_DANCE executable end to end

- **State:** tree green at **255 files / 3484 tests** (+3 files / +38 tests
  over session start 252/3446: new `battleScriptJumpifstatOpcode.test.ts`
  12 tests, `battleScriptPlaystatchangeanimationOpcode.test.ts` 19 tests,
  `battleScriptStatSetupEffects.test.ts` 7 full-committed-script tests; plus
  the production-handler-count assertion in `battleScriptRulesContext.test.ts`
  updated 115→117), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (**0 new barriers** — both opcodes are fully source-complete, no
  `unsupported-branch` needed by either).
- **Did:** per entry 513's handoff, registered both opcodes of the ranked
  set (`battleScriptJumpifstatOpcode.ts`, `battleScriptPlaystatchangeanimationOpcode.ts`).
  (1) `Cmd_jumpifstat`: a pure `statStages[stat]` read + conditional jump,
  all 6 `CMP_*` arms implemented from source (only 4 are exercised by the
  program's 18 concrete call sites — `COMMON_BITS`/`NO_COMMON_BITS` never
  appear — but all 6 are real switch arms, not silently defaulted, per the
  brief's explicit ask). Eagerly validated at registration against all 18
  concrete call sites (matches the `SETBYTE`/`STATBUFFCHANGE`/`ORBYTE`
  precedent for zero-barrier opcodes), since every one resolves to a known
  `STAT_*`/`MIN_STAT_STAGE`/`MAX_STAT_STAGE` combination. (2)
  `Cmd_playstatchangeanimation`: derived what it actually does to battle
  STATE rather than its (out-of-scope) animation — it never mutates a stat
  stage (that stays owned by the later `setstatchanger`+`statbuffchange`
  pair already registered); it only decides whether a `B_ANIM_STATS_CHANGE`
  controller event queues at all and flips `gBattleScripting.statAnimPlayed`
  so a multi-stat move's second/third call in the same script doesn't
  re-queue. Ported both families exactly: the "goes up" family has **no**
  ability/Mist gate at all (source-verified — only "goes down" does), and
  "goes down" applies the identical Mist/Clear Body/White Smoke/Keen
  Eye+ACC/Hyper Cutter+ATK guard `changeStatBuffs` already applies to the
  real write, bypassed entirely when `STAT_CHANGE_CANT_PREVENT` is set.
  Eagerly validated against all **15** concrete call sites (not just the 5
  target effects' own — also `BattleScript_AtkDefDown`/`SAtkDown2`/
  `AllStatsUp`/`EffectMemento`'s shared-tail call sites, which exercise
  `STAT_CHANGE_BY_TWO`/`CANT_PREVENT`/a 5-stat mask; those effects
  themselves remain blocked on other opcodes — trymemento/setatkhptozero/
  curse/jumpiftype2 — out of this step's scope). Zero barriers in either
  opcode: both source functions have no unhandled branch to guard.
- **Tests:** isolated-dispatch coverage for both opcodes (all 6 `CMP_*`
  arms via a synthetic-operand harness matching `jumpifbyte`'s own
  precedent for its unexercised comparators; every playstatchangeanimation
  branch — 0/1/2+ changeable-stat counts, each ability/Mist block scoped to
  its own stat, `CANT_PREVENT` bypass, `BY_TWO`'s -2/+2 id family,
  `MULTIPLE_STATS`'s count<2 skip + `statAnimPlayed` flip, controller-busy
  block) PLUS full committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt for all 5 effects: Tickle's own
  accuracy-checked two-stat-lower success (exactly 1 RNG roll) and its
  both-already-MIN_STAT_STAGE `BattleScript_CantLowerMultipleStats` fail
  tail; Cosmic Power/Bulk Up/Calm Mind/Dragon Dance's zero-RNG two-stat
  raises, each confirmed 6→7 on its own two stats, plus Bulk Up's
  both-already-MAX_STAT_STAGE `BattleScript_CantRaiseMultipleStats` fail
  tail (shared by all four "goes up" scripts). No hidden per-operand
  barrier surfaced (entry 507's standing warning) — every walk ran clean
  on the first source-derived attempt once BS_TARGET vs BS_ATTACKER
  selector roles were set correctly per script.
- **Census (before → after):** 100/214 → **105/214** effects, 201/355 →
  **206/355** moves, 162/276 → **167/276** Factory-L50 unweighted, 2206/2957
  → **2251/2957** weighted (+45, exactly this set's weight). Doc
  regenerated and committed with the code. New top blocker:
  `B_SCR_OP_TRYINFATUATING` (EFFECT_ATTRACT, 45 weighted).
- **Next:** `B_SCR_OP_TRYINFATUATING` (EFFECT_ATTRACT) is the regenerated
  doc's new top-ranked set — one opcode, one effect, 45 weighted.
- **Notes:** no PAPERCUT. One in-session process note: a `tsc --noEmit`
  type-fix (`BattleScriptRulesBattler` → `BattleScriptRulesBattlerState` in
  the new playstatchangeanimation file) was made and verified correct
  early, but its file edit was accidentally left out of the next `git add`
  — caught by a routine `git status` check before the census commit, fixed
  in a small follow-up commit with no behavior change. Worth double-checking
  `git status` is clean immediately after any `tsc`-driven fix, not just
  before the final wrap-up.
