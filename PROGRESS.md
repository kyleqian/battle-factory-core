# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 464 — EFFECT_ENDEAVOR registered: SETDAMAGETOHEALTHDIFFERENCE/BICBYTE/ADJUSTSETDAMAGE (entry 463's side-merge blocker, seam-scout §9.2)

- **State:** tree green at **220 files / 2654 tests** (+0 files/+20 tests
  over entry 463's merged 220/2634), build green. Ratchet:
  `battleScriptHitChainOpcode.ts` 23→24 (one new named barrier — see below);
  `battleScriptIngrainLeechSeedWrapOpcode.ts` stays pinned at 3 (widened, not
  narrowed — same single COPYARRAY call site now accepts a second tuple).
  Three commits (`4758e8c` registration+tests, `0dbdd73` census), all green.
  Census live-regenerated: **76/214→79/214 effects, 160/355→163/355 moves,
  125/276→128/276 F-L50 unweighted, 1567→1573 weighted** (25/25 self-checks
  pass, `docs/executable-frontier-census.md`).
- **Did:** ported the seam-scout doc's own three named opcodes
  (`docs/presentation-seam-scout.md` §9.2), then followed where the full
  script actually led (two more real gaps surfaced only by running
  `BattleScript_EffectEndeavor` end to end — not guessed in advance):
  1. **`Cmd_setdamagetohealthdifference`** (`battle_script_commands.c:9366-9377`,
     `battleScriptHitChainOpcode.ts`): source-complete, zero barriers.
     `gBattleMoveDamage = target.hp - attacker.hp`; fails (jumps to
     `BattleScript_ButItFailed`) when `attacker.hp >= target.hp`.
  2. **`Cmd_bicbyte`** (`:3889-3894`, new `createBattleScriptBicbyteCommandHandlers`
     in `battleScriptSetByte.ts`): all 11 concrete call sites share one
     pointer (`gMoveResultFlags`) and one of three literal masks — every one
     resolves, so this registers **source-completely** via registration-time
     validation (a hard `throw`, not a runtime barrier), the same style
     `Cmd_setbyte`'s own registration already uses. Zero rejected.
  3. **`Cmd_adjustsetdamage`** (`:5861-5899`, `battleScriptHitChainOpcode.ts`):
     the False Swipe/Endure clamp family, ported like the existing
     `adjustnormaldamageOpcodeHandler` minus its random multiplier. One new
     named (b) barrier — `HOLD_EFFECT_FOCUS_BAND`, the exact same
     `gSpecialStatuses[].focusBanded` gap `adjustnormaldamage` already
     carries, duplicated onto this sibling opcode (a distinct call site, so
     +1 to the file's pinned count, not a narrowing).
  4. **Two more real gaps, found only by driving the full script, both
     closed:** `jumpifmovehadnoeffect`'s own `MOVE_RESULT_NO_EFFECT`
     comparand (a `jumpifbyte` macro expansion) was outside the shared
     SETBYTE value universe — added (`battleScriptSetByte.ts`), which also
     resolves 8 *other* pre-existing call sites for free (AbsorbUpdateHp,
     DreamEaterWorked, DoMultiHit, EffectOHKO, EffectParalyze, FuryCutterHit,
     ...). `Cmd_copyarray` (`battleScriptIngrainLeechSeedWrapOpcode.ts`) was
     narrowed to only `LeechSeedTurnDrain`'s own
     `gBattleMoveDamage<-gHpDealt` tuple — widened to also accept Endeavor's
     own reverse pair (`gHpDealt<-gBattleMoveDamage` right after
     `setdamagetohealthdifference`, then `gBattleMoveDamage<-gHpDealt` again
     after typecalc/bicbyte): Endeavor stashes its set-damage across
     typecalc's own STAB/type-effectiveness multiply, then restores it
     unmodified — a real source mechanism this widening surfaces, not a
     special case. Barrier count for that file is unchanged (still one
     COPYARRAY call site, now a wider accept-tuple check).
- **Ground truth (live, this session):** `bin/oracle lab
  tools/battle-lab/mechanic-endeavor-{success,fail}.json` (new, checked in),
  Diglett (85hp) vs Chansey (325hp) at Level 50, both attacker directions.
  Success: target settles at the attacker's own HP (325→85), attacker
  unchanged; exactly **2 RNG draws total** (accuracycheck +
  seteffectwithchance, both pre-existing opcodes — zero from the three new
  ones, confirmed both by the live run and by reading all three C functions:
  none contain a `Random()` call on any implemented branch). Fail: HP
  unchanged on both sides. The fail branch's own RNG delta was **not**
  cleanly isolable live (a Chansey-as-AI-opponent turn burns Factory-AI
  scoring RNG unrelated to Endeavor's own script — that subsystem's own
  session-scoped complexity is out of this step's scope) — pinned instead by
  direct source read (zero `Random(` calls on the fail path) plus the
  live-confirmed zero HP change either side.
- **Test:** Tier-1 lifecycle coverage in `tests/battleScriptHitChainOpcode.test.ts`
  (success/boundary/fail for setdamagetohealthdifference; plain-pass-through/
  False-Swipe/Endure/non-lethal/Focus-Band-barrier for adjustsetdamage; two
  full-script runs from `BattleScript_EffectEndeavor` reproducing the live
  ground truth exactly, success and fail) and `tests/battleScriptSetByte.test.ts`
  (BICBYTE's pinned 11-start/3-mask universe, AND-NOT semantics on every
  concrete start, all-set/none-set edges, registration-time rejection).
  Updated `tests/battleScriptJumpifbyteOpcode.test.ts`'s own barrier test
  (its old example value, MOVE_RESULT_MISSED, now resolves — moved to
  MOVE_RESULT_FOE_ENDURED, still genuinely unmodeled) and
  `tests/battleScriptIngrainLeechSeedWrapOpcode.test.ts` (new test pinning
  COPYARRAY's widened reverse tuple). `tests/battleScriptRulesContext.test.ts`'s
  composition-count test updated 92→95 handlers.
- **Next:** `turn5EndeavorPresentationStaging.ts` (seam-scout's own unwired
  staging module) can now be redone with the **real** `MOVE_ENDEAVOR` chain
  instead of its `MOVE_STRENGTH` substitute — seam-scout §9.4 items 2-3 are
  the wiring worker's own next step (not this one): swap the substitute,
  wire `drawTurn5EndeavorText`'s HP endpoints and kickoff text to the real
  chain's `hp-change`/`message` events. `battleScene.ts` itself is untouched
  by this step, as scoped. Also open: the seam-scout's own items 1/4/5 (turn
  4's `anchorOpponentAfterTurn4Hp` still has no staged proof) and every
  other still-`blocked-on-opcodes` census row (`B_SCR_OP_DMGTOLEVEL`,
  `PSYWAVEDAMAGEEFFECT`, `COUNTERDAMAGECALCULATOR`/`TYPECALC2`,
  `MIRRORCOATDAMAGECALCULATOR`, `STOCKPILETOBASEDAMAGE`, `SETBIDE`, ...).
- **Notes:** stayed inside scope — no `battleScene.ts`/presentation wiring,
  no factory-AI files, no animation files, no ENDTURN breadth. The two
  extra widenings (§9.2's own three opcodes were not sufficient by
  themselves — `jumpifbyte`'s `MOVE_RESULT_NO_EFFECT` and `copyarray`'s
  reverse tuple were both genuinely required for the brief's own acceptance
  bar, "EFFECT_ENDEAVOR's script reaches end") are named above, not silently
  folded in. PAPERCUT: the fail-branch RNG-draw-count ask cost real
  investigation time before concluding Factory-AI scoring noise (a separate,
  out-of-scope subsystem) pollutes any live two-sided-AI RNG diff — worth a
  standing note for future ground-truth scouts: isolate RNG claims to
  player-side actions, or diff against a same-AI-role control run, not a
  raw before/after delta (now a PAPERCUTS.md entry, Hits: 3).
- **Side merge (same hour, supervisor-verified, verify script ALL PASS
  live):** CV-only handler fixtures scout landed — `AI_CV_Pursuit` and
  `AI_CV_HighCrit` fully staged (4 new battle-lab fixtures, twin-fixture
  single-precondition-flip design, all-slots-identical dispatch move),
  `AI_CV_AlwaysHit`/`AI_CV_VitalThrow` banked as analytical entries with
  exact staging recipes (doc §11). Verify script extended with a
  draw-count scenario shape; HighCrit's reachable-branch fixture has a
  documented 23-vs-24 cross-seed draw-count wobble (phantom next-turn
  decision, HP-sensitive) — individually reproducible, flagged as porter
  guidance. Merged tree re-verified green (220/2654).

