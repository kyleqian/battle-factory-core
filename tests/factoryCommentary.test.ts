import { describe, expect, it } from "vitest";
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import {
  FACTORY_NO_FAVORITE_TYPE,
  FACTORY_STYLE,
  FACTORY_STYLE_MOVE_SYMBOLS,
  FACTORY_STYLE_REQUIRED_MOVE_COUNTS,
  FACTORY_TYPE_SYMBOLS,
  getFactoryMoveBattleStyle,
  getFactoryOpponentBattleStyle,
  getFactoryOpponentCommentary,
  getFactoryOpponentFavoriteType,
  type FactoryCommentaryParty,
  type FactoryCommentaryPartyMember,
  type FactoryTypeId,
} from "../src/engine/factoryCommentary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { POSTWIN_SCOUTING_LINES } from "../src/engine/postwin.ts";

type MoveRow = Readonly<{ move: string; id: number }>;
const MOVE_ID = new Map(
  (movesData as { moves: MoveRow[] }).moves.map((row) => [row.move, row.id]),
);

function move(symbol: string): number {
  const id = MOVE_ID.get(symbol);
  if (id === undefined) throw new Error(`unknown test move ${symbol}`);
  return id;
}

const NEUTRAL = move("MOVE_POUND");
const NEUTRAL_MOVES = [NEUTRAL, NEUTRAL, NEUTRAL, NEUTRAL] as const;

function member(
  speciesName: string,
  moves: readonly [number, number, number, number] = NEUTRAL_MOVES,
): FactoryCommentaryPartyMember {
  return { speciesName, moves };
}

function partyWithSpecies(species: readonly [string, string, string]): FactoryCommentaryParty {
  return species.map((name) => member(name)) as unknown as FactoryCommentaryParty;
}

function partyWithMoves(symbols: readonly string[]): FactoryCommentaryParty {
  const ids = [...symbols.map(move)];
  while (ids.length < 12) ids.push(NEUTRAL);
  if (ids.length !== 12) throw new Error(`test party needs at most 12 moves, got ${ids.length}`);
  return [0, 1, 2].map((mon) => member(
    ["SPECIES_RATTATA", "SPECIES_MEOWTH", "SPECIES_AIPOM"][mon]!,
    ids.slice(mon * 4, mon * 4 + 4) as [number, number, number, number],
  )) as unknown as FactoryCommentaryParty;
}

const FAVORITE_TYPE_PARTIES: readonly [
  FactoryTypeId,
  string,
  readonly [string, string, string],
][] = [
  [0, "NORMAL", ["SPECIES_RATTATA", "SPECIES_MEOWTH", "SPECIES_AIPOM"]],
  [1, "FIGHTING", ["SPECIES_MANKEY", "SPECIES_MACHOP", "SPECIES_HITMONLEE"]],
  [2, "FLYING", ["SPECIES_PIDGEY", "SPECIES_MURKROW", "SPECIES_BUTTERFREE"]],
  [3, "POISON", ["SPECIES_EKANS", "SPECIES_GRIMER", "SPECIES_GULPIN"]],
  [4, "GROUND", ["SPECIES_SANDSHREW", "SPECIES_DIGLETT", "SPECIES_CUBONE"]],
  [5, "ROCK", ["SPECIES_SUDOWOODO", "SPECIES_NOSEPASS", "SPECIES_REGIROCK"]],
  [6, "BUG", ["SPECIES_PINSIR", "SPECIES_PINECO", "SPECIES_VOLBEAT"]],
  [7, "GHOST", ["SPECIES_MISDREAVUS", "SPECIES_DUSKULL", "SPECIES_SHUPPET"]],
  [8, "STEEL", ["SPECIES_MAWILE", "SPECIES_REGISTEEL", "SPECIES_BELDUM"]],
  [10, "FIRE", ["SPECIES_VULPIX", "SPECIES_MAGBY", "SPECIES_SLUGMA"]],
  [11, "WATER", ["SPECIES_SQUIRTLE", "SPECIES_PSYDUCK", "SPECIES_POLIWAG"]],
  [12, "GRASS", ["SPECIES_CHIKORITA", "SPECIES_TANGELA", "SPECIES_TREECKO"]],
  [13, "ELECTRIC", ["SPECIES_PIKACHU", "SPECIES_MAREEP", "SPECIES_ELEKID"]],
  [14, "PSYCHIC", ["SPECIES_ABRA", "SPECIES_DROWZEE", "SPECIES_RALTS"]],
  [15, "ICE", ["SPECIES_JYNX", "SPECIES_SWINUB", "SPECIES_DELIBIRD"]],
  [16, "DRAGON", ["SPECIES_DRATINI", "SPECIES_BAGON", "SPECIES_SHELGON"]],
  [17, "DARK", ["SPECIES_UMBREON", "SPECIES_POOCHYENA", "SPECIES_ABSOL"]],
];

