/**
 * Fresh Battle Factory singles lifecycle through the first player command.
 *
 * Source order is BattleStartClearSetData -> intro/controller party loads ->
 * TryDoEventsBeforeFirstTurn (battle_main.c:3019-3149, 3841-3929). The live
 * Scene-OFF receipt in docs/facility-round-loop-scout.md §4.1 proves draw A
 * at BattleStartClearSetData+0x29b and draw B at
 * TryDoEventsBeforeFirstTurn+0x26f, with B overwriting A before selection.
 */
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };
import type { BattleState } from "./battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberState,
  type BattleScriptPartyState,
  type BattleScriptRulesBattlerState,
} from "./battleScriptRulesContext.ts";
import {
  ABILITY_SYMBOLS,
} from "./battleScriptSwitchinOpcode.ts";
import {
  createFactoryEmptyBattlerState,
  createFactoryFullTurnBattleStateFromRulesContext,
  FACTORY_RUN_AWAY_NOOP_INVARIANT,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";
import { randomU16 } from "./opponentGen.ts";
import { effectiveSpeed } from "./turnOrder.ts";

const NEUTRAL_STAT_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const BATTLE_START_HOOK_ABILITIES = new Set([2, 13, 22, 36, 45, 59, 70, 77]);
/** ITEM_WHITE_HERB; ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN). */
const ITEM_WHITE_HERB = 180;

type SpeciesStatsRow = Readonly<{ id: number; abilities: readonly [string, string] }>;
type SpeciesTypesRow = Readonly<{ types: readonly [string, string] }>;
type HeldItemRow = Readonly<{
  itemId: number;
  holdEffect: string;
  holdEffectParam: number;
}>;

const SPECIES_STATS_BY_ID = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesStatsRow[]).map((row) => [row.id, row]),
);
const SPECIES_TYPES = speciesTypesData.species as unknown as readonly SpeciesTypesRow[];
const ABILITY_ID_BY_SYMBOL = new Map(ABILITY_SYMBOLS.map((symbol, id) => [symbol, id]));
const HELD_ITEM_BY_ID = new Map(
  (frontierHeldItemsData.entries as readonly HeldItemRow[]).map((row) => [row.itemId, row]),
);

export type FactoryFreshBattleConfig = Readonly<{
  requestId: number;
  rngSeed: number;
  playerParty: BattleScriptPartyState;
  opponentParty: BattleScriptPartyState;
}>;

export type FactoryBattleStartUnsupportedBranch = Readonly<{
  kind: "unsupported-branch";
  sourceConstruct: string;
  sourceFile: "battle_main.c";
  sourceLine: number;
}>;

export type FactoryFreshBattleStart =
  | BattleState<FactoryFullTurnDecisionRules>
  | FactoryBattleStartUnsupportedBranch;

function unsupportedBranch(
  sourceConstruct: string,
  sourceLine: number,
): FactoryBattleStartUnsupportedBranch {
  return Object.freeze({
    kind: "unsupported-branch",
    sourceConstruct,
    sourceFile: "battle_main.c",
    sourceLine,
  });
}

function activeFromParty(
  side: 0 | 1,
  member: BattleScriptPartyMemberState,
): BattleScriptRulesBattlerState {
  const stats = SPECIES_STATS_BY_ID.get(member.species);
  if (member.abilityNum !== 0 && member.abilityNum !== 1) {
    throw new Error(`fresh Factory active ability slot must be 0 or 1, got ${member.abilityNum}`);
  }
  const abilitySymbol = stats?.abilities[member.abilityNum];
  const ability = abilitySymbol === undefined ? undefined : ABILITY_ID_BY_SYMBOL.get(abilitySymbol);
  const types = SPECIES_TYPES[member.species - 1]?.types;
  if (ability === undefined || types === undefined) {
    throw new Error(
      `fresh Factory active species ${member.species}/ability slot ${member.abilityNum} is unresolved`,
    );
  }
  return Object.freeze({
    ...createFactoryEmptyBattlerState(side),
    ability,
    ivs: member.ivs,
    isEgg: member.isEgg,
    abilityNum: member.abilityNum,
    experience: member.experience,
    ppBonuses: member.ppBonuses,
    species: member.species,
    personality: member.personality,
    attack: member.attack,
    defense: member.defense,
    speed: member.speed,
    spAttack: member.spAttack,
    spDefense: member.spDefense,
    level: member.level,
    friendship: member.friendship,
    hp: member.hp,
    maxHP: member.maxHP,
    status1: member.status1,
    item: member.item,
    moves: member.moves,
    pp: member.pp,
    types,
    statStages: NEUTRAL_STAT_STAGES,
    partyIndex: 0,
    // BattleStartClearSetData writes 2; pre-selection TurnValuesCleanUp(FALSE)
    // decrements it once at battle_main.c:4875-4876.
    isFirstTurn: 1,
  });
}

