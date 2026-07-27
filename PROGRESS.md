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
## 519 — [BOUNDED WORKER 2026-07-27 ~15:00] B_SCR_OP_TRYINFATUATING + B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED registered; EFFECT_ATTRACT/EFFECT_SWAGGER/EFFECT_FLATTER executable end to end

- **State:** tree green at **269 files / 3549 tests** (+6 files / +99 tests
  over session start 263/3512: `battleScriptTryinfatuatingOpcode.test.ts`
  15 tests, `battleScriptJumpifconfusedandstatmaxedOpcode.test.ts` 13 tests,
  plus 2 existing test files updated for the barrier narrowing below and 2
  attack-canceler fixture files updated for the new `personality` battler
  field), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (**0 new barrier call sites** — both new opcodes are fully
  source-complete; the two barrier *narrowings* below reuse existing
  `unsupportedBranch` call sites, same file/line, just a tighter trigger
  condition).
- **Did:** registered both opcodes of round 1's set. (1) `Cmd_tryinfatuating`
  (`battleScriptTryinfatuatingOpcode.ts`): Oblivious block (hardcoded jump,
  not the operand ptr), the same-gender/genderless-attacker/genderless-
  target/already-infatuated-with-anyone OR-chain (all four collapse to the
  operand's one fail ptr), success write of
  `STATUS2_INFATUATED_WITH(attacker)` — reused `statusInfatuatedWithBit`
  (newly exported from `battleScriptHitChainOpcode.ts`, previously a private
  helper for `Cmd_cleareffectsonfaint`'s clear) so the write is *provably*
  the same bit `advanceBattleScriptAttackCancelerInLove`'s admission phase
  already reads (composition test in the new file). Gender inputs needed a
  minimal kernel addition: a `personality` battler field (mirrors
  `gBattleMons[battler].personality`; source rereads species/personality
  from the party mon, but this engine has no Transform species/personality
  divergence yet, so they're always identical) plus a new `genderRatio`
  column on `species-stats.json` (extractor widened to parse
  `species_info.h`'s `.genderRatio` — a `MON_MALE`/`MON_FEMALE`/
  `MON_GENDERLESS` literal or `PERCENT_FEMALE(percent)`, truncated on
  assignment) — reused the existing `monGender.ts` per-mon half unchanged.
  (2) `Cmd_jumpifconfusedandstatmaxed`
  (`battleScriptJumpifconfusedandstatmaxedOpcode.ts`): a pure
  `STATUS2_CONFUSION` + `statStages[stat]==MAX_STAT_STAGE` read, always
  against `gBattlerTarget` directly (no battler operand in the macro at
  all). Zero barriers in either new opcode.
- **Standing-warning barriers found and widened (entries 507/515's own
  warning, budgeted for):** proving Attract's Oblivious tail live surfaced
  two existing barriers that over-fired on ability *membership* where
  source only acts on the matching *status*: (a) `accuracycheck`'s
  `JumpIfMoveFailed` ability-absorbing check barriered on ANY nonzero
  target ability; `AbilityBattleEffects(ABILITYEFFECT_ABSORBING)`
  (`battle_util.c:2679-2729`) only special-cases three (Volt Absorb/Water
  Absorb/Flash Fire) — narrowed to those three, every other ability
  (Oblivious included) now falls through exactly like source. (b)
  `Cmd_moveend`'s `MOVEEND_IMMUNITY_ABILITIES` barriered whenever a battler
  held one of 8 status-curing abilities at all; source
  (`battle_util.c:2873-2954`) only cures when that ability's own status bit
  is *also* set (e.g. Oblivious only fires on actual infatuation) — added
  `immunityAbilityCuresStatus`'s per-ability status gate. Both are
  narrowings of an existing `unsupportedBranch` call site (same file/line),
  not new barrier surfaces; updated the two pre-existing tests that relied
  on the old over-broad trigger to construct genuine reachability instead.
- **Tests:** isolated dispatch for every distinct fail reason of both
  opcodes (all 4 confused×maxed combinations for jumpifconfusedandstatmaxed
  across both its concrete call sites; Oblivious/same-gender/genderless×2/
  already-infatuated-with-a-third-battler for tryinfatuating) PLUS full
  committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt for all three effects: Attract's success
  (opposite genders, status bit confirmed set, 1 RNG roll) and all four
  fail tails (each a real distinct root cause, not just prose-glossed);
  Swagger/Flatter's success (stat raise composing through
  setstatchanger+statbuffchange, confusion via seteffectprimary, 2 RNG
  rolls) and their own jumpifconfusedandstatmaxed edge branch (confused AND
  maxed, 1 RNG roll) plus the "maxed but not confused" and Own-Tempo-blocks-
  confusion non-edge variants.
- **Census (before → after):** 105/214 → **108/214** effects, 206/355 →
  **209/355** moves, 167/276 → **170/276** Factory-L50 unweighted, 2251/2957
  → **2321/2957** weighted (+70, exactly 45+25 — matches the predicted flip
  precisely, no shortfall). Doc regenerated and committed with the code.
  New top blocker: `B_SCR_OP_FORCERANDOMSWITCH`/`INITMULTIHITSTRING`/
  `JUMPIFHASNOHP` (EFFECT_ROAR, 40 weighted).
- **Next:** continue the ranked-table descent — EFFECT_ROAR's opcode trio
  is the regenerated doc's new top-ranked set.
- **Notes:** no PAPERCUT. Commits landed one per green rung: genderRatio
  extraction, opcode registration + kernel `personality` field, EFFECT_
  ATTRACT tests + the two barrier widenings, EFFECT_SWAGGER/FLATTER tests,
  census regen.

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
