# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

