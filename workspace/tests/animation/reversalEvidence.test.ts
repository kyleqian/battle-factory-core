import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = (name: string) =>
  JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8"));
const scenario = (name: string) =>
  JSON.parse(readFileSync(`tools/battle-lab/${name}`, "utf8"));
const read = (path: string) => readFileSync(path, "utf8");

const frontierMons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const frontierIds = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const speciesIds = read("reference/pokeemerald/include/constants/species.h");
const speciesInfo = read(
  "reference/pokeemerald/src/data/pokemon/species_info.h",
);
const factory = read("reference/pokeemerald/src/battle_factory.c");
const battleTower = read("reference/pokeemerald/src/battle_tower.c");
const itemIds = read("reference/pokeemerald/include/constants/items.h");

const block = (source: string, start: string, end: string) => {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  expect(first, `missing ${start}`).toBeGreaterThanOrEqual(0);
  expect(last, `missing ${end}`).toBeGreaterThan(first);
  return source.slice(first, last);
};

const records = [
  {
    set: 267,
    setName: "DELCATTY_2",
    species: 316,
    speciesName: "DELCATTY",
    moves: [313, 47, 85, 58],
    moveNames: ["FAKE_TEARS", "SING", "THUNDERBOLT", "ICE_BEAM"],
    item: 183,
    itemName: "QUICK_CLAW",
    evs: { hp: 0, attack: 0, defense: 0, speed: 255, spAttack: 255, spDefense: 0 },
    spread: ["SP_ATTACK", "SPEED"],
    nature: 15,
    natureName: "MODEST",
    gender: "female",
    genderSource: "PERCENT_FEMALE(75)",
    abilities: ["ABILITY_CUTE_CHARM", "ABILITY_NONE"],
  },
  {
    set: 268,
    setName: "SABLEYE_2",
    species: 322,
    speciesName: "SABLEYE",
    moves: [247, 185, 109, 105],
    moveNames: ["SHADOW_BALL", "FAINT_ATTACK", "CONFUSE_RAY", "RECOVER"],
    item: 141,
    itemName: "LUM_BERRY",
    evs: { hp: 170, attack: 170, defense: 0, speed: 0, spAttack: 170, spDefense: 0 },
    spread: ["SP_ATTACK", "ATTACK", "HP"],
    nature: 24,
    natureName: "QUIRKY",
    gender: "male",
    genderSource: "PERCENT_FEMALE(50)",
    abilities: ["ABILITY_KEEN_EYE", "ABILITY_NONE"],
  },
  {
    set: 269,
    setName: "LICKITUNG_2",
    species: 108,
    speciesName: "LICKITUNG",
    moves: [89, 34, 247, 157],
    moveNames: ["EARTHQUAKE", "BODY_SLAM", "SHADOW_BALL", "ROCK_SLIDE"],
    item: 133,
    itemName: "CHERI_BERRY",
    evs: { hp: 0, attack: 170, defense: 170, speed: 0, spAttack: 0, spDefense: 170 },
    spread: ["SP_DEFENSE", "DEFENSE", "ATTACK"],
    nature: 3,
    natureName: "ADAMANT",
    gender: "male",
    genderSource: "PERCENT_FEMALE(50)",
    abilities: ["ABILITY_OWN_TEMPO", "ABILITY_OBLIVIOUS"],
  },
  {
    set: 326,
    setName: "VIGOROTH_2",
    species: 365,
    speciesName: "VIGOROTH",
    moves: [306, 179, 203, 247],
    stagedMoves: [179, 179, 179, 179],
    moveNames: ["CRUSH_CLAW", "REVERSAL", "ENDURE", "SHADOW_BALL"],
    item: 170,
    itemName: "SALAC_BERRY",
    evs: { hp: 0, attack: 255, defense: 0, speed: 0, spAttack: 0, spDefense: 255 },
    spread: ["SP_DEFENSE", "ATTACK"],
    nature: 3,
    natureName: "ADAMANT",
    gender: "male",
    genderSource: "PERCENT_FEMALE(50)",
    abilities: ["ABILITY_VITAL_SPIRIT", "ABILITY_NONE"],
  },
  {
    set: 327,
    setName: "LUNATONE_2",
    species: 348,
    speciesName: "LUNATONE",
    moves: [94, 58, 322, 347],
    moveNames: ["PSYCHIC", "ICE_BEAM", "COSMIC_POWER", "CALM_MIND"],
    item: 221,
    itemName: "LAX_INCENSE",
    evs: { hp: 255, attack: 0, defense: 255, speed: 0, spAttack: 0, spDefense: 0 },
    spread: ["DEFENSE", "HP"],
    nature: 17,
    natureName: "QUIET",
    gender: "genderless",
    genderSource: "MON_GENDERLESS",
    abilities: ["ABILITY_LEVITATE", "ABILITY_NONE"],
  },
  {
    set: 328,
    setName: "SOLROCK_2",
    species: 349,
    speciesName: "SOLROCK",
    moves: [89, 157, 322, 315],
    moveNames: ["EARTHQUAKE", "ROCK_SLIDE", "COSMIC_POWER", "OVERHEAT"],
    item: 180,
    itemName: "WHITE_HERB",
    evs: { hp: 255, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 255 },
    spread: ["SP_DEFENSE", "HP"],
    nature: 0,
    natureName: "HARDY",
    gender: "genderless",
    genderSource: "MON_GENDERLESS",
    abilities: ["ABILITY_LEVITATE", "ABILITY_NONE"],
  },
] as const;

