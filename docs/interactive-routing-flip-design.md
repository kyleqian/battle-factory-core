# Interactive routing-flip design

Status: bounded MAIN-lane design for ISSUES #53 (2026-07-30). This document
owns the playable draft-confirm → generated Battle Scene OFF route and the
return from that battle to the existing round presenters. It does not propose
a `battleScene.ts` rewrite, a species substitution inside the recorded battle,
or a new canonical replay.

## 1. Ground-truth wiring map

### 1.1 The playable browser reaches the recorded battle today

The browser and its deterministic reset both call `createInitialState()` with
no scenario or routing input (`src/main.ts:14-16,67-80`). That constructor
installs the anchor draft, leaves `roundController` null unless a test supplies
`battleScenario`, and always leaves `factoryRoundBattleOrchestrator` null
(`src/engine/core.ts:323-351`). Thus neither generated owner exists in ordinary
play.

The live route is:

```text
createInitialState
  -> draftScreen
  -> prebattleRoom
  -> battleRoom
  -> battleScene (recorded)
```

The exact state transitions are:

1. A-on-YES marks the draft reveal as accepting; when its close lifecycle
   finishes, core installs `INITIAL_PREBATTLE_ROOM_STATE`
   (`src/engine/core.ts:1501-1515,1610-1621`).
2. The pre-battle room's message/walk/warp lifecycle installs
   `INITIAL_BATTLE_ROOM_STATE` at its fixed black handoff
   (`src/engine/core.ts:1405-1427`). `BattleRoomState` contains only its
   presentation phase/clock, optional encounter, and optional typed trainer;
   it has no party or round object (`src/engine/battleRoom.ts:71-89`).
3. In the first-battle room, every settled callback consumes the already
   modeled opponent-construction/transition RNG calls
   (`src/engine/core.ts:1348-1361`;
   `src/engine/battleRoom.ts:95-135`).
4. At `BATTLE_SCENE_HANDOFF_ELAPSED`, core unconditionally constructs the
   canonical `BattleSetupState`, clears `battleRoom`, and installs
   `INITIAL_BATTLE_SCENE_STATE` (`src/engine/core.ts:1362-1381`). The handoff
   constant is defined as recorded `SCENE_TICK0 - 843`
   (`src/engine/core.ts:314-321`).
5. Rendering then selects `battleScene` after the dev-stage generated owners
   and renders the recorded state machine (`src/engine/core.ts:2183-2277`).
   `BattleSceneState.elapsed` is explicitly a trace-relative clock and the
   state carries many recorded turn fields
   (`src/engine/battleScene.ts:2252-2286,2485-2512`).

That is the railroad in #53: accepting different draft picks changes only the
limited `battleSetup.activeMonMoveset` projection, while
`BattleSetupState.playerParty` remains the fixed
`["ONIX","MAGBY","BAYLEEF"]` tuple
(`src/engine/battleSetup.ts:44-52,91-106`). The subsequent recorded dispatcher,
not a live battle request, owns commands and outcomes.

### 1.2 Exact draft and RNG state available at the handoff

The route does **not** need to reconstruct the player's rentals from displayed
species names:

- `DraftScreenState.rentals` contains six complete
  `FactoryRentalPresentation` rows and `selectedIds` contains each slot's
  one-based pick rank (`src/engine/factoryDraftScreen.ts:209-229`).
- Every presentation retains its exact compact generator record as
  `FactoryRentalPresentation.source`
  (`src/engine/factoryRentalPresentation.ts:60-95`).
- `chosenMonSpecies` already proves that picks are ordered by rank rather than
  pool slot (`src/engine/factoryDraftScreen.ts:281-298`). The routing adapter
  must apply that same ordering to `rentals[i].source`, yielding a typed
  `FactoryRentalParty`; it must not join by species name.
- The anchor screen is itself built from the six compact source records
  (`src/engine/factoryDraftScreen.ts:705-745`), so all six saved rental records
  required by first-opponent selection are still present.

Core also carries the live `gRngValue` equivalent. It starts at the RAM-pinned
anchor value, advances once per VBlank outside battle, spends rental-ball and
field-transition calls at their modeled owners, and changes to
`frontierBattle` ownership only after the battle handoff
(`src/engine/core.ts:289-292,330-342,364-373,1358-1361`;
`src/engine/rng.ts:48-49`). This is the correct live cursor lineage, but it is
not yet split into:

1. the pre-anchor opponent trainer/set-selection cursor;
2. the later `FillFactoryFrontierTrainerParty` personality-construction
   cursor; and
3. the post-transition cursor from which the fresh battle kernel begins.

That distinction is real in the generator API:
`FactoryOpponentGenerationInput` has a selection `rngValue` and an optional
separate `constructionRngValue`
(`src/engine/factoryOpponentGeneration.ts:113-139`), and construction switches
to that second cursor before rolling personalities
(`src/engine/factoryOpponentGeneration.ts:333-385`). The flip must preserve
those epochs; passing the handoff `rngValue` as a new first-opponent selection
seed would select the opponent at the wrong source time and spend its draws
twice.

Battle 1 is special only at this facility-state boundary, not in rendering:
trainer 50 DESTIN and set IDs 188/184/135 are already selected before the
anchor, while their personalities are constructed at battle start
(`docs/battle-bringup-notes.md:400-420`). The adapter must adopt and validate
that pre-anchor schedule, then construct its full typed party from the live
construction cursor. It must not hardcode GROVYLE pixels or patch a generated
party after construction.

### 1.3 What the generated orchestrator already owns

`FactoryRoundBattleOrchestratorConfig` requires the challenge id, facility RNG
cursor, Factory streak, player trainer id, Battle Tower Level-50 streak,
rent-count state, and either generated-initial or current rental records
(`src/engine/factoryRoundBattleOrchestrator.ts:130-162`). Its state already
owns the round controller, live battle, command/resolution/party
presentations, AI history, all generated opponents, the facility RNG ledger,
and the next request id
(`src/engine/factoryRoundBattleOrchestrator.ts:199-233`).

Today its constructor:

- obtains the player's current records either by selecting three generated
  initial indexes or by accepting the supplied current-record party
  (`src/engine/factoryRoundBattleOrchestrator.ts:323-334,389-414`);
- generates Battle 1's complete opponent and records its RNG segment
  (`src/engine/factoryRoundBattleOrchestrator.ts:354-369,416-454`);
- creates a generated round whose rules retain the player's display party,
  compact rental records, full kernel party, current opponent, opponent
  history, and post-generation RNG cursor
  (`src/engine/roundController.ts:167-206`);
- starts a fresh battle from the round's full player/opponent parties and
  `rules.rngValue`, then creates the genuine request-owned command presentation
  (`src/engine/factoryRoundBattleOrchestrator.ts:457-505`).

The battle loop is already live once that state is installed. Core gives
resolution and command presentation first input priority and mirrors the
battle RNG cursor back into `EngineState`
(`src/engine/core.ts:400-430`). Rendering likewise gives generated resolution,
forced/voluntary party selection, and command presentation priority over the
recorded scene (`src/engine/core.ts:2012-2044`). A legal command crosses the
ordinary request-owned decision boundary, the Factory AI is driven until the
next player/terminal boundary, and moves enter the typed resolution lifecycle
(`src/engine/factoryRoundBattleOrchestrator.ts:720-769,1353-1452`).

The only app installation is dev staging. `generatedBattleCommandStage`
constructs three fixed records, creates the orchestrator, immediately
acknowledges `battleStart`, and installs it at trace frame 0
(`tools/compare/appTrace.ts:76-128`). The registry is explicitly dev-only and
production never imports it (`tools/compare/appTrace.ts:131-138`). This is why
`battle-command-generated-off.json` can be 128/128 while normal play remains
recorded.

### 1.4 Round continuation already supplied by `roundController`

The round rules store battle index, current parties and full rental/kernel
records, current opponent, non-repeating history, RNG, last battle, and last
swap (`src/engine/roundController.ts:23-69`). A real terminal battle is adapted
back into those rules by `finishBattle`
(`src/engine/factoryRoundBattleOrchestrator.ts:579-641`).

After a nonterminal win, `resolveRoundBattle` issues `battleWon`; after its
presentation, the controller issues `swapOffer`. A swap result mutates both
the display and full rental/kernel party, and emits `swapResolved`
(`src/engine/roundController.ts:443-519,529-613`). The orchestrator then
generates a non-repeating next opponent from the retained RNG/history/six
saved records, advances the same round, and starts the next fresh battle
(`src/engine/factoryRoundBattleOrchestrator.ts:518-566`). The round controller
heals the current player party and issues the next `battleStart` with an
incremented index (`src/engine/roundController.ts:300-345`).

