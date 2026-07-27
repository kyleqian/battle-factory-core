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

---
## 515 — [SUPERVISOR 2026-07-27 ~13:20] round 6 verified + merged; ISSUES #47 CLOSED and deleted; final round dispatched

- **State:** master green at **252 files / 3446 tests**, build clean, census
  **100/214 effects, 201/355 moves, 162/276 Factory-L50, 2206/2957 weighted
  (74.6%)**. Round 6 landed: NEGATIVEDAMAGE + TRYSETREST (entry 513) ∥ §12
  wiring (entry 514; supervisor reran compares live: turn6-featherdance
  90/90, turn5-faint 110/110) ∥ side §27.5 (merged from
  `worker/side-20260727-120806`, cleaned; verify script rerun in-worktree
  ALL PASS): AI_CV_RainDance live-verified as a writes-conditionally
  PREDECESSOR in a controlled A/B pair — **shipped model CONFIRMED both
  directions**.
- **ISSUES #47 deleted (supervisor decision, this commit):** the engine's
  per-slot funcResult value model is implemented for all 22 CV handlers
  (entry 511) and live-validated across all three write classes — 
  writes-never, writes-always (§27.4), and writes-conditionally (§27.5) — 
  5 dedicated fixtures + 2 net-score reproductions, zero contradictions.
  The 6 conditional predecessors not individually staged are recorded in
  §27.5 as optional validation breadth with the exact recipe, not open
  debt.
- **Final round (dispatched, shortened caps):** main → next census set
  `B_SCR_OP_JUMPIFSTAT`+`PLAYSTATCHANGEANIMATION` (5 effects, 45 weighted,
  entry 513's handoff) ∥ side → §24.5 recipe-only relay sites 5/6/7 (as
  many as fit).
- **Next:** verify final round, wind-down (deadline 15:28): animation-main
  fold check, final union verify, session summary.

---
## 514 — [BOUNDED WORKER 2026-07-27 ~13:35] §12.3 wiring landed: turn6-featherdance.json kickoff text sourced from kernel events, via a new opponent-target/two-sourceLabel bridge

- **State:** tree green at **252 files / 3446 tests** (+3 over session start
  252/3443 — 3 new `presentationEventWindowBridge.test.ts` cases only; no
  new test files), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers). Full `docs/presentation-seam-scout.md`
  §12.4 regression sweep run BEFORE this change (pristine `HEAD`, via `git
  stash`) matched every recorded count exactly (no pre-existing drift), then
  re-run AFTER byte-identically: `turn6-featherdance.json` 90/90 (twice, a
  determinism check), `turn6-rockslide-a.json` 255/255, `turn6-statfall.json`
  127/127, `turn6-feathers.json` 235/235, `turn6-menu.json` 44/44,
  `turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
  `turn4-doubleteam.json` 250/250.
- **Did:** executed §12.3's ordered wiring plan steps 1/2/5 (steps 3/4 named
  as out-of-this-trace's-scope prerequisites, not executed, exactly as the
  plan itself specified). (1) `presentationEventWindowBridge.ts` gained
  `resolveFeatherDanceKickoffPresentationWindowContent` — the first
  OPPONENT-target sibling to `resolveDoubleTeamKickoffPresentationWindowContent`,
  and the first to read from TWO `sourceLabel`s (`BattleScript_EffectStatDown`
  for the kickoff `message{STRINGID_USEDMOVE}` + ATK `stat-stage-change`
  pair, `BattleScript_StatDownPrintString` for the separately-labeled
  `STRINGID_DEFENDERSSTATFELL` message), returning `{message, statChange,
  statFellMessage}` (no `hp` field — this move deals no damage). (2)
  `turn6FeatherDancePresentationStaging.ts`'s own pre-wiring local extraction
  retired in favor of calling this bridge directly (same "stage the chain,
  call the shared bridge" shape entry 506/§11.5 established for turn 4);
  `resolveTurn6FeatherDanceKickoffLines` now reads `content.message.messageId`
  from the bridge instead of a hardcoded literal, closing the same doc/code
  gap class §11.5 closed. (3) `battleScene.ts`'s
  `drawTurn6FeatherDanceKickoffText` now draws a new
  `TURN6_FEATHERDANCE_KICKOFF_LINE1/2` constant (resolved once at module load)
  in its own FEATHERDANCE-text branch — every other part of that function
  (sprite choreography, stat-fall-banner gate, `atkFellStart` branch, ROCK_SLIDE
  handoff) and every OTHER turn's own repeat-FEATHER_DANCE call site (turns
  7/8/11) stayed byte-for-byte untouched, per the plan's own scope. **No
  literal died:** `TURN6_FEATHERDANCE_LINE1/2` and `TURN6_ATKFELL_LINE1/2`
  both stay defined and in active use elsewhere. **No mismatch found:** the
  two-`sourceLabel` bridge shape §12.2/§12.3 predicted fit the real staged
  event stream exactly, no rework needed.
- **Tests:** `presentationEventWindowBridge.test.ts` +3 cases (happy-path
  triad, plus 2 null-guard cases specifically exercising the new
  two-`sourceLabel` read). `turn6FeatherDancePresentationStaging.test.ts`'s
  final assertion updated to the bridge's return shape (mechanical, values
  byte-identical, test count unchanged).
- **Docs:** `docs/presentation-seam-scout.md` §12.5 completion note added,
  mirroring §11.5's format (what landed, what didn't die, acceptance
  numbers).
- **Next:** side lane's own next prep-scout pick (per the standing §8-§12
  cadence) — or, if this main lane continues the presentation-seam thread
  itself, §12.3 step 3 (the `TURN6_ATKFELL_LINE1/2` wiring) is now blocked on
  a real prerequisite: `resolveBattleStringLines`'s own straight-vs-curly
  apostrophe residual (§12.2) needs a charmap-aware post-process or a
  corrected `battle-message-templates.json` extraction FIRST, or wiring that
  line would regress the already-pixel-correct literal by one glyph — this
  trace's own 90/90 doesn't need it (out of captured range), so it wasn't
  fixed this pass.
- **Notes:** no PAPERCUT.

