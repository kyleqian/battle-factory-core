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

import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";
import { battleScriptDamageTerms } from "./battleScriptHitChainOpcode.ts";
import { turnOrderBattlerInputs, turnOrderWeather } from "./battleEndTurnOrchestration.ts";
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
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
  BATTLE_SCRIPT_STATUS3_LEECHSEED,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
  BATTLE_SCRIPT_STATUS3_ROOTED,
  BATTLE_SCRIPT_STATUS3_YAWN,
} from "./battleScriptSourceConstants.ts";
import {
  resolveBattleScriptItemHoldEffect,
  type BattleScriptPartyState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS3_MUDSPORT,
  BATTLE_SCRIPT_STATUS3_WATERSPORT,
} from "./battleScriptChargeSportOpcode.ts";
import { resolveBattleScriptMonGender } from "./battleScriptGender.ts";
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
  speciesAbilityNames,
  type AiWeatherValue,
  type FactoryAiMonGender,
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
import { battlerMoveSelectionIsForced } from "./factoryBattleScriptFullTurnDecision.ts";
import {
  factoryAiLastCalcMovePower,
  type FactoryAiTryToFaintBattler,
  type FactoryAiTryToFaintTarget,
} from "./factoryAiTryToFaint.ts";

const MOVE_NONE = 0;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_MIST = 1 << 8;
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;


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
  /** The rules context's `aiHistoryClears` at the last sync: a changed count means the slot was re-entered since. */
  clears: readonly [number, number, number, number];
}>;

