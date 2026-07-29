# Facility round loop / whole-battle integration scout

> **STATUS FROZEN — 2026-07-28 23:09 PDT, engine HEAD
> `26b1fc40ff0e3c4a36b3b5f1d84947060e1ed41e`.** This document describes that
> tree, not an evergreen design. Current-engine evidence was re-read at this
> HEAD with:
>
> ```text
> rg -n "resolveRoundBattle\(" src
>   -> src/engine/roundController.ts:309 only
> rg -n "createFactoryFullTurnBattleState\(" src
>   -> src/engine/factoryBattleScriptFullTurnDecision.ts:543 only
> rg -n "submitFactoryFullTurnDecision\(" src
>   -> definition at :1908; production use only in stagedBattleTurn.ts:127,136
> rg -n "submitFactoryAiDecision\(" src
>   -> no production call site
> rg -n "GenerateInitialRentalMons|generate.*Rental|rentalSelection" src/engine
>   -> no engine implementation
> rg -n "resolveRoundBattle|BattleResolution|battleResolutionAdapter" \
>   PROGRESS-archive.md ROADMAP.md src tests
> ```
>
> Baseline at freeze: Battle Scene OFF `bin/oracle info` healthy; `npm test`
> passed **452 files / 4885 tests**. No live battle-start probe was added in
> this scout; §4 specifies the bounded probe that should be the next evidence
> rung. All C citations below were re-read from the pinned
> `reference/pokeemerald` checkout at this status.

## 1. What Gates 2–5 actually require

The gate text is broader than “make seven battles loop”:

- **Gate 2, parameterized oracle** requires legal Factory selection inputs,
  complete pre-battle party construction, normal controller initialization,
  read-only semantic/RNG captures, and no transient-state injection
  (`ROADMAP.md:1366-1393`). Most of it exists in the shared battle lab,
  including complete `overrides.parties` and real switch-in hooks
  (`ROADMAP.md:1415-1446`). Its two named remainders are Noland and the
  pre-commentary checkpoint (`ROADMAP.md:1448-1459`); neither blocks ordinary
  Gates 3–6 mechanics verification.
- **Gate 3, general kernel** requires source-derived action selection through
  terminal outcome, one explicit persistent context/RNG cursor, semantic
  events, and a deterministic public decision API independent of presentation
  (`ROADMAP.md:1460-1480`). The current full-turn reducer is a substantial
  checkpoint, not a completed gate: its initial state is still staged.
- **Gate 4, persistent mechanics** requires every status, volatile, stage,
  weather/side condition, item and ability lifecycle, not merely the named
  examples (`ROADMAP.md:1481-1488`). The current ability/item census is close
  to closed, but this gate remains unticked and whole-battle initialization
  must not assume the census alone completes it.
- **Gate 5, facility integration** requires initial rentals, every real
  opponent party, native Factory AI, favorite-type/style commentary, arbitrary
  trainer/party presentation, voluntary and forced switching, real outcomes
  into the round controller, and AI limitation/scoring/tie/history/known-info/
  switch/item/policy coverage through the common submission boundary
  (`ROADMAP.md:1489-1500`).

One requested phrase needs correction: **“selected unique UI windows pass
pixel compare” is Gate 6, not Gate 5** (`ROADMAP.md:1501-1508`). It still names
the eventual presentation proof, but it must not be used to declare Gate 5
complete while its facility rules are missing.

### Already checkpointed, not hypothetical

ROADMAP's executable-frontier step (iv) is complete: party HP synchronization,
faint orchestration, real terminal boundaries, the pure `BattleResolution`
adapter, and a zero-fixture win/loss proof are recorded at
`ROADMAP.md:1233-1251`. The contemporary ledger gives the exact chain:
`submitBattleDecision` → real kernel terminal → adapter →
`resolveRoundBattle`, including win, loss, swap offer and battle-index
increment (`PROGRESS-archive.md:9745-9791`).

Current code confirms that checkpoint:

- `BattleResolution` is `{outcome, playerParty, opponentParty, rngValue}`
  (`src/engine/roundController.ts:62-68`).
- `deriveBattleResolutionFromTerminalBoundary` overlays live party HP/status,
  maps draw to the Factory loss path, and passes through terminal RNG
  (`src/engine/battleResolutionAdapter.ts:134-170`).
- The integration test genuinely reaches both player-win and trainer-win from
  a kernel decision, but begins from a **staged last-mon KO**
  (`tests/battleResolutionAdapterIntegration.test.ts:82-183`).

