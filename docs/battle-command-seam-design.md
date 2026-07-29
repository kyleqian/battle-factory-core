# Battle-command presentation seam design

Status: bounded Rung-14 design at `c65cb071` (2026-07-29). This document
owns the singles player action-menu/FIGHT-menu seam only. It does not propose
a rewrite of `battleScene.ts`, and none of the implementation slices below may
add a battle-number, turn-number, or absolute-tick dispatch branch.

## 1. Render inventory

### 1.1 Action-menu entry and settled window

The canonical command window has three visible stages:

1. The existing battlefield, battler sprites, and both healthboxes remain
   visible while the message window clears.
2. A six-frame teal blank-message hold is followed by an atomic draw of
   `What will <active name> do?`, the `FIGHT / BAG / POKéMON / RUN` grid, and
   the cursor on FIGHT.
3. The settled battlefield remains interactive while the player battler and
   player healthbox follow the independent idle-bounce generators.

`docs/battle-menu-notes.md:18-60` pins the Battle-1 boundaries: blank at
1742-1747 and atomic menu draw at 1748. Battle 2 has the same shape relative
to its send-out handoff: `battle2ActionMenu.ts:3-14` defines blank offsets
325-330 and reveal offset 331, while `:39-49` already expresses age,
input-readiness, and bounce rebasing relative to that handoff.

The rendered elements and their present ownership are:

| Element | Present implementation | Genericity verdict |
| --- | --- | --- |
| Battle terrain | `battleScene.ts:5888` draws the extracted Factory battle background. | Shared Factory chrome, but not part of a command render model. |
| Player/opponent battler sprites | `battleScene.ts:5889-5900` calls the fixed KABUTO and ONIX paths. The available catalogs currently cover only 11 opponent front species and 12 back species. | Canonical species/geometry. |
| Opponent healthbox | `healthboxAssembly.ts:39-65,458-509` composes name, level, gender, HP band/fraction, and all five statuses from raw healthbox assets. | Generic singles content and chrome. |
| Player healthbox | `healthboxAssembly.ts:697-765` composes the same live identity/status surface plus HP digits and EXP strip. | Generic singles content and chrome. |
| Action window border/options | `battleScene.ts:9543-9562` crops the accepted `menuIdleBase` region at `y >= 112`; `battleScene.ts:5903-5907` reuses it for Battle 2. | Shared pixels, but still a harvested ONIX/FIGHT-selected window rather than typed action-menu state. |
| Prompt name | The harvested base contains ONIX. `battleScene.ts:9564-9593` can erase its prompt row and draw MAGBY, but the function and string are MAGBY-specific. | Mechanism partly generic; call site and name are canonical. |
| Action cursor | The base harvest bakes the cursor at FIGHT. `core.ts:786-789` explicitly says BAG/POKéMON/RUN cursor movement is not modeled. | Canonical fixed cursor. |
| Entry/idle clocks | Battle 2's `actionMenuAge`, `actionMenuInputReady`, and `actionMenuBounceTick` are handoff-relative (`battle2ActionMenu.ts:39-49`). Battle 1 and later turns instead flow through recorded scene epochs and flags (`battleScene.ts:2146-2359,6227-6337`). | A reusable timing mechanism exists, but the main dispatcher is canonical/turn-keyed. |

`BATTLE2_ACTION_MENU_MODEL` is the clearest current data boundary:
`battle2ActionMenu.ts:16-37` hardcodes ONIX 117/117 versus KABUTO 91/91,
the prompt, all four labels, and cursor zero. The live Battle-2 compositor at
`battleScene.ts:5874-5907` consumes that fixed identity rather than the battle
kernel.

### 1.2 FIGHT submenu

The FIGHT submenu atomically replaces the bottom action window after its
off-screen draw/DMA wait. It renders:

- four move names in a 2x2 grid;
- a cursor arrow at the selected slot;
- `PP` plus the selected move's current/max PP;
- `TYPE/` plus the selected move's display type;
- the unchanged battlefield and healthboxes above it.

The current pieces are unevenly generic:

| Element or behavior | Present implementation | Genericity verdict |
| --- | --- | --- |
| Four move names, PP, PP color band, and type text | `fightSubmenuText.ts:41-95` builds display rows from numeric move IDs/current PP; `:141-221` blanks and redraws all six source text windows using generated move/font data. | Generic for four real moves and live PP values. |
| Type abbreviations | `fightSubmenuText.ts:51-76` transcribes `gTypeNames`, including the non-obvious abbreviated names. | Generic. |
| Border and cursor patch | `battleScene.ts:6532-6556` chooses one of four harvested patches using `FIGHT_SUBMENU_SLOT_NAMES`. The live text layer overwrites the baked text. | Cursor selection is generic over four slots; the outer chrome remains a canonical harvest. |
| Open/close/confirm state | `battleMenu.ts:904-985` carries open, logical/display cursors, B-close, A-confirm, moveset, and same-turn reopen identity. | Reusable reducer shape, but its clocks are stored as recorded `BattleSceneState.elapsed` values. |
| Cursor movement | `battleMenu.ts:987-1011` implements the source 2x2 XOR grid, no wrap, JOY_NEW only, with a one-render-tick display lag. | Generic for four occupied slots. Legality for fewer/disabled slots still belongs to the request. |
| B cancel/reopen | `battleScene.ts:6339-6358` preserves the action window during open/close waits; `core.ts:879-920` handles B-close and same-command reopen. | Behavior is exact, but wired into the recorded scene controller. |
| Move confirmation | `core.ts:850-878` accepts only recorded slots 0/1/2; `battleMenu.ts:973-985` merely records a confirm clock. It does not submit to the kernel. | Canonical/turn-keyed. Slot 3 is deliberately unsubmitted today. |
| Current PP | `battleMenu.ts:2486-2575` reconstructs PP from fourteen turn-resolved flags and known recorded choices. | Canonical/turn-keyed even though the text renderer itself is generic. |
| Active moveset | `core.ts:806-821` chooses between the recorded draft lead and the Turn-15 forced-switch handoff. `battleSetup.ts:1-15,71-88` still defines active as the drafted lead outside that special handoff. | Canonical handoff, not live active-battler state. |
| Scene dispatch | `battleScene.ts:6227-6337` selects turn-specific FIGHT functions; the forced-switch path selects another recorded window at `:15576-15587`; top-level render forwards fourteen resolved flags at `:15722-15742`. | The central Rung-14 gap. |

The canonical cancel evidence is important: FIGHT opens after its established
wait, DPAD changes logical cursor immediately and display cursor one tick
later, held DPAD does not repeat, B returns to the same action command, and a
fresh A reopens FIGHT with its cursor preserved. A-confirm has no visible
submenu-close animation; presentation holds until the battle controller takes
the field. These behaviors are already captured densely and must not be
re-derived from new recordings during the equivalence slices.

### 1.3 Kernel data already available

`BattleCommandRequest` contains `requestId`, `side`, `battler`, and the exact
legal move/switch decisions (`battleDecisionBoundary.ts:25-50`). The full-turn
adapter's rules state contains `rulesContext`
(`factoryBattleScriptFullTurnDecision.ts:310-322`).

For the active field, `BattleScriptRulesContext` provides:

- each active battler's species, personality, level, HP/max HP, status,
  four move IDs, four PP values, and party index
  (`battleScriptRulesContext.ts:241-249,348-371`);
- the full six-member parties with identity, level, HP/max HP, status,
  moves, PP, and PP bonuses (`:531-578`);
- active party indexes through `battlers[].partyIndex` and the two party
  arrays at `:651-659,748-759`.

Therefore the missing seam is adaptation and lifecycle, not battle rules.

## 2. Seam shape

### 2.1 Typed render state

Add `src/engine/battleCommandPresentation.ts`. Its public constructor is:

```ts
createBattleCommandPresentation(
  request: BattleCommandRequest,
  rules: BattleScriptRulesContext,
): BattleCommandPresentationState
```

The constructor accepts player-side singles command requests only. It validates
that the request battler is the live player battler, resolves both active
party indexes from `rules.battlers`, and snapshots the source values needed by
presentation. The state is immutable and has this bounded shape:

```ts
type BattleCommandPresentationState = Readonly<{
  request: BattleCommandRequest;
  lifecycle: Readonly<{
    phase:
      | "action-enter"
      | "action-menu"
      | "fight-opening"
      | "fight-menu"
      | "fight-closing"
      | "party-handoff"
      | "submitting";
    phaseElapsed: number;
  }>;
  field: Readonly<{
    player: BattleCommandFieldBattler;
    opponent: BattleCommandFieldBattler;
  }>;
  actionCursor: 0 | 1 | 2 | 3;
  fightCursor: 0 | 1 | 2 | 3;
  fightDisplayCursor: 0 | 1 | 2 | 3;
  legalMoveBySlot: readonly [
    BattleMoveDecision | null,
    BattleMoveDecision | null,
    BattleMoveDecision | null,
    BattleMoveDecision | null,
  ];
  legalSwitchPartyIndexes: readonly BattlePartyIndex[];
  pendingDecision: BattleCommandDecision | null;
}>;
```

`BattleCommandFieldBattler` contains side, battler, party index, species ID
and display name, level, gender, HP/max HP, UI status, move IDs, current PP,
and PP bonuses. The active `rules.battlers[]` values win over party values for
HP/status/moves/PP because Transform and in-battle controller writes affect
`gBattleMons`; the party record supplies persistent identity fields and is
cross-checked by party index. Species name/gender/status conversion must use
the existing generated species data and source masks, not new canonical
literals.

`legalMoveBySlot` retains the exact `targetBattler` published by the request.
The presentation never reconstructs a target as “the opponent.” A slot absent
from the request is non-selectable even if the active battler has a nonzero
move there. Likewise, legal switch indexes come only from switch decisions in
the request.

The four action labels remain visible because they are canonical chrome, but
this boundary exposes decisions for only FIGHT and POKéMON. BAG inventory and
Factory RUN/forfeit policy are not invented here.

### 2.2 Typed command lifecycle

The mechanism that avoids another `battleScene.ts` branch is a
**request-ID-owned, phase-relative command lifecycle**:

- Create one presentation when a live player `BattleCommandRequest` becomes
  the active boundary. Its identity is `(requestId, side, battler)`.
- Advance only `phaseElapsed`; reset it to zero at action/FIGHT/party phase
  changes. Existing open/close delays and the one-tick display-cursor lag are
  retained, but no phase stores `BattleSceneState.elapsed`.
- B in `fight-menu` enters `fight-closing`, then returns to the same
  `action-menu` and the same request. A later FIGHT open preserves
  `fightCursor`, matching the existing reopen evidence.
- A on a legal move stores that exact `BattleMoveDecision` in
  `pendingDecision` and enters `submitting`.
- A on POKéMON enters `party-handoff`; the command presentation does not
  pretend that a party index was selected. A voluntary party selector may
  return one of `legalSwitchPartyIndexes` later.
- Dispose the presentation after submission returns a new battle boundary.
  A new request ID creates a new lifecycle. There is no presentation
  acknowledgement decision.

Rendering is selected by the presence of this typed lifecycle, before the
legacy recorded dispatcher. A single
`renderBattleCommandPresentation(framebuffer, presentation, assets)` entry
renders action/FIGHT phases. It may call factored field/chrome helpers, but it
must not inspect battle number, turn number, `BattleSceneState.elapsed`, or an
absolute trace tick. The existing Battle-2 handoff may activate the lifecycle
from its already phase-relative `actionMenuAge`; subsequent live generated
battles activate directly from their command boundary.

This mirrors the two landed seams:

- `createFactorySwapPresentation` consumes full round records/parties and
  initializes relative presentation clocks
  (`factorySwapPresentation.ts:293-334`), while
  `submitFactorySwapRoundDecision` bridges only at the source copy boundary
  (`:351-391`).
- `createPartySelectStateFromForcedSwitch` consumes a typed request plus full
  rental/battle party data (`partySelect.ts:151-225`), and
  `submitPartySelectBattleDecision` submits the selected switch through the
  ordinary kernel boundary (`:481-511`).

### 2.3 Submission bridge

Add:

```ts
submitBattleCommandPresentationDecision(
  battleState,
  presentation,
  reducer,
): BattleDecisionTransitionResult | null
```