describe("Battle Factory favorite-type commentary", () => {
  it.each(FAVORITE_TYPE_PARTIES)(
    "selects source type %i (%s) as the unique most-common outcome",
    (type, spokenName, species) => {
      const result = getFactoryOpponentCommentary(partyWithSpecies(species));
      expect(result.favoriteType.result).toBe(type);
      expect(FACTORY_TYPE_SYMBOLS[type]).toBe(`TYPE_${spokenName}`);
      expect(result.favoriteTypeLines).toEqual([
        "The TRAINER is apparently skilled",
        `in the handling of the ${spokenName} type.`,
      ]);
    },
  );

  it("counts a dual type once per distinct slot but a repeated monotype only once", () => {
    const duals = getFactoryOpponentFavoriteType(partyWithSpecies([
      "SPECIES_PIDGEY", // NORMAL / FLYING
      "SPECIES_MURKROW", // DARK / FLYING
      "SPECIES_BUTTERFREE", // BUG / FLYING
    ]));
    const monotypes = getFactoryOpponentFavoriteType(partyWithSpecies([
      "SPECIES_RATTATA", "SPECIES_MEOWTH", "SPECIES_AIPOM",
    ]));

    expect(duals.counts[2]).toBe(3);
    expect(duals.counts[0]).toBe(1);
    expect(duals.counts[6]).toBe(1);
    expect(duals.counts[17]).toBe(1);
    expect(monotypes.counts[0]).toBe(3);
  });

  it("returns NUMBER_OF_MON_TYPES for a top tie, independent of type ordering", () => {
    const earlyLateTie = getFactoryOpponentCommentary(partyWithSpecies([
      "SPECIES_RATTATA", "SPECIES_MANKEY", "SPECIES_ABSOL",
    ]));
    const dualTie = getFactoryOpponentCommentary(partyWithSpecies([
      "SPECIES_ONIX", // ROCK / GROUND
      "SPECIES_MAGNEMITE", // ELECTRIC / STEEL
      "SPECIES_SNEASEL", // DARK / ICE
    ]));

    expect(earlyLateTie.favoriteType.result).toBe(FACTORY_NO_FAVORITE_TYPE);
    expect(dualTie.favoriteType.result).toBe(FACTORY_NO_FAVORITE_TYPE);
    expect(earlyLateTie.favoriteTypeLines).toEqual([
      "The TRAINER appears to have no clear",
      "favorites when it comes to type.",
    ]);
  });

  it("documents the sole tally-only type exclusion from the script surface", () => {
    // GetOpponentMostCommonMonType scans id 9 like all other ids, but no real
    // species has TYPE_MYSTERY and scripts.inc has no call_if_eq for it.
    expect(FACTORY_TYPE_SYMBOLS[9]).toBe("TYPE_MYSTERY");
    expect(FAVORITE_TYPE_PARTIES.map(([id]) => id)).not.toContain(9);
  });
});

