/**
 * Pure port of `AI_CheckBadMove` (`data/battle_ai_scripts.s:51-651`,
 * `docs/factory-ai-ground-truth.md` §4 item 2). Zero `if_random_*` in the
 * script itself, but `get_ability AI_TARGET` (`Cmd_get_ability`,
 * `battle_ai_script_commands.c:1350-1400`) draws one `Random()` per call
 * whenever the target's ability is unknown, the target is not a trapper
 * (Shadow Tag/Magnet Pull/Arena Trap), and the species has two distinct
 * abilities -- and it NEVER caches: `BATTLE_HISTORY->abilities[target]` is
 * read but never written by this command, so both static call sites in the
 * preamble (ability-negation, soundproof) redraw fresh every time they're
 * reached, even within the same slot's pass. This is the load-bearing
 * quirk for roll-count parity (ground-truth doc §0(2)/§4 item 2).
 *
 * Scope this port covers in full: the universal preamble --
 * `get_how_powerful_move_is`'s MOVE_POWER_OTHER classification (the
 * cross-moveset "most powerful" comparison itself is TryToFaint-only and
 * not needed for CheckBadMove's own control flow), the FISSURE/HORN_DRILL
 * short-circuit, the type-immunity `Score_Minus10`, the five
 * ability-negation branches (Volt Absorb/Water Absorb/Flash Fire/Wonder
 * Guard/Levitate), and the Soundproof nine-move list.
 *
 * `AI_CheckBadMove_CheckEffect`'s `if_effect` dispatch (`:104-214`, ~100
 * entries) is otherwise NOT implemented -- any move whose effect has an
 * entry in that table (whether it names an `AI_CBM_*` handler or jumps
 * straight to a `Score_Minus*` label like `EFFECT_TELEPORT`) halts with a
 * named `unsupported-branch` barrier, per the port-subset audit's item 6. A
 * move whose effect has NO entry falls through to the chain's trailing
 * `end` with zero score contribution -- that's a genuine, complete port of
 * that path, not a stub (none of the three banked ledgers' four moves reach
 * a table entry; confirmed by direct grep of `data/battle_ai_scripts.s`).
 *
 * Four table entries ARE ported: `EFFECT_SPEED_DOWN(_2)` -> `AI_CBM_SpeedDown`
 * (`data/battle_ai_scripts.s:287-312`, `runCbmSpeedDown` below), the
 * proven CBM+CV pair with `factoryAiCheckViability.ts`'s `AI_CV_SpeedDown`
 * (`docs/factory-ai-checkviability-ground-truth.md` §6); `EFFECT_ATTACK_DOWN(_2)`
 * -> `AI_CBM_AttackDown` (`:277-281` + `CheckIfAbilityBlocksStatChange`'s
 * shared tail `:308-312`, `runCbmAttackDown` below), the first CBM-blocked
 * pair's own CBM half, with `AI_CV_AttackDown` (doc §14); and
 * `EFFECT_DEFENSE_DOWN(_2)`/`EFFECT_SPECIAL_DEFENSE_DOWN(_2)` ->
 * `AI_CBM_DefenseDown`/`AI_CBM_SpDefDown` (`:283-285`/`:296-298` + the same
 * shared tail, `runCbmStatDownViaSharedTail` below), the second and third
 * CBM-blocked pairs' own CBM halves, with `AI_CV_DefenseDown`/`AI_CV_SpDefDown`
 * (doc §15/§16) -- both `goto` straight into the shared tail with no
 * intervening ability check of their own, unlike `AttackDown`'s Hyper Cutter
 * gate.
 */
import movesData from "../data/gen/moves.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import { advanceRngValue } from "./rng.ts";
import type { BattleRngState } from "./battleDecisionBoundary.ts";
import { MIN_STAT_STAGE, type TypeEffectivenessEntry } from "./damageCalc.ts";

const U16_MAX = 0xffff;

export type MoveRow = Readonly<{ id: number; type: string; power: number; effect: string }>;
export const MOVES_BY_ID: ReadonlyMap<number, MoveRow> = new Map(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row]),
);

type SpeciesRow = Readonly<{ id: number; abilities: readonly [string, string] }>;
const SPECIES_BY_ID: ReadonlyMap<number, SpeciesRow> = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesRow[]).map((row) => [row.id, row]),
);