It returns `null` until `phase === "submitting"` and `pendingDecision` is set.
It then calls `submitBattleDecision` with:

```ts
{
  requestId: presentation.request.requestId,
  side: presentation.request.side,
  decision: presentation.pendingDecision,
}
```

The generic boundary revalidates request identity and legality. The bridge
does not mutate PP, HP, RNG, turn order, or the request, and does not add an
`acknowledge-presentation` pseudo-decision. Core replaces the battle state
with the returned transition and tears down this request's presentation.

## 3. Equivalence-first plan

### 3.1 Structural equivalence

The first implementation must not change pixels or input dispatch. It creates
the generic adapter and proves the canonical Battle-2 command state through
it.

In `tests/battleCommandPresentation.test.ts`, build the existing recorded
handoff projection from:

- `BATTLE2_ACTION_MENU_MODEL` (`battle2ActionMenu.ts:16-37`);
- `CLOSED_FIGHT_SUBMENU_STATE` (`battleMenu.ts:944-955`);
- `rentalMoveset("ONIX")` (`battleSetup.ts:71-76`);
- the existing source-valid Battle-2 ONIX/KABUTO rules fixture and its
  `BattleCommandRequest`.

Project both old and new states to the complete render-owned structure:
field battlers, prompt battler, action labels/cursor, four move IDs, current
PP, legal move slots/targets, legal switch indexes, and lifecycle cursors.
Assert deep structural equality, including frozen nested arrays. The generic
side must be constructed only by
`createBattleCommandPresentation(request, rules)`. Production code must not
import `*-dump`, `*-probe`, `*-watch`, or `*-boundaries` recordings; the
executable-frontier import ratchet remains 6/6.

Also prove a materially different rules fixture changes species, HP, status,
moves, PP, active party indexes, and legal slots without changing adapter
code. That is a Tier-1 breadth proof, not pixel acceptance.

### 3.2 Canonical pixel regression set

All files below are historical Battle Scene ON traces (no explicit profile).
They are the immutable canonical regression set for every renderer/lifecycle
slice:

| Trace | Required exact count |
| --- | ---: |
| `battle2-action-menu-dense.json` | 209/209 |
| `fight-submenu.json` | 235/235 |
| `fight-submenu-reopen.json` | 90/90 |
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

The first three are the minimum gate for state-only slices. A renderer or
`battleScene.ts` slice runs all fourteen. Captures must not be removed,
thinned, or shifted to make a result green.

Additional ground truth is not app acceptance:

- `traces-groundtruth/battle1-fight-submenu-idle.json` has 256 captures.
- `traces-groundtruth/battle1-fight-submenu-nav.json` has 235 captures.
- explicit-OFF `traces-groundtruth/battle2-off-turn1.json` has 179 captures,
  but `docs/battle2-off-portability-notes.md` correctly calls it ground truth
  for a later scenario adapter, not an app compare trace.

No new oracle trace is justified until a generated/live command boundary can
initialize the app presentation. Existing canonical traces remain even after
an explicit-OFF breadth trace lands.

## 4. Ordered implementation slices

Every slice is sized for one bounded worker. Stop at an honest green
checkpoint if its named equality or counts cannot be met.

### Slice 1 — equivalence state-construction swap (dispatch first)

Goal: add `battleCommandPresentation.ts` with the request/rules-to-render-state
constructor and no core/render behavior change. Add the canonical deep-equality
test and one noncanonical state-only fixture. Do not add lifecycle input or
submission yet.

Files: `src/engine/battleCommandPresentation.ts`,
`tests/battleCommandPresentation.test.ts`; at most narrow exported type/helper
changes in `battle2ActionMenu.ts`. Do not edit `battleScene.ts`.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/battle2ActionMenu.test.ts tests/fightSubmenuText.test.ts \
  tests/healthboxAssembly.test.ts tests/executableFrontierRatchet.test.ts
