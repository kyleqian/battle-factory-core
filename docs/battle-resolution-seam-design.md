# Battle-resolution presentation seam design

Status: bounded MAIN-lane design at `3445e568` (2026-07-29). This document
extends the landed battle-command seam through Battle Scene OFF action
resolution, faint handling, forced-party handoff, and send-out. It does not
propose a rewrite of `battleScene.ts`, and none of the implementation slices
below may add a battle-number, turn-number, absolute-tick, or trace-frame
dispatch branch.

## 1. Render inventory

### 1.1 Scene-OFF command confirm through the next menu

The most direct ground truth is the already-banked explicit-OFF fixture
`tools/compare/traces-groundtruth/battle2-off-turn1.json`. Its scope and
confirm-relative rules ledger are recorded at
`docs/battle2-off-portability-notes.md:1-42`; the corresponding real-kernel
staged app proof is `battle2-off-turn1-staged.json` at **16/16**. No new trace
is needed for this design.

Battle Scene OFF removes the move/effect animation body, but it does not jump
straight from FIGHT confirmation to a new action menu. The ROM still presents,
in order:

1. The confirmed FIGHT field remains visible during the controller handoff.
2. The attacker's `<name> used / <move>!` string prints one glyph per VBlank
   and holds. PP changes logically, but PP is not a separate visible battle
   window.
3. If the move changes HP, the health bar drains from the displayed pre-hit
   value to the semantic endpoint. The numerical player HP overlay changes
   with that same controller-owned display state.
4. Critical/effectiveness/miss/failure/result strings, when emitted by the
   script, replace the attack string and hold according to their source wait
   command. A status/stat animation may still have Scene-OFF controller
   presentation even though the move animation itself was skipped.
5. The opponent action repeats the same sequence.
6. End-turn messages/effects are presented in their emitted order.
7. A continuing battle clears the message box for six rendered frames, then
   atomically draws the next action menu. The real next request may already
   exist while those presentation frames are still playing.

For the canonical OFF turn, the current nine-command projection acknowledges
at confirm-relative `+145,+146,+160,+260,+261,+311,+400,+404,+405`
(`tests/battleTurnPortability.test.ts:209-239`). The dense ROM evidence pins
ROCK SLIDE's 91→63 HP commit at +140/+145, SAND ATTACK's accuracy drop by
+190, the next command controller boundary at +405, and the first proven
accepted A at +407 (`docs/battle2-off-portability-notes.md:23-35`). The staged
renderer retains the six-frame blank-to-menu reveal at
`core.ts:2132-2172`. Those are distinct facts: the kernel/request boundary is
not permission to skip the remaining visible lifecycle.

The generic visual pieces already exist:

| Visible element | Present implementation | Seam verdict |
| --- | --- | --- |
| Live battlefield, battler art, and healthboxes | `battleCommandPresentationRender.ts:60-119` builds a live render view; `battleScene.ts:5905-5975` composes arbitrary field art and healthboxes. | Generic content/chrome. Resolution needs a mutable *display snapshot* so final kernel HP does not appear before the drain. |
| Bottom message window and glyph printing | `battleScene.ts:3590-3601` draws the battle message window; the many source-relative visible-character helpers culminate in `drawMessageTextLines`. | Reusable primitive, currently selected by canonical window functions. |
| Attack strings and other battle strings | `battleStringResolver.ts:34-38,77-125` reads the extracted 365-entry table and fails closed on unresolved placeholders/control codes. | Shared resolver exists; placeholder coverage is deliberately incomplete. |
| HP bar geometry/content | `healthboxAssembly.ts:149-205,550-667,697-765` contains source-derived bar fill/band selection and both singles compositors. | Generic endpoints and chrome. A source-derived drain clock still needs to be factored out of canonical helpers. |
| Scene-OFF ordered commands | `sceneOffPresentation.ts:16-49,230-390` projects provenance-bearing kernel events into text/PP/HP/stat/turn-end/menu commands. | Real semantic precedent, but restricted to the one ONIX/KABUTO turn and a fixed accuracy-only shape. |
| Presentation acknowledgements | `sceneOffPresentation.ts:392-442` advances immutable commands with presentation-local relative clocks. | Correct ownership pattern. These are not battle decisions and must remain invisible to the kernel boundary. |
| Next command entry | `battleCommandPresentation.ts:110-118,303-388` owns the six-frame action entry and request-relative input. | The resolution completion must construct this replacement instead of publishing it at logical resolution time. |

