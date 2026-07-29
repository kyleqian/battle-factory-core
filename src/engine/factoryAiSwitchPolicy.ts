/**
 * Factory-singles port of `ShouldSwitch` and its immediate
 * `GetMostSuitableMonToSwitchInto` resolution
 * (`battle_ai_switch_items.c:20-525,528-595,629-790`).
 *
 * This module is deliberately pure and is not wired to the live AI driver.
 * It consumes the kernel's existing source-shaped rules context, advances
 * only the supplied RNG cursor, and exposes both the helper's direct
 * chosen/sentinel/no-switch result and the final controller-ready party slot.
 */
import movesData from "../data/gen/moves.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import {
  getMostSuitableMonToSwitchInto,
  type BattleAiSwitchBench,
  type BattleAiSwitchDamageFallback,
  type BattleAiSwitchTypes,
} from "./battleAiSwitchInto.ts";
import type { BattleRngState } from "./battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptPartyMemberState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "./battleScriptSourceConstants.ts";
import { ABILITY_SYMBOLS } from "./battleScriptSwitchinOpcode.ts";
import { advanceRngValue } from "./rng.ts";
import type { TypeEffectivenessEntry } from "./damageCalc.ts";

const U16_MAX = 0xffff;
const MOVE_NONE = 0;
const MOVE_UNAVAILABLE = U16_MAX;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const DEFAULT_STAT_STAGE = 6;

const abilityId = (symbol: string): number => {
  const id = ABILITY_SYMBOLS.indexOf(symbol);
  if (id < 0) throw new Error(`factory-ai-switch-policy: unknown ability ${symbol}`);
  return id;
};

// Lookups intentionally use the generated universes rather than adding a
// second ability/move/type catalog.
const SHADOW_TAG = abilityId("ABILITY_SHADOW_TAG");
const ARENA_TRAP = abilityId("ABILITY_ARENA_TRAP");
const MAGNET_PULL = abilityId("ABILITY_MAGNET_PULL");
const WONDER_GUARD = abilityId("ABILITY_WONDER_GUARD");
const LEVITATE = abilityId("ABILITY_LEVITATE");
const NATURAL_CURE = abilityId("ABILITY_NATURAL_CURE");
const FLASH_FIRE = abilityId("ABILITY_FLASH_FIRE");
const WATER_ABSORB = abilityId("ABILITY_WATER_ABSORB");
const VOLT_ABSORB = abilityId("ABILITY_VOLT_ABSORB");

type MoveRow = Readonly<{ id: number; type: string; power: number }>;
type SpeciesStatsRow = Readonly<{ id: number; abilities: readonly [string, string] }>;
type SpeciesTypesRow = Readonly<{ name: string; types: BattleAiSwitchTypes }>;

const MOVES_BY_ID = new Map(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row]),
);
const SPECIES_STATS_BY_ID = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesStatsRow[]).map((row) => [row.id, row]),
);
const SPECIES_TYPES = speciesTypesData.species as unknown as readonly SpeciesTypesRow[];
const TYPE_EFFECTIVENESS =
  typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];

export type FactoryAiSwitchChoice =
  | Readonly<{ kind: "chosen"; partyIndex: number }>
  | Readonly<{ kind: "sentinel" }>
  | Readonly<{ kind: "no-switch" }>;

export type FactoryAiSwitchDrawKind =
  | "wonder-guard-candidate"
  | "absorber-active-super-effective"
  | "absorber-candidate"
  | "natural-cure-early"
  | "natural-cure-status-move"
  | "natural-cure-defensive"
  | "natural-cure-final"
  | "active-super-effective"
  | "immunity-fallback"
  | "not-very-effective-fallback";

export type FactoryAiSwitchDraw = Readonly<{
  ordinal: number;
  reason: string;
  kind: FactoryAiSwitchDrawKind;
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  modulus: number;
  remainder: number;
  succeeded: boolean;
  partyIndex: number | null;
  moveSlot: number | null;
}>;

