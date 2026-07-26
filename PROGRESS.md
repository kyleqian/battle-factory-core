# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 459 — Full-turn reducer now consumes the REAL Factory-AI trainer policy (item 1) AND the non-terminal forced-switch full-turn variant (item 2); item 3 (player-side variant) not started, per the brief's own time cap

- **State:** tree green at **217 files / 2570 tests** (+0 files/+2 tests
  over entry 458's 217/2568 — both items only added tests to the existing
  `factoryBattleScriptFullTurnDecision.test.ts`), build green, ratchet
  unchanged (6/6 — neither item touched a barrier call site). Two per-rung
  commits (`b2057ba`, `98e1315`), both green.
- **Item 1 — real AI trainer decisions in the full-turn cycle, done:**
  generalized the trainer side of `factoryBattleScriptFullTurnDecision.ts`
  to a real 4-move set (`FactoryFullTurnBattlerConfig.moves` optional
  override, `trainerLegalDecisions()` enumerating nonzero moveset slots,
  the trainer-command branch indexed by the submitted `moveSlot` instead of
  a hardcoded 0) so `submitFactoryAiDecision` (entry 457's mask dispatch)
  can drive the trainer's per-turn command through the SAME
  `reduceFactoryFullTurnDecision` reducer — **no new shared boundary type
  and no reducer-logic change needed**: `submitFactoryAiDecision`'s own
  RNG-synchronizing wrapper already advances the kernel's cumulative cursor
  with the policy's draws before calling the reducer, and the reducer's own
  `rngBefore`/`rngAfter` reconciliation (entry 450's own subtlety) already
  accounts for whatever the context's cursor holds going in — composition
  just worked, confirming ROADMAP S10's decision-source-agnostic-kernel
  architecture. New integration test: two real turns where the trainer's
  move is chosen by the live mask-7 policy from Surf/RockSlide/BodySlam/
  Thunderbolt against a Ground-type target — Surf wins unambiguously both
  times (verified via direct construction against 3 different RNG seeds
  before writing the test: same [100,99,99,89] score line and single-slot
  `bestMoveSlots` every time, so the pick needs no seed-dependent tie-break)
  — with the complete per-turn draw ledger (11 policy draws + both 4-roll
  hit chains, 19 then 38 cumulative) pinned as one continuous LCG stream
  and the chosen move (`moveSlot: 0`) asserted both turns.
- **Item 2 — non-terminal forced-switch full-turn variant, done:** added an
  optional trainer-side bench (`trainerBenchHp`/`trainerBenchOverride`,
  party slots 1/2 — slot 0 is always the active trainer mon in this
  reducer's own layout, unlike `factoryBattleScriptTerminalDecision.ts`'s
  active-at-slot-2 convention). The reducer's `faint1.kind === "resumed"`
  branch (already wired when this module first landed, entry 450) needed
  **zero logic changes** — it already skips the second action and runs
  straight to `runBattleEndTurnOrchestration` per `cancelallactions`. New
  integration test reused the existing "mid-turn KO" fixture's exact
  numbers verbatim, just adding a healthy MACHOP bench (entry 447's own
  proven switch-in candidate — real move, passes
  `GetMostSuitableMonToSwitchInto`'s pass-1 gate) — passed on the first
  run. Pinned: outcome is `decision-required` (not terminal), the next
  boundary names battler 1 rebuilt as MACHOP (species/hp 145/partyIndex 1/
  neutral stat stages/clean status), the player's own move shows exactly
  one PP use (the second action never dispatched — there is no second
  Strength cast to draw RNG for), and `rng.calls` stays at exactly 4 (the
  killing blow's own hit chain — the forced-switch dance and this
  scenario's quiet, weather/status-free end-turn both draw zero; a
  dispatched second action would have made this 8, not 4).
- **Item 3 (player-side variant) — not started**, per the brief's own
  explicit time cap ("do not start past ~40 min") and its own conditional
  framing ("if BOTH land and cap allows") — items 1+2 together, plus the
  upfront reading of AGENTS.md/PROGRESS.md/the two source modules, the
  scratch-tested AI scoring verification, and both green rungs, filled the
  bounded worker session's budget. No shape gap found for item 3 specifically
  (not attempted far enough to surface one) — the natural next step would
  reuse `factoryBattleScriptTerminalDecision.ts`'s own `playerBenchHp`/
  `playerBenchOverride` precedent (already proven there) ported onto this
  reducer's player-side party the same way item 2 just did for the trainer
  side, plus surfacing the `"player-choice-required"` fork this reducer
  currently just throws on (both `faint1`/`faint2` branches already name
  the exact throw site: "outside this reducer's modeled domain").
- **Notes:** no presentation/census/opcode-registration changes (pure
  reducer/config work, as scoped). Both items composed entirely from
  already-landed machinery (entries 447/450/457) — no genuine shape gap
  surfaced needing escalation. PAPERCUT: none logged — a scratch vitest
  file under `tests/` (deleted after use, never committed) let the exact
  mask-7 scoring/draw-count numbers get verified against 3 RNG seeds before
  the real test was written, instead of hand-deriving them and discovering
  a mismatch after the fact.

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
