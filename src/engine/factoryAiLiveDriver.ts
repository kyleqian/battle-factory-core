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
  submitBattleDecision,
  type BattleCommandRequest,
  type BattleDecisionSubmission,
  type BattleDecisionReducer,
  type BattleJsonObject,
  type BattleRngState,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_LEECHSEED,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
  BATTLE_SCRIPT_STATUS3_ROOTED,
  BATTLE_SCRIPT_STATUS3_YAWN,
} from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  chooseFactoryAiMaskZeroDecision,
  chooseFactoryAiScoredDecision,
  type FactoryAiDecisionChoice,
  type FactoryAiMaskZeroView,
  type FactoryAiScoredChoice,
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
  selectFactoryAiMask,
  type FactoryAiMaskSelectionInput,
} from "./factoryAiMaskSelection.ts";
import {
  evaluateFactoryAiSwitchPolicy,
  type FactoryAiSwitchPolicyResult,
} from "./factoryAiSwitchPolicy.ts";

const MOVE_NONE = 0;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_SPIKES = 1 << 4;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
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
  /**
   * Source `gBattleResults.battleTurnCounter`, needed only by
   * `AI_CV_Swagger` after its Psych Up/target-ATK gate (doc §33). Optional
   * while older callers have no turn counter; the policy's source default is
   * the real battle-start value 0.
   */
  battleTurnCount?: number;
}>;

/** Factory items remain source-unreachable in Frontier trainer battles. */
export const FACTORY_AI_ACTION_GATE = Object.freeze({
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

  let synced = Object.freeze({
    usedMoves,
    knownAbilities,
    knownItemEffects,
    partyIndexes,
  });
  for (let battler = 0; battler < 4; battler += 1) {
    const abilityId = rulesContext.aiObservedAbilityIds[battler]!;
    if (abilityId !== 0) {
      synced = recordFactoryAiKnownAbility(
        synced,
        battler as 0 | 1 | 2 | 3,
        abilityName(abilityId),
      );
    }
    const itemEffect = rulesContext.aiObservedItemEffects[battler]!;
    if (itemEffect !== 0) {
      synced = recordFactoryAiKnownItemEffect(
        synced,
        battler as 0 | 1 | 2 | 3,
        itemEffect,
      );
    }
  }
  return synced;
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
      battleTurnCount: input.challenge.battleTurnCount ?? 0,
      lightScreenUp: (input.rulesContext.sideStatuses[1] & SIDE_STATUS_LIGHTSCREEN) !== 0,
      reflectUp: (input.rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT) !== 0,
      ...(weather === undefined ? {} : { currentWeather: weather }),
      isRooted: (attacker.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0,
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) !== 0
        ? { isInfatuated: true }
        : {}),
      ...((input.rulesContext.sideStatuses[1] & SIDE_STATUS_SAFEGUARD) !== 0
        ? { safeguardUp: true }
        : {}),
      ...((attacker.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0
        ? { isAsleep: true }
        : {}),
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE) !== 0
        ? { hasSubstitute: true }
        : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) !== 0
        ? { isLeechSeeded: true }
        : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_YAWN) !== 0
        ? { hasYawn: true }
        : {}),
      ...(attacker.protectUses !== 0 ? { protectUses: attacker.protectUses } : {}),
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
      ...(target.status1 !== 0 ? { hasAnyStatus: true } : {}),
      ...((target.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0
        ? { isAsleep: true }
        : {}),
      isToxicPoisoned:
        (target.status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0,
      isLeechSeeded:
        (target.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) !== 0,
      isCursed:
        (target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) !== 0,
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) !== 0
        ? { isConfused: true }
        : {}),
      ...(target.tauntTimer !== 0 ? { isTaunted: true } : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) !== 0
        ? { isInfatuated: true }
        : {}),
      ...((target.status2 & STATUS2_ESCAPE_PREVENTION) !== 0
        ? { isEscapePrevented: true }
        : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT) !== 0
        ? { isTormented: true }
        : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE) !== 0
        ? { isNightmared: true }
        : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0
        ? { isForesighted: true }
        : {}),
      ...((target.status3 & BATTLE_SCRIPT_STATUS3_YAWN) !== 0
        ? { hasYawn: true }
        : {}),
      ...((target.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG) !== 0
        ? { hasPerishSong: true }
        : {}),
      ability: abilityName(target.ability),
      knownAbility: input.history.knownAbilities[0],
      knownItemEffect: input.history.knownItemEffects[0],
      ...(input.history.usedMoves[0].length > 0
        ? { knownMoveIds: input.history.usedMoves[0] }
        : {}),
      ...((input.rulesContext.sideStatuses[0] & SIDE_STATUS_SAFEGUARD) !== 0
        ? { safeguardUp: true }
        : {}),
      ...((input.rulesContext.sideStatuses[0] & SIDE_STATUS_SPIKES) !== 0
        ? { spikesUp: true }
        : {}),
    }),
  });
}

