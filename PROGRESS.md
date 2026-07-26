# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 465 — Presentation-seam window 3 wired: `turn5-rockslide.json` re-driven from the REAL MOVE_ENDEAVOR kernel chain (§9.4's own 6-rung plan, rung 1 done in entry 464)

- **State:** tree green at **220 files / 2656 tests** (+0 files/+2 tests
  over entry 464's 220/2654), build green (`tsc -b && vite build`).
  Ratchet unchanged (6/6, `executableFrontierRatchet.test.ts`) — no new
  opcode registrations, no production module imports a canonical
  recording. One commit this session.
  **Comparator (§9.5 re-pin, the acceptance bar):**
  `turn5-rockslide.json` **256/256**, run twice for determinism.
  Regression sweep, all unchanged: `turn5-faint.json` **110/110**,
  `turn1-rockslide.json` **256/256**, plus the full turn3-6
  `tools/compare/traces/` set — `turn3-rockslide` 256/256, `turn3-endeavor`
  192/192, `turn3-menu` 254/254, `turn4-rockslide` 250/250,
  `turn4-doubleteam` 250/250, `turn4-menu` 44/44, `turn6-menu` 44/44,
  `turn6-featherdance` 90/90, `turn6-rockslide-a` 255/255,
  `turn6-rockslide-b` 105/105, `turn6-feathers` 235/235, `turn6-statfall`
  127/127 — all full match, live this session.
- **Did:** executed `docs/presentation-seam-scout.md` §9.4's own ordered
  plan end to end (rung 1, opcode registration, was entry 464's own step):
  1. **Rung 2:** `turn5EndeavorPresentationStaging.ts` now stages the REAL
     `MOVE_ENDEAVOR` (id 283) through its own real entry label,
     `BattleScript_EffectEndeavor` — **not** the generic
     `BattleScript_HitFromAtkCanceler` every sibling staging module uses.
     Real finding, confirmed live by this module's own tests: ENDEAVOR's
     own `attackstring`/`ppreduce` execute directly under that top label
     (no intervening `BattleScript_HitFromAtkString` sub-label exists in
     this script), so their events' `provenance.sourceLabel` is
     `"BattleScript_EffectEndeavor"`, not the bridge's default. The
     trailing `goto BattleScript_HitFromAtkAnimation` DOES land on that
     real label, so `hp-change`'s sourceLabel stays default.
     `resolveRockSlidePresentationWindowContent` already accepted an
     `attackStringScriptLabel` override parameter for exactly this —
     passed explicitly, **zero bridge edits**. Onix settles 88→**1** for
     real (`setdamagetohealthdifference`'s own `target.hp - attacker.hp =
     87`), matching `anchorPlayerAfterTurn5Hp` exactly — reproduced by the
     real formula, not copied. Also discovered live: `bicbyte`
     unconditionally clears both effectiveness flags before
     `resultmessage` runs, so this chain's own event list is SHORTER than
     the old MOVE_STRENGTH substitute's (no `STRINGID_NOTVERYEFFECTIVE`) —
     confirmed by this module's own tests, not assumed. Added
     `resolveTurn5EndeavorAttackLines`/`resolveTurn5EndeavorHpEndpoints`
     (renamed from the substitute-era `resolveTurn5EndeavorKickoffLines`),
     mirroring window 2's `resolveTurn1RockSlideAttackLines`/
     `resolveTurn1RockSlideHpEndpoints` pattern per §9.4's own naming.
  2. **Rung 3:** wired `drawTurn5EndeavorText` (`battleScene.ts`) to source
     `onixHp`'s two endpoints and the kickoff text from rung 2's resolved
     constants (`TURN5_ENDEAVOR_HP`, `TURN5_ENDEAVOR_ATTACK_LINE1/2`)
     instead of the `anchorPlayerAfterTurn3Hp`/`anchorPlayerAfterTurn5Hp`/
     `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` literals — deleted
     `anchorPlayerAfterTurn5Hp` (single-use, now superseded exactly).
     `anchorPlayerAfterTurn3Hp`/`TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`
     themselves stay defined and in use — every turn 1-4 window's own call
     sites still read them directly, out of this step's scope.
  3. **Rung 4:** wired `drawTurn5RockSlideWindow`'s attack branch to the
     ALREADY-RESOLVED `TURN1_ROCKSLIDE_ATTACK_LINE1/2` (byte-identical
     text, window 2's own finding) instead of the raw `ROCK_SLIDE_LINE1`/
     `ROCK_SLIDE_LINE2` literals (which stay defined, used by every other
     turn's own ROCK_SLIDE window).
  4. **Rung 5:** wired `drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp`
     call (reached indirectly via the unconditional `drawTurn6FieldBase`,
     §9.1's own hidden-state finding) to a NEW `resolveTurn5FaintWindowKoHp()`
     export off `turn5FaintPresentationStaging.ts` — the SAME already-staged
     KO chain the fainted-branch window consumes, reused here as this
     window's own EARLIER consumption point, for its `to` endpoint only
     (0, Grovyle's real faint settle). Deleted `anchorOpponentAfterTurn5Hp`
     (single-use, superseded exactly). The `from` endpoint
     (`anchorOpponentAfterTurn4Hp`) stays a literal, **named as a residual
     gap per §9.4's own instruction**: that staged KO chain's own Grovyle
     precondition is ITSELF fed from that same literal, so reading it back
     out would be circular, not independent proof — genuinely still
     unstaged, not silently skipped.
  5. **Rung 6:** the comparator re-pin above.
- **Test:** `tests/turn5EndeavorPresentationStaging.test.ts` fully redone
  (8 tests) against the real chain — terminal HP (88→1), the shorter
  9-event kind list (no resultmessage event), both sourceLabels
  (`BattleScript_EffectEndeavor` for the message,
  `BattleScript_HitFromAtkAnimation` for hp-change), the resolved
  {from:88,to:1} endpoints, and "Foe GROVYLE used"/"ENDEAVOR!" (the real
  move name, not a substitute's). `tests/turn5FaintPresentationStaging.test.ts`
  +1 test pinning `resolveTurn5FaintWindowKoHp()` at 0.
- **Next:** seam-scout's own still-open items: turn 4's own
  `anchorOpponentAfterTurn4Hp` has no staged proof yet (the residual gap
  named above — needs a turn-4 RockSlide-settle staging module before it
  can be wired for real, not just fed back to itself), items 1/5 from §9's
  own list, ENDTURN_ABILITIES/ITEMS1/ITEMS2 breadth (pure-C), Nightmare/
  Curse/Thrash/Disable/Taunt end-turn bodies, every other still-
  `blocked-on-opcodes` census row (`B_SCR_OP_DMGTOLEVEL`,
  `PSYWAVEDAMAGEEFFECT`, `COUNTERDAMAGECALCULATOR`/`TYPECALC2`,
  `MIRRORCOATDAMAGECALCULATOR`, `STOCKPILETOBASEDAMAGE`, `SETBIDE`, ...),
  the 4 remaining CV-only factory-AI handlers (side lane's own next item
  per entry 463).
- **Notes:** stayed inside scope — no factory-AI files, no
  `docs/factory-ai-*.md`, no animation files, no opcode registrations
  beyond entry 464's own three, no other seam window. No PAPERCUT: every
  empirical prediction (event-kind list, sourceLabel values, HP endpoints)
  was verified by running the Tier-1 tests before wiring `battleScene.ts`,
  so no dev-loop friction cost real time this session.
- **Animation merge (same hour, supervisor-verified live):** CONFUSION
  window-2 OAM x-lag RAM-proven (28/29 + 17/18 ticks:
  `oamX(t) = x(t) + x2(t-1) + centerToCornerVecX(t)`, overturning the old
  thin-sample "no lag" claim) and fixed at -2 (OAM-shadow + capture lag),
  with monbg copy at -1 and a one-tick `targetTouched` shift. **CONFUSION
  108/140 → 137/140** (×2; supervisor-reproduced on the merged tree —
  same 3 boundary frames 119/147/176, honestly not promoted). Gates held:
  FUTURE_SIGHT 114/114, GROWTH 63/63 both, BIND 45/45 (×2 each).
- **Side merge (same hour, supervisor-verified, 13/13 live ×2):**
  `docs/endturn-abilities-items-ground-truth.md` — ENDTURN_ABILITIES has
  only 4 real cases (Rain Dish/Shed Skin/Speed Boost/Truant, all
  L50-reachable; 3 live-verified, Truant analytical); ITEMS1/2 fully
  enumerated recipe-only. Load-bearing: the 3 scripted ability cases use
  `BattleScriptPushCursorAndCallback`+`end3` — **`END3` is unregistered,
  a real architectural gap, not a trivial add**; ITEMS1/ITEMS2 are the
  same function differing in one bool (9 ungated hold effects fire on
  both — ITEMS2 exists to catch same-pass statuses). Merged tree
  re-verified: **220 files / 2659 tests + build green.**

