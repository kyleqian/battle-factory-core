# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **USER DIRECTIVE (2026-07-26, temporary):** the animation lane is paused to
> conserve tokens while the user evaluates splitting animation into its own
> supervisor/worktree. Next sessions run main + side lanes only; skip entry
> 468's animation "Next" items until this note is removed (they are deferred,
> not abandoned). See the matching note in SUPERVISOR.md.

---
## 477 — Sixth CBM-blocked pair ported: `AI_CBM_AccDown` + `AI_CV_AccuracyDown` (doc §19, largest handler in this doc — 7 `if_random_less_than` sites)

- **State:** tree green at **225 files / 2996 tests** (+0 files/+35 tests
  over entry 476's 225/2961), build green (`tsc -b && vite build`). Ratchets
  **unmoved**: `executableFrontierRatchet.test.ts` (no new opcode — this
  session only touches `factoryAiCheckBadMove.ts`/`factoryAiCheckViability.ts`/
  `factoryAiDecisionPolicy.ts`, none opcode-barrier-tracked) and
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin (106,
  unchanged). Doc's own verify script
  (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
  READ/RUN-only, untouched): **PASS ×2** (before touching source, and again
  at the end) — unaffected either way, as expected.
- **Did (four commits, all green):**
  1. **CBM port** — `AI_CBM_AccDown` (`data/battle_ai_scripts.s:300-312`):
     MIN_STAT_STAGE gate on the target's own ACC stage, then a genuine
     SECOND `get_ability AI_TARGET` draw site for `ABILITY_KEEN_EYE`
     (confirming the brief's own speculation live — the same two-draw-site
     shape `AI_CBM_AttackDown` already established for Hyper Cutter), then
     the shared `CheckIfAbilityBlocksStatChange` tail (Clear Body/White
     Smoke). Dispatches both `EFFECT_ACCURACY_DOWN` and the vestigial
     `EFFECT_ACCURACY_DOWN_2` (confirmed zero real moves in the generated
     move table, source-faithful dispatch anyway). `accStage` added to
     `FactoryAiCheckBadMoveTarget` as **optional** (default
     `DEFAULT_STAT_STAGE`), same precedent as `lastUsedMoveId` — no
     existing test literal needed touching.
  2. **CV port** — `AI_CV_AccuracyDown` (`:1198-1234`), the largest handler
     in this doc (7 draw sites): Gates A/B feed DRAW SITE 1 (either
     battler's own HP band, two independent routes); Gate C (opponent's own
     ACC stage `>4` skips) feeds DRAW SITE 2; Gates D/E/F/G (target
     toxic-poison/leech-seed/**opponent's own** rooted/target cursed) each
     independently gate their own draw site in a straight-line body — a
     genuine live finding beyond the doc's own gate-map prose: NONE of the
     six `score` statements after DRAW SITEs 1-6 is followed by a `goto`, so
     all six sites are evaluated regardless of any earlier gate's/draw's
     outcome (verified directly from the raw assembly, not assumed from the
     doc's summary). Then Gate H (opponent HP>70%) and Gate I (target's own
     ACC stage back at neutral) offer the tail's two clean stops before
     Gates J/K gate DRAW SITE 7 — whose roll polarity is the OPPOSITE of
     every other site in this handler (fallthrough applies the `-2`, the
     jump is the no-op). Widened `FactoryAiCheckViabilityBattler`/
     `FactoryAiScoredBattlerView` with four new **optional** status flags
     (`isToxicPoisoned`/`isLeechSeeded`/`isRooted`/`isCursed`, each
     defaulting `false`), cited to their exact `Cmd_if_not_status`/`2`/`3`
     source bits (`STATUS1_TOXIC_POISON` bit 7, `STATUS3_LEECHSEED` bit 2,
     `STATUS3_ROOTED` bit 10, `STATUS2_CURSED` bit 28) per the brief's own
     ask to reconcile against the C source.
  3. **Unit tests** — every gate × outcome × exact draw count for both
     handlers (CBM: MIN_STAT_STAGE short-circuit, Keen Eye single/known/
     ambiguous-two-ability shapes, Clear Body/White Smoke shared-tail
     shapes; CV: both real dispatch moves, Gates A/B's two routes, Gate C,
     Gates D-G proven NOT mutually exclusive — all four, then all five with
     Gate F, firing together in one pass — Gate H/I's two clean stops incl.
     Gate I's live doc §19.1/§19.2 finding that a target ACC stage already
     lowered by this SAME dispatch move this turn does NOT stop the tail,
     Gates J/K's deterministic `-2` with its documented real overlap
     against Gate A/B's own thresholds, and DRAW SITE 7's opposite
     polarity). The 5 structurally-unstageable sites (2-6, doc §19.5) get
     their coverage from the assembly's own semantics, exactly as the brief
     asked, since no single-turn HP/PP recipe can reach them live.
  4. **Engine reproduction** — doc §19.3/§19.4's twin fixture (Machamp,
     single-ability Guts, 4× Sand Attack vs. Anorith, single-ability Battle
     Armor) through the real `chooseFactoryAiScoredDecision` dispatcher,
     both seeds: reach (Machamp 69.7% HP, Anorith's own ACC stage already 5
     from this same dispatch move's own prior hit) draws exactly **8**
     check-viability draws (DRAW SITE 1 + DRAW SITE 7, 4 identical slots
     each) with zero CBM/TryToFaint draws, matching the doc's own
     `Cmd_if_random_less_than` **+8** attribution exactly; control (Machamp
     100% HP) draws deterministic **zero**. Reconciled against the doc's own
     17/7 full-window `Random()` totals: this policy's own scope (setup 4 +
     tie 1 + check-viability N) is 13/5, a documented SUBSET — `BattleTurnPassed`'s
     turn-order draw and both real moves' own `Cmd_accuracycheck`/
     `Cmd_seteffectwithchance` rolls happen outside the AI's own
     move-scoring function, same reconciliation shape entry 476's own
     `AI_CV_DefenseUp` reproduction already established.
- **Next:** pick up the next `AI_CV_*`/`AI_CBM_*` handler pair (this doc's
  own remaining phased body of work, ~79 effects still table-only per the
  audit's §3), or stage one of doc §19.5's 5 documented recipes (sites 2-6,
  each needs a genuine mixed-moveset AI *pick*, not this doc's
  "identical-4-slots" trick — DRAW SITE 2 is the cheapest, needing only the
  **player's** own real accuracy-lowering hits on the opponent, no opponent
  moveset change at all).
- **Notes:** stayed in scope — no other handler pair, no ENDTURN/status-
  cluster/fixed-damage/Counter files, no seam/animation files, doc + verify
  script read/run only (2 runs, PASS both times), no ROADMAP/ISSUES edits.
  No PAPERCUT — the doc's §19 citations (exact line numbers, the
  non-mutual-exclusivity of Gates D-G, DRAW SITE 7's reversed polarity, the
  exact status-flag source bits) were precise enough that every gate ported
  cleanly on first read and every unit test passed on first run.

---
## 476 — Both stat-UP CheckViability pairs ported: `AI_CBM_AttackUp`+`AI_CV_AttackUp` (doc §17, mandatory) and `AI_CBM_DefenseUp`+`AI_CV_DefenseUp`+`AI_CBM_BulkUp` (doc §18, stretch — landed)

- **Side merge (same round, supervisor-verified incl. C-source cites, green
  on the merged tree):** Counter/Mirror Coat retaliation-bookkeeping design
  scout banked (`docs/counter-retaliation-design.md`, branch
  `worker/side-20260726-142528`, merged) — the END3-precedent design step.
  Load-bearing findings (supervisor re-verified `SpecialStatusesClear` at
  `battle_util.c:658-663` and `TurnValuesCleanUp(FALSE)` at
  `battle_main.c:3040/3901`): `Cmd_datahpupdate` writes the SAME value into
  `gSpecialStatuses` (wiped after every action) and `gProtectStructs`
  (survives to the turn boundary) — Counter reads cross-action, so reusing
  the engine's `specialStatus.physicalDmg` would be wrong; four new flat
  fields + a turn clear in `mapFaintedActionsResult`'s no-fainted branch
  are the design. The missing turn clear is also a LATENT staleness bug for
  already-modeled ProtectStruct bits — filed as **ISSUES #46** with the
  §4 8-step registration checklist as the fix path. Merged tree: **225
  files / 2961 tests + build green.** (Supervisor process note: hit the
  known cwd-in-worktree self-merge trap once during this fold — caught
  immediately, no loss; the branch commit survived and merged cleanly from
  the main tree.)

- **State:** tree green at **225 files / 2961 tests** (+0 files/+45 tests
  over entry 475's 225/2916), build green (`tsc -b && vite build`). Ratchets
  **unmoved**: `executableFrontierRatchet.test.ts` (no new opcode — this
  session touches only `factoryAiCheckBadMove.ts`/`factoryAiCheckViability.ts`/
  `factoryAiDecisionPolicy.ts`, none opcode-barrier-tracked) and
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin (106,
  unchanged). Doc's own verify script
  (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
  READ/RUN-only, untouched): **PASS ×2** (before touching source, and again
  at the end) — unaffected either way, as expected.
- **Did (four commits, all green):**
  1. **Pair 1 port** — `AI_CBM_AttackUp` (`data/battle_ai_scripts.s:249-251`,
     bare 2-instruction `MAX_STAT_STAGE` gate on `AI_USER`'s own ATK stage,
     zero `get_ability`, no shared `CheckIfAbilityBlocksStatChange` tail —
     confirms the brief's documented asymmetry) + `AI_CV_AttackUp`
     (`:896-913`, 3 `if_random_less_than` sites, every gate/draw site reads
     `AI_USER`'s own state, `AI_TARGET` never read at all — a first for this
     doc's CBM-blocked pairs). Landed `AI_CBM_DefenseUp`/`AI_CBM_BulkUp` in
     the same commit since they're the identical trivial shape, ahead of
     pair 2. `runCheckBadMovePreamble` gained a required `attacker` param
     (`FactoryAiCheckBadMoveAttacker`, AI_USER's own atk/defStage) — no
     prior CBM handler needed the attacker's own state.
  2. **Pair 1 tests + reproduction** — every gate × outcome × draw count for
     CBM AttackUp/DefenseUp/BulkUp (incl. BulkUp's two independent gates in
     all 4 combinations) and CV AttackUp (incl. proving DRAW SITE 1 + DRAW
     SITE 3 combine while DRAW SITE 2 structurally never can). Engine
     reproduction of doc §17.3/§17.4's twin fixtures (Anorith all-Swords-Dance
     vs Machamp) through `chooseFactoryAiScoredDecision`, both seeds — reach
     draws exactly 4 (DRAW SITE 2, one per identical slot), control draws 0,
     matching the doc's live ledger exactly. Constructed Anorith's own ATK
     stage at 8 (not 6) to reflect its real turn-1 Swords Dance execution
     before the observed phantom decision (§17.2) — still <9, so Gate A
     stays correctly unreached.
  3. **Pair 2 port (stretch)** — `AI_CV_DefenseUp` (`:915-942`): Gates A/B/
     DRAW SITE 1/2 are `AttackUp`'s own shape (`STAT_DEF` for `STAT_ATK`);
     **Gate C is INVERTED** (`if_hp_less_than USER,70` routes into
     `DefenseUp4` — HP≥70% instead reaches an *extra* draw site whose own
     failure is the only clean stop, so HP==100% guarantees one more roll
     here vs a deterministic stop everywhere else in this doc); Gates E/F
     read the **TARGET's** last-used move's power/type (`get_last_used_bank_move
     AI_TARGET`) against a *larger* 9-type physical list than AttackDown's
     own 6-type one. `EFFECT_BULK_UP`'s CV side dispatches to this same
     handler (confirmed, doc §18.1). Threading: both
     `FactoryAiCheckViabilityBattler` and `FactoryAiScoredBattlerView` gained
     an **optional** `lastUsedMoveId` field defaulting to `MOVE_NONE` (0) —
     the real battle-start default (doc §18.2) — so zero pre-existing
     battler literals anywhere in the test suite needed touching.
  4. **Pair 2 tests + reproduction (stretch)** — Gate C's inversion in both
     directions, Gate D, and all three Gate E/F shapes (power==0,
     power!=0+physical, power!=0+non-physical) plus the omitted-field
     default. Engine reproduction of doc §18.3/§18.4's three fixtures
     (Anorith all-Harden vs Machamp, target's last move swapped across Vital
     Throw/Seismic Toss/Dragon Rage) — non-physical flip reproduces the
     doc's own live **0** draws exactly; physical fixtures reproduce **4**
     (see reconciliation below, not the doc's raw 5-6).
- **Draw-count reconciliation (§18, per the brief's explicit ask):** this
  port's branch-by-branch derivation from the *same* cited assembly (§18.1)
  is unambiguous — 4 identical `MOVE_HARDEN` slots, each independently and
  deterministically reaching Gate E (power≠0) → Gate F (physical-list type)
  → DRAW SITE 4 exactly once (no loop, no conditional redraw possible within
  one slot's evaluation) — so the handler's own contribution is **exactly
  4**, not the doc's raw **5-6** (seed 1 / seed 99). The doc's own §18.4
  already flags this as an anomaly it could not explain ("did not
  single-step the flagged frame to find the extra 1-2 draws' source"),
  distinct from every other handler in this doc, which all show the clean
  "N identical slots × 1 draw" pattern. Reconciled: this port's logic is
  provably correct against the cited assembly (verified by the reproduction
  test above); the doc's extra 1-2 draws must come from something outside
  `AI_CV_DefenseUp`'s own body that its own session never isolated — left
  exactly as open as the doc left it, not silently resolved either way. The
  **non-physical** fixture's **0** matches the doc's own live number
  exactly, so only the physical-branch *count* (not its presence/absence
  shape) is in question.
- **Next:** `AI_CV_DefenseUp`'s own DRAW SITE 1 (Gate A, needs opponent DEF
  stage already built to 9-11 — a 2-turn recipe, same unstaged status as
  `AttackUp`'s own DRAW SITE 1) and the genuine-empty-`gLastMoves` case
  (observationally identical to a real 0-power last move, doc §18.2) remain
  analytical-only, unchanged from the doc. A future session could
  single-step the flagged extra-draw discrepancy above with
  `tools/run-mgba-probe.py`, or pick up the next CBM-blocked pair from
  `docs/factory-ai-checkviability-ground-truth.md` §19 (`AI_CBM_AccDown` +
  `AI_CV_AccuracyDown`, ground truth already banked, 2 of 7 draw sites
  live-verified, 5 recipe-only).
- **Notes:** stayed in scope — no other handler pair, no ENDTURN/END3/
  status-cluster/fixed-damage src touched, no seam/animation files, doc +
  verify script read/run only (2 runs, PASS both times), no ROADMAP/ISSUES
  edits. No PAPERCUT — the doc's §17/§18 citations (exact line numbers,
  gate ordering, the Gate C inversion, the physical-type table contents)
  were precise enough that every gate ported cleanly on first read; the one
  real surprise was catching my own first-draft doc comment overstating
  which draw sites can combine (Gate B's DRAW SITE 2 can never combine with
  DRAW SITE 3, since Gate B's own HP==100% precondition forces Gate C true
  immediately after) — caught by re-deriving from the assembly before
  writing tests, not left in.

---
## 475 — ENDTURN_ABILITIES slices 2-3 (Shed Skin + Truant) + ITEMS1 slice 5 (Liechi/Salac/Petaya) wired; census SETEFFECTPRIMARY blind spot fixed (ISSUES #45 closed)

- **Side merge (same round, supervisor-verified ALL PASS live from the
  worktree + green on the merged tree):** doc **§19 `AI_CBM_AccDown` +
  `AI_CV_AccuracyDown`** ground truth banked (branch
  `worker/side-20260726-135458`, merged, worktree removed) — the largest
  pair by draw sites (7). Gate map re-derived from assembly; CBM carries an
  extra `ABILITY_KEEN_EYE` gate beyond the shared tail (confirmed live);
  `EFFECT_ACCURACY_DOWN_2` is vestigial (zero real moves). Single-turn
  twin fixtures land DRAW SITES 1+7 together (Sand Attack's own ACC-down
  defeats Gate I's still-default check): reach 17, control 7, both seeds
  ×2, +8 delta = 4 slots × 2 sites, all `Cmd_if_random_less_than`. New
  confound found + designed out: the dispatch move's ACC-down vs the
  target's accuracy-checked damage move ordering (faster species takes the
  damage role). Sites 2-6 remain citation-backed recipes (§19.5, need
  mixed movesets). 20-fixture verify script ALL PASS ×2 (worker) + once by
  the supervisor. Merged tree: **225 files / 2916 tests + build green.**

- **State:** tree green at **225 files / 2916 tests** (+0 files/+11 tests over
  entry 474's 225/2905 — no new test files, existing suites widened), build
  green (`tsc -b && vite build`). Ratchet (`executableFrontierRatchet.test.ts`):
  **unmoved** — no new opcode registered this session, only real dispatch
  wiring inside already-registered opcodes (STATBUFFCHANGE, REMOVEITEM,
  PRINTFROMTABLE table widened) plus a census-side classification fix.
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin: **unmoved**
  (106, same as entry 474 — no opcode ids added).
- **Did (two commits, both green):**
  1. **Rung 1 — Shed Skin** (`battle_util.c:2620-2641`): `(Random() % 3) == 0`
     drawn via `drawBattleScriptRng` attributed to `BattleScript_
     ShedSkinActivates`'s own entry instruction (same C-side-draw convention
     `battleScriptAttackCancelerOpcode.ts:328` established). 0 draws with no
     status; 1 draw every tick with `status1 & STATUS1_ANY` regardless of
     hit/miss (doc §4). On hit: unconditional `status1 = 0` (multi-bit
     clear, not masked) + `STATUS2_NIGHTMARE` glitch clear + party mirror,
     script queued via the existing END3 push-cursor-and-callback primitive.
  2. **Rung 2 — Truant** (`battle_util.c:2653-2655`): reused the
     `truantCounter` field already modeled in `BattleScriptRulesContext`
     (`battleScriptActionAdmission.ts`'s truant admission phase already read
     it; end-turn never toggled it until now — confirmed by grep before
     writing). Bare XOR toggle (`gBattlerAttacker == battler` at this point,
     `battle_util.c:1471`), no script, no `effect++` — `runAbilitiesTick`
     returns `"advance"`, letting the SAME `runDoBattlerEndTurnEffects` call
     fall through to `ENDTURN_ITEMS1` for the same battler in the same tick
     (pinned by a same-tick Leftovers-heals-alongside-the-toggle test).
  3. **Rung 3 — stretch berries** (`battle_util.c:3429-3451`, items.h
     holdEffectParam=4 for all three): Liechi/Salac/Petaya's `hp <=
     floor(maxHP/4)` fire condition, `+1` stat stage via
     `BattleScript_BerryStatRaiseEnd2` (opcode-driven `Cmd_statbuffchange`
     reading a C-side-staged `statChanger` scratch field, `SET_STATCHANGER`
     encoding — NOT pre-mutated like Speed Boost), consumption via the
     already-registered REMOVEITEM inside the script. Extended
     `gStatUpStringIds`' printfromtable table with indices 3-4
     (`STRINGID_EMPTYSTRING3`/`STRINGID_USINGITEMSTATOFPKMNROSE`) so
     `B_MSG_STAT_ROSE_ITEM` resolves instead of barriering.
  4. **Rung 4 — census fix (ISSUES #45):** `classifySetMoveEffectDispatch`
     now intercepts `B_SCR_OP_SETEFFECTPRIMARY` the same way it already
     handled `SETEFFECTWITHCHANCE` (both call the same `applySetMoveEffect`;
     the preceding `setmoveeffect X` statement stages the same pendingEffect
     for either dispatcher, so the existing mnemonic-based tracking needed
     no new plumbing). Added `jumpifability` value-coverage: registered
     opcode, but the handler unconditionally barriers outside its widened
     4-value set (`LIQUID_OOZE`/`IMMUNITY`/`LIMBER`/`OWN_TEMPO`, exported as
     `JUMPIFABILITY_SUPPORTED_ABILITY_NAMES`). Fixing SETEFFECTPRIMARY's
     classification surfaced a real pre-existing gap: `SET_MOVE_EFFECT_
     SUPPORTED_BYTES` never included `MOVE_EFFECT_SLEEP`/`TOXIC` even though
     entry 473 registered both as real switch cases — fixed the Set (+
     census's own name table), retiring the now-dead `SETMOVEEFFECT_
     NAMED_BARRIER` special case.
- **Census before -> after:** effects **93 -> 90/214** (net −3, fully
  accounted: `EFFECT_RAGE`/`EFFECT_MEAN_LOOK`/`EFFECT_NIGHTMARE`/
  `EFFECT_WILL_O_WISP` flip executable→blocked, −4, ISSUES #45's own named
  false positives; `EFFECT_POISON_FANG` flips blocked→executable, +1, a
  genuine correctness fix once via the shared seteffectwithchance tail).
  Moves **190 -> 185/355** (−5), Factory-L50 unweighted **152 -> 148/276**
  (−4), weighted **1846 -> 1830/2957** (−16) — every delta matches the five
  flipped rows' own move/factory/weight counts exactly (worked out by hand,
  not asserted blind). Self-checks: **32/32 pass** (+4 new
  `requireBlockedMentioning` pins for the four false positives). ISSUES #45
  deleted in the same commit.
- **Next:** `ENDTURN_ABILITIES` barrier set is now empty — all four real
  switch cases (Rain Dish/Speed Boost/Shed Skin/Truant) are wired; nothing
  remains barriered in `runAbilitiesTick`. `ENDTURN_ITEMS1`'s remaining
  barriers are RESTORE_HP/RESTORE_PP (their own real HP/PP gates, need a
  heal-amount/PP-bonus holdEffectParam lookup) and the 9 zero-Factory-carrier
  hold effects (§2b) — both explicitly out of this session's scope.
  `ENDTURN_ITEMS2` remains unregistered (unchanged finding, per brief).
  Doc's own out-of-scope items carried forward unchanged: Counter/Mirror
  Coat data-model prerequisite (entry 474), Follow-Me/double-battle redirect.
- **Notes:** stayed in scope — no factory-AI files, no status-cluster/
  fixed-damage src beyond the census script, no seam/animation files,
  ground-truth docs and verify scripts read/run only (untouched), no
  ROADMAP edits. `docs/end3-design.md`/`docs/endturn-abilities-items-
  ground-truth.md` read-only, exactly as scoped. No PAPERCUT — both docs'
  own citations (line numbers, exact struct/macro shapes) were precise
  enough that every rung wired cleanly on the first source read; the one
  real surprise (`SET_MOVE_EFFECT_SUPPORTED_BYTES` missing SLEEP/TOXIC) was
  a genuine pre-existing gap the rung 4 fix correctly surfaced and closed,
  not a papercut.


