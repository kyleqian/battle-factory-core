# Battle Factory native AI boundary audit

Status: source audit only; **not an implemented ABI**.  Receipts below refer
to the pinned `reference/pokeemerald` at `83df84e40623b79281f2397faa611cbf044170bd`.
This is Emerald's single-Battle-Factory path (Battle Scene OFF changes no
logical AI inputs).

## Result

The native code has two decision boundaries, not one:

1. `OpponentHandleChooseAction` attempts a switch, then an item, then emits
   the default `B_ACTION_USE_MOVE` action.  Only after the engine asks for a
   move does `OpponentHandleChooseMove` initialise and run the scripted move
   scorer.  Receipts: `src/battle_controller_opponent.c:1540-1543`,
   `1551-1592`; `src/battle_ai_switch_items.c:528-603`.
2. Factory changes only the scorer's script mask.  It does not replace the
   switch heuristic, and its mask does not make trainer items legal.

Therefore a future TypeScript module should be an injected, pure policy over
a frozen battle view plus explicitly supplied random draws.  The rules kernel
must continue to own legal-action construction, all mechanics calculations,
state mutation, and the authoritative RNG stream.  Do not put this policy in
the kernel or use UI/presentation timing as an input.

## Native call order and outputs

| Native phase | Order and result | Receipt |
| --- | --- | --- |
| action request | opponent controller calls `AI_TrySwitchOrUseItem()` | `battle_controller_opponent.c:1540-1543` |
| switch precheck | `ShouldSwitch`: trapped/party gates, then Perish Song, Wonder Guard, absorber, Natural Cure, super-effective/stats tests, type-resist replacement tests | `battle_ai_switch_items.c:429-525` |
| switch action | selected party index is written to `AI_monToSwitchIntoId[active]` and copied to `monToSwitchIntoId[active]`; fallback is first usable index | `battle_ai_switch_items.c:528-594` |
| item action | tried only if no switch; Factory is a `BATTLE_TYPE_FRONTIER`, so its item history was deliberately left empty by setup | `battle_ai_switch_items.c:280-309`, `528-599` |
| move request | initialise scores/limitations/RNG/mask, run selected scripts once per nonempty, PP-bearing slot, pick highest score, randomly break a tie | `battle_ai_script_commands.c:312-393`, `396-446`, `572-615` |
| move output | slot index `0..3`; controller encodes `B_ACTION_EXEC_SCRIPT` with low byte slot and high byte target.  Special values are `AI_CHOICE_FLEE=4`, `AI_CHOICE_WATCH=5` (not reachable under Factory's masks). | `include/battle_ai_script_commands.h:4-11`; `battle_controller_opponent.c:1569-1590` |
| switch output | controller output is `B_ACTION_SWITCH`, value zero; a later choose-Pokémon request emits the party index. | `battle_ai_switch_items.c:20-27`, `1621-1675` |
| item output | `B_ACTION_USE_ITEM`, followed by a separate item-id response; no Factory item can reach it under stock setup. | `battle_ai_switch_items.c:934-939`; `battle_controller_opponent.c:1615-1619` |

The engine validates the returned action later: move slot/target become
`chosenMovePositions`/`moveTarget`, and move limitations can send it back to
selection.  That validation remains kernel work (`battle_main.c:4354-4428`).

## Factory policy mask (the existing generated fixture)

`BattleAI_SetupAIData` dispatches `BATTLE_TYPE_FACTORY` directly to
`GetAiScriptsInBattleFactory`, ahead of ordinary trainer rows
(`battle_ai_script_commands.c:360-379`).  The selector reads, in source order:

| condition | mask / scripts |
| --- | --- |
| `lvlMode == FRONTIER_LVL_TENT` | `0` |
| `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN` | `CHECK_BAD_MOVE | TRY_TO_FAINT | CHECK_VIABILITY` = `7` |
| challenge number `< 2` | `0` |
| challenge number `< 4` | `CHECK_BAD_MOVE` = `1` |
| otherwise | `7` |

`challengeNum` is `factoryWinStreaks[VarGet(VAR_FRONTIER_BATTLE_MODE)]
[lvlMode] / FRONTIER_STAGES_PER_CHALLENGE`.  Exact receipt:
`src/battle_factory.c:889-910`; the flags/table are in
`include/constants/battle_ai.h:38-51` and
`data/battle_ai_scripts.s:17-49`.

Cross-check: `src/data/gen/factory-ai-policy.json` and
`tests/factoryAiPolicy.test.ts` correctly preserve all five branches, the
four selector inputs, all 13 named masks, and explicitly record that ordinary
trainer rows are not consulted.  They intentionally do **not** describe
move/switch/history/RNG dependencies below; that is the gap this audit fills.

For masks 1/7 the active scripts are `AI_CheckBadMove`, `AI_TryToFaint`, and
`AI_CheckViability` (`data/battle_ai_scripts.s:51-651,2616-2635`).  Mask zero
still performs setup (including four simulated-damage RNG draws) and random
ties, so it is not “no AI/RNG.”

## Read dependency map

This is a field-level inventory of native reads relevant to Factory's policy
surface.  “All scorer” means the bytecode interpreter supports it; the
active Factory script can make the listed opcode reachable through
`CHECK_VIABILITY` unless noted.  Include it in a general injected interpreter
view rather than quietly relying on current rental sets not reaching it.

| Layer / native source | Fields and tables read | Why it belongs in the immutable view |
| --- | --- | --- |
| identity and topology | `gActiveBattler`, `gBattlerTarget`, `gBattleTypeFlags`, `gBattlersCount`, `gAbsentBattlerFlags`, `gBattlerPartyIndexes[]`, `gBitTable[]`, battler position/side mapping | identifies AI user/target and the singles party range; doubles branches are excluded below. `battle_ai_script_commands.c:333-379`; `battle_ai_switch_items.c:429-505` |
| active `BattlePokemon` (both sides) | `moves[4]`, `pp[4]`, `hp`, `maxHP`, `status1`, `status2`, `types[2]`, `ability`, `species`, `item`, `level`, `personality`, `statStages[]`, `speed` | scoring, move limits, damage/type calculations, status/HP/stat bytecode, ability knowledge, gender, and switch heuristics. Representative exact reads: `battle_ai_script_commands.c:572-600,713-918,1109-1513,1683-2184,2227-2284`; `battle_ai_switch_items.c:20-523` |
| side/field state | `gStatuses3[]`, `gSideStatuses[]`, `gSideTimers[].mistTimer`, `gBattleWeather`, `gRandomTurnNumber`, Flash-Fire resource flags | bytecode checks volatile/side/weather; switching checks rooted/Perish; priority helper checks weather and speed; active masks can reach these via viability. `battle_ai_script_commands.c:845-918,1644-1728,2276-2284`; `battle_ai_switch_items.c:20-33,429-450`; `battle_main.c:4595-4753` |
| disable/turn state | `gDisableStructs[]`: `disabledMove`, `encoredMove`, `isFirstTurn`, `stockpileCounter`, `protectUses`, `tauntTimer`, `perishSongTimer` | move legality plus interpreter opcodes and switch conditions. `battle_ai_script_commands.c:1973-2022,2102-2184,2252-2266`; `battle_ai_switch_items.c:20-23` |
| party view | `gPlayerParty`/`gEnemyParty`: `species`, `species_or_egg`, `hp`, `status`, `abilityNum`, `moves[4]`; `gSpeciesInfo[species].types/abilities`; `gBattleMoves[move]` | usable-party count, switch eligibility/absorption/type and fallback damage choice. `battle_ai_script_commands.c:1292-1336,1568-1642`; `battle_ai_switch_items.c:35-116,119-426,629-789` |
| move data / mechanics tables | `gBattleMoves`: `power`, `type`, `effect`, `target`, `priority`, `flags`; ignored-power effects; type chart via `TypeCalc`/`AI_TypeCalc`; item hold effects, `gEnigmaBerries[]`, and `gStatStageRatios` | source-faithful scoring must call a pure kernel damage/type oracle, not duplicate mutable combat logic. `battle_ai_script_commands.c:1115-1239,1344-1535,2151-2169`; `battle_main.c:4595-4753` |
| result/history (known information) | `gLastMoves[]`, `gLastLandedMoves[]`, `gLastHitBy[]`, `BattleHistory.usedMoves[battler].moves[4]`, `.abilities[]`, `.itemEffects[]`, `.trainerItems[]`, `.itemsNo`, `BattleResults.battleTurnCounter`, `BattleStruct.usedHeldItems[]` | AI records target’s last move before scoring; it uses *recorded* opponent ability/item when known, otherwise guesses an ability from species. Switch logic uses the last landed move/hitter. `battle_ai_script_commands.c:618-660,1242-1249,1350-1465,2044-2071`; `battle_ai_switch_items.c:119-248,328-426` |
| decision staging (read/write) | `BattleStruct.AI_monToSwitchIntoId[]`, `.monToSwitchIntoId[]`, `.AI_itemType[]`, `.AI_itemFlags[]`, `.chosenItem[]`; `BattleResources.ai`, `.AI_ScriptsStack`, `.battleHistory`, `.flags` | native uses these as in-place controller/scratch storage.  The injected policy instead receives their meaningful prior values in the view and returns a decision/trace; the kernel alone applies it. `battle_ai_script_commands.c:312-345,2276-2300`; `battle_ai_switch_items.c:528-603,808-943` |
| transient native scratch (do not expose as authoritative state) | `AI_ThinkingStruct`: score, simulatedRNG, aiFlags, script state/stack, `moveConsidered`, `funcResult`; `gCurrentMove`, `gBattleMoveDamage`, `gMoveResultFlags`, `gDynamicBasePower`, `BattleStruct.dynamicMoveType`, `gBattleScripting.dmgMultiplier`, `gCritMultiplier` | native interpreter mutates these while scoring. A pure module should return its score/decision trace and request a pure `estimateDamage`/`typeEffectiveness`; the kernel must not persist these scratch writes. `battle_ai_script_commands.c:312-345,1174-1239,1467-1535`; `battle_ai_switch_items.c:748-789` |

### Legal decisions are kernel-owned

Before policy, the kernel supplies four move slots plus a limitation bitmask
equivalent to `CheckMoveLimitations(active, 0, MOVE_LIMITATIONS_ALL)`.
Native zeroes a limited slot's score but still takes its simulated-RNG draw
(`battle_ai_script_commands.c:333-342`).  The policy must not reinterpret
PP, Disable, Encore, Taunt, choice locks, or forced-action rules; it receives
the legal mask/forced action and selects only among kernel-admitted actions.

For a move it returns a slot and target only.  For a voluntary switch it
returns a party index only after receiving a kernel-produced eligible-index
list.  The kernel owns forced switches, faint selection, update of party
orders, item consumption, and rejection/re-request behavior.

### Known information versus omniscient state

The native scorer is not uniformly omniscient.  It knows its own active
ability/item directly, but first consults `BattleHistory.abilities` and
`.itemEffects` for the opponent; if ability is unknown it may infer a
three trapping ability directly or choose between the species’s two abilities
(`battle_ai_script_commands.c:1350-1465,2044-2071`).  `usedMoves` is a
four-entry first-seen list updated from target `gLastMoves` immediately before
scoring (`618-633`).  Preserve both raw battle facts (for the kernel) and this
separate perception/history view (for policy).  Never give policy hidden
opponent moves/items simply because the kernel has them.

## RNG ownership and order

All draws below are Emerald `Random()` calls and must be represented as
ordered policy draw events, never as `Math.random()` or renderer ticks.

1. Battle lifecycle owns `gRandomTurnNumber = Random()` at battle start and
   at subsequent selection/turn boundaries (`battle_main.c:3140,3923,4013`).
   Frontier battles are excluded from the VBlank `Random()` advance
   (`battle_main.c:2084-2089`).  These are kernel/lifecycle draws supplied in
   the frozen view, not AI draws.
2. Every `BattleAI_SetupAIData` consumes exactly four draws in slot order for
   `simulatedRNG[i] = 100 - Random()%16`, **including unusable slots**
   (`battle_ai_script_commands.c:333-342`).  Singles then sets its one target
   without a draw (`347-358`).
3. During each enabled script/slot, each executed `if_random_*` opcode draws
   once (`battle_ai_script_commands.c:663-701`); the active scripts use many
   such conditional branches.  An unknown opponent ability with two species
   abilities also draws once when `get_ability` reaches that case
   (`1350-1405`).  `if_user_faster`/`if_target_faster` calls
   `GetWhoStrikesFirst`; an equal effective speed consumes one tie draw
   (`1268-1282`, `battle_main.c:4722-4753`).  The actual count is necessarily
   path-dependent, so a trace records each draw by reason and ordinal.
4. Final singles move tie choice consumes exactly one `Random() %
   numOfBestMoves`, even when `numOfBestMoves == 1`
   (`battle_ai_script_commands.c:423-446`).
5. Action precheck runs before move scoring and has path-dependent draws:
   Wonder Guard 2/3, absorber 2/3 and candidate coin, Natural Cure coins,
   90% super-effective retention, and resist-replacement modulo draws
   (`battle_ai_switch_items.c:35-426`).  No item draw is reachable in normal
   Factory because the item list is empty, but item logic is documented below
   for boundary completeness.

The normal Factory single path has no random target selection or doubles
target-tie draw.  Do not count generic non-trainer opponent random-move code:
Factory takes the trainer branch (`battle_controller_opponent.c:1563-1610`).

## Switch and item boundary

Switching is independent of Factory’s 0/1/7 scorer mask.  It can use active
status/abilities, the opponent's last landed move and hitter, party
species/ability/moves, known type chart, party indices and prior selected
switch indices.  The fallback `GetMostSuitableMonToSwitchInto` first seeks a
candidate with the **largest** defensive type multiplier (a source-noted
counterintuitive bug) plus a super-effective move, then largest computed
damage (`battle_ai_switch_items.c:629-789`).  Preserve that behavior only
when porting the switch policy; it is not a kernel legality rule.

Items are structurally present but Factory-excluded.  Setup only loads trainer
items if trainer battle **and not** `BATTLE_TYPE_FRONTIER`
(`battle_ai_script_commands.c:280-309`).  If a future generic policy supports
items, its input must include history `trainerItems/itemsNo`, item effect
bytes (including Enigma Berry), active HP/status/first-turn and side Mist
timer; its output is `useItem(itemId, healFlags/type)`.  It also writes
`BattleStruct.AI_itemType`, `.AI_itemFlags`, `.chosenItem`; model these as
returned trace data, not mutable kernel state (`battle_ai_switch_items.c:808-943`).

## Singles-only Factory contract

This project’s stated mission is Level-50 Factory singles.  The proposed
Factory policy must reject or bypass these unimplemented native branches:

- doubles initial random target, `AI_SCRIPT_DOUBLE_BATTLE`, per-target score
  passes, ally suppression, target tie draw, both-target move targeting;
  source: `battle_ai_script_commands.c:347-379,448-570` and
  `battle_controller_opponent.c:1581-1588`;
- doubles party split, absent partner, two-opponent/Tower-link-Multi, in-game
  partner, Arena, Palace, Safari, Roamer, recorded and ordinary trainer
  selectors; source: `battle_ai_switch_items.c:46-82,137-178,429-603` and
  `battle_ai_script_commands.c:360-379`;
- Safari `flee/watch` and generic non-trainer random move selection;
  source: `battle_ai_script_commands.c:2024-2042` and
  `battle_controller_opponent.c:1594-1610`.

## Audit recommendation: minimal serializable policy view and trace

This is deliberately a recommendation, not a change to the existing battle
boundary ABI.

```ts
// JSON-safe, versioned input to a pure injected Factory policy.
type FactoryAiViewV1 = {
  schema: "factory-ai-view/v1";
  mode: "factory-singles";
  active: { aiBattler: number; targetBattler: number; aiPartyIndex: number; targetPartyIndex: number };
  factory: { levelMode: number; battleMode: number; factoryWinStreak: number; trainerId: number; aiMask: 0 | 1 | 7 };
  field: { weather: number; turn: number; randomTurnNumber: number; sideStatuses: [number, number] };
  battlers: readonly BattleAiBattlerView[]; // active facts: fields listed in the table above
  parties: { ai: readonly PartyMonAiView[]; target: readonly PartyMonAiView[] };
  legal: { moveSlots: readonly boolean[]; voluntarySwitchPartyIndexes: readonly number[]; forcedAction?: "move" | "switch" };
  history: { lastMoves: readonly number[]; lastLandedMoves: readonly number[]; lastHitBy: readonly number[];
             knownAbilities: readonly number[]; knownItemEffects: readonly number[]; usedMoves: readonly (readonly number[])[] };
  rules: { move: readonly MoveAiData[]; species: readonly SpeciesAiData[]; typeChartVersion: string };
};

type FactoryAiDecisionV1 =
  | { kind: "move"; slot: 0 | 1 | 2 | 3; targetBattler: number }
  | { kind: "switch"; partyIndex: number }
  | { kind: "item"; itemId: number; flags: number }; // unreachable for Factory v1

type FactoryAiTraceV1 = {
  schema: "factory-ai-trace/v1";
  phase: "choose-action" | "choose-move";
  rng: readonly { ordinal: number; reason: string; value: number }[];
  scores?: readonly number[];
  enabledScripts?: readonly string[];
  decision: FactoryAiDecisionV1;
};
```

`BattleAiBattlerView` needs all active-battler fields named in the dependency
table, including disable/status3/first-turn/protect values. `PartyMonAiView`
needs at least species, egg flag, HP, status, ability slot and four moves.
`rules.estimateDamage`/`rules.typeEffectiveness` should be injected pure
helpers with the same snapshot, or their deterministic return values can be
recorded in the trace.  The serialised view contains no renderer state, no
controller buffers, no global pointers, and no mutable RNG seed.

## Bounded implementation sequence

1. Add a source-extracted, read-only AI-script opcode/field catalogue for the
   three Factory-enabled scripts, and pin the existing mask fixture unchanged.
   Receipt: `data/battle_ai_scripts.s:17-49,51-651,2616-2635`.
2. Publish (do not yet wire into UI) the versioned view, decision and ordered
   RNG-trace types above, plus a pure Factory mask selector tested against the
   five native branches.  Receipt: `battle_factory.c:889-910`.
3. Have the battle kernel create the view and its legal-action list at the
   existing decision boundary; inject an RNG-draw function whose returned
   state is kernel-owned.  Pin four setup draws and final tie draw before
   broader scripts.  Receipt: `battle_ai_script_commands.c:312-446`.
4. Port the mask-1 scorer (`CHECK_BAD_MOVE`) with pure type/damage helpers,
   then mask-7 `TRY_TO_FAINT`, then `CHECK_VIABILITY`, recording each opcode
   path and score delta.  Add property tests that policy cannot choose a
   kernel-illegal move.  Receipt: `data/battle_ai_scripts.s:51-651,2616-2635`.
5. Port the voluntary-switch policy as a separate pure decision family, with
   its source-order RNG trace, then retain a Factory item assertion that item
   decisions are impossible.  Receipt: `battle_ai_switch_items.c:429-603` and
   `battle_ai_script_commands.c:280-309`.
6. Validate with short Battle Scene OFF oracle windows across Factory mask
   0/1/7 and a forced switch.  Compare semantic action/RNG traces first;
   pixel comparisons remain presentation verification, never a baked action
   lookup.

## Bounded uncertainties

- The dossier is a static source audit, not a RAM probe.  It does not claim a
  particular canonical opponent turn takes every conditional branch; the
  supplied trace schema is specifically to observe that path-dependent order.
- `AI_CalcDmg`/`TypeCalc` are kernel mechanics and have additional reads
  beyond this module's direct globals.  They must be injected as pure helpers
  or matched by the native rules kernel before score parity is claimed.
- The repository’s current fixture exposes only policy selection, so its lack
  of switch/history/RNG fields is intentional rather than a data corruption;
  no generated production data was changed by this audit.