export type FactoryAiSwitchBranch = Readonly<{
  ordinal: number;
  branch:
    | "wrapped-or-escape-prevented"
    | "rooted"
    | "shadow-tag"
    | "arena-trap"
    | "magnet-pull-steel"
    | "battle-arena"
    | "available-bench"
    | "perish-song"
    | "wonder-guard"
    | "absorber"
    | "natural-cure"
    | "active-super-effective"
    | "stats-raised"
    | "immunity-fallback"
    | "not-very-effective-fallback"
    | "suitable-selector"
    | "first-legal-fallback";
  outcome: "pass" | "blocked" | "selected" | "suppressed" | "none";
  partyIndex: number | null;
}>;

export type FactoryAiSwitchPolicyResult = Readonly<{
  schema: "factory-ai-switch-policy/v1";
  /** The exact result written by ShouldSwitch's helper ladder. */
  choice: FactoryAiSwitchChoice;
  /** AI_TrySwitchOrUseItem's final concrete switch id, or null on no-switch. */
  selectedPartyIndex: number | null;
  rng: BattleRngState;
  draws: readonly FactoryAiSwitchDraw[];
  branches: readonly FactoryAiSwitchBranch[];
}>;

export type FactoryAiSwitchPolicyInput = Readonly<{
  rules: BattleScriptRulesContext;
  rng: BattleRngState;
  /**
   * Optional exact scratch for GetMostSuitableMonToSwitchInto's pass-2
   * source quirk. Pass 1 is fully context-derived; callers that can reach
   * pass 2 supply the existing scorer's AI_CalcDmg scratch.
   */
  suitableDamageFallback?: BattleAiSwitchDamageFallback;
}>;

type TypeFlags = Readonly<{
  superEffective: boolean;
  notVeryEffective: boolean;
  doesNotAffect: boolean;
}>;

function speciesTypes(species: number): BattleAiSwitchTypes {
  return SPECIES_TYPES[species - 1]?.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"];
}

function partyAbility(member: BattleScriptPartyMemberState): number {
  const symbol = SPECIES_STATS_BY_ID.get(member.species)?.abilities[member.abilityNum];
  return symbol === undefined ? 0 : abilityId(symbol);
}

function typeMultiplier(attackingType: string, defendingTypes: BattleAiSwitchTypes): number {
  let multiplier = 10;
  const distinct = defendingTypes[0] === defendingTypes[1]
    ? [defendingTypes[0]]
    : defendingTypes;
  for (const defendingType of distinct) {
    const row = TYPE_EFFECTIVENESS.find(
      (entry) =>
        entry.attackingType === attackingType
        && entry.defendingType === defendingType,
    );
    multiplier = Math.trunc((multiplier * (row?.multiplierTenths ?? 10)) / 10);
  }
  return multiplier;
}

/** `AI_TypeCalc`, narrowed to the three flags ShouldSwitch reads. */
function aiTypeCalc(moveId: number, targetSpecies: number, targetAbility: number): TypeFlags {
  const move = MOVES_BY_ID.get(moveId);
  if (!move || moveId === 165) {
    return { superEffective: false, notVeryEffective: false, doesNotAffect: false };
  }
  if (targetAbility === LEVITATE && move.type === "TYPE_GROUND") {
    return { superEffective: false, notVeryEffective: false, doesNotAffect: true };
  }
  const multiplier = typeMultiplier(move.type, speciesTypes(targetSpecies));
  const superEffective = move.power !== 0 && multiplier > 10;
  const notVeryEffective = move.power !== 0 && multiplier > 0 && multiplier < 10;
  const wonderGuard = targetAbility === WONDER_GUARD && move.power !== 0 && !superEffective;
  return {
    superEffective,
    notVeryEffective,
    doesNotAffect: multiplier === 0 || wonderGuard,
  };
}