export const TYPE_EFFECTIVENESS = typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];

/** `sIgnoredPowerfulMoveEffects` (`battle_ai_script_commands.c:266-281`). */
export const IGNORED_POWERFUL_MOVE_EFFECTS: ReadonlySet<string> = new Set([
  "EFFECT_EXPLOSION",
  "EFFECT_DREAM_EATER",
  "EFFECT_RAZOR_WIND",
  "EFFECT_SKY_ATTACK",
  "EFFECT_RECHARGE",
  "EFFECT_SKULL_BASH",
  "EFFECT_SOLAR_BEAM",
  "EFFECT_SPIT_UP",
  "EFFECT_FOCUS_PUNCH",
  "EFFECT_SUPERPOWER",
  "EFFECT_ERUPTION",
  "EFFECT_OVERHEAT",
]);

const MOVE_FISSURE = 90;
const MOVE_HORN_DRILL = 32;

/** Trapper abilities (`Cmd_get_ability`'s "abilities that prevent fleeing" branch). */
const TRAPPER_ABILITIES: ReadonlySet<string> = new Set([
  "ABILITY_SHADOW_TAG",
  "ABILITY_MAGNET_PULL",
  "ABILITY_ARENA_TRAP",
]);

const NEGATING_ABILITIES = Object.freeze({
  voltAbsorb: "ABILITY_VOLT_ABSORB",
  waterAbsorb: "ABILITY_WATER_ABSORB",
  flashFire: "ABILITY_FLASH_FIRE",
  wonderGuard: "ABILITY_WONDER_GUARD",
  levitate: "ABILITY_LEVITATE",
} as const);

const SOUNDPROOF_MOVES: ReadonlySet<number> = new Set([
  45, // MOVE_GROWL
  46, // MOVE_ROAR
  47, // MOVE_SING
  48, // MOVE_SUPERSONIC
  103, // MOVE_SCREECH
  173, // MOVE_SNORE
  253, // MOVE_UPROAR
  319, // MOVE_METAL_SOUND
  320, // MOVE_GRASS_WHISTLE
]);

/**
 * `AI_CheckBadMove_CheckEffect`'s `if_effect` table (`:104-214`), source-
 * complete: every `EFFECT_*` that has ANY entry (named `AI_CBM_*` handler or
 * a direct `Score_Minus*` jump). A candidate move whose effect is NOT in
 * this set gets the table's true fallthrough: zero score, zero draws.
 */