Loss and seventh win are also already rules outcomes: `resolveRoundBattle`
issues `roundLost` on loss and `roundCompleted` at battle index 6
(`src/engine/roundController.ts:490-519`). What is missing is core/presentation
wiring to the orchestrator-owned `round`; current core creates terminal and
swap presenters only from its separate `state.roundController`
(`src/engine/core.ts:382-397,442-448,495-503,644-648`).

### 1.5 Generated intro contract

The generated start command freezes the typed trainer, both full three-member
parties, active indexes, six-slot party-summary states, and all three intro
text substitutions (`src/engine/factoryBattleStartPresentation.ts:22-57,
134-182`). `factoryBattleStartPresentationForState` already constructs it from
the orchestrator's pending `battleStart`, player kernel party, opponent rental
records, and source-derived trainer presentation
(`src/engine/factoryRoundBattleOrchestrator.ts:239-265`).

The landed intro lifecycle owns one BeginBattleIntro-relative clock and the
accepted A edge across handoff, trainer slide/message, both releases, and
command readiness (`src/engine/factoryBattleStartIntro.ts:26-85`). Its final
adapter verifies that the intro field equals the fresh battle command field
and advances that same command lifecycle to the settled `action-menu` state
(`src/engine/factoryBattleStartIntro.ts:88-109`). The renderer consumes only
the frozen command and relative clock
(`src/engine/battleScene.ts:3900-3947,4090-4223,4271-4400`).

The lifecycle is not stored by `EngineState` or
`FactoryRoundBattleOrchestratorState`, and core never advances or renders it
(`src/engine/core.ts:274-312`;
`src/engine/factoryRoundBattleOrchestrator.ts:206-233`). That missing owner is
the final gap between the battle-room handoff and the already-proven generated
command window.

## 2. Routing decision

### 2.1 Rule

After the final flip:

> A browser challenge that begins at the real rental draft routes every
> accepted draft to one `FactoryRoundBattleOrchestratorState`, using the three
> selected `FactoryRentalPresentation.source` records in pick order. That
> owner persists through Battles 1-7, swaps, loss, or seventh-win completion.
> The canonical recorded `BattleSceneState` is reachable only through an
> explicit comparison/test route. There is no runtime fallback from a
> generated machine barrier to the recorded battle.

Represent this as one immutable route discriminator, for example:

```ts
type InteractiveBattleRoute =
  | "generated-orchestrator"
  | "canonical-recorded";
```

`createInitialState` receives it as an option and stores it in `EngineState`.
The production browser and `__POKEBENCH__.reset()` eventually use
`"generated-orchestrator"`; comparison tooling supplies the trace's explicit
route. Core consults it only at the existing battle-room → battle owner seam.
It must not be tested inside battle renderers, rules, AI, or per-turn input.

The generated owner starts at the same field/room transition boundary. On
`"generated-orchestrator"`, core installs/advances the typed battle-start
intro and never creates `BattleSceneState`. On `"canonical-recorded"`, core
keeps the existing `createBattleSetup`/`INITIAL_BATTLE_SCENE_STATE` handoff
byte-for-byte. An unsupported generated kernel branch remains an explicit
machine barrier/error with its source context; silently switching routes would
make the player's earlier commands and RNG disappear.

### 2.2 Regression routes remain explicit and byte-exact

Add an app-only optional trace field:

```ts
appRoute?: "generated-orchestrator" | "canonical-recorded";
```

`tools/compare/oracleClient.ts` strips it alongside `appStage` and
`oracleBattleLab` before sending a trace to the ROM. `renderAppTrace` passes it
to `createInitialState`. No trace capture frame, input segment, oracle profile,
or expected count changes.

| Evidence family | Route after the flip | Preservation rule |
| --- | --- | --- |
| The 25 immutable rows in §4.1 | Every file declares `"appRoute": "canonical-recorded"`. | They continue through the unchanged `battleRoom -> battleScene` branch. Their capture lists and exact counts remain immutable. |
| Historical canonical Battle 1/Battle 2 intro and send-out traces | Declare `"appRoute": "canonical-recorded"`. | They keep the recorded intro state and all previously accepted residuals; the route flip does not reinterpret them as generated evidence. |
| `battle-command-generated-off.json` (128/128) | Declares `"appRoute": "generated-orchestrator"` and retains its frame-0 `appStage`. | Its dev stage still installs the exact generated GRANBULL-vs-ARON orchestrator checkpoint (`tools/compare/traces/battle-command-generated-off.json:1-10`; `tools/compare/appTrace.ts:92-128`). It remains byte-exact while the real anchor route is built. |
| Landed generated intro unit/private-probe evidence | The unit route continues to construct `FactoryBattleStartIntroState` directly; any new anchor-to-intro app trace declares `"appRoute": "generated-orchestrator"`. | The existing 714/715 whole-window verdict remains honest: only the recorded B+444 10px summary-slot residual is accepted. No capture is removed to hide it. |
| Future user-visible anchor trace | `"appRoute": "generated-orchestrator"` with no command-window `appStage`. | It must replay the actual six-rental draft, room transition, intro, and live command path. A scenario/stage may not inject HAUNTER after draft confirmation. |

