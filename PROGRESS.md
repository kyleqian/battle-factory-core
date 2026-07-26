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
## 473 — Primary status-move opcode cluster registered: EFFECT_SLEEP/TOXIC/POISON/PARALYZE/CONFUSE all executable (doc's own scout finding, `docs/status-cluster-ground-truth.md`, fully executed this session)

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

---
## 471 — Seventh + eighth CheckViability handler pairs ported: AI_CBM_DefenseDown/AI_CV_DefenseDown + AI_CBM_SpDefDown/AI_CV_SpDefDown (doc §15/§16, mandatory + stretch both landed)

- **Side merge (same round, supervisor-verified PASS live from the worktree
  + green on the merged tree):** primary status-move opcode cluster
  prep-scout banked (branch `worker/side-20260726-120123`, merged, worktree
  removed) — `docs/status-cluster-ground-truth.md` +
  `tools/probe/verify-status-cluster-ground-truth.ts` (PASS ×2 worker,
  + once by the supervisor) + paralyze/sleep mechanicLab fixtures.
  **Decisive census correction:** the census's named opcode set
  (SETEFFECTPRIMARY + 4 jump opcodes) only fully unlocks EFFECT_SLEEP —
  TOXIC/POISON/PARALYZE/CONFUSE additionally need `Cmd_jumpifability`
  widened past its LIQUID_OOZE-only tuple
  (`battleScriptIngrainLeechSeedWrapOpcode.ts:183-193`, supervisor-verified)
  to IMMUNITY/LIMBER/OWN_TEMPO, and JUMPIFSTATUS2 widened for
  STATUS2_CONFUSION — the census Caveats' "registered opcode, narrow-input
  barrier" blind spot confirmed live. RNG ledgers pinned: Thunder Wave = 1
  draw (accuracy only); Sleep Powder = accuracy + `(Random()&3)+2` duration
  matching the existing sleep-decrement convention. All cluster opcodes
  classified (a)-portable. Merged tree: **223 files / 2846 tests + build
  green.**

- **State:** tree green at **223 files / 2846 tests** (+0 files/+65 tests
  over entry 470's merged 222/2805 — no new files, existing CheckBadMove/
  CheckViability/ScoredDecision test files widened in place), build green
  (`tsc -b && vite build`). Ratchet **6/6** unmoved (`factoryAiCheckBadMove.ts`/
  `factoryAiCheckViability.ts` aren't ratchet-tracked — same precedent as
  every prior CBM/CV port). Three commits (`e58c48d` port, `865e32e` unit
  tests, `4a3c034` engine reproduction), each green.
  `tools/probe/verify-factory-ai-checkviability-ground-truth.ts`: **ALL
  PASS**, run before touching source (confirmed the side lane's banked
  §15/§16 fixtures already held) and again after (oracle-only assertions,
  unaffected by an engine-side port either way).
- **Did:** ported both remaining mandatory-priority CBM-blocked pairs per
  `docs/factory-ai-checkviability-ground-truth.md` §15/§16 — both handlers'
  CBM half (`AI_CBM_DefenseDown`/`AI_CBM_SpDefDown`, `data/battle_ai_scripts.s
  :283-285`/`:296-298`) is a bare MIN_STAT_STAGE gate that `goto`s straight
  into the ALREADY-ported shared `CheckIfAbilityBlocksStatChange` tail
  (`:308-312`, reused unchanged from entry 469's AttackDown port, not
  duplicated) — factored as `runCbmStatDownViaSharedTail` in
  `factoryAiCheckBadMove.ts` since the two handlers are byte-for-byte
  identical modulo which stat stage they read. Both handlers' CV half
  (`AI_CV_DefenseDown`/`AI_CV_SpDefDown`, `:1124-1134`/`:1186-1196`) share an
  identical 3-gate/1-draw-site shape — Gate A (opponent's OWN hp<70,
  unconditional reach into the draw site) and Gate B (target's OWN stat
  stage>3, only checked if Gate A is false, skips the draw site) are two
  DIFFERENT PATHS INTO THE SAME roll, not independent branches; Gate C
  (target's OWN hp>70) is an orthogonal always-reached fallthrough that
  stacks with the draw site's own -2 — factored as `runCvStatDown` in
  `factoryAiCheckViability.ts`. Widened `FactoryAiCheckBadMoveTarget` (+
  `defStage`/`spDefStage`) and `FactoryAiCheckViabilityBattler` (same two
  fields, both sides) and plumbed them through `factoryAiDecisionPolicy.ts`'s
  CBM-target/CV-attacker/CV-target construction from
  `view.*.statStages.def`/`.spDef` (those fields already existed on
  `FactoryAiScoredBattlerView`, just unwired until now). Pair (2)
  (SpDefDown) landed in the same rung as pair (1) rather than as a separate
  stretch step — the shared-helper factoring made it near-zero marginal
  work once pair (1)'s shape was in place, exactly as the brief predicted.
  Updated the two pre-existing "still barriers every other reachable
  handler" pass-through examples from `EFFECT_DEFENSE_DOWN`/`MOVE_TAIL_WHIP`
  (no longer unsupported) to `EFFECT_HAZE`/`MOVE_HAZE`.
- **Test:** 28 new Tier-1 tests across `factoryAiCheckBadMove.test.ts`
  (32→38: MIN_STAT_STAGE short-circuit + both table-entry variants, an
  ambiguous two-ability target reaching the shared tail for exactly 2 draws,
  known-Clear-Body/single-ability-White-Smoke short-circuits, one block per
  handler) and `factoryAiCheckViability.test.ts` (81→99: Gate A/B as
  distinct paths into the identical draw site, both roll outcomes, Gate C's
  independent fallthrough, and a combined test proving the draw site's -2
  and Gate C's -2 are NOT mutually exclusive, one block per handler) + 12
  new engine-reproduction tests in `factoryAiScoredDecision.test.ts`
  (38→50): Anorith (Battle Armor, single ability)/Machamp (Guts, single
  ability) — the exact §13.2/§15.2 species pairing reused verbatim — reach
  (Anorith at the doc's own live-verified 22/120=18% seed 1 / 30/120=25%
  seed 99 endpoints, Gate A true) vs. control (120/120, Gate A false + Gate
  B true at neutral stage) through the REAL mask-7 dispatcher: reach yields
  exactly 4 identical check-viability draws (one per identical
  `MOVE_LEER`/`MOVE_FAKE_TEARS` slot), control yields zero, zero CBM/
  TryToFaint draws throughout (single-ability target keeps CBM's
  shared-tail `get_ability` guess free), both always pick the dispatch move.
- **Next:** further CBM+CV pairs from the blocked-17 priority list (doc's
  own audit); `END3` registration (architectural, needs its own design
  look, currently another worker's territory); ENDTURN doc §5 slice 5
  (Liechi/Salac/Petaya stat-up berries, `REMOVEITEM`-unblocked per entry
  470); remaining blocked-on-opcodes census rows.
- **Notes:** one real assembly-reading gotcha beyond the doc's own prose:
  Gate A and Gate B in `AI_CV_DefenseDown`/`AI_CV_SpDefDown` are NOT two
  independent preconditions gating the SAME effect the way AttackDown's own
  Gate A/Gate C do — they're two different jump targets that both land on
  the identical draw site (Gate A jumps straight there; Gate B's own
  fallthrough, when false, lands there too) — worth spelling out explicitly
  in code comments since a naive per-gate boolean-AND port would have
  silently required BOTH gates true to reach the roll, which is wrong (Gate
  B is only ever consulted when Gate A is false in the first place). No
  PAPERCUT this session.

