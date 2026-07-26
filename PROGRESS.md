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
## 476 — Both stat-UP CheckViability pairs ported: `AI_CBM_AttackUp`+`AI_CV_AttackUp` (doc §17, mandatory) and `AI_CBM_DefenseUp`+`AI_CV_DefenseUp`+`AI_CBM_BulkUp` (doc §18, stretch — landed)

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

---
## 474 — Fixed-damage + TYPECALC2 cluster registered: EFFECT_LEVEL_DAMAGE/EFFECT_PSYWAVE/EFFECT_BRICK_BREAK all executable (`docs/fixed-damage-cluster-ground-truth.md`'s (a)-portable subset, fully executed this session; Counter/Mirror Coat stay blocked per the doc's own data-model finding)

- **Side merge (same round, supervisor-verified ALL PASS live from the
  worktree + green on the merged tree):** doc **§18 `AI_CBM_DefenseUp` +
  `AI_CV_DefenseUp`** ground truth banked (branch `worker/side-20260726-132350`,
  merged, worktree removed) — bodies re-parsed from raw assembly incl.
  `AI_CBM_BulkUp` (:581-584, trivial); **prose premise falsified live**:
  DefenseUp's Gate C is INVERTED vs AttackUp's (`if_hp_less_than USER,70` —
  HP==100% guarantees an extra draw rather than a clean stop). Last-used-move
  dependency solved without a 2-turn trace: `gLastMoves` resets to
  MOVE_NONE whose power==0 shares Gate E's code path with a real 0-power
  move, and `MOVEEND_UPDATE_LAST_MOVES` sets the player's move before the
  same window's phantom decision — so a fixed-damage player move both sets
  the HP band AND the last-move gate. 3 fixtures (Vital Throw/Seismic
  Toss/Dragon Rage flip), both seeds ×2; the physical-route fixtures show a
  0-vs-6/5 `Cmd_if_random_less_than` presence/absence flip (NOT the usual
  4-per-slot pattern — flagged honestly for the porter, not guessed).
  DRAW SITE 1 (2-turn stat build) and the genuine-empty-history case remain
  recipe-only, stated explicitly. 18-fixture verify script ALL PASS ×2
  (worker) + once by the supervisor. Merged tree: **225 files / 2905 tests
  + build green.**

- **State:** tree green at **225 files / 2905 tests** (+0 files/+22 tests
  over entry 473's 225/2883 — widened `battleScriptHitChainOpcode.test.ts`
  and `battleScriptScreensWeatherOrchestration.test.ts` in place, no new
  test files), build green (`tsc -b && vite build`). Ratchet: **unmoved**
  (`battleScriptHitChainOpcode.ts` barrier count still 22) — all four
  opcodes are genuinely (a)-portable, no new `unsupportedBranch` introduced;
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin moved
  **102 -> 106** (4 new opcode ids: 74 TYPECALC2, 159 DMGTOLEVEL, 160
  PSYWAVEDAMAGEEFFECT, 238 REMOVELIGHTSCREENREFLECT), named and updated.
  Verify script (`tools/probe/verify-fixed-damage-cluster-ground-truth.ts`,
  oracle-only, READ/RUN only): **PASS x2** (before touching source, and
  again at the end) — unaffected either way, as expected.
- **Did:** registered the doc's (a)-portable subset (§7 summary table),
  all four opcodes live-verified/source-cited in the doc:
  1. `battleScriptHitChainOpcode.ts`: `Cmd_dmgtolevel` (2-line port,
     `battleMoveDamage = attacker.level`, zero RNG) and
     `Cmd_psywavedamageeffect` (rejection-sampling `while ((draw =
     Random()%16) > 10)` loop via `drawBattleScriptRng` in a real `do/while`,
     then `level*(draw*10+50)/100`) registered next to the existing
     `typecalcOpcodeHandler`. `Cmd_typecalc2` also registered there: read
     the real source (`battle_script_commands.c:4500-4593`) side by side
     with the already-registered `typecalc` to confirm the doc's divergence
     claims firsthand — no STAB, and the type-effectiveness loop only ORs
     bits into a *local* `flags` u8 (never calls `ModulateDmgByType`, never
     touches `gBattleMoveDamage`), so this opcode never scales damage, only
     gates DOESNT_AFFECT_FOE/Wonder-Guard-MISSED. Wonder Guard's own check
     reads that local `flags`, not the real `moveResultFlags` — pinned with
     a test proving a stale `SUPER_EFFECTIVE` bit left over from the real
     `typecalc` call moments earlier does NOT save a Wonder Guard target
     this call finds neutral.
  2. `battleScriptSetSideStatusOpcode.ts`: `Cmd_removelightscreenreflect`
     (Brick Break's sole call site) registered beside the existing
     SETREFLECT/SETLIGHTSCREEN/SETSAFEGUARD/SETMIST setters, reusing their
     exact `sideStatuses`/`sideTimers` fields. Clears the *opposing* side's
     Reflect/Light Screen (bit + timer) when either is active, writes
     `animTurn`/`animTargetsHit` (1/1 on clear, 0/0 otherwise) on both
     branches, per source.
  3. Walked `BattleScript_EffectLevelDamage`/`EffectPsywave`/
     `EffectBrickBreak` from their literal entries — every opcode along
     each path was already registered generically (`attackcanceler`,
     `accuracycheck`, `attackstring`, `ppreduce`, `typecalc`, `bicbyte`,
     `adjustsetdamage`, `critcalc`, `damagecalc`, `adjustnormaldamage`,
     `jumpifbyte`, `attackanimation`, `waitanimation`, `printstring`,
     `waitmessage`, `effectivenesssound`, `hitanimation`, `waitstate`,
     `healthbarupdate`, `datahpupdate`, `critmessage`, `resultmessage`,
     `seteffectwithchance`, `tryfaintmon`) or newly registered this session
     — no new barriers anywhere in this cluster's reachable set.
- **Doc premise falsified (verified against source, not assumed):** the
  scout doc's §4 called the "wall shattered" print
  (`STRINGID_THEWALLSHATTERED`) "doubles-only... dead in L50 singles (max
  value 1, branch guards on `>= 2`)". This misses that `Cmd_attackanimation`
  (`battle_script_commands.c:1786/1789`) *also* increments
  `gBattleScripting.animTurn`/`.animTargetsHit` by 1 on its own success
  path, running *between* `removelightscreenreflect` and the second
  `jumpifbyte CMP_LESS_THAN, sB_ANIM_TURN, 2`. So a screens-up hit reaches
  animTurn 1 (from the clear) -> 2 (from attackanimation), and the guard
  *does* fire — the print is reachable in singles whenever Brick Break
  actually shatters a screen. Confirmed live: an integration test running
  the real committed script (screens-up vs screens-down, both through
  controller-ack/scheduler-progress driving) shows the message event firing
  only in the screens-up case, matching this corrected reading. This also
  means `removelightscreenreflect`'s `animTurn` write is not purely
  presentational as the doc framed it — it also gates a real
  `bicbyte gMoveResultFlags, MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE`
  branch (clearing a stale Levitate-immunity miss flag whenever a screen
  breaks). Both already-generic opcodes (`jumpifbyte`/`bicbyte`) handle this
  correctly once `removelightscreenreflect`'s write is correct — no extra
  registration work was needed, just the doc's own rationale was overstated.
