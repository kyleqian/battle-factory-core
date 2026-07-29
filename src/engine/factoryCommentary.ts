/**
 * Pure Battle Factory opponent commentary derived from a generated party.
 *
 * Source:
 * - favorite type: `battle_factory.c:603-655`
 * - style thresholds and move lists: `battle_factory.c:44-121`
 * - style tally/selection and first-list move classification:
 *   `battle_factory.c:657-705`
 * - script result dispatch and exact strings:
 *   `BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:198-346,492-602`
 *
 * The input is deliberately structural: both `FactoryOpponentGenerationResult.party`
 * and members built by `createFactoryCorpusPartyMember` already provide these
 * fields, so facility control code needs no parallel fixture representation.
 */

import movesData from "../data/gen/moves.json" with { type: "json" };
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };

export type FactoryCommentaryPartyMember = Readonly<{
  speciesName: string;
  moves: readonly [number, number, number, number];
}>;

export type FactoryCommentaryParty = readonly [
  FactoryCommentaryPartyMember,
  FactoryCommentaryPartyMember,
  FactoryCommentaryPartyMember,
];

export const FACTORY_TYPE_SYMBOLS = [
  "TYPE_NORMAL",
  "TYPE_FIGHTING",
  "TYPE_FLYING",
  "TYPE_POISON",
  "TYPE_GROUND",
  "TYPE_ROCK",
  "TYPE_BUG",
  "TYPE_GHOST",
  "TYPE_STEEL",
  "TYPE_MYSTERY",
  "TYPE_FIRE",
  "TYPE_WATER",
  "TYPE_GRASS",
  "TYPE_ELECTRIC",
  "TYPE_PSYCHIC",
  "TYPE_ICE",
  "TYPE_DRAGON",
  "TYPE_DARK",
] as const;

export type FactoryTypeId =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;
export const FACTORY_NO_FAVORITE_TYPE = 18 as const;
export type FactoryFavoriteTypeResult = FactoryTypeId | typeof FACTORY_NO_FAVORITE_TYPE;

export const FACTORY_STYLE = Object.freeze({
  NONE: 0,
  PREPARATION: 1,
  SLOW_STEADY: 2,
  ENDURANCE: 3,
  HIGH_RISK: 4,
  WEAKENING: 5,
  UNPREDICTABLE: 6,
  WEATHER: 7,
  FLEXIBLE: 8,
} as const);

export type FactoryBattleStyle = (typeof FACTORY_STYLE)[keyof typeof FACTORY_STYLE];

export const FACTORY_STYLE_REQUIRED_MOVE_COUNTS = Object.freeze([
  0, 3, 3, 3, 2, 2, 2, 2,
] as const);

const TYPE_ID_BY_SYMBOL: ReadonlyMap<string, FactoryTypeId> = new Map(
  FACTORY_TYPE_SYMBOLS.map((symbol, id) => [symbol, id as FactoryTypeId]),
);

type SpeciesTypesRow = Readonly<{
  name: string;
  types: readonly [string, string];
}>;
const SPECIES_TYPES = new Map(
  (speciesTypesData as unknown as { species: SpeciesTypesRow[] }).species.map((row) => {
    const first = TYPE_ID_BY_SYMBOL.get(row.types[0]);
    const second = TYPE_ID_BY_SYMBOL.get(row.types[1]);
    if (first === undefined || second === undefined) {
      throw new Error(`Unknown source type for ${row.name}: ${row.types.join("/")}`);
    }
    return [row.name, Object.freeze([first, second] as const)];
  }),
);

type MoveRow = Readonly<{ move: string; id: number }>;
const MOVE_ID_BY_SYMBOL = new Map(
  (movesData as { moves: MoveRow[] }).moves.map((row) => [row.move, row.id]),
);