export const AI_CHECK_BAD_MOVE_TABLE_EFFECTS: ReadonlySet<string> = new Set([
  "EFFECT_SLEEP", "EFFECT_EXPLOSION", "EFFECT_DREAM_EATER", "EFFECT_ATTACK_UP",
  "EFFECT_DEFENSE_UP", "EFFECT_SPEED_UP", "EFFECT_SPECIAL_ATTACK_UP", "EFFECT_SPECIAL_DEFENSE_UP",
  "EFFECT_ACCURACY_UP", "EFFECT_EVASION_UP", "EFFECT_ATTACK_DOWN", "EFFECT_DEFENSE_DOWN",
  "EFFECT_SPEED_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_ACCURACY_DOWN",
  "EFFECT_EVASION_DOWN", "EFFECT_HAZE", "EFFECT_BIDE", "EFFECT_ROAR",
  "EFFECT_TOXIC", "EFFECT_LIGHT_SCREEN", "EFFECT_OHKO", "EFFECT_RAZOR_WIND",
  "EFFECT_SUPER_FANG", "EFFECT_MIST", "EFFECT_FOCUS_ENERGY", "EFFECT_CONFUSE",
  "EFFECT_ATTACK_UP_2", "EFFECT_DEFENSE_UP_2", "EFFECT_SPEED_UP_2", "EFFECT_SPECIAL_ATTACK_UP_2",
  "EFFECT_SPECIAL_DEFENSE_UP_2", "EFFECT_ACCURACY_UP_2", "EFFECT_EVASION_UP_2", "EFFECT_ATTACK_DOWN_2",
  "EFFECT_DEFENSE_DOWN_2", "EFFECT_SPEED_DOWN_2", "EFFECT_SPECIAL_ATTACK_DOWN_2", "EFFECT_SPECIAL_DEFENSE_DOWN_2",
  "EFFECT_ACCURACY_DOWN_2", "EFFECT_EVASION_DOWN_2", "EFFECT_REFLECT", "EFFECT_POISON",
  "EFFECT_PARALYZE", "EFFECT_SUBSTITUTE", "EFFECT_RECHARGE", "EFFECT_LEECH_SEED",
  "EFFECT_DISABLE", "EFFECT_LEVEL_DAMAGE", "EFFECT_PSYWAVE", "EFFECT_COUNTER",
  "EFFECT_ENCORE", "EFFECT_SNORE", "EFFECT_SLEEP_TALK", "EFFECT_FLAIL",
  "EFFECT_MEAN_LOOK", "EFFECT_NIGHTMARE", "EFFECT_MINIMIZE", "EFFECT_CURSE",
  "EFFECT_SPIKES", "EFFECT_FORESIGHT", "EFFECT_PERISH_SONG", "EFFECT_SANDSTORM",
  "EFFECT_SWAGGER", "EFFECT_ATTRACT", "EFFECT_RETURN", "EFFECT_PRESENT",
  "EFFECT_FRUSTRATION", "EFFECT_SAFEGUARD", "EFFECT_MAGNITUDE", "EFFECT_BATON_PASS",
  "EFFECT_SONICBOOM", "EFFECT_RAIN_DANCE", "EFFECT_SUNNY_DAY", "EFFECT_BELLY_DRUM",
  "EFFECT_PSYCH_UP", "EFFECT_MIRROR_COAT", "EFFECT_SKULL_BASH", "EFFECT_FUTURE_SIGHT",
  "EFFECT_TELEPORT", "EFFECT_DEFENSE_CURL", "EFFECT_FAKE_OUT", "EFFECT_STOCKPILE",
  "EFFECT_SPIT_UP", "EFFECT_SWALLOW", "EFFECT_HAIL", "EFFECT_TORMENT",
  "EFFECT_FLATTER", "EFFECT_WILL_O_WISP", "EFFECT_MEMENTO", "EFFECT_FOCUS_PUNCH",
  "EFFECT_HELPING_HAND", "EFFECT_TRICK", "EFFECT_INGRAIN", "EFFECT_SUPERPOWER",
  "EFFECT_RECYCLE", "EFFECT_KNOCK_OFF", "EFFECT_ENDEAVOR", "EFFECT_IMPRISON",
  "EFFECT_REFRESH", "EFFECT_LOW_KICK", "EFFECT_MUD_SPORT", "EFFECT_TICKLE",
  "EFFECT_COSMIC_POWER", "EFFECT_BULK_UP", "EFFECT_WATER_SPORT", "EFFECT_CALM_MIND",
  "EFFECT_DRAGON_DANCE",
]);

export type FactoryAiCheckBadMoveTarget = Readonly<{
  species: number;
  types: readonly [string, string];
  /** BattleHistory-style known ability, or null if never observed this battle. */
  knownAbility: string | null;
  /** The target's real, engine-known ability (trapper check reads this directly, not a guess). */
  realAbility: string;
  /** Current SPEED stat stage (`gBattleMons[].statStages[STAT_SPEED]`), 0..12 -- `AI_CBM_SpeedDown`'s MIN_STAT_STAGE gate. */
  speedStage: number;
  /** Current ATTACK stat stage, 0..12 -- `AI_CBM_AttackDown`'s MIN_STAT_STAGE gate. */
  atkStage: number;
  /** Current DEFENSE stat stage, 0..12 -- `AI_CBM_DefenseDown`'s MIN_STAT_STAGE gate. */
  defStage: number;
  /** Current SPECIAL DEFENSE stat stage, 0..12 -- `AI_CBM_SpDefDown`'s MIN_STAT_STAGE gate. */
  spDefStage: number;
}>;

export type FactoryAiCheckBadMoveDraw = Readonly<{
  ordinal: number;
  reason: string;
  kind: "get-ability";
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  guessedAbility: string;
}>;

