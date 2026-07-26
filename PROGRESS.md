# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 460 — [SUPERVISOR WIND-DOWN 2026-07-25 ~21:50] session summary

- **State:** tree committed and green at **218 files / 2582 tests**, build
  green, census live-verified **73/214 effects, 152/355 moves, 118/276
  Factory-L50 executable** (session start: 53/105/77; all 25 census
  self-checks pass), single main worktree, zero unmerged branches, zero
  stale worktrees. **No DEFERRED entries — nothing blocks the next
  `run-supervisor.sh`.** No usage/rate limits hit all session.
- **Session (~17 workers over 3 lanes, every outcome supervisor-verified
  live; zero cap-kills, one launcher-arg mistake self-caught):**
  - **Main (7 steps):** forced-switch §4 slice 10 (player-side
    forced-switch decision request through `submitBattleDecision` — §4 list
    1-10 COMPLETE); MOVE_EFFECT_CONFUSION+FLINCH registered (census
    105→122 moves; both feed the existing canceler reducers, RNG-threading
    bug found+fixed); presentation-seam window 2 (`turn1-rockslide.json`
    256/256 from kernel events, first production `stat-stage-change`
    emission, 27-trace sweep clean); Factory-AI port in two steps
    (CheckBadMove full incl. get_ability redraw semantics, then
    TryToFaint + CheckViability-as-table + masks 0/1/7 dispatch — all 3
    banked scenario ledgers reproduce at 11/11/13 policy draws);
    screens/weather setters + full `DoFieldEndTurnEffects` (F2-F5 +
    F7-F10, census →148 moves); full-turn reducer consuming the REAL
    mask-7 policy + non-terminal forced-switch full-turn variant (entry
    459 — Gate-5's submission-boundary claim now demonstrated for L50
    singles move selection).
  - **Side (6 scouts/steps, all merged):** screens/weather ground truth
    (29/29 verify, corrected end-turn doc's F8/F10 opcode claim);
    turn1-rockslide seam consumer map (16 inputs, staged proof-of-events);
    ISSUES #44 census fix (support set now mechanically derived, +8
    ground-truth checks); AI port-subset audit (masks per band; two doc
    corrections supervisor-re-verified against source); the
    **RNG caller-attribution probe** (closed entry 455's 2-roll gap:
    window totals bundle a trailing opponent proc draw +
    `BattleTurnPassed`'s `gRandomTurnNumber`, both decision-independent —
    `tools/probe/attribute-factory-ai-random-callers.py`);
    Ingrain/Leech Seed/Wrap ground truth (18/18 verify — Ingrain/Wrap
    end-turn bodies already opcode-complete); `TRYCASTFORMDATACHANGE`
    registered per supervisor (a)/(b) decision (census →152 moves; a
    fielded Forecast Castform is the one named barrier; runtime
    weather-form loop next needs `addbyte`/`jumpifbytenotequal` widened
    past `gBattleCommunication`-only).
  - **Animation (7 steps, stacked 7-deep, all merged):** MOVE_GROWTH
    **`exact`** 63/63 both orientations (residual cracked as per-mechanism
    framebuffer display lag, scale+2/tint+1); MOVE_FUTURE_SIGHT `partial`
    85/114 (SetPsychicBackground ported+RAM-probed incl. the rotation-pause
    cadence; defect B killed by register probe; defect A parked with the
    monbg mechanism RAM-confirmed and a GROW-direction instrument named);
    MOVE_CONFUSION `partial` 108/140 (zero net-new components; window 1
    19/20; window 2 carries defect A — cross-move triangulation banked).
    Coverage **21 exact / 5 partial**. PSYCHIC noted as cheap once staged.
- **Next (in order):** main — full-turn player-side forced-switch variant
  (entry 459's named remainder), CheckViability handler bodies phased by
  the audit's 16-reachable-handler table, `addbyte`/`jumpifbytenotequal`
  sBATTLER widening (unblocks the runtime weather-form loop),
  Ingrain/Leech Seed/Wrap registration (ground truth banked, mostly
  opcode-complete already), seam window 3, ENDTURN_ABILITIES/ITEMS
  breadth. Animation — defect A via the OAM double-size-window instrument
  (promotes FUTURE_SIGHT+CONFUSION together), then PSYCHIC. All prep docs
  carry rerunnable verify scripts.
- **Notes:** PAPERCUTS +1 (dense comparators bbox only the first diff
  frame — partially retired same-day by `confusionPortable.ts`'s
  `--per-frame-bbox`). Supervisor decisions this session, both recorded in
  ROADMAP/PROGRESS: AI-port acceptance restated to policy-own draws
  (11/11/13) after the attribution probe; Castform (a)/(b) split
  registered with the honest fielded-Castform barrier. Memory file updated
  with session tactics (launcher-pipeline exit masking; cross-move
  triangulation; sRandCount+LR attribution probe; point-in-time family
  costs; probe-then-decide).

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