The trace type already treats `appStage` as dev-only metadata and strips it
before ordinary oracle execution (`tools/compare/oracleClient.ts:18-39,
62-73`). The new route field follows exactly that boundary.

## 3. Gap analysis

“Needs flip” means the generated route may not become the production default
until this row is closed. “Can stage” means the first user-visible command can
land behind an opt-in route while the row remains explicit, but the final
default flip still waits for it.

| Gap | Owner | Evidence status | Flip policy |
| --- | --- | --- | --- |
| Convert selected draft slots to three compact records in pick order | `factoryDraftScreen.ts` plus a narrow routing adapter | **Inputs exact/proven; adapter missing.** Complete records and ranks already exist (`factoryDraftScreen.ts:209-229`; `factoryRentalPresentation.ts:60-95`). | **Needs flip.** No species-name join. |
| Preserve the existing pre-battle room and Battle Factory room, then choose a battle owner at the settled handoff | `core.ts` | **Recorded transition exact; route branch missing.** The only current branch installs `battleScene` (`core.ts:1362-1381`). | **Needs flip.** Generated and recorded share the predecessor, not the successor. |
| Reconcile Battle 1's pre-anchor trainer/set selection with its live personality-construction cursor and post-transition battle seed | new anchor-session adapter around `factoryOpponentGeneration.ts` / `factoryRoundBattleOrchestrator.ts` | **Generator proven; anchor epoch bridge missing.** Separate selection/construction cursors exist (`factoryOpponentGeneration.ts:113-139,333-385`); core owns the later calls (`core.ts:1348-1361`). | **Needs flip.** Must be oracle/RAM pinned before production routing; never rerun selection at handoff. |
| Produce Battle 1's full opponent party and source trainer presentation | same adapter plus `factoryTrainerPresentation.ts` | **Mechanisms exact/proven; installation missing.** Generator returns typed records and trainer (`factoryOpponentGeneration.ts:239-330,387-407`); trainer IDs map to typed presentation (`factoryTrainerPresentation.ts:115-130`). | **Needs flip.** The room, intro, AI, and kernel must all consume one identity. |
| Store, advance, render, and complete the generated intro lifecycle | `factoryRoundBattleOrchestrator.ts` and `core.ts`; render helper remains in `battleScene.ts` | **714/715 proven; ownership missing.** The standalone lifecycle and settled-command bridge exist (`factoryBattleStartIntro.ts:26-109`). | **Needs flip.** Preserve the sole B+444 accepted residual. |
| Settled command input and typed Scene-OFF resolution | `factoryRoundBattleOrchestrator.ts`, existing core priority branches | **Exact/proven.** The command trace is 128/128 and core already advances/renders an installed owner (`core.ts:400-430,2012-2044`). | **Ready now** once the intro installs it. |
| Convert terminal win into the existing post-battle room/commentary flow using live parties/opponent | `postwin.ts` plus a core adapter from `orchestrator.round` | **Partly generic; missing live fields and owner bridge.** Commentary accepts arbitrary opponent records, but initial challenge number, opponent IDs, player HP, and healed HP are still canonical literals (`postwin.ts:35-65,98-115,135-150`). | **Can stage behind opt-in route; needs final flip.** |
| Feed the live `swapOffer` and accepted/declined result back to the same orchestrator round | `core.ts`, `factorySwapPresentation.ts`, `factoryRoundBattleOrchestrator.ts` | **Presentation/controller exact; owner bridge missing.** Generic swap construction/submission already accepts a `RoundControllerState` (`factorySwapPresentation.ts:293-333,351-392`), but core reads only `state.roundController` (`core.ts:495-503,644-648`). | **Can stage behind opt-in route; needs final flip.** |
| Generate Battles 2-7 opponents and repeat room → intro → battle without a canonical Battle-2 march | `factoryRoundBattleOrchestrator.ts`, `roundController.ts`, core room adapter | **Rules/generation proven; presentation re-entry missing.** Next-opponent generation and next `battleStart` already exist (`factoryRoundBattleOrchestrator.ts:518-566`; `roundController.ts:300-345`). | **Can stage after Battle 1 command; needs final flip.** Prove with state-driven accelerated outcomes, not another recorded turn sequence. |
| Loss ending | `factoryTerminalPresentation.ts` / `factoryTerminalRender.ts` plus core owner lookup | **Exact/proven; lookup missing.** Round loss is emitted by `resolveRoundBattle` (`roundController.ts:490-499`); core currently watches only `state.roundController` (`core.ts:382-448`). | **Can stage; needs final flip** so a loss never falls back to the draft renderer. |
| Seventh-win ending | same terminal owner | **Exact/proven; lookup missing.** Battle index 6 emits `roundCompleted` (`roundController.ts:501-509`); the orchestrator persists rental-swap count on round completion (`factoryRoundBattleOrchestrator.ts:620-641`). | **Can stage; needs final flip.** |
| Scene ON presentation breadth | animation lane | **Separate program.** Generated logic is Scene-OFF accepted; command/rules state is scene-independent. | **Not a flip blocker.** Scene choice may change presentation timing only, never parties, RNG, decisions, or outcomes. |

