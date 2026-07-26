# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 463 — First CheckViability handler-body port: AI_CBM_SpeedDown + AI_CV_SpeedDown, the proven CBM+CV pair (entry 462's carried item, per `docs/factory-ai-checkviability-ground-truth.md`)

- **State:** tree green at **219 files / 2627 tests** (+0 files/+17 tests
  over entry 462's 219/2610), build green, ratchet unchanged (the CBM/CV
  `unsupported-branch` results are plain tagged returns, not the
  `unsupportedBranch(...)` helper `executableFrontierRatchet.test.ts`
  tracks — confirmed neither `factoryAiCheckBadMove.ts` nor
  `factoryAiCheckViability.ts` is in `PINNED_BARRIER_COUNTS`, so this
  step's barrier-narrowing is real but outside that ratchet's mechanism).
  Two commits (`7fec289` port, `a2250eb` tests), both green.
  `tools/probe/verify-factory-ai-checkviability-ground-truth.ts` rerun
  live against the oracle: **ALL PASS** (both fixtures, both seeds,
  10/10 and 20/20 total-step counts unchanged — confirms the fixtures
  still bank, independent of this port).
- **Did:** ported the doc's own §6-staged pair exactly as scoped.
  1. **`AI_CBM_SpeedDown`** (`data/battle_ai_scripts.s:287-312`, 3
     instructions + the shared `CheckIfAbilityBlocksStatChange`
     subroutine) inside `factoryAiCheckBadMove.ts`: MIN_STAT_STAGE and a
     new zero-RNG `checkAbilityAiTarget` port of `Cmd_check_ability`
     (`battle_ai_script_commands.c:1407-1443`, AI_TARGET branch --
     distinct from `get_ability`'s guess-and-draw machinery, ported
     exact including its own real quirk: an unknown two-ability species
     can NEVER register a `check_ability` match, for either ability, not
     a coin flip) short-circuit Speed Boost; the shared tail's own
     `get_ability AI_TARGET` reuses `nextGetAbilityDraw` unchanged (entry
     460's redraw-per-call machinery, not re-derived). Dispatches on
     `EFFECT_SPEED_DOWN`/`EFFECT_SPEED_DOWN_2` before the generic
     barrier check; every other CBM-tabled effect still barriers.
  2. **`AI_CV_SpeedDown`** (`:1142-1152`) inside
     `factoryAiCheckViability.ts`: `if_target_faster` is `if_user_goes 1`
     (`Cmd_if_user_goes`, `battle_ai_script_commands.c:1268-1274`) --
     jumps only when `GetWhoStrikesFirst(AI_USER, AI_TARGET,
     ignoreChosenMoves=TRUE)` returns EXACTLY 1, reusing `turnOrder.ts`'s
     already-ported `getWhoStrikesFirst`/`effectiveSpeed` (both
     battlers forced to movePriority 0, matching `ignoreChosenMoves`)
     rather than re-deriving speed-order semantics. Ported the one real
     subtlety the brief flagged for exactness: an EXACT speed tie still
     burns one real `Random()` call inside `GetWhoStrikesFirst` itself
     (`speedBattler1 == speedBattler2 && Random() & 1`), even though a
     tie can only resolve to strikesFirst 0 or 2 -- never 1 -- so the
     `if_target_faster` branch is never taken on a tie regardless of the
     roll's parity. Then `if_random_less_than 70` (`Cmd_if_random_less_than`,
     `random % 256 < 70`, same `nextDraw`/`% 256` shape as
     `factoryAiTryToFaint.ts`'s own roll). Same dispatch-before-barrier
     shape as CBM; every other CV-tabled effect still barriers.
  3. **Plumbing:** `FactoryAiScoredBattlerView` gained `speed`/
     `statStages.speed` (both attacker and target) -- no other engine
     module reads it yet, source-required for `if_target_faster` alone;
     threaded through `targetForCbm.speedStage` and a new `attacker`/
     `target` param pair on `runCheckViability`. CV's own draws
     (previously always empty) now flow into the trace the same way
     CBM/TryToFaint's already do -- `submitFactoryAiScoredDecision`'s own
     kernel-replay check would have caught a miss here loudly (RNG-calls
     mismatch), not silently.
- **Test:** unit coverage for every branch of both handlers (CBM:
  MIN_STAT_STAGE -10/0 draws using a single-ability target since Marowak's
  own ambiguous ability would confound the "zero total draws" claim;
  Speed Boost -10/0 draws via Ninjask; the if_ability two-ability-unknown
  quirk pinned against Yanma, scoreDelta 0 but 2 real draws; Clear
  Body/White Smoke -10 via known abilities; CV: target-faster -3/0
  draws; target-slower roll<70/0-bonus and >=70/+2, exactly 1 draw each;
  the exact-tie case at both roll parities, 1 draw either way, scoreDelta
  always -3) -- 20 new tests. Mask-7 end-to-end reproduction of both
  banked fixtures through `chooseFactoryAiScoredDecision` (2 seeds each,
  4 new tests): opponent-faster (Dugtrio AI vs Shuckle target) never
  picks slot 0, 5 total draws (4 setup + 1 tie, zero CBM/TryToFaint/CV);
  opponent-slower (roles swapped) always picks slot 0, 6 total draws (the
  extra one is CV's own roll, landing >=70 at both test seeds). Substituted
  the doc's own `MOVE_GROWL` control move for `MOVE_SPLASH` -- Growl's
  `EFFECT_ATTACK_DOWN` is a DIFFERENT CBM-blocked handler
  (`AI_CBM_AttackDown`, unported) that would barrier before this scenario
  ever reached `AI_CV_SpeedDown`; Splash has no entry in either dispatch
  table at all (unconditionally zero score/draws, not just in this battle
  state), so it isolates the SpeedDown pair's own causal contribution
  cleanly -- named explicitly in both the test file and here since it's a
  real, deliberate substitution, not an oversight. Both dispatch barriers
  reconfirmed to still fire for every other reachable effect
  (`EFFECT_ATTACK_DOWN` pass-through, both files).
- **Next:** the doc's own §10 recommendation -- the 4 remaining CV-only-
  reachable handlers with no CBM pairing needed (`AI_CV_AlwaysHit`,
  `AI_CV_HighCrit`, `AI_CV_VitalThrow`, `AI_CV_Pursuit`; no live fixtures
  staged for these yet, named as next by the scout). Any of the
  CBM-blocked 17 (`AccuracyDown`/`AttackDown`/`DefenseDown`/`SpDefDown`/
  weather setters/screens/stat-ups) needs BOTH its `AI_CBM_*` and
  `AI_CV_*` handler ported together, not just the CV side (this step's
  own `MOVE_GROWL`-vs-`AttackDown` gap is a live example of what happens
  otherwise). Also still open from entry 462: seam window 3
  (`turn5-rockslide.json`), ENDTURN_ABILITIES/ITEMS1/ITEMS2 breadth,
  Nightmare/Curse/Thrash/Disable/Taunt end-turn bodies.
- **Notes:** stayed strictly inside this step's scope -- no other CV
  handler, no `AI_CV_SpeedDownFromChance`, no seam/presentation/animation
  files touched. No PAPERCUT: the `MOVE_GROWL`-hits-an-unrelated-barrier
  discovery cost some investigation time but was resolved within scope by
  swapping the control move, not a dev-loop friction worth flagging
  separately.
- **Side merge (same hour, supervisor-verified, comparator spot-checked
  live at 256/256):** seam window 3 prep-scout landed as
  `docs/presentation-seam-scout.md` §9 (`turn5-rockslide.json`): full
  consumer map (corrects the constants' provenance — three bare literals +
  one non-turn-dump asset, not `battle1TurnRamDumpAsset` fields), staged
  opponent-attacks-player proof via unwired
  `turn5EndeavorPresentationStaging.ts` (+7 tests), and the real blocker
  named: `EFFECT_ENDEAVOR` is blocked on `SETDAMAGETOHEALTHDIFFERENCE`/
  `BICBYTE`/`ADJUSTSETDAMAGE` — registration is the wiring step's rung 1.
- **Animation merge (same hour, supervisor-verified live at 114/114):**
  defect A FIXED for FUTURE_SIGHT — new DISPCNT-OBJ-off underlayer probe
  named the 2nd blend target directly (formula exact 26/26 sampled
  pixels; blend computed on 8-bit-expanded RGB, not re-truncated 5-bit),
  `battleScene.ts` now composites scale-window blend sprites 50/50 over
  the tinted frozen `monbg` copy. **MOVE_FUTURE_SIGHT promoted
  `partial`→`exact` 114/114** (×2). CONFUSION stays 108/140 — blend
  proven a no-op there via stash-diff; its blocker is the separate
  banked one-tick OAM x-lag on the target shake. GROWTH 63/63 and BIND
  45/45 gates held (neither sets objMode=1, source-confirmed). Probe
  harness finding: `EmeraldOracle.write_u8/u16` silently no-op for
  IO/OAM/palette RAM — worked around via libmgba-py `_bus_write`.
  Combined merged tree re-verified: **220 files / 2634 tests + build
  green.**

---
## 462 — Ingrain/Leech Seed/Wrap-family registered: setters + end-turn bodies executable (entry 461's next-item list)

- **State:** tree green at **219 files / 2610 tests** (+1 file/+20 tests
  over entry 461's 218/2590), build green. Ratchet: `battleScriptHitChainOpcode.ts`
  25→23 barriers (two retired **for real**, not narrowed — see below), new
  `battleScriptIngrainLeechSeedWrapOpcode.ts` pinned at 3 (deliberate, named
  in the ratchet's own comment). One commit (`0a29dfe`). Census
  live-regenerated: **73/214→76/214 effects, 152/355→160/355 moves,
  118/276→125/276 Factory-L50** (25/25 self-checks pass). Verify script
  rerun live against the oracle twice for determinism: **18/18 PASS** both
  times (`node --experimental-strip-types tools/probe/verify-ingrain-leechseed-wrap-ground-truth.ts`).
- **Did:** followed `docs/ingrain-leechseed-wrap-ground-truth.md`'s own
  dependency-ordered slices end to end.
  1. **Setters:** new `TRYSETROOTS` (Ingrain, one concrete site, no RNG) and
     `SETSEEDED` (Leech Seed — accuracy/already-seeded/Grass-immunity/success
     branches, `STATUS3_LEECHSEED`+seeder-id bits) opcodes in a new
     `battleScriptIngrainLeechSeedWrapOpcode.ts`. Wrap's own setter needed no
     new opcode — `MOVE_EFFECT_WRAP` is a new case inside the
     already-registered `Cmd_seteffectwithchance` dispatch
     (`applySetMoveEffect`): the `(Random()&3)+3` duration roll, plus two new
     per-battler fields this doc's own gap analysis flagged
     (`wrappedMove`/`wrappedBy`, optional/defaulted so no existing fixture
     needed updating).
  2. **End-turn bodies:** wired real `ENDTURN_INGRAIN`/`LEECH_SEED`/`WRAP`
     ticks into `battleEndTurnOrchestration.ts`'s existing loop, in the
     enum's real execution order (INGRAIN, ABILITIES/ITEMS1 no-op,
     LEECH_SEED, POISON/BAD_POISON/BURN, NIGHTMARE, CURSE, WRAP, UPROAR
     no-op, THRASH, ...) — **not** the C switch's own textual case order,
     which is cosmetically different and would have mis-sequenced Leech
     Seed/Wrap against the already-landed status-damage tick. Factored the
     repeated "run tick, propagate opcode-barrier, check outcome-decided"
     shape into one `applyTickOutcome` helper shared by all four ticks now
     (status-damage + the three new ones).
  3. **Two real shape gaps the doc named, both closed:** `Cmd_datahpupdate`'s
     negative-damage (HP gain) branch was a barrier from an earlier rung
     ("needs maxHP, unmodeled") — `maxHP` has existed since the burn/poison
     work, so this was just stale; implemented the real heal-clamped-at-maxHP
     branch (no bide/shellBell/physical-special bookkeeping on this branch,
     matching source exactly). `Cmd_cleareffectsonfaint`'s `STATUS2_WRAPPED`
     cross-battler barrier is now a real clear using the new `wrappedBy`
     identity (a fainted mon's own traps release on its allies/foes for
     real).
  4. **Two narrow opcode-table gaps the census tool itself surfaced, not the
     doc:** `PRINTFROMTABLE_TABLES` was missing `gLeechSeedStringIds`
     entirely (opcode-registered ≠ every table pointer wired); `PLAYANIMATION`'s
     animType allowlist needed `B_ANIM_INGRAIN_HEAL`/`B_ANIM_LEECH_SEED_DRAIN`/
     `B_ANIM_TURN_TRAP` added (both discovered by running the tests, not
     predicted in advance — fixed same rung).
- **Test:** full setter lifecycle for all three (Ingrain success/already-rooted;
  Leech Seed success/Grass-immune/already-seeded, entering post-accuracycheck
  per the doc's own scope note since that roll is already covered elsewhere;
  Wrap's duration roll/already-wrapped-skip/`BattleScript_MoveEffectWrap`
  return, isolated at the `seteffectwithchance` dispatch per this codebase's
  own established per-opcode testing convention rather than gambling on a
  full accuracy/crit/damage RNG chain) — 11 tests, new file. End-turn tick
  tests extending `battleEndTurnOrchestration.test.ts`: Ingrain heal capped
  at maxHP (doc's live 159→161 ledger) and uncapped, Ingrain's real full/0-HP
  guard, Leech Seed drain+heal (doc's live numbers) plus a Liquid Ooze
  reversal (seeder damaged instead of healed — the ability check is on the
  **seeded** mon per source, confirmed against `Cmd_jumpifability`'s exact
  call site), Wrap still-trapped decrement+damage and release-with-no-damage
  — 7 new tests. Plus 3 new barrier-reachability tests (COPYARRAY/
  JUMPIFABILITY/MANIPULATEDAMAGE's own narrowed-tuple misses) required by
  the ratchet's own "every pinned module needs a reachability test" check.
  All zero-RNG assertions match the doc's own live ledger exactly.
- **Ratchet pin moves, named:** `battleScriptHitChainOpcode.ts` 25→23 (both
  retirements are real — see item 3 above, not a narrowing);
  `battleScriptIngrainLeechSeedWrapOpcode.ts` new at 3 (`COPYARRAY` narrowed
  to `BattleScript_LeechSeedTurnDrain`'s own `gBattleMoveDamage<-gHpDealt`
  tuple among 16 concrete call sites; `JUMPIFABILITY` narrowed to
  `BS_TARGET`/`BS_ATTACKER` + `ABILITY_LIQUID_OOZE` among 18; `MANIPULATEDAMAGE`
  narrowed to `DMG_CHANGE_SIGN` among 4 — `DMG_RECOIL_FROM_MISS`/`DMG_DOUBLED`
  out of this slice's scope).
- **Next:** CheckViability handler bodies (entry 460's own carried item,
  phased by the earlier audit's 16-reachable-handler table), seam window 3
  (`turn5-rockslide.json`), ENDTURN_ABILITIES/ITEMS1/ITEMS2 breadth (pure-C,
  explicitly out of this step's scope), Nightmare/Curse/Thrash/Disable/Taunt
  end-turn bodies now that their own case-barriers are the only ones left in
  `runDoBattlerEndTurnEffects` (no move effect sets any of their trigger
  bits yet, so still genuinely inert, not just undertested).
- **Notes:** no factory-AI or `docs/factory-ai-*.md` changes (side worker's
  area this hour, per the brief's own scope line) — untouched. No new
  PAPERCUT: the two "opcode registered ≠ every table/animType entry wired"
  gaps (PRINTFROMTABLE/PLAYANIMATION) cost some time but were caught by the
  test suite itself within the same session, not a dev-loop friction worth
  flagging separately from ordinary iteration.
- **Side merge (same hour, supervisor-verified):** CheckViability prep
  scout landed (`docs/factory-ai-checkviability-ground-truth.md`, 2 staged
  SpeedDown fixtures, verify script ALL PASS live twice). Two corrections
  to the July-25 audit, both supervisor-re-verified against source: (1) the
  "9 trivial 0-if_random handlers" claim is wrong — every one has ≥1
  `if_random_less_than`; (2) CBM's own dispatch blocks 17 of 22 reachable
  CV handlers before viability runs — only AlwaysHit/HighCrit/VitalThrow/
  Pursuit/SpeedDownFromChance are portable without a paired `AI_CBM_*`.
  Reachable set re-derived 16→22 at the current census. Merged tree
  re-verified green (2610 tests).
- **Animation lane (same session, two evidence rungs merged):** defect A's
  mechanism is now RAM-proven — the scale-window OBJ has OAM `objMode=1`
  (ST_OAM_OBJ_BLEND): hardware alpha-blends it 50/50 (`eva=evb=8`,
  target2=all layers) against the under-layer; texel brute-force across
  full palette × all tint coefficients finds zero pure-texel matches,
  ruling out every coordinate-bug candidate. Remaining unknown: the exact
  under-layer composite (single-layer candidates each fail). Third worker
  now instrumenting the pre-OBJ composite directly. FUTURE_SIGHT/CONFUSION
  stay `partial` 85/114 / 108/140.