const STYLE_CASES: readonly [
  number,
  string,
  readonly string[],
  readonly [string, string],
][] = [
  [FACTORY_STYLE.NONE, "unrestrained", [], [
    "The favorite battle style appears to", "be free-spirited and unrestrained.",
  ]],
  [FACTORY_STYLE.PREPARATION, "preparation", [
    "MOVE_SWORDS_DANCE", "MOVE_GROWTH", "MOVE_MEDITATE",
  ], ["The favorite battle style appears to", "be one based on total preparation."]],
  [FACTORY_STYLE.SLOW_STEADY, "slow and steady", [
    "MOVE_SING", "MOVE_SUPERSONIC", "MOVE_DISABLE",
  ], ["The favorite battle style appears to", "be slow and steady."]],
  [FACTORY_STYLE.ENDURANCE, "endurance", [
    "MOVE_MIST", "MOVE_RECOVER", "MOVE_LIGHT_SCREEN",
  ], ["The favorite battle style appears to", "be one of endurance."]],
  [FACTORY_STYLE.HIGH_RISK, "high risk", [
    "MOVE_GUILLOTINE", "MOVE_HORN_DRILL",
  ], ["The favorite battle style appears to", "be high risk, high return."]],
  [FACTORY_STYLE.WEAKENING, "weakening", [
    "MOVE_SAND_ATTACK", "MOVE_TAIL_WHIP",
  ], ["The favorite battle style appears", "to be weakening the foe to start."]],
  [FACTORY_STYLE.UNPREDICTABLE, "unpredictable", [
    "MOVE_MIMIC", "MOVE_METRONOME",
  ], ["The favorite battle style appears to", "be impossible to predict."]],
  [FACTORY_STYLE.WEATHER, "weather", [
    "MOVE_SANDSTORM", "MOVE_RAIN_DANCE",
  ], ["The favorite battle style appears to", "depend on the battle's flow."]],
  [FACTORY_STYLE.FLEXIBLE, "no singular style", [
    "MOVE_SWORDS_DANCE", "MOVE_GROWTH", "MOVE_MEDITATE",
    "MOVE_GUILLOTINE", "MOVE_HORN_DRILL",
    "MOVE_SANDSTORM", "MOVE_RAIN_DANCE",
  ], ["The favorite battle style appears to", "be flexibly adaptable to the situation."]],
];

describe("Battle Factory battle-style commentary", () => {
  it("classifies every entry in the seven source move tables", () => {
    expect(FACTORY_STYLE_MOVE_SYMBOLS.map((moves) => moves.length)).toEqual([
      0, 27, 32, 27, 26, 19, 14, 5,
    ]);
    for (
      let listedStyle = FACTORY_STYLE.PREPARATION;
      listedStyle < FACTORY_STYLE.FLEXIBLE;
      listedStyle += 1
    ) {
      for (const symbol of FACTORY_STYLE_MOVE_SYMBOLS[listedStyle]!) {
        const expected = symbol === "MOVE_SNATCH"
          ? FACTORY_STYLE.PREPARATION
          : listedStyle;
        expect(getFactoryMoveBattleStyle(move(symbol)), symbol).toBe(expected);
      }
    }
  });

  it.each(STYLE_CASES)(
    "enumerates result %i (%s)",
    (style, _description, moves, expectedLines) => {
      const result = getFactoryOpponentCommentary(partyWithMoves(moves));
      expect(result.battleStyle.result).toBe(style);
      expect(result.battleStyleLines).toEqual(expectedLines);
      if (style > FACTORY_STYLE.NONE && style < FACTORY_STYLE.FLEXIBLE) {
        expect(result.battleStyle.points[style]).toBeGreaterThanOrEqual(
          FACTORY_STYLE_REQUIRED_MOVE_COUNTS[style]!,
        );
      }
    },
  );

  it("uses first-list wins for SNATCH, which source lists in two styles", () => {
    expect(getFactoryMoveBattleStyle(move("MOVE_SNATCH"))).toBe(
      FACTORY_STYLE.PREPARATION,
    );
  });

  it("selects the later enum when exactly two styles qualify", () => {
    const result = getFactoryOpponentBattleStyle(partyWithMoves([
      "MOVE_GUILLOTINE", "MOVE_HORN_DRILL",
      "MOVE_SAND_ATTACK", "MOVE_TAIL_WHIP",
    ]));
    expect(result.qualifyingStyles).toEqual([
      FACTORY_STYLE.HIGH_RISK,
      FACTORY_STYLE.WEAKENING,
    ]);
    expect(result.result).toBe(FACTORY_STYLE.WEAKENING);
  });

  it("switches to no-singular-style only when more than two styles qualify", () => {
    const two = getFactoryOpponentBattleStyle(partyWithMoves([
      "MOVE_GUILLOTINE", "MOVE_HORN_DRILL",
      "MOVE_SAND_ATTACK", "MOVE_TAIL_WHIP",
    ]));
    const three = getFactoryOpponentBattleStyle(partyWithMoves([
      "MOVE_GUILLOTINE", "MOVE_HORN_DRILL",
      "MOVE_SAND_ATTACK", "MOVE_TAIL_WHIP",
      "MOVE_MIMIC", "MOVE_METRONOME",
    ]));
    expect(two.qualifyingStyles).toHaveLength(2);
    expect(two.result).toBe(FACTORY_STYLE.WEAKENING);
    expect(three.qualifyingStyles).toHaveLength(3);
    expect(three.result).toBe(FACTORY_STYLE.FLEXIBLE);
  });
});