## 4. Ordered flip slices

Every slice is one bounded MAIN worker. If a named equality cannot be met, the
worker lands only an honest state/evidence checkpoint and records the precise
remainder. No slice may add a battle-number, turn-number, absolute-tick, or
trace-frame dispatch branch.

### 4.1 Shared immutable gates

Any slice that edits `core.ts`, `battleScene.ts`, routing metadata, or a
generated presentation owner runs the full immutable table:

| Trace | Exact |
| --- | ---: |
| `battle2-off-turn1-staged.json` | 16/16 |
| `turn3-menu.json` | 254/254 |
| `turn4-menu.json` | 44/44 |
| `turn5-menu.json` | 42/42 |
| `turn6-menu.json` | 44/44 |
| `turn7-menu.json` | 93/93 |
| `turn8-menu.json` | 88/88 |
| `turn9-menu.json` | 111/111 |
| `turn10-menu.json` | 83/83 |
| `turn11-menu.json` | 56/56 |
| `turn12-menu.json` | 46/46 |
| `turn13-menu.json` | 57/57 |
| `turn13-sandattack.json` | 190/190 |
| `turn13-dragonbreath-faint.json` | 141/141 |
| `turn13-switchin.json` | 242/242 |
| `turn15-fly-strike.json` | 256/256 |
| `turn15-party-select.json` | 200/200 |
| `turn15-party-select-delayed.json` | 200/200 |
| `turn15-sendout-rung6.json` | 195/195 |
| `turn15-sendout-rung6-delayed.json` | 195/195 |
| `turn16-rung5.json` | 175/175 |
| `turn17-rung7a.json` | 255/255 |
| `turn17-rung7b.json` | 147/147 |
| `turn17-rung8a.json` | 255/255 |
| `turn17-rung8b.json` | 118/118 |

This is the existing immutable table
(`docs/battle-resolution-seam-design.md:401-435`). Run it with:

```sh
for t in \
  battle2-off-turn1-staged turn3-menu turn4-menu turn5-menu turn6-menu \
  turn7-menu turn8-menu turn9-menu turn10-menu turn11-menu turn12-menu \
  turn13-menu turn13-sandattack turn13-dragonbreath-faint turn13-switchin \
  turn15-fly-strike turn15-party-select turn15-party-select-delayed \
  turn15-sendout-rung6 turn15-sendout-rung6-delayed turn16-rung5 \
  turn17-rung7a turn17-rung7b turn17-rung8a turn17-rung8b
do
  npm run compare -- "$t.json" --summary || exit 1
done
```

Every slice also runs:

```sh
npx vitest run tests/executableFrontierRatchet.test.ts
npm test
npm run build
```

### Slice 1 — explicit route owner and rank-ordered draft adapter

Goal: add the route discriminator to `InitialEngineStateOptions`/`EngineState`,
add a pure adapter that returns the three `rentals[].source` records in pick
rank order, and make the existing battle-room handoff select one owner. Keep
the browser default canonical for this slice. A test-only injected generated
session may prove the new handoff installs an orchestrator; ordinary
construction must not invent a live seed yet.

