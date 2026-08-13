import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cosmicPowerAtAge,
  cosmicPowerDisplayedBlendCoefficient,
  COSMIC_POWER_SOURCE_END_EXCLUSIVE,
  COSMIC_POWER_SOURCE_START,
} from "../../src/animation/cosmicPower.ts";

const center = { x: 72, y: 104 };

describe("Move_COSMIC_POWER source reducer", () => {
  it("pins set 222 to internal species 348 Lunatone and stages its real identity", () => {
    const species = readFileSync(
      "reference/pokeemerald/include/constants/species.h",
      "utf8",
    );
    const sets = readFileSync(
      "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "utf8",
    );
    expect(species).toContain("#define SPECIES_ELECTRIKE 337");
    expect(species).toContain("#define SPECIES_LUNATONE 348");
    expect(sets).toMatch(
      /\[FRONTIER_MON_LUNATONE_1\] = \{\s*\.species = SPECIES_LUNATONE,\s*\.moves = \{MOVE_CONFUSION, MOVE_COSMIC_POWER, MOVE_LIGHT_SCREEN, MOVE_SANDSTORM\},\s*\.itemTableId = BATTLE_FRONTIER_ITEM_SITRUS_BERRY,\s*\.evSpread = F_EV_SPREAD_DEFENSE \| F_EV_SPREAD_HP,\s*\.nature = NATURE_QUIET/s,
    );

    for (const path of [
      "tools/battle-lab/mechanic-cosmic-power-player-lunatone-opponent-onix.json",
      "tools/battle-lab/mechanic-cosmic-power-opponent-lunatone-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8"));
      const lunatoneSide = path.includes("player-lunatone")
        ? scenario.overrides.parties.player
        : scenario.overrides.parties.opponent;
      expect(lunatoneSide).toHaveLength(3);
      expect(lunatoneSide).toEqual(Array.from({ length: 3 }, () => ({
        species: 348,
        level: 50,
        nature: 17,
        ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
        evs: { hp: 255, attack: 0, defense: 255, speed: 0, spAttack: 0, spDefense: 0 },
        moves: [322, 322, 322, 322],
        ppUps: [0, 0, 0, 0],
        item: 142,
        abilitySlot: 0,
        friendship: 70,
        gender: "genderless",
        shiny: false,
      })));
    }
  });

  it("pins the exclusive source interval and first inactive cleanup row", () => {
    expect(COSMIC_POWER_SOURCE_START).toBe(0x082d5f5d);
    expect(COSMIC_POWER_SOURCE_END_EXCLUSIVE).toBe(0x082d5fe2);
  });

  it("keeps the two non-attacker palette ramps one display behind task RAM", () => {
    expect(cosmicPowerAtAge(3, "player", center).nonAttackerBlendTaskActive).toBe(false);
    expect(cosmicPowerAtAge(4, "player", center).nonAttackerBlendRamCoefficient).toBe(2);
    expect(cosmicPowerDisplayedBlendCoefficient(4)).toBe(1);
    expect(cosmicPowerDisplayedBlendCoefficient(18)).toBe(15);
    expect(cosmicPowerAtAge(17, "player", center).nonAttackerBlendRamCoefficient).toBe(15);
    expect(cosmicPowerAtAge(181, "player", center).nonAttackerBlendRamCoefficient).toBe(13);
    expect(cosmicPowerDisplayedBlendCoefficient(181)).toBe(14);
    expect(cosmicPowerDisplayedBlendCoefficient(195)).toBe(0);
  });

  it("models the measured fade and two-frame sliding BG cadence", () => {
    expect(cosmicPowerAtAge(19, "player", center).bldcnt).toBe(0);
    expect(cosmicPowerAtAge(20, "player", center).bldy).toBe(0);
    expect(cosmicPowerAtAge(20, "player", center).bldcnt).toBe(232);
    expect(cosmicPowerAtAge(36, "player", center).bldy).toBe(16);
    expect(cosmicPowerAtAge(38, "player", center).background).toBe("cosmic");
    expect(cosmicPowerAtAge(40, "player", center).bg3vofs).toBe(1);
    expect(cosmicPowerAtAge(41, "player", center).bg3vofs).toBe(1);
    expect(cosmicPowerAtAge(220, "player", center).bg3vofs).toBe(91);
    expect(cosmicPowerAtAge(221, "player", center).bg3vofs).toBe(0);
    expect(cosmicPowerAtAge(220, "player", center).background).toBe("cosmic");
    expect(cosmicPowerAtAge(221, "player", center).background).toBe("battle");
    expect(cosmicPowerAtAge(238, "player", center).bldy).toBe(0);
  });

  it("orients source sounds and GrantingStars without changing their ages", () => {
    const player = cosmicPowerAtAge(129, "player", center);
    const opponent = cosmicPowerAtAge(129, "opponent", center);
    expect(player.audio).toEqual([{
      age: 129,
      player: "SE1",
      song: "SE_M_MORNING_SUN",
      pan: -64,
    }]);
    expect(opponent.audio[0]?.pan).toBe(63);
    expect(cosmicPowerAtAge(129, "player", center).sprites).toHaveLength(1);
    expect(cosmicPowerAtAge(139, "player", center).sprites).toHaveLength(2);
    expect(cosmicPowerAtAge(189, "player", center).sprites[0]?.y2).toBe(7);
    expect(cosmicPowerAtAge(199, "player", center).sprites[0]?.y2).toBe(7);
    expect(cosmicPowerAtAge(240, "player", center).active).toBe(false);
    expect(cosmicPowerAtAge(240, "player", center).sprites).toEqual([]);
    expect(cosmicPowerAtAge(0, "player", center).resources.sparkle2Loaded).toBe(false);
    expect(cosmicPowerAtAge(1, "player", center).resources.sparkle2Loaded).toBe(true);
    expect(cosmicPowerAtAge(240, "player", center).resources.sparkle2Loaded).toBe(false);
  });
});