That proof closes the outcome *seam*. It does not create a battle at battle
start or connect the seam to production flow.

## 2. Current-state map

### 2.1 `roundController.ts`

#### Public API and state

The controller exposes:

1. `createRoundController(BattleScenario)` (`roundController.ts:102-127`);
2. presentation acknowledgement and phase advance
   (`:134-161`, `:222-290`);
3. `resolveRoundBattle(state, BattleResolution)` (`:309-375`);
4. `chooseRoundSwap(state, decision)` (`:384-432`).

Its rule state is only phase, battle index, three simplified player mons,
current opponent, opponent-id history, RNG, last battle and last swap
(`roundController.ts:20-60`). A mon is only
`{id,species,maxHp,hp,status}` (`battleScenario.ts:10-28`): no set id,
personality, IV/EV, ability slot, item, moves, PP, derived stats or battle
history exists at this layer.

`resolveRoundBattle` validates party identity, clones the real resolution,
threads its RNG, and selects loss / seventh win / ordinary win
(`roundController.ts:309-374`). After an ordinary win, presentation leads to
the swap choice. An accepted swap copies one simplified opponent `BattleMon`
into the chosen player slot (`:384-432`).

#### What feeds it today

At this frozen HEAD, `rg "resolveRoundBattle\\(" src` finds only its
definition. `core.ts` can create a controller from an explicitly injected
`battleScenario` (`core.ts:291-319`) and acknowledge terminal presentation
(`core.ts:351-388`), but it never advances battle-start/win/swap phases or
feeds a kernel resolution. Thus the 2026-07-25 zero-fixture test proves type
and rules compatibility, not a running facility loop.

There are two scenario shapes:

- fixture scenarios preselect seven explicit opponents
  (`battleScenario.ts:36-48`, `:124-169`);
- Factory-trainer scenarios select real trainer IDs and retry prior IDs, but
  still require an explicit `opponentPool` whose parties are fixtures
  (`battleScenario.ts:50-70`, `:212-250`).

Only trainer identity/range/history RNG is live. `selectFactoryTrainer`
source-ports one draw per attempt and the battle-6 history omission
(`factoryTrainerSchedule.ts:130-193`); the seven-selection helper is
`:196-235`. It does **not** generate those trainers' legal three-mon parties.

#### Carryover is “heal between battles,” not HP persistence

After swap presentation, the controller calls `healBattleParty`, then starts
the next battle (`roundController.ts:251-282`). That helper restores HP and
clears status (`battleScenario.ts:253-258`). This direction matches the real
Factory:

- the pre-battle room restores held items and calls `HealPlayerParty` after
  every win (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:54-60`);
- the battle room calls `HealPlayerParty` immediately before every battle
  (`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:74-85`);
- `HealPlayerParty` restores HP, every move's PP, and permanent status
  (`script_pokemon_util.c:30-58`);
- `RestorePlayerPartyHeldItems` restores the source item from the rental set
  (`battle_factory.c:714-728`).

Therefore **HP, PP and status do not persist as damage/depletion between
Factory battles**. Rental identity and an accepted swap persist; the party is
fully healed and its original held items are restored. The current controller
gets HP/status right at its narrow type level, but cannot express PP or held
item restoration. Its accepted swap also loses rental-record fields needed by
future party construction.

#### Missing facility state

A real round still needs:

- generated six-mon rental draft state and the selected three rental records;
- generated opponent set IDs and complete constructed Pokémon for each battle;
- one shared RNG cursor across generation, battle, swap and next generation;
- rental-swap count/rank bookkeeping, battle number, challenge/win streak,
  challenge terminal status, pause/retire and Noland policy;
- source `rentalMons` identity (`monId`, personality, IV, ability slot) so an
  accepted swap affects later party construction;
- PP/item healing and restoration;
- a production owner that creates a kernel battle from each controller
  `battleStart`, consumes terminal results, and advances the phases.

The fixed `factoryWinStreak` stored in scenario selection is never incremented
inside a round (`battleScenario.ts:175-180`; selection uses it at
`roundController.ts:189-195`). Battle index advances, but facility streak
state does not.

### 2.2 Generated corpus versus generators

Gate 1's corpus and `factory-round-policy.json` exist. The policy even records
the rental ranges, rank thresholds, fixed IVs and round-flow anchors. That is
data, not a runtime generator.

Current runtime breadth is:

- exact trainer selection/retry: `factoryTrainerSchedule.ts`;
- a **canonical battle-1-only** opponent personality/transition helper with
  explicit trace timing gaps (`opponentGen.ts:1-11`, `:123-180`);
- canonical swap-screen rental reconstruction in
  `factorySwapPresentation.ts`, not a generic initial-rental generator.

There is no engine port of `GenerateInitialRentalMons`
(`battle_factory.c:509-601`) or generic `GenerateOpponentMons`
(`battle_factory.c:303-377`). The former applies range rank plus
species/set/item retries; the latter combines trainer retry, rental-species
exclusion, Level-50 high-tier exclusion, and opponent species/item uniqueness.
The generic implementation must also construct source personalities/stats/
abilities/items, rather than reuse `opponentGen.ts`'s canonical constants.

Favorite type and style are likewise absent as generic engine rules.
Ground truth is `GetOpponentMostCommonMonType`
(`battle_factory.c:603-655`) and `GetOpponentBattleStyle` (`:657-690`);
`postwin.ts` currently only contains canonical dialogue strings.

### 2.3 The staged full-turn kernel

`FactoryFullTurnConfig` supplies the battle's active battlers, optional bench
records, weather, absent flags and **already-drawn**
`initialRandomTurnNumber` (`factoryBattleScriptFullTurnDecision.ts:232-275`).
`createInitialRules` builds party slots and a `BattleScriptRulesContext`
directly (`:469-540`), then immediately publishes the first player command
request (`:543-557`).

This is why current multi-turn tests are not from battle start:

- the party slice is caller-authored (`:469-489`);
- actives and all derived battle stats are caller-authored (`:377-450`);
- weather is injected (`:532`);
- the initial turn number is injected, defaulting to `0xffff` (`:533`);
- entry hooks and both battle-start RNG writes have already been skipped when
  the first request appears.

After that anchor, the machinery is strong:

- the persistent context carries complete six-slot party records including
  personality, ability slot, stats, HP/status, item, moves, PP and PP bonuses
  (`battleScriptRulesContext.ts:527-577`);
- player legal commands include usable moves and every healthy bench switch,
  with trap/lock gates (`factoryBattleScriptFullTurnDecision.ts:1134-1197`);
- player then trainer commands are collected through the same typed boundary
  (`:1597-1660`);
- priority/speed/Quick Claw and conditional tie RNG are source-shaped
  (`:1701-1721`);
- both actions, faint handling, end-turn processing and next request persist
  on one RNG/context (`:1723-1905`);
- player forced switch is a public `forced-switch` request and resumes the
  halted faint script (`:1491-1594`);
- trainer faint replacement is handled by the source switch orchestration;
  voluntary player switching reuses switch scripts and entry hooks
  (`:909-969`);
- real terminal outcomes exist (`tests/factoryBattleScriptFullTurnDecision.test.ts:959-998`),
  and two-turn persistence plus the continuing-turn draw is pinned
  (`:803-846`).

The current presentation harness deliberately narrows this again:
`stageFactoryFullTurnBattle` takes one initial state plus two already-authored
submissions (`stagedBattleTurn.ts:24-32`, `:77-106`), and on confirm insists
that the turn ends at the next ordinary player command (`:124-158`). It cannot
present a forced-switch or terminal result.

### 2.4 Decision surface: what is and is not missing

The generic boundary already represents:

- command requests with legal move/switch decisions
  (`battleDecisionBoundary.ts:25-50`);
- forced-switch requests (`:52-63`);
- terminal player-win/trainer-win/draw (`:71-101`);
- deterministic submission validation, reducer-local RNG, semantic events and
  a next-decision/barrier/terminal result (`:769-850` and following).

For one whole **singles** battle, the shape is sufficient for:

- both sides' first move commands: yes, player then trainer;
- player voluntary switch: yes;
- player forced switch: yes;
- trainer forced replacement after a faint: yes, internally automated;
- terminal boundary and party/RNG extraction: yes.

The gaps are lifecycle and policy, not a new terminal union:

1. No battle-start boundary initializes the context and entry hooks before the
   first command.
2. Trainer command enumeration is move-only; the module explicitly calls
   trainer voluntary switching out of scope
   (`factoryBattleScriptFullTurnDecision.ts:1173`).
3. `BattleCommandDecision` has no item action. That does not block a
   constrained first whole battle, but Gate 5's AI switch/item clause must be
   settled from Factory source rather than silently declared unreachable.
4. `submitFactoryAiDecision` correctly enters through `submitBattleDecision`
   (`factoryAiDecisionPolicy.ts:1054-1082`), but has no production caller. Its
   tests build the scored AI view by hand
   (`factoryBattleScriptFullTurnDecision.test.ts:1019-1105`); there is no
   generic rules-context/corpus → AI-view adapter carrying battle history and
   known information.
5. Both AI composition paths reject forced-switch requests
   (`factoryAiDecisionPolicy.ts:420-468`, `:1004-1051`). The full-turn faint
   orchestrator currently owns trainer replacement instead, so the ownership
   contract needs to be made explicit before Gate-5 AI switching tests.

### 2.5 Presentation seam relevant to later pixel acceptance

The kernel emits ordered semantic events with optional exact interpreter
provenance (`battleDecisionBoundary.ts:119-164`). The generic Scene-OFF
projection currently understands used-move text, PP, HP, **accuracy-only**
stat changes, turn end and an ordinary next-command menu
(`sceneOffPresentation.ts:236-346`). It explicitly rejects other stat names
and requires a nonterminal command boundary (`:290-340`).

Exact existing windows also use provenance resolvers for faint, damaging,
self-stat-up and opponent-stat-down shapes
(`presentationEventWindowBridge.ts:1-240`). These are the named seam assets
for eventual selected-window compares. They are not a whole-battle
presentation driver, and most `battleScene.ts` remains the tracked turn-keyed
debt.

## 3. Battle-start ground truth

### 3.1 Ordered initialization in `BattleStartClearSetData`

`BeginBattleIntro` calls `BattleStartClearSetData` before the intro controller
chain (`battle_main.c:3019-3024`). In exact source order:

| Order | Source initialization | Current engine status |
| --- | --- | --- |
| 1 | `TurnValuesCleanUp(FALSE)`, then clear all `SpecialStatus` records (`battle_main.c:3040-3041`; definitions `:4857-4903`) | Most protect/special-status fields exist and staged actives begin zero (`factoryBattleScriptFullTurnDecision.ts:297-374`), but there is no lifecycle call. |
| 2 | For four battlers: clear `gStatuses3`, entire `DisableStruct`; set `isFirstTurn=2`; clear unused battler byte, last move/landed/result/printed, last-hit type/by, locked move, resource flags, Palace fields (`battle_main.c:3043-3062`) | History/locked/volatile fields generally exist and default zero (`fullTurnDecision.ts:297-374`, `:494-524`). **Gap:** staged active `isFirstTurn` inherits zero at `:373`, not source 2; no intro/pre-turn decrement derives turn-1 value. Some last-hit/Palace-only fields are untracked. |
| 3 | Clear both `gSideStatuses` and entire `SideTimer` records (`battle_main.c:3064-3071`) | Context defaults side statuses/timers to zero (`battleScriptRulesContext.ts:2616-2627`); currently implicit, not lifecycle-owned. |
| 4 | Attacker=0, target=0, weather=0; clear `WishFutureKnock`; hit marker=0 then set NO_ANIMATIONS for Scene OFF (`battle_main.c:3073-3091`) | Selectors begin null rather than source 0; fresh weather should be zero but staging can inject it (`fullTurnDecision.ts:501-514`, `:532`). Wish/future/knock and hit-marker fields exist/default zero. Scene OFF is presentation policy, not represented by the staged rules initializer. |
| 5 | Copy battle style; clear multi-hit, outcome, controller flags, Payday, both script stacks (`battle_main.c:3093-3100`) | Multi-hit/outcome/Payday default zero (`fullTurnDecision.ts:504-514`; context defaults at `battleScriptRulesContext.ts:2508-2537`). Controller/script stacks belong to the VM/scheduler, but no fresh-battle owner establishes the source moment. |
| 6 | Clear all battle communication, pause counter, damage, intro flags, animation counters, level-up flag, absent flags; initialize Safari/run, wild song and money multiplier (`battle_main.c:3102-3118`) | Communication 0/1, damage, animation counters, absent flags and money multiplier are modeled/defaulted (`battleScriptRulesContext.ts:2528-2545`, `:2560-2563`, `:2593-2609`). Intro/Safari/wild/level-up fields are absent and irrelevant to ordinary Factory rules unless presentation needs them. |
| 7 | For eight halfword slots: last-taken move, used/choice/changed items and four last-taken-from rows reset; set every AI/ordinary switch target to `PARTY_SIZE`; clear EXP/Arena flags (`battle_main.c:3120-3138`) | Choice/changed/used item arrays and `monToSwitchIntoId=6` default correctly (`battleScriptRulesContext.ts:2460-2489`, `:2570-2577`). Last-taken matrices/EXP/Arena flags are partly or wholly untracked. |
| **8** | **RNG draw A:** `gRandomTurnNumber = Random()` (`battle_main.c:3140`) | **Missing lifecycle draw.** Staging instead receives `initialRandomTurnNumber`, default `0xffff` (`fullTurnDecision.ts:239-245`, `:533`). |
| 9 | Clear `BattleResults`, calculate enemy shiny flag, clear Arena lost-mon counts (`battle_main.c:3142-3149`) | Results/Arena accounting are untracked; ordinary Factory terminal rules do not currently read them. |

There are no other `Random()` calls in this function. Party-to-active battler
construction occurs in the intervening intro/controller chain, not in this
function; the current full-turn config directly supplies the result.

### 3.2 Ordered `TryDoEventsBeforeFirstTurn`

After both send-outs, the intro initializes the ability/item counters and
weather-done flag, then selects `TryDoEventsBeforeFirstTurn`
(`battle_main.c:3769-3773`, `:3813-3817`). Its order is:

1. Wait until controller flags are idle (`:3847-3848`).
2. On the first pass, initialize `gBattlerByTurnOrder` to identity, then
   stable-sort fastest to slowest with
   `GetWhoStrikesFirst(..., ignoreChosenMoves=TRUE)` (`:3850-3861`).
3. Apply overworld weather once, yielding to its script if it has an effect
   (`:3863-3868`).
4. Apply each active's `ABILITYEFFECT_ON_SWITCHIN`, fastest to slowest,
   yielding after each visible effect (`:3869-3879`). This sets weather
   abilities, Intimidate/Trace pending bits, Forecast and Cloud Nine/Air Lock
   behavior (`battle_util.c:2485-2600`).
5. Resolve pending Intimidate activations, then pending Trace activations,
   each able to yield (`battle_main.c:3880-3883`;
   `battle_util.c:3003-3073`).
6. Apply each switch-in item fastest to slowest, yielding on an effect
   (`battle_main.c:3884-3894`). The switch-in item cases are Double Prize and
   White Herb (`battle_util.c:3303-3329`), neither draws RNG.
7. Set all switch targets to `PARTY_SIZE`; clear chosen actions and moves
   (`battle_main.c:3895-3900`).
8. Run `TurnValuesCleanUp(FALSE)` and `SpecialStatusesClear`; snapshot absent
   flags; clear message window; set the next main function to action selection;
   reset sent-mon knowledge (`:3901-3906`).
9. Clear communication, flinch, turn-effect/faint/wish/perish/counter/
   move-end trackers and move-result flags (`:3908-3921`).
10. **RNG draw B:** `gRandomTurnNumber = Random()` (`:3923`).
11. Run the Arena-only opening branch if applicable (`:3925-3929`); ordinary
    Factory singles skips it. The following callback begins
    `HandleTurnActionSelectionState`.

Fresh-battle entry hazards are absent because both side-status records were
cleared at `BattleStartClearSetData:3064-3071`. The pre-first-turn path does
not call the ordinary `Cmd_switchineffects` Spikes branch. Weather abilities,
Intimidate and Trace are still real battle-start hooks.

### 3.3 Every RNG draw from these two functions to first selection

For Factory **singles**:

| Position | Draw | Gate and consumer |
| --- | --- | --- |
| A | unconditional `Random()` at `battle_main.c:3140` | Stored before the intro. During pre-turn sorting, Quick Claw reads this value through `GetWhoStrikesFirst(TRUE)` (`battle_main.c:4653-4688`). |
| A+1, conditional | `Random() & 1` only if the two effective speeds are tied during the pre-hook sort (`battle_main.c:3850-3861`, helper `:4722-4749`) | Determines fastest-to-slowest entry-hook order. A Quick Claw proc can itself create a tie if both effective speeds become `UINT_MAX`. |
| B | unconditional `Random()` at `battle_main.c:3923` | Written only after weather/ability/item hooks and all first-turn cleanup. This is the value visible to turn-1 action ordering after commands are selected. |

There is no switch-in-hook RNG in ordinary singles: Trace's random opposing
slot exists only when both opposing doubles slots are valid
(`battle_util.c:3026-3032`); the other listed switch-in abilities and both
switch-in item cases draw none. Once action selection begins, Factory AI and
later action-speed ties may draw separately; those are not part of the two
functions audited here.

**Overwrite verdict: YES.** The `:3923` write overwrites `:3140` before
turn-1 commands are ordered. Therefore `:3140` is invisible to turn-1 Quick
Claw **action order**. It is not dead: it can affect the pre-turn
fastest-to-slowest hook sort and a conditional tie draw. Turn-1 Quick Claw
must read draw B. This follows directly from source ordering and the shared
`gRandomTurnNumber` global; no inference from a staged test is required.

## 4. First rung: live battle-start RNG receipt

This scout did not spend its landing window on a new mGBA instrument. The
existing historical battle-1 notes corroborate the two writes, but the next
implementation should consume a fresh, self-validating receipt rather than
rely on that older status.

### Precise worker brief

**Name:** `SIDE — Battle Scene OFF fresh-start gRandomTurnNumber receipt`.

Add one complete `mechanicLab` `overrides.parties` fixture and one probe under
`tools/probe/` that:

1. uses `profile: "battle-scene-off"` and three complete legal Level-50 mons
   per side;
2. uses distinct active speeds, no Quick Claw, no Drought/Drizzle/Sand Stream,
   Intimidate, Trace, Forecast, Cloud Nine/Air Lock or White Herb, and gives
   all four opponent move slots the same move;
3. begins before `CB2_InitBattle`, runs through the first player action menu
   and first executed move, and samples every frame;
4. breaks/logs every call to `Random` with caller symbol+offset, LR, pre/post
   `gRngValue`, returned u16, `gRandomTurnNumber`, `gBattleMainFunc`,
   controller flags, `gBattlerByTurnOrder`, chosen actions/moves and current
   move;
5. asserts exactly one `BattleStartClearSetData` caller and one
   `TryDoEventsBeforeFirstTurn` caller before action selection, zero pre-hook
   tie calls, draw B overwriting draw A, and the first action reading draw B;
6. adds a second case with equal active speed to assert the single conditional
   `GetWhoStrikesFirst` tie draw falls strictly between A and B;
7. optionally adds Intimidate vs Trace as a no-extra-RNG hook-order case.

Run it only through:

```sh
probe_dir="$(mktemp -d /tmp/factory-start-rng.XXXXXX)"
python3 tools/run-mgba-probe.py "$probe_dir/result.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/verify-factory-battle-start-rng.py "$probe_dir/result.json"
```

Acceptance: wrapper exits 0; result JSON says `verdict: PASS`, carries caller
attribution and exact A/tie/B order; `npm test`, `npm run build`, and
`git diff --check` pass. Expected census/ratchet effect: **none** (evidence
only; no production imports of the receipt).

## 5. Ordered bounded rung plan

Every rung below is scoped to one ≤45-minute worker. If its acceptance cannot
fit, land only its named evidence checkpoint; do not fold two rungs together.

| # | Bounded step | Concrete acceptance | Expected ledger/census effect | Evidence dependency |
| --- | --- | --- | --- | --- |
| 1 | **Fresh-start RNG receipt** exactly as §4. | The `tools/run-mgba-probe.py` command in §4 says PASS; full test/build green. | Evidence doc/probe only; ability/item census and both executable ratchets unchanged. | Pinned C and battle-lab complete-party contract. |
| 2 | **Pure fresh Factory battle initializer, no hooks case.** Add a new lifecycle API that takes two complete party states plus battle metadata/RNG, derives active slot 0 and fresh tracked globals, performs draw A, source cleanup, draw B, and returns the first player command boundary. Do not add fields to `FactoryFullTurnConfig`; keep staged tests intact and adapt the new API into its durable rules shape. Pin `isFirstTurn`, neutral stages, zero weather/sides/histories, full parties, two exact RNG calls and draw B stored. | `npx vitest run tests/factoryBattleStart.test.ts`; test must not mention `initialRandomTurnNumber`; full test/build and ratchets green. | New whole-battle lifecycle checkpoint; census unchanged; unsupported-branch count expected unchanged. | Rung 1 exact A/B receipt; `BattleStartClearSetData` table §3.1. |
| 3 | **Pre-first-turn entry-hook orchestrator.** Add fastest-to-slowest sort, conditional tie RNG, overworld-weather no-op for Factory building, weather abilities, Intimidate, Trace and switch-in items before draw B. Reuse source handlers where their semantics match; do not pretend ordinary `Cmd_switchineffects` is the battle-start loop. Pin visible semantic-event order and yielding-independent final state for Drought+Intimidate+Trace representatives. | Focused lifecycle tests plus rung-1 receipt replay; `npx vitest run tests/factoryBattleStart.test.ts tests/battleScriptSwitchinOpcode.test.ts`. | Entry-hook lifecycle checkpoint; likely no census change because abilities/items are already referenced; no new barrier expected. | Rung 1 hook/tie cases; source `TryDoEventsBeforeFirstTurn` ordering. |
| 4 | **One complete 3v3 battle from fresh start to terminal.** Add a Tier-1 integration test/driver that creates complete legal parties through rung 2/3, loops only published requests, supplies deterministic player/test move choices, handles at least one nonterminal faint + forced switch, and reaches a real terminal. No `FactoryFullTurnConfig`, HP/status/weather anchor, state replacement, or terminal injection after creation. Adapt terminal state with `deriveBattleResolutionFromTerminalBoundary`. | `npx vitest run tests/factoryWholeBattle.test.ts`; assert every submission was a member of the current request, one continuous RNG/call cursor, all three opponent slots faint by real moves, and a real adapted win. | This is the requested whole-battle milestone; census unchanged; may expose a genuine narrow barrier, but any barrier ratchet move must be named and separately reachability-tested. | Rungs 2–3; existing full-turn/forced-switch/terminal machinery. |
| 5 | **Corpus-to-kernel party adapter.** Given three Frontier set IDs plus generated personalities/fixed IV/ability slots, derive every `BattleScriptPartyMemberState` field from generated species/move/item/nature tables. Batch-check all 850 Level-50 sets can construct; compare selected rosters to battle-lab captures. | New focused adapter tests enumerate 0–849; one OFF `factoryLegal`/`overrides.parties` semantic comparison; full build. | Data breadth checkpoint; no ability/item census delta (data construction is not new hook semantics). | Existing corpus; Gate-2 lab. This can run before rung 4 only if it stays file-disjoint, but rung 4 must not wait on all 850. |
| 6 | **Production-shaped Factory AI turn driver.** Derive the AI view from the live rules context, generated move/species data, challenge policy and persistent battle-history/known-info state; on trainer command boundaries call `submitFactoryAiDecision` with the same reducer. First acceptance can constrain switch/item decisions unreachable, but must state the source gates. | Extend `factoryWholeBattle.test.ts` so trainer choices are never authored by the test; assert chosen submission belongs to kernel legal decisions and all AI draws share the battle RNG cursor. | AI integration checkpoint; ability/item census unchanged. May add modeled battle-history fields, but should not change opcode barriers. | Rung 4 driver, current AI policy, a focused source scout if rules→view/history ownership is not already explicit. |
| 7 | **Generic initial rental generator.** Port `GenerateInitialRentalMons` range/rank/retry rules over the generated catalog with an explicit draw ledger; emit six full rental records including personality/IV/ability slot. Test duplicate set/species/item retries and better-range slots. | `npx vitest run tests/factoryRentalGeneration.test.ts tests/factoryRoundPolicy.test.ts`; batch seeded property tests keep all results legal and deterministic. | Gate-5 rental-generation checkpoint; census unchanged; no canonical recording imports. | `battle_factory.c:509-601`, `GetFactoryMonId`, generated policy; a personality/ability draw scout if source construction ordering is not already pinned. |
| 8 | **Generic opponent party generator.** Combine real trainer selection with `GenerateOpponentMons` set retries, exclusions and source party construction/personality/fixed-IV/ability/item rules. Replace explicit opponent-party fixtures in the Factory scenario with generated results, retaining fixture ABI for tests. | `npx vitest run tests/factoryOpponentGeneration.test.ts tests/factoryTrainerSchedule.test.ts tests/roundScenarioMatrix.test.ts`; selected seeds semantically match OFF battle lab. | Opponent breadth checkpoint; census unchanged. | Rung 5 adapter, rung 7 rental records, source `battle_factory.c:303-377` and trainer party builder. |
| 9 | **Commentary rules.** Port favorite-type and battle-style calculations from the just-generated opponent party and connect their result to pre-battle presentation data. Enumerate every type and style/no-singular-style branch. | Focused type/style tests plus an OFF compare of the attendant's type/style window for at least two materially different generated parties. | Presentation/data checkpoint; no mechanic census change. | Rung 8 generated party; Gate-2 earlier-checkpoint support may need a harness-side scout first. |
| 10 | **Full rental swap/heal record.** Unify round swap mutation with the full rental record (set id/personality/IV/ability), restore source held items, HP, PP and status between battles, and prove accept/decline both feed the next party build. Keep simplified fixture scenarios compatible. | Focused round/swap tests; one accepted swap's next kernel party exactly equals the chosen defeated opponent record with full PP/item restored. | Facility persistence checkpoint; census unchanged. | Rungs 5, 7, 8; real heal scripts cited in §2.1. |
| 11 | **Round controller owns one real battle lifecycle.** Introduce an orchestrator state that turns `battleStart` into a rung-2 battle, routes player and AI decisions, adapts terminal output, calls `resolveRoundBattle`, and reaches swap/next-battle. It must replace no controller-owned rules from presentation. | New integration test covers battle 0 win → offer → decline → battle index 1 fresh command boundary, with one continuous facility RNG cursor and no fixture resolution. Existing round tests stay green. | First production-shaped controller/kernel closure; census unchanged. | Rungs 4, 6, 8, 10. |
| 12 | **Seven real battles and terminal facility state.** Loop rung 11 through seven generated distinct trainers/parties, choices and healing, including at least one accepted swap; update battle number/streak/swap rank and finish `roundComplete`. Add loss control. Run multiple seeds. | `npx vitest run tests/factoryRoundIntegration.test.ts`; at least three fixed seeds reach seven wins, a loss seed stops immediately, every battle result comes from a terminal kernel boundary, and all generation/AI ledgers are continuous and replay-identical. | Gate-5 core round-loop checkpoint. Census expected unchanged; mechanics coverage may reveal unsupported families, which remain honest failures rather than staged bypasses. | All prior facility rungs; may require choosing seeded parties/moves already inside supported mechanics until Gate 3/4 breadth is truly complete. |
| 13 | **Gate-5 AI switch/item/history breadth.** Source-scout any remaining action types, implement them through kernel-enumerated legal decisions, and enumerate all challenge masks, limitation/scoring/tie/history/known-info branches. Do not claim no-item behavior without a source proof. | Focused AI branch suites plus a test that every returned action is legal and submitted through the common boundary. | Gate-5 clause closure; may alter AI coverage ledger, not ability/item parity census. | Rung 6 and any dedicated switch/item source scout. |
| 14 | **Arbitrary presentation + selected pixel windows.** Drive trainer names/classes/speeches, arbitrary party healthboxes/menus, swap and terminal commands from generated semantic state. Choose unique windows (draft, commentary, battle command, forced switch, swap, seventh win) and compare dense OFF windows. | `npm run compare -- <trace> --summary` for each committed OFF trace at its full capture window, then full `npm test`/build. | Gate-5 presentation clause and Gate-6 selected-window evidence; no mechanic census change. | Rungs 9–13; presentation seam breadth scout before editing large `battleScene.ts`. |

### Stop conditions and ordering notes

- Rung 4 is the first requested milestone: **one complete battle from battle
  start, with no mid-stream staging anchor**. Do not start seven-battle work
  before it passes.
- Rungs 7–10 may be developed file-disjointly, but the acceptance order remains
  whole battle → generated parties → round ownership.
- A seeded seven-battle test is an integration proof, not a substitute for
  Gates 3/4 breadth. Unsupported mechanics must remain explicit barriers.
- No rung should import a canonical `*-dump/probe/watch/boundaries.json` into
  production, add an absolute-tick rendering branch, or mutate round rules
  from presentation.

## 6. Bottom line

The shortest honest path is not a new decision union or a rewrite of the
round controller. It is:

```text
fresh party + RNG
  -> source battle-start initialization and entry hooks
  -> existing persistent full-turn decision machine
  -> existing real terminal boundary
  -> existing BattleResolution adapter
  -> existing round-controller phase/swap skeleton
  -> generic rental/opponent generation and facility bookkeeping
```

The decisive current gap is the first arrow. Once it is source-pinned and one
3v3 battle reaches terminal without staging, Gate-5 work can proceed as
bounded generation, AI, swap/heal and controller-integration rungs rather than
another canonical battle replay.
