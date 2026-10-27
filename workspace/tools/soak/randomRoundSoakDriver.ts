// Seeded random-play soak driver for the full generated Factory round —
// library half (no side effects on import; the CLI lives in
// tools/soak/randomRoundSoak.ts and tests/randomRoundSoak.test.ts pins the
// green milestone surface).
//
// Drives the REAL production play path — `createInitialState()` +
// `tick(state, buttons)` from src/engine/core.ts, the exact pure core that
// src/main.ts runs every browser frame — from the rental draft screen through
// battles 1..7 (postwin flows, swap screens, forced switches, terminal
// presentations) using only GBA button presses, exactly like a human player.
// At every decision surface it enumerates the choices the real UI exposes
// (action menu incl. BAG/RUN noops, every fight slot incl. Torment/Taunt/
// Disable/no-PP rejection slots, switch targets incl. fainted ones, swap
// YES/NO and swap-screen picks, message-advance presses with jittered
// timing) and picks with a seeded PRNG. Presentation is ticked frame by
// frame — no orchestrator shortcuts — because the live crashes bind to the
// presentation/orchestration seams (ISSUES #84).
//
// Finding vs. cataloging: this tool NEVER fixes engine behavior. A throw
// whose top frame is under tools/soak/ is a DRIVER bug; a throw from src/**
// is an ENGINE bug and lands in docs/soak-crash-catalog.md.
//
// Two seeded streams (soak111, docs/soak111-decoupled-cooldown.md): every
// DECISION draw (draft picks, menu/fight/switch/party intents, postwin and
// swap answers, terminal buttons, ...) comes from `new Rng(seed)`; every
// PRESS draw -- the idle cooldown gap after each press and the 6% B roll of
// the message-advance mash -- comes from `new Rng(seed, SOAK_PRESS_RNG_SALT)`.
// The count of press draws depends on how long each presentation runs, so
// before the split a presentation-length change (e.g. a new stats-change
// command or Scene OFF pause) shifted every later decision and replayed a
// different random game; now it only moves frame numbers.

import {
  clearContainedPresentationErrors,
  containedPresentationErrorCount,
  containedPresentationErrors,
} from "../../src/engine/presentationContainment.ts";
import {
  createInitialState,
  render,
  tick,
  type EngineState,
} from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";
import {
  MENU_OPTION_RENT,
  MENU_OPTION_SUMMARY,
} from "../../src/engine/factoryDraftScreen.ts";
import {
  isCursorInputReady,
  isMonPicInputReady,
} from "../../src/engine/monPic.ts";
import { factoryTerminalRecordMenuInputReady } from "../../src/engine/factoryTerminalPresentation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import {
  applyTypeEffectiveness,
  MAX_STAT_STAGE,
  MIN_STAT_STAGE,
  type TypeEffectivenessEntry,
} from "../../src/engine/damageCalc.ts";
import type { FactoryRentalRoster } from "../../src/engine/factorySwap.ts";
import {
  generateFactoryChallengeDraft,
  type FactoryCarry,
} from "../../src/engine/factoryRoundChaining.ts";
import { battlerUsesForcedStruggle } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { ANCHOR_RNG_VALUE, advanceRngValue } from "../../src/engine/rng.ts";
import { ANCHOR_FACTORY_METADATA } from "../../src/engine/factoryAnchorSession.ts";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredChoice,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import {
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
  type FactoryAiMaskSelectionInput,
} from "../../src/engine/factoryAiMaskSelection.ts";
import {
  AI_WEATHER_HAIL,
  AI_WEATHER_RAIN,
  AI_WEATHER_SANDSTORM,
  AI_WEATHER_SUN,
  type AiWeatherValue,
} from "../../src/engine/factoryAiCheckBadMove.ts";
import {
  resolveBattleScriptBattlerHoldEffect,
  type BattleScriptRulesContext,
} from "../../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
  BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_LEECHSEED,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
  BATTLE_SCRIPT_STATUS3_ROOTED,
  BATTLE_SCRIPT_STATUS3_YAWN,
} from "../../src/engine/battleScriptSourceConstants.ts";
import type { BattleMoveDecision } from "../../src/engine/battleDecisionBoundary.ts";
import type { SoakCoverageCollector } from "./randomRoundSoakCoverage.ts";
import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesTypesData from "../../src/data/gen/species-types.json" with { type: "json" };
import typeEffectivenessData from "../../src/data/gen/type-effectiveness.json" with { type: "json" };
import speciesStatsData from "../../src/data/gen/species-stats.json" with { type: "json" };
import battleFrontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Move power/type lookup and type-effectiveness table (for the "winning"
// policy's fight-move bias only)
// ---------------------------------------------------------------------------

const MOVE_BY_ID = new Map<number, { power: number; type: string; effect: string }>(
  (movesData as { moves: { id: number; power: number; type: string; effect: string }[] }).moves.map(
    (move) => [move.id, { power: move.power, type: move.type, effect: move.effect }],
  ),
);

/** Raw 0..12 stat-stage reading, same shape/convention as `oracleStrengthStatStages` below. */
export type WinningFightStatStages = Readonly<{
  atk: number;
  def: number;
  speed: number;
  spAtk: number;
  spDef: number;
  acc: number;
  evasion: number;
}>;

/**
 * Pure-status stat-stage move effects, keyed by the engine's own generated
 * `effect` field (`src/data/gen/moves.json`) rather than a hand-picked move
 * list -- any current or future move sharing one of these effect constants
 * is covered automatically. Only effects whose ENTIRE behaviour is the stat
 * change are listed (the "_HIT" damaging+chance variants, and dual-purpose
 * effects like EFFECT_SWAGGER/EFFECT_FLATTER/EFFECT_CURSE that also inflict
 * confusion or fixed damage, are deliberately excluded -- those still do
 * something even once the stat stage is maxed, so ISSUES #125's "no effect
 * until PP runs out" pathology doesn't apply to them).
 */
const SELF_STAT_UP_EFFECTS: Readonly<Record<string, readonly (keyof WinningFightStatStages)[]>> = {
  EFFECT_ATTACK_UP: ["atk"],
  EFFECT_ATTACK_UP_2: ["atk"],
  EFFECT_DEFENSE_UP: ["def"],
  EFFECT_DEFENSE_UP_2: ["def"],
  EFFECT_DEFENSE_CURL: ["def"],
  EFFECT_SPEED_UP_2: ["speed"],
  EFFECT_SPECIAL_ATTACK_UP: ["spAtk"],
  EFFECT_SPECIAL_ATTACK_UP_2: ["spAtk"],
  EFFECT_SPECIAL_DEFENSE_UP_2: ["spDef"],
  EFFECT_EVASION_UP: ["evasion"],
  EFFECT_MINIMIZE: ["evasion"],
  EFFECT_BULK_UP: ["atk", "def"],
  EFFECT_CALM_MIND: ["spAtk", "spDef"],
  EFFECT_DRAGON_DANCE: ["atk", "speed"],
  EFFECT_COSMIC_POWER: ["def", "spDef"],
};

const FOE_STAT_DOWN_EFFECTS: Readonly<Record<string, readonly (keyof WinningFightStatStages)[]>> = {
  EFFECT_ATTACK_DOWN: ["atk"],
  EFFECT_ATTACK_DOWN_2: ["atk"],
  EFFECT_DEFENSE_DOWN: ["def"],
  EFFECT_DEFENSE_DOWN_2: ["def"],
  EFFECT_SPEED_DOWN: ["speed"],
  EFFECT_SPEED_DOWN_2: ["speed"],
  EFFECT_SPECIAL_DEFENSE_DOWN_2: ["spDef"],
  EFFECT_ACCURACY_DOWN: ["acc"],
  EFFECT_ACCURACY_DOWN_2: ["acc"],
  EFFECT_EVASION_DOWN: ["evasion"],
  EFFECT_EVASION_DOWN_2: ["evasion"],
};

/**
 * True when `effect` is a pure self-boost already at +6 for every stat it
 * touches, or a pure foe-stat-drop already at -6 for every stat it touches
 * (ISSUES #125's lever). Returns false -- never skip -- when the relevant
 * stages weren't supplied, so omitting them reproduces today's behaviour
 * exactly.
 */
function isMaxedStatusEffect(
  effect: string,
  attackerStatStages: WinningFightStatStages | undefined,
  defenderStatStages: WinningFightStatStages | undefined,
): boolean {
  const selfStats = SELF_STAT_UP_EFFECTS[effect];
  if (selfStats) {
    if (!attackerStatStages) return false;
    return selfStats.every((stat) => attackerStatStages[stat] >= MAX_STAT_STAGE);
  }
  const foeStats = FOE_STAT_DOWN_EFFECTS[effect];
  if (foeStats) {
    if (!defenderStatStages) return false;
    return foeStats.every((stat) => defenderStatStages[stat] <= MIN_STAT_STAGE);
  }
  return false;
}

const TYPE_EFFECTIVENESS =
  typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];

/** Materialized battler types default (matches battleScriptRulesContext.ts's own convention). */
const DEFAULT_TYPES: readonly [string, string] = ["TYPE_NORMAL", "TYPE_NORMAL"];

/** gSpeciesInfo[species].types -- species-types.json is indexed by (speciesId - 1). */
const SPECIES_TYPES = speciesTypesData.species as unknown as readonly Readonly<{
  types: readonly [string, string];
}>[];

function typesForSpecies(species: number): readonly [string, string] {
  return SPECIES_TYPES[species - 1]?.types ?? DEFAULT_TYPES;
}

/**
 * "winning" policy fight-move scorer: for each legal slot,
 * `score = basePower x effectivenessMultiplier(moveType vs defenderTypes) x
 * (STAB ? 1.5 : 1)`, using the engine's own `applyTypeEffectiveness` +
 * type-effectiveness table. A 0x-immune or non-damaging (power 0) slot
 * scores 0. Ties keep the lower slot (strict `>` never overwrites an equal
 * score). If every legal slot scores 0, falls back to the highest-power
 * legal slot (ties to the lower slot again), matching the policy's prior
 * behaviour -- except a pure stat-stage status slot that's already maxed
 * (ISSUES #125) is skipped in favour of any other non-maxed legal slot,
 * when `attackerStatStages`/`defenderStatStages` are supplied. If every
 * legal slot is maxed (or the stages are omitted), the original highest-
 * power/lowest-slot fallback still applies unchanged.
 */
export function pickWinningFightSlot(input: {
  legalSlots: readonly boolean[];
  moveIds: readonly number[];
  attackerTypes: readonly [string, string];
  defenderTypes: readonly [string, string];
  attackerStatStages?: WinningFightStatStages;
  defenderStatStages?: WinningFightStatStages;
}): number {
  const {
    legalSlots,
    moveIds,
    attackerTypes,
    defenderTypes,
    attackerStatStages,
    defenderStatStages,
  } = input;
  let fallbackSlot = 0;
  let fallbackFound = false;
  let fallbackPower = -1;
  let nonMaxedFallbackSlot = 0;
  let nonMaxedFallbackFound = false;
  let nonMaxedFallbackPower = -1;
  let bestSlot = -1;
  let bestScore = 0;
  for (let slot = 0; slot < 4; slot += 1) {
    if (!legalSlots[slot]) continue;
    if (!fallbackFound) {
      fallbackSlot = slot;
      fallbackFound = true;
    }
    const move = MOVE_BY_ID.get(moveIds[slot]!);
    const power = move?.power ?? 0;
    if (power > fallbackPower) {
      fallbackPower = power;
      fallbackSlot = slot;
    }
    const maxed = move !== undefined
      && isMaxedStatusEffect(move.effect, attackerStatStages, defenderStatStages);
    if (!maxed) {
      if (!nonMaxedFallbackFound) {
        nonMaxedFallbackSlot = slot;
        nonMaxedFallbackFound = true;
      }
      if (power > nonMaxedFallbackPower) {
        nonMaxedFallbackPower = power;
        nonMaxedFallbackSlot = slot;
      }
    }
    if (!move || power <= 0) continue;
    const { multiplierTenths } = applyTypeEffectiveness(
      power,
      move.type,
      defenderTypes,
      TYPE_EFFECTIVENESS,
    );
    if (multiplierTenths <= 0) continue;
    const stab = attackerTypes[0] === move.type || attackerTypes[1] === move.type;
    const score = power * (multiplierTenths / 10) * (stab ? 1.5 : 1);
    if (score > bestScore) {
      bestScore = score;
      bestSlot = slot;
    }
  }
  if (bestSlot >= 0) return bestSlot;
  return nonMaxedFallbackFound ? nonMaxedFallbackSlot : fallbackSlot;
}

/**
 * "coverage-fight" policy's fight-slot chooser: among the LEGAL slots this
 * turn, the one whose MOVE has been committed the fewest times so far in
 * this run (`useCountByMoveId`, the driver's own per-run tally of confirmed
 * player commits); ties break to the lowest slot. Deterministic -- no RNG,
 * no scoring, no type table.
 *
 * The point is crash coverage, not winning: `pickWinningFightSlot` above
 * commits the single best-scoring damaging move every turn, so a drafted
 * set's status/utility slots (the class that produced ISSUES #126
 * Metronome->Bide and #127 Baton Pass) are never spent at all. Spending the
 * least-used legal slot walks every move of every drafted set instead.
 *
 * With NO legal slot (forced Struggle: every slot 0-PP/Torment/Disable/...)
 * this returns 0, exactly like `pickWinningFightSlot`'s own no-legal-slot
 * fallback, so the forced-Struggle path downstream is unchanged.
 */
export function pickCoverageFightSlot(input: {
  legalSlots: readonly boolean[];
  moveIds: readonly number[];
  useCountByMoveId: ReadonlyMap<number, number>;
}): number {
  const { legalSlots, moveIds, useCountByMoveId } = input;
  let bestSlot = 0;
  let bestUses = Number.POSITIVE_INFINITY;
  for (let slot = 0; slot < 4; slot += 1) {
    if (!legalSlots[slot]) continue;
    const uses = useCountByMoveId.get(moveIds[slot] ?? 0) ?? 0;
    // Strictly-less keeps the tie on the LOWEST slot.
    if (uses < bestUses) {
      bestUses = uses;
      bestSlot = slot;
    }
  }
  return bestSlot;
}

/**
 * True when every legal move in `moveIds` is either non-damaging (power 0)
 * or 0x-immune against `defenderTypes` -- i.e. the active cannot deal direct
 * damage at all (Milestone M-B step 2 part C2: resisted-but-nonzero moves,
 * e.g. 0.25x/0.5x, no longer count as walled -- only true immunity does).
 */
function isWalledActive(
  moveIds: readonly number[],
  legalSlots: readonly boolean[],
  defenderTypes: readonly [string, string],
): boolean {
  for (let slot = 0; slot < 4; slot += 1) {
    if (!legalSlots[slot]) continue;
    const move = MOVE_BY_ID.get(moveIds[slot]!);
    if (!move || move.power <= 0) continue;
    const { multiplierTenths } = applyTypeEffectiveness(
      move.power,
      move.type,
      defenderTypes,
      TYPE_EFFECTIVENESS,
    );
    if (multiplierTenths > 0) return false;
  }
  return true;
}

/**
 * A benched party member's best score (same power x effectiveness x STAB
 * formula as `pickWinningFightSlot`), plus whether it qualifies as a
 * super-effective (>= 2x) answer to the opponent's live types. PP-zero moves
 * are skipped when `movePp` is supplied (a real player wouldn't switch in on
 * a move it can no longer use).
 */
function bestBenchMoveScore(
  moveIds: readonly number[],
  attackerTypes: readonly [string, string],
  defenderTypes: readonly [string, string],
  movePp: readonly number[] | undefined,
): { score: number; qualifies: boolean } {
  let bestScore = 0;
  let qualifies = false;
  for (let i = 0; i < moveIds.length; i += 1) {
    if (movePp && movePp[i]! <= 0) continue;
    const move = MOVE_BY_ID.get(moveIds[i]!);
    if (!move || move.power <= 0) continue;
    const { multiplierTenths } = applyTypeEffectiveness(
      move.power,
      move.type,
      defenderTypes,
      TYPE_EFFECTIVENESS,
    );
    if (multiplierTenths <= 0) continue;
    if (multiplierTenths >= 20) qualifies = true;
    const stab = attackerTypes[0] === move.type || attackerTypes[1] === move.type;
    const score = move.power * (multiplierTenths / 10) * (stab ? 1.5 : 1);
    if (score > bestScore) bestScore = score;
  }
  return { score: bestScore, qualifies };
}

export type WinningSwitchBenchCandidate = Readonly<{
  row: 0 | 1 | 2;
  fainted: boolean;
  active: boolean;
  moveIds: readonly number[];
  movePp?: readonly number[];
  types: readonly [string, string];
  hp: number;
  maxHp: number;
}>;