npm run compare -- battle2-action-menu-dense.json --summary  # 209/209
npm run compare -- fight-submenu.json --summary              # 235/235
npm run compare -- fight-submenu-reopen.json --summary       # 90/90
npm test
npm run build
```

### Slice 2 — phase-relative reducer and ordinary submission

Goal: add the typed lifecycle reducer, action-to-FIGHT open, 2x2 FIGHT
navigation with one-tick display lag, B-close/reopen, legal-slot gating, and
the submission bridge. Prove the bridge passes the exact request-owned
decision (including target) through `submitBattleDecision` and that stale,
illegal, and slot-3-when-legal cases follow the kernel boundary rather than a
recorded slot allowlist. No renderer/core integration.

Files: `battleCommandPresentation.ts`,
`battleCommandPresentation.test.ts`; reuse/refactor `battleMenu.ts` only if
the existing cursor arithmetic can be shared without changing its public
behavior.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/battleDecisionBoundary.test.ts \
  tests/factoryBattleScriptFullTurnDecision.test.ts \
  tests/fightSubmenu.test.ts
npm run compare -- battle2-action-menu-dense.json --summary  # 209/209
npm run compare -- fight-submenu.json --summary              # 235/235
npm run compare -- fight-submenu-reopen.json --summary       # 90/90
npm test
npm run build
```

### Slice 3 — canonical Battle-2 renderer swap

Goal: factor the Battle-2 action/FIGHT renderer to accept the generic render
state and make the canonical Battle-2 window call it. Preserve the existing
send-out predecessor until the command lifecycle owns the blank/action-menu
window. Use phase-relative lifecycle clocks for open, cursor display, close,
and reopen. Do not touch turn-resolution rendering.

Files: a new `battleCommandPresentationRender.ts`, narrow factoring in
`battleScene.ts:5874-5952`, and focused render tests. This is the first slice
allowed to edit `battleScene.ts`, and it may only replace that existing
Battle-2 command path—no new turn/battle/tick selector.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/battle2ActionMenu.test.ts tests/battleMenuIdle.test.ts \
  tests/fightSubmenuText.test.ts tests/healthboxAssembly.test.ts \
  tests/battleScene.test.ts
npm run compare -- battle2-action-menu-dense.json --summary  # 209/209
npm run compare -- fight-submenu.json --summary              # 235/235
npm run compare -- fight-submenu-reopen.json --summary       # 90/90
for t in turn3-menu turn4-menu turn5-menu turn6-menu turn7-menu \
  turn8-menu turn9-menu turn10-menu turn11-menu turn12-menu turn13-menu
do
  npm run compare -- "$t.json" --summary
done
# Exact counts, in order: 254,44,42,44,93,88,111,83,56,46,57.
npm test
npm run build
```

### Slice 4 — live PP and arbitrary healthboxes

Goal: replace the generic render path's turn-flag PP reconstruction with the
adapter's active-battler `moves`/`pp`, and feed both healthboxes exclusively
from `BattleCommandFieldBattler`. Prove poison/burn/paralysis and non-full HP
on each side plus a non-ONIX four-move set in Tier 1. Canonical recorded
paths may continue using their legacy projection, but the generic renderer
must have no turn-resolved parameter.

Asset dependencies already banked:

- `moves.json`, `font-narrow.json`, `font-normal.json`, and
  `fight-submenu-window.json` for move text/chrome;
- `battle-healthbox.json`, including singles player/opponent frames, HP bands,
  status sheets, and EXP strip;
- `species-stats.json` for names/gender derivation.

This slice does not claim arbitrary battler art: the current front/back battle
sprite catalogs are still narrow.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/fightSubmenuText.test.ts tests/healthboxAssembly.test.ts \
  tests/battleScene.test.ts
# Then run the complete fourteen-trace table in §3.2 at its exact counts.
npm test
npm run build
```

### Slice 5 — action cursor and POKéMON handoff

Goal: render the action prompt from the active battler name, construct the
four-option action chrome without a baked FIGHT cursor, and implement source
2x2 action-cursor movement. A on FIGHT enters the existing generic FIGHT
lifecycle. A on POKéMON enters `party-handoff` with the request's legal switch
indexes; it does not submit until a party index returns. FIGHT B returns to
the same action cursor/request.

Assets:

- source window templates plus the existing battle window tiles/font for
  prompt/options/cursor; no baked interactive sprite may replace this;
- the banked 376-species `party-mon-icons.json` catalog is available for the
  later voluntary party-selector renderer;