export const FACTORY_STYLE_MOVE_SYMBOLS: readonly (readonly string[])[] = Object.freeze([
  Object.freeze([]),
  Object.freeze([
    "MOVE_SWORDS_DANCE", "MOVE_GROWTH", "MOVE_MEDITATE", "MOVE_AGILITY",
    "MOVE_DOUBLE_TEAM", "MOVE_HARDEN", "MOVE_MINIMIZE", "MOVE_WITHDRAW",
    "MOVE_DEFENSE_CURL", "MOVE_BARRIER", "MOVE_FOCUS_ENERGY", "MOVE_AMNESIA",
    "MOVE_ACID_ARMOR", "MOVE_SHARPEN", "MOVE_CONVERSION", "MOVE_CONVERSION_2",
    "MOVE_BELLY_DRUM", "MOVE_PSYCH_UP", "MOVE_CHARGE", "MOVE_SNATCH",
    "MOVE_TAIL_GLOW", "MOVE_COSMIC_POWER", "MOVE_IRON_DEFENSE", "MOVE_HOWL",
    "MOVE_BULK_UP", "MOVE_CALM_MIND", "MOVE_DRAGON_DANCE",
  ]),
  Object.freeze([
    "MOVE_SING", "MOVE_SUPERSONIC", "MOVE_DISABLE", "MOVE_LEECH_SEED",
    "MOVE_POISON_POWDER", "MOVE_STUN_SPORE", "MOVE_SLEEP_POWDER",
    "MOVE_THUNDER_WAVE", "MOVE_TOXIC", "MOVE_HYPNOSIS", "MOVE_CONFUSE_RAY",
    "MOVE_GLARE", "MOVE_POISON_GAS", "MOVE_LOVELY_KISS", "MOVE_SPORE",
    "MOVE_SPIDER_WEB", "MOVE_SWEET_KISS", "MOVE_SPIKES", "MOVE_SWAGGER",
    "MOVE_MEAN_LOOK", "MOVE_ATTRACT", "MOVE_ENCORE", "MOVE_TORMENT",
    "MOVE_FLATTER", "MOVE_WILL_O_WISP", "MOVE_TAUNT", "MOVE_YAWN",
    "MOVE_IMPRISON", "MOVE_SNATCH", "MOVE_TEETER_DANCE",
    "MOVE_GRASS_WHISTLE", "MOVE_BLOCK",
  ]),
  Object.freeze([
    "MOVE_MIST", "MOVE_RECOVER", "MOVE_LIGHT_SCREEN", "MOVE_HAZE",
    "MOVE_REFLECT", "MOVE_SOFT_BOILED", "MOVE_REST", "MOVE_PROTECT",
    "MOVE_DETECT", "MOVE_ENDURE", "MOVE_MILK_DRINK", "MOVE_HEAL_BELL",
    "MOVE_SAFEGUARD", "MOVE_BATON_PASS", "MOVE_MORNING_SUN",
    "MOVE_SYNTHESIS", "MOVE_MOONLIGHT", "MOVE_SWALLOW", "MOVE_WISH",
    "MOVE_INGRAIN", "MOVE_MAGIC_COAT", "MOVE_RECYCLE", "MOVE_REFRESH",
    "MOVE_MUD_SPORT", "MOVE_SLACK_OFF", "MOVE_AROMATHERAPY",
    "MOVE_WATER_SPORT",
  ]),
  Object.freeze([
    "MOVE_GUILLOTINE", "MOVE_HORN_DRILL", "MOVE_DOUBLE_EDGE",
    "MOVE_HYPER_BEAM", "MOVE_COUNTER", "MOVE_FISSURE", "MOVE_BIDE",
    "MOVE_SELF_DESTRUCT", "MOVE_SKY_ATTACK", "MOVE_EXPLOSION", "MOVE_FLAIL",
    "MOVE_REVERSAL", "MOVE_DESTINY_BOND", "MOVE_PERISH_SONG",
    "MOVE_PAIN_SPLIT", "MOVE_MIRROR_COAT", "MOVE_MEMENTO", "MOVE_GRUDGE",
    "MOVE_FACADE", "MOVE_FOCUS_PUNCH", "MOVE_BLAST_BURN",
    "MOVE_HYDRO_CANNON", "MOVE_OVERHEAT", "MOVE_FRENZY_PLANT",
    "MOVE_PSYCHO_BOOST", "MOVE_VOLT_TACKLE",
  ]),
  Object.freeze([
    "MOVE_SAND_ATTACK", "MOVE_TAIL_WHIP", "MOVE_LEER", "MOVE_GROWL",
    "MOVE_STRING_SHOT", "MOVE_SCREECH", "MOVE_SMOKESCREEN", "MOVE_KINESIS",
    "MOVE_FLASH", "MOVE_COTTON_SPORE", "MOVE_SPITE", "MOVE_SCARY_FACE",
    "MOVE_CHARM", "MOVE_KNOCK_OFF", "MOVE_SWEET_SCENT",
    "MOVE_FEATHER_DANCE", "MOVE_FAKE_TEARS", "MOVE_METAL_SOUND",
    "MOVE_TICKLE",
  ]),
  Object.freeze([
    "MOVE_MIMIC", "MOVE_METRONOME", "MOVE_MIRROR_MOVE", "MOVE_TRANSFORM",
    "MOVE_SUBSTITUTE", "MOVE_SKETCH", "MOVE_CURSE", "MOVE_PRESENT",
    "MOVE_FOLLOW_ME", "MOVE_TRICK", "MOVE_ROLE_PLAY", "MOVE_ASSIST",
    "MOVE_SKILL_SWAP", "MOVE_CAMOUFLAGE",
  ]),
  Object.freeze([
    "MOVE_SANDSTORM", "MOVE_RAIN_DANCE", "MOVE_SUNNY_DAY", "MOVE_HAIL",
    "MOVE_WEATHER_BALL",
  ]),
]);