type FactoryAiMoveChoice = FactoryAiDecisionChoice | FactoryAiScoredChoice;

type FactoryAiLiveCommon = Readonly<{
    history: FactoryAiBattleHistory;
    view: FactoryAiScoredView;
    actionGate: typeof FACTORY_AI_ACTION_GATE;
    switchPolicy: FactoryAiSwitchPolicyResult;
  }>;

export type FactoryAiLiveTransition<RulesState extends FactoryAiLiveRules> =
  FactoryAiLiveCommon & (
    | (FactoryAiMoveChoice & Readonly<{
      phase: "move";
      transition: ReturnType<typeof submitBattleDecision<RulesState>>;
    }>)
    | Readonly<{
      phase: "switch";
      submission: BattleDecisionSubmission;
      rng: BattleRngState;
      transition: ReturnType<typeof submitBattleDecision<RulesState>>;
    }>
  );

type RecordedAiDraw = Readonly<{
  ordinal: number;
  reason: string;
  before: BattleRngState;
  after: BattleRngState;
  randomValue: number;
}>;

function replayAiDraws<RulesState extends FactoryAiLiveRules>(
  draws: readonly RecordedAiDraw[],
  reducer: BattleDecisionReducer<RulesState>,
): BattleDecisionReducer<RulesState> {
  return (context) => {
    for (const [index, draw] of draws.entries()) {
      const before = context.rng.snapshot();
      if (before.value !== draw.before.value || before.calls !== draw.before.calls) {
        throw new Error(`Factory AI RNG diverged before live draw ${index}/${draw.ordinal}`);
      }
      const randomValue = context.rng.draw(draw.reason);
      const after = context.rng.snapshot();
      if (
        randomValue !== draw.randomValue
        || after.value !== draw.after.value
        || after.calls !== draw.after.calls
      ) {
        throw new Error(`Factory AI RNG diverged after live draw ${index}/${draw.ordinal}`);
      }
    }
    return reducer(context);
  };
}

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
  const switchPolicy = evaluateFactoryAiSwitchPolicy({
    rules: state.rules.rulesContext,
    rng: state.rng,
  });
  if (switchPolicy.selectedPartyIndex !== null) {
    const submission = Object.freeze({
      requestId: state.boundary.request.requestId,
      side: state.boundary.request.side,
      decision: Object.freeze({
        kind: "switch" as const,
        partyIndex: switchPolicy.selectedPartyIndex as 0 | 1 | 2 | 3 | 4 | 5,
      }),
    });
    const transition = submitBattleDecision(
      state,
      submission,
      replayAiDraws(switchPolicy.draws, reducer),
    );
    return Object.freeze({
      phase: "switch",
      submission,
      rng: switchPolicy.rng,
      transition,
      history: syncedHistory,
      view,
      switchPolicy,
      actionGate: FACTORY_AI_ACTION_GATE,
    }) as FactoryAiLiveTransition<RulesState>;
  }

  // AI_TrySwitchOrUseItem has returned B_ACTION_USE_MOVE. Project that
  // completed phase into the unchanged move chooser, but submit its result
  // through the original request so the kernel remains the legality owner.
  const moveDecisions = state.boundary.request.legalDecisions.flatMap(
    (decision) => decision.kind === "use-move" ? [decision] : [],
  );
  if (moveDecisions.length === 0) {
    throw new Error("Factory AI switch precheck declined but no legal move remains");
  }
  const policyRequest: BattleCommandRequest = createBattleCommandRequest({
    ...state.boundary.request,
    legalDecisions: moveDecisions,
  });
  const mask = selectFactoryAiMask(view.factory).mask;
  const policyResult: FactoryAiMoveChoice = mask === 0
    ? chooseFactoryAiMaskZeroDecision({
      view: Object.freeze({
        schema: "factory-ai-view/v1",
        mode: "factory-level-50-singles",
        active: view.active,
        factory: view.factory,
        moves: view.moves,
      }) satisfies FactoryAiMaskZeroView,
      request: policyRequest,
      rng: switchPolicy.rng,
    })
    : chooseFactoryAiScoredDecision({
      view,
      request: policyRequest,
      rng: switchPolicy.rng,
    });
  const transition = submitBattleDecision(
    state,
    policyResult.submission,
    replayAiDraws([...switchPolicy.draws, ...policyResult.trace.draws], reducer),
  );

  return Object.freeze({
    phase: "move",
    ...policyResult,
    transition,
    history: syncedHistory,
    view,
    switchPolicy,
    actionGate: FACTORY_AI_ACTION_GATE,
  }) as FactoryAiLiveTransition<RulesState>;
}