/**
 * "winning" policy voluntary-switch scorer (Milestone M-B step 2 part C,
 * tightened in part C2): when the active is "walled" (every legal move is
 * either non-damaging or 0x-immune against the opponent's live types -- see
 * `isWalledActive`; a merely resisted move, e.g. 0.25x/0.5x, no longer
 * counts) AND a benched, non-fainted party member has a damaging move that
 * is super-effective (>= 2x) against that same opponent AND is at >= 50% of
 * its max HP (`Math.floor((100 * hp) / maxHp) >= 50`, matching the engine's
 * own HP-percent convention, e.g. `factoryAiCheckViability.ts`), returns the
 * best-scoring such bench row (ties keep the lower row). Returns null (no
 * switch -- behave exactly like today's FIGHT-with-scored-move path) when
 * the active isn't walled, when no bench member qualifies, when only one
 * healthy party member remains, or when this same opponent party slot was
 * already switched against once this battle
 * (`alreadySwitchedAgainstThisOpponent` -- the ping-pong guard).
 *
 * ISSUES #125 lever 2 widens the trigger for `forcedStruggle` callers (the
 * active's whole legal fight set is empty -- every slot unusable, the real
 * forced-Struggle state, mirrored by `battlerUsesForcedStruggle`): a real
 * player facing forced Struggle switches to ANY bench mon that can still
 * deal damage, not just a super-effective, >=50%-HP answer, so that branch
 * drops the HP floor and the >=2x qualifier (any power>0/PP>0/non-0x-immune
 * move is enough, i.e. `score > 0` from `bestBenchMoveScore`) and bypasses
 * the ping-pong guard (the guard exists to stop a *preferred* re-switch
 * against the same foe; here the active is out of PP -- there's no scored
 * move left to prefer, so ping-pong cannot apply). The `healthyCount <= 1`
 * floor (nothing to switch to) still applies unconditionally.
 */
/**
 * ISSUES #125 lever 2 regression: mirrors `isVoluntarySwitchTrapped`
 * (src/engine/factoryBattleScriptFullTurnDecision.ts:2085-2114), the gate
 * `legalCommandDecisions` consults there before publishing ANY "switch"
 * decision for the player battler. That gate is unconditional -- it does not
 * carve out an exception for forced Struggle -- so a battler trapped by
 * WRAPPED_MASK/ESCAPE_PREVENTION status2, ROOTED status3, or the opponent's
 * Shadow Tag/Arena Trap(non-Flying/non-Levitate)/Magnet Pull(vs Steel)
 * NEVER sees a switch row on the party screen, forced Struggle or not. Seed
 * 406 (carry 14) hit exactly this: the opponent's Shadow Tag trapped the
 * player while every fight slot was also at 0 PP, so `pickWinningSwitchRow`'s
 * forced-Struggle branch (which only checks PP/usability, not trapping) kept
 * committing to row 1 while the party screen -- correctly, per the same rule
 * the live engine enforces -- had no legal row to accept, ping-ponging
 * forever. `computeSwitchRow` below calls this first and skips
 * `pickWinningSwitchRow` entirely when trapped, so both phases agree: no
 * proposed switch, ever, while trapped (the actor falls through to FIGHT and,
 * once every slot is unusable, genuinely Struggles).
 */
export function isPlayerVoluntarySwitchTrapped(
  rulesContext: BattleScriptRulesContext,
): boolean {
  const active = rulesContext.battlers[0]!;
  const WRAPPED_OR_ESCAPE_PREVENTION = (1 << 13) | (1 << 14) | (1 << 15) | (1 << 26);
  const ROOTED = 1 << 10;
  if (
    (active.status2 & WRAPPED_OR_ESCAPE_PREVENTION) !== 0
    || (active.status3 & ROOTED) !== 0
  ) {
    return true;
  }
  const opponent = rulesContext.battlers[1]!;
  if (opponent.hp === 0 || (rulesContext.absentBattlerFlags & (1 << 1)) !== 0) return false;
  const ABILITY_SHADOW_TAG = 23;
  const ABILITY_LEVITATE = 26;
  const ABILITY_MAGNET_PULL = 42;
  const ABILITY_ARENA_TRAP = 71;
  if (opponent.ability === ABILITY_SHADOW_TAG) return true;
  if (
    opponent.ability === ABILITY_ARENA_TRAP
    && !active.types.includes("TYPE_FLYING")
    && active.ability !== ABILITY_LEVITATE
  ) {
    return true;
  }
  return opponent.ability === ABILITY_MAGNET_PULL && active.types.includes("TYPE_STEEL");
}

export function pickWinningSwitchRow(input: {
  activeMoveIds: readonly number[];
  activeLegalSlots: readonly boolean[];
  defenderTypes: readonly [string, string];
  bench: readonly WinningSwitchBenchCandidate[];
  healthyCount: number;
  alreadySwitchedAgainstThisOpponent: boolean;
  forcedStruggle?: boolean;
}): 0 | 1 | 2 | null {
  if (input.healthyCount <= 1) return null;
  const forcedStruggle = input.forcedStruggle ?? false;
  if (!forcedStruggle) {
    if (input.alreadySwitchedAgainstThisOpponent) return null;
    if (!isWalledActive(input.activeMoveIds, input.activeLegalSlots, input.defenderTypes)) return null;
  }
  let bestRow: 0 | 1 | 2 | null = null;
  let bestScore = 0;
  for (const candidate of input.bench) {
    if (candidate.active || candidate.fainted) continue;
    if (!forcedStruggle && Math.floor((100 * candidate.hp) / candidate.maxHp) < 50) continue;
    const { score, qualifies } = bestBenchMoveScore(
      candidate.moveIds,
      candidate.types,
      input.defenderTypes,
      candidate.movePp,
    );
    if (!(forcedStruggle ? score > 0 : qualifies)) continue;
    // Ties keep the lower row regardless of `bench` iteration order.
    if (bestRow === null || score > bestScore || (score === bestScore && candidate.row < bestRow)) {
      bestScore = score;
      bestRow = candidate.row;
    }
  }
  return bestRow;
}

// ---------------------------------------------------------------------------
// "winning-swap" swap-screen scorer/planner: the swap screen's own SUMMARY
// option (FactorySwapState "playerOptions"/"enemyPicker" cursor 0) shows a
// real player every rental's species and moves before deciding, so weighing
// them is arbitrary-but-legal play, not hidden-state reading. But unlike the
// draft screen, `state.factorySwap.controller`'s parties (`FactorySwapMon`)
// don't carry move data -- only `rentalMons[].monId`, the Frontier set index,
// does. `battle-frontier-mons.json` (keyed by that same monId) is the
// species+moveset source of truth for both the draft screen's own reveal and
// this screen's SUMMARY, so scoring off it here is the same information a
// draft-time score would use, just reached through the roster's monId
// instead of the draft screen's already-resolved rental records.
// ---------------------------------------------------------------------------

const MOVE_BY_NAME = new Map<string, { power: number; type: string }>(
  (movesData as { moves: { move: string; power: number; type: string }[] }).moves.map(
    (move) => [move.move, { power: move.power, type: move.type }],
  ),
);

const BASE_STAT_TOTAL_BY_SPECIES = new Map<string, number>(
  (speciesStatsData as {
    species: {
      name: string;
      baseHp: number;
      baseAttack: number;
      baseDefense: number;
      baseSpeed: number;
      baseSpAttack: number;
      baseSpDefense: number;
    }[];
  }).species.map((s) => [
    s.name,
    s.baseHp + s.baseAttack + s.baseDefense + s.baseSpeed + s.baseSpAttack + s.baseSpDefense,
  ]),
);

const TYPES_BY_SPECIES_NAME = new Map<string, readonly [string, string]>(
  (speciesTypesData.species as unknown as readonly Readonly<{
    name: string;
    types: readonly [string, string];
  }>[]).map((s) => [s.name, s.types]),
);

const FRONTIER_MON_SET_BY_INDEX = new Map<number, { species: string; moves: readonly string[] }>(
  (battleFrontierMonsData as { entries: { index: number; species: string; moves: readonly string[] }[] })
    .entries.map((entry) => [entry.index, { species: entry.species, moves: entry.moves }]),
);

/**
 * "winning-swap" policy candidate scorer, for both the player's own rentals
 * and the defeated opponent's party on the swap screen:
 * `score = baseStatTotal(species) + 2 x bestDamagingMovePower x (STAB ?
 * 1.5 : 1) + 5 x distinctDamagingMoveTypes`, reading the Frontier set's own
 * species base stats and moveset (`battle-frontier-mons.json`, keyed by
 * `monId`/`FactoryRentalMon.monId`) -- the same formula shape as the
 * fight-move/switch scorers above, minus a type-effectiveness term (there is
 * no fixed defender to weigh at swap time, only each candidate's own
 * power/coverage, same as a draft-time rental judged on its own merits).
 * Returns 0 for an unrecognized monId (never expected in practice; the
 * generated roster always resolves).
 */
export function scoreFactorySwapCandidate(monId: number): number {
  const set = FRONTIER_MON_SET_BY_INDEX.get(monId);
  if (!set) return 0;
  const baseStatTotal = BASE_STAT_TOTAL_BY_SPECIES.get(set.species) ?? 0;
  const types = TYPES_BY_SPECIES_NAME.get(set.species) ?? DEFAULT_TYPES;
  let bestMoveScore = 0;
  const attackingTypes = new Set<string>();
  for (const moveName of set.moves) {
    const move = MOVE_BY_NAME.get(moveName);
    if (!move || move.power <= 0) continue;
    attackingTypes.add(move.type);
    const stab = types[0] === move.type || types[1] === move.type;
    const moveScore = move.power * (stab ? 1.5 : 1);
    if (moveScore > bestMoveScore) bestMoveScore = moveScore;
  }
  return baseStatTotal + 2 * bestMoveScore + 5 * attackingTypes.size;
}

export type WinningSwapPlan = {
  readonly worstPlayerRow: 0 | 1 | 2;
  readonly worstPlayerScore: number;
  /**
   * Opponent rows that outscore `worstPlayerScore`, best first (ties keep
   * the lower row). Mutable: `onWinningFactorySwap` shifts off a row the
   * engine rejects as a duplicate species and retries the next one.
   */
  opponentQueue: (0 | 1 | 2)[];
};

/**
 * "winning-swap" policy swap-screen plan: scores all 6 roster slots
 * (`rentalMons[0..2]` player, `rentalMons[3..5]` opponent, `FactorySwapState`'s
 * own layout) via `scoreFactorySwapCandidate` and identifies the player's
 * lowest-scoring rental (ties keep the lower row) plus every opponent row
 * that outscores it, ranked best first (ties keep the lower row). An empty
 * `opponentQueue` means no opponent mon outscores the worst rental -- the
 * swap screen should be declined outright.
 */
export function buildWinningSwapPlan(rentalMons: FactoryRentalRoster): WinningSwapPlan {
  const playerScores = [0, 1, 2].map((row) => scoreFactorySwapCandidate(rentalMons[row]!.monId));
  let worstPlayerRow: 0 | 1 | 2 = 0;
  let worstPlayerScore = playerScores[0]!;
  for (let row = 1; row <= 2; row += 1) {
    if (playerScores[row]! < worstPlayerScore) {
      worstPlayerScore = playerScores[row]!;
      worstPlayerRow = row as 0 | 1 | 2;
    }
  }
  const opponentQueue = ([0, 1, 2] as const)
    .map((row) => ({ row, score: scoreFactorySwapCandidate(rentalMons[row + 3]!.monId) }))
    .filter((candidate) => candidate.score > worstPlayerScore)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.row - b.row))
    .map((candidate) => candidate.row);
  return { worstPlayerRow, worstPlayerScore, opponentQueue };
}

// ---------------------------------------------------------------------------
// "winning-coverage" draft scorer: a COVERAGE-FIRST 3-of-6 rental pick
// (docs/soak-policy-strength-scout-2026-08-23.md lever 4', the last open
// challenge-4 lever after the withheld bulk+STAB draft heuristic and the
// oracle-strength move chooser both measured negative). It reads only what
// the draft screen's own SUMMARY peek already shows a real player before
// renting -- the six offered rentals' species, types and full movesets --
// so weighing them is arbitrary-but-legal play, not hidden-state reading.
// ---------------------------------------------------------------------------

/**
 * The 17 real Gen-3 types, in `type-effectiveness.json`'s own
 * `attackingType`/`defendingType` spelling. `TYPE_FORESIGHT` (like
 * `TYPE_MYSTERY`) is a pseudo-type row of that table, never a party's type,
 * so it is not a coverage target.
 */
export const GEN3_TYPES = [
  "TYPE_NORMAL",
  "TYPE_FIGHTING",
  "TYPE_FLYING",
  "TYPE_POISON",
  "TYPE_GROUND",
  "TYPE_ROCK",
  "TYPE_BUG",
  "TYPE_GHOST",
  "TYPE_STEEL",
  "TYPE_FIRE",
  "TYPE_WATER",
  "TYPE_GRASS",
  "TYPE_ELECTRIC",
  "TYPE_PSYCHIC",
  "TYPE_ICE",
  "TYPE_DRAGON",
  "TYPE_DARK",
] as const;

/** One offered rental, structurally satisfied by `DraftScreenState.rentals[i]`. */
export type CoverageDraftRental = Readonly<{
  species: string;
  types: readonly string[];
  moves: readonly Readonly<{ power: number; type: string }>[];
}>;

/** Lexicographic score of a candidate trio: offensive, then defensive, then bulk. */
export type CoverageDraftScore = Readonly<{
  /**
   * Offensive coverage: for each of the 17 defending types, 1 point (times
   * that type's pool weight) when at least one damaging move (power > 0)
   * anywhere in the trio is super-effective (> 1x) against it.
   */
  offensive: number;
  /**
   * Defensive diversity: distinct primary/secondary types across the trio
   * (0..6) minus the count of SHARED 4x weaknesses -- attacking types that
   * two or more of the three take >= 4x from, i.e. one attacker that sweeps
   * most of the party.
   */
  defensive: number;
  /** Tiebreak only: sum of the trio's species base-stat totals. */
  bst: number;
}>;

/** Distinct types of one rental (mono-types repeat the same string twice). */
function coverageRentalTypes(rental: CoverageDraftRental): string[] {
  return [...new Set(rental.types)];
}

/** The rental's own types as a defender pair for `applyTypeEffectiveness`. */
function coverageDefenderPair(rental: CoverageDraftRental): readonly [string, string] {
  const first = rental.types[0] ?? DEFAULT_TYPES[0];
  return [first, rental.types[1] ?? first];
}

/** Type multiplier in tenths (10 = 1x), independent of the damage argument. */
function coverageMultiplierTenths(
  moveType: string,
  defenderTypes: readonly [string, string],
): number {
  return applyTypeEffectiveness(1, moveType, defenderTypes, TYPE_EFFECTIVENESS).multiplierTenths;
}

/**
 * Pool weight per defending type for the offensive term. The rental ranges
 * `sInitialRentalMonRanges` are symmetric -- the opponent's party is drawn
 * from the SAME species row as the player's offers
 * (`battle_factory.c:334`/`:560`; scout doc §2) -- so the types present
 * among the six offered rentals are a free, cheap sample of the tier's
 * opponent pool. Weight is `1 + occurrences` (never 0): the six offers are
 * only a sample of a ~96-species row, so a type absent from them still
 * counts for its base 1, it just doesn't get the observed-commonness bonus.
 */
export function coverageDraftTypeWeights(
  rentals: readonly CoverageDraftRental[],
): ReadonlyMap<string, number> {
  const weights = new Map<string, number>(GEN3_TYPES.map((type) => [type, 1]));
  for (const rental of rentals) {
    for (const type of coverageRentalTypes(rental)) {
      const current = weights.get(type);
      if (current !== undefined) weights.set(type, current + 1);
    }
  }
  return weights;
}

/**
 * Scores one candidate trio. Deterministic and RNG-free: the same six
 * offered rentals always produce the same score for the same trio.
 */
export function scoreCoverageDraftTrio(
  trio: readonly CoverageDraftRental[],
  weights: ReadonlyMap<string, number>,
): CoverageDraftScore {
  let offensive = 0;
  for (const defendingType of GEN3_TYPES) {
    let hits = false;
    for (const rental of trio) {
      for (const move of rental.moves) {
        if (move.power <= 0) continue;
        if (coverageMultiplierTenths(move.type, [defendingType, defendingType]) > 10) {
          hits = true;
          break;
        }
      }
      if (hits) break;
    }
    if (hits) offensive += weights.get(defendingType) ?? 1;
  }
  const distinctTypes = new Set<string>();
  for (const rental of trio) {
    for (const type of coverageRentalTypes(rental)) distinctTypes.add(type);
  }
  let shared4x = 0;
  for (const attackingType of GEN3_TYPES) {
    let quadCount = 0;
    for (const rental of trio) {
      if (coverageMultiplierTenths(attackingType, coverageDefenderPair(rental)) >= 40) {
        quadCount += 1;
      }
    }
    if (quadCount >= 2) shared4x += 1;
  }
  let bst = 0;
  for (const rental of trio) bst += BASE_STAT_TOTAL_BY_SPECIES.get(rental.species) ?? 0;
  return { offensive, defensive: distinctTypes.size - shared4x, bst };
}

/** Lexicographic (offensive, defensive, bst) comparison; > 0 means `a` is better. */
function compareCoverageScore(a: CoverageDraftScore, b: CoverageDraftScore): number {
  if (a.offensive !== b.offensive) return a.offensive - b.offensive;
  if (a.defensive !== b.defensive) return a.defensive - b.defensive;
  return a.bst - b.bst;
}

export type CoverageDraftPick = Readonly<{
  /** Slots 0..5 in rent order (bulkiest first). */
  picks: readonly number[];
  /** The winning trio's score, for the verbose transcript. */
  score: CoverageDraftScore;
}>;