Also add `Trace.appRoute`, strip it before oracle execution, and mark all 25
immutable rows plus historical canonical intro traces
`"canonical-recorded"`. Mark the 128/128 generated trace
`"generated-orchestrator"`. Capture arrays, segments, and profiles do not
change.

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/draftScreen.test.ts tests/compareCli.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare -- battle-command-generated-off.json --summary  # 128/128
# Run the full §4.1 loop.
npm test
npm run build
```

The route test must prove at least two pick orders, including HAUNTER selected
first, and prove the canonical option still installs `battleScene` while the
generated option does not.

Out of scope: live anchor seed derivation, opponent construction, intro pixels,
post-battle flow, and changing the production default.

### Slice 2 — anchor session and Battle 1 RNG/opponent reconciliation

Goal: replace Slice 1's injected generated session with a source-/oracle-pinned
anchor-session adapter. It consumes the six draft source records, the three
selected records, facility metadata, the pre-anchor Battle 1 trainer/set
schedule, the captured construction cursor, and the live post-transition
battle cursor. Extend the orchestrator boundary only as needed to distinguish
facility selection RNG, opponent construction RNG, and fresh-battle RNG.

The adapter must reproduce trainer 50, set IDs 188/184/135, full constructed
opponent records, the drafted player party, and the core handoff cursor without
rerunning pre-anchor selection. Pin all draw segments and assert that room,
intro, AI, and kernel trainer identities are the same typed object/projection.

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/factoryOpponentGeneration.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/factoryBattleStartPresentation.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare -- accept-prebattle.json --summary             # 137/137
npm run compare -- battle-command-generated-off.json --summary # 128/128
# Run the full §4.1 loop.
npm test
npm run build
```

The focused tests must fail on a one-draw construction-cursor shift, a
post-transition seed substituted for selection, or any mismatch between the
room trainer and generated opponent.

Out of scope: rendering/advancing the generated intro, command input from the
real anchor route, post-battle presentation, and any change to recorded
`BattleSetupState`.

### Slice 3 — battle-room handoff through generated intro to settled command

Goal: store `FactoryBattleStartIntroState` under the generated owner, create it
at the existing battle-room settled seam, advance it from live input, render it
before the command/resolution branches, and acknowledge `battleStart` only at
`generatedBattleStartCommandReady`. Then start the fresh battle and use
`settleFactoryBattleStartCommand` to hand the same typed field to the proven
command lifecycle.

Add an explicit-OFF anchor-to-intro comparison trace with the actual draft and
no command-window `appStage`. It captures the full generated intro; its honest
acceptance is 714/715 if the sole B+444 10px residual remains. Add a second
short capture window beginning at the settled command state and require it
exact. The existing generated 128/128 dev-stage trace remains unchanged.

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/factoryBattleStartIntro.test.ts \
  tests/factoryBattleStartPresentation.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare -- interactive-generated-intro-off.json --summary
# Honest target: 714/715, only the already-recorded B+444 10px residual.
npm run compare -- interactive-generated-command-entry-off.json --summary
# Required: every capture exact.
npm run compare -- battle-command-generated-off.json --summary # 128/128
# Run the full §4.1 loop.
npm test
npm run build
```

Out of scope: fixing/reattributing B+444, Scene ON animation, post-battle
commentary/swap, later battles, and changing the production default.

### Slice 4 — terminal win to generic post-battle and live swap offer

Goal: generalize `PostwinState` construction over the orchestrator's live
`battleWon` command/last-battle snapshot: player HP, opponent rental IDs,
challenge battle index, commentary party, and healed party values must come
from typed round state. Core must read `orchestrator.round`, complete
`battleWon` at the existing presentation boundary, advance to `swapOffer`, and
create `FactorySwapPresentationState` from that same round. Do not create a
second `RoundControllerState`.

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/roundController.test.ts tests/roundControllerRentalPersistence.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/factorySwapPresentation.test.ts tests/postwin.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare -- battle1-postwin-heal.json --summary
npm run compare -- battle1-postwin-next-prompt.json --summary
npm run compare -- battle1-postwin-scout-a.json --summary
npm run compare -- battle1-postwin-scout-b.json --summary
npm run compare -- battle1-swap-player-picker.json --summary
# Run the full §4.1 loop.
npm test
npm run build
```

Add a generated state-only fixture whose player HP and opponent set IDs differ
from the canonical tuple; assert every postwin/swap row follows it without
changing round rules before the established completion edge.