export type FactoryAiChallengePolicy = Readonly<{
  factoryWinStreak: number;
  trainerOpponentId: number;
  /**
   * `frontier.lvlMode` as the source number (FRONTIER_LVL_50 0, FRONTIER_LVL_OPEN 1); absent = Level 50. `GetAiScriptsInBattleFactory`
   * (battle_factory.c:889-911) has no Open Level branch: the mode only selects which streak slot the challenge number is read from,
   * and `factoryWinStreak` is already that slot's streak.
   */
  levelMode?: 0 | 1;
  /**
   * Source `gBattleResults.battleTurnCounter`, read by `AI_CV_Swagger`
   * after its Psych Up/target-ATK gate (doc §33) and by `AI_CV_Conversion`.
   * An explicit override for fixtures; when absent the live driver reads
   * the rules context's `battleTurnCounter`.
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
    clears: Object.freeze([...rulesContext.aiHistoryClears]) as unknown as FactoryAiBattleHistory["clears"],
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

  // SwitchInClearSetData clears both histories on EVERY switch-in (battle_main.c:3260-3261). A changed party index
  // catches a different Pokemon; the clear count also catches a slot that went A -> B -> A between two AI decisions
  // (the AI was locked into a multi-turn move and made none): the game has forgotten A's moves and ability.
  const clears = Object.freeze([...rulesContext.aiHistoryClears]) as unknown as FactoryAiBattleHistory["clears"];
  for (let battler = 0; battler < 4; battler += 1) {
    if (partyIndexes[battler] !== history.partyIndexes[battler] || clears[battler] !== history.clears[battler]) {
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
    clears,
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

/**
 * `Cmd_count_usable_party_mons` (`battle_ai_script_commands.c:1292-1334`) in
 * singles: party slots other than the battler's own `gBattlerPartyIndexes`
 * entry (`battlerOnField1 == battlerOnField2` outside doubles, :1311-1320)
 * with `hp != 0`, species not NONE and not EGG (:1322-1329). AI_USER counts
 * the AI side's party, AI_TARGET the other side's (:1301-1309).
 */
export function countUsablePartyMons(
  party: BattleScriptPartyState,
  activePartyIndex: number,
): number {
  let count = 0;
  for (const [index, member] of party.entries()) {
    if (index !== activePartyIndex && member.hp !== 0 && member.species !== 0 && !member.isEgg) {
      count += 1;
    }
  }
  return count;
}

/** `Cmd_get_gender` (`battle_ai_script_commands.c:2088-2099`): `GetGenderFromSpeciesAndPersonality` on the live battler record. */
function aiGender(battler: BattleScriptRulesContext["battlers"][number]): FactoryAiMonGender {
  const gender = resolveBattleScriptMonGender(battler.species, battler.personality);
  return gender === "male" ? "MON_MALE" : gender === "female" ? "MON_FEMALE" : "MON_GENDERLESS";
}

/**
 * `Cmd_if_status_in_party` (`battle_ai_script_commands.c:1568-1598`) with `STATUS1_ANY`: any party slot with a
 * species, not an egg, `hp != 0` and a status word EXACTLY equal to the full `STATUS1_ANY` mask (`==`, not `&`).
 */
const STATUS1_ANY = (
  BATTLE_SCRIPT_STATUS1_SLEEP
  | BATTLE_SCRIPT_STATUS1_POISON
  | BATTLE_SCRIPT_STATUS1_BURN
  | BATTLE_SCRIPT_STATUS1_FREEZE
  | BATTLE_SCRIPT_STATUS1_PARALYSIS
  | BATTLE_SCRIPT_STATUS1_TOXIC_POISON
) >>> 0;

export function partyHasStatusEqualToAny(party: BattleScriptPartyState): boolean {
  return party.some((member) =>
    member.species !== 0 && !member.isEgg && member.hp !== 0 && (member.status1 >>> 0) === STATUS1_ANY
  );
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
    levelMode: input.challenge.levelMode ?? FACTORY_LEVEL_MODE_50,
    battleMode: FACTORY_BATTLE_MODE_SINGLES,
    factoryWinStreak: input.challenge.factoryWinStreak,
    trainerOpponentId: input.challenge.trainerOpponentId,
  });
  const weather = currentWeather(input.rulesContext.weather);
  // `Cmd_if_target_faster` / `Cmd_if_user_faster` -> GetWhoStrikesFirst(user, target, TRUE) reads the TRUE
  // gBattleMons state of BOTH battlers; priority is ignored (ignoreChosenMoves), so the chosen move is MOVE_NONE.
  const attackerTurnOrder = turnOrderBattlerInputs(input.rulesContext, 1, 0);
  const targetTurnOrder = turnOrderBattlerInputs(input.rulesContext, 0, 0);

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
      usablePartyMons: countUsablePartyMons(input.rulesContext.party.opponent, attacker.partyIndex),
      movePp: Object.freeze([attacker.pp[0] ?? 0, attacker.pp[1] ?? 0, attacker.pp[2] ?? 0, attacker.pp[3] ?? 0]) as unknown as readonly [number, number, number, number],
      ability: abilityName(attacker.ability),
      turnOrderAbility: attackerTurnOrder.ability ?? null,
      turnOrderHoldEffect: attackerTurnOrder.holdEffect ?? null,
      turnOrderHoldEffectParam: attackerTurnOrder.holdEffectParam ?? 0,
      turnOrderWeather: turnOrderWeather(input.rulesContext),
      randomTurnNumber: input.rulesContext.randomTurnNumber,
      ...((attacker.status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0 ? { isParalyzed: true } : {}),
      // gBattleResults.battleTurnCounter (battle_ai_script_commands.c:1111). The rules context carries the live value;
      // `challenge.battleTurnCount` stays as an explicit override for fixtures (docs/parity-mac/ai-turn-counter.md).
      battleTurnCount: input.challenge.battleTurnCount ?? input.rulesContext.battleTurnCounter,
      lightScreenUp: (input.rulesContext.sideStatuses[1] & SIDE_STATUS_LIGHTSCREEN) !== 0,
      reflectUp: (input.rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT) !== 0,
      ...(weather === undefined ? {} : { currentWeather: weather }),
      isRooted: (attacker.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0,
      ...((input.rulesContext.sideStatuses[1] & SIDE_STATUS_FUTUREATTACK) !== 0
        ? { attackerFutureAttackUp: true }
        : {}),
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) !== 0
        ? { isInfatuated: true }
        : {}),
      ...((input.rulesContext.sideStatuses[1] & SIDE_STATUS_SAFEGUARD) !== 0
        ? { safeguardUp: true }
        : {}),
      ...((attacker.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0
        ? { isAsleep: true }
        : {}),
      ...((attacker.status1 & BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK) !== 0
        ? { hasCurableStatus: true }
        : {}),
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE) !== 0
        ? { hasSubstitute: true }
        : {}),
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY) !== 0
        ? { hasFocusEnergy: true }
        : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) !== 0
        ? { isLeechSeeded: true }
        : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_YAWN) !== 0
        ? { hasYawn: true }
        : {}),
      // AI_CV_Protect reads the AI USER's own toxic/cursed/perish-song state
      // on its three `AI_CV_Protect3` routes (ISSUES #137).
      ...((attacker.status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0
        ? { isToxicPoisoned: true }
        : {}),
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) !== 0
        ? { isCursed: true }
        : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG) !== 0
        ? { hasPerishSong: true }
        : {}),
      ...(attacker.protectUses !== 0 ? { protectUses: attacker.protectUses } : {}),
      gender: aiGender(attacker),
      // `Cmd_get_hold_effect AI_USER` (`:2044-2056`): gActiveBattler == the AI battler -> GetItemHoldEffect(gBattleMons[].item).
      holdEffect: resolveBattleScriptItemHoldEffect(attacker.item),
      stockpileCount: attacker.stockpileCounter,
      // `Cmd_get_used_held_item` (`:2137-2149`) reads the low byte of gBattleStruct->usedHeldItems[battler].
      usedHeldItemId: input.rulesContext.usedHeldItems[1]! & 0xff,
      ...((input.rulesContext.sideStatuses[1] & SIDE_STATUS_MIST) !== 0 ? { mistUp: true } : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS) !== 0
        ? { imprisonedOthers: true }
        : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_MUDSPORT) !== 0 ? { mudSportUp: true } : {}),
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_WATERSPORT) !== 0 ? { waterSportUp: true } : {}),
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
      usablePartyMons: countUsablePartyMons(input.rulesContext.party.player, target.partyIndex),
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
      turnOrderAbility: targetTurnOrder.ability ?? null,
      turnOrderHoldEffect: targetTurnOrder.holdEffect ?? null,
      turnOrderHoldEffectParam: targetTurnOrder.holdEffectParam ?? 0,
      speciesAbilities: speciesAbilityNames(target.species),
      gender: aiGender(target),
      // `Cmd_get_hold_effect AI_TARGET`: gActiveBattler != target -> GetItemHoldEffect(BATTLE_HISTORY->itemEffects[target])
      // (`battle_ai_script_commands.c:2052-2053`; the recorded effect id is looked up as an item id, as in the source).
      holdEffect: resolveBattleScriptItemHoldEffect(input.history.knownItemEffects[0]),
      // `Cmd_if_status AI_TARGET` / `Cmd_if_not_status AI_TARGET` (AI_CV_Facade's kept @BUG, AI_CV_SmellingSalt).
      ...((target.status1 & BATTLE_SCRIPT_STATUS1_POISON) !== 0 ? { isPoisoned: true } : {}),
      ...((target.status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0 ? { isBurned: true } : {}),
      ...((target.status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0 ? { isParalyzed: true } : {}),
      // `Cmd_if_any_move_disabled_or_encored AI_TARGET` (`:1973-1996`).
      ...(target.disabledMove !== 0 ? { anyMoveDisabled: true } : {}),
      ...(target.encoredMove !== 0 ? { anyMoveEncored: true } : {}),
      // `Cmd_if_side_affecting AI_TARGET` (`:881-896`): the target's own side.
      ...((input.rulesContext.sideStatuses[0] & SIDE_STATUS_REFLECT) !== 0
        ? { targetSideReflectUp: true }
        : {}),
      ...((input.rulesContext.sideStatuses[0] & SIDE_STATUS_LIGHTSCREEN) !== 0
        ? { targetSideLightScreenUp: true }
        : {}),
      // `AI_CalcDmg` -> `CalculateBaseDamage(&gBattleMons[ai], &gBattleMons[target], ...)` reads the TRUE records (and the
      // defender's real item, not the battle-history view): the same builder the real hit chain uses.
      damageTerms: battleScriptDamageTerms(input.rulesContext, 1, 0),
      ...(partyHasStatusEqualToAny(input.rulesContext.party.player) ? { targetPartyStatusEqualsAny: true } : {}),
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
      ...((input.rulesContext.sideStatuses[0] & SIDE_STATUS_FUTUREATTACK) !== 0
        ? { targetFutureAttackUp: true }
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
    | Readonly<{
      /**
       * AI_TrySwitchOrUseItem answered B_ACTION_USE_MOVE and source then sends
       * no ChooseMove (forced Struggle or Encore, battle_main.c:4184-4197):
       * the move chooser never ran, so there is no scoring trace and no draw
       * beyond the switch precheck's.
       */
      phase: "forced-move";
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
  if (battlerMoveSelectionIsForced(state.rules.rulesContext, 1)) {
    // battle_main.c:4184-4197: AreAllMovesUnusable() (Struggle) and
    // encoredMove != 0 both leave STATE_WAIT_ACTION_CHOSEN without
    // BtlController_EmitChooseMove, so OpponentHandleChooseMove
    // (battle_controller_opponent.c:1551-1567: BattleAI_SetupAIData +
    // BattleAI_ChooseMoveOrAction) never runs. Zero chooser draws; the W2
    // gBattleMovePower register is not touched either (no AI_CalcDmg).
    if (moveDecisions.length !== 1) {
      throw new Error("Factory AI forced move selection must publish exactly one move decision");
    }
    const submission = Object.freeze({
      requestId: state.boundary.request.requestId,
      side: state.boundary.request.side,
      decision: moveDecisions[0]!,
    });
    const transition = submitBattleDecision(
      state,
      submission,
      replayAiDraws(switchPolicy.draws, reducer),
    );
    return Object.freeze({
      phase: "forced-move",
      submission,
      rng: switchPolicy.rng,
      transition,
      history: syncedHistory,
      view,
      switchPolicy,
      actionGate: FACTORY_AI_ACTION_GATE,
    }) as FactoryAiLiveTransition<RulesState>;
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
      // The generic turn kernel drew and stored this at BattleTurnPassed
      // before publishing the command boundary. Attribute that ownership to
      // the scored decision without advancing/replaying the cursor again.
      turnStartRandomNumber: Object.freeze({
        owner: "battle-turn-boundary" as const,
        value: state.rules.rulesContext.randomTurnNumber,
      }),
    });
  // W2 (docs/rollout-endeavor-prep.md s0.2): with non-zero AI flags the decision's AI_CalcDmg calls leave
  // gBattleMovePower at rule R's value before either move of the turn runs. Presentation-only register.
  const ruleR = mask === 0
    ? null
    : factoryAiLastCalcMovePower(
      view.attacker as FactoryAiTryToFaintBattler,
      view.target as FactoryAiTryToFaintTarget,
      view.moves,
      mask === 7,
    );
  const decisionState = ruleR === null
    ? state
    : (Object.freeze({
      ...state,
      rules: Object.freeze({
        ...state.rules,
        rulesContext: Object.freeze({ ...state.rules.rulesContext, battleMovePower: ruleR }),
      }),
    }) as typeof state);
  const transition = submitBattleDecision(
    decisionState,
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