/**
 * Shared trio search for the coverage-first drafts: enumerates all 20
 * three-of-six combinations in ascending slot order and keeps the best by
 * `compareCoverageScore` (strict `>` never overwrites an equal score, so
 * ties keep the earliest combination) among trios whose summed base-stat
 * total is >= `bstFloor` (0 = no floor). No RNG at all -- the same six
 * offers always yield the same trio. Rent ORDER inside the chosen trio is
 * descending base-stat total (ties keep the lower slot) so the bulkiest of
 * the three leads battle 1; the trio ITSELF is chosen by coverage.
 */
function pickBestTrioAboveFloor(
  rentals: readonly CoverageDraftRental[],
  bstFloor: number,
): CoverageDraftPick {
  const weights = coverageDraftTypeWeights(rentals);
  let bestSlots: number[] | null = null;
  let bestScore: CoverageDraftScore | null = null;
  for (let a = 0; a < rentals.length; a += 1) {
    for (let b = a + 1; b < rentals.length; b += 1) {
      for (let c = b + 1; c < rentals.length; c += 1) {
        const slots = [a, b, c];
        const score = scoreCoverageDraftTrio(
          slots.map((slot) => rentals[slot]!),
          weights,
        );
        if (score.bst < bstFloor) continue;
        if (bestScore === null || compareCoverageScore(score, bestScore) > 0) {
          bestScore = score;
          bestSlots = slots;
        }
      }
    }
  }
  if (bestSlots === null || bestScore === null) {
    // Fewer than three rentals offered -- never happens in play (the draft
    // screen always offers six); rent whatever is there, in slot order.
    // Unreachable via the floor: `combinedDraftBstFloor` is the MEAN trio
    // total, and the max trio total (an integer >= that mean) always meets
    // its ceiling.
    const slots = rentals.map((_, slot) => slot);
    return { picks: slots, score: scoreCoverageDraftTrio(rentals, weights) };
  }
  const bstOf = (slot: number): number =>
    BASE_STAT_TOTAL_BY_SPECIES.get(rentals[slot]!.species) ?? 0;
  const picks = [...bestSlots].sort((x, y) =>
    bstOf(y) !== bstOf(x) ? bstOf(y) - bstOf(x) : x - y,
  );
  return { picks, score: bestScore };
}

/** "winning-coverage" policy draft pick: pure coverage, no strength floor. */
export function pickCoverageDraftPicks(
  rentals: readonly CoverageDraftRental[],
): CoverageDraftPick {
  return pickBestTrioAboveFloor(rentals, 0);
}

/**
 * "winning-combined" strength floor: the MEAN candidate-trio base-stat
 * total, i.e. what a random 3-of-6 draft fields in expectation. Each rental
 * appears in 3/n of the n-choose-3 trios, so the mean trio total is
 * `3/n * sum(all offered BSTs)` -- for the real six-offer draft, exactly
 * half the six offers' summed total. Ceiling'd to stay an integer bar; the
 * max-BST trio (an integer >= the mean) always meets it, so the floored
 * search can never come up empty.
 */
export function combinedDraftBstFloor(rentals: readonly CoverageDraftRental[]): number {
  let total = 0;
  for (const rental of rentals) {
    total += BASE_STAT_TOTAL_BY_SPECIES.get(rental.species) ?? 0;
  }
  return Math.ceil((total * 3) / Math.max(3, rentals.length));
}

export type CombinedDraftPick = CoverageDraftPick & Readonly<{ floor: number }>;

/**
 * "winning-combined" policy draft pick: the same coverage-first lexicographic
 * score as "winning-coverage", maximised only over trios whose summed
 * base-stat total meets `combinedDraftBstFloor` -- coverage subject to a
 * strength floor. The lever left standing after lever 4 (bulk+STAB) starved
 * coverage and lever 4' (pure coverage) starved bulk
 * (docs/soak-policy-strength-scout-2026-08-23.md, "Result -- lever 4'").
 */
export function pickCombinedDraftPicks(
  rentals: readonly CoverageDraftRental[],
): CombinedDraftPick {
  const floor = combinedDraftBstFloor(rentals);
  return { ...pickBestTrioAboveFloor(rentals, floor), floor };
}

// ---------------------------------------------------------------------------
// "oracle-strength" policy: the ENGINE'S OWN source-derived Factory AI move
// scorer, run for the PLAYER's side.
//
// `chooseFactoryAiScoredDecision` (src/engine/factoryAiDecisionPolicy.ts) is
// the ported `ChooseMoveOrAction_Singles` scoring loop the opponent uses; the
// live opponent driver feeds it a `FactoryAiScoredView` built by
// `createFactoryAiViewFromLiveRules` (src/engine/factoryAiLiveDriver.ts),
// whose attacker is battler 1 (the trainer) and target is battler 0 (the
// player). `buildOracleStrengthPlayerView` below is that same builder with
// the two sides SWAPPED -- attacker battler 0 (the player), target battler 1
// (the opponent), side statuses and `gLastMoves` indexed to match. The view's
// `active` field still reads `{ aiBattler: 1, targetBattler: 0 }` because the
// scorer's own validator requires those literals; nothing downstream of it
// indexes real battle state by them (every field it reads comes from
// `view.attacker`/`view.target`), so the swap is purely in what we hand it.
//
// THIS IS A TEST INSTRUMENT, NOT A FAIRNESS MODEL. The player side is given
// full knowledge of the opponent's live moves, real ability and real held-item
// hold effect (`knownMoveIds`/`knownAbility`/`knownItemEffect` filled from the
// live rules context instead of from an observed BattleHistory). A real player
// would only know what it had seen; the point of this policy is an upper bound
// on in-battle move choice, so it reads the truth.
//
// The mask is pinned to the full triad (7 = CHECK_BAD_MOVE | TRY_TO_FAINT |
// CHECK_VIABILITY) by handing `selectFactoryAiMask` a fixed
// challengeNumber-4 input -- the player's own strength must not track the
// round's own challenge tier.
// ---------------------------------------------------------------------------

/**
 * Fixed mask-selection input: Level-50 singles, a non-Brain trainer, and a
 * win streak of 28 -> challengeNumber 4 -> the `challengeAtLeast4` branch ->
 * mask 7 (`battle_factory.c:889-911`, ported in `factoryAiMaskSelection.ts`).
 * Constant on purpose: the player's scorer is always full strength.
 */
export const ORACLE_STRENGTH_FACTORY_INPUT: FactoryAiMaskSelectionInput = Object.freeze({
  levelMode: FACTORY_LEVEL_MODE_50,
  battleMode: FACTORY_BATTLE_MODE_SINGLES,
  factoryWinStreak: 28,
  trainerOpponentId: 0,
});

type SoakAbilityIdRow = Readonly<{ name: string; id: number }>;
const ORACLE_STRENGTH_ABILITY_NAME_BY_ID = new Map(
  (abilityItemHooksData as { universes: { abilities: SoakAbilityIdRow[] } })
    .universes.abilities.map((row) => [row.id, row.name]),
);

const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;

/** Mirror of `factoryAiLiveDriver.ts`'s own private `abilityName`. */
function oracleStrengthAbilityName(ability: number): string {
  const name = ORACLE_STRENGTH_ABILITY_NAME_BY_ID.get(ability);
  if (name === undefined) throw new Error(`oracle-strength view: unknown ability id ${ability}`);
  return name;
}

/** Mirror of `factoryAiLiveDriver.ts`'s own private `currentWeather`. */
function oracleStrengthWeather(weather: number): AiWeatherValue | undefined {
  if ((weather & B_WEATHER_SUN) !== 0) return AI_WEATHER_SUN;
  if ((weather & B_WEATHER_RAIN) !== 0) return AI_WEATHER_RAIN;
  if ((weather & B_WEATHER_SANDSTORM) !== 0) return AI_WEATHER_SANDSTORM;
  if ((weather & B_WEATHER_HAIL) !== 0) return AI_WEATHER_HAIL;
  return undefined;
}

/** Mirror of `factoryAiLiveDriver.ts`'s own private `statStages`. */
function oracleStrengthStatStages(battler: BattleScriptRulesContext["battlers"][number]) {
  return Object.freeze({
    atk: battler.statStages[1]!,
    def: battler.statStages[2]!,
    speed: battler.statStages[3]!,
    spAtk: battler.statStages[4]!,
    spDef: battler.statStages[5]!,
    acc: battler.statStages[6]!,
    evasion: battler.statStages[7]!,
  });
}

/**
 * `createFactoryAiViewFromLiveRules` with the sides swapped: the PLAYER
 * (battler 0, side 0) is the attacker whose four move slots get scored, and
 * the OPPONENT (battler 1, side 1) is the target. Field-for-field the same
 * reads as the live builder, plus the three full-knowledge overrides
 * documented in this section's header.
 */
export function buildOracleStrengthPlayerView(input: Readonly<{
  rulesContext: BattleScriptRulesContext;
  battleTurnCount: number;
}>): FactoryAiScoredView {
  const rulesContext = input.rulesContext;
  const attacker = rulesContext.battlers[0];
  const target = rulesContext.battlers[1];
  const weather = oracleStrengthWeather(rulesContext.weather);
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    // Required literals; see this section's header -- the swap lives in which
    // real battler each of `attacker`/`target` below is read from.
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: ORACLE_STRENGTH_FACTORY_INPUT,
    moves: attacker.moves,
    attacker: Object.freeze({
      types: attacker.types,
      attack: attacker.attack,
      defense: attacker.defense,
      spAttack: attacker.spAttack,
      spDefense: attacker.spDefense,
      speed: attacker.speed,
      level: attacker.level,
      statStages: oracleStrengthStatStages(attacker),
      isFirstTurn: attacker.isFirstTurn,
      hp: attacker.hp,
      maxHp: attacker.maxHP,
      ability: oracleStrengthAbilityName(attacker.ability),
      holdEffect: resolveBattleScriptBattlerHoldEffect(rulesContext, 0),
      battleTurnCount: input.battleTurnCount,
      lightScreenUp: (rulesContext.sideStatuses[0] & SIDE_STATUS_LIGHTSCREEN) !== 0,
      reflectUp: (rulesContext.sideStatuses[0] & SIDE_STATUS_REFLECT) !== 0,
      ...(weather === undefined ? {} : { currentWeather: weather }),
      isRooted: (attacker.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0,
      ...((rulesContext.sideStatuses[0] & SIDE_STATUS_FUTUREATTACK) !== 0
        ? { attackerFutureAttackUp: true }
        : {}),
      ...((attacker.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) !== 0
        ? { isInfatuated: true }
        : {}),
      ...((rulesContext.sideStatuses[0] & SIDE_STATUS_SAFEGUARD) !== 0
        ? { safeguardUp: true }
        : {}),
      ...((attacker.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0 ? { isAsleep: true } : {}),
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
      ...((attacker.status3 & BATTLE_SCRIPT_STATUS3_YAWN) !== 0 ? { hasYawn: true } : {}),
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
      statStages: oracleStrengthStatStages(target),
      isFirstTurn: target.isFirstTurn,
      hp: target.hp,
      maxHp: target.maxHP,
      lastUsedMoveId: rulesContext.moveHistory.lastMoves[1],
      ...(target.status1 !== 0 ? { hasAnyStatus: true } : {}),
      ...((target.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0 ? { isAsleep: true } : {}),
      isToxicPoisoned: (target.status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0,
      isLeechSeeded: (target.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) !== 0,
      isCursed: (target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CURSED) !== 0,
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) !== 0
        ? { isConfused: true }
        : {}),
      ...(target.tauntTimer !== 0 ? { isTaunted: true } : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION) !== 0
        ? { isInfatuated: true }
        : {}),
      ...((target.status2 & STATUS2_ESCAPE_PREVENTION) !== 0 ? { isEscapePrevented: true } : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT) !== 0
        ? { isTormented: true }
        : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE) !== 0
        ? { isNightmared: true }
        : {}),
      ...((target.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0
        ? { isForesighted: true }
        : {}),
      ...((target.status3 & BATTLE_SCRIPT_STATUS3_YAWN) !== 0 ? { hasYawn: true } : {}),
      ...((target.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG) !== 0
        ? { hasPerishSong: true }
        : {}),
      // Full-knowledge overrides (test instrument, not a fairness model):
      // the live opponent driver reads these three off an observed
      // BattleHistory; the player reads the truth instead.
      ability: oracleStrengthAbilityName(target.ability),
      knownAbility: oracleStrengthAbilityName(target.ability),
      knownItemEffect: resolveBattleScriptBattlerHoldEffect(rulesContext, 1),
      holdEffect: resolveBattleScriptBattlerHoldEffect(rulesContext, 1),
      knownMoveIds: target.moves.filter((moveId) => moveId !== 0),
      ...((rulesContext.sideStatuses[1] & SIDE_STATUS_SAFEGUARD) !== 0
        ? { safeguardUp: true }
        : {}),
      ...((rulesContext.sideStatuses[1] & SIDE_STATUS_SPIKES) !== 0 ? { spikesUp: true } : {}),
      ...((rulesContext.sideStatuses[1] & SIDE_STATUS_FUTUREATTACK) !== 0
        ? { targetFutureAttackUp: true }
        : {}),
      // `AI_CV_BrickBreak` reads the TARGET's own side Reflect; for the
      // player-as-attacker view that is side 1.
      targetSideReflectUp: (rulesContext.sideStatuses[1] & SIDE_STATUS_REFLECT) !== 0,
    }),
  });
}

export type OracleStrengthPick = Readonly<{
  /** The fight slot to commit, or null when the caller must fall back. */
  slot: number | null;
  /** Non-null exactly when `slot` is null: the logged fallback reason. */
  fallbackReason: string | null;
}>;

/**
 * "oracle-strength" fight-slot chooser. Builds the swapped view pair from the
 * live rules context, hands it to the engine's own
 * `chooseFactoryAiScoredDecision` together with a synthetic battler-1 command
 * request carrying the player's LEGAL move slots (the scorer's validator
 * requires a trainer battler-1 request; it only ever reads the request's
 * `legalDecisions` move slots), and returns the slot the scorer chose.
 *
 * RNG: the scorer's own setup/tie draws run on a CURSOR SUPPLIED BY THE
 * CALLER and the advanced cursor is discarded, so the live battle's RNG is
 * never touched by the player's decision. The soak passes a fresh u32 drawn
 * from its own seeded stream (`Rng`), so the policy stays deterministic per
 * soak seed while the four `simulatedRng` slots and the final tie index still
 * vary from decision to decision.
 *
 * Returns a fallback reason instead of a slot when there is no legal fight
 * slot, when the scorer yields anything other than a `use-move` decision, or
 * when the scorer refuses/halts (e.g. an unsupported-branch barrier in a
 * player-side configuration the engine itself never produces). Callers count
 * those and use the "winning" policy's own choice.
 */