- **Test:** `battleScriptHitChainOpcode.test.ts` (+30 tests): dmgtolevel/
  psywavedamageeffect/typecalc2 unit coverage (draw-count-pinned RNG
  sequences computed against this engine's own LCG, not the oracle's —
  independently verifies the same rejection-sampling algorithm the doc's
  live ledger exercises) + full-script integration for Seismic Toss and
  both single-draw/multi-draw Psywave cases through
  `BattleScript_HitFromAtkAnimation`. `battleScriptScreensWeatherOrchestration.test.ts`
  (+21 tests incl. new helpers): removelightscreenreflect unit coverage
  (clears both/one/neither, targets the opposing side not the attacker's
  own) + the screens-up/screens-down Brick Break integration described
  above, walking through `BattleScript_BrickBreakDoHit` and 6 more opcodes
  into `datahpupdate`, confirming HP actually drops (proving the
  typecalc-then-typecalc2 double-call shape resolves end to end).
- **Census:** `npx tsx tools/report/executable-frontier-census.ts` —
  **effects 90 -> 93/214** (+3, exactly as predicted), **moves 186 ->
  190/355** (+4: Seismic Toss + Night Shade + Psywave + Brick Break),
  **Factory-L50 unweighted 148 -> 152/276** (+4), **weighted 1788 ->
  1846/2957** (+58, exactly matching the doc's own prediction: LEVEL_DAMAGE
  weight 10 + PSYWAVE weight 2 + BRICK_BREAK weight 46). `EFFECT_COUNTER`/
  `EFFECT_MIRROR_COAT` correctly remain `blocked-on-opcodes` — untouched,
  per brief. All 28 ground-truth validation checks still pass (no new
  false-positive class found this session, unlike entry 473's).
- **Next:** **Counter/Mirror Coat prerequisite restated** (the brief's own
  explicit out-of-scope item, not attempted): registering
  `COUNTERDAMAGECALCULATOR`/`MIRRORCOATDAMAGECALCULATOR` needs two
  data-model additions first, not just opcode dispatch — (1)
  `gProtectStructs[].physicalBattlerId`/`.specialBattlerId` have no home in
  `BattleScriptSpecialStatus`/`BattleScriptRulesBattlerBase` (only
  `physicalDmg`/`specialDmg` are tracked today), so a registered opcode
  would have nothing correct to read for retaliation-target selection; (2)
  the per-turn `TurnValuesCleanUp(FALSE)` `ProtectStruct`-wide clear
  (`battle_main.c:4857-4874`) is unmodeled, so without it a stale
  `physicalDmg`/`physicalBattlerId` from an old turn could arm a
  retaliation forever. Both belong to whichever step lands
  `COUNTERDAMAGECALCULATOR`, not bolted on separately. Otherwise: doc's own
  out-of-scope Follow-Me/double-battle redirect branch (§6, structurally
  unreachable at L50 singles); the census's still-open `SETEFFECTPRIMARY`
  dispatch-classification blind spot (entry 473's finding, not re-touched).
- **Notes:** stayed in scope — no Counter/Mirror Coat data-model work, no
  factory-AI files, no ENDTURN/END3 files, no status-cluster src files
  (status-cluster's own registration from entry 473 coexists cleanly;
  `applySetMoveEffect` untouched, as scoped), no seam/animation files,
  `docs/fixed-damage-cluster-ground-truth.md` and its verify script
  read/run only (untouched), no ROADMAP/ISSUES edits. No PAPERCUT — the
  scout doc's source citations were precise enough that every opcode
  registered cleanly; the one real surprise (attackanimation's own
  animTurn increment making "wall shattered" reachable in singles) came
  from reading the C source directly, which the brief explicitly asked for
  ("verify each claim against the C source yourself").