The existing `BATTLE2_OFF_TURN1_COMMAND_DURATIONS` vector at
`battle2OffScenario.ts:51-53` is evidence, not the generic timing model.
Implementation must derive text duration from resolved glyph/control content,
HP duration from the source health-bar update rule and endpoints, and waits
from the command kind. It may use the exact canonical vector as an
equivalence assertion, but not as a universal nine-command script.

### 1.2 Faint window

Battle Scene OFF still presents the result of a knockout:

1. the HP bar reaches zero;
2. the battler faint animation sinks/removes the sprite and healthbox;
3. `<name> fainted!` prints;
4. the wait cursor appears and the message remains button-gated;
5. only the accepted dismiss edge permits terminal or replacement handling.

The canonical implementations cover both sides and both continuation classes:

- opponent KO and long dismiss hold:
  `battleScene.ts:12999-13139` (`turn13-dragonbreath-faint.json`,
  **141/141**);
- player KO before a forced selector:
  `battleScene.ts:14377-14463` and the request-relative selector entry at
  `partySelect.ts:67-92,153-228` (`turn15-fly-strike.json`, **256/256**,
  followed by the party traces);
- terminal opponent KO and its dismiss/outcome sequence:
  `battleScene.ts:14966-15119,15494-15631`
  (`turn17-rung7a/b` and `turn17-rung8a/b`).

These functions already establish the visual mechanisms worth preserving:
sink rows are derived from species pic coordinates, the healthbox disappears
at a relative faint boundary, text is resolved from
`STRINGID_TARGETFAINTED`/`STRINGID_ATTACKERFAINTED`, and the cursor is
input-gated. The seam replaces their turn dispatch and content inputs; it
does not replace their accepted pixel mechanisms with screenshots.

### 1.3 Forced-party handoff and send-out

When the fainted side has a replacement, the ROM does not create the next
action menu immediately:

1. the faint message is dismissed;
2. the battle field holds, fades out, crosses a black interval, and fades into
   the party list;
3. a player forced-switch request remains pending while the party list and
   `SEND OUT / SUMMARY / CANCEL` submenu accept input;
4. confirmation fades the party list out and returns to the battle;
5. party status summary state changes, the switch-in string is printed, and
   the replacement is handed to the field;
6. the ball appears/opens, the species materializes, its healthbox slides in,
   and the switch-in text holds;
7. the message box clears for six frames before the next command menu.

The request-owned forced selector already exists. `PartySelectState` stores
the exact `BattleForcedSwitchRequest`, full three-member party, relative
entry clock, and send-out confirmation edge
(`partySelect.ts:52-65,153-228`); its ordinary submission bridge calls
`submitBattleDecision` without a pseudo-acknowledgement
(`partySelect.ts:507-531`). The canonical send-out timing is already entirely
confirmation-relative: blank/action-menu handoff, ball phase, release clock,
healthbox slide, battle fade, and text printer are at
`partySelect.ts:300-368`.

The current pixel path is not yet generic:

- `partySelect.ts:406-469` rejects any visual roster other than
  ONIX/MAGBY/BAYLEEF;
- `battleScene.ts:14508-14544` renders that canonical party list;
- `battleScene.ts:14771-14869` draws the fixed MAGBY ball/release/healthbox;
- `battleScene.ts:15767-15831` joins that send-out to Turn 16's menu.

The live voluntary selector is already source-composed for arbitrary Factory
species at `battlePartySelect.ts:63-108,138-174,289-316`. It is useful for
shared rows/icons/refusal text, but a forced selector cannot simply use its
cancel semantics: forced selection is request-gated and cannot return to the
action menu.

The OFF forced-switch lab evidence is also already banked, not inferred. The
source-valid player-choice trace reaches the replacement party-index commit at
frame 680 and rebuilt MACHOP field at frame 700, with no RNG consumption
during the entire human-timescale party/send-out dance
(`docs/forced-switch-ground-truth.md:366-401`). The source opcode order is
`drawpartystatussummary → getswitchedmondata → switchindataupdate →
printstring STRINGID_SWITCHINMON → hidepartystatussummary → switchinanim`
(`docs/forced-switch-ground-truth.md:34-57`).

### 1.4 Kernel event inventory: present versus required