export type FactoryAiCheckBadMoveResult =
  | Readonly<{
    kind: "scored";
    rng: BattleRngState;
    draws: readonly FactoryAiCheckBadMoveDraw[];
    scoreDelta: number;
  }>
  | Readonly<{
    kind: "unsupported-branch";
    barrier: "factory-ai-check-bad-move";
    effect: string;
    moveId: number;
  }>;

function nextGetAbilityDraw(
  rng: BattleRngState,
  ordinal: number,
  reason: string,
  target: FactoryAiCheckBadMoveTarget,
): Readonly<{ rng: BattleRngState; draw: FactoryAiCheckBadMoveDraw | null; ability: string }> {
  if (TRAPPER_ABILITIES.has(target.realAbility)) {
    return { rng, draw: null, ability: target.realAbility };
  }
  if (target.knownAbility !== null) {
    return { rng, draw: null, ability: target.knownAbility };
  }
  const species = SPECIES_BY_ID.get(target.species);
  if (!species) throw new Error(`factory-ai-check-bad-move: unknown species ${target.species}`);
  const [ability0, ability1] = species.abilities;
  if (ability1 === "ABILITY_NONE") {
    return { rng, draw: null, ability: ability0 };
  }
  const rawRngValue = advanceRngValue(rng.value);
  const after: BattleRngState = Object.freeze({ value: rawRngValue, calls: rng.calls + 1 });
  const randomValue = (rawRngValue >>> 16) & U16_MAX;
  const guessedAbility = (randomValue & 1) !== 0 ? ability0 : ability1;
  const draw: FactoryAiCheckBadMoveDraw = Object.freeze({
    ordinal,
    reason,
    kind: "get-ability",
    before: rng,
    after,
    rawRngValue,
    randomValue,
    guessedAbility,
  });
  return { rng: after, draw, ability: guessedAbility };
}

const ABILITY_SPEED_BOOST = "ABILITY_SPEED_BOOST";
const ABILITY_HYPER_CUTTER = "ABILITY_HYPER_CUTTER";
const ABILITY_CLEAR_BODY = "ABILITY_CLEAR_BODY";
const ABILITY_WHITE_SMOKE = "ABILITY_WHITE_SMOKE";

/**
 * `check_ability AI_TARGET, ability` / `if_ability AI_TARGET, ability, ptr`
 * (`Cmd_check_ability`, `battle_ai_script_commands.c:1407-1443`, AI_TARGET
 * branch only -- no caller here needs AI_USER). Zero-RNG, unlike
 * `get_ability`: a known (BattleHistory) or single-ability species compares
 * exactly; a species with two distinct, unobserved abilities can NEVER
 * register a match here regardless of which ability is asked about -- the
 * source's own `abilityDummyVariable` trick collapses both outcomes
 * (neither ability matches -> compares against ability slot 0 anyway, which
 * by construction still doesn't match; one of the two matches -> forced to
 * ABILITY_NONE, "unable to answer") to a non-match. A genuine source quirk,
 * ported exactly rather than "simplified" to a coin flip.
 */
function checkAbilityAiTarget(target: FactoryAiCheckBadMoveTarget, wantedAbility: string): boolean {
  if (TRAPPER_ABILITIES.has(target.realAbility)) {
    return target.realAbility === wantedAbility;
  }
  if (target.knownAbility !== null) {
    return target.knownAbility === wantedAbility;
  }
  const species = SPECIES_BY_ID.get(target.species);
  if (!species) throw new Error(`factory-ai-check-bad-move: unknown species ${target.species}`);
  const [ability0, ability1] = species.abilities;
  if (ability1 === "ABILITY_NONE") {
    return ability0 === wantedAbility;
  }
  return false;
}

/**
 * `AI_CBM_SpeedDown` + the shared `CheckIfAbilityBlocksStatChange` tail
 * (`data/battle_ai_scripts.s:287-312`). MIN_STAT_STAGE and Speed Boost are
 * zero-RNG short-circuits (`if_stat_level_equal`/`if_ability`, the latter
 * via `checkAbilityAiTarget` above -- distinct from `get_ability`'s
 * guess-and-draw machinery); the shared tail's own `get_ability AI_TARGET`
 * reuses `nextGetAbilityDraw` unchanged (same redraw-per-call machinery
 * CheckBadMove's preamble already established for its own two call sites).
 */
function runCbmSpeedDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if (target.speedStage === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  if (checkAbilityAiTarget(target, ABILITY_SPEED_BOOST)) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const result = nextGetAbilityDraw(rng, ordinal, reason, target);
  const draws = result.draw ? [result.draw] : [];
  const blocksChange = result.ability === ABILITY_CLEAR_BODY || result.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng: result.rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

/**
 * `AI_CBM_AttackDown` + the shared `CheckIfAbilityBlocksStatChange` tail
 * (`data/battle_ai_scripts.s:277-281,308-312`,
 * `docs/factory-ai-checkviability-ground-truth.md` §14.1). Unlike
 * `AI_CBM_SpeedDown`'s second gate (`if_ability`, zero-RNG
 * `checkAbilityAiTarget`), this handler's own Hyper Cutter check is a real
 * `get_ability AI_TARGET` + `if_equal` pair -- a genuine second (guessing,
 * uncached) draw site distinct from the shared tail's own, per §14.2's own
 * finding that this handler calls `get_ability` twice.
 */
function runCbmAttackDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if (target.atkStage === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const draws: FactoryAiCheckBadMoveDraw[] = [];
  const hyperCutter = nextGetAbilityDraw(rng, ordinal, `${reason}-hyper-cutter`, target);
  rng = hyperCutter.rng;
  if (hyperCutter.draw) {
    draws.push(hyperCutter.draw);
    ordinal += 1;
  }
  if (hyperCutter.ability === ABILITY_HYPER_CUTTER) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: -10 });
  }
  const tail = nextGetAbilityDraw(rng, ordinal, `${reason}-shared-tail`, target);
  rng = tail.rng;
  if (tail.draw) draws.push(tail.draw);
  const blocksChange = tail.ability === ABILITY_CLEAR_BODY || tail.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

/**
 * Shared body for `AI_CBM_DefenseDown` (`data/battle_ai_scripts.s:283-285`,
 * doc §15.1) and `AI_CBM_SpDefDown` (`:296-298`, doc §16.1): both are a bare
 * `if_stat_level_equal AI_TARGET, <stat>, MIN_STAT_STAGE, Score_Minus10`
 * followed by a direct `goto CheckIfAbilityBlocksStatChange` -- unlike
 * `AI_CBM_AttackDown`, neither has its own intervening `get_ability` call
 * before the shared tail, so the tail's own `get_ability AI_TARGET` fires at
 * most once here (vs. up to twice for AttackDown).
 */
function runCbmStatDownViaSharedTail(
  stage: number,
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if (stage === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const tail = nextGetAbilityDraw(rng, ordinal, `${reason}-shared-tail`, target);
  const draws = tail.draw ? [tail.draw] : [];
  const blocksChange = tail.ability === ABILITY_CLEAR_BODY || tail.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng: tail.rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

function runCbmDefenseDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  return runCbmStatDownViaSharedTail(target.defStage, target, rng, ordinal, reason);
}

function runCbmSpDefDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  return runCbmStatDownViaSharedTail(target.spDefStage, target, rng, ordinal, reason);
}

export function typeMultiplierTenths(attackingType: string, defendingTypes: readonly [string, string]): number {
  const distinct = defendingTypes[0] === defendingTypes[1] ? [defendingTypes[0]] : defendingTypes;
  let mult = 10;
  for (const defType of distinct) {
    const entry = TYPE_EFFECTIVENESS.find(
      (candidate) => candidate.attackingType === attackingType && candidate.defendingType === defType,
    );
    if (entry) mult = Math.trunc((mult * entry.multiplierTenths) / 10);
  }
  return mult;
}

/**
 * `AI_CheckBadMove` for one move slot against one target (`:51-214`).
 * `drawOrdinalStart` numbers this pass's `get-ability` draws for tracing;
 * the caller composes ordinals across slots/scripts.
 */