- party-menu chrome/status overlays and a voluntary-selection adapter remain
  separate dependencies. The forced-switch constructor cannot be reused
  unchanged because it requires a fainted party index.

There is no existing canonical action-cursor navigation trace, so Tier 1
must pin all four cursor positions and transitions. Do not record a new pixel
trace in this slice unless Slice 6's generated route already exists.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/fightSubmenu.test.ts tests/partyMonIcons.test.ts \
  tests/battleScene.test.ts
# Then run the complete fourteen-trace table in §3.2 at its exact counts.
npm test
npm run build
```

### Slice 6 — generated command route and explicit-OFF breadth proof

Goal: connect a live
`FactoryRoundBattleOrchestratorState.battle.boundary.request` and its
`rules.rulesContext` to the command lifecycle, submit a selected move through
`reduceFactoryFullTurnDecision`, and replace the presentation when the next
player request arrives. Trainer requests remain automatically driven by the
existing orchestrator. No battle-number or turn-number state is introduced.

Before claiming arbitrary species pixels, add source-extracted Factory-eligible
front/back battle pic catalogs with palettes, pic coordinates, and required
idle rest offsets. Today `battle-opponent-front-sprites.json` has 11 species
and `battle-back-sprites.json` has 12; healthbox and party-icon assets alone
cannot draw an arbitrary field honestly. Keep the 376-species party-icon
catalog as the POKéMON-screen dependency, not a substitute for battle pics.

Only after the generated route visibly reaches the window, commit
`battle-command-generated-off.json` with explicit
`"oracleProfile": "battle-scene-off"` and exactly 128 consecutive captures:
settled action menu, FIGHT open, at least two cursor moves, B cancel, reopen,
and one legal A-confirm for a generated active species/moveset that differs
from ONIX/KABUTO. The route and all 128 captures are additive; no canonical
capture is removed.

Acceptance:

```sh
npx vitest run tests/battleCommandPresentation.test.ts \
  tests/factoryRoundBattleOrchestrator.test.ts \
  tests/factoryBattleScriptFullTurnDecision.test.ts \
  tests/battleMonPics.test.ts tests/healthboxAssembly.test.ts
npm run compare -- battle-command-generated-off.json --summary  # 128/128
# Then run the complete fourteen-trace table in §3.2 at its exact counts.
npm test
npm run build
```

If an honest generated oracle route cannot initialize the same app state,
land only the route/evidence checkpoint and leave 128/128 open. Do not use a
mechanic-lab screenshot as app state, fit coordinates/RGB values, replay
per-tick framebuffers, or thin the trace.

## 5. Out-of-scope register

- Move animations, particles, sprite animation timelines, scene-ON animation
  acceptance, and all `src/animation/**` work belong to the animation lane.
  This seam ends when a legal command is submitted.
- Damage, accuracy, target resolution, PP consumption, RNG, AI choice, turn
  order, faint processing, switching effects, outcomes, and round advancement
  remain kernel/round-controller responsibilities.
- Doubles, multi-target selection UI, partner commands, and four-active-battler
  layout are outside the Level-50 singles contract.
- BAG inventory/use and RUN/Factory forfeit confirmation are not represented
  by `BattleCommandDecision`; their labels remain visible chrome, but this
  seam must not invent decisions for them.
- The voluntary POKéMON party screen is adjacent work. This seam owns its typed
  handoff and eventual returned switch decision, not party-row rendering,
  summary pages, or the forced-switch screen's faint-specific entry/exit.
- Arbitrary battler front/back art is not implied by generic healthboxes.
  It waits for complete source-derived battle-pic/coordinate/palette coverage.
- Send-out, forced-switch send-out, action-resolution messages, move
  animations, faint windows, post-win commentary, swaps, and seventh-win
  presentation remain separate typed lifecycles.
- No new oracle command trace is recorded before a generated app route reaches
  the window. The 179-capture explicit-OFF Battle-2 fixture remains oracle
  ground truth only until an app-state adapter can consume it honestly.
- No new canonical recording import, absolute-tick lookup, battle/turn branch,
  baked interactive cursor/sprite, screenshot replay, coordinate/RGB fitting,
  or capture-list thinning is permitted.
