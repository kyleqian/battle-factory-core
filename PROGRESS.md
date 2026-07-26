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

---
## 470 — ENDTURN_ITEMS1 registered: REMOVEITEM opcode + Leftovers/8 cure berries/White Herb (doc §5 slice 4's mandatory rung), live-verified

- **Side merge (same round, supervisor-verified in-worktree + on the merged
  tree):** END3 design scout banked (branch `worker/side-20260726-112551`,
  merged, worktree removed) — `docs/end3-design.md` + UNWIRED
  `src/engine/battleScriptCallbackStack.ts` prototype (5 Tier-1 tests).
  Load-bearing design facts, supervisor re-verified against
  `battle_script_commands.c:3967-3973`: `Cmd_end3` pops BOTH stacks
  (script cursor via `BattleScriptPop()` + `gBattleMainFunc` from
  `battleCallbackStack`); for the end-turn abilities the popped cursor is
  observably dead — the real resume point is `turnEffectsTracker` state —
  while the mid-script (Intimidate `ON_SWITCHIN`) case is a live
  continuation; stack depth caps at 1 (`if (effect) return` short-circuit).
  Registration checklist for the main-lane END3 step: `docs/end3-design.md`
  §4. Two endturn-doc §1b imprecisions corrected (no
  `gBattlescriptCurrInstrStackPtr` symbol; `end3` restores
  `BattleTurnPassed`, not a re-entry point). Merged tree: **223 files /
  2810 tests + build green.**

- **State:** tree green at **222 files / 2805 tests** (+1 file/+24 tests
  over entry 469's merged 221/2781), build green (`tsc -b && vite build`).
  Ratchet **6/6**
  (`executableFrontierRatchet.test.ts`) — one new pinned entry,
  `battleScriptRemoveitemOpcode.ts: 1` (moved deliberately, named in both
  commit messages): `Cmd_removeitem`'s only unmodeled branch is a selector
  resolving to no live battler role, reachability-tested. The
  `runItemsTick` case-barriers for RESTORE_HP/RESTORE_PP/the 3 stretch
  stat-up berries/the 9 zero-Factory-carrier hold effects do **not** add to
  that ratchet (same `"case-barrier"` shape as the pre-existing
  NIGHTMARES/CURSE/THRASH/DISABLE/TAUNT guards, not a machine-level
  `unsupportedBranch(...)` call). Two commits (`1c8e015` opcode,
  `d8e161a` orchestration wiring), both green; a third (docs/fixtures only)
  follows this entry. `npx tsx tools/report/executable-frontier-census.ts`:
  unchanged (79/214 effects, 163/355 moves, 128/276 Factory-L50 moves,
  1573/2957 weighted, 25/25 checks) — this slice is end-turn breadth, not
  move-effect breadth, exactly as the brief anticipated.
- **Did:** read `docs/endturn-abilities-items-ground-truth.md` in full,
  then (1) registered `B_SCR_OP_REMOVEITEM`/`Cmd_removeitem`
  (`battleScriptRemoveitemOpcode.ts`, all 13 concrete call sites eagerly
  validated), widening the shared `GetBattlerForBattleScript` resolver for
  `BS_SCRIPTING` (the existing non-nullable `scriptingBattler` field) so
  `PLAYANIMATION`/`UPDATESTATUSICON` work inside the new scripts too, plus
  registering `B_ANIM_HELD_ITEM_EFFECT` and `gBerryEffectStringIds`; (2)
  wired `ENDTURN_ITEMS1` (`runItemsTick` in
  `battleEndTurnOrchestration.ts`) for Leftovers (heals floor(maxHP/16)
  capped, persists), White Herb (resets every below-neutral stat stage to
  6, consumes), and the 8 zero-RNG cure berries (Cheri/Pecha/Rawst/Aspear/
  Chesto/Persim/Lum/Mental Herb — each clears its own status1/status2 bit,
  syncs the party status1 mirror the same way `bumpToxicCounter` already
  does, consumes the item) — `runTickScript` reused unchanged, zero new
  control-flow work, matching the doc's own "no new opcode beyond
  REMOVEITEM" finding. Every other real switch case barriers on its own
  genuine trigger condition rather than falling through: RESTORE_HP
  (`hp <= maxHP/2`)/RESTORE_PP (a real zero-PP move exists) are Factory-legal
  but out of this slice's ten; the 3 stretch stat-up berries
  (Liechi/Salac/Petaya, doc §5 slice 5) and the 9 zero-Factory-carrier cases
  (4 stat/crit berries + 5 confuse berries, doc §2b) barrier on mere
  possession since their own HP-threshold gate needs an unmodeled per-item
  `holdEffectParam` table no live carrier will ever exercise.
  **Did NOT reach slice 5** (stretch) — time went to the mandatory ten plus
  live verification instead; see Next.
- **Test:** 20 new Tier-1 tests in `battleEndTurnOrchestration.test.ts`
  (12→32 total: one per cure berry via a small table-driven block,
  Leftovers/White Herb fire+no-fire pairs, and one reachability test per
  (b) guard including a "does NOT barrier below the gate" negative for
  RESTORE_HP) + 4 new tests in `battleScriptRemoveitemOpcode.test.ts` (both
  selectors, plus the opcode's own barrier) + 2 existing
  `battleScriptRulesContext.test.ts` tests widened in place (BS_SCRIPTING
  added to the selector map/composition count, 95→96) — net +24 tests, +1
  file, matching the measured 2781→2805.
  **Live oracle verification (both re-run clean against `battle-scene-off`,
  numbers in doc §6):** `tools/battle-lab/mechanic-endturn-items1-leftovers-off.json`
  (LOTAD holding Leftovers vs. a real MAGIKARP Pound: frame 528→529 the hit
  lands -11, frame 849→850 Leftovers heals +7 = floor(115/16), item
  unchanged at 200 throughout, `rngValue` bit-identical at the exact heal
  boundary) and `tools/battle-lab/mechanic-endturn-items1-cure-par-off.json`
  (same LOTAD holding Cheri Berry vs. a real Thunder Wave: `status1` clears
  612→613, item clears 750→751 — confirms source's real two-step timing,
  the C-side status clear fires synchronously ahead of the queued script's
  animation/message tail that ends in `removeitem` — `rngValue` bit-identical
  across the ENTIRE 491→751 window, zero draws).
- **Next:** doc §5 slice 5 (Liechi/Salac/Petaya, `STATBUFFCHANGE` already
  registered, label-lookup-only addition once `REMOVEITEM` exists — this
  session's own `runItemsTick` dispatch is ready to extend, just add the
  three cases where the stretch barrier bucket currently sits and drop them
  from that `Set`). `ENDTURN_ITEMS2` stays correctly unregistered (its real
  trigger needs Yawn/Thrash's own end-turn cases, doc's own finding).
  `END3` registration (Speed Boost/Rain Dish/Shed Skin, doc slices 1-3)
  remains the next architectural gap after that.
- **Notes:** stayed in scope — no END3, no slices 1-3, no ENDTURN_ITEMS2, no
  factory-AI files, no ground-truth content edits beyond the short §6
  registration-status addendum the brief allowed. No PAPERCUT this session.

