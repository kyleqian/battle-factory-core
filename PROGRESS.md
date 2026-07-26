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
## 474 — Fixed-damage + TYPECALC2 cluster registered: EFFECT_LEVEL_DAMAGE/EFFECT_PSYWAVE/EFFECT_BRICK_BREAK all executable (`docs/fixed-damage-cluster-ground-truth.md`'s (a)-portable subset, fully executed this session; Counter/Mirror Coat stay blocked per the doc's own data-model finding)

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

---
## 473 — Primary status-move opcode cluster registered: EFFECT_SLEEP/TOXIC/POISON/PARALYZE/CONFUSE all executable (doc's own scout finding, `docs/status-cluster-ground-truth.md`, fully executed this session)

- **Side merge (same round, supervisor-verified PASS live from the worktree
  + green on the merged tree):** fixed-damage + TYPECALC2 cluster prep-scout
  banked (branch `worker/side-20260726-124734`, merged, worktree removed) —
  `docs/fixed-damage-cluster-ground-truth.md` +
  `tools/probe/verify-fixed-damage-cluster-ground-truth.ts` (PASS ×2 worker
  + once by the supervisor) + Seismic Toss/Psywave/Counter fixtures.
  Ledgers: Seismic Toss dealt == level exactly; Psywave formula
  `level*(draw*10+50)/100` pinned across seeds; Counter 2× retaliation +
  status-move failure case. **Decisive census-class correction:**
  Counter/Mirror Coat's real blockers are DATA-MODEL gaps —
  `gProtectStructs[].physicalBattlerId`/`specialBattlerId` have no home in
  `BattleScriptRulesContext` (supervisor-verified by grep) and the per-turn
  `TurnValuesCleanUp(FALSE)` ProtectStruct clear is unmodeled
  (`battle_main.c:4857-4874`) — registering the opcodes without them would
  arm stale retaliation forever. TYPECALC2 is a pure immunity gate (no
  STAB, no scaling) so Brick Break is the cheap consumer. DMGTOLEVEL/
  PSYWAVE/TYPECALC2/REMOVELIGHTSCREENREFLECT all (a)-portable now.
  Supervisor also filed **ISSUES #45** (census false positives
  RAGE/MEAN_LOOK/NIGHTMARE/WILL_O_WISP per this entry's own accounting).
  Merged tree: **225 files / 2883 tests + build green.**

- **State:** tree green at **225 files / 2883 tests** (+1 file/+30 tests
  over entry 472's 224/2853 — 1 new production module
  `battleScriptStatusPrimaryOpcode.ts` + 1 new test file), build green
  (`tsc -b && vite build`). Ratchet: `battleScriptHitChainOpcode.ts`'s
  barrier count moved **24 -> 22** (SLEEP/TOXIC's own barriers retired for
  real, now live switch cases); new module
  `battleScriptStatusPrimaryOpcode.ts` pinned at **3** barriers (malformed
  jumpifstatus/jumpiftype/jumpifsideaffecting operands — none reachable via
  any real committed call site today, all covered). Both moves named in
  `tests/executableFrontierRatchet.test.ts`. Verify script
  (`tools/probe/verify-status-cluster-ground-truth.ts`, oracle-only, READ/RUN
  only): **PASS x2** (before touching source, and again at the end) —
  unaffected by the engine change either way, as expected.