export function runCheckBadMovePreamble(input: Readonly<{
  rng: BattleRngState;
  moveId: number;
  target: FactoryAiCheckBadMoveTarget;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): FactoryAiCheckBadMoveResult {
  const { target } = input;
  const move = MOVES_BY_ID.get(input.moveId);
  if (!move) throw new Error(`factory-ai-check-bad-move: unknown move ${input.moveId}`);

  let rng = input.rng;
  const draws: FactoryAiCheckBadMoveDraw[] = [];
  let ordinal = input.drawOrdinalStart;
  const drawAbility = (reason: string): string => {
    const result = nextGetAbilityDraw(rng, ordinal, reason, target);
    rng = result.rng;
    if (result.draw) {
      draws.push(result.draw);
      ordinal += 1;
    }
    return result.ability;
  };

  const isOhko = input.moveId === MOVE_FISSURE || input.moveId === MOVE_HORN_DRILL;
  const isMovePowerOther = !isOhko
    && (move.power <= 1 || IGNORED_POWERFUL_MOVE_EFFECTS.has(move.effect));

  let reachedCheckEffect = false;

  if (!isMovePowerOther) {
    // AI_CBM_CheckIfNegatesType
    const effectivenessTenths = typeMultiplierTenths(move.type, target.types);
    if (effectivenessTenths === 0) {
      return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
    }

    const guessed = drawAbility(`${input.reasonPrefix}-negates-type`);
    let negated = false;
    if (guessed === NEGATING_ABILITIES.voltAbsorb) {
      if (move.type === "TYPE_ELECTRIC") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -12 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.waterAbsorb) {
      if (move.type === "TYPE_WATER") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -12 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.flashFire) {
      if (move.type === "TYPE_FIRE") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -12 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.wonderGuard) {
      if (effectivenessTenths !== 20) {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.levitate) {
      if (move.type === "TYPE_GROUND") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
      }
      negated = true;
    }
    void negated;
  }

  // AI_CheckBadMove_CheckSoundproof_ / AI_CheckBadMove_CheckSoundproof
  const soundproofGuess = drawAbility(`${input.reasonPrefix}-soundproof`);
  if (soundproofGuess === "ABILITY_SOUNDPROOF" && SOUNDPROOF_MOVES.has(input.moveId)) {
    return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
  }
  reachedCheckEffect = true;
  void reachedCheckEffect;

  // AI_CheckBadMove_CheckEffect: EFFECT_SPEED_DOWN(_2) -> AI_CBM_SpeedDown,
  // one of the two handlers this port implements out of the table's ~100 entries.
  if (move.effect === "EFFECT_SPEED_DOWN" || move.effect === "EFFECT_SPEED_DOWN_2") {
    const speedDown = runCbmSpeedDown(target, rng, ordinal, `${input.reasonPrefix}-speed-down`);
    for (const draw of speedDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: speedDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: speedDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_ATTACK_DOWN(_2) -> AI_CBM_AttackDown,
  // the first CBM-blocked pair's own CBM half (doc §14).
  if (move.effect === "EFFECT_ATTACK_DOWN" || move.effect === "EFFECT_ATTACK_DOWN_2") {
    const attackDown = runCbmAttackDown(target, rng, ordinal, `${input.reasonPrefix}-attack-down`);
    for (const draw of attackDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: attackDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: attackDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_DEFENSE_DOWN(_2) -> AI_CBM_DefenseDown,
  // the second CBM-blocked pair's own CBM half (doc §15).
  if (move.effect === "EFFECT_DEFENSE_DOWN" || move.effect === "EFFECT_DEFENSE_DOWN_2") {
    const defenseDown = runCbmDefenseDown(target, rng, ordinal, `${input.reasonPrefix}-defense-down`);
    for (const draw of defenseDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: defenseDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: defenseDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_SPECIAL_DEFENSE_DOWN(_2) -> AI_CBM_SpDefDown,
  // the third CBM-blocked pair's own CBM half (doc §16).
  if (move.effect === "EFFECT_SPECIAL_DEFENSE_DOWN" || move.effect === "EFFECT_SPECIAL_DEFENSE_DOWN_2") {
    const spDefDown = runCbmSpDefDown(target, rng, ordinal, `${input.reasonPrefix}-sp-def-down`);
    for (const draw of spDefDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: spDefDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: spDefDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: source-complete if_effect table lookup.
  if (AI_CHECK_BAD_MOVE_TABLE_EFFECTS.has(move.effect)) {
    return Object.freeze({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: move.effect,
      moveId: input.moveId,
    });
  }

  return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: 0 });
}