export function pickOracleStrengthFightSlot(input: Readonly<{
  rulesContext: BattleScriptRulesContext;
  legalSlots: readonly boolean[];
  battleTurnCount: number;
  rngValue: number;
}>): OracleStrengthPick {
  const attackerMoves = input.rulesContext.battlers[0].moves;
  const legalDecisions: BattleMoveDecision[] = [];
  for (let slot = 0; slot < 4; slot += 1) {
    if (!input.legalSlots[slot]) continue;
    if (attackerMoves[slot] === 0) continue;
    legalDecisions.push({
      kind: "use-move",
      moveSlot: slot as 0 | 1 | 2 | 3,
      targetBattler: 0,
    });
  }
  if (legalDecisions.length === 0) {
    return { slot: null, fallbackReason: "no legal fight slot" };
  }
  let choice: FactoryAiScoredChoice;
  try {
    choice = chooseFactoryAiScoredDecision({
      view: buildOracleStrengthPlayerView({
        rulesContext: input.rulesContext,
        battleTurnCount: input.battleTurnCount,
      }),
      request: {
        kind: "command",
        requestId: 0,
        side: "trainer",
        battler: 1,
        legalDecisions,
      },
      rng: { value: input.rngValue >>> 0, calls: 0 },
    });
  } catch (error) {
    return { slot: null, fallbackReason: `scorer threw: ${(error as Error).message}` };
  }
  const decision = choice.submission.decision;
  if (decision.kind !== "use-move") {
    return { slot: null, fallbackReason: `scorer chose ${decision.kind}` };
  }
  return { slot: decision.moveSlot, fallbackReason: null };
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Salt for `RandomPlayer`'s press stream (soak111): the cooldown gap after
 * every press and the message-advance mash's A/B roll are drawn from
 * `new Rng(seed, SOAK_PRESS_RNG_SALT)`, never from the decision stream.
 */
export const SOAK_PRESS_RNG_SALT = 0x50ac_0111;

export class Rng {
  private readonly next: () => number;
  readonly seed: number;
  constructor(seed: number, salt = 0) {
    this.seed = seed;
    // Spread nearby integer seeds apart. `salt === 0` is the decision stream
    // (bit-identical to the pre-soak111 single stream); a nonzero salt
    // derives an independent stream from the same seed.
    const spread = (seed ^ 0x9e3779b9) + seed * 0x85eb_ca6b;
    this.next = mulberry32(salt === 0 ? spread : (spread ^ salt));
    for (let i = 0; i < 12; i += 1) this.next();
  }
  /** A fresh, independent stream seeded from this stream's seed and `salt` (does not draw from this stream). */
  derive(salt: number): Rng {
    return new Rng(this.seed, salt);
  }
  float(): number {
    return this.next();
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]!;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  /** Uniform press gap in frames: 1..max (always >= 1 idle frame). */
  gap(max: number): number {
    return 1 + this.int(max);
  }
}

// ---------------------------------------------------------------------------
// Action log
// ---------------------------------------------------------------------------

type ActionEntry = { frame: number; battle: number; turn: number; what: string };

/** Exported for tests that drive a `RandomPlayer` directly (`new ActionLog(false)`). */
export class ActionLog {
  private readonly entries: ActionEntry[] = [];
  private readonly verbose: boolean;
  private readonly onNote?: (entry: ActionEntry) => void;
  constructor(verbose: boolean, onNote?: (entry: ActionEntry) => void) {
    this.verbose = verbose;
    this.onNote = onNote;
  }
  push(frame: number, battle: number, turn: number, what: string): void {
    this.entries.push({ frame, battle, turn, what });
    if (this.entries.length > 64) this.entries.shift();
    this.onNote?.({ frame, battle, turn, what });
    if (this.verbose) {
      console.log(`  [f=${frame} b${battle} t${turn}] ${what}`);
    }
  }
  tail(n: number): ActionEntry[] {
    return this.entries.slice(-n);
  }
}

// ---------------------------------------------------------------------------
// Per-seed result shape
// ---------------------------------------------------------------------------

export type SeedOutcome = "OK" | "CRASH" | "HANG";

export type SoakScene = "on" | "off";

export type SeedResult = {
  seed: number;
  outcome: SeedOutcome;
  /**
   * OK sub-outcome: "budget" (frame budget reached while still making
   * progress — ISSUES #104 retune; since 2026-08-24 that includes the
   * `stopAtFirstRoundDecision`/`stopAtFirstActionMenu` modes, whose target
   * simply never arrived), "max-rounds" (`--max-rounds` reached),
   * roundComplete | roundLost | milestone:first-action-menu. Also set on a
   * HANG that stalled with some round already decided — the decided
   * round's own outcome (roundComplete | roundLost), so the CLI/summary
   * line reads like a post-decision stall instead of looking like a
   * mid-round one.
   */
  endState?: string;
  frames: number;
  battle: number;
  turn: number;
  errorName?: string;
  errorMessage?: string;
  /** "engine" (src/**), "driver" (tools/soak/**), or "unknown" */
  errorOrigin?: string;
  /** thrown during "tick" or "render" */
  errorPhase?: string;
  /** Battle Scene mode the seed ran under; present only when a run asked for one (`--scene on|both`). */
  scene?: SoakScene;
  stackTop?: string[];
  signature?: string;
  lastActions?: string[];
  hangSurface?: string;
  /**
   * Max over the run, sampled every tick, of the orchestrator's carried-in
   * win streak (`config.factoryWinStreak`) — null only if no orchestrator
   * ever existed. Unlike `RunDiagnostics.carriedWinStreak`, this survives a
   * later loss/re-chain: it is a running maximum, not a snapshot.
   */
  maxCarriedWinStreak: number | null;
  /**
   * Max over the run, sampled every tick, of `config.factoryWinStreak +
   * round.rules.battleIndex` — the deepest battle position ever reached,
   * matching the internal depth formula
   * (`factoryRoundBattleOrchestrator.ts:559`). Null only if no orchestrator
   * ever existed.
   */
  maxBattleDepth: number | null;
  /**
   * "oracle-strength" only: fight-slot decisions where the engine's own
   * scorer could not answer and the policy fell back to "winning"'s
   * `pickWinningFightSlot` (each one also logged as
   * `oracle-strength fallback: <reason>`). Always 0 for every other policy.
   */
  oracleStrengthFallbacks: number;
  /**
   * contain209: distinct presentation throws the engine contained during this seed (src/engine/presentationContainment.ts;
   * the battle went on with that command drawn static) and the first one's message. Absent when there were none.
   */
  contained?: number;
  containedFirstMessage?: string;
  /** Opt-in test diagnostics; absent from ordinary CLI/full/vanilla runs. */
  diagnostics?: RunDiagnostics;
};

export type RunDiagnostics = Readonly<{
  roundPhase: string | null;
  battleIndex: number | null;
  lastBattleOutcome: "win" | "loss" | null;
  opponentGenerationCount: number;
  battleRngSegmentCount: number;
  terminalOutcome: "loss" | "roundWon" | null;
  terminalRecordMenuInputReadyReached: boolean;
  terminalRecordChoice: "yes" | "no" | "cancel" | null;
  renderCalls: number;
  /**
   * The win streak carried INTO the CURRENT orchestrator's round
   * (`config.factoryWinStreak`, `factoryRoundChaining.ts`'s carry — +7 per
   * completed round win, 0 after a loss), read at whatever moment
   * diagnostics happen to be captured. This is a SNAPSHOT, not a maximum:
   * a run that chains a win (carry 7) and then loses the next round can
   * re-chain into a fresh round before diagnostics are taken, resetting
   * this back to 0 even though the run once carried 7. For the run's true
   * peak, use `SeedResult.maxCarriedWinStreak` / `maxBattleDepth` (tracked
   * every tick in `runSeed`), not this field.
   */
  carriedWinStreak: number | null;
  /**
   * `challengeNum` (`Math.floor(factoryWinStreak / 7)`,
   * factoryOpponentGeneration.ts) the CURRENT orchestrator's first opponent
   * was generated at, from `opponentGenerations[0].generation.challengeNum`
   * -- null if no orchestrator exists yet or it hasn't generated an opponent
   * yet. `--start-carry` pin surface: confirms a carried streak actually
   * reaches the higher-tier generation branches (sFixedIVTable, rental
   * ranges, brain fixed IV) keyed on this value, not just the carry field.
   */
  firstOpponentChallengeNum: number | null;
}>;

// ---------------------------------------------------------------------------
// Crash signature normalization
// ---------------------------------------------------------------------------

function normalizeMessage(message: string): string {
  return message
    .replace(/\d+/g, "#")
    .replace(/"[^"]*"/g, '"…"')
    .slice(0, 200);
}

function stackFrames(error: Error): string[] {
  const stack = error.stack ?? "";
  return stack
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "));
}

function shortFrame(frame: string): string {
  // "at fn (file:///…/src/engine/foo.ts:12:3)" -> "fn (src/engine/foo.ts:12)"
  const match = frame.match(/^at (?:(.*?) )?\(?(?:file:\/\/)?([^()]*?):(\d+):\d+\)?$/);
  if (!match) return frame;
  const fn = match[1] ?? "<anon>";
  let file = match[2] ?? "";
  const m2 = file.match(/(?:^|\/)((?:src|tools|tests)\/.*)$/);
  if (m2) file = m2[1]!;
  return `${fn} (${file}:${match[3]})`;
}

function topAppFrame(frames: string[]): string {
  for (const frame of frames) {
    if (frame.includes("/src/")) return shortFrame(frame);
  }
  return frames.length > 0 ? shortFrame(frames[0]!) : "<no stack>";
}

/** Group frame: file + function only (drop line numbers for stability). */
function signatureFrame(frames: string[]): string {
  const top = topAppFrame(frames);
  return top.replace(/:\d+\)$/, ")");
}

