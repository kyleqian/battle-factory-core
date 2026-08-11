# Battle 2 OFF kernel-seam scout

> **Resolution (2026-07-27):** The four barriers below are historical.
> Controller correctness landed in `22ddfcd` (complete battler inputs,
> submitted move-slot propagation, source-complete represented action
> cleanup, and provenance-bearing public events); the Scene-OFF consumer
> landed in `f4427c0` (the same nine-command projection and unchanged 16/16
> compare). The evidence and original verdict remain below as the record that
> motivated those commits.

Bounded SIDE-lane evidence only. This checkpoint does not edit a production
module, shared controller interface, canonical trace, or supervisor ledger.
It follows S8's authoritative stop at tick 33331: the existing short staged
OFF portability trace is re-pinned, but no later canonical march is added.

## Verdict

The real `factoryBattleScriptFullTurnDecision` path can execute ONIX's
ROCK SLIDE followed by KABUTO's SAND ATTACK and returns a genuine next-player
`BattleDecisionBoundary`. With the canonical Battle 2 active battlers
rehydrated through the public serializable-state API, it gets the important
rules facts right:

- ONIX acts first without a speed-tie draw (`76 > 61`);
- ROCK SLIDE deals exactly `28`, KABUTO `91 -> 63`;
- Battle Armor suppresses the critical-roll call and the critical message;
- SAND ATTACK lowers ONIX accuracy stage `6 -> 5`;
- neither mon gains a status and the battle remains non-terminal;
- the four move-phase LCG values exactly match the first four oracle values;
- it reaches request 3, a fresh player command boundary.

It is not yet a sound drop-in replacement for the old stage. The run also
pins four concrete gaps:

1. `FactoryFullTurnBattlerConfig` cannot carry ability, item, or source PP,
   defaulting both mons to ability/item 0 and every nonzero move to 16 PP.
2. `buildActionContext` hard-codes `currentMovePosition: 0`, so submitting
   KABUTO's real slot 2 executes SAND ATTACK but decrements MEGA DRAIN in
   slot 0 (`10 -> 9`) instead of SAND ATTACK (`15 -> 14`).
3. The reducer only ports `gDynamicBasePower = 0` from
   `HandleAction_ActionFinished`. Its missing action-local reset leaves
   `HITMARKER_ATTACKSTRING_PRINTED` and `gBattleMoveDamage=28` live into
   action 2. The public event stream consequently omits
   `"Foe KABUTO used / SAND-ATTACK!"` and emits Sand Attack's
   `MOVE_ANIMATION` with a stale `"28"` damage argument.
4. `factoryBattleScriptFullTurnDecision.eventPayloads` removes interpreter
   provenance, then `BattleDecisionBoundary` sequences payloads only. The
   public transition cannot answer the presentation seam's source-label
   question even though the underlying interpreter events can.

These are API/action-boundary gaps, not unsupported-opcode barriers. No
`machine-barrier` was reached and no ratchet count should move.

## 1. Re-pinned Battle Scene OFF baseline

Run against the selected `battle-scene-off` service:

```text
npm run compare -- battle2-off-turn1-staged.json --summary
16/16 frames matched -> tools/compare/out/latest
```

The trace and its captures are unchanged:
`tools/compare/traces/battle2-off-turn1-staged.json`, app stage
`battle2-off-turn1-before-confirm` at frame 33070, captures
`33084,33109,33145,33210,33235,33300,33350,33375,33400,33425,33450,
33460,33470,33476,33478,33485`.

## 2. Canonical source/RAM inputs

No recording is imported by production or by the scout test. The values are
literal test inputs with their existing evidence named here:

| field | ONIX (player 0) | KABUTO (trainer 1) | evidence |
| --- | --- | --- | --- |
| species | 95 | 140 | `battle2-turn1-battler-dump.json`, tick 33031 |
| HP/max HP | 117/117 | 91/91 | same |
| Atk/Def/Speed | 51/187/76 | 118/96/61 | same |
| SpAtk/SpDef | 36/72 | 93/51 | same |
| types | ROCK/GROUND | ROCK/WATER | same plus generated species data |
| ability | 5 ROCK HEAD | 4 BATTLE ARMOR | same; Battle Armor short-circuit is source-proven in `docs/battle-turn-notes.md` §18 |
| item | 142 SITRUS BERRY | 142 SITRUS BERRY | same and `include/constants/items.h` |
| moves | `[157,20,225,201]` | `[72,246,28,182]` | same |
| PP | `[10,20,20,10]` | `[10,5,15,10]` | same |
| selected move | slot 0 ROCK SLIDE | slot 2 SAND ATTACK | canonical controller/RAM evidence |
| seed | `3530724670` | shared cursor | `battle2-off-turn1-watch.json` before confirm |

The hermetic receipt first calls
`createFactoryFullTurnBattleState(CONFIG)`, then uses the public JSON state
contract (`parseBattleState`) to rehydrate only ability, item, and PP. That
workaround is intentionally visible: it lets the scout test the real move
kernel without pretending the constructor already represents the canonical
state.

Receipt:

```text
npx vitest run tests/battle2OffKernelSeamScout.test.ts
3/3 passed
```

## 3. Real full-turn result

Public calls:

1. `createFactoryFullTurnBattleState`, then canonical-state rehydration;
2. `submitFactoryFullTurnDecision(request 1, player slot 0 -> battler 1)`;
3. request 2 is correctly published for the trainer with all four real legal
   slots;
4. `submitFactoryFullTurnDecision(request 2, trainer slot 2 -> battler 0)`;
5. result is `decision-required`, request 3, player battler 0.

Exact final rules state:

| fact | result |
| --- | --- |
| boundary | player command request 3, legal slot 0 -> battler 1 |
| outcome | `0` (battle continues) |
| ONIX | HP 117, accuracy 5, status words 0, PP `[9,20,20,10]` |
| KABUTO | HP 63, neutral stages, status words 0, PP `[9,5,15,10]` |
| current move | 28 SAND ATTACK |
| current move position | **0 (barrier; submitted slot was 2)** |
| final `battleMoveDamage` | **28 (barrier; action 2 should start at 0)** |
| RNG | value `650807554`, calls `4` |

The HP/stat result is real. KABUTO's PP result and the two bold action-local
fields are the exact observed defect, not accepted semantics.

### Public semantic event sequence

The public boundary currently returns these 15 payloads:

| seq | payload | important fields | underlying source provenance |
| ---: | --- | --- | --- |
| 0 | message | `STRINGID_USEDMOVE` | `BattleScript_HitFromAtkString` / `ATTACKSTRING` |
| 1 | set-battler-pp-data | battler 0, slot 0, PP 9 | same label / `PPREDUCE` |
| 2 | animation | `MOVE_ANIMATION`, `["157","0","75","28","0","0"]` | `BattleScript_HitFromAtkAnimation` / `ATTACKANIMATION` |
| 3 | play-se | battler 1, song 13 | same / `EFFECTIVENESSSOUND` |
| 4 | animation | battler 1, `HIT_ANIMATION` | same / `HITANIMATION` |
| 5 | health-bar-update | battler 1, delta 28 | same / `HEALTHBARUPDATE` |
| 6 | hp-change | battler 1, `91 -> 63` | same / `DATAHPUPDATE` |
| 7 | sprite visibility | battler 0, visible | `BattleScript_MoveEnd` / `MOVEEND` |
| 8 | sprite visibility | battler 1, visible | `BattleScript_MoveEnd` / `MOVEEND` |
| 9 | set-battler-pp-data | **battler 1, slot 0, PP 9** | `BattleScript_EffectStatDown` / `PPREDUCE` |
| 10 | stat-stage-change | battler 0 accuracy `6 -> 5` | same / `STATBUFFCHANGE` |
| 11 | animation | **SAND ATTACK args carry stale damage 28** | `BattleScript_StatDownDoAnim` / `ATTACKANIMATION` |
| 12 | animation | battler 0, `STATS_CHANGE`, arg 27 | same / `PLAYANIMATION` |
| 13 | message | `STRINGID_DEFENDERSSTATFELL` | `BattleScript_StatDownPrintString` / `PRINTFROMTABLE` |
| 14 | sprite visibility | battler 1, visible | `BattleScript_MoveEnd` / `MOVEEND` |

