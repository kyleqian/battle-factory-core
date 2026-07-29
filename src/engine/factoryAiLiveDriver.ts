/**
 * Production-shaped Factory-AI adapter and command driver.
 *
 * Source ownership:
 * - `ChooseMoveOrAction_Singles` records the target's `gLastMoves` entry
 *   immediately before running the scoring scripts
 *   (`battle_ai_script_commands.c:396-403,618-632`).
 * - switch/faint setup clears that battler's move and ability history
 *   (`battle_main.c:3259-3261,3352-3354`);
 * - the Factory challenge selects masks through `GetAiScriptsInBattleFactory`
 *   (`battle_factory.c:889-911`, ported by `factoryAiMaskSelection.ts`).
 *
 * Ability/item history has explicit record functions because the source
 * records those facts at the semantic effect sites, not while constructing
 * the AI view. The rung-6 whole-battle carriers do not execute one of those
 * target-facing record sites; later opcode integration can call these
 * functions without changing the driver/view ABI.
 */

import abilityItemHooksData from "../data/gen/ability-item-hooks.json" with { type: "json" };
import {
  createBattleCommandRequest,
  type BattleCommandRequest,
  type BattleDecisionReducer,
  type BattleJsonObject,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_LEECHSEED,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  submitFactoryAiDecision,
  type FactoryAiScoredTransition,
  type FactoryAiScoredView,
} from "./factoryAiDecisionPolicy.ts";
import {
  AI_WEATHER_HAIL,
  AI_WEATHER_RAIN,
  AI_WEATHER_SANDSTORM,
  AI_WEATHER_SUN,
  type AiWeatherValue,
} from "./factoryAiCheckBadMove.ts";
import {
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
  type FactoryAiMaskSelectionInput,
} from "./factoryAiMaskSelection.ts";

const MOVE_NONE = 0;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;

type SymbolIdRow = Readonly<{ name: string; id: number }>;
const ABILITY_NAME_BY_ID = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } })
    .universes.abilities.map((row) => [row.id, row.name]),
);

export type FactoryAiBattleHistory = Readonly<{
  usedMoves: readonly [
    readonly number[],
    readonly number[],
    readonly number[],
    readonly number[],
  ];
  knownAbilities: readonly [
    string | null,
    string | null,
    string | null,
    string | null,
  ];
  knownItemEffects: readonly [number, number, number, number];
  partyIndexes: readonly [number, number, number, number];
}>;

export type FactoryAiChallengePolicy = Readonly<{
  factoryWinStreak: number;
  trainerOpponentId: number;
}>;

/**
 * Rung-6's explicit action-precheck constraint. Factory trainer items are
 * source-unreachable because `BattleAI_HandleItemUseBeforeAISetup` excludes
 * `BATTLE_TYPE_FRONTIER` while populating `trainerItems`
 * (`battle_ai_script_commands.c:292-306`). Voluntary switching is not
 * generally unreachable: `AI_TrySwitchOrUseItem` calls `ShouldSwitch` first
 * (`battle_ai_switch_items.c:528-545`). Until rung 13 ports that precheck,
 * callers must opt into this named, visible constraint; the driver filters
 * only switch alternatives from the policy view and still submits the chosen
 * move through the original reducer request.
 */
export const FACTORY_AI_RUNG6_ACTION_GATE = Object.freeze({
  switch: "factory-ai-switch-precheck-unimplemented",
  item: "frontier-trainer-items-source-unreachable",
} as const);

export type FactoryAiLiveRules = BattleJsonObject & Readonly<{
  rulesContext: BattleScriptRulesContext;
}>;

function emptyMoveRows(): FactoryAiBattleHistory["usedMoves"] {
  return Object.freeze([
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze([]),
  ]);
}

export function createFactoryAiBattleHistory(
  rulesContext: BattleScriptRulesContext,
): FactoryAiBattleHistory {
  return Object.freeze({
    usedMoves: emptyMoveRows(),
    knownAbilities: Object.freeze([null, null, null, null]) as
      FactoryAiBattleHistory["knownAbilities"],
    knownItemEffects: Object.freeze([0, 0, 0, 0]) as
      FactoryAiBattleHistory["knownItemEffects"],
    partyIndexes: Object.freeze(rulesContext.battlers.map((battler) => battler.partyIndex)) as
      FactoryAiBattleHistory["partyIndexes"],
  });
}