function errorOrigin(frames: string[]): string {
  for (const frame of frames) {
    if (frame.includes("/tools/soak/")) return "driver";
    if (frame.includes("/src/")) return "engine";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// The random-play brain: reads EngineState each frame, emits held buttons.
// ---------------------------------------------------------------------------

const NO_BUTTONS: ReadonlySet<GbaButton> = new Set();

/**
 * "full": arbitrary-but-legal play — every UI choice the real menus expose.
 * "vanilla": the plainest player — rent slots 0/1/2, always FIGHT with the
 * first legal move, forced switches take the offered legal pick, swap offers
 * declined, continuation always GO ON. Press timing stays seed-jittered.
 * "winning": opt-in, deep-streak crash coverage (chained-round distribution-
 * parity plan §4 step 3, addressing gap 3 — neither "full" nor "vanilla"
 * biases toward winning, so a soak's natural chained depth almost never
 * strings together consecutive round wins). Reuses "full"'s menu/target
 * exploration verbatim (same summary/postwin-continuation/terminal rolls)
 * for every decision EXCEPT five (Milestone M-B step 2, parts a/b/c):
 * (1) the fight-menu commits the legal move that scores highest on power x
 * type-effectiveness x STAB (see `pickWinningFightSlot`; falls back to
 * highest-power legal move if every legal move scores 0) instead of a
 * uniform-random slot; (2) a voluntary POKéMON party-select (forced
 * switches are unaffected — they're not voluntary) always declines UNLESS
 * part (5) below has already committed to a row this turn; (3) the postwin
 * swap offer always answers NO instead of "full"'s 50/50 roll (the roll is
 * still drawn from the shared RNG stream, matching "full"'s draw at that
 * point, just ignored) — a rental already scouted and played with is worth
 * keeping over an unscouted swap; (4) the draft screen still shuffles the
 * same as "full" — a base-stat+STAB-power+coverage draft-pick heuristic was
 * built and measured (M-B step 2 part B, rung 2) but stays WITHHELD: it wins
 * round 2 more often but collapses at challenge 3+ (7 vs 40 completions at
 * carry >= 21, n=180 — docs/soak-draft-heuristic-n180-2026-08-22.md), so
 * "winning"'s draft is unchanged from "full"'s random 3-of-6 (a
 * coverage-first draft is available opt-in as "winning-coverage" below);
 * (5) at the
 * action menu, when the active is "walled" (every legal move is non-damaging
 * or 0x-immune
 * against the opponent's live types -- a merely resisted move, e.g.
 * 0.25x/0.5x, does NOT count as walled since part C2) and a benched,
 * non-fainted party member has both a damaging move that is super-effective
 * (>= 2x) against the opponent AND is at >= 50% of its max HP, the
 * action-menu roll (still drawn, same as (3)) is overridden to POKéMON and
 * the committed bench row is sent out (see `pickWinningSwitchRow`) instead
 * of item (2)'s decline — guarded against ping-pong (never re-switches
 * against the same opponent party slot twice in a battle) and against
 * emptying the bench (never switches with only one healthy party member
 * left). Biased, not guaranteed-win — arbitrary-but-legal play in spirit (a
 * real player weighing type matchups, preferring stronger rentals over an
 * unscouted swap, and retreating a truly walled mon to a healthy teammate
 * with a super-effective answer), not an AI oracle.
 * "winning-swap": opt-in, identical to "winning" in every respect EXCEPT the
 * postwin swap offer and swap screen — neither "winning" (declines every
 * swap) nor "full" (almost never wins a round at all) has ever exercised the
 * Factory swap screen at meaningful carried-streak depth. Reuses "winning"'s
 * draft/fight/switch/continuation decisions verbatim (same
 * `explores`/winning-biased rolls, same shared-RNG-stream draws). Differs
 * only at: the swap offer always answers YES (instead of "winning"'s always
 * NO); on the swap screen itself, scores the player's 3 rentals and the
 * defeated opponent's 3 party mons with `scoreFactorySwapCandidate` (same
 * power x STAB + base-stat-total + coverage formula shape as the fight/switch
 * scorers above, reading `battle-frontier-mons.json` by `monId` since the
 * swap screen's own party data carries no move info) via `buildWinningSwapPlan`,
 * then navigates real button presses to swap out the LOWEST-scoring rental
 * for the defeated opponent's HIGHEST-scoring mon that outscores it —
 * retrying the next-best candidate if the engine rejects one as a duplicate
 * species, and declining the whole screen (quit prompt, KEEP CURRENT POKéMON)
 * if no opponent mon outscores the worst rental at all.
 *
 * "oracle-strength": opt-in, identical to "winning" in every respect
 * (random 3-of-6 draft, swap offers declined, the same voluntary-switch
 * heuristic, the same exploration/timing rolls) EXCEPT the fight-move
 * choice, which is delegated to the ENGINE'S OWN source-derived Factory AI
 * scorer running for the player's side: `chooseFactoryAiScoredDecision`
 * under the full mask 7 (CHECK_BAD_MOVE | TRY_TO_FAINT | CHECK_VIABILITY),
 * fed a `FactoryAiScoredView` that mirrors the live opponent driver's own
 * with the two sides swapped (see `buildOracleStrengthPlayerView`). The
 * measurement instrument for docs/soak-policy-strength-scout-2026-08-23.md's
 * lever 2 -- the scout found challengeNum 4 is the single unbeaten tier and
 * predicted a source-strength move chooser converts it. NOT a fairness
 * model: the player is handed the opponent's real moves/ability/item. When
 * the scorer has no legal slot, returns a non-move decision, or halts on a
 * barrier, the policy falls back to "winning"'s own
 * `pickWinningFightSlot` choice and logs `oracle-strength fallback:
 * <reason>` (counted in `SeedResult.oracleStrengthFallbacks`).
 *
 * "winning-coverage": opt-in, identical to "winning" in every respect (same
 * fight/switch/swap-decline/continuation decisions, the same
 * exploration/timing rolls, the same shared-RNG-stream draws -- the
 * constructor's draft shuffle is still DRAWN and then overwritten) EXCEPT
 * the draft, which picks the 3-of-6 rentals maximising a COVERAGE-FIRST
 * lexicographic score instead of a random 3-of-6 (see
 * `pickCoverageDraftPicks`): (offensive, defensive, bst), where offensive =
 * the number of the 17 Gen-3 defending types some damaging move in the trio
 * hits super-effectively, each weighted `1 + occurrences among the six
 * offered rentals' own types` (the rental ranges are symmetric, so the
 * offers sample the tier's opponent pool -- scout doc §2); defensive =
 * distinct trio types minus shared 4x weaknesses; bst = the trio's summed
 * base-stat total, the WITHHELD bulk+STAB heuristic's own axis demoted to a
 * pure tiebreak because it starves type coverage (scout doc §3 lever 4).
 * Deterministic given the six offers -- no RNG in the pick. The measurement
 * instrument for that doc's lever 4' (the last open challenge-4 lever);
 * results in its "Result -- lever 4'" section.
 *
 * "winning-combined": opt-in, identical to "winning-coverage" in every
 * respect EXCEPT the draft's trio search, which maximises the same
 * coverage-first lexicographic score only over trios whose summed base-stat
 * total is >= the MEAN candidate-trio total (`combinedDraftBstFloor` --
 * what a random draft fields in expectation), so coverage can never select
 * an all-frail party. The COMBINED-score lever both single-axis drafts
 * pointed at: lever 4 (bulk+STAB primary) starved coverage, lever 4'
 * (coverage with bst a pure tiebreak) starved bulk -- mirror-image failure
 * modes (scout doc, "Result -- lever 4'" closing paragraph).
 *
 * "coverage-fight": opt-in CRASH-COVERAGE instrument, identical to
 * "winning-coverage" in every respect (the same coverage-first 3-of-6
 * draft via the shared `coverageDraftLike` path, the same swap declines,
 * the same voluntary-switch levers, the same continuation/exploration/
 * timing rolls, the same shared-RNG-stream draws) EXCEPT the fight slot,
 * which commits the LEGAL slot whose move this run has used least so far
 * (`pickCoverageFightSlot`, fed the player's own confirmed-commit tally;
 * ties -> lowest slot) instead of the highest-scoring damaging move.
 * Motivation: `--coverage-json` measured 5 full "winning" chains executing
 * 223/276 corpus moves but leaving 27/166 move EFFECTS untouched, and the
 * starved class is exactly status/utility -- the class that produced
 * ISSUES #126 (Metronome->Bide) and #127 (Baton Pass). A least-used-first
 * fight spends every move in every drafted set on purpose. Deliberately
 * NOT a strength policy: it plays each set's worst moves as often as its
 * best, so it wins less and is not a lever measurement.
 */
export type SoakPolicy =
  | "full"
  | "vanilla"
  | "winning"
  | "winning-swap"
  | "oracle-strength"
  | "winning-coverage"
  | "winning-combined"
  | "coverage-fight";
/** Test-only deterministic policy for the source-proven seven-win carrier. */
type PlayerPolicy = SoakPolicy | "strong-route";

type DraftPlan = {
  picks: number[]; // slots 0..5 in rent order
  rented: number;
  peekedSummary: boolean;
};

export class RandomPlayer {
  private cooldown = 0;
  private draft: DraftPlan;
  // Sampled intents, keyed by decision surface identity so a new decision
  // point re-samples.
  private actionIntent: { key: string; target: number; futile: number } | null = null;
  private fightIntent: { key: string; target: number; cancel: boolean; futile: number } | null = null;
  private partyIntent: { key: string; target: 0 | 1 | 2 | "cancel" } | null = null;
  private lastCommandKey = "";
  private turnsThisBattle = 0;
  private lastBattleIndex = 0;
  /** `factoryRoundBattleOrchestrator.config.id` as of the last tick, so a new round at the same `battleIndex` (e.g. battle 1 after a loss) still resets per-battle state. */
  private lastRoundId: string | null = null;
  /** "winning" only: the bench row the action-menu heuristic committed to, consumed by onVoluntaryParty. */
  private pendingSwitchRow: 0 | 1 | 2 | null = null;
  /** "winning" only: opponent partyIndexes already switched against this battle (ping-pong guard). */
  private switchedAgainstOpponentIndices = new Set<number>();
  /** "winning" only: count of voluntary switches the heuristic actually committed to (soak diagnostics). */
  public switchCount = 0;
  /** "oracle-strength" only: fight-slot decisions that fell back to "winning"'s scorer (soak diagnostics). */
  public oracleStrengthFallbacks = 0;
  /** "winning-swap" only: the current swap screen's row plan, built once per swap occurrence. */
  private swapPlan: WinningSwapPlan | null = null;
  /** "winning-coverage"/"winning-combined"/"coverage-fight" only: identity of the offer the current draft plan was scored from, so each fresh round's draft re-scores. */
  private coverageDraftOfferKey: string | null = null;
  /**
   * "coverage-fight" only: this RUN's tally of the player's own confirmed
   * fight commits, keyed by move id (forced Struggle counted as 165, the
   * same correction the commit note and the coverage collector use). Policy
   * state on the player instance -- deliberately NOT module-level mutable
   * state, so every `runSeed` starts from an empty tally and a seed's
   * trajectory depends only on its own play.
   */
  private readonly fightUseCountByMoveId = new Map<number, number>();
  /**
   * soak111: the postwin menus' last roll, reused until the menu's cursor
   * moves (or the menu changes). Those menus used to draw a fresh roll on
   * every press attempt, including presses the menu dropped before it was
   * input-ready, so the number of draws depended on press timing. Re-rolling
   * only after a press visibly landed keeps the old per-landed-press policy.
   */
  private postwinRoll: { key: string; value: number } | null = null;
  public battle = 1;
  public turn = 0;
  private readonly rng: Rng;
  /**
   * soak111: the PRESS stream -- every `press()` cooldown gap and every
   * `pressAdvance()` A/B mash roll. How many presses a presentation
   * consumes depends on its length, so these draws live apart from `rng`
   * (the DECISION stream); a presentation-length change then only shifts
   * frames, never a later decision.
   */
  private readonly pressRng: Rng;
  private readonly log: ActionLog;
  private readonly policy: PlayerPolicy;
  /**
   * `--coverage-json` only (null on every ordinary run): the run-scoped
   * coverage collector, used ONLY to record the fight menu's confirmed slot.
   * Observation, never a decision input.
   */
  private readonly coverage: SoakCoverageCollector | null;

  /** Every policy except "vanilla"/"strong-route" shares the same menu/target exploration rolls. */
  private get explores(): boolean {
    return this.policy === "full" || this.policy === "winning"
      || this.policy === "winning-swap" || this.policy === "oracle-strength"
      || this.policy === "winning-coverage" || this.policy === "winning-combined"
      || this.policy === "coverage-fight";
  }

  /** The winning-biased policies share every decision except the swap offer/screen ("winning-swap"), the fight slot ("oracle-strength"/"coverage-fight"), and the draft (the coverage drafts). */
  private get winningLike(): boolean {
    return this.policy === "winning" || this.policy === "winning-swap"
      || this.policy === "oracle-strength" || this.policy === "winning-coverage"
      || this.policy === "winning-combined" || this.policy === "coverage-fight";
  }

  /** "winning-coverage"/"winning-combined"/"coverage-fight": the draft is planned by `planCoverageDraft`, not the constructor's random shuffle. */
  private get coverageDraftLike(): boolean {
    return this.policy === "winning-coverage" || this.policy === "winning-combined"
      || this.policy === "coverage-fight";
  }

  constructor(
    rng: Rng,
    log: ActionLog,
    policy: PlayerPolicy,
    coverage: SoakCoverageCollector | null = null,
    pressRng: Rng = rng.derive(SOAK_PRESS_RNG_SALT),
  ) {
    this.rng = rng;
    this.pressRng = pressRng;
    this.log = log;
    this.policy = policy;
    this.coverage = coverage;
    // Random 3 distinct rental slots, random order (vanilla: first three).
    const slots = [0, 1, 2, 3, 4, 5];
    if (this.explores) {
      for (let i = slots.length - 1; i > 0; i -= 1) {
        const j = rng.int(i + 1);
        [slots[i], slots[j]] = [slots[j]!, slots[i]!];
      }
    }
    this.draft = {
      picks: slots.slice(0, 3),
      rented: 0,
      peekedSummary: this.explores && rng.chance(0.25),
    };
  }

  /** soak111: one decision-stream float per (postwin menu, cursor position) -- see `postwinRoll`. */
  private stickyPostwinRoll(state: EngineState, menu: string, cursor: number): number {
    const roundId = state.factoryRoundBattleOrchestrator?.config.id ?? "";
    const key = `${menu}:${roundId}:${this.battle}:${this.turn}:${cursor}`;
    if (this.postwinRoll?.key !== key) this.postwinRoll = { key, value: this.rng.float() };
    return this.postwinRoll.value;
  }

  private press(button: GbaButton, gapMax = 10): ReadonlySet<GbaButton> {
    this.cooldown = this.pressRng.gap(gapMax);
    return new Set([button]);
  }

  private note(state: EngineState, what: string): void {
    this.log.push(state.frame, this.battle, this.turn, what);
  }

  /** "oracle-strength" only: log + count one fight-slot fallback to "winning"'s own scorer. */
  private noteOracleStrengthFallback(state: EngineState, reason: string): void {
    this.oracleStrengthFallbacks += 1;
    this.note(state, `oracle-strength fallback: ${reason}`);
  }

  /** Decide this frame's held buttons. */
  decide(state: EngineState): ReadonlySet<GbaButton> {
    this.trackProgress(state);
    if (!state.summaryScreen.isOpen) this.summaryPresses = 0;
    if (this.cooldown > 0) {
      this.cooldown -= 1;
      return NO_BUTTONS;
    }
    const orch = state.factoryRoundBattleOrchestrator;

    // Order mirrors tick()'s own ownership chain.
    if (orch?.battleResolutionPresentation) return this.onResolution(state);
    if (orch?.battleStartIntro) return this.onIntro(state);
    if (orch?.battleCommandPresentation) return this.onCommand(state);
    if (state.lobbyFreeRoam) return NO_BUTTONS; // terminal — runner stops us
    if (state.factoryTerminal) return this.onTerminal(state);
    if (state.postwin) return this.onPostwin(state);
    if (state.battleScene) return this.pressAdvance(state, "battleScene A");
    if (state.battleRoom) return this.pressAdvance(state, "battleRoom A");
    if (state.prebattleRoom) return this.pressAdvance(state, "prebattleRoom A");
    if (state.summaryScreen.isOpen || state.summaryScreen.transition) {
      return this.onSummary(state);
    }
    return this.onDraft(state);
  }

  /** Which surface currently owns input (for HANG reports). */
  surface(state: EngineState): string {
    const orch = state.factoryRoundBattleOrchestrator;
    if (orch?.battleResolutionPresentation) {
      return `resolution:${orch.battleResolutionPresentation.lifecycle.phase}`;
    }
    if (orch?.battleStartIntro) return "battleStartIntro";
    if (orch?.battleCommandPresentation) {
      return `command:${orch.battleCommandPresentation.lifecycle.phase}`;
    }
    if (state.lobbyFreeRoam) return "lobbyFreeRoam";
    if (state.factoryTerminal) return "factoryTerminal";
    if (state.factorySwap) return `factorySwap:${state.factorySwap.controller.phase}`;
    if (state.postwin) return `postwin:page${state.postwin.dialoguePage}`;
    if (state.battleScene) return "battleScene";
    if (state.battleRoom) return `battleRoom:${state.battleRoom.phase}`;
    if (state.prebattleRoom) return `prebattleRoom:${state.prebattleRoom.phase}`;
    if (state.summaryScreen.isOpen) return "summaryScreen";
    return "draftScreen";
  }

  private trackProgress(state: EngineState): void {
    const orch = state.factoryRoundBattleOrchestrator;
    if (!orch) return;
    const battleIndex = orch.round.rules.battleIndex;
    const roundId = orch.config.id;
    if (battleIndex !== this.lastBattleIndex || roundId !== this.lastRoundId) {
      this.lastBattleIndex = battleIndex;
      this.lastRoundId = roundId;
      this.turnsThisBattle = 0;
      this.turn = 0;
      this.switchedAgainstOpponentIndices.clear();
    }
    this.battle = battleIndex + 1;
    const presentation = orch.battleCommandPresentation;
    if (presentation) {
      const key = `${battleIndex}:${presentation.request.requestId}`;
      if (key !== this.lastCommandKey) {
        this.lastCommandKey = key;
        this.turnsThisBattle += 1;
        this.turn = this.turnsThisBattle;
      }
    }
  }

  /** True once battle 1's first live action menu is interactive. */
  reachedFirstActionMenu(state: EngineState): boolean {
    const presentation =
      state.factoryRoundBattleOrchestrator?.battleCommandPresentation;
    return presentation?.lifecycle.phase === "action-menu";
  }

  private pressAdvance(state: EngineState, label: string): ReadonlySet<GbaButton> {
    // Message-advance mash with jittered gaps; occasionally B (harmless
    // everywhere A-advance surfaces live, and it exercises B paths).
    const useB = this.explores && this.pressRng.chance(0.06);
    this.note(state, `${label}${useB ? " (B)" : ""}`);
    return this.press(useB ? "B" : "A", 22);
  }

  // -- draft ----------------------------------------------------------------

  private onDraft(state: EngineState): ReadonlySet<GbaButton> {
    const draft = state.draftScreen;
    if (this.coverageDraftLike) this.planCoverageDraft(state, draft);
    const reveal = draft.confirmReveal;
    if (reveal) {
      if (reveal.phase !== "shown") return NO_BUTTONS;
      // YES/NO confirm for the 3 rentals. Mostly YES; a rare NO exercises the
      // decline/un-reveal path (drops the 3rd pick, which we then re-rent).
      if (draft.yesNoCursorPos === 0) {
        if (this.explores && this.rng.chance(0.06)) {
          this.note(state, "draft confirm: toggle to NO");
          return this.press("DOWN", 8);
        }
        this.note(state, "draft confirm: YES");
        return this.press("A", 8);
      }
      this.note(state, "draft confirm: A on NO (decline)");
      this.draft.rented = 2; // the 3rd pick is dropped; re-rent below
      // The coverage drafts re-rent the SAME third slot their score chose
      // (the trio is the policy); the roll is still drawn so their RNG
      // stream stays aligned with "winning"'s at every later decision.
      const rerolledThirdPick = this.rng.int(6);
      if (!this.coverageDraftLike) this.draft.picks[2] = rerolledThirdPick;
      return this.press("A", 8);
    }
    if (draft.mode === "cursor") {
      if (!isCursorInputReady(draft.monPic)) return NO_BUTTONS;
      // Find the next planned pick that is not yet rented.
      const target = this.nextDraftTarget(draft.selectedIds);
      if (target === null) return NO_BUTTONS; // waiting for confirm reveal
      if (draft.cursorPos !== target) {
        const right = (target - draft.cursorPos + 6) % 6;
        const left = (draft.cursorPos - target + 6) % 6;
        return this.press(right <= left ? "RIGHT" : "LEFT", 6);
      }
      this.note(state, `draft: open menu on slot ${target}`);
      return this.press("A", 8);
    }
    // Menu mode: steer to RENT (or peek SUMMARY once).
    if (!isMonPicInputReady(draft.monPic)) return NO_BUTTONS;
    // sfa214: "full" may peek at the SUMMARY on any menu visit (the other
    // policies keep their single 25 % x 50 % peek and its draws).
    const wantSummary = this.policy === "full"
      ? this.rng.chance(0.3)
      : this.draft.peekedSummary === true
        && this.draft.rented === 0
        && this.rng.chance(0.5);
    const target = wantSummary ? MENU_OPTION_SUMMARY : MENU_OPTION_RENT;
    if (draft.menuCursorPos !== target) {
      return this.press(draft.menuCursorPos < target ? "DOWN" : "UP", 6);
    }
    if (wantSummary) {
      this.draft.peekedSummary = false;
      this.note(state, "draft: open SUMMARY");
      return this.press("A", 8);
    }
    this.note(state, `draft: RENT slot ${draft.cursorPos}`);
    this.draft.rented += 1;
    return this.press("A", 10);
  }

  /**
   * "winning-coverage"/"winning-combined" only: score the six offered
   * rentals and replace the constructor's random plan with the scored trio
   * (pure coverage, or coverage above the strength floor). Keyed on the
   * offer itself (species + personality of all six), so a NEW round's draft
   * re-scores while every frame of the SAME draft reuses the decision --
   * including after a NO decline, which re-rents the same third pick.
   */
  private planCoverageDraft(state: EngineState, draft: EngineState["draftScreen"]): void {
    if (draft.rentals.length < 3) return;
    const key = draft.rentals.map((rental) => `${rental.species}#${rental.personality}`).join("|");
    if (key === this.coverageDraftOfferKey) return;
    this.coverageDraftOfferKey = key;
    const combined = this.policy === "winning-combined";
    const chosen = combined
      ? pickCombinedDraftPicks(draft.rentals)
      : pickCoverageDraftPicks(draft.rentals);
    // `draft.rented` is deliberately NOT reset: it gates only the one-shot
    // SUMMARY peek, and resetting it would draw an extra `rng.chance` on a
    // later round's draft that "winning" never draws.
    this.draft.picks = [...chosen.picks];
    const floorSuffix = combined ? ` floor ${(chosen as CombinedDraftPick).floor}` : "";
    this.note(
      state,
      `draft: ${combined ? "combined" : "coverage"} trio ${chosen.picks.join(",")} `
        + `(off ${chosen.score.offensive} def ${chosen.score.defensive} bst ${chosen.score.bst}${floorSuffix}) `
        + chosen.picks.map((slot) => draft.rentals[slot]!.species).join(" "),
    );
  }

  private nextDraftTarget(selectedIds: readonly number[]): number | null {
    const selectedCount = selectedIds.filter((id) => id !== 0).length;
    if (selectedCount >= 3) return null;
    for (const pick of this.draft.picks) {
      if (selectedIds[pick] === 0) return pick;
    }
    // Plan exhausted (e.g. duplicate after a decline): pick a fresh slot.
    for (let slot = 0; slot < 6; slot += 1) {
      if (selectedIds[slot] === 0) {
        this.draft.picks.push(slot);
        return slot;
      }
    }
    return null;
  }

  /**
   * sfa214: "full" renders every frame while the Summary is open, so the
   * front animation and every move-select detail state are drawn (the
   * default cadence rendered 1 frame in 8 there). Rendering never feeds
   * tick, so trajectories are unchanged; other policies keep their cadence.
   */
  rendersEveryFrame(state: EngineState): boolean {
    return this.policy === "full" && (state.summaryScreen.isOpen || state.summaryScreen.transition !== null);
  }

  /** sfa214: "full"'s presses on the current Summary visit. */
  private summaryPresses = 0;

  private onSummary(state: EngineState): ReadonlySet<GbaButton> {
    if (state.summaryScreen.transition || state.summaryScreen.pageTransition
      || state.summaryScreen.monTransition) return NO_BUTTONS;
    if (this.policy === "full") return this.onFullSummary(state);
    // Wander a little, then leave with B.
    if (this.explores && this.rng.chance(0.3)) {
      return this.press(this.rng.pick(["UP", "DOWN", "LEFT", "RIGHT"] as const), 12);
    }
    this.note(state, "summary: exit (B)");
    return this.press("B", 12);
  }

  /**
   * sfa214: "full" explores the Summary like a player: pages (LEFT/RIGHT),
   * other rentals (UP/DOWN, which replaces the front sprite and restarts its
   * animation), and the Battle / Contest Moves move-select mode (A) with the
   * cursor over every row including CANCEL, closed with A or B. Only "full"
   * reaches this, so the other policies' decision streams are untouched.
   */
  private onFullSummary(state: EngineState): ReadonlySet<GbaButton> {
    const summary = state.summaryScreen;
    const select = summary.moveSelect;
    this.summaryPresses += 1;
    if (select) {
      if (select.phase === "closing") return NO_BUTTONS;
      const roll = this.rng.float();
      if (roll < 0.75 && this.summaryPresses < 60) {
        const button = this.rng.pick(["UP", "DOWN"] as const);
        this.note(state, `summary move-select: ${button} (row ${select.selectedMoveIndex})`);
        return this.press(button, 8);
      }
      const button = this.rng.chance(0.5) ? "A" : "B";
      this.note(state, `summary move-select: close (${button}) on row ${select.selectedMoveIndex}`);
      return this.press(button, 8);
    }
    const roll = this.rng.float();
    if (this.summaryPresses >= 60 || (roll < 0.10 && this.summaryPresses > 3)) {
      this.summaryPresses = 0;
      this.note(state, "summary: exit (B)");
      return this.press("B", 12);
    }
    const movesPage = summary.page === "battleMoves" || summary.page === "contestMoves";
    if (movesPage && roll < 0.55) {
      this.note(state, `summary: A on ${summary.page}`);
      return this.press("A", 10);
    }
    if (roll < (movesPage ? 0.70 : 0.75)) {
      // Lean right so the Moves pages are reached from Info.
      const button = this.rng.chance(movesPage ? 0.5 : 0.8) ? "RIGHT" : "LEFT";
      this.note(state, `summary: ${button} on ${summary.page}`);
      return this.press(button, 12);
    }
    // Mon change: hold long enough for the replacement's front animation.
    const button = this.rng.pick(["UP", "DOWN"] as const);
    this.note(state, `summary: ${button} (mon) on ${summary.page}`);
    return this.press(button, 60);
  }

  // -- battle start intro ---------------------------------------------------

  private onIntro(state: EngineState): ReadonlySet<GbaButton> {
    return this.pressAdvance(state, "intro A");
  }

  // -- live command presentation ---------------------------------------------

  private onCommand(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const presentation = orch.battleCommandPresentation!;
    if (orch.battlePartySelect !== null) return this.onVoluntaryParty(state);

    const phase = presentation.lifecycle.phase;
    if (phase === "rejection-message") {
      // PAUSE_UNTIL_PRESS gate; early presses are dropped, so just mash.
      return this.pressAdvance(state, "rejection dismiss");
    }
    if (phase === "action-menu") {
      if (this.actionIntent === null || this.actionIntent.key !== this.lastCommandKey) {
        // FIGHT 0.60 / POKéMON 0.22 / BAG 0.06 / RUN 0.06 / re-roll wander 0.06
        const roll = this.rng.float();
        let target = !this.explores
          ? 0
          : roll < 0.60 ? 0 : roll < 0.82 ? 2 : roll < 0.88 ? 1 : roll < 0.94 ? 3 : this.rng.int(4);
        // "winning"/"winning-swap" only (M-B step 2 part C): voluntarily
        // switch out of a walled matchup instead of the rolled action. The
        // roll above is still drawn (shared with "full") so its RNG stream
        // is untouched; only the decision it feeds is overridden, like the
        // swap-decline precedent (part B, rung 1).
        this.pendingSwitchRow = this.winningLike
          ? this.computeSwitchRow(orch, presentation)
          : null;
        if (this.pendingSwitchRow !== null) target = 2;
        this.actionIntent = { key: this.lastCommandKey, target, futile: 0 };
        this.note(
          state,
          this.pendingSwitchRow !== null
            ? `action menu intent: POKEMON (winning switch: row ${this.pendingSwitchRow})`
            : `action menu intent: ${["FIGHT", "BAG", "POKEMON", "RUN"][target]}`,
        );
      }
      const intent = this.actionIntent;
      const cursor = presentation.actionCursor;
      if ((cursor & 1) !== (intent.target & 1)) {
        return this.press((intent.target & 1) !== 0 ? "RIGHT" : "LEFT", 8);
      }
      if ((cursor & 2) !== (intent.target & 2)) {
        return this.press((intent.target & 2) !== 0 ? "DOWN" : "UP", 8);
      }
      if (intent.target === 1 || intent.target === 3) {
        // BAG/RUN are real presses the UI ignores; press once, then resample.
        intent.futile += 1;
        if (intent.futile >= 2) {
          this.actionIntent = null;
          this.note(state, "action menu: BAG/RUN noop, resample");
        }
        return this.press("A", 10);
      }
      this.note(state, intent.target === 0 ? "action: FIGHT" : "action: POKEMON");
      this.actionIntent = null;
      return this.press("A", 8);
    }
    if (phase === "fight-menu") {
      const key = `${this.lastCommandKey}:fight`;
      if (this.fightIntent === null || this.fightIntent.key !== key) {
        const active = orch.battle?.rules.rulesContext.battlers[0];
        const firstLegal = Math.max(
          0,
          presentation.legalMoveBySlot.findIndex((slot) => slot !== null),
        );
        // "winning" only: type-effectiveness-aware LEGAL move (see
        // pickWinningFightSlot); falls back to highest-power/lowest-slot.
        const bestEffectivenessSlot = (): number => {
          const battlers = orch.battle?.rules.rulesContext.battlers;
          // Stat stages are wired in for the winning-like policies only
          // (ISSUES #125's lever); the oracle-strength fallback path
          // through this same helper stays on the stages-omitted branch,
          // i.e. today's unchanged fallback rule.
          const attacker = battlers?.[0];
          const defender = battlers?.[1];
          return pickWinningFightSlot({
            legalSlots: presentation.legalMoveBySlot.map((slot) => slot !== null),
            moveIds: presentation.field.player.moveIds,
            attackerTypes: attacker?.types ?? DEFAULT_TYPES,
            defenderTypes: defender?.types ?? DEFAULT_TYPES,
            ...(this.winningLike && attacker && defender
              ? {
                attackerStatStages: oracleStrengthStatStages(attacker),
                defenderStatStages: oracleStrengthStatStages(defender),
              }
              : {}),
          });
        };
        // "oracle-strength" only: delegate the slot to the engine's own
        // Factory AI scorer running for the player's side (mask 7), on a
        // cursor drawn from the soak's own seeded stream so the live
        // battle's RNG is untouched. Falls back to "winning"'s own choice
        // (and logs why) when the scorer can't answer.
        const oracleStrengthSlot = (): number => {
          const rulesContext = orch.battle?.rules.rulesContext;
          const rngValue = this.rng.int(0x1_0000_0000);
          if (!rulesContext) {
            this.noteOracleStrengthFallback(state, "no live rules context");
            return bestEffectivenessSlot();
          }
          const pick = pickOracleStrengthFightSlot({
            rulesContext,
            legalSlots: presentation.legalMoveBySlot.map((slot) => slot !== null),
            battleTurnCount: this.turnsThisBattle,
            rngValue,
          });
          if (pick.slot === null) {
            this.noteOracleStrengthFallback(state, pick.fallbackReason ?? "unknown");
            return bestEffectivenessSlot();
          }
          return pick.slot;
        };
        // "coverage-fight" only: the least-used LEGAL move of this run (the
        // same `legalMoveBySlot` legality every other policy reads), so the
        // whole drafted set gets spent instead of only its best slot.
        const coverageFightSlot = (): number => pickCoverageFightSlot({
          legalSlots: presentation.legalMoveBySlot.map((slot) => slot !== null),
          moveIds: presentation.field.player.moveIds,
          useCountByMoveId: this.fightUseCountByMoveId,
        });
        const target = this.policy === "strong-route"
          && active?.partyIndex === 1
          && active.isFirstTurn === 2
          && presentation.legalMoveBySlot[3] !== null
          ? 3
          : this.policy === "vanilla" || this.policy === "strong-route"
            ? firstLegal
            : this.policy === "oracle-strength"
              ? oracleStrengthSlot()
              : this.policy === "coverage-fight"
                ? coverageFightSlot()
                : this.winningLike
                  ? bestEffectivenessSlot()
                  : this.rng.int(4);
        this.fightIntent = {
          key,
          target,
          cancel: this.policy === "full" && this.rng.chance(0.10),
          futile: 0,
        };
        // A slot-indexed surface cannot say "this is Struggle": when every
        // slot is unusable, source keeps the banked chosenMovePositions slot
        // and swaps the MOVE for MOVE_STRUGGLE (battle_util.c:99-106,
        // :1125-1140), so the slot still reads as its exhausted move. Name it
        // here or the transcript reports N uses of a move with far less PP
        // than N (ISSUES #123 read 456 uses of a 15-PP DOUBLE TEAM).
        const forcedStruggle = orch.battle
          ? battlerUsesForcedStruggle(orch.battle.rules.rulesContext, 0)
          : false;
        const slotMove = presentation.field.player.moveIds[this.fightIntent.target];
        this.note(state, this.fightIntent.cancel
          ? "fight menu intent: cancel (B)"
          : `fight menu intent: slot ${this.fightIntent.target} (move ${
            forcedStruggle ? "165 STRUGGLE (all slots unusable)" : slotMove
          })`);
      }
      const intent = this.fightIntent;
      if (intent.cancel) {
        this.fightIntent = null;
        return this.press("B", 8);
      }
      const cursor = presentation.fightCursor;
      if ((cursor & 1) !== (intent.target & 1)) {
        return this.press((intent.target & 1) !== 0 ? "RIGHT" : "LEFT", 8);
      }
      if ((cursor & 2) !== (intent.target & 2)) {
        return this.press((intent.target & 2) !== 0 ? "DOWN" : "UP", 8);
      }
      const legal = presentation.legalMoveBySlot[intent.target] !== null;
      const rejected = presentation.rejectionReasonBySlot[intent.target] !== null;
      if (!legal && !rejected) {
        // Dead slot (e.g. empty moveslot): the press does nothing. Try it
        // once for realism, then resample.
        intent.futile += 1;
        if (intent.futile >= 2) {
          this.fightIntent = null;
          this.note(state, `fight menu: slot ${intent.target} dead, resample`);
        }
        return this.press("A", 8);
      }
      this.note(state, `fight: confirm slot ${intent.target}${rejected ? " (will reject)" : ""}`);
      if (!rejected && (this.coverage !== null || this.policy === "coverage-fight")) {
        // The confirmed slot at commit time, with the same forced-Struggle
        // correction the intent note above uses: a slot-indexed surface
        // cannot say "this is Struggle" (battle_util.c:99-106 keeps the
        // banked slot and swaps the MOVE), so name it here too. Pure reads
        // (no RNG draw), so an ordinary run's walk is untouched.
        const struggling = orch.battle
          ? battlerUsesForcedStruggle(orch.battle.rules.rulesContext, 0)
          : false;
        const committedMoveId = struggling
          ? 165
          : presentation.field.player.moveIds[intent.target] ?? 0;
        this.coverage?.recordPlayerFightCommit(committedMoveId);
        if (this.policy === "coverage-fight" && committedMoveId !== 0) {
          this.fightUseCountByMoveId.set(
            committedMoveId,
            (this.fightUseCountByMoveId.get(committedMoveId) ?? 0) + 1,
          );
        }
      }
      this.fightIntent = null;
      return this.press("A", 8);
    }
    // action-enter / fight-opening / fight-closing / rejection-reopen /
    // party-handoff pre-selector / submitting: presentation-owned, no input.
    return NO_BUTTONS;
  }

  /**
   * "winning" only (M-B step 2 part C): decides whether to voluntarily
   * switch out of a walled matchup, reading only what a real player sees --
   * the active's own legal moves, the opponent's live types, and the
   * bench's known species/moves/PP/HP. Marks the ping-pong guard and bumps
   * `switchCount` when it commits to a row. ISSUES #125 lever 2: also
   * detects the forced-Struggle state (every legal slot unusable, same test
   * the fight-menu phase already uses to name the Struggle move) and passes
   * it through so `pickWinningSwitchRow` can switch on ANY usable damaging
   * bench move instead of requiring a super-effective, >=50%-HP answer.
   * ISSUES #125 lever 2 regression fix: checks `isPlayerVoluntarySwitchTrapped`
   * first and returns null unconditionally when trapped, since the party
   * screen (`legalCommandDecisions`) never exposes a switch row in that case
   * regardless of forced Struggle -- see that helper's docstring.
   */
  private computeSwitchRow(
    orch: NonNullable<EngineState["factoryRoundBattleOrchestrator"]>,
    presentation: NonNullable<
      NonNullable<EngineState["factoryRoundBattleOrchestrator"]>["battleCommandPresentation"]
    >,
  ): 0 | 1 | 2 | null {
    const battle = orch.battle;
    if (!battle) return null;
    if (isPlayerVoluntarySwitchTrapped(battle.rules.rulesContext)) return null;
    const battlers = battle.rules.rulesContext.battlers;
    const activePartyIndex = battlers[0]?.partyIndex;
    const opponentPartyIndex = battlers[1]?.partyIndex;
    if (activePartyIndex === undefined || opponentPartyIndex === undefined) return null;
    const defenderTypes = battlers[1]?.types ?? DEFAULT_TYPES;
    const party = battle.rules.rulesContext.party.player;
    let healthyCount = 0;
    const bench: WinningSwitchBenchCandidate[] = [];
    for (let partyIndex = 0; partyIndex < 3; partyIndex += 1) {
      const member = party[partyIndex];
      if (!member || member.hp <= 0) continue;
      healthyCount += 1;
      if (partyIndex === activePartyIndex) continue;
      bench.push({
        row: partyIndex as 0 | 1 | 2,
        fainted: false,
        active: false,
        moveIds: member.moves,
        movePp: member.pp,
        types: typesForSpecies(member.species),
        hp: member.hp,
        maxHp: member.maxHP,
      });
    }
    const row = pickWinningSwitchRow({
      activeMoveIds: presentation.field.player.moveIds,
      activeLegalSlots: presentation.legalMoveBySlot.map((slot) => slot !== null),
      defenderTypes,
      bench,
      healthyCount,
      alreadySwitchedAgainstThisOpponent: this.switchedAgainstOpponentIndices.has(opponentPartyIndex),
      forcedStruggle: battlerUsesForcedStruggle(battle.rules.rulesContext, 0),
    });
    if (row !== null) {
      this.switchedAgainstOpponentIndices.add(opponentPartyIndex);
      this.switchCount += 1;
    }
    return row;
  }

  private onVoluntaryParty(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const selector = orch.battlePartySelect!;
    if (selector.outcome !== null) return NO_BUTTONS;
    if (selector.message !== null) {
      return this.pressAdvance(state, "party message dismiss");
    }
    if (this.partyIntent === null || this.partyIntent.key !== this.lastCommandKey) {
      // Any row the UI can cursor to, including fainted rows (their SEND OUT
      // shows the no-energy message), plus cancel. "winning"/"winning-swap"
      // (M-B step 2 part C): send out the action-menu heuristic's committed
      // row when one was set (a genuine walled-matchup switch), else decline
      // like before -- forced switches never route through here. Other
      // policies keep their random roll.
      const rawTarget: 0 | 1 | 2 | "cancel" = this.winningLike
        ? (this.pendingSwitchRow ?? "cancel")
        : this.rng.float() < 0.25 ? "cancel" : ([0, 1, 2] as const)[this.rng.int(3)]!;
      this.pendingSwitchRow = null;
      // "winning"/"winning-swap" only: the UI enforces legality, so if the
      // selector somehow rejects the heuristic's committed row (e.g. it's
      // the active), fall back to cancel rather than press an illegal
      // target. "full"/"vanilla" keep their prior random-roll behaviour
      // verbatim (including rolling onto a fainted/active row, whose own
      // no-energy message the generic press sequence below already
      // handles) -- untouched by this guard.
      const target = this.winningLike && rawTarget !== "cancel" && !selector.rows[rawTarget]!.legal
        ? "cancel"
        : rawTarget;
      this.partyIntent = { key: this.lastCommandKey, target };
      this.note(state, `party intent: ${target === "cancel" ? "cancel" : `row ${target}`}`);
    }
    const intent = this.partyIntent;
    if (selector.submenuOpen) {
      if (intent.target === "cancel") {
        this.partyIntent = null;
        return this.press("B", 8);
      }
      this.note(state, `party: confirm row ${selector.cursor}`);
      this.partyIntent = null;
      return this.press("A", 8);
    }
    if (selector.cursor !== intent.target) {
      // DOWN cycles 0 -> 1 -> 2 -> cancel -> 0.
      return this.press("DOWN", 6);
    }
    if (intent.target === "cancel") {
      this.partyIntent = null;
      this.note(state, "party: cancel");
      return this.press("A", 8);
    }
    return this.press("A", 8); // open SEND OUT submenu
  }

  // -- resolution presentation (message advance + forced switches) -----------

  private onResolution(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const resolution = orch.battleResolutionPresentation!;
    if (
      resolution.lifecycle.phase === "forced-party-handoff"
      && orch.battleForcedPartySelect !== null
    ) {
      return this.onForcedParty(state);
    }
    return this.pressAdvance(state, "resolution advance");
  }

  private onForcedParty(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const selector = orch.battleForcedPartySelect!;
    if (selector.sendOutElapsed !== null) return NO_BUTTONS;
    // soak111: wait out the entry fade instead of mashing into it.
    // advancePartySelect drops every key until `elapsed + 1` reaches
    // PARTY_LIST_INPUT_ELAPSED, so those presses were always no-ops -- but
    // each one re-rolled the decision stream's 0.3 "A on fainted slot" draw,
    // and how many landed in the fade depended on press timing, i.e. on the
    // preceding presentation's length.
    if (selector.elapsed + 1 < PARTY_LIST_INPUT_ELAPSED) return NO_BUTTONS;
    if (selector.message !== null) {
      return this.pressAdvance(state, "forced-party message dismiss");
    }
    // The forced selector's cursor model: default rests on the fainted slot
    // (A there shows the no-energy message), DOWN moves onto the legal pick.
    if (selector.cursor === "onix") {
      if (this.explores && this.rng.chance(0.3)) {
        this.note(state, "forced party: A on fainted slot");
        return this.press("A", 10);
      }
      this.note(state, "forced party: DOWN to legal slot");
      return this.press("DOWN", 8);
    }
    this.note(state, "forced party: confirm send-out");
    return this.press("A", 10);
  }

  // -- postwin / swap / terminal ---------------------------------------------

  private onPostwin(state: EngineState): ReadonlySet<GbaButton> {
    const postwin = state.postwin!;
    if (state.factorySwap) return this.onFactorySwap(state);
    // "winning-swap" only: clear the last swap screen's plan once we're back
    // in ordinary postwin flow, so the next swap occurrence (a later battle)
    // rebuilds it from that battle's own roster instead of reusing this one's.
    if (this.policy === "winning-swap" && this.swapPlan !== null) this.swapPlan = null;
    if (state.battleRoom || state.prebattleRoom) {
      return this.pressAdvance(state, "postwin room advance");
    }
    // Walk-up build step A, Brief 2: brain's call-scene boxes (phone SE,
    // attendant move, 3-page boss message) advance the same generic way
    // every other postwin message box does (the fallback `pressAdvance`
    // below already covers it) -- this branch exists only so soak logs
    // name the surface explicitly instead of falling through unlabeled.
    if (
      postwin.frontierBrain
      && postwin.callScenePage !== 0
      && postwin.callSceneDismissElapsed === null
    ) {
      return this.pressAdvance(state, `postwin brain call-scene box ${postwin.callScenePage}`);
    }
    // RECORD/RETIRE YES/NO question.
    if (
      postwin.question !== null
      && postwin.questionDismissElapsed === null
      && postwin.questionYesElapsed === null
    ) {
      const questionRoll = this.explores
        ? this.stickyPostwinRoll(state, `question-${postwin.question.kind}`, postwin.questionCursorPos)
        : 1;
      const wantYes = !this.explores
        ? false
        : postwin.question.kind === "retire"
          ? questionRoll < 0.15
          : questionRoll < 0.5;
      const targetPos = wantYes ? 0 : 1;
      if (postwin.questionCursorPos !== targetPos) {
        return this.press(targetPos === 0 ? "UP" : "DOWN", 8);
      }
      this.note(state, `postwin ${postwin.question.kind}: ${wantYes ? "YES" : "NO"}`);
      return this.press("A", 10);
    }
    // Swap offer YES/NO menu (dialogue page 4) -- shared for both routes
    // (brain's short path lands here directly from dialoguePage 1). Checked
    // before the continuation branch below: `acceptPostwinContinuation`
    // (src/engine/postwin.ts:1558-1573) never clears `continuationCursorPos`
    // once GO ON is confirmed, only advances `dialoguePage` away from 0, so
    // without an explicit page gate the continuation branch's condition
    // would still read true here and answer this menu instead (ISSUES #99).
    if (
      postwin.dialoguePage === 4
      && postwin.swapDeclineElapsed === null
      && postwin.swapCursorPos !== null
    ) {
      // "winning" (M-B step 2 part B, rung 1): always decline -- a rental
      // it already chose and has played with is worth keeping over an
      // unscouted swap. "winning-swap" (opt-in coverage instrument) is the
      // opposite: always accept, then pick deliberately on the swap screen
      // itself (see onWinningFactorySwap). Every OTHER winning-like policy
      // declines exactly like "winning" -- keyed on `winningLike`, not a
      // per-policy list, because "winning-coverage" originally missed this
      // list and 50/50-accepted every offer against its own spec (the same
      // trap class as ISSUES #99; see the Tier-1 decline pin). The roll is
      // still drawn (this.explores covers every exploring policy alike) so
      // "full"'s own draw here is untouched; only the decision it feeds is
      // overridden.
      const rolledAccept = this.explores
        && this.stickyPostwinRoll(state, "swap-offer", postwin.swapCursorPos) < 0.5;
      const accept = this.policy === "winning-swap"
        ? true
        : this.winningLike
          ? false
          : rolledAccept;
      const targetPos = accept ? 0 : 1;
      if (postwin.swapCursorPos !== targetPos) {
        return this.press(targetPos === 0 ? "UP" : "DOWN", 8);
      }
      this.note(state, `swap offer: ${accept ? "YES" : "NO"}`);
      return this.press("A", 10);
    }
    // Walk-up build step A, Brief 2: brain's AskSwapBeforeHead one-liner
    // (dialoguePage 1) has no scouting pages to cycle through -- it advances
    // generically (the fallback `pressAdvance` below) then jumps straight to
    // the swap prompt (dialoguePage 4, handled above).
    if (postwin.frontierBrain && postwin.dialoguePage === 1) {
      return this.pressAdvance(state, "postwin brain one-liner (AskSwapBeforeHead)");
    }
    // Continuation menu (GO ON / RECORD / REST / RETIRE) -- shared machinery
    // for both the ordinary AskReadyForOpponent menu and brain's own
    // AskReadyForHead (walk-up build step A, Brief 1): the same GO ON/
    // RECORD/REST/RETIRE random exploration already exercises brain's menu
    // too whenever continuationCursorPos is live, no separate branch needed.
    // Gated on `dialoguePage === 0` -- the engine's own live-menu condition
    // (`acceptPostwinContinuation`'s guard) -- so this branch stops matching
    // once GO ON is confirmed and later pages (incl. the swap offer above)
    // take over; see the comment on that branch (ISSUES #99).
    if (
      postwin.question === null
      && postwin.dialoguePage === 0
      && postwin.continuationCursorPos !== null
    ) {
      const roll = this.stickyPostwinRoll(
        state,
        `continuation-${postwin.frontierBrain ? "brain" : "ordinary"}`,
        postwin.continuationCursorPos,
      );
      const target = !this.explores
        ? 0
        : roll < 0.85 ? 0 : roll < 0.92 ? 1 : roll < 0.96 ? 2 : 3;
      if (postwin.continuationCursorPos !== target) {
        return this.press(postwin.continuationCursorPos < target ? "DOWN" : "UP", 6);
      }
      this.note(
        state,
        `postwin ${postwin.frontierBrain ? "brain " : ""}continuation: `
          + `${["GO ON", "RECORD", "REST", "RETIRE"][target]}`,
      );
      // RECORD (stub-only) and REST (unselectable) are deliberate no-ops (user decisions 2026-08-05): their A
      // press changes nothing, so the sticky roll above (keyed by menu + cursor) would never be re-drawn and
      // the driver pressed A forever (full seed 25 on REST, winning-swap seed 17 on RECORD: HANG @
      // postwin:page0, 2026-10-11 wind-down). Re-draw after every A on them: exactly one decision draw per
      // such press, independent of press timing (the pre-soak111 per-press policy for these no-op choices).
      // RETIRE opens its question, whose roll replaces the single cached roll, so returning re-draws anyway.
      if (target === 1 || target === 2) this.postwinRoll = null;
      return this.press("A", 12);
    }
    return this.pressAdvance(state, "postwin advance");
  }

  private onFactorySwap(state: EngineState): ReadonlySet<GbaButton> {
    if (this.policy === "winning-swap") return this.onWinningFactorySwap(state);
    // The swap controller enforces legality internally, so random legal-button
    // exploration (a real player's inputs) covers pickers, quit prompts, the
    // duplicate-species rejection, and the summary detour.
    // soak111: press only when the press can land -- the controller drops
    // every key while `!inputReady` (handleFactorySwapInput) and the summary
    // detour drops keys during its transitions -- because each press below
    // is a decision-stream draw, and how many presses fell into those dead
    // windows depended on press timing (presentation length).
    const summary = state.summaryScreen;
    const ready = summary.isOpen || summary.transition
      ? summary.isOpen && !summary.transition && !summary.pageTransition && !summary.monTransition
      : state.factorySwap!.controller.inputReady;
    if (!ready) return NO_BUTTONS;
    const roll = this.rng.float();
    const button: GbaButton = roll < 0.40
      ? "A"
      : roll < 0.52
        ? "B"
        : this.rng.pick(["UP", "DOWN", "LEFT", "RIGHT"] as const);
    this.note(state, `swap screen: ${button} (${state.factorySwap!.controller.phase})`);
    return this.press(button, 14);
  }

  /**
   * "winning-swap" only: navigates real button presses through the swap
   * screen's own state machine (src/engine/factorySwap.ts) to swap out the
   * player's lowest-scoring rental for the defeated opponent's
   * highest-scoring mon that outscores it (`buildWinningSwapPlan`), retrying
   * the next-best opponent candidate whenever the engine's own
   * duplicate-species rejection (`factorySwapAlreadyHasSpecies`) blocks one,
   * and declining outright (quit prompt, KEEP CURRENT POKéMON) once the plan
   * has no remaining candidate. Every step is a legal button a real player
   * could press -- the engine enforces its own legality (cursor bounds,
   * duplicate species) exactly as it does for the generic exploring policies.
   */
  private onWinningFactorySwap(state: EngineState): ReadonlySet<GbaButton> {
    const controller = state.factorySwap!.controller;
    if (this.swapPlan === null) {
      this.swapPlan = buildWinningSwapPlan(controller.rentalMons);
      this.note(
        state,
        `swap screen (winning): plan worst row ${this.swapPlan.worstPlayerRow} `
          + `(score ${this.swapPlan.worstPlayerScore}) vs opponent queue [${this.swapPlan.opponentQueue.join(",")}]`,
      );
    }
    const plan = this.swapPlan;
    if (!controller.inputReady) return NO_BUTTONS;
    switch (controller.phase) {
      case "playerPicker": {
        if (plan.opponentQueue.length === 0) {
          this.note(state, "swap screen (winning): decline, no opponent outscores worst rental");
          return this.press("B", 10);
        }
        if (controller.cursor !== plan.worstPlayerRow) {
          return this.press("RIGHT", 8);
        }
        this.note(state, `swap screen (winning): select worst rental row ${plan.worstPlayerRow}`);
        return this.press("A", 10);
      }
      case "playerOptions": {
        if (controller.playerOptionCursor !== 1) {
          return this.press("DOWN", 8);
        }
        this.note(state, "swap screen (winning): SWITCH");
        return this.press("A", 10);
      }
      case "enemyPicker": {
        const target = plan.opponentQueue[0];
        if (target === undefined) {
          this.note(state, "swap screen (winning): decline, remaining candidates all rejected");
          return this.press("B", 10);
        }
        if (controller.cursor !== target) {
          return this.press("RIGHT", 8);
        }
        this.note(state, `swap screen (winning): select opponent row ${target}`);
        return this.press("A", 10);
      }
      case "duplicateSpecies": {
        this.note(state, `swap screen (winning): row ${plan.opponentQueue[0]} is a duplicate species, next candidate`);
        plan.opponentQueue.shift();
        return this.press("B", 10);
      }
      case "acceptPrompt": {
        if (controller.yesNoCursor !== 0) return this.press("UP", 8);
        this.note(state, "swap screen (winning): confirm swap");
        return this.press("A", 10);
      }
      case "quitPrompt": {
        if (controller.yesNoCursor !== 0) return this.press("UP", 8);
        this.note(state, "swap screen (winning): confirm decline");
        return this.press("A", 10);
      }
      default:
        return NO_BUTTONS;
    }
  }

  private onTerminal(state: EngineState): ReadonlySet<GbaButton> {
    if (this.policy === "strong-route") {
      this.note(state, "terminal: A");
      return this.press("A", 18);
    }
    // soak111: terminal buttons come from the PRESS stream. The terminal
    // presentation drops keys until each page/menu is input-ready, so how
    // many rolls a terminal walk consumes depends on press timing; and every
    // RECORD answer (YES / NO / cancel) enters the same EndRecordBattle
    // farewell (stub-only record), so these rolls shape frames and the
    // record message, never a later decision or gameplay.
    const roll = this.pressRng.float();
    const button: GbaButton = roll < 0.6
      ? "A"
      : roll < 0.72
        ? "B"
        : roll < 0.86
          ? "UP"
          : "DOWN";
    this.note(state, `terminal: ${button}`);
    return this.press(button, 18);
  }
}

// ---------------------------------------------------------------------------
// `--start-carry` (opt-in): boot the FIRST chained round from a carried win
// streak instead of the anchor's pinned battle-1 schedule, for crash
// coverage of the higher-tier engine paths a soak's own natural chaining
// (almost) never reaches on its own (no policy has ever won a round at carry
// 28 -- docs/soak-deep-sweep-2026-08-22-4M.md). Drives the SAME chaining
// entry core.ts's terminal-decline handoff uses when a real round completes
// (`generateFactoryChallengeDraft`, factoryRoundChaining.ts) from the
// anchor's own RNG cursor, so the resulting draft/rentals/opponents are
// generated live exactly as a real chain would produce them -- no new engine
// state, just an alternate `EngineState` this test-facing seam builds from
// already-public engine exports.
// ---------------------------------------------------------------------------

/** The only legal `--start-carry` values: a multiple of 7 in 0..49 (challengeNum 0..7). */
export const VALID_START_CARRY_VALUES = [0, 7, 14, 21, 28, 35, 42, 49] as const;

export function validateStartCarry(value: number): void {
  if (!(VALID_START_CARRY_VALUES as readonly number[]).includes(value)) {
    throw new Error(
      `bad --start-carry: ${value} (want a multiple of 7 in 0..49: ${VALID_START_CARRY_VALUES.join(", ")})`,
    );
  }
}

/**
 * `GetPlayerSymbolCountForFacility` consistent with a carry of `startCarry`:
 * silver is earned by winning the round that carries the streak from 14..20
 * up past 21 (`getFactoryFrontierBrainStatus`'s silver check trips at
 * battleIndex 6 when the round entered at carry 14), so any round that
 * itself STARTS at carry >= 21 has silver already banked; likewise gold is
 * earned crossing 42, so carry >= 42 has gold already banked too.
 */
function factorySymbolsCountForStartCarry(startCarry: number): 0 | 1 | 2 {
  if (startCarry >= 42) return 2;
  if (startCarry >= 21) return 1;
  return 0;
}

/**
 * Builds the initial `EngineState` for `--start-carry startCarry`: a fresh
 * draft screen generated live from `{factoryWinStreak: startCarry, rentsCount:
 * 0, battlePoints: 0, factorySymbolsCount: <see above>, playerTrainerId:
 * ANCHOR_FACTORY_METADATA.playerTrainerId}` and the anchor's own RNG cursor
 * (`ANCHOR_RNG_VALUE`) -- exactly the inputs `core.ts`'s terminal-decline
 * chaining handoff feeds `generateFactoryChallengeDraft` when a real chain
 * carries a completed round's streak into the next draft. `pendingGeneratedRound`
 * is set the same way that handoff sets it, so the ordinary draft -> prebattle
 * room -> battle room path (unmodified) later builds the round's orchestrator
 * from this same carry, exactly like a real chain.
 *
 * `startCarry === 0` (with no `rngWalk`) returns `createInitialState()`
 * verbatim -- required to stay byte-identical to today's default/omitted
 * behavior, and safer than relying on the generated path to coincidentally
 * reproduce the anchor's own pinned battle-1 draft records bit-for-bit.
 *
 * `rngWalk` (opt-in, default 0 = today's behavior, byte-identical) advances
 * the boot RNG cursor `rngWalk` LCG steps past `ANCHOR_RNG_VALUE` before
 * generating the draft -- the exact mechanism by which two real players'
 * draft offers differ (the GBA RNG advances every idle frame, so the cursor
 * at draft time is arrival-timing-dependent). THE VARIANCE INSTRUMENT for
 * deterministic-draft policies: the engine itself is seed-invariant, so
 * without a walk every seed of a policy whose decisions don't consume the
 * player RNG (winning-coverage / winning-combined drafts) collapses into
 * essentially ONE trajectory -- 30 seeds, one sample (found 2026-08-23; the
 * winning-combined carry-28 sweep returned 30 identical chronologies).
 * A nonzero walk with `startCarry === 0` takes the generated carry-0 path
 * (a legal fresh challenge-0 draft off the walked cursor) instead of the
 * pinned anchor snapshot, so anchor-style sweeps can be varied too.
 */
export function createStartCarryState(
  startCarry: number,
  rngWalk = 0,
  scene: SoakScene = "off",
): EngineState {
  validateStartCarry(startCarry);
  if (!Number.isInteger(rngWalk) || rngWalk < 0) {
    throw new Error(`bad rngWalk: ${rngWalk} (want a non-negative integer)`);
  }
  if (startCarry === 0 && rngWalk === 0) return createInitialState({ battleScene: scene });
  let bootRngValue = ANCHOR_RNG_VALUE;
  for (let step = 0; step < rngWalk; step += 1) bootRngValue = advanceRngValue(bootRngValue);
  const carry: FactoryCarry = Object.freeze({
    factoryWinStreak: startCarry,
    factorySymbolsCount: factorySymbolsCountForStartCarry(startCarry),
    battlePoints: 0,
    rentsCount: 0,
    playerTrainerId: ANCHOR_FACTORY_METADATA.playerTrainerId,
  });
  const { generation, draftScreen } = generateFactoryChallengeDraft(carry, bootRngValue);
  return {
    ...createInitialState({ battleScene: scene }),
    draftScreen,
    rngValue: generation.rngValue,
    factoryCarry: carry,
    pendingGeneratedRound: Object.freeze({ rngValueBefore: bootRngValue, carry }),
  };
}

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

export type RunOptions = {
  maxFrames: number;
  renderEvery: number;
  verbose: boolean;
  policy: SoakPolicy;
  /** Test-only override; intentionally unavailable from the CLI policy flag. */
  testPolicy?: "strong-route";
  /**
   * Initial-state seam. The default is exactly the production draft anchor
   * returned by createInitialState(); the CLI supplies it for `--start-carry`
   * / `--vary-rng` (via `createStartCarryState`), tests for staged states.
   * Receives the running seed so a factory can vary the boot per seed
   * (`--vary-rng`'s per-seed RNG walk); ignore it for a fixed state.
   */
  stateFactory?: (seed: number) => EngineState;
  /**
   * Battle Scene mode. Absent = today's behaviour (Scene OFF, no `scene`
   * field on the result). When set, the default initial state is built with
   * it and the result carries it; a `stateFactory` must build matching
   * states itself (the CLI does). `render(state)` is the same entry point
   * the browser calls, so Scene ON draws the real battle-scene path.
   */
  scene?: SoakScene;
  /** Opt into read-only route diagnostics without changing ordinary results. */
  collectDiagnostics?: boolean;
  /**
   * Stop with OK ("milestone:first-action-menu") as soon as battle 1's first
   * live action menu is interactive. This is the Tier-1 pin surface: the
   * whole draft -> prebattle room -> battle room -> generated intro ->
   * first command boundary path, driven by real button presses.
   */
  stopAtFirstActionMenu?: boolean;
  /**
   * Report the FIRST round's own decided outcome (roundComplete/roundLost)
   * even if in-session chaining (factoryRoundChaining.ts) continues playing
   * a freshly generated round past it. Without this, the default grace
   * window's countdown only accumulates frames while SOME round sits
   * decided, so a policy that keeps declining the record menu (and thus
   * keeps re-chaining) can run far longer than one round before the window
   * empties. Pins that care only about a single round's own mechanics
   * (crash-free to its own terminal) want this; the crash-hunting sweep
   * across arbitrarily many chained rounds does not.
   */
  stopAtFirstRoundDecision?: boolean;
  /**
   * Frames of zero observed progress (see `DEFAULT_STALL_FRAMES`) before a
   * run reports HANG. Applies to every mode, `stopAtFirstRoundDecision`
   * included (ISSUES #104 driver retune, PROGRESS ~1368; extended to the
   * milestone modes 2026-08-24). `stopAtFirstRoundDecision` additionally
   * keeps its own bounded post-decision grace window, which — being much
   * shorter than the default stall window — normally settles a decided
   * round first.
   */
  stallFrames?: number;
  /**
   * Finish OK ("max-rounds") once this many round decisions
   * (roundComplete/roundLost) have been observed, regardless of frame
   * budget — a cheap run-length control for gates and tests that only want
   * a bounded number of chained rounds. Default unlimited.
   */
  maxRounds?: number;
  /** Test-only opt-in observer for every action-log note, independent of `verbose`. */
  onNote?: (entry: { frame: number; battle: number; turn: number; what: string }) => void;
  /**
   * `--coverage-json` only: a RUN-scoped (not seed-scoped) coverage
   * collector, fed the post-tick EngineState every frame. Absent on every
   * ordinary run, and purely observational -- it never reads back into a
   * decision, the RNG walk, or the frame budget.
   */
  coverage?: SoakCoverageCollector;
};

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  // In-session round chaining (PROGRESS ~1271) lets a single seed play
  // arbitrarily many rounds back to back; 200_000 was sized for one round.
  // 300_000 was believed to comfortably cover the deepest observed
  // default-sweep seed, but ISSUES #90's triage (docs/
  // issue90-seed51-hang-triage.md) falsified that for the "full" policy:
  // seed 51 is not a hang, just a crash-free playthrough that settles at
  // frame 361,216 -- over the old budget. The #89 Baton Pass fix (which
  // used to crash before reaching this point) makes the same-class seed 37
  // run even longer, settling at frame 398,088. 600_000 covers both with
  // real margin. (Superseded per-policy by DEFAULT_MAX_FRAMES_BY_POLICY
  // below; this field is the fallback for a policy absent from that map.)
  maxFrames: 600_000,
  renderEvery: 8,
  verbose: false,
  policy: "full",
};

/**
 * Per-policy default frame budget before an unresolved seed reports HANG.
 * "full"/"vanilla" soak a single round, so 600_000 (ISSUES #90 triage)
 * still applies. "winning" chains multiple complete rounds back-to-back
 * (its continuation roll keeps re-entering GO ON), so per-seed frame cost
 * stacks across rounds and can legitimately exceed a single-round budget
 * without stalling. docs/soak-winning-sweep-2026-08-16.md (seeds 0:60) and
 * docs/soak-winning-sweep-2026-08-16-part2.md (seeds 60:120) swept 120
 * seeds at --max-frames 1_200_000 with zero truncation; the deepest
 * observed completion was seed 49 at frame 693,051. 1_000_000 keeps ~44%
 * headroom over that observed max, matching the proportional margin
 * DEFAULT_RUN_OPTIONS.maxFrames used for "full" (~51% over its 398,088 max).
 * "winning-swap" shares "winning"'s budget verbatim: it chains rounds the
 * same way and the swap screen itself only adds a handful of frames per
 * occurrence, well inside "winning"'s existing headroom.
 */
export const DEFAULT_MAX_FRAMES_BY_POLICY: Record<SoakPolicy, number> = {
  full: 600_000,
  vanilla: 600_000,
  winning: 1_000_000,
  "winning-swap": 1_000_000,
  "oracle-strength": 1_000_000,
  "winning-coverage": 1_000_000,
  "winning-combined": 1_000_000,
  // "coverage-fight" chains rounds exactly like "winning" (it just spends
  // different slots on the way), so it shares "winning"'s budget verbatim.
  "coverage-fight": 1_000_000,
};

/** An explicit `maxFrames` always wins; otherwise resolve per policy. */
export function resolveMaxFrames(policy: SoakPolicy, explicit?: number): number {
  return explicit ?? DEFAULT_MAX_FRAMES_BY_POLICY[policy] ?? DEFAULT_RUN_OPTIONS.maxFrames;
}

/**
 * Frames of zero observed progress before a run reports HANG (ISSUES #104
 * driver retune). "Progress" is any change in round identity (a fresh
 * generated round committing, `factoryRoundBattleOrchestrator.config.id` or
 * `pendingGeneratedRound`), `round.rules.battleIndex`, the player's own turn
 * counter, the surface the player currently reads input from
 * (`RandomPlayer.surface`), or `endStateOf(state)`. A stall this long with
 * every one of those signals frozen is a genuine dead lock: a whole live
 * battle turn, a chained round's terminal walk, or a draft/postwin screen
 * all move several of these signals many times a second under real play, so
 * 30,000 frozen frames (~8.3 real-time minutes at 60fps) is generous
 * headroom over any legitimate single dwell, not a tight trip wire.
 */
export const DEFAULT_STALL_FRAMES = 30_000;

function endStateOf(state: EngineState): string | null {
  const phase = state.factoryRoundBattleOrchestrator?.round.rules.phase;
  if (phase === "roundComplete") return "roundComplete";
  if (phase === "roundLost") return "roundLost";
  return null;
}

export function runSeed(seed: number, optionsIn: Partial<RunOptions> = {}): SeedResult {
  const policy = optionsIn.policy ?? DEFAULT_RUN_OPTIONS.policy;
  const maxFrames = resolveMaxFrames(policy, optionsIn.maxFrames);
  const options: RunOptions = { ...DEFAULT_RUN_OPTIONS, ...optionsIn, maxFrames };
  const stallFrames = options.stallFrames ?? DEFAULT_STALL_FRAMES;
  const rng = new Rng(seed);
  clearContainedPresentationErrors();
  const log = new ActionLog(options.verbose, options.onNote);
  const coverage = options.coverage ?? null;
  coverage?.beginSeed(seed);
  const player = new RandomPlayer(rng, log, options.testPolicy ?? options.policy, coverage);
  let state = options.stateFactory?.(seed)
    ?? createInitialState(options.scene !== undefined ? { battleScene: options.scene } : {});
  let frame = 0;
  let firstEndState: string | null = null;
  let chainingCommitted = false;
  let firstDecisionSnapshot:
    | { frames: number; battle: number; turn: number; diagnostics: RunDiagnostics }
    | null = null;
  // `stopAtFirstRoundDecision` keeps its own small post-decision grace
  // window, independent of the general stall/budget semantics below, so the
  // FIRST round's own terminal/lobby presentation gets a bounded chance to
  // run before freezing that round's snapshot as the result. `firstEndState`
  // is sticky (set once, never cleared) for this mode, so this window never
  // needs to re-arm.
  let roundDecisionGrace = -1;
  let lastSurface = "";
  let surfaceChangedThisTick = false;
  let renderCalls = 0;
  let terminalRecordMenuInputReadyReached = false;
  let terminalOutcome: RunDiagnostics["terminalOutcome"] = null;
  let maxCarriedWinStreak: number | null = null;
  let maxBattleDepth: number | null = null;

  // ISSUES #104 driver retune: generic stall detection (see
  // DEFAULT_STALL_FRAMES) replaces the old single-purpose post-round-
  // decision grace timer for ordinary runs. With the engine half of #104
  // also fixed, a decided round now always re-chains almost immediately, so
  // the old timer's own expiry-HANG branch was already dead in practice;
  // the real failure mode it never caught was a run that stays busy
  // chaining forever and simply outlives its frame budget, which the old
  // code always reported as HANG regardless of whether it was actually
  // stuck (PROGRESS ~1367's "every seed HANGs" finding).
  let lastProgressFrame = 0;
  let roundDecisions = 0;
  let prevRoundId: string | null = null;
  let prevPendingGenerated = false;
  let prevBattleIndex: number | null = null;
  let prevPlayerTurn = player.turn;
  let prevEnd: string | null = null;

  const observe = (): void => {
    coverage?.observe(state);
    if (state.factoryTerminal !== null) {
      terminalOutcome = state.factoryTerminal.profile.outcome;
      terminalRecordMenuInputReadyReached ||=
        factoryTerminalRecordMenuInputReady(state.factoryTerminal);
    }
    const orchestrator = state.factoryRoundBattleOrchestrator;
    if (orchestrator !== null) {
      const carry = orchestrator.config.factoryWinStreak;
      if (maxCarriedWinStreak === null || carry > maxCarriedWinStreak) {
        maxCarriedWinStreak = carry;
      }
      const depth = carry + orchestrator.round.rules.battleIndex;
      if (maxBattleDepth === null || depth > maxBattleDepth) {
        maxBattleDepth = depth;
      }
    }
  };

  const diagnostics = (): RunDiagnostics => {
    const orchestrator = state.factoryRoundBattleOrchestrator;
    return Object.freeze({
      roundPhase: orchestrator?.round.rules.phase ?? null,
      battleIndex: orchestrator?.round.rules.battleIndex ?? null,
      lastBattleOutcome: orchestrator?.round.rules.lastBattle?.outcome ?? null,
      opponentGenerationCount: orchestrator?.opponentGenerations.length ?? 0,
      battleRngSegmentCount:
        orchestrator?.rngSegments.filter((segment) => segment.kind === "battle").length ?? 0,
      terminalOutcome,
      terminalRecordMenuInputReadyReached,
      terminalRecordChoice: state.factoryTerminal?.recordChoice ?? null,
      renderCalls,
      carriedWinStreak: orchestrator?.config.factoryWinStreak ?? null,
      firstOpponentChallengeNum: orchestrator?.opponentGenerations[0]?.generation.challengeNum ?? null,
    });
  };

  observe();

  const finish = (outcome: SeedOutcome, extra: Partial<SeedResult>): SeedResult => {
    const result: SeedResult = {
      seed,
      outcome,
      frames: frame,
      battle: player.battle,
      turn: player.turn,
      maxCarriedWinStreak,
      maxBattleDepth,
      oracleStrengthFallbacks: player.oracleStrengthFallbacks,
      lastActions: log.tail(15).map(
        (entry) => `f=${entry.frame} b${entry.battle} t${entry.turn} ${entry.what}`,
      ),
      ...(options.scene !== undefined ? { scene: options.scene } : {}),
      ...(containedPresentationErrorCount() > 0
        ? { contained: containedPresentationErrorCount(), containedFirstMessage: containedPresentationErrors()[0]!.message }
        : {}),
      ...extra,
    };
    return options.collectDiagnostics === true
      ? { ...result, diagnostics: extra.diagnostics ?? diagnostics() }
      : result;
  };

  while (frame < options.maxFrames) {
    let phase = "tick";
    try {
      const buttons = player.decide(state);
      state = tick(state, buttons);
      frame += 1;
      observe();
      const surface = player.surface(state);
      surfaceChangedThisTick = surface !== lastSurface;
      lastSurface = surface;
      if (
        options.renderEvery > 0
        && (surfaceChangedThisTick || frame % options.renderEvery === 0 || player.rendersEveryFrame(state))
      ) {
        phase = "render";
        render(state);
        renderCalls += 1;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const frames = stackFrames(err);
      const origin = errorOrigin(frames);
      const normalized = normalizeMessage(err.message);
      return finish("CRASH", {
        errorName: err.name,
        errorMessage: err.message,
        errorOrigin: origin,
        errorPhase: phase,
        stackTop: frames.slice(0, 3).map(shortFrame),
        signature: `${err.name}: ${normalized} @ ${signatureFrame(frames)}`,
      });
    }

    if (options.stopAtFirstActionMenu === true && player.reachedFirstActionMenu(state)) {
      return finish("OK", { endState: "milestone:first-action-menu" });
    }

    const orch = state.factoryRoundBattleOrchestrator;
    const roundId = orch?.config.id ?? null;
    const pendingGenerated = state.pendingGeneratedRound !== null;
    const battleIndex = orch?.round.rules.battleIndex ?? null;
    const end = endStateOf(state);
    if (end !== null && firstEndState === null) firstEndState = end;
    if (end !== null && prevEnd === null) roundDecisions += 1;
    if (pendingGenerated) chainingCommitted = true;
    if (options.stopAtFirstRoundDecision === true && firstEndState !== null && !chainingCommitted) {
      // Keep refreshing the snapshot every tick the FIRST round's own
      // terminal dialogue still runs (factoryRoundBattleOrchestrator gets
      // cleared partway through it, before pendingGeneratedRound commits —
      // see core.ts's terminal-decline handoff — so endStateOf() alone
      // can't tell "still this round's terminal" from "already chained").
      // pendingGeneratedRound flips non-null at the exact chaining commit,
      // so this freezes the snapshot at the last genuine pre-chain value.
      firstDecisionSnapshot = {
        frames: frame,
        battle: player.battle,
        turn: player.turn,
        diagnostics: diagnostics(),
      };
    }

    // Progress signals (see DEFAULT_STALL_FRAMES doc): any change resets
    // the stall clock.
    const progressed =
      roundId !== prevRoundId
      || pendingGenerated !== prevPendingGenerated
      || battleIndex !== prevBattleIndex
      || player.turn !== prevPlayerTurn
      || surfaceChangedThisTick
      || end !== prevEnd;
    if (progressed) lastProgressFrame = frame;
    prevRoundId = roundId;
    prevPendingGenerated = pendingGenerated;
    prevBattleIndex = battleIndex;
    prevPlayerTurn = player.turn;
    prevEnd = end;

    if (options.stopAtFirstRoundDecision === true) {
      // `firstEndState` is sticky, so once set this branch is taken every
      // remaining tick regardless of later chaining — see the field doc.
      if (firstEndState !== null) {
        if (roundDecisionGrace < 0) roundDecisionGrace = 9_000;
        roundDecisionGrace -= 1;
        if (state.lobbyFreeRoam !== null || roundDecisionGrace === 0) {
          return finish("OK", { endState: firstEndState, ...firstDecisionSnapshot! });
        }
      }
      // Same generic stall rule as continuous play (ROADMAP S10 soak
      // semantics, 2026-08-20): HANG means *stuck*, never merely
      // "undecided". A first round that keeps genuinely progressing --
      // a source-faithful stalemate advancing turn after turn, e.g. the
      // ISSUES #123 forced-Struggle-vs-Struggle class -- must not be
      // called a hang just because its decision never arrives; only
      // `stallFrames` frames with every progress signal frozen is.
      if (frame - lastProgressFrame >= stallFrames) {
        return finish("HANG", { hangSurface: player.surface(state), endState: end ?? undefined });
      }
      continue;
    }

    if (state.lobbyFreeRoam !== null) {
      return finish("OK", { endState: end ?? "roundLost" });
    }
    if (options.maxRounds !== undefined && roundDecisions >= options.maxRounds) {
      return finish("OK", { endState: "max-rounds" });
    }
    if (frame - lastProgressFrame >= stallFrames) {
      // Genuine stall: no round identity, battle index, turn, input
      // surface, or decided-round phase has moved in `stallFrames` frames.
      return finish("HANG", { hangSurface: player.surface(state), endState: end ?? undefined });
    }
  }
  // Budget exhausted. Every earlier iteration already checked for a stall
  // (and would have returned HANG), so reaching here means the run was
  // still making genuine progress right up to the frame budget — report OK,
  // not HANG (ISSUES #104 retune: a run that keeps chaining rounds forever
  // is not "stuck", it simply outlived its budget).
  //
  // Since 2026-08-24 that holds for the milestone modes too: both
  // `stopAtFirstRoundDecision` and `stopAtFirstActionMenu` now run the same
  // in-loop stall check, so "the milestone never arrived" is by itself no
  // evidence of a hang — a still-progressing run reads `OK ... budget` here
  // exactly like continuous play does, and a genuinely stuck one has
  // already returned HANG from inside the loop. The mode's own target is
  // still readable from `endState`: a reached milestone reports
  // roundComplete/roundLost/milestone:first-action-menu, so a pin that
  // asserts the milestone still fails on "budget".
  return finish("OK", { endState: "budget" });
}