- **Did:** registered the doc's full blocker set per its own (a)/(b)
  classification, all portable:
  1. `battleScriptHitChainOpcode.ts`: `applySetMoveEffect` gained a real
     `primary: boolean` parameter (was `certain` only). The Shield-Dust/
     Safeguard generic early-outs now correctly gate on `!primary` (dead on
     the primary path, matching source `:2253-2259` — this cluster's own
     Safeguard block is each script's own `jumpifsideaffecting`, which
     already ran before `seteffectprimary`). `MOVE_EFFECT_SLEEP`/
     `MOVE_EFFECT_TOXIC`'s old `unsupportedBranch` barriers deleted; both
     are now real switch cases: SLEEP ports the Uproar-loop +
     Insomnia/Vital-Spirit recheck (dead on this cluster's real topology
     per the doc, ported anyway for `SetMoveEffect` fidelity, matching
     every other family-A case) and writes `(Random() & 3) + 2` as the raw
     status1 turn count (not a fixed OR'd bit, per `STATUS1_SLEEP_TURN`);
     TOXIC mirrors POISON's Immunity/type-immunity gates then writes
     `STATUS1_TOXIC_POISON`. `Cmd_seteffectprimary` registered as a thin
     wrapper (`SetMoveEffect(TRUE, 0)`) reading `rulesContext.moveEffectByte`
     directly (already populated by the generic `setbyte cEFFECT_CHOOSER`
     opcode). Added the `gUproarAwakeStringIds` table to `printfromtable`'s
     registered set so `BattleScript_CantMakeAsleep`'s own message resolves
     instead of barriering.
  2. New file `battleScriptStatusPrimaryOpcode.ts`: `Cmd_jumpifstatus`
     (STATUS1_SLEEP/POISON/BURN/FREEZE/PARALYSIS/TOXIC_POISON/ANY, plus
     arbitrary `|`-combinations — covers all 21 concrete call sites in the
     committed program, not just this cluster's 5), `Cmd_jumpiftype`
     (all 18 real TYPE_* tokens via the existing `isBattlerOfType` helper),
     `Cmd_jumpifsideaffecting` (SIDE_STATUS_SAFEGUARD, the one concrete
     value all 10 call sites use), `Cmd_jumpifcantmakeasleep` (+
     `UproarWakeUpCheck`'s bounded battler loop, reusing the pattern
     already ported in `battleScriptActionAdmission.ts:1344-1357` — zero
     narrowing needed, all 3 concrete call sites are the same shape).
  3. `battleScriptIngrainLeechSeedWrapOpcode.ts`: `Cmd_jumpifability`
     widened from LIQUID_OOZE-only to a 4-value map (+ IMMUNITY/LIMBER/
     OWN_TEMPO) — the scout's decisive finding, not named in the original
     supervisor opcode list but required for 4 of the 5 effects.
  4. `battleScriptStatbuffchangeOpcode.ts`: `JUMPIFSTATUS2_VALUES` widened
     with `STATUS2_CONFUSION` (EFFECT_CONFUSE's own already-confused check).
  5. Walked each of the five scripts' full topology from its literal entry —
     every branch is now (a)-complete; no new silent barriers introduced in
     this cluster's own reachable set.
- **Test:** new `tests/battleScriptStatusPrimaryOpcode.test.ts` (29 tests):
  unit coverage for all 4 new jump opcodes (jump/no-jump/unsupported-branch
  each, direct handler invocation since no real committed instruction
  reaches an out-of-scope operand value), plus full-committed-script
  integration runs for all 5 effects from their literal `BattleScript_Effect*`
  entry: Thunder Wave (status1 == STATUS1_PARALYSIS, exactly 1 RNG draw,
  matching the doc's live ledger), Sleep Powder (status1 == (Random()&3)+2,
  exactly 2 draws), Toxic/Poison (status1 == STATUS1_TOXIC_POISON/POISON),
  Confuse Ray (status2 CONFUSION counter 2-5, 2 draws) — plus per-effect
  ability-immunity blocks (Limber/Immunity/Own Tempo, each confirmed at the
  *script's own* `jumpifability` gate, `BattleScript_LimberProtected` etc.,
  not `SetMoveEffect`'s internal recheck, which stays dead code on this
  path as the doc predicted), Safeguard block (after the accuracy roll),
  already-statused early-outs, and Toxic-vs-Poison-type redirect
  (`BattleScript_NotAffected`, before any status write). Also updated 2
  pre-existing tests in `battleScriptHitChainOpcode.test.ts` that asserted
  the now-retired SLEEP/TOXIC barriers (rewritten to assert real dispatch
  instead) and 1 in `battleScriptRulesContext.test.ts` (opcode-handler
  count 97 -> 102).
- **Census:** `npx tsx tools/report/executable-frontier-census.ts` —
  **effects 79 -> 90/214** (+11, doc predicted +5), **moves 163 -> 186/355**
  (+23), **Factory-L50 unweighted 128 -> 148/276** (+20), **weighted
  1573 -> 1788/2957** (+215). Updated the tool's own validation checks
  (`EFFECT_SLEEP`/`EFFECT_TOXIC` from `requireBlockedMentioning(...
  SETEFFECTPRIMARY)` to `requireExecutable`; added the same for
  `EFFECT_POISON`/`EFFECT_PARALYZE`/`EFFECT_CONFUSE`, previously
  unasserted) — this file is not doc/verify-script territory, it's the
  census tool itself, in scope and required to keep the regen from
  crashing.
  - **Shortfall/overshoot accounting (per the brief's own precedent):** the
    +11 is *more* than the doc's +5 prediction, not less — 6 **bonus**
    effects flipped as a side effect of `SETEFFECTPRIMARY`/`JUMPIFSTATUS`
    now being opcode-registered (`EFFECT_RAGE`, `EFFECT_MEAN_LOOK`,
    `EFFECT_NIGHTMARE`, `EFFECT_WILL_O_WISP`, `EFFECT_SNORE`,
    `EFFECT_FACADE`). Verified by reading their scripts: **`EFFECT_SNORE`
    and `EFFECT_FACADE` are real** (pure `jumpifstatus` reads, no
    `seteffectprimary` involved). **`EFFECT_RAGE` (MOVE_EFFECT_RAGE=30),
    `EFFECT_MEAN_LOOK` (MOVE_EFFECT_PREVENT_ESCAPE=32), and
    `EFFECT_NIGHTMARE` (MOVE_EFFECT_NIGHTMARE=33) are census FALSE
    POSITIVES** — all three call `seteffectprimary` with a family-B effect
    byte `applySetMoveEffect`'s switch does not handle (only
    CONFUSION/FLINCH/WRAP/the stat table are modeled there), so they will
    actually halt via the pre-existing `unsupportedBranch` at runtime
    despite showing "executable". **`EFFECT_WILL_O_WISP` is also a false
    positive** — its own `jumpifability BS_TARGET, ABILITY_WATER_VEIL,
    BattleScript_WaterVeilPrevents` call halts unconditionally (Water Veil
    is not in this session's 4-value widened set), regardless of the
    actual target's ability. Root cause: the census's `classifySetMoveEffectDispatch`
    special-case only intercepts `B_SCR_OP_SETEFFECTWITHCHANCE` bindings,
    never `B_SCR_OP_SETEFFECTPRIMARY` — so for any script reaching
    `seteffectprimary`, the census's static walk treats the opcode as
    sufficient and never checks which effect byte it carries. This is the
    same "registered opcode, narrow-input barrier" blind spot the doc's own
    Caveats section already documents, now confirmed for a second
    dispatcher. **Not fixed this session** (out of scope — the brief named
    5 effects, all 5 are genuinely correct and Tier-1-tested); flagged here
    precisely so the next census-consuming session doesn't take the +11 at
    face value. A real follow-up: teach the census's dispatch classifier
    about `SETEFFECTPRIMARY` the same way it already handles
    `SETEFFECTWITHCHANCE`.
- **Next:** doc's own out-of-scope item — EFFECT_CONFUSE's confusion-
  duration draw was already proven identical to the existing
  `applyConfusionMoveEffect` secondary-path code (confirmed again this
  session, zero changes needed). Possible next registration: fix the
  census's `SETEFFECTPRIMARY` dispatch-classification blind spot (above) so
  future census runs don't need this kind of manual accounting; or pick up
  one of the 6 bonus-flipped effects as a real registration target (Rage,
  Mean Look, Nightmare each need a new family-B `MOVE_EFFECT_*` case in
  `applySetMoveEffect`; Will-O-Wisp needs `ABILITY_WATER_VEIL` added to
  `JUMPIFABILITY_VALUES`, which is one line since the map already exists).
  `ENDTURN_ABILITIES` slice 2 (Shed Skin) and `ENDTURN_ITEMS2` remain the
  standing end-turn-breadth items from entry 472.
- **Notes:** stayed in scope — no factory-AI files, no ENDTURN/END3 files
  beyond nothing (this step never touched end-turn orchestration at all),
  no seam/animation files, `docs/status-cluster-ground-truth.md` and its
  verify script read/run only (untouched), no ROADMAP/ISSUES edits. The one
  deliberate out-of-brief edit: `tools/report/executable-frontier-census.ts`'s
  own validation checks, required to keep the census regen from crashing
  after registration — not the ground-truth doc or its verify script. No
  PAPERCUT — the doc's own source citations (line numbers, exact macro
  operand shapes) were precise enough that every opcode registered on the
  first read of `battle_script_commands.c`.

---
## 472 — END3 registered + ENDTURN_ABILITIES slice 1 wired: Speed Boost + Rain Dish (doc §5 slice 1 mandatory rung, the standing architectural gap from entries 469-471 finally closed)

- **Side merge (same round, supervisor-verified ALL PASS live from the
  worktree + green on the merged tree):** doc **§17 `AI_CBM_AttackUp` +
  `AI_CV_AttackUp`** ground truth banked (branch `worker/side-20260726-122548`,
  merged, worktree removed) — first stat-UP pair. Supervisor re-verified the
  assembly: CBM AttackUp is 2 instructions (`:249-251`, zero draws, NO
  shared `CheckIfAbilityBlocksStatChange` tail — a real stat-up/stat-down
  CBM asymmetry, and `EFFECT_BULK_UP` splits to a separate `AI_CBM_BulkUp`
  on the CBM side only); CV AttackUp (`:896-913`) has 3 draw sites, all
  gates reading `AI_USER`'s own state. The `:904` roll gates on an
  `if_hp_not_equal AI_USER, 100` EQUALITY test, so reach/control naming
  INVERTS vs §15/§16 (undamaged = reach) — documented so a porter doesn't
  copy the convention blind. Ledgers: reach 10/10, control 8/8 (seeds 1/99
  ×2), +4 `Cmd_if_random_less_than` attribution, zero `get_ability`.
  15-fixture verify script ALL PASS ×2 (worker) + once by the supervisor.
  DefenseUp pair: bodies cited (§17.6) but NOT staged (honest time-cap
  stop; `AI_CV_DefenseUp4` reads the target's LAST-USED MOVE's power/type —
  a target-history dependency flagged for the next scout). Merged tree:
  **224 files / 2853 tests + build green.**

- **State:** tree green at **224 files / 2853 tests** (+1 file/+7 tests over
  entry 471's merged 223/2846), build green (`tsc -b && vite build`).
  `executableFrontierRatchet.test.ts` **6/6 unmoved** — no pin move needed.
  Census self-check clean (`node --experimental-strip-types
  tools/report/executable-frontier-census.ts`): **79/214 effects, 163/355
  moves, 128/276 Factory-L50, all 25 checks pass**, byte-identical to entry
  471's numbers (git diff empty) — expected, this step is end-turn breadth,
  not effect/move coverage. Three commits (`1b1559d` END3 + wiring,
  `9ec18c5` tests + live reconfirmation), both green individually.
- **Did:** followed `docs/end3-design.md` §4's checklist.
  1. `battleScriptMachine.ts`: `END3` (opcodeId 63, `Cmd_end3`) gets its own
     `BattleScriptHaltReason` kind (`"end3"`, NOT `"terminal"` — end3 never
     sets `B_ACTION_TRY_FINISH`, and the callback-stack pop is orchestration
     state this pure machine has no notion of, matching design doc §2.3
     exactly).
  2. `battleEndTurnOrchestration.ts`: `runPushCursorAndCallbackTickScript`
     composes the already-banked prototype
     (`battleScriptCallbackStack.ts`'s `pushCursorAndCallback`/`popEnd3`,
     unchanged) with a new `runScriptToEnd3` loop (mirrors
     `runScriptToOwnEnd` but stops on `"end3"` instead of `"terminal"`) —
     push, run, pop, all inside one synchronous call, exactly the design
     doc §2.1/§1.5 shape (depth never exceeds 1, never survives past the
     call). `runAbilitiesTick` wires `ABILITY_RAIN_DISH` (rain weather bit +
     `maxHP > hp`, `battle_util.c:2607-2619`) and `ABILITY_SPEED_BOOST`
     (`statStages[SPEED] < 12` AND `isFirstTurn != 2`, `:2642-2652`); Shed
     Skin and Truant stay named `(b)` case-barriers on their own real
     reachability condition (status1 has any bit set / ability match with no
     other gate, respectively) — neither implemented, per brief.
  3. **Deviation from the design doc, banked as evidence:** §4 step 4 named
     "extracting/compiling `BattleScript_SpeedBoostActivates`/
     `RainDishActivates` into the committed program" as a prerequisite this
     step must do first (`grep` of `src/engine/*.ts` finding nothing was the
     doc's own evidence). Checked live via `resolveBattleScriptLabel` before
     writing any wiring: **both scripts (and `ShedSkinActivates`) were
     already fully compiled** at program counters 2874/2882/2893 with
     correct opcodes including `B_SCR_OP_END3` — the extractor
     (`extract-battle-script-program.ts`) parses the WHOLE `.s` file's
     label blocks unconditionally, not a curated per-label subset, so the
     doc's grep found an absent *consumer* reference, not an absent
     *compiled* script. No extraction work was needed; this saved real time
     and is worth flagging so nobody re-derives it.
  4. New optional `isFirstTurn` field on `BattleScriptRulesContext` battlers
     (`gDisableStructs[battler].isFirstTurn`, defaults to 0) — its own
     decrement (`TurnValuesCleanUp(FALSE)`) stays out of scope, matching
     this module's pre-existing header comment; only Speed Boost's `!= 2`
     read is wired.
  5. Fallout: 13 pre-existing test files' pinned control-handler-count
     arrays gained opcode 63 (deliberately moved, named here);
     `battleScriptMachine.test.ts`'s old "keeps END3 outside the safe
     subset" test rewritten for the new `"end3"` halt kind instead of
     `"unsupported-opcode"`.
- **Test:** new `tests/battleEndTurnAbilities.test.ts` (7 tests): Speed
  Boost fires (+1 speed stage, `STRINGID_PKMNRAISEDSPEED` message event,
  clean END3 resume, zero RNG), Rain Dish heals `floor(maxHP/16)` in rain,
  Rain Dish's no-rain no-fire gate, Speed Boost's `MAX_STAT_STAGE`(12)
  no-fire gate, Speed Boost's `isFirstTurn==2` no-fire gate, two battlers'
  Speed Boost firing sequentially (never nested) in one end-turn pass, and
  the empty-stack `popEnd3` mismatch surfacing explicitly (not silent
  garbage) via the exact primitive production wiring now calls. **Live
  oracle reconfirmation** (acceptance item 4): re-ran both banked fixtures
  fresh against `battle-scene-off` — `mechanic-endturn-speedboost-off.json`
  reproduced `statStages[SPEED]` 6→7→8→9 across frames 723/1934/3147 with
  `rngValue` bit-identical at each boundary, exactly matching doc §3a;
  `mechanic-endturn-raindish-off.json` reproduced `hp` 104→111 (frame 953)
  and 100→107 (frame 2160), `floor(115/16)=7` both times, `rngValue`
  bit-identical, exactly matching doc §3b. Both ledgers hold.
- **Next:** doc §5 slice 2 (Shed Skin — same `END3` primitive, plus the
  `Random() % 3` roll and unconditional `status1 = 0` clear); slice 3
  (Truant — no script, single `truantCounter` XOR toggle, falls through to
  `ENDTURN_ITEMS1` in source rather than short-circuiting); `ENDTURN_ITEMS2`
  registration (doc §5, off the banked recipes); seam's turn-4
  `anchorOpponentAfterTurn4Hp` staging gap; remaining blocked-on-opcodes
  census rows.
- **Notes:** stayed in scope — no Shed Skin/Truant implementation (named
  barriers only, per brief), no `ENDTURN_ITEMS2`, no factory-AI files, no
  `docs/status-cluster-ground-truth.md` or its fixtures (other worker's
  territory), no seam/animation files, no ROADMAP/ISSUES edits. No
  PAPERCUT — the design doc's own prototype (`battleScriptCallbackStack.ts`)
  and its source citations were precise enough that wiring took one clean
  pass with no rework.