function replaceAt<T>(
  values: readonly T[],
  index: number,
  value: T,
): readonly T[] {
  return Object.freeze(values.map((current, candidate) =>
    candidate === index ? value : current
  ));
}

/** Semantic twin of source `RecordAbilityBattle`. */
export function recordFactoryAiKnownAbility(
  history: FactoryAiBattleHistory,
  battler: 0 | 1 | 2 | 3,
  ability: string,
): FactoryAiBattleHistory {
  return Object.freeze({
    ...history,
    knownAbilities: replaceAt(history.knownAbilities, battler, ability) as
      FactoryAiBattleHistory["knownAbilities"],
  });
}

/** Semantic twin of source `RecordItemEffectBattle`. */
export function recordFactoryAiKnownItemEffect(
  history: FactoryAiBattleHistory,
  battler: 0 | 1 | 2 | 3,
  itemEffect: number,
): FactoryAiBattleHistory {
  return Object.freeze({
    ...history,
    knownItemEffects: replaceAt(history.knownItemEffects, battler, itemEffect) as
      FactoryAiBattleHistory["knownItemEffects"],
  });
}

/**
 * Applies the source clear-on-party-change rule, then
 * `RecordLastUsedMoveByTarget` for the player target in Factory singles.
 */
export function syncFactoryAiBattleHistory(
  history: FactoryAiBattleHistory,
  rulesContext: BattleScriptRulesContext,
): FactoryAiBattleHistory {
  let usedMoves = history.usedMoves;
  let knownAbilities = history.knownAbilities;
  let knownItemEffects = history.knownItemEffects;
  const partyIndexes = Object.freeze(
    rulesContext.battlers.map((battler) => battler.partyIndex),
  ) as FactoryAiBattleHistory["partyIndexes"];

  for (let battler = 0; battler < 4; battler += 1) {
    if (partyIndexes[battler] !== history.partyIndexes[battler]) {
      usedMoves = replaceAt(usedMoves, battler, Object.freeze([])) as
        FactoryAiBattleHistory["usedMoves"];
      knownAbilities = replaceAt(knownAbilities, battler, null) as
        FactoryAiBattleHistory["knownAbilities"];
      // Source SwitchInClearSetData/FaintClearSetData do not call
      // ClearBattlerItemEffectHistory, so retain this cell.
    }
  }

  const lastTargetMove = rulesContext.moveHistory.lastMoves[0];
  if (
    lastTargetMove !== MOVE_NONE
    && !usedMoves[0].includes(lastTargetMove)
    && usedMoves[0].length < 4
  ) {
    usedMoves = replaceAt(
      usedMoves,
      0,
      Object.freeze([...usedMoves[0], lastTargetMove]),
    ) as FactoryAiBattleHistory["usedMoves"];
  }

  return Object.freeze({
    usedMoves,
    knownAbilities,
    knownItemEffects,
    partyIndexes,
  });
}

function abilityName(ability: number): string {
  const name = ABILITY_NAME_BY_ID.get(ability);
  if (name === undefined) throw new Error(`Factory AI live view: unknown ability id ${ability}`);
  return name;
}

function currentWeather(weather: number): AiWeatherValue | undefined {
  if ((weather & B_WEATHER_SUN) !== 0) return AI_WEATHER_SUN;
  if ((weather & B_WEATHER_RAIN) !== 0) return AI_WEATHER_RAIN;
  if ((weather & B_WEATHER_SANDSTORM) !== 0) return AI_WEATHER_SANDSTORM;
  if ((weather & B_WEATHER_HAIL) !== 0) return AI_WEATHER_HAIL;
  return undefined;
}

function statStages(battler: BattleScriptRulesContext["battlers"][number]) {
  return Object.freeze({
    atk: battler.statStages[1],
    def: battler.statStages[2],
    speed: battler.statStages[3],
    spAtk: battler.statStages[4],
    spDef: battler.statStages[5],
    acc: battler.statStages[6],
    evasion: battler.statStages[7],
  });
}