function preHookEffectiveSpeed(
  battler: BattleScriptRulesBattlerState,
  randomTurnNumber: number,
): number {
  const held = HELD_ITEM_BY_ID.get(battler.item);
  return effectiveSpeed({
    speed: battler.speed,
    speedStage: battler.statStages[3],
    movePriority: 0,
    ability: ABILITY_SYMBOLS[battler.ability] ?? null,
    holdEffect: held?.holdEffect ?? null,
    holdEffectParam: held?.holdEffectParam,
  }, {}, randomTurnNumber);
}

/**
 * Initializes a fresh, hook-free Factory battle. Equal pre-hook speed and
 * entry hooks remain explicit lifecycle barriers until rung 3.
 */
export function createFreshFactoryBattle(
  config: FactoryFreshBattleConfig,
): FactoryFreshBattleStart {
  // BattleStartClearSetData:3140. The receipt proves this value is overwritten
  // before turn-1 selection but consumed by the pre-hook order sort.
  const drawA = randomU16(config.rngSeed);
  const player = activeFromParty(0, config.playerParty[0]);
  const opponent = activeFromParty(1, config.opponentParty[0]);

  if (
    preHookEffectiveSpeed(player, drawA.value)
    === preHookEffectiveSpeed(opponent, drawA.value)
  ) {
    // Source-derived position: GetWhoStrikesFirst(TRUE), battle_main.c
    // :3850-3861/:4722-4749. Live receipt remains pending (§4.1).
    return unsupportedBranch(
      "TryDoEventsBeforeFirstTurn equal-speed pre-hook GetWhoStrikesFirst tie draw (source-derived, pending live receipt)",
      3856,
    );
  }

  if (
    BATTLE_START_HOOK_ABILITIES.has(player.ability)
    || BATTLE_START_HOOK_ABILITIES.has(opponent.ability)
    || player.item === ITEM_WHITE_HERB
    || opponent.item === ITEM_WHITE_HERB
  ) {
    return unsupportedBranch(
      "TryDoEventsBeforeFirstTurn switch-in ability/item hook loop",
      3869,
    );
  }

  // The context materializes BattleStartClearSetData's tracked clears and the
  // :3895-3921 pre-selection cleanup between draw A and draw B.
  const rulesContextBeforeB = createBattleScriptRulesContext({
    battlers: [
      player,
      opponent,
      createFactoryEmptyBattlerState(0),
      createFactoryEmptyBattlerState(1),
    ],
    selectorRoles: { attacker: null, target: null, effectBattler: null, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    gBattleEnvironment: BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    moveHistory: {
      lastPrintedMoves: [0, 0, 0, 0],
      lastMoves: [0, 0, 0, 0],
      lastResultingMoves: [0, 0, 0, 0],
      lastLandedMoves: [0, 0, 0, 0],
      lastHitByType: [0, 0, 0, 0],
      lastHitBy: [0xff, 0xff, 0xff, 0xff],
      lastTakenMove: new Array<number>(16).fill(0),
      lastTakenMoveFrom: new Array<number>(32).fill(0),
    },
    party: { player: config.playerParty, opponent: config.opponentParty },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_RUN_AWAY_NOOP_INVARIANT.battleTypeFlags,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    absentBattlerFlags: 0,
    weather: 0,
    randomTurnNumber: drawA.value,
  });

  // TryDoEventsBeforeFirstTurn:3923; this is turn 1's readable global.
  const drawB = randomU16(drawA.rngValue);
  const rulesContext = Object.freeze({
    ...rulesContextBeforeB,
    randomTurnNumber: drawB.value,
  });
  return createFactoryFullTurnBattleStateFromRulesContext({
    requestId: config.requestId,
    rngSeed: drawB.rngValue,
    rngCalls: 2,
    rulesContext,
  });
}