function legalAvailableMember(
  member: BattleScriptPartyMemberState,
  partyIndex: number,
  activePartyIndex: number,
  reservedPartyIndex: number,
): boolean {
  return member.hp !== 0
    && member.species !== 0
    && !member.isEgg
    && partyIndex !== activePartyIndex
    && partyIndex !== reservedPartyIndex;
}

export function evaluateFactoryAiSwitchPolicy(
  input: FactoryAiSwitchPolicyInput,
): FactoryAiSwitchPolicyResult {
  const { rules } = input;
  if (
    rules.battleTopology.battlersCount !== 2
    || (rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE) !== 0
    || (rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_TRAINER) === 0
  ) {
    throw new Error("factory-ai-switch-policy supports only trainer singles");
  }

  const active = rules.battlers[1];
  const target = rules.battlers[0];
  const party = rules.party.opponent;
  const activePartyIndex = active.partyIndex;
  const reservedPartyIndex = rules.monToSwitchIntoId[1]!;
  const draws: FactoryAiSwitchDraw[] = [];
  const branches: FactoryAiSwitchBranch[] = [];
  let rng = input.rng;
  let choice: FactoryAiSwitchChoice = Object.freeze({ kind: "no-switch" });
  const currentChoice = (): FactoryAiSwitchChoice => choice;

  const branch = (
    name: FactoryAiSwitchBranch["branch"],
    outcome: FactoryAiSwitchBranch["outcome"],
    partyIndex: number | null = null,
  ): void => {
    branches.push(Object.freeze({
      ordinal: branches.length,
      branch: name,
      outcome,
      partyIndex,
    }));
  };

  const draw = (
    kind: FactoryAiSwitchDrawKind,
    reason: string,
    modulus: number,
    succeeds: (remainder: number) => boolean,
    partyIndex: number | null = null,
    moveSlot: number | null = null,
  ): boolean => {
    const before = rng;
    const rawRngValue = advanceRngValue(before.value);
    const after = Object.freeze({ value: rawRngValue, calls: before.calls + 1 });
    const randomValue = (rawRngValue >>> 16) & U16_MAX;
    const remainder = randomValue % modulus;
    const succeeded = succeeds(remainder);
    rng = after;
    draws.push(Object.freeze({
      ordinal: draws.length,
      reason,
      kind,
      before,
      after,
      rawRngValue,
      randomValue,
      modulus,
      remainder,
      succeeded,
      partyIndex,
      moveSlot,
    }));
    return succeeded;
  };

  const noSwitch = (): FactoryAiSwitchPolicyResult => Object.freeze({
    schema: "factory-ai-switch-policy/v1",
    choice: currentChoice(),
    selectedPartyIndex: null,
    rng,
    draws: Object.freeze(draws),
    branches: Object.freeze(branches),
  });

  const hardGates: readonly Readonly<{
    name: FactoryAiSwitchBranch["branch"];
    blocked: boolean;
  }>[] = [
    {
      name: "wrapped-or-escape-prevented",
      blocked: (active.status2
        & (BATTLE_SCRIPT_STATUS2_WRAPPED_MASK | STATUS2_ESCAPE_PREVENTION)) !== 0,
    },
    {
      name: "rooted",
      blocked: (active.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0,
    },
    { name: "shadow-tag", blocked: target.ability === SHADOW_TAG },
    // Source AI quirk: no Flying/Levitate escape exception here.
    { name: "arena-trap", blocked: target.ability === ARENA_TRAP },
    {
      name: "magnet-pull-steel",
      blocked: rules.battlers.slice(0, 2).some(
        (battler, index) =>
          (rules.absentBattlerFlags & (1 << index)) === 0
          && battler.ability === MAGNET_PULL,
      ) && active.types.includes("TYPE_STEEL"),
    },
    {
      name: "battle-arena",
      blocked: (rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_ARENA) !== 0,
    },
  ];
  for (const gate of hardGates) {
    branch(gate.name, gate.blocked ? "blocked" : "pass");
    if (gate.blocked) return noSwitch();
  }

  const available = party.reduce(
    (count, member, partyIndex) =>
      count + (legalAvailableMember(
        member,
        partyIndex,
        activePartyIndex,
        reservedPartyIndex,
      ) ? 1 : 0),
    0,
  );
  branch("available-bench", available === 0 ? "none" : "pass");
  if (available === 0) return noSwitch();

  const select = (partyIndex?: number): boolean => {
    choice = partyIndex === undefined
      ? Object.freeze({ kind: "sentinel" })
      : Object.freeze({ kind: "chosen", partyIndex });
    return true;
  };

  // ShouldSwitchIfPerishSong.
  if (
    (active.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG) !== 0
    && active.perishSongTimer === 0
  ) {
    select();
    branch("perish-song", "selected");
  } else {
    branch("perish-song", "none");
  }

  // ShouldSwitchIfWonderGuard.
  if (currentChoice().kind === "no-switch") {
    let selected = false;
    if (
      target.ability === WONDER_GUARD
      && !active.moves.some((moveId) =>
        moveId !== MOVE_NONE && aiTypeCalc(moveId, target.species, target.ability).superEffective
      )
    ) {
      partyLoop:
      for (let partyIndex = 0; partyIndex < BATTLE_SCRIPT_PARTY_SIZE; partyIndex += 1) {
        const member = party[partyIndex]!;
        // This helper's source scan intentionally does not exclude reserved ids.
        if (
          member.hp === 0
          || member.species === 0
          || member.isEgg
          || partyIndex === activePartyIndex
        ) continue;
        for (let moveSlot = 0; moveSlot < member.moves.length; moveSlot += 1) {
          const moveId = member.moves[moveSlot]!;
          if (
            moveId !== MOVE_NONE
            && aiTypeCalc(moveId, target.species, target.ability).superEffective
            && draw(
              "wonder-guard-candidate",
              `wonder-guard-party-${partyIndex}-move-${moveSlot}`,
              3,
              (remainder) => remainder < 2,
              partyIndex,
              moveSlot,
            )
          ) {
            selected = select(partyIndex);
            break partyLoop;
          }
        }
      }
    }
    const selectedChoice = currentChoice();
    branch("wonder-guard", selected ? "selected" : "none",
      selectedChoice.kind === "chosen" ? selectedChoice.partyIndex : null);
  }

  const activeHasSuperEffectiveMove = (): boolean =>
    active.moves.some((moveId) =>
      moveId !== MOVE_NONE && aiTypeCalc(moveId, target.species, target.ability).superEffective
    );

  // FindMonThatAbsorbsOpponentsMove.
  if (currentChoice().kind === "no-switch") {
    let selected = false;
    let continueAbsorber = true;
    if (activeHasSuperEffectiveMove()) {
      continueAbsorber = draw(
        "absorber-active-super-effective",
        "absorber-active-super-effective-reluctance",
        3,
        (remainder) => remainder === 0,
      );
    }
    const lastMoveId = rules.moveHistory.lastLandedMoves[1]!;
    const lastMove = MOVES_BY_ID.get(lastMoveId);
    let absorbingAbility: number | null = null;
    if (lastMove?.power) {
      if (lastMove.type === "TYPE_FIRE") absorbingAbility = FLASH_FIRE;
      else if (lastMove.type === "TYPE_WATER") absorbingAbility = WATER_ABSORB;
      else if (lastMove.type === "TYPE_ELECTRIC") absorbingAbility = VOLT_ABSORB;
    }
    if (
      continueAbsorber
      && lastMoveId !== MOVE_NONE
      && lastMoveId !== MOVE_UNAVAILABLE
      && absorbingAbility !== null
      && active.ability !== absorbingAbility
    ) {
      for (let partyIndex = 0; partyIndex < BATTLE_SCRIPT_PARTY_SIZE; partyIndex += 1) {
        const member = party[partyIndex]!;
        if (!legalAvailableMember(
          member,
          partyIndex,
          activePartyIndex,
          reservedPartyIndex,
        )) continue;
        if (
          partyAbility(member) === absorbingAbility
          && draw(
            "absorber-candidate",
            `absorber-party-${partyIndex}`,
            2,
            (remainder) => remainder !== 0,
            partyIndex,
          )
        ) {
          selected = select(partyIndex);
          break;
        }
      }
    }
    const selectedChoice = currentChoice();
    branch("absorber", selected ? "selected" : "none",
      selectedChoice.kind === "chosen" ? selectedChoice.partyIndex : null);
  }

  const findDefensiveCandidate = (
    wanted: "immune" | "not-very-effective",
    modulus: number,
    kind: FactoryAiSwitchDrawKind,
  ): number | null => {
    const lastMoveId = rules.moveHistory.lastLandedMoves[1]!;
    const lastMove = MOVES_BY_ID.get(lastMoveId);
    const lastHitBy = rules.moveHistory.lastHitBy[1]!;
    if (
      lastMoveId === MOVE_NONE
      || lastMoveId === MOVE_UNAVAILABLE
      || lastHitBy === 0xff
      || !lastMove?.power
    ) return null;
    const opponent = rules.battlers[lastHitBy as 0 | 1 | 2 | 3];
    if (!opponent) return null;

    for (let partyIndex = 0; partyIndex < BATTLE_SCRIPT_PARTY_SIZE; partyIndex += 1) {
      const member = party[partyIndex]!;
      if (!legalAvailableMember(
        member,
        partyIndex,
        activePartyIndex,
        reservedPartyIndex,
      )) continue;
      const flags = aiTypeCalc(lastMoveId, member.species, partyAbility(member));
      const matches = wanted === "immune" ? flags.doesNotAffect : flags.notVeryEffective;
      if (!matches) continue;
      for (let moveSlot = 0; moveSlot < member.moves.length; moveSlot += 1) {
        const moveId = member.moves[moveSlot]!;
        if (
          moveId !== MOVE_NONE
          && aiTypeCalc(moveId, opponent.species, opponent.ability).superEffective
          && draw(
            kind,
            `${wanted}-party-${partyIndex}-move-${moveSlot}`,
            modulus,
            (remainder) => remainder === 0,
            partyIndex,
            moveSlot,
          )
        ) return partyIndex;
      }
    }
    return null;
  };

  // ShouldSwitchIfNaturalCure. The NONE/UNAVAILABLE false first roll then
  // evaluates the source's `else if` power expression; unknown UNAVAILABLE
  // is represented safely as zero power.
  if (currentChoice().kind === "no-switch") {
    let selected = false;
    if (
      (active.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0
      && active.ability === NATURAL_CURE
      && active.hp >= Math.trunc(active.maxHP / 2)
    ) {
      const lastMoveId = rules.moveHistory.lastLandedMoves[1]!;
      if (
        (lastMoveId === MOVE_NONE || lastMoveId === MOVE_UNAVAILABLE)
        && draw(
          "natural-cure-early",
          "natural-cure-no-usable-last-move",
          2,
          (remainder) => remainder !== 0,
        )
      ) {
        selected = select();
      } else {
        const safelyReadPower = MOVES_BY_ID.get(lastMoveId)?.power ?? 0;
        if (
          safelyReadPower === 0
          && draw(
            "natural-cure-status-move",
            "natural-cure-zero-power-last-move",
            2,
            (remainder) => remainder !== 0,
          )
        ) {
          selected = select();
        }
      }
      if (!selected) {
        const immune = findDefensiveCandidate(
          "immune",
          1,
          "natural-cure-defensive",
        );
        const nve = immune === null
          ? findDefensiveCandidate(
            "not-very-effective",
            1,
            "natural-cure-defensive",
          )
          : null;
        const defensive = immune ?? nve;
        if (defensive !== null) {
          selected = select(defensive);
        } else if (draw(
          "natural-cure-final",
          "natural-cure-final-coin",
          2,
          (remainder) => remainder !== 0,
        )) {
          selected = select();
        }
      }
    }
    const selectedChoice = currentChoice();
    branch("natural-cure", selected ? "selected" : "none",
      selectedChoice.kind === "chosen" ? selectedChoice.partyIndex : null);
  }

  // HasSuperEffectiveMoveAgainstOpponents(FALSE), move-slot order.
  if (currentChoice().kind === "no-switch") {
    let suppressed = false;
    for (let moveSlot = 0; moveSlot < active.moves.length; moveSlot += 1) {
      const moveId = active.moves[moveSlot]!;
      if (
        moveId !== MOVE_NONE
        && aiTypeCalc(moveId, target.species, target.ability).superEffective
        && draw(
          "active-super-effective",
          `active-super-effective-move-${moveSlot}`,
          10,
          (remainder) => remainder !== 0,
          null,
          moveSlot,
        )
      ) {
        suppressed = true;
        break;
      }
    }
    branch("active-super-effective", suppressed ? "suppressed" : "none");
    if (suppressed) return noSwitch();
  }

  // AreStatsRaised: positive boosts sum; debuffs do not offset them.
  if (currentChoice().kind === "no-switch") {
    const boosts = active.statStages.reduce(
      (sum, stage) => sum + Math.max(0, stage - DEFAULT_STAT_STAGE),
      0,
    );
    const suppressed = boosts > 3;
    branch("stats-raised", suppressed ? "suppressed" : "none");
    if (suppressed) return noSwitch();
  }

  if (currentChoice().kind === "no-switch") {
    const immune = findDefensiveCandidate("immune", 2, "immunity-fallback");
    branch("immunity-fallback", immune === null ? "none" : "selected", immune);
    if (immune !== null) select(immune);
  }
  if (currentChoice().kind === "no-switch") {
    const nve = findDefensiveCandidate(
      "not-very-effective",
      3,
      "not-very-effective-fallback",
    );
    branch("not-very-effective-fallback", nve === null ? "none" : "selected", nve);
    if (nve !== null) select(nve);
  }
  if (currentChoice().kind === "no-switch") return noSwitch();

  const helperChoice = currentChoice();
  let selectedPartyIndex: number | null =
    helperChoice.kind === "chosen" ? helperChoice.partyIndex : null;
  if (helperChoice.kind === "sentinel") {
    const bench = party.map((member) => Object.freeze({
      species: member.species,
      hp: member.hp,
      types: speciesTypes(member.species),
      moves: member.moves,
    })) as unknown as BattleAiSwitchBench;
    const suitable = getMostSuitableMonToSwitchInto(
      bench,
      activePartyIndex,
      target.types,
      input.suitableDamageFallback ?? {
        baseDamage: 0,
        activeTypes: active.types,
        opposingTypes: target.types,
        opposingAbility: target.ability,
        opposingStatus2: target.status2,
      },
    );
    if (suitable.kind === "resolved" && suitable.partyIndex < BATTLE_SCRIPT_PARTY_SIZE) {
      selectedPartyIndex = suitable.partyIndex;
      branch("suitable-selector", "selected", selectedPartyIndex);
    } else {
      branch("suitable-selector", "none");
    }
  }
  if (selectedPartyIndex === null) {
    selectedPartyIndex = party.findIndex((member, partyIndex) =>
      legalAvailableMember(member, partyIndex, activePartyIndex, reservedPartyIndex)
    );
    branch("first-legal-fallback",
      selectedPartyIndex < 0 ? "none" : "selected",
      selectedPartyIndex < 0 ? null : selectedPartyIndex);
    if (selectedPartyIndex < 0) selectedPartyIndex = null;
  }

  return Object.freeze({
    schema: "factory-ai-switch-policy/v1",
    choice: helperChoice,
    selectedPartyIndex,
    rng,
    draws: Object.freeze(draws),
    branches: Object.freeze(branches),
  });
}