The public transition returns immutable, monotonically sequenced payloads
with optional authoritative interpreter provenance
(`battleDecisionBoundary.ts:119-136,172-192,846-875`). The current event
union is at `battleScriptEvents.ts:50-213`.

| Presentation fact | Existing semantic source | What the renderer still needs |
| --- | --- | --- |
| Attack/result/effect/faint/switch-in text | `message{messageId,substitutions}`; production print commands emit it at `battleScriptSourceCommands.ts:869-888`, and hit-chain critical/result sites are in `battleScriptHitChainOpcode.ts:2553-2680`. | Resolve every placeholder used by the selected message from an event-time snapshot. Current substitutions are often empty and `battleStringResolver.ts:94-125` intentionally throws on missing resolvers. Do not infer the attacker/current move from the final rules state when multiple actions share one receipt. |
| PP update | `set-battler-pp-data` in `battleScriptEvents.ts:120-126`. | No visible resolution window; apply it to the per-battler boundary snapshot so the replacement FIGHT menu has the correct PP. |
| HP drain | paired `health-bar-update` and `hp-change` in `battleScriptEvents.ts:173-184`, emitted by `battleScriptHitChainOpcode.ts:2315-2355,2385-2550`. | Pair by battler/provenance; `healthValue` is the controller delta while `hp-change.from/to` are display endpoints. Derive a relative drain program, including heal and zero-HP cases. |
| Stat/status result | `stat-stage-change`, `status-animation`, status data/icon events at `battleScriptEvents.ts:96-119,166-197`; stat changes emit at `battleScriptStatBuffs.ts:283-312`. | A generic banner/status command union, not the current accuracy-only projector at `sceneOffPresentation.ts:290-326`. |
| Faint | `play-faint-cry` and `faint-animation` at `battleScriptEvents.ts:73-81`; the controller opcode emits faint animation at `battleScriptSourceCommands.ts:924-935`; the zero endpoint is an `hp-change`. | Group zero HP + faint-animation + faint-message provenance into one typed faint lifecycle; choose player/opponent geometry from battler metadata. |
| Forced selector | A real `BattleForcedSwitchRequest` boundary at `battleDecisionBoundary.ts:52-63`; full-turn construction is at `factoryBattleScriptFullTurnDecision.ts:1515-1537`. | Pause resolution after the faint dismiss, retain the same lifecycle identity, and hand the request to the forced selector. |
| Party status summary | `draw-party-status-summary` and `hide-party-status-summary` at `battleScriptEvents.ts:82-90`, emitted at `battleScriptSourceCommands.ts:936-947`. | Snapshot ball states from the receipt's rules/party at command construction; the event is the timing marker, not a complete pixel payload. |
| Party-index/species handoff | `switch{side,fromPartyIndex,toPartyIndex}` at `battleScriptEvents.ts:204-209`, emitted when `getswitchedmondata` commits the index at `battleScriptSwitchinOpcode.ts:300-348`. | Apply it to persistent per-battler display state, reset that battler's command cursor/idle epoch, and resolve incoming art/healthbox from the post-switch rules. |
| Ball/materialize/healthbox start | No dedicated event. `Cmd_switchinanim` currently updates rules/scheduler only at `battleScriptSwitchinOpcode.ts:600-644`. | Add a narrow `switch-in-animation{battler,partyIndex}` presentation event at that controller emission. Do not synthesize it from elapsed time after `switch`. |
| Next menu | A genuine next `BattleCommandRequest` boundary, created at `factoryBattleScriptFullTurnDecision.ts:1540-1635`. | Retain it as pending until every resolution command completes; then construct the replacement command presentation. |
| Terminal outcome | A `BattleTerminalBoundary` at `battleDecisionBoundary.ts:78-101`; the declared semantic `outcome` payload has no required role here. | Treat the terminal boundary as the lifecycle completion target. Do not add a duplicate outcome event solely for presentation. |

`animation`, audio, and visibility events remain in the receipt and preserve
ordering. Scene OFF may consume a controller-visible status/faint/switch
command, but it skips move-particle choreography. Scene ON animation timelines
remain animation-lane work.

## 2. Seam shape

### 2.1 Transition receipt and typed render state

Add `src/engine/battleResolutionPresentation.ts`. The constructor consumes the
submitted command identity, the field snapshot that was actually displayed,
and the complete transition receipt:

```ts
createBattleResolutionPresentation({
  sourceRequest,
  sourceDecision,
  beforeRules,
  transition,
  fieldBoundary,
}): BattleResolutionPresentationState
```

The state has this bounded shape:

```ts
type BattleResolutionPresentationState = Readonly<{
  resolutionId: Readonly<{
    requestId: number;
    side: "player";
    battler: 0;
  }>;
  sourceDecision: BattleCommandDecision;
  segments: readonly BattleResolutionSegment[];
  segmentIndex: number;
  commandIndex: number;
  lifecycle: Readonly<{
    phase:
      | "presenting"
      | "awaiting-message-dismiss"
      | "forced-party-handoff"
      | "presenting-switch-in"
      | "next-command-handoff"
      | "terminal-handoff";
    phaseElapsed: number;
  }>;
  field: BattleResolutionDisplayedField;
  pendingBoundary: BattleBoundary;
  pendingBattle: BattleState<FactoryFullTurnDecisionRules>;
  forcedRequest: BattleForcedSwitchRequest | null;
}>;
```

Each `BattleResolutionSegment` contains one immutable transition's
`beforeRules`, `afterRules`, ordered `BattleKernelSemanticEvent[]`, and
projected commands. A player forced-switch decision appends the resume
transition as another segment under the same `resolutionId`; it does not
create a fake second turn or discard the pre-selector segment.

`BattleResolutionPresentationCommand` is a discriminated union:

```ts
type BattleResolutionPresentationCommand =
  | { type: "message"; eventSequence: number; lines: readonly string[];
      advance: "automatic" | "button"; timing: BattleMessageTiming }
  | { type: "hp"; eventSequence: number; battler: 0 | 1;
      from: number; to: number; healthValue: number; timing: BattleHpTiming }
  | { type: "stat"; eventSequence: number; battler: 0 | 1;
      stat: BattleStatName; from: number; to: number;
      timing: BattleStatTiming }
  | { type: "status"; eventSequence: number; battler: 0 | 1;
      before: number; after: number; timing: BattleStatusTiming }
  | { type: "faint"; eventSequence: number; battler: 0 | 1;
      partyIndex: BattlePartyIndex; timing: BattleFaintTiming }
  | { type: "party-summary"; eventSequence: number; battler: 0 | 1;
      visible: boolean; states: readonly PartyBallState[] }
  | { type: "switch-in"; eventSequence: number; battler: 0 | 1;
      fromPartyIndex: BattlePartyIndex; toPartyIndex: BattlePartyIndex;
      incoming: BattleCommandFieldBattler; timing: BattleSwitchInTiming }
  | { type: "turn-end"; timing: BattleTurnEndTiming };
```

Every command clock is relative to entry into that command. Timing tables are
source-derived presentation policy selected by command/event shape, never by
species name, move name, battle number, turn number, `BattleSceneState.elapsed`,
or trace tick. Message lines are resolved once at construction and frozen.
The renderer receives no kernel object and performs no battle-rule inference.

The display field starts from the submitted
`BattleCommandPresentationState.field` (`battleCommandPresentation.ts:83-104`),
not from final transition rules. Commands apply visible HP/status/party-index
changes in order. This prevents the current failure mode where an immediately
resolved 91→63 kernel state would render 63 before the bar-drain command.

### 2.2 Relationship to `BattleCommandPresentation`

The ownership handoff is replacement, not nesting:

```text
BattleCommandPresentation(request N, phase=submitting)
  -> BattleResolutionPresentation(source request N, pending boundary N+k)
  -> BattleCommandPresentation(request N+k)
     or forced PartySelect(request N+k) -> same Resolution + continuation
     or terminal presentation
```

`BattleCommandPresentation` remains responsible only for action/FIGHT/voluntary
party input and exact decision submission
(`battleCommandPresentation.ts:303-442`). On legal submission:

1. preserve its displayed field and exact request/decision;
2. run the player boundary and any automatically driven trainer command;
3. collect every returned event in strict sequence order;
4. create resolution state;
5. set `battleCommandPresentation` to `null`;
6. do **not** call `commandPresentationForBoundary` until resolution reaches
   `next-command-handoff`.

Today `driveTrainerBoundary` advances through trainer commands and installs the
next player command immediately, discarding transition event receipts
(`factoryRoundBattleOrchestrator.ts:579-644`); both move and voluntary-switch
submission paths call it directly
(`factoryRoundBattleOrchestrator.ts:652-727`). Refactor it to return a typed
`FactoryBattleDriveReceipt { battle, history, events, boundary }`. Event arrays
from multiple automatic submissions are concatenated only after asserting
strictly increasing public `sequence` values.