Out of scope: selecting the next opponent, Battle 2 room/intro, loss/seventh
endings, new commentary branches, and changing the production default.

### Slice 5 — swap result to Battle 2 and reusable Battles 2-7 re-entry

Goal: feed accepted/declined swap decisions back through
`chooseFactoryRoundSwap`, complete `swapResolved`, call the existing generated
next-opponent path, and route its pending `battleStart` through the existing
room plus the same generated intro lifecycle. Generalize the room adapter over
the current generated trainer; do not add a Battle-2 rendering branch.

Use accelerated state-driven fixtures to prove battle indexes 1 and 5 re-enter
the same room/intro/start mechanism, retain non-repeating trainer history,
heal the live party, carry accepted rental swaps, and preserve one continuous
facility RNG ledger. These fixtures may submit typed battle terminal results;
they may not replay canonical Battle 2 turns or inspect tick 33331+.

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/roundController.test.ts tests/roundControllerRentalPersistence.test.ts \
  tests/factoryOpponentGeneration.test.ts tests/factorySwapPresentation.test.ts \
  tests/factoryBattleStartIntro.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare -- battle1-swap-enemy-accept-exit.json --summary
npm run compare -- battle1-swap-enemy-accept-no-return.json --summary
npm run compare -- interactive-generated-command-entry-off.json --summary
# Run the full §4.1 loop.
npm test
npm run build
```

Out of scope: another canonical Battle-2 command/turn recording, new
battle-number dispatch, terminal lobby endings, Scene ON animation, and
production-default routing.

### Slice 6 — orchestrator-owned loss and seventh-win endings

Goal: make terminal presenter discovery use the generated owner's pending
`roundLost`/`roundCompleted` command as well as the legacy injected round
controller. Completion must acknowledge the command on
`orchestrator.round`, preserve rent-count semantics, and leave no generated
state that can fall through to the draft renderer.

Prove loss from battle indexes 0 and 5 and completion only from index 6. Prove
that accepted swaps increment `rentsCount` once on round completion and never
on loss, using the orchestrator's existing terminal mutation
(`src/engine/factoryRoundBattleOrchestrator.ts:620-641`).

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/factoryTerminalPresentation.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/factoryEndingPolicy.test.ts tests/roundController.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare:factory-terminal-loss
npm run compare:factory-terminal-loss-record-menu
npm run compare:factory-terminal-round-won
npm run compare:factory-terminal-round-won-continuation
# Run the full §4.1 loop.
npm test
npm run build
```

Out of scope: Battle Points beyond the existing Level-50 policy, audio,
recording persistence beyond the existing terminal contract, and changing the
production default.

### Slice 7 — production flip and user-visible #53 acceptance

Goal: make both ordinary browser startup and `__POKEBENCH__.reset()` default to
`"generated-orchestrator"`. Keep `"canonical-recorded"` available only through
explicit test/compare construction. Remove any temporary injected generated
session from Slice 1.

Commit `interactive-haunter-shadow-punch-off.json`, an additive explicit-OFF
trace that starts at the real anchor, drafts HAUNTER first from slot 5 plus two
other legal rentals, traverses the real rooms and generated intro, opens FIGHT,
selects SHADOW PUNCH, and captures:

1. the player release/healthbox naming HAUNTER;
2. `What will HAUNTER do?`;
3. the FIGHT menu with SHADOW PUNCH in slot 0;
4. `HAUNTER used SHADOW PUNCH!`;
5. the semantic opponent HP endpoint and HAUNTER PP decrement; and
6. the next real request produced from that resolved turn.

The Tier-1 route test must separately draft a different lead and prove its
species/moves/PP and selected decision replace HAUNTER's without adapter
changes. This is the user-visible proof that neither drafted species nor
commands are being patched into the canonical replay.

Acceptance:

```sh
npx vitest run tests/interactiveRouting.test.ts \
  tests/factoryBattleStartIntro.test.ts \
  tests/battleCommandPresentation.test.ts \
  tests/battleResolutionPresentation.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/executableFrontierRatchet.test.ts
npm run compare -- interactive-haunter-shadow-punch-off.json --summary
# Required: every committed capture exact; no appStage at the command window.
npm run compare -- battle-command-generated-off.json --summary # 128/128
npm run compare -- interactive-generated-command-entry-off.json --summary
# Required: every capture exact.
# Run the full §4.1 loop.
npm test
npm run build
```

