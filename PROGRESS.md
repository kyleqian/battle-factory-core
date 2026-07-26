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
## 478 — Seventh + eighth CBM-blocked pairs ported: `AI_CBM_SpeedUp`+`AI_CV_SpeedUp` (doc §20, mandatory) and `AI_CBM_SpAtkUp`+`AI_CV_SpAtkUp` (doc §21, expected)

- **State:** tree green at **225 files / 3032 tests** (+0 files/+36 tests
  over entry 477's 225/2996), build green (`tsc -b && vite build`). Ratchets
  **unmoved**: `executableFrontierRatchet.test.ts` (no new opcode — this
  session only touches `factoryAiCheckBadMove.ts`/`factoryAiCheckViability.ts`/
  `factoryAiDecisionPolicy.ts`, none opcode-barrier-tracked) and
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin (106,
  unchanged). Doc's own verify script
  (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
  READ/RUN-only, untouched): **PASS ×2** against the live oracle (before
  touching source, and again at the end) — unaffected either way, as
  expected; both new pairs' fixtures reproduce the doc's own §20.3/§21.3
  live ledgers exactly (SpeedUp 10/10 reach vs 6/6 control; SpAtkUp 10/10 vs
  8/8, both cross-seed-stable).
- **Did (one commit, green):**
  1. **`AI_CBM_SpeedUp`/`AI_CBM_SpAtkUp` port** (`data/battle_ai_scripts.s:
     257-259`/`:261-263`): bare 2-instruction `MAX_STAT_STAGE` gates on
     `AI_USER`'s own SPEED/SPATK stage, byte-for-byte the same shape as
     `AI_CBM_AttackUp`/`AI_CBM_DefenseUp` (entry 476) with the stat swapped
     in. `FactoryAiCheckBadMoveAttacker` gained two new **optional**
     `speedStage`/`spAtkStage` fields defaulting to `DEFAULT_STAT_STAGE` —
     same "optional, so no pre-existing literal needs touching" precedent
     entry 477's `accStage` established, chosen over entry 476's own
     required-field precedent because this type's existing two fields
     (`atkStage`/`defStage`) were required only because the type was brand
     new at the time; widening it further without defaults would have
     forced every AttackUp/DefenseUp/BulkUp test literal to add two
     irrelevant fields.
  2. **`AI_CV_SpeedUp` port** (`:956-965`, doc §20.1): the SAME
     `if_target_faster` gate + `GetWhoStrikesFirst` tie-break machinery
     `AI_CV_SpeedDown` (§6) already ports — doc §20.1's own finding that
     this pair's true structural sibling is SpeedDown, not AttackUp/
     DefenseUp, confirmed by re-deriving the assembly independently rather
     than assumed. Only the fallthrough score differs (+3 vs SpeedDown's
     own +2); the deterministic branch's -3 is identical in both.
  3. **`AI_CV_SpAtkUp` port** (`:967-983`, doc §21.1): byte-for-byte
     `AI_CV_AttackUp`'s own gate topology (§17.1) with `STAT_SPATK` for
     `STAT_ATK`, **except DRAW SITE 3's threshold is 70, not AttackUp's own
     40** (doc §21.1's own citation-level correction against a naive
     "same shape as a sibling" copy — a numeric-operand trap, not a branch-
     direction one). Factored the shared gate topology into a new
     `runCvAttackStyleStatUp` helper (parameterized by the draw-kind labels
     and DRAW SITE 3's threshold) and refactored `runCvAttackUp` to call it
     with threshold 40 — same "shared body, per-caller parameter" precedent
     `runCvStatDown` already established for DefenseDown/SpDefDown (entry
     475), chosen here because SpAtkUp's topology match to AttackUp is
     total (unlike AttackUp/DefenseUp's own genuine Gate C divergence,
     which is why THOSE two stayed separate functions). AttackUp's own
     pre-existing unit/reproduction tests passed unchanged after the
     refactor, confirming no behavior drift.
  4. **Wiring + tests**: `FactoryAiCheckViabilityBattler` gained an
     **optional** `spAtkStage` field (same default convention). Unit tests
     cover every gate × outcome × draw count for both CBM handlers (MAX_
     STAT_STAGE fired/not-fired/omitted-defaults-to-neutral) and both CV
     handlers (SpeedUp: Gate A both branches, DRAW SITE 1 both outcomes,
     the speed-tie burn; SpAtkUp: Gates A/B/D, DRAW SITE 1/2/3 incl. the
     corrected threshold's own succeed/skip split at the SAME seed values
     AttackUp's own tests use — proving the two sites are NOT
     interchangeable rather than assuming it). Engine reproduction of doc
     §20.3's twin fixtures (species-role-swap Crobat/Shuckle, both
     single-ability, all 4 slots `MOVE_AGILITY` vs `MOVE_SPLASH`, post-
     turn-1 SPEED stage 8 constructed directly per this file's own
     "construct the decisive state" precedent) and §21.3's twin fixtures
     (Anorith/Machamp, `MOVE_GROWTH`, reused verbatim from entry 476's own
     AttackUp block) through `chooseFactoryAiScoredDecision`, both seeds:
     reach draws exactly **4** check-viability draws for both pairs
     (matching the doc's own live +4 `Cmd_if_random_less_than` attribution
     exactly), control draws deterministic **zero** for both — no CBM/
     TryToFaint draws in either fixture (both target species single-
     ability, closing the doc §20.2/§14.2 ability-guess confound).
- **Next:** pick up `AI_CBM_SpDefUp`/`AI_CBM_CosmicPower`/`AI_CBM_CalmMind`
  (unstaged per entry 477's own groundwork flag — separate handlers at
  `data/battle_ai_scripts.s:576-593`, Gate F's `if_in_bytes` is INVERTED vs
  DefenseUp's own) or the next unstaged CV-only/CBM-blocked pair from
  `docs/factory-ai-checkviability-ground-truth.md`'s remaining phased body
  of work. Carried forward, unchanged from prior entries: LightScreen/
  Reflect/EvasionUp/EvasionDown/weather-trio handler pairs (not yet staged);
  Counter/Mirror Coat retaliation-bookkeeping registration per
  `docs/counter-retaliation-design.md` §4's 8-step checklist + **ISSUES
  #46** (the latent turn-boundary staleness bug); `ENDTURN_ITEMS2`'s own
  Yawn/Thrash prerequisite (unregistered, entry 475's own finding); doc
  §19.5's 5 unstaged draw-site recipes (sites 2-6, DRAW SITE 2 is the
  cheapest — needs only the player's own real accuracy-lowering hits, no
  opponent moveset change); entry 476's own flagged §18 5-6-draw window
  discrepancy (this port's own branch-by-branch derivation says `AI_CV_
  DefenseUp`'s physical-route contribution is exactly 4, not the doc's raw
  5/6 — still unreconciled, needs a `tools/run-mgba-probe.py` single-step).
  This was this session's own final bounded worker step (40-minute cap) —
  landing here at a clean, small, fully-green resting point rather than
  reaching for extra scope.
- **Notes:** stayed in scope — no other handler pair (SpDefUp/CosmicPower/
  CalmMind correctly left unstaged), no ENDTURN/status-cluster/fixed-damage/
  Counter files, no seam/animation files, doc + verify script read/run only
  (2 runs against the live oracle, PASS both times), no ROADMAP/ISSUES
  edits. No PAPERCUT — doc §20/§21's own citations (exact line numbers, the
  SpeedDown-not-AttackUp sibling correction, the DRAW SITE 3 threshold
  correction) were precise enough that every gate ported cleanly on first
  read and every unit/reproduction test passed on first run; the
  `runCvAttackUp`/`runCvStatDown` refactor precedent-matching was the only
  design decision that took real thought, not a source-reading surprise.

---
## 477 — Sixth CBM-blocked pair ported: `AI_CBM_AccDown` + `AI_CV_AccuracyDown` (doc §19, largest handler in this doc — 7 `if_random_less_than` sites)

- **Side merge (same round, supervisor-verified ALL PASS live from the
  worktree + green on the merged tree):** doc **§20 `AI_CBM_SpeedUp` +
  `AI_CV_SpeedUp`** and **§21 `AI_CBM_SpAtkUp` + `AI_CV_SpAtkUp`** ground
  truth banked (branch `worker/side-20260726-145534`, merged, worktree
  removed). SpeedUp's true sibling is SpeedDown §6 (relative-Speed gate,
  species-role swap: Crobat/Shuckle) not the HP-band pairs; SpAtkUp is
  AttackUp's shape with DRAW SITE 3's constant 70 vs 40 (citation-level
  correction to a naive copy). **Doc-wide confound catch:** CBM's
  UNCONDITIONAL Soundproof-check prologue (`:47-58`) draws `get_ability`
  for ANY dual-ability species independent of handler bodies — single-
  ability species now a hard fixture rule (§20.4). Ledgers: SpeedUp 10/10
  reach vs 6/6 control; SpAtkUp 10/10 vs 8/8; clean +4 attributions.
  SpDefUp stretch not staged; groundwork flagged: separate
  `AI_CBM_CosmicPower`/`AI_CBM_CalmMind` handlers (`:576-593`) and Gate F
  `if_in_bytes` INVERTED vs DefenseUp's — the next scout's trap list.
  24-fixture verify script ALL PASS ×2 (worker) + once by the supervisor.
  Merged tree: **225 files / 2996 tests + build green.**

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