Presentation-local command completion remains an internal reducer action like
`acknowledgeSceneOffCommand` (`sceneOffPresentation.ts:398-414`). It never
crosses `submitBattleDecision`, whose public contract deliberately accepts
rules decisions only (`battleDecisionBoundary.ts:771-782`).

### 2.3 Per-battler boundary state

Entry 703 established that controller-owned `gMoveSelectionCursor` state must
outlive one request and reset only for the battler that switches. The current
array and switch-in reset are at
`factoryRoundBattleOrchestrator.ts:143-165,543-560`.

Extend that pattern with one persistent, controller-owned entry per singles
battler:

```ts
type FactoryBattlePresentationBattlerBoundary = Readonly<{
  battler: 0 | 1;
  partyIndex: BattlePartyIndex;
  field: BattleCommandFieldBattler;
  displayedHp: number;
  displayedStatus1: number;
  spriteVisible: boolean;
  idleEpoch: number;
  moveCursor: 0 | 1 | 2 | 3;
}>;
```

Rules:

- fresh battle construction resets both entries and both move cursors;
- a new command request for the same active party member preserves cursor and
  idle epoch while refreshing field facts from live rules;
- `hp`, status, and visibility commands update only the addressed battler;
- `switch` resets only that battler's cursor and idle epoch, installs the new
  party index, and keeps the incoming sprite hidden until `switch-in`;
- completed send-out commits the displayed incoming field into the battler
  entry;
- the replacement command presentation is built from these committed boundary
  entries plus the genuine new request/rules, and cross-checks identity/HP;
- terminal completion discards the battle entries.

This state is presentation/controller bookkeeping. It may freeze/rebase idle
bounce clocks, but it must never alter HP, status, party order, PP, RNG, AI,
turn order, or a decision request.

### 2.4 Forced-switch continuation and terminal handoff

When the pending boundary is a player `BattleForcedSwitchRequest`, resolution
finishes the faint message and enters `forced-party-handoff`. It constructs the
existing request-owned selector from the request and live party
(`partySelect.ts:153-228`). The selector submission uses the ordinary bridge
at `partySelect.ts:507-531`; its returned transition is appended as a new
resolution segment. `switch`, party-summary, switch-in message, and the new
`switch-in-animation` event then drive the send-out. Only after those commands
complete may the next command presentation be created.

Trainer forced switches are automatically decided by the existing kernel/AI
path; they append the same semantic segment and use the same send-out
presentation without a party UI. Voluntary switches enter the same switch-in
command family without a preceding faint/forced selector.

When the pending boundary is terminal, resolution presents the final
faint/result message and then enters `terminal-handoff`. It passes the already
computed boundary to the existing battle/round completion owner; it does not
recalculate the winner and does not render swap, commentary, or seventh-win
UI.

## 3. Equivalence-first plan

### 3.1 Structural equivalence

The first implementation does not change pixels or core dispatch. It proves
that the existing explicit-OFF nine-command turn can be constructed through
the new receipt:

- same source request/decision identity;
- same ordered event sequences and provenance;
- same resolved text, PP, HP, stat, turn-end, and pending command boundary;
- same acknowledgement boundaries
  `145,146,160,260,261,311,400,404,405`;
- same final per-battler display snapshot;
- same genuine next request 3.

The generic side must be constructed only by
`createBattleResolutionPresentation`. The current
`createBattleKernelTurnPresentation` at `sceneOffPresentation.ts:236-390`
becomes either a thin compatibility wrapper around the new projector or an
independent expected-value fixture; it must not remain a second production
resolution implementation.

Also prove three noncanonical state-only receipts:

1. noncritical damage plus an effectiveness message;
2. zero HP → faint → player forced boundary;
3. switch continuation → new party index/species/healthbox → next command.

Production code must not import a `*-dump`, `*-probe`, `*-watch`, or
`*-boundaries` recording. Unknown message placeholders, unpaired HP events,
missing switch-in markers, or out-of-order sequences throw instead of selecting
a fallback window.

### 3.2 Immutable canonical regression table