describe("rung-8 generated opponent integration", () => {
  const base = {
    factoryWinStreak: 0,
    battleIndex: 0,
    storedTrainerIds: [] as readonly number[],
    savedRentalSetIds: [110, 155, 140, 168, 197, 147] as const,
    playerTrainerId: 0x1234_5678,
    battleTowerLevel50WinStreak: 0,
  };

  it("two different generation seeds produce materially different predictions", () => {
    const seed1 = generateFactoryOpponent({ ...base, rngValue: 1 });
    const seed3 = generateFactoryOpponent({ ...base, rngValue: 3 });
    const commentary1 = getFactoryOpponentCommentary(seed1.party);
    const commentary3 = getFactoryOpponentCommentary(seed3.party);

    // These are the full createFactoryCorpusPartyMember records built by rung
    // 8, not hand-authored commentary fixtures.
    expect(seed1.opponents.map((mon) => [mon.setId, mon.speciesName])).toEqual([
      [165, "SPECIES_WEEPINBELL"],
      [198, "SPECIES_MASQUERAIN"],
      [129, "SPECIES_SKIPLOOM"],
    ]);
    expect(seed3.opponents.map((mon) => [mon.setId, mon.speciesName])).toEqual([
      [156, "SPECIES_ONIX"],
      [180, "SPECIES_BAYLEEF"],
      [122, "SPECIES_ARON"],
    ]);
    expect(commentary1.favoriteType.result).toBe(FACTORY_NO_FAVORITE_TYPE);
    expect(commentary1.battleStyle.result).toBe(FACTORY_STYLE.WEAKENING);
    expect(commentary3.favoriteType.result).toBe(5);
    expect(commentary3.battleStyle.result).toBe(FACTORY_STYLE.NONE);
    expect(commentary1.favoriteTypeLines).not.toEqual(commentary3.favoriteTypeLines);
    expect(commentary1.battleStyleLines).not.toEqual(commentary3.battleStyleLines);
  });

  it("predicts the canonical OFF scouting trace's generated set trio", () => {
    const canonical = [
      createFactoryCorpusPartyMember({
        setId: 153, personality: 24, fixedIv: 3, abilitySlot: 0,
      }),
      createFactoryCorpusPartyMember({
        setId: 179, personality: 19, fixedIv: 3, abilitySlot: 1,
      }),
      createFactoryCorpusPartyMember({
        setId: 181, personality: 6, fixedIv: 3, abilitySlot: 0,
      }),
    ] as const;
    const commentary = getFactoryOpponentCommentary(canonical);

    expect(canonical.map((mon) => [mon.setId, mon.speciesName])).toEqual([
      [153, "SPECIES_BUTTERFREE"],
      [179, "SPECIES_HAUNTER"],
      [181, "SPECIES_QUILAVA"],
    ]);
    expect(commentary.favoriteType.result).toBe(FACTORY_NO_FAVORITE_TYPE);
    expect(commentary.battleStyle.result).toBe(FACTORY_STYLE.WEAKENING);
    expect(commentary.favoriteTypeLines).toEqual([
      "The TRAINER appears to have no clear",
      "favorites when it comes to type.",
    ]);
    expect(commentary.battleStyleLines).toEqual([
      "The favorite battle style appears",
      "to be weakening the foe to start.",
    ]);
    expect([
      commentary.favoriteTypeLines,
      commentary.battleStyleLines,
    ]).toEqual([
      POSTWIN_SCOUTING_LINES[1],
      POSTWIN_SCOUTING_LINES[2],
    ]);
  });
});
