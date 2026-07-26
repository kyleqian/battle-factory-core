# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 458 — Rain/Sun F7/F9 landed (item 1, committed); `TRYCASTFORMDATACHANGE` (item 2) STOPPED per the brief's own condition — Castform reachability confirmed real, not hypothetical

- **State:** tree green at **217 files / 2568 tests** (+0 files/+3 tests
  over entry 457's 217/2565 — this step only added tests to two existing
  files), build green, ratchet unchanged (6/6 — the widened PLAYANIMATION
  handler keeps the same 2 `unsupportedBranch()` call sites it had before,
  just with a wider recognized-animType map ahead of them). Committed as
  one rung (`7085324`). `verify-screens-weather-ground-truth.ts`
  reconfirmed live after landing: **29/29 PASS**.
- **Item 1 — done, per the brief's own two work items:**
  1. **Widened `Cmd_playanimation`** (`battleScriptStatbuffchangeOpcode.ts`)
     beyond its `B_ANIM_STATS_CHANGE` arm to also recognize
     `B_ANIM_RAIN_CONTINUES`/`B_ANIM_SUN_CONTINUES` (source
     `battle_script_commands.c:4004-4043`'s branch 3 — reached because this
     engine never sets `HITMARKER_NO_ANIMATIONS` anywhere in production, a
     tension `docs/battle-move-anim-notes.md`/`battle-turn-notes.md` already
     flag and leave unresolved without settling it here; branch 3 bypasses
     the semi-invulnerable skip, same shape the sibling `PLAYANIMATION_VAR`
     handler already established for Sandstorm/Hail). Confirmed via
     `battle-script-program.json`'s own parsed operands that both call sites
     encode `arg=NULL` (not `sB_ANIM_ARG1` — a real, cited difference from
     the STATS_CHANGE arm), so the barrier's arg-check is now keyed per
     animType rather than a single fixed expression.
  2. **Wired `ENDTURN_RAIN`/`ENDTURN_SUN`** (F7/F9) in
     `runDoFieldEndTurnEffects` (`battleEndTurnOrchestration.ts`), same
     decrement/tick-script shape as the already-landed Sandstorm/Hail cases.
     Rain is genuinely different in shape from Sandstorm/Hail: one shared
     label (`BattleScript_RainContinuesOrEnds`) branching internally on a
     `cMULTISTRING_CHOOSER` byte (`B_MSG_RAIN_CONTINUES`/`_STOPPED` —
     `B_MSG_DOWNPOUR_CONTINUES` is source-marked `// unused`,
     `include/constants/battle.h:233`, and confirmed dead: no opcode this
     engine registers or plans to ever sets `B_WEATHER_RAIN_DOWNPOUR`).
     Sun uses two separate fixed-string labels
     (`SunlightContinues`/`SunlightFaded`), no chooser at all. Two small gaps
     the doc's own "zero new opcodes" claim didn't surface until actually
     wiring it: the `gRainContinuesStringIds` PRINTFROMTABLE table wasn't in
     the registered set yet (added to `battleScriptHitChainOpcode.ts`), and
     `B_MSG_RAIN_STOPPED` wasn't a resolvable named jumpifbyte comparand yet
     (added to `battleScriptSetByte.ts`'s shared `ATOMIC_VALUES`).
  - **Tier-1** (`battleScriptScreensWeatherOrchestration.test.ts`,
    `battleScriptStatbuffchangeOpcode.test.ts`): full Rain lifecycle (set →
    4 continues ticks, chooser pinned to `RAIN_CONTINUES` each tick → expiry
    tick, chooser flips to `RAIN_STOPPED`, weather clears → re-set
    succeeds) and full Sun lifecycle (same shape via the two-label path),
    both asserting zero `Random()` draws throughout; two direct unit tests
    confirming the widened PLAYANIMATION call sites now emit real
    `RAIN_CONTINUES`/`SUN_CONTINUES` animation events instead of halting.
- **Item 2 — STOPPED, not implemented, per the brief's own explicit
  condition ("If Castform IS somehow reachable, stop and report rather than
  half-porting the form-change table"):**
  - **Reachability check performed first, as instructed — result:
    Castform IS reachable**, contradicting entry 456's own hedge ("since
    Castform isn't a Frontier rental"). `src/data/gen/battle-frontier-mons.json`
    contains **2 real rental entries** (`FRONTIER_MON_CASTFORM_1` index 204,
    `FRONTIER_MON_CASTFORM_2` index 309, out of the full 882-entry catalog)
    — verified by parsing the JSON directly, not grep-count alone.
  - **This isn't a rare/defensive edge case — it's the common path
    whenever it applies.** `species_info.h:10883`:
    `.abilities = {ABILITY_FORECAST, ABILITY_NONE}` — Castform's *only*
    ability slot is Forecast (slot 2 empty), so every real Castform rental
    always has it. `CastformDataTypeChange` (`battle_util.c:2396-2429`)
    early-returns 0 only if `species != SPECIES_CASTFORM || ability !=
    ABILITY_FORECAST || hp == 0` — none of which can be true for a live
    Castform rental — so `BattleScript_WeatherFormChanges`'s loop
    (`data/battle_scripts_1.s:3999-4005`, walking `sBATTLER` 0..
    `gBattlersCount-1`, called from `BattleScript_MoveWeatherChange` and the
    ability-switch-in scripts at `:3962/3990/4055`, **not** from the
    end-turn continues scripts — confirmed by grepping every
    `call BattleScript_WeatherFormChanges` site) hits a genuine nonzero
    `form` value — `BattleScriptPushCursorAndCallback(BattleScript_
    CastformChange)` plus the real `SET_BATTLER_TYPE` table — every single
    time a weather-setting move is used while a Castform rental is one of
    the two active battlers (either side). A barrier here would not be
    dead defensive code; it would legitimately gate a real, drafted
    matchup, which is exactly the scenario brief's own OUT-OF-SCOPE line
    anticipated ("behind the (b) barrier unless reachability forces
    otherwise") and asked to escalate rather than decide solo.
  - **No `src/` change made for this item.** Per the brief, this is a
    report, not a half-port.
- **Item 3 (census) — regenerated, byte-identical to entry 456's baseline
  (confirms the prediction failure to materialize, cleanly):**
  **69/214 effects, 148/355 moves, 114/276 Factory-L50 (unweighted),
  1462/2957 weighted — zero change** from entry 456's own baseline (same
  numbers), `git diff docs/executable-frontier-census.md` empty.
  **The predicted flip (entry 456's own — "the four weather-setter effects
  flip executable once this opcode lands") did NOT materialize**, because
  item 2 (the one opcode gating it) was correctly not registered this
  session. **Still-gating barrier, named exactly:** `B_SCR_OP_
  TRYCASTFORMDATACHANGE` remains entirely unregistered (no dispatch entry
  at all — this is a static-reachability census, so runtime barrier depth
  doesn't matter, only presence), so `EFFECT_SANDSTORM`/`RAIN_DANCE`/
  `SUNNY_DAY`/`HAIL`'s own setter scripts still cannot reach `end` (they
  hang at `call BattleScript_WeatherFormChanges` → the missing opcode).
  Item 1 landing F7/F9 does not touch this gate at all (F7/F9 is the
  end-turn *continuation*, a wholly separate script from the *setting*
  move's own `BattleScript_MoveWeatherChange` tail) — the zero-flip result
  was expected going in, not a surprise found after the fact.
- **Next:** `B_SCR_OP_TRYCASTFORMDATACHANGE` needs a supervisor decision,
  not another worker guess: (a) accept a real, live (not merely defensive)
  `(b)` barrier for "a Castform battler is present" — meaning the four
  weather-setter effects would flip in the census (the no-Castform path is
  the vast majority of real matchups) but any battle that actually drafts
  Castform would legitimately barrier on its own weather-setting turn; or
  (b) scope in Castform's actual form/type-change table now (a materially
  bigger, separate piece of work — `SET_BATTLER_TYPE`, the four-form table,
  interaction with `AbilityBattleEffects`'s other `CastformDataTypeChange`
  call sites at `battle_util.c:2567/2588/2960`, likely its own sprite/
  species-data dependency check). Either path is a real, boundable next
  rung once chosen. `ENDTURN_ABILITIES`/`ITEMS`, Ingrain/Leech Seed/Wrap,
  and Factory-AI's `AI_CV_*` handler bodies remain untouched, as scoped.
- **Notes:** no presentation/`battleScene` edits. PAPERCUT: none logged —
  the doc's own live-verified operand dumps
  (`src/data/gen/battle-script-program.json`) made confirming the `arg=NULL`
  vs `sB_ANIM_ARG1` distinction and the exact `jumpifbyte`/`printfromtable`
  gaps fast and citation-backed rather than guessed.

---
## 457 — Factory-AI move-selection port complete: `AI_TryToFaint` + `AI_CheckViability` ported, mask 1/7 dispatch wired through `submitFactoryAiDecision`

- **State:** tree green at **217 test files / 2565 tests** (+3 test files
  this step's own additions — `factoryAiTryToFaint.test.ts` (10),
  `factoryAiCheckViability.test.ts` (6), `factoryAiScoredDecision.test.ts`
  (8); the file/test-count gap vs entry 456's stated 212/2521 baseline also
  includes two lane merges (`worker/animation-…`, `worker/side-…`) that
  landed between entry 456 and this session, not just this step's work),
  build green, ratchet unchanged (6/6 — CBM/TTF/CV barriers are
  discriminated-union returns, same non-`unsupportedBranch()`-call-site
  shape entry 455's own CBM module already established, so this pin isn't
  touched). Two per-rung commits (365a86a, 761069a), both green.
- **Did, per the work-item order:**
  1. **`AI_TryToFaint`** (`src/engine/factoryAiTryToFaint.ts`): reuses
     `damageCalc.ts`'s `calculateBaseDamage`/`applyStab`/
     `applyTypeEffectiveness` directly (crit forced ×1, variance = the
     per-slot setup `simulatedRNG` value, never a second formula) for both
     `if_can_faint`'s single-move estimate and
     `get_how_powerful_move_is`'s real cross-moveset "most powerful"
     comparison (source-verified `MOVE_MOST_POWERFUL`/`_NOT_MOST_POWERFUL`/
     `_POWER_OTHER` three-way classification, reusing CBM's own
     `sIgnoredPowerfulMoveEffects` set). Can-faint branch: +4 ordinary /
     +6 Quick Attack (both `score +2` and the `score +4` fallthrough fire)
     / +0 Explosion. Cannot-faint branch: -1 if out-damaged by a moveset
     sibling, then the one real draw — `if_random_less_than 80` gating a
     +2 for an exactly-x4-effective candidate (source's inverted-branch
     semantics ported exactly: the roll **succeeding** `<80` *skips* the
     bonus; ported `Cmd_if_type_effectiveness`'s own 40-baseline/
     STAB-remap quirk for the x4 classification, not a real damage
     re-estimate). 10 new Tier-1 tests via direct construction, including
     a hand-verified LCG seed pair (1→succeeds/+2, 4→fails/+0) proving both
     directions of the inverted branch.
  2. **`AI_CheckViability`** (`src/engine/factoryAiCheckViability.ts`):
     source-complete `if_effect` table, same shape as CBM's own (122
     `if_effect` lines / 90 unique `AI_CV_*` handlers, parsed directly from
     `data/battle_ai_scripts.s:652-2615`) — no entry → genuine zero
     contribution; an entry → named `"factory-ai-check-viability"`
     unsupported-branch barrier. No handler bodies ported this round (per
     the audit's explicit scope). 6 new tests: barrier + pass-through, two
     independent effects each.
  3. **Mask dispatch** (`factoryAiDecisionPolicy.ts`):
     `chooseFactoryAiScoredDecision`/`submitFactoryAiScoredDecision` (mask
     1 = CBM only, mask 7 = CBM+TTF+CV, same setup/tie draw shape as the
     untouched mask-0 policy) plus a top-level `submitFactoryAiDecision`
     dispatcher that reads `selectFactoryAiMask` and routes band 0-1 to the
     existing, unmodified `submitFactoryAiMaskZeroDecision`. A slot whose
     script hits a named barrier throws loudly (can't compute a score for
     that slot) instead of silently mis-scoring.
  4. **Tier-1** (`tests/factoryAiScoredDecision.test.ts`, 8 tests):
     mask-1 pinned by direct construction (Surf/RockSlide/BodySlam 3-way
     tie at 100 — CBM alone never rewards a merely-better type multiplier,
     confirming the audit's own §2 "mask-1 shape: NO" prediction).
     **All three banked mask-7 scenarios reproduce their exact policy draw
     ledger** — 11/11/13 (setup 4 + CBM `get_ability` 6/6/8 + tie 1) —
     starting each fixture's real, live-verified frame-100 `rngValue`
     (seed 1: unambiguous/tie both `249678687`, degenerate `2291141473`)
     advanced by the 8 documented pre-decision LCG steps (opponent's
     turn-1 hit-chain tail + player's 4-roll Pound chain + `BattleTurnPassed`
     + switch-AI's 2-roll pre-check, per the newest ground-truth doc
     section) — that 8-step offset is applied **only** by the test layer as
     a raw `advanceRngValue` shim, per this step's restated acceptance;
     switch-AI semantics itself is not ported anywhere in `src/`.
  - **Item 5 (`factoryBattleScriptFullTurnDecision.ts` integration) not
    started** — items 1-4 alone consumed the full session (see Notes);
    correctly deferred per the brief's own "do not start past ~45 min"
    guard rather than landing something rushed.
- **A genuinely new finding this session, beyond the ground-truth doc's own
  prose (found via a live oracle probe, not paper tracing):** the doc's §2.2
  narrative ("Surf wins cleanly") implicitly assumes turn 2's decision runs
  against a **full-HP** Marowak. It doesn't — probing
  `mechanic-factory-ai-unambiguous-off.json`'s frame 732 (`player.hp`) shows
  Marowak at **5/135 HP** by the time turn 2's `BattleAI_SetupAIData` runs
  (turn 1's own 2x Surf hit, ~130 damage, already landed). At 5 HP, Surf/
  Rock Slide/Body Slam can **all** faint the target — `AI_TryToFaint`'s
  can-faint +4 branch governs all three identically, producing a genuine
  **3-way tie**, not a clean "Surf is strongest" win via the
  cannot-faint/most-powerful branch the doc's prose describes. This doesn't
  contradict any pinned number (turn 2's actual pick was never directly
  observable in these fixtures — only its roll *count* is, which this
  session's 11/11/13 reproduction matches exactly) but it does mean the
  audit's own §2 "CheckBadMove+TryToFaint: YES, for both pick and roll
  count" claim is unverified for the *pick* half specifically. The Tier-1
  reproduction test uses **representative, not live-RAM-probed**
  Alakazam/Marowak stat magnitudes (real base stats, level-50-scaled, not
  exact oracle numbers) — the 3-way-tie outcome is robust to this
  imprecision (any real attack in this matchup clears 5 HP by a wide
  margin) but is not a byte-exact numeric match against oracle RAM.
- **Next:** item 5 (one integration test wiring
  `chooseFactoryAiScoredDecision`/`submitFactoryAiDecision` through
  `factoryBattleScriptFullTurnDecision.ts` for the trainer side); if
  pursued, a live RAM stat probe for Alakazam/Marowak's exact level-50
  stats would upgrade the mask-7 scenario tests from "representative" to
  byte-exact-verified; `AI_CV_*` handler bodies (16 reachable today, 90 at
  full registration — explicitly out of this step's scope, its own phased
  body of work per the audit's §3); CBM's own named-`AI_CBM_*`-handler
  barrier sizing (how many of the 122 executable moves hit one) is still
  unsized, flagged by entry 455, still unsized here.
- **Notes:** no presentation/census/opcode-registration changes (pure
  policy work, as scoped). PAPERCUT: none logged this session — the
  newest ground-truth doc section (caller-attribution probe) made the RNG
  model fully load-bearing and citable, which is exactly what made items
  1-4 tractable in one session despite their combined size.
  **Entry 455's roll-count gap: RESOLVED** — see
  `docs/factory-ai-ground-truth.md`'s 2026-07-25 instrumented
  caller-attribution section; the true AI-decision draw count is 13/13/15
  (not 15/15/17), the 2-roll delta was `Cmd_seteffectwithchance`'s
  opponent-tail instance + `BattleTurnPassed`'s `gRandomTurnNumber` draw,
  both decision-independent. This session's own port targets the
  13/13/15 figure minus switch-AI's 2 (11/11/13 policy-only draws, switch-
  AI modeled as a test-layer LCG offset, not ported).

---
## 456 — Screens/weather setters + `DoFieldEndTurnEffects` field loop registered (slices 1/2/3/5 of `docs/screens-weather-ground-truth.md` §6); Rain/Sun field case (slice 4) explicitly deferred

- **State:** tree green at **212 files / 2521 tests** (+2 files/+31 tests
  over entry 455's 210/2490), build green, ratchet green (new pin:
  `battleScriptDamagingWeatherOpcode.ts` → 3, each barrier has a reachability
  test AND a pass-through case). `verify-screens-weather-ground-truth.ts`
  reconfirmed live before AND after: **29/29 PASS** both times.
- **Did, per the doc's own §6 dependency-ordered slices:**
  1. **Screen/Mist setter opcodes** (`battleScriptSetSideStatusOpcode.ts`):
     `SETREFLECT`/`SETLIGHTSCREEN`/`SETSAFEGUARD`/`SETMIST`, source-complete
     (a) — no barriers, doubles-only message variant out of scope per the
     doc. `BattleScriptRulesContext` gained `sideTimers` (reflect/lightscreen/
     safeguard timer+battlerId per side, plus `mistBattlerId`) — `sideStatuses`
     now genuinely carries REFLECT/LIGHTSCREEN/MIST/SAFEGUARD, not just
     Safeguard; updated `battleScriptSwitchinOpcode.ts`'s Spikes-barrier
     comment and the ratchet's matching note to say so explicitly (the
     brief's own "widen deliberately" instruction).
  2. **`DoFieldEndTurnEffects` field loop** (`battleEndTurnOrchestration.ts`,
     `runDoFieldEndTurnEffects` replacing the old barrier-only stub): hosts
     F2/F3/F4/F5 (Reflect/Light Screen/Mist/Safeguard decrement — silent
     while >0, `BattleScript_SideStatusWoreOff`/`SafeguardEnds` fire only on
     the tick the timer reaches 0, matching doc §3d/§3f's live ledgers
     exactly) and F8/F10 (Sandstorm/Hail continues/damage/ends).
  3. **Weather setter opcodes** (`battleScriptSetWeatherOpcode.ts`):
     `SETRAIN`/`SETSUNNY`/`SETSANDSTORM`/`SETHAIL`, same shape, flat `=`
     assignment not `|=` (doc's load-bearing clobber finding, ported as-is).
     New `weatherTimer` field (`gWishFutureKnock.weatherDuration`).
  5. **Sandstorm/Hail damage loop** (`battleScriptDamagingWeatherOpcode.ts`):
     all 6 doc-corrected opcodes (`PLAYANIMATION_VAR`, `COPYARRAYWITHINDEX`,
     `WEATHERDAMAGE`, `ADDBYTE`, `JUMPIFARRAYNOTEQUAL`, `BICWORD`), each
     narrowed to the one concrete operand triple this loop actually uses —
     every other concrete call site of the three generic array/scratch
     opcodes (Triple Kick, Perish Song, Teeter Dance, Ghost Curse, link-
     battle/Palace loops, HitsAllNoUndergroundBonus, MoveUsedWokeUp) is one
     shared named barrier per opcode, each with a reachability + pass-through
     test. `WEATHERDAMAGE` models real type/ability immunity (ROCK/GROUND/
     STEEL + Sand Veil + underground/underwater for Sandstorm; ICE-only for
     Hail) and Cloud Nine field-wide suppression. New `battlerByTurnOrder`
     field (`gBattlerByTurnOrder`, populated ascending per
     `computeBattlerOrder`'s own documented limitation) backs
     `COPYARRAYWITHINDEX`'s per-battler loop index.
  - **Widened, not new:** `battleScriptJumpifwordOpcode.ts` now resolves
    `gBattleMoveDamage` (the loop's own `jumpifword CMP_EQUAL,
    gBattleMoveDamage, 0, ...` zero-damage skip) — an existing registered
    module gaining a modeled pointer, not a new barrier; its own stale test
    (previously asserting this exact site was unmodeled) rewritten to assert
    both branches taken/not-taken instead. Added `gMoveWeatherChangeStringIds`/
    `gSandStormHailContinuesStringIds`/`DmgStringIds`/`EndStringIds`/
    `gReflectLightScreenSafeguardStringIds`/`gMistUsedStringIds` to
    `PRINTFROMTABLE_TABLES`.
  - **4. Rain/Sun field case (F7/F9) — deliberately NOT wired, named per the
     brief's own "say exactly what remains" clause.** Real finding, not a
     skipped step: `BattleScript_RainContinuesOrEnds`/`SunlightContinues`
     both call the *non-var* `playanimation BS_ATTACKER, B_ANIM_RAIN_
     CONTINUES`/`B_ANIM_SUN_CONTINUES`, and the only registered PLAYANIMATION
     handler (`battleScriptStatbuffchangeOpcode.ts`) is narrowed to its own
     `B_ANIM_STATS_CHANGE` arm — any other animType is that module's own
     barrier. Widening it is a real, separate registration (a new animType
     branch + its own barrier-count change in a module this step doesn't
     own) that this session's cap did not reach. `runDoFieldEndTurnEffects`
     still returns the same `case-barrier` shape the old stub did for
     `ENDTURN_RAIN`/`ENDTURN_SUN`, now with this exact reason cited.
  - **Tier-1 tests** (`battleScriptScreensWeatherOrchestration.test.ts`,
    `battleScriptDamagingWeatherOpcode.test.ts`, 30 new): setter fail/success
    for all 8 moves; **Light Screen full lifecycle** (set → 4 silent
    decrement ticks → expiry message tick → re-set, doc §3d's exact timer
    sequence); **Safeguard** identical shape with its own distinct expiry
    script; **Sandstorm set → 4 damage ticks (immune ONIX untouched every
    tick, SUNKERN chipped exactly `floor(105/16)=6` each tick, 105→99→93→
    87→81) → expiry with zero further damage → re-set**, doc §3e's exact
    ledger; zero `Random()` draws asserted throughout (doc §4). All 3 new
    (b) barriers (addbyte/bicword/jumpifarraynotequal unmodeled operand)
    have both a reachability test and a pass-through case.
- **Census regenerated:** **65→69/214 effects, 144→148/355 moves, 111→
  114/276 Factory-L50 (unweighted), 1416→1462/2957 weighted.** Exactly 4
  effects flipped: `EFFECT_REFLECT`/`EFFECT_LIGHT_SCREEN`/`EFFECT_SAFEGUARD`/
  `EFFECT_MIST`. **A predicted flip that did NOT materialize:**
  `EFFECT_SANDSTORM`/`EFFECT_RAIN_DANCE`/`EFFECT_SUNNY_DAY`/`EFFECT_HAIL`
  stayed blocked — even with every end-turn-loop opcode this session
  registered, the *setting move's own script* still can't complete because
  `goto BattleScript_MoveWeatherChange` → `call BattleScript_WeatherFormChanges`
  needs one more opcode, `B_SCR_OP_TRYCASTFORMDATACHANGE` (Castform's
  ability-triggered species/form change) — a genuinely new finding neither
  ground-truth doc named, entirely unrelated to the end-turn machinery this
  step targeted, and out of this step's scope to register.
- **Next:** widen `Cmd_playanimation` to cover `B_ANIM_RAIN_CONTINUES`/
  `B_ANIM_SUN_CONTINUES` (own barrier-count change in
  `battleScriptStatbuffchangeOpcode.ts`) to land F7/F9; register
  `B_SCR_OP_TRYCASTFORMDATACHANGE` to flip the 4 weather-setter effects to
  executable (Castform's own species/type-change logic — likely wants its
  own reachability check first, since Castform isn't a Frontier rental);
  `ENDTURN_ABILITIES`/`ITEMS1`/`ITEMS2` (doc step 8, explicitly out of
  scope); Ingrain/Leech Seed/Wrap (doc step 5). Entry 455's AI roll-count
  gap above is untouched by this session.
- **Notes:** no presentation/`battleScene` edits. PAPERCUT: none this
  session (the doc's own live-verified ledgers and exact opcode operand
  dumps made this a comparatively low-friction registration once the
  `BattleScript_DamagingWeatherContinues` PLAYANIMATION_VAR/Castform-tail
  distinction was found — the two genuinely separate blockers (Rain/Sun's
  animation opcode vs. Castform's form-change opcode) weren't called out
  as separate in the prep doc's own §6 slice 4/5 split, so budget a beat to
  re-derive that split if resuming this area).