The following table is the complete regression set for these slices. Files
without `oracleProfile` are historical Battle-Scene-ON canonical evidence;
they protect the existing exact mechanisms while dispatch/content ownership is
changed. They do not claim new OFF animation acceptance. Counts are immutable:
captures may not be removed, shifted, or thinned.

| Purpose | Trace | Required exact count |
| --- | --- | ---: |
| Real-kernel Scene-OFF command projection | `battle2-off-turn1-staged.json` | 16/16 |
| Menu boundary 3 | `turn3-menu.json` | 254/254 |
| Menu boundary 4 | `turn4-menu.json` | 44/44 |
| Menu boundary 5 | `turn5-menu.json` | 42/42 |
| Menu boundary 6 | `turn6-menu.json` | 44/44 |
| Menu boundary 7 | `turn7-menu.json` | 93/93 |
| Menu boundary 8 | `turn8-menu.json` | 88/88 |
| Menu boundary 9 | `turn9-menu.json` | 111/111 |
| Menu boundary 10 | `turn10-menu.json` | 83/83 |
| Menu boundary 11 | `turn11-menu.json` | 56/56 |
| Menu boundary 12 | `turn12-menu.json` | 46/46 |
| Menu boundary 13 | `turn13-menu.json` | 57/57 |
| Existing semantic stat-down proof | `turn13-sandattack.json` | 190/190 |
| Opponent KO/faint hold | `turn13-dragonbreath-faint.json` | 141/141 |
| Opponent automatic switch-in | `turn13-switchin.json` | 242/242 |
| Player KO before forced party | `turn15-fly-strike.json` | 256/256 |
| Forced party selector | `turn15-party-select.json` | 200/200 |
| Delayed forced selector control | `turn15-party-select-delayed.json` | 200/200 |
| Player send-out through next menu | `turn15-sendout-rung6.json` | 195/195 |
| Delayed send-out control | `turn15-sendout-rung6-delayed.json` | 195/195 |
| Post-switch action/resolution boundary | `turn16-rung5.json` | 175/175 |
| Terminal KO/result part A | `turn17-rung7a.json` | 255/255 |
| Terminal KO/result part B | `turn17-rung7b.json` | 147/147 |
| Trainer-loss handoff part A | `turn17-rung8a.json` | 255/255 |
| Trainer-loss handoff part B | `turn17-rung8b.json` | 118/118 |

`turn13-sandattack.json` is the first retirement target for ISSUES #39: its
content already comes from the generic stat-down bridge, but its surrounding
dispatcher remains canonical. The next conversions are, in order:

1. the canonical OFF nine-command turn, re-owned by resolution state;
2. `turn13-dragonbreath-faint` from zero-HP/faint events;
3. `turn13-switchin` from switch/summary/message/switch-in events;
4. the Turn-15 forced selector/send-out pair;
5. Turn-16 next-command replacement;
6. Turn-17 terminal handoff.

At every step, all earlier rows remain exact. Existing canonical functions may
temporarily serve as equivalence render adapters that accept typed commands.
They may not inspect a turn flag after their typed replacement is active.

The ground-truth-only `battle2-off-turn1.json` remains uncommitted to app
acceptance at **179 captures** (`docs/battle2-off-portability-notes.md:3-14`).
The forced-switch mechanic-lab files remain oracle evidence, not app compare
traces. No new acceptance trace is justified before the generated live route
owns resolution.

## 4. Ordered implementation slices

Every slice is sized for one bounded worker (target: 45 minutes or less).
Stop at an honest green evidence checkpoint if a named count cannot be met.

### Slice 1 — receipt ownership and structural projection

Goal: add `battleResolutionPresentation.ts`, the typed segment/command/display
state, and structural constructor. Refactor the one-turn Scene-OFF projector
to use it without changing core/orchestrator behavior. Add the canonical deep
equivalence test and noncanonical damage/faint/switch state fixtures. Do not
edit `battleScene.ts`.

Files: `battleResolutionPresentation.ts`, `sceneOffPresentation.ts`,
`tests/battleResolutionPresentation.test.ts`,
`tests/battleTurnPortability.test.ts`.

Acceptance:

```sh
npx vitest run tests/battleResolutionPresentation.test.ts \
  tests/battleTurnPortability.test.ts tests/battleDecisionBoundary.test.ts \
  tests/battleStringResolver.test.ts tests/executableFrontierRatchet.test.ts
npm run compare -- battle2-off-turn1-staged.json --summary  # 16/16
npm test
npm run build
```