The missing row is SAND ATTACK's own `STRINGID_USEDMOVE`, which the underlying
standalone source run proves should be the first event under
`BattleScript_EffectStatDown`. It is suppressed only because action 1's
`HITMARKER_ATTACKSTRING_PRINTED` leaks.

The last column is proven hermetically from the existing direct interpreter
entry points (`stageTurn1RockSlideHitChain` and
`stageTurn13SandAttackHitChain`). It is not present on the public events:
the receipt explicitly proves every returned payload lacks `provenance`.
Program counters/opcode dispatchers for the direct source runs are:

- ROCK SLIDE: PCs 6/7 (`ATTACKSTRING`/`PPREDUCE`), 12/14/15/17/18
  (`ATTACKANIMATION`, sound, hit, bar, HP), then PC 26 `MOVEEND`;
- SAND ATTACK: PCs 230/231/232, 237/240/241, then PC 26 `MOVEEND`.

Instruction-execution counts are deliberately not projected onto the public
full-turn stream: its literal effect entry points add setup instructions and
the public boundary discarded the authoritative value. Guessing it would
defeat the provenance contract.

## 4. The old 12 draws versus the real boundary's 4

The oracle's complete confirm-to-next-input-ready cursor is:

| call(s) | final value | source reason |
| --- | ---: | --- |
| 1 | 2956382169 | ROCK SLIDE accuracy |
| 2 | 2508258776 | ROCK SLIDE damage spread |
| 3 | 575948139 | ROCK SLIDE secondary/flinch check (no proc) |
| 4 | 650807554 | SAND ATTACK accuracy |
| 5 | 3011990093 | `BattleTurnPassed` random turn number |
| 6-7 | 1648070399 | `AI_TrySwitchOrUseItem` / `ShouldSwitch()` |
| 8-12 | 3121225034 | next-turn `BattleAI_SetupAIData` (4) plus choice tie (1) |

There is no critical draw: KABUTO's Battle Armor makes the source `&&` chain
short-circuit before `Random()`.

`BATTLE2_OFF_TURN1_SCENARIO` hand-authors calls 1-4 as action labels, then
injects `[1,2,5]` via `turnEndRngGroups`. It therefore ends at the oracle's
input-ready value, 12 calls, but it does not execute any of the last eight
source mechanisms.

The real full-turn boundary ends at call 4/value `650807554`.
`runBattleEndTurnOrchestration` completes the quiet field/battler loops and
publishes the next player request before the source's next-turn controller/AI
setup represented by calls 5-12. This is an honest boundary distinction, not
an RNG discrepancy in either move. Do **not** copy `turnEndRngGroups` into
the real reducer. A future source-complete turn-setup/AI phase must own those
draws; until then the semantic state at the kernel boundary is the four-call
state even if the retained presentation pacing reaches the visually
input-ready menu.

## 5. Mapping to the current OFF command/ack sequence

The existing nine commands and durations are presentation timing, not rules.
They can remain unchanged while their content is sourced from fixed kernel
events:

| command | duration | cumulative ack | real source |
| ---: | ---: | ---: | --- |
| 1 text | 145 | +145 | ROCK SLIDE event 0, resolved with ONIX + move 157 |
| 2 PP | 1 | +146 | event 1 |
| 3 HP | 14 | +160 | events 5-6 (`hp-change` supplies endpoints) |
| 4 text | 100 | +260 | restored SAND ATTACK used-move event |
| 5 PP | 1 | +261 | corrected SAND ATTACK slot-2 PP event |
| 6 stat | 50 | +311 | event 10 plus animation events 11-12 |
| 7 text | 89 | +400 | event 13, resolved with ONIX/accuracy/magnitude 1 |
| 8 turn end | 4 | +404 | full-turn orchestration completion |
| 9 menu | 1 | +405 | request-3 `decision-required` boundary |