describe("MOVE_REVERSAL legal portable evidence fixtures", () => {
  it("proves all six Frontier set/species identities from pinned Emerald source", () => {
    // The mechanic lab writes Emerald's internal species ID directly.
    // 302 is NINJASK, not SABLEYE; the rejected checkpoint used 302.
    expect(speciesIds).toContain("#define SPECIES_NINJASK 302");
    expect(speciesIds).toContain("#define SPECIES_SABLEYE 322");
    for (const [index, record] of records.entries()) {
      expect(frontierIds).toMatch(
        new RegExp(
          `#define FRONTIER_MON_${record.setName}\\s+${record.set}(?:\\s|$)`,
        ),
      );
      expect(speciesIds).toContain(
        `#define SPECIES_${record.speciesName} ${record.species}`,
      );
      const next = records[index + 1];
      const setBlock = block(
        frontierMons,
        `[FRONTIER_MON_${record.setName}]`,
        next
          ? `[FRONTIER_MON_${next.setName}]`
          : "[FRONTIER_MON_NOCTOWL_2]",
      );
      expect(setBlock).toContain(`.species = SPECIES_${record.speciesName}`);
      expect(setBlock).toContain(`.nature = NATURE_${record.natureName}`);
      expect(setBlock).toContain(`BATTLE_FRONTIER_ITEM_${record.itemName}`);
      for (const move of record.moveNames)
        expect(setBlock).toContain(`MOVE_${move}`);
      for (const stat of record.spread)
        expect(setBlock).toContain(`F_EV_SPREAD_${stat}`);

      const monBlock = block(
        speciesInfo,
        `[SPECIES_${record.speciesName}]`,
        "\n    [SPECIES_",
      );
      expect(monBlock).toContain(`.genderRatio = ${record.genderSource}`);
      for (const ability of record.abilities)
        expect(monBlock).toContain(ability);
      expect(itemIds).toContain(
        `#define ITEM_${record.itemName} ${record.item}`,
      );
      expect(battleTower).toContain(
        `[BATTLE_FRONTIER_ITEM_${record.itemName}]`,
      );
    }
  });

  it("pins every complete party field and reverses the exact same six records", () => {
    expect(factory).toContain("{9, 12}");
    expect(factory).toContain("friendship = 0;");
    const byId = new Map(records.map((record) => [record.set, record]));
    const files = [
      ["mechanic-reversal-player-vigoroth-opponent-delcatty.json", [[326, 327, 328], [267, 268, 269]]],
      ["mechanic-reversal-player-delcatty-opponent-vigoroth.json", [[267, 268, 269], [326, 327, 328]]],
    ] as const;
    for (const [file, ids] of files) {
      const value = scenario(file);
      expect([value.playerSetIds, value.opponentSetIds]).toEqual(ids);
      for (const [sideIndex, side] of ["player", "opponent"].entries()) {
        const party = value.overrides.parties[side];
        expect(party).toHaveLength(3);
        party.forEach((mon: Record<string, unknown>, index: number) => {
          const record = byId.get(ids[sideIndex][index])!;
          expect(mon).toEqual({
            species: record.species,
            level: 50,
            nature: record.nature,
            ivs: { hp: 9, attack: 9, defense: 9, speed: 9, spAttack: 9, spDefense: 9 },
            evs: record.evs,
            // Only the active Vigoroth is constrained to its legal Reversal
            // slot in all four positions so either controller must choose it.
            moves: "stagedMoves" in record ? record.stagedMoves : record.moves,
            ppUps: [0, 0, 0, 0],
            item: record.item,
            abilitySlot: 0,
            friendship: 0,
            gender: record.gender,
            shiny: false,
          });
        });
      }
    }
  });

  it("requires complete currentMove and source-owned dense windows", () => {
    const player = fixture("reversal-player-vigoroth-opponent-delcatty.json");
    const opponent = fixture("reversal-player-delcatty-opponent-vigoroth.json");
    for (const value of [player, opponent]) {
      expect(value.oracleProfile).toBe("battle-scene-on");
      expect(value.captureWindow.frameCount).toBeGreaterThan(
        value.sourceWindow.frameCount,
      );
      expect(value.sourceWindow.frameCount).toBe(174);
    }
  });
});