### Slice 2 — live non-KO Scene-OFF renderer

Goal: add `battleResolutionPresentationRender.ts`; render attack strings,
HP drain, stat/status/result messages, turn-end, and the six-frame blank
handoff from typed commands. Factor source-relative text/healthbox helpers
without changing canonical callers. The renderer may consume no final kernel
state directly and no canonical duration vector.

Files: `battleResolutionPresentationRender.ts`, narrow helpers in
`battleScene.ts`, `healthboxAssembly.ts`, `battleStringResolver.ts`, and
focused tests.

Acceptance:

```sh
npx vitest run tests/battleResolutionPresentation.test.ts \
  tests/battleStringResolver.test.ts tests/healthboxAssembly.test.ts \
  tests/battleScene.test.ts
npm run compare -- battle2-off-turn1-staged.json --summary  # 16/16
npm run compare -- turn13-sandattack.json --summary         # 190/190
for t in turn3-menu turn4-menu turn5-menu turn6-menu turn7-menu \
  turn8-menu turn9-menu turn10-menu turn11-menu turn12-menu turn13-menu
do npm run compare -- "$t.json" --summary; done
# Exact counts: 254,44,42,44,93,88,111,83,56,46,57.
npm test
npm run build
```

### Slice 3 — orchestrator replacement and generated non-KO handoff

Goal: make trainer driving return an aggregated transition receipt, replace
the submitting command presentation with resolution, retain the genuine next
boundary, and create the next command only when resolution completes. Extend
the controller-owned per-battler boundary state and preserve/reset move cursors
as specified in §2.3. No faint/send-out rendering yet; test a non-KO generated
turn only.

Files: `factoryRoundBattleOrchestrator.ts`,
`battleResolutionPresentation.ts`, `core.ts`, focused orchestrator tests.

Acceptance:

```sh
npx vitest run tests/factoryRoundBattleOrchestrator.test.ts \
  tests/battleCommandPresentation.test.ts \
  tests/battleResolutionPresentation.test.ts \
  tests/factoryBattleScriptFullTurnDecision.test.ts
npm run compare -- battle2-off-turn1-staged.json --summary  # 16/16
# Then run every menu/stat row in §3.2 at its exact count.
npm test
npm run build
```

### Slice 4 — faint and forced-party midpoint

Goal: project zero-HP/faint events into a typed faint window, preserve the
accepted sink/healthbox/text/cursor mechanisms, and pause at a genuine player
forced-switch boundary. Construct the existing request-owned forced selector
only after faint-message dismissal. Do not implement send-out yet; submission
may land an honest continuation receipt checkpoint.

Files: `battleResolutionPresentation.ts`,
`battleResolutionPresentationRender.ts`, narrow factoring in
`battleScene.ts:12999-13139,14377-14463`, `partySelect.ts`, focused tests.

Acceptance:

```sh
npx vitest run tests/battleResolutionPresentation.test.ts \
  tests/turn5FaintPresentationStaging.test.ts \
  tests/partySelect.test.ts tests/factoryBattleScriptFullTurnDecision.test.ts
npm run compare -- turn13-dragonbreath-faint.json --summary # 141/141
npm run compare -- turn15-fly-strike.json --summary         # 256/256
npm run compare -- turn15-party-select.json --summary       # 200/200
npm run compare -- turn15-party-select-delayed.json --summary # 200/200
# Then run every earlier row in §3.2 at its exact count.
npm test
npm run build
```

### Slice 5 — semantic switch-in and generic send-out

Goal: emit the narrow `switch-in-animation` event from the real controller
opcode, append forced-switch continuation receipts to the same resolution,
and render party summary, switch-in text, ball/species handoff, arbitrary
incoming art/healthbox, and next-menu clear from typed state. Reuse the
source-composed party rows/icons from `battlePartySelect.ts`; remove the
ONIX/MAGBY/BAYLEEF visual guard only when canonical equivalence is exact.
Prove a delayed confirm replays the same relative lifecycle.

Files: `battleScriptEvents.ts`, `battleScriptSwitchinOpcode.ts`,
`battleResolutionPresentation.ts`,
`battleResolutionPresentationRender.ts`, `partySelect.ts`,
`battleScene.ts:14508-14544,14771-14869,15767-15831`, focused tests.

Acceptance:

```sh
npx vitest run tests/battleScriptSwitchinOpcode.test.ts \
  tests/battleResolutionPresentation.test.ts tests/partySelect.test.ts \
  tests/battlePartySelect.test.ts tests/battleMonPics.test.ts \
  tests/healthboxAssembly.test.ts
npm run compare -- turn13-switchin.json --summary            # 242/242
npm run compare -- turn15-sendout-rung6.json --summary      # 195/195
npm run compare -- turn15-sendout-rung6-delayed.json --summary # 195/195
npm run compare -- turn16-rung5.json --summary              # 175/175
# Then run every earlier row in §3.2 at its exact count.
npm test
npm run build
```

### Slice 6 — terminal handoff and canonical retirement proof

Goal: retain a terminal boundary until final resolution text/faint completes,
then hand the immutable outcome to the existing round owner. Re-drive the
Turn-17 KO/result/trainer-loss windows from typed receipt/boundary state and
remove their turn-flag dispatch for those windows. This slice does not render
post-win commentary, swaps, or seventh-win presentation.

Files: `battleResolutionPresentation.ts`,
`battleResolutionPresentationRender.ts`,
`factoryRoundBattleOrchestrator.ts`, narrow factoring in
`battleScene.ts:14966-15119,15494-15631`, focused tests.

Acceptance:

```sh
npx vitest run tests/battleResolutionPresentation.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/battleResolutionAdapter.test.ts tests/battleScene.test.ts
npm run compare -- turn17-rung7a.json --summary  # 255/255
npm run compare -- turn17-rung7b.json --summary  # 147/147
npm run compare -- turn17-rung8a.json --summary  # 255/255
npm run compare -- turn17-rung8b.json --summary  # 118/118
# Then run the complete §3.2 table at its exact counts.
npm test
npm run build
```

### Slice 7 — explicit-OFF generated command breadth proof

Goal: finish the command seam's deferred acceptance. From the existing
`battle-command-generated-off` app stage
(`tools/compare/appTrace.ts:92-128,136-138`), drive a generated active
species/moveset different from ONIX/KABUTO through settled action menu, FIGHT
open, at least two cursor moves, B cancel, reopen, one legal A-confirm, the
complete typed Scene-OFF resolution, and the next settled command menu.

Only now commit `tools/compare/traces/battle-command-generated-off.json` with
explicit `"oracleProfile": "battle-scene-off"` and exactly 128 consecutive,
additive captures. No canonical capture is removed.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/battleResolutionPresentation.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/factoryBattleScriptFullTurnDecision.test.ts \
  tests/battleMonPics.test.ts tests/healthboxAssembly.test.ts
npm run compare -- battle-command-generated-off.json --summary # 128/128
# Then run the complete §3.2 table at its exact counts.
npm test
npm run build
```

If the honest generated oracle route does not produce the same staged species,
rules, and command sequence, land only a clean route/evidence checkpoint and
leave **0/128 claimed**. Do not replay oracle framebuffers, add tick-keyed
lookups, bake interactive sprites into chrome, fit coordinates/RGB values, or
thin captures.

## 5. Out-of-scope register

- Move animations, particles, hit sprites, palette choreography, and all
  Scene-ON animation-timeline breadth belong to the animation lane. Main may
  preserve existing exact helpers while changing dispatch, but must not take
  ownership of their choreography.
- Damage, accuracy, criticals, effectiveness calculation, target selection,
  PP consumption, RNG, AI choice, turn order, faint eligibility, switch
  legality, entry effects, outcomes, and round advancement remain kernel-owned.
- Factory post-win rental swaps are outside this lifecycle.
- Opponent commentary/scouting pages are outside this lifecycle.
- Seventh-win/round-summary presentation is outside this lifecycle. A terminal
  handoff may deliver the existing outcome to its owner; it may not render or
  acknowledge the seventh-win flow.
- BAG use, RUN/forfeit policy, doubles, multi-target selection, and Open-level
  layout remain outside the landed Level-50 singles command contract.
- Audio events remain ordered receipts but audio acceptance belongs to S11.
- A complete arbitrary-species party selector is adjacent reuse work only to
  the extent required by a real forced switch. Summary-page navigation and
  voluntary cancel semantics are not part of forced send-out.
- No new canonical recording import, battle/turn branch, absolute-tick lookup,
  screenshot replay, baked interactive cursor/sprite, coordinate/RGB fitting,
  or capture-list thinning is permitted.
