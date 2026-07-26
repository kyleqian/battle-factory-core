# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 468 — [SUPERVISOR WIND-DOWN 2026-07-26 ~05:30] session summary

- **State:** tree committed and green at **221 files / 2733 tests**, build
  green, census **79/214 effects, 163/355 moves, 128/276 Factory-L50**
  (session start: 76→79 came mid-session; true session start was 73/214,
  152/355, 118/276; all 25 census self-checks pass), single main worktree,
  zero unmerged branches, zero stale worktrees. **No DEFERRED entries —
  nothing blocks the next `run-supervisor.sh`.** No usage/rate limits all
  session (one worker died to an API connection drop mid-response, salvaged
  and relaunched cleanly — not a limit).
- **Session (~20 workers over 3 lanes, every outcome supervisor-verified
  live; 1 API-drop failure salvaged via scratchpad + relaunch):**
  - **Main (7 steps):** player-side forced-switch full-turn variant (461,
    entry 459's remainder — the `player-choice-required` fork is now a real
    decision boundary); Ingrain/Leech Seed/Wrap registered (462, census
    +3 effects/+8 moves, 18/18 live verify, two hit-chain barriers
    genuinely retired); Factory-AI CheckViability handler bodies ported
    4-for-4 against banked fixtures — SpeedDown CBM+CV pair (463),
    Pursuit + HighCrit (466), AlwaysHit (467), each with real
    assembly-quirk corrections pinned (HighCrit's 1-or-2-draw cascade,
    AlwaysHit's ScoreUp1 fallthrough); EFFECT_ENDEAVOR registered (464,
    3 opcodes + 2 required widenings, census +3 effects/+3 moves);
    presentation-seam window 3 wired (465, `turn5-rockslide.json` 256/256
    ×2 from the real MOVE_ENDEAVOR kernel chain, 14-trace sweep clean,
    2 RAM-dump literals deleted).
  - **Side (7 steps, all merged):** `addbyte`/`jumpifbytenotequal` widened
    onto the shared SETBYTE universe (runtime weather-form loop executable);
    CheckViability scout with two supervisor-re-verified audit corrections
    (no "trivial 0-if_random" handlers exist; CBM blocks 17/22 CV handlers
    — only 5 are CV-only-portable); seam window 3 prep-scout (§9);
    CV fixtures for Pursuit/HighCrit (§11), AlwaysHit (§12, the salvaged
    relaunch), VitalThrow (§13, Battle-Armor crit-block design + §11.4
    polarity correction) — **all 5 CV-only handlers now have banked live
    ground truth, 8-fixture verify script ALL PASS ×2**; ENDTURN
    abilities/items ground truth (only 4 real ability cases; END3
    named as a real architectural gap, ITEMS1/2 recipe-banked).
  - **Animation (6 steps, all merged):** defect A KILLED in three
    instrument-first rungs — window-bounds hypothesis refuted (OAM
    byte-identical), real mechanism found (`objMode=1` hardware 50/50
    alpha blend, formula verified 26/26 pixels via a new DISPCNT-OBJ-off
    underlayer probe), fix landed → **MOVE_FUTURE_SIGHT promoted
    `exact` 114/114**; CONFUSION's OAM-shadow x-lag RAM-proven and fixed
    (108→137/140); **MOVE_PSYCHIC ported** (byte-identical script shape,
    137/140 first run); family window-1 boundary tick fixed (both
    CONFUSION and PSYCHIC now **138/140**), window-2 splice hypothesis
    tested and honestly refuted — a genuinely separate defect class.
    Coverage: **22 exact / 6 partial**.
- **Next (in order):** main — port `AI_CV_VitalThrow` (fixtures banked
  §13); CBM+CV pairs for the blocked 17 (AttackDown first — unblocks the
  original Growl fixtures); `END3` registration (architectural, needs its
  own design look) then ENDTURN_ABILITIES's 3 scripted cases;
  ENDTURN_ITEMS1/2 registration off the banked recipes; remaining
  blocked-on-opcodes census rows (DMGTOLEVEL, PSYWAVE, COUNTER/TYPECALC2,
  MIRRORCOAT, STOCKPILE, SETBIDE...). Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap (needs a turn-4 settle staging
  module, currently circular), seam-scout §9 items 1/5. Animation — the
  window-2 splice defect class (CONFUSION/PSYCHIC each 138/140, shared
  2-frame remainder, banked instrument evidence); PSYCHIC opposite
  orientation; next component track from `npm run animation:coverage`.