Before closing #53, a browser dev-route check must also confirm that normal
`npm run dev` startup uses the generated default and that reset returns to the
same generated-route draft. The automated trace/Tier-1 checks are the
load-bearing acceptance; visual manual play is a smoke check, not a substitute.

Out of scope: hiding an unsupported kernel branch, substituting species in
`BattleSceneState`, Scene ON animation breadth, audio, Open Level, doubles, or
changing any immutable capture list.

## 5. Constraints

- No implementation slice may add a battle-number, turn-number,
  absolute-tick, trace-frame, or species-name routing branch. The sole route
  decision is made at the existing room-to-battle owner seam.
- The generated route may share source-derived render mechanisms with
  `battleScene.ts`, but it may not create `BattleSceneState` and then swap
  ONIX/GROVYLE strings, sprites, moves, HP, or PP into the recording. That is
  the exact prohibited #53 hack.
- `tests/executableFrontierRatchet.test.ts` currently permits no production
  canonical recording imports and pins per-module `unsupported-branch` counts
  (`tests/executableFrontierRatchet.test.ts:30-54,358-428`). Every slice runs
  it. A new barrier must be named and justified; no routing slice should need
  one.
- Production behavior derives from source data, typed parties, and live RNG.
  It may not import `*-dump`, `*-probe`, `*-watch`, or `*-boundaries` JSON,
  replay oracle screenshots, add framebuffer lookups, bake interactive
  species/cursors into chrome, fit coordinates/RGB, or thin captures.
- A generated machine barrier is visible evidence of missing kernel breadth.
  It is never permission to resume the canonical recording.
- Scene OFF versus Scene ON may change presentation clocks and animation only.
  Parties, legal decisions, AI, RNG calls, damage, outcomes, swaps, and round
  advancement remain identical.
- The finite Stage 8 reset remains authoritative: use generic controller
  fixtures for Battles 2-7 and do not resume the retired canonical Battle-2
  march past tick 33331.

## 6. Open questions and external decisions

1. **Exact anchor facility/RNG provenance.** The compact rental OT id is
   available, but the production route still needs source-/RAM-pinned values
   for Factory streak, Battle Tower Level-50 streak, rent count, the
   pre-anchor opponent selection cursor/schedule, the personality-construction
   cursor, and the fresh-battle cursor boundary. Slice 2 must establish these
   with a short read-only OFF-profile probe and source reconciliation. Do not
   infer them from whichever seed happens to reproduce DESTIN.
2. **Arbitrary-trainer dense intro acceptance.** ~~Whether to add a harness
   pre-reset capture mode is a cross-program/user decision.~~ **RESOLVED —
   this paragraph was already stale when written (2026-07-30 12:24).** The
   harness added exactly that contract earlier the same morning:
   `preCheckpointCaptureFrames` (harness `8251953`, 10:13) exposes the
   rental-selection and battle-start intro frames `prepare()` already drives,
   and `preCheckpointCaptureAllFrames` (`38fea69`, 10:19) captures them
   densely with no count cap; see `../../oracle/BATTLE_LAB.md` "Pre-checkpoint
   captures". The running main oracle service (started 11:59) includes both.
   No user decision is needed — what remains is wiring: pre-checkpoint frames
   use a **separate absolute coordinate space** (frame 0 is immediately after
   `new_session()`, before any semantic writes), so the scout's measured
   P..B+714 window must be mapped onto that numbering and coverage confirmed
   by probe. Early frames' `state` battle-struct fields are meaningless until
   `gBattlersCount == 2`. The anchor DESTIN interactive trace never required
   this change.

   **Still genuinely open (smaller):** the attendant-commentary checkpoint
   (entry 690) wants a *specific* generated party. `BattleLab.preview_report`
   (`047af61`, 10:57) replays the scouting-report dialogue from an earlier
   anchor but "can pick a seed, not a specific opponent". Reaching a chosen
   party therefore needs either a seed search or a harness ask for
   opponent-specific control.
3. **The B+444 residual.** The generated intro remains 714/715 because of the
   already-recorded 10px summary-slot ordering residual. This design preserves
   and reports it. Fix-versus-attribute remains its separately scheduled
   evidence decision; routing work must not fit or remove the frame.
4. **Browser scene-setting policy.** There is no interactive scene-mode
   selector in this route contract. MAIN accepts the generated browser path
   against Battle Scene OFF. If the product later exposes the ROM's Battle
   Scene ON/OFF option, it needs a separate user decision and presentation
   adapter; it must reuse the same generated logical state.
