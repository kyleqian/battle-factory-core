# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 461 — Full-turn reducer: PLAYER-side forced-switch variant lands (entry 459's item 3, the named remainder)

- **State:** tree green at **218 files / 2585 tests** (+0 files/+3 tests
  over entry 460's 218/2582 — only added tests to the existing
  `factoryBattleScriptFullTurnDecision.test.ts`), build green, ratchet
  unchanged (6/6 — no barrier call site touched). Two per-rung commits
  (`b3f8276` plumbing, `fccfd9d` tests), both green.
- **Did:** surfaced the `faint1`/`faint2` `"player-choice-required"` fork
  (both previously threw "outside this reducer's modeled domain") as a real
  `"forced-switch"` decision-required boundary, mirroring
  `factoryBattleScriptTerminalDecision.ts`'s own `forced-switch-pending`
  phase + resume machinery. Added `playerBenchHp`/`playerBenchOverride` to
  `FactoryFullTurnConfig` (party slot 0 = active, this reducer's own
  convention — both player and opponent parties now share one `benchSlot`
  helper). New `pendingForcedSwitchAt`/`pendingScriptAt`/
  `buildForcedSwitchPendingRules` reconstruct the halted
  `BattleScript_HandleFaintedMon` script from a durable `pendingScript`
  bundle (programCounter/callStack/scheduler); `resumeFullTurnForcedSwitch`
  resumes it via `resumeBattleScriptFaintedActionsAfterPlayerChoice`, and a
  `"resumed"` result runs straight into a new shared `runEndTurnTail` helper
  (factored out of the existing two-action-turn tail, now called from both
  the normal turn path and the forced-switch resume path).
- **Test:** a pure side-relabeling of entry 459 item 2's own trainer-side
  fixture (same STRENGTH/200atk/50def/90hp one-shot, same speed gap) so the
  trainer's killing blow KOs the player's active mon instead. Pins: the
  reducer surfaces `{kind:"forced-switch", side:"player", battler:0,
  faintedPartyIndex:0, legalPartyIndexes:[1]}` (not a throw); submitting the
  legal MACHOP slot rebuilds the active battler (species/hp/partyIndex/
  neutral stat stages/clean status — moves/pp/other stats intentionally NOT
  rebuilt, per `battleScriptSwitchinOpcode.ts`'s own documented "ability/
  item/moves/pp stay untouched" scope) and resumes to a genuine next command
  boundary; exact RNG ledger (4 total across all three submissions — just
  the killing blow's own hit chain, zero from the forced-switch dance, zero
  from the cancelled second action, zero from the quiet end-turn); PP ledger
  (trainer's Strength used once, the player's own action never dispatched);
  the fainted/active slot (index 0) is rejected.
- **Next:** entry 460's own list stands, item 3 is now the completed
  remainder off it — `CheckViability` handler bodies phased by the audit's
  16-reachable-handler table (ground truth scout first), Ingrain/Leech
  Seed/Wrap registration, seam window 3 (`turn5-rockslide.json` per the
  scout doc's ranking), ENDTURN_ABILITIES/ITEMS breadth.
- **Side merge (same hour, supervisor-verified, `83f15c3`):**
  `addbyte`/`jumpifbytenotequal` widened off their single hardcoded
  `gBattleCommunication`/`gBattlersCount` tuple onto the shared SETBYTE
  byte-lvalue universe (+`gBattlersCount` sentinel comparand) —
  `BattleScript_WeatherFormChanges` now runs to its own `return` for
  non-Castform L50 singles (0 RNG draws), Castform barrier still reached
  *through* the loop; Perish Song/Teeter Dance/Intimidate/Palace loop
  counters ride the same mechanism (not separately tested). Census
  unchanged (opcode-level dispatch only; regenerated zero-diff, 25/25
  self-checks); ratchet barrier count still 3 (comment updated). Merged
  suite 218 files / 2590 tests + build re-verified green.
- **Notes:** pure reducer/config work, no presentation/census/opcode-
  registration changes (as scoped; `battleScriptSetByte.ts`/
  `battleScriptDamagingWeatherOpcode.ts` untouched, left for the side worker
  this hour). Scratch-verified via a deleted `tests/_scratch_item3.test.ts`
  before writing the real test (same discipline entry 459 used), confirming
  the exact RNG/PP numbers and the switch-in module's documented
  moves/pp-untouched limitation before asserting on it. No PAPERCUT logged.