- **Notes:** PAPERCUTS +1 (raw before/after RNG-window diffs, Hits: 3).
  Supervisor process lessons recorded in memory: run worktree merges from
  the main tree only; never run suite/merges in the main tree while a
  main-lane worker is live; the launcher's "unauthenticated/sandboxed"
  trailer can misdiagnose an API drop (check spend/duration first);
  API-drop salvage via scratchpad-copy + relaunch brief worked cleanly.

---
## 467 — Fourth CheckViability handler body ported: AI_CV_AlwaysHit, against the just-banked §12.1 fixtures (entry 466's side-merged item)

- **State:** tree green at **221 files / 2731 tests** (+0 files/+24 tests
  over entry 466's merged 221/2707), build green (`tsc -b && vite build`).
  Ratchet unchanged (6/6 `executableFrontierRatchet.test.ts` — CV's
  `unsupported-branch` results stay plain tagged returns, not the
  `unsupportedBranch(...)` helper that ratchet tracks). One commit
  (`9e951cc`), green. `tools/probe/verify-factory-ai-checkviability-ground-truth.ts`
  rerun live against the oracle, twice (once before touching source to
  confirm the side lane's banked fixtures still held, once after the port):
  **ALL PASS** both times (all 6 §11/§12 fixtures unchanged — confirms the
  fixtures bank independent of this port, since the verify script asserts
  oracle-only draw counts, not engine output).
- **Did:** ported `AI_CV_AlwaysHit` (`data/battle_ai_scripts.s:1075-1089`,
  doc §11.3/§12.1) into `factoryAiCheckViability.ts`, same
  dispatch-before-barrier shape §463/466 established. Two stat-stage gate
  pairs — `if_stat_level_more_than TARGET EVASION 10` / `if_stat_level_less_than
  USER ACC 2` (jump to `ScoreUp1`) and `..._more_than TARGET EVASION 8` /
  `..._less_than USER ACC 4` (jump to `AlwaysHit2` directly) — both funnel
  into the same `if_random_less_than 100` roll. **New finding beyond the
  doc's own §11.3 inline gloss**, found by direct read of `Cmd_score`
  (`battle_ai_script_commands.c:703-711`: adds to score, advances the
  script pointer by a fixed 2 bytes, no jump at all): `AI_CV_AlwaysHit_ScoreUp1`'s
  `score +1` does **not** terminate the script — there's no `goto` after
  it, so execution falls straight through into the `AI_CV_AlwaysHit2:`
  label immediately below, i.e. into the SAME `if_random_less_than 100`
  roll the second gate pair reaches. The doc's own "evasion 11-12 or user
  acc 0-1 -> deterministic +1, 0 draws" comment undercounts this branch —
  reaching `ScoreUp1` still burns exactly one draw and scores +1 (roll <
  100) or +2 (roll >= 100), never a zero-draw deterministic +1. This does
  **not** touch the doc's own live §12.1 fixture evidence (unaffected,
  still correct): the banked fixtures' target evasion only ever reaches
  9/10 (the second gate pair, `AlwaysHit2` direct), never >10, so the
  `ScoreUp1` fallthrough is real but unexercised by either banked fixture —
  same shape as entry 466's own HighCrit cascade-fallthrough finding
  (assembly quirk confirmed by direct source read, not by fighting the
  doc's fixture numbers). Dispatches on `EFFECT_ALWAYS_HIT` only (unlike
  HighCrit's 3 triggering effects).
  1. **Plumbing:** `FactoryAiCheckViabilityBattler` gained `evasionStage`/
     `accStage` (both sides carried, entry 466's own `isFirstTurn`
     both-sides-symmetry convention — only AI_TARGET's evasion and
     AI_USER's own acc are ever read). `FactoryAiScoredBattlerView.statStages`
     widened with `acc`/`evasion` alongside the existing `atk/def/spAtk/
     spDef/speed`, wired through `chooseFactoryAiScoredDecision`'s
     `runCheckViability` call site for both attacker and target.
- **Test:** every gate x both roll outcomes x exact draw counts (18 new
  tests in `tests/factoryAiCheckViability.test.ts`, 55 total): neither gate
  true (0 draws/score), each of the 4 individual gates reaching
  `AlwaysHit2` directly (both roll outcomes, 1 draw, score 0 or +1), and
  the `ScoreUp1` fallthrough finding itself explicitly pinned for both
  gate-1/gate-2 triggers x both roll outcomes (1 draw, score +1 or +2, NOT
  0 draws/deterministic +1) — the new-finding coverage the brief's
  "count every gate yourself" instruction was aimed at. Engine-side
  reproduction of both banked §12.1 fixtures through
  `chooseFactoryAiScoredDecision` (6 new tests in
  `tests/factoryAiScoredDecision.test.ts`, 28 total) at both banked seeds
  (1, 99): reach fixture's real turn-4 decision (target evasion stage 9)
  and phantom turn-5 decision (stage 10) each reproduce exactly 4
  policy-own check-viability draws (one per identical MOVE_SWIFT slot,
  matching entry 466's own AlwaysHit "N identical slots draw N times"
  precedent, not the fixtures' own 44/44 WINDOW totals which also include
  setup/tie draws and 3 unreachable turns' own decisions); splash-control
  fixture (target evasion neutral, stage 6) reproduces exactly 0
  check-viability draws across both seeds, matching the doc's own
  "neither AlwaysHit gate is ever true" finding — all six reproduction
  tests assert the chosen move stays `MOVE_SWIFT` (all 4 slots identical,
  same "no pick ambiguity" design as Pursuit/HighCrit's own fixtures).
- **Next:** `AI_CV_VitalThrow` remains the one still-unstaged handler from
  the brief's original 4-handler slice (doc §11.4/§12.2's own recipe: needs
  real Gen-3 damage-formula arithmetic to land the opponent in a
  comfortable <40%-remaining HP band, explicitly flagged as its own
  separately-budgeted session). Any CBM-blocked handler (17 of 22 reachable
  `AI_CV_*`) needs its paired `AI_CBM_*` ported too, not just the CV side.
  `END3` registration remains a named architectural gap blocking
  ENDTURN_ABILITIES's 3 scripted cases. Turn 4's own
  `anchorOpponentAfterTurn4Hp` staging gap and seam-scout §9 items 1/5
  remain open from entry 465.
- **Notes:** stayed inside scope — no `AI_CV_VitalThrow`, no CBM-blocked
  handler, no ENDTURN registration, no `docs/factory-ai-checkviability-ground-truth.md`
  or verify-script edits (side lane's own files this hour, already carried
  the AlwaysHit fixtures + verify-script scenarios from its prior-session
  merge — this step only reran the script, never edited it), no
  seam/animation files. No discrepancy with §12's live fixture evidence to
  report — the one correction found (`ScoreUp1`'s fallthrough) is a gap in
  §11.3's own descriptive prose, not in §12.1's banked oracle numbers, and
  doesn't touch either fixture's reachable branch. No PAPERCUT this
  session — the source-read-first discipline (checking `Cmd_score`'s real
  semantics before trusting the doc's inline comment) paid off cleanly
  within the time budget.

---
## 466 — Two more CheckViability handler bodies ported: AI_CV_Pursuit + AI_CV_HighCrit, both CV-only per §10 (entry 465's carried item)

- **State:** tree green at **220 files / 2694 tests** (+0 files/+35 tests
  over entry 465's merged 220/2659), build green (`tsc -b && vite build`).
  Ratchet unchanged (6/6 `executableFrontierRatchet.test.ts` — same as
  entry 463, CV's `unsupported-branch` results are plain tagged returns,
  not the `unsupportedBranch(...)` helper that ratchet tracks). Four
  commits (`07a5f6a` port, `3242f88` dead-code removal, `fda0564` unit
  tests, `64d5aae` engine-side fixture reproduction), all green.
  `tools/probe/verify-factory-ai-checkviability-ground-truth.ts` rerun
  live against the oracle, twice: **ALL PASS** both times (all 4 §11
  fixtures + the 2 §6 SpeedDown fixtures, all seeds/counts unchanged —
  confirms the fixtures still bank, independent of this port).
- **Did:** ported both of the doc's §11-staged CV-only handlers into
  `factoryAiCheckViability.ts`, same dispatch-before-barrier shape §463
  established for SpeedDown.
  1. **`AI_CV_Pursuit`** (`data/battle_ai_scripts.s:2018-2036`, doc §11.1):
     `is_first_turn_for AI_USER` gates on the OPPONENT's own elapsed-turns
     counter (2/1/0 across turns 1/2/3+, unrelated to Pursuit's real
     switch-punish purpose); once clear, tests the target's own two type
     slots against Ghost/Psychic (hardcoded, not a real type-effectiveness
     read), then one `if_random_less_than 128` roll (+1 or nothing).
     Dispatches on `EFFECT_PURSUIT`.
  2. **`AI_CV_HighCrit`** (`:1449-1461`, doc §11.2): reused
     `Cmd_if_type_effectiveness`'s real STAB (`applyStab`) + truncating
     type-multiply (`applyTypeEffectiveness`) pipeline — the SAME
     functions the hit chain and `factoryAiTryToFaint.ts`'s
     `isQuadrupleEffective` already use — plus its 4 magic-number remaps
     (120/240/30/15 → x2/x4/x0.5/x0.25). New finding beyond the doc's own
     §11.2 write-up, confirmed by direct source read of the real assembly
     layout: the neutral/immune "no explicit match" fallthrough doesn't
     land on a *shared* single roll — it falls through SEQUENTIALLY into
     the first `if_random_less_than 128`, and NOT jumping from that one
     (roll >= 128) drops straight into `AI_CV_HighCrit2`'s own second
     `if_random_less_than 128` immediately after (no gap in the assembly).
     So the "other" bucket burns ONE draw (first roll < 128) or TWO
     (first roll >= 128, cascading into the second), not a fixed count —
     ported and unit-tested for all three shapes (1-draw jump, 2-draw
     jump, 2-draw fallthrough+bonus). Dispatches on
     `EFFECT_HIGH_CRITICAL`/`EFFECT_BLAZE_KICK`/`EFFECT_POISON_TAIL` (all
     3 §11.2-named triggering effects). Deliberately did **not** port
     `Cmd_if_type_effectiveness`'s own Levitate+Ground short-circuit
     (unlike its `factoryAiTryToFaint.ts` sibling): all 10 real
     HighCrit-triggering moves are Fighting/Grass/Water/Normal/Flying/
     Fire/Poison-typed, never Ground, so that branch is structurally
     unreachable for this specific handler — carried it initially, then
     removed it once the unreachability was confirmed (a live, deliberate
     simplification per AGENTS.md's own anti-overengineering guidance, not
     an oversight; also collapsed a since-unneeded
     `FactoryAiCheckViabilityTarget` type back into
     `FactoryAiCheckViabilityBattler`).
  3. **Plumbing:** `FactoryAiCheckViabilityBattler`/`FactoryAiScoredBattlerView`
     gained `types` (both sides) and `isFirstTurn` (attacker-meaningful
     only, target's copy unread) — no `ability` field added (HighCrit
     needed it only for the since-removed Levitate branch).
- **Test:** every branch of both handlers via `runCheckViability` directly
  (25 new tests in `tests/factoryAiCheckViability.test.ts`, 37 total):
  Pursuit's turn-1/turn-2 deterministic-zero (even against a matching
  type), turn-3+ against a non-matching type, all 4 `if_equal` sites
  (type1==GHOST/PSYCHIC, type2==GHOST/PSYCHIC) reaching the roll, both
  roll outcomes; HighCrit's x0.25/x0.5 via both direct match and the STAB
  remap, x2/x4 via both direct match and the STAB remap with both roll
  outcomes on the direct-match branch, the neutral/immune cascade's three
  draw-count/outcome shapes plus 0x routing through the same path, all 3
  dispatching effects, both pass-through barriers. Engine-side
  reproduction of all 4 banked §11 fixtures through
  `chooseFactoryAiScoredDecision` (10 new tests in
  `tests/factoryAiScoredDecision.test.ts`), at both banked seeds (1, 99):
  Pursuit's real triggering effect has no CBM table entry (unlike entry
  463's Growl/AttackDown confound), so the real all-4-slots-identical
  moveset reproduces directly with no control-move substitution needed —
  reach=4/control=0 check-viability draws (each of the 4 identical slots
  independently reaches or misses the roll, matching this file's own
  pre-existing "degenerate fixture" precedent: N identical slots draw N
  times, not once); HighCrit resisted=0 (deterministic), neutral=6 at
  both banked seeds (live-computed and pinned exact, not guessed — ranges
  4-8 per the cascade above, cross-seed-identical here but not asserted
  invariant in general, matching the doc's own §11.2 cross-seed-wobble
  finding structurally rather than chasing its window-total numbers, per
  the brief's own instruction). Along the way, discovered and corrected
  an invalid assumption that 4 identical move slots always score a clean
  tie — `AI_TryToFaint`'s own per-slot `simulatedRng` damage-estimate
  variance breaks that unless every slot's `canFaint` branch fires
  uniformly (e.g. a 5-HP target, this file's pre-existing degenerate-Surf
  fixture); the new tests assert the submitted move ID instead of a
  specific tied slot set.
- **Next:** `AI_CV_AlwaysHit`/`AI_CV_VitalThrow` (side lane's own item this
  hour per the brief — analytical-only recipes already banked in doc §11.3/
  §11.4, not staged or ported here). Any CBM-blocked handler (17 of 22
  reachable `AI_CV_*`) needs its paired `AI_CBM_*` ported too, not just the
  CV side. `END3` registration remains a named architectural gap (entry
  465's own side-merge finding) blocking ENDTURN_ABILITIES's 3 scripted
  cases. Also still open from entry 465: turn 4's own
  `anchorOpponentAfterTurn4Hp` staging gap, items 1/5 from seam-scout §9,
  every other still-`blocked-on-opcodes` census row.
- **Notes:** stayed inside scope — no `AI_CV_AlwaysHit`/`AI_CV_VitalThrow`,
  no CBM-blocked handler, no ENDTURN registration, no
  `docs/factory-ai-checkviability-ground-truth.md` or verify-script edits
  (side lane's own files this hour), no seam/animation files. No PAPERCUT:
  the multi-slot draw-count investigation (confirming each of 4 identical
  moveset slots independently re-executes the handler, not a single shared
  evaluation) cost real reading time in `battle_ai_script_commands.c`
  (`BattleAI_DoAIProcessing`/`ChooseMoveOrAction_Singles`) before writing
  any engine-side test, but resolved cleanly within scope — worth flagging
  for a future porter: this file's own pre-existing "degenerate fixture
  (all 4 slots Surf)" test is the load-bearing precedent, not something to
  re-derive from scratch.
- **Side merge (same hour, supervisor-verified ALL PASS live on the merged
  tree):** `AI_CV_AlwaysHit` fully staged and validated — the salvaged
  twin fixtures from an API-dropped earlier attempt (drafts preserved via
  scratchpad, worktree relaunched) held up: 44/44 and 36/36 draws, seeds
  1/99, ×2 each; the +8 delta attributed EXCLUSIVELY to
  `Cmd_if_random_less_than` via the (kept) window-override probe patch —
  the cleanest per-caller evidence in the fixture set. New mechanism
  documented in doc §12: a reachable branch's draw cost scales with the
  number of identical dispatch-triggering slots (2 decisions × 4 Swift
  slots = 8), not flat-per-decision. VitalThrow not attempted; §12.2
  confirms §11.4's recipe as the accurate pickup point.
- **Animation merge (same hour, supervisor-reproduced live at 137/140):**
  MOVE_PSYCHIC ported and staged — byte-identical script shape to
  CONFUSION (three argv literals differ: tint RGB(31,23,0), shake amp 5,
  scale delta -6), every probe age matching CONFUSION's constants; dense
  comparator **137/140** ×2 with the 3 mismatches at the SAME relative
  ages (38/66/95) as CONFUSION's banked remainder — one shared
  creation/tail-boundary defect across the family, a single-fix promotion
  target. Gates held ×2 (FUTURE_SIGHT 114/114, CONFUSION 137/140, GROWTH
  63/63 both, BIND 45/45). Coverage: PSYCHIC `partial`. Merged tree:
  **221 files / 2707 tests + build green.**