function moveIds(symbols: readonly string[], style: number): ReadonlySet<number> {
  const ids = symbols.map((symbol) => {
    const id = MOVE_ID_BY_SYMBOL.get(symbol);
    if (id === undefined) throw new Error(`Unknown style-${style} move ${symbol}`);
    return id;
  });
  return new Set(ids);
}

const STYLE_MOVE_IDS = FACTORY_STYLE_MOVE_SYMBOLS.map(moveIds);

export function getFactoryMoveBattleStyle(move: number): FactoryBattleStyle {
  // GetMoveBattleStyle scans style arrays in enum order and returns at the
  // first match. This matters for SNATCH, present in styles 1 and 2.
  for (let style = FACTORY_STYLE.PREPARATION; style < FACTORY_STYLE.FLEXIBLE; style += 1) {
    if (STYLE_MOVE_IDS[style]!.has(move)) return style as FactoryBattleStyle;
  }
  return FACTORY_STYLE.NONE;
}

export type FactoryFavoriteType = Readonly<{
  result: FactoryFavoriteTypeResult;
  counts: readonly number[];
}>;

export function getFactoryOpponentFavoriteType(
  party: FactoryCommentaryParty,
): FactoryFavoriteType {
  const counts = Array<number>(FACTORY_NO_FAVORITE_TYPE).fill(0);
  for (const mon of party) {
    const types = SPECIES_TYPES.get(mon.speciesName);
    if (types === undefined) throw new Error(`Unknown Factory party species ${mon.speciesName}`);
    counts[types[0]] += 1;
    if (types[0] !== types[1]) counts[types[1]] += 1;
  }

  // Preserve the source's two-slot scan literally. In particular, slot 1 is
  // updated on equality but is not reset when a later type becomes the max.
  let mostCommon = 0;
  let secondMostCommon = 0;
  for (let type = 1; type < FACTORY_NO_FAVORITE_TYPE; type += 1) {
    if (counts[mostCommon]! < counts[type]!) {
      mostCommon = type;
    } else if (counts[mostCommon] === counts[type]) {
      secondMostCommon = type;
    }
  }

  let result: FactoryFavoriteTypeResult = FACTORY_NO_FAVORITE_TYPE;
  if (counts[mostCommon] !== 0) {
    if (
      counts[mostCommon]! > counts[secondMostCommon]!
      || mostCommon === secondMostCommon
    ) {
      result = mostCommon as FactoryTypeId;
    }
  }
  return Object.freeze({ result, counts: Object.freeze(counts) });
}

export type FactoryStyleTally = Readonly<{
  result: FactoryBattleStyle;
  points: readonly number[];
  qualifyingStyles: readonly FactoryBattleStyle[];
}>;