export function createFactoryAiViewFromLiveRules(input: Readonly<{
  rulesContext: BattleScriptRulesContext;
  history: FactoryAiBattleHistory;
  challenge: FactoryAiChallengePolicy;
}>): FactoryAiScoredView {
  const attacker = input.rulesContext.battlers[1];
  const target = input.rulesContext.battlers[0];
  const factory: FactoryAiMaskSelectionInput = Object.freeze({
    levelMode: FACTORY_LEVEL_MODE_50,
    battleMode: FACTORY_BATTLE_MODE_SINGLES,
    factoryWinStreak: input.challenge.factoryWinStreak,
    trainerOpponentId: input.challenge.trainerOpponentId,
  });
  const weather = currentWeather(input.rulesContext.weather);

  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory,
    moves: attacker.moves,
    attacker: Object.freeze({
      types: attacker.types,
      attack: attacker.attack,
      defense: attacker.defense,
      spAttack: attacker.spAttack,
      spDefense: attacker.spDefense,
      speed: attacker.speed,
      level: attacker.level,
      statStages: statStages(attacker),
      isFirstTurn: attacker.isFirstTurn,
      hp: attacker.hp,
      maxHp: attacker.maxHP,
      ability: abilityName(attacker.ability),
      lightScreenUp: (input.rulesContext.sideStatuses[1] & SIDE_STATUS_LIGHTSCREEN) !== 0,
      reflectUp: (input.rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT) !== 0,
      ...(weather === undefined ? {} : { currentWeather: weather }),
      isRooted: (attacker.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0,
    }),
    target: Object.freeze({
      species: target.species,
      types: target.types,
      attack: target.attack,
      defense: target.defense,
      spAttack: target.spAttack,
      spDefense: target.spDefense,
      speed: target.speed,
      level: target.level,
      statStages: statStages(target),
      isFirstTurn: target.isFirstTurn,
      hp: target.hp,
      maxHp: target.maxHP,
      lastUsedMoveId: input.rulesContext.moveHistory.lastMoves[0],
      isToxicPoisoned:
        (target.status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0,
      isLeechSeeded:
        (target.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) !== 0,
      isCursed:
        (target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) !== 0,
      ability: abilityName(target.ability),
      knownAbility: input.history.knownAbilities[0],
    }),
  });
}

export type FactoryAiLiveTransition<RulesState extends FactoryAiLiveRules> =
  FactoryAiScoredTransition<RulesState> & Readonly<{
    history: FactoryAiBattleHistory;
    view: FactoryAiScoredView;
    actionGate: typeof FACTORY_AI_RUNG6_ACTION_GATE;
  }>;

export function submitLiveFactoryAiDecision<
  RulesState extends FactoryAiLiveRules,
>(
  state: BattleState<RulesState>,
  history: FactoryAiBattleHistory,
  challenge: FactoryAiChallengePolicy,
  reducer: BattleDecisionReducer<RulesState>,
): FactoryAiLiveTransition<RulesState> {
  if (
    state.boundary.kind !== "decision-required"
    || state.boundary.request.kind !== "command"
    || state.boundary.request.side !== "trainer"
  ) {
    throw new Error("Factory AI live driver requires a trainer command boundary");
  }

  const syncedHistory = syncFactoryAiBattleHistory(history, state.rules.rulesContext);
  const view = createFactoryAiViewFromLiveRules({
    rulesContext: state.rules.rulesContext,
    history: syncedHistory,
    challenge,
  });
  const moveDecisions = state.boundary.request.legalDecisions.filter(
    (decision) => decision.kind === "use-move",
  );
  if (moveDecisions.length === 0) {
    throw new Error(`${FACTORY_AI_RUNG6_ACTION_GATE.switch}: no legal move remains`);
  }

  // `submitFactoryAiDecision`'s move policy sees the post-action-precheck
  // request. The chosen submission is then reduced against the original
  // request below, preserving the kernel as the authority on legality.
  const policyRequest: BattleCommandRequest = createBattleCommandRequest({
    ...state.boundary.request,
    legalDecisions: moveDecisions,
  });
  const policyState: BattleState<RulesState> = Object.freeze({
    ...state,
    boundary: Object.freeze({ kind: "decision-required", request: policyRequest }),
  });
  const policyResult = submitFactoryAiDecision(policyState, view, reducer);
  const originalLegal = state.boundary.request.legalDecisions.some(
    (decision) =>
      JSON.stringify(decision) === JSON.stringify(policyResult.submission.decision),
  );
  if (!originalLegal) throw new Error("Factory AI chose a decision outside the live kernel request");

  return Object.freeze({
    ...policyResult,
    history: syncedHistory,
    view,
    actionGate: FACTORY_AI_RUNG6_ACTION_GATE,
  }) as FactoryAiLiveTransition<RulesState>;
}