The 16 captures are confirm-relative
`+13,+38,+74,+139,+164,+229,+279,+304,+329,+354,+379,+389,+399,+405,
+407,+414`. Keeping the command durations, the input-ready elapsed rule
(action menu visible after six ticks), and the existing renderer clocks
preserves those pixels. Animation/sound/visibility payloads are grouped into
their owning move/stat commands; Scene OFF does not acquire logical effects
from them. The next A at +407 remains presentation input, not an RNG draw.

## 6. Smallest source-complete consuming edit

Land correctness before changing the app stage:

1. In `src/engine/factoryBattleScriptFullTurnDecision.ts`:
   - let `FactoryFullTurnBattlerConfig` carry source `ability`, `item`, and
     four-slot `pp` (or consume an existing complete battler input type);
   - pass the submitted `moveSlot` through `runMoveAction` into
     `buildActionContext.currentMovePosition`;
   - port `HandleAction_ActionFinished` as one action-boundary helper, not
     isolated patches. For every represented field, cover
     `SpecialStatusesClear`, the complete source hit-marker clear mask,
     `currentMove`, `battleMoveDamage`, `moveResultFlags`, dynamic move
     type/base power, move-end state, communication slots, multihit effect,
     and script-stack reset. Explicitly document source fields that the rules
     context does not yet represent.
2. In `src/engine/battleDecisionBoundary.ts` and
   `src/engine/factoryBattleScriptFullTurnDecision.ts`, preserve
   `BattleScriptEventProvenance` on public kernel events. Do not reconstruct
   labels from event order in presentation.
3. In `src/engine/sceneOffPresentation.ts`, add a semantic-event-to-command
   projection that creates the same nine commands from provenance/payloads
   and the next-decision boundary. Reuse the existing ack adapter and the
   duration vector; do not add a turn/tick branch.
4. In `src/engine/stagedBattleTurn.ts`, stage a complete immutable
   `BattleState` plus the two known decisions and retain the real transition,
   rather than calling `resolveBattleTurn(BATTLE2_OFF_TURN1_SCENARIO)`.
5. In `src/engine/core.ts`, keep `renderSceneOffTurnView` and its relative
   clocks, but derive names, HP endpoints, PP/stat content, and menu readiness
   from the new presentation snapshot. Do not set the kernel RNG to the old
   12-call value; it remains the real four-call boundary value.
6. In `tools/compare/appTrace.ts`, replace only the implementation of
   `battle2-off-turn1-before-confirm` with the canonical full-turn stage.
   Keep the stage frame and trace captures unchanged.

The old `battle2OffScenario.ts`, `battleTurn.ts`, and preset-only portions of
`stagedBattleTurn.ts` can be deleted only after their callers/tests are gone.
Dead-code removal is not needed to prove the first replacement.

### Tests for the main step

- Extend `tests/factoryBattleScriptFullTurnDecision.test.ts` with the direct
  canonical config: next decision; HP 117/63; PP 9 and 14 in slots 0 and 2;
  accuracy 5; four-call RNG; two used-move messages; Sand Attack animation
  damage 0; preserved source labels.
- Convert `tests/battleTurnPortability.test.ts` to assert the nine commands
  are derived from kernel events/boundary and still ack at
  `145,146,160,260,261,311,400,404,405`.
- Keep `tests/battle2OffKernelSeamScout.test.ts` until the gaps it records are
  converted into positive assertions; then update it rather than silently
  deleting the evidence.
- Run:

```text
npx vitest run tests/factoryBattleScriptFullTurnDecision.test.ts \
  tests/battleTurnPortability.test.ts \
  tests/battle2OffKernelSeamScout.test.ts
npm run compare -- battle2-off-turn1-staged.json --summary
npm test
npm run build
```

Acceptance is the unchanged `16/16`, a genuine request-3 boundary, the
correct canonical PP slots/action reset, provenance-bearing public events,
and no fabricated RNG after call 4.