export function getFactoryOpponentBattleStyle(
  party: FactoryCommentaryParty,
): FactoryStyleTally {
  const points = Array<number>(FACTORY_STYLE.FLEXIBLE).fill(0);
  for (const mon of party) {
    for (const move of mon.moves) points[getFactoryMoveBattleStyle(move)]! += 1;
  }

  const qualifyingStyles: FactoryBattleStyle[] = [];
  let result: FactoryBattleStyle = FACTORY_STYLE.NONE;
  for (let style = FACTORY_STYLE.PREPARATION; style < FACTORY_STYLE.FLEXIBLE; style += 1) {
    if (points[style]! >= FACTORY_STYLE_REQUIRED_MOVE_COUNTS[style]!) {
      result = style as FactoryBattleStyle;
      qualifyingStyles.push(result);
    }
  }
  if (qualifyingStyles.length > 2) result = FACTORY_STYLE.FLEXIBLE;
  return Object.freeze({
    result,
    points: Object.freeze(points),
    qualifyingStyles: Object.freeze(qualifyingStyles),
  });
}

const FAVORITE_TYPE_LINES = new Map<FactoryFavoriteTypeResult, readonly [string, string]>([
  [0, ["The TRAINER is apparently skilled", "in the handling of the NORMAL type."]],
  [1, ["The TRAINER is apparently skilled", "in the handling of the FIGHTING type."]],
  [2, ["The TRAINER is apparently skilled", "in the handling of the FLYING type."]],
  [3, ["The TRAINER is apparently skilled", "in the handling of the POISON type."]],
  [4, ["The TRAINER is apparently skilled", "in the handling of the GROUND type."]],
  [5, ["The TRAINER is apparently skilled", "in the handling of the ROCK type."]],
  [6, ["The TRAINER is apparently skilled", "in the handling of the BUG type."]],
  [7, ["The TRAINER is apparently skilled", "in the handling of the GHOST type."]],
  [8, ["The TRAINER is apparently skilled", "in the handling of the STEEL type."]],
  // TYPE_MYSTERY (9) is counted by the C function but has no script branch.
  [10, ["The TRAINER is apparently skilled", "in the handling of the FIRE type."]],
  [11, ["The TRAINER is apparently skilled", "in the handling of the WATER type."]],
  [12, ["The TRAINER is apparently skilled", "in the handling of the GRASS type."]],
  [13, ["The TRAINER is apparently skilled", "in the handling of the ELECTRIC type."]],
  [14, ["The TRAINER is apparently skilled", "in the handling of the PSYCHIC type."]],
  [15, ["The TRAINER is apparently skilled", "in the handling of the ICE type."]],
  [16, ["The TRAINER is apparently skilled", "in the handling of the DRAGON type."]],
  [17, ["The TRAINER is apparently skilled", "in the handling of the DARK type."]],
  [18, ["The TRAINER appears to have no clear", "favorites when it comes to type."]],
]);

const STYLE_LINES: Readonly<Record<FactoryBattleStyle, readonly [string, string]>> = {
  0: ["The favorite battle style appears to", "be free-spirited and unrestrained."],
  1: ["The favorite battle style appears to", "be one based on total preparation."],
  2: ["The favorite battle style appears to", "be slow and steady."],
  3: ["The favorite battle style appears to", "be one of endurance."],
  4: ["The favorite battle style appears to", "be high risk, high return."],
  5: ["The favorite battle style appears", "to be weakening the foe to start."],
  6: ["The favorite battle style appears to", "be impossible to predict."],
  7: ["The favorite battle style appears to", "depend on the battle's flow."],
  8: ["The favorite battle style appears to", "be flexibly adaptable to the situation."],
};

export type FactoryOpponentCommentary = Readonly<{
  favoriteType: FactoryFavoriteType;
  battleStyle: FactoryStyleTally;
  favoriteTypeLines: readonly [string, string] | null;
  battleStyleLines: readonly [string, string];
}>;

/** Adapter-ready script/presentation data for the attendant's two result pages. */
export function getFactoryOpponentCommentary(
  party: FactoryCommentaryParty,
): FactoryOpponentCommentary {
  const favoriteType = getFactoryOpponentFavoriteType(party);
  const battleStyle = getFactoryOpponentBattleStyle(party);
  return Object.freeze({
    favoriteType,
    battleStyle,
    favoriteTypeLines: FAVORITE_TYPE_LINES.get(favoriteType.result) ?? null,
    battleStyleLines: STYLE_LINES[battleStyle.result],
  });
}
