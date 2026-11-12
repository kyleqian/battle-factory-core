import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import {
  adoptFactoryBrainOpponentSchedule,
  generateFactoryBrainOpponent,
} from "../src/engine/factoryBrainOpponentGeneration.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryRoundBattleOrchestrator } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

// docs/parity-mac/brain-replay-seam.md. The real-ROM replay of a Frontier Brain battle adopts the dice the ROM rolled (three set ids, three personalities) and lets
// the engine derive the rest. ROM seed 1209 (lab `factoryBrain`, challenge 2 = silver Noland): rentals 354 308 274, fillers 268 269 270, player OT 416049562.
// FillFactoryBrainParty accepted sets 351 (Stantler), 328 (Solrock), 355 (Pidgeot); the cursors below are those of each accepted Random32 pair. They sit 29 and 47
// draws apart: after each member's pair come 8 and 10 VBlankIntr draws (main.c:365-366) before the next GetFactoryMonId draw.
const PLAYER_TRAINER_ID = 416049562;
const ROM_1209 = Object.freeze({
  factoryWinStreak: 20,
  playerRentalSetIds: [354, 308, 274, 268, 269, 270],
  playerTrainerId: PLAYER_TRAINER_ID,
  setIds: [351, 328, 355] as const,
  constructionRngValues: [4066449769, 839710244, 3496407749] as const,
});
// The ROM read-back of that party (battle_lab `_party_mon`): [species, personality, ability, item, maxHp, attack, defense, speed, spAttack, spDefense, moves].
const ROM_1209_PARTY = [
  [234, 1661802828, 22, 221, 140, 152, 74, 129, 87, 77, [218, 247, 86, 109]],
  [349, 1202308700, 26, 180, 169, 107, 97, 82, 67, 109, [89, 157, 322, 315]],
  [18, 1013769003, 51, 198, 150, 136, 87, 135, 73, 82, [218, 332, 211, 189]],
] as const;

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
function record(setId: number, fixedIv: number): FactoryRentalRecord {
  const personality = natureByName.get(frontierMonsData.entries[setId]!.nature)!;
  const input = { setId, personality, fixedIv, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

describe("adoptFactoryBrainOpponentSchedule (real-ROM replay seam)", () => {
  it("builds the ROM's silver Noland party of seed 1209 from its three sets and personality cursors", () => {
    const adopted = adoptFactoryBrainOpponentSchedule(ROM_1209);
    expect(adopted.challengeNum).toBe(2);
    expect(adopted.fixedIv).toBe(15); // GetFactoryMonFixedIV(2 + 2, FALSE), battle_factory.c:772
    adopted.opponents.forEach((opponent, index) => {
      const [species, personality, ability, item, maxHp, attack, defense, speed, spAttack, spDefense, moves] = ROM_1209_PARTY[index]!;
      const m = opponent.member;
      expect([m.species, opponent.personality, m.ability, m.item, m.maxHP, m.attack, m.defense, m.speed, m.spAttack, m.spDefense, [...m.moves]], `member ${index}`)
        .toEqual([species, personality, ability, item, maxHp, attack, defense, speed, spAttack, spDefense, [...moves]]);
      expect(opponent.otId).toBe(PLAYER_TRAINER_ID); // battle_factory.c:775
      expect(Object.values(opponent.ivs!)).toEqual([15, 15, 15, 15, 15, 15]);
      expect(opponent.selectionDrawPosition).toBe(-1);
    });
    // Construction draws only: one accepted pair per member, each from its own cursor.
    expect(adopted.drawLedger.map((draw) => [draw.phase, draw.opponentIndex, draw.rngBefore])).toEqual([
      ["personality", 0, 4066449769], ["personality", 0, advanceRngValue(4066449769)],
      ["personality", 1, 839710244], ["personality", 1, advanceRngValue(839710244)],
      ["personality", 2, 3496407749], ["personality", 2, advanceRngValue(3496407749)],
    ]);
    expect(adopted.rngValue).toBe(advanceRngValue(advanceRngValue(3496407749)));
  });

  it("is needed because one cursor does not roll that party: the ROM's roll is interrupted by VBlank draws", () => {
    // 79 draws before the first accepted pair the stream gives set 351 and then Stantler's personality, as the ROM did; the very next draw is set 340 (Girafarig),
    // which the rules accept, while the ROM (8 VBlank draws later) drew set 328.
    let cursor = 4066449769;
    for (let back = 0; back < 79; back += 1) cursor = (Math.imul((cursor - 0x6073) >>> 0, 0xeeb9eb65 | 0)) >>> 0;
    const single = generateFactoryBrainOpponent({
      rngValue: cursor, factoryWinStreak: 20, playerRentalSetIds: ROM_1209.playerRentalSetIds, playerTrainerId: PLAYER_TRAINER_ID,
    });
    expect([single.opponents[0].setId, single.opponents[0].personality]).toEqual([351, 1661802828]);
    expect(single.opponents[1].setId).toBe(340);
  });

  it("gives the same members as the single-cursor generation when handed that generation's own dice", () => {
    for (const [rngValue, factoryWinStreak] of [[1, 20], [0xdecafbad, 41], [77, 48]] as const) {
      const input = { factoryWinStreak, playerRentalSetIds: [0, 1, 2, 3, 4, 5], playerTrainerId: PLAYER_TRAINER_ID };
      const generated = generateFactoryBrainOpponent({ ...input, rngValue });
      const adopted = adoptFactoryBrainOpponentSchedule({
        ...input,
        setIds: generated.opponents.map((opponent) => opponent.setId) as [number, number, number],
        // The cursor right after each member's accepted GetFactoryMonId draw: the personality loop's first pair (and, at streak 48, the random-IV words after it).
        constructionRngValues: generated.opponents.map((opponent) => generated.drawLedger[opponent.selectionDrawPosition]!.rngAfter) as [number, number, number],
      });
      expect(adopted.fixedIv).toBe(generated.fixedIv);
      expect(adopted.rngValue).toBe(generated.rngValue);
      adopted.opponents.forEach((opponent, index) => {
        const { selectionDrawPosition: _a, personalityDrawPositions: _b, ...mine } = opponent;
        const { selectionDrawPosition: _c, personalityDrawPositions: _d, ...theirs } = generated.opponents[index]!;
        expect(mine, `streak ${factoryWinStreak} member ${index}`).toEqual(theirs);
      });
    }
  });

  it("refuses a set the source rules would have rejected at its position (battle_factory.c:781-808)", () => {
    const adopt = (factoryWinStreak: number, setIds: readonly [number, number, number], rentals = ROM_1209.playerRentalSetIds) => () =>
      adoptFactoryBrainOpponentSchedule({ ...ROM_1209, factoryWinStreak, playerRentalSetIds: rentals, setIds });
    expect(adopt(20, [351, 246, 355])).toThrow(/outside the challenge 2 GetFactoryMonId range 267\.\.371/);
    expect(adopt(20, [351, 354, 355])).toThrow(/member 1\) is one the source rules reject: saved-rental-set-id/);
    // Stantler 351 and Masquerain 303 both hold item 221.
    expect(adopt(20, [351, 303, 355])).toThrow(/member 1\) is one the source rules reject: duplicate-item/);
    // Challenge 7 draws from 372..849, where a species has several sets: Claydol 428 and 524.
    expect(adopt(49, [428, 524, 463], [0, 1, 2, 3, 4, 5])).toThrow(/member 1\) is one the source rules reject: duplicate-species/);
  });
});

describe("createFactoryRoundBattleOrchestrator adoptedInitialBrainOpponent (real-ROM replay seam)", () => {
  const playerRentalRecords = [record(354, 9), record(308, 9), record(274, 9)] as const;
  const savedRentalRecords = [...playerRentalRecords, record(268, 9), record(269, 9), record(270, 9)] as const;
  const config = (factoryWinStreak: number, factorySymbolsCount: 0 | 1) => ({
    id: "brain-replay-seam", rngValue: 0, factoryWinStreak, factorySymbolsCount, playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: factoryWinStreak, facilityState: { rentsCount: 0 },
    rentals: { type: "currentRecords" as const, playerRentalRecords, savedRentalRecords },
  });
  const silver = adoptFactoryBrainOpponentSchedule(ROM_1209);
  const FRESH = 0x0bad_cafe;

  it("schedules the adopted party as the silver Brain and seeds the battle from the given cursor", () => {
    const state = createFactoryRoundBattleOrchestrator({ ...config(20, 0), adoptedInitialBrainOpponent: { generation: silver, freshBattleRngValue: FRESH } });
    const scheduled = state.opponentGenerations[0]!;
    expect([scheduled.kind, scheduled.trainerId, scheduled.kind === "frontier-brain" ? scheduled.status : null]).toEqual(["frontier-brain", 1022, "silver"]);
    expect(scheduled.generation).toBe(silver);
    expect(state.round.rules.currentOpponent.frontierBrain?.status).toBe("silver");
    expect(state.round.rules.currentOpponent.rentalRecords?.map((r) => r.setId)).toEqual([351, 328, 355]);
    expect(state.round.rules.rngValue).toBe(FRESH);
    expect(state.rngSegments.map((segment) => [segment.kind, segment.rngBefore, segment.callEnd - segment.callStart])).toEqual([
      ["opponent-construction", 4066449769, 2], ["opponent-construction", 839710244, 2], ["opponent-construction", 3496407749, 2],
    ]);
    expect(state.facilityRngCalls).toBe(6);
  });

  it("schedules a gold Brain at streak 41 with one symbol", () => {
    const base = { factoryWinStreak: 41, playerRentalSetIds: [0, 1, 2, 3, 4, 5], playerTrainerId: PLAYER_TRAINER_ID };
    const generated = generateFactoryBrainOpponent({ ...base, rngValue: 5 });
    const gold = adoptFactoryBrainOpponentSchedule({
      ...base, setIds: generated.opponents.map((o) => o.setId) as [number, number, number],
      constructionRngValues: generated.opponents.map((o) => generated.drawLedger[o.selectionDrawPosition]!.rngAfter) as [number, number, number],
    });
    expect(gold.fixedIv).toBe(31); // GetFactoryMonFixedIV(5 + 2, FALSE)
    const state = createFactoryRoundBattleOrchestrator({ ...config(41, 1), adoptedInitialBrainOpponent: { generation: gold, freshBattleRngValue: FRESH } });
    expect(state.round.rules.currentOpponent.frontierBrain?.status).toBe("gold");
  });

  it("refuses an adoption that would play the wrong opponent", () => {
    const adoptedInitialBrainOpponent = { generation: silver, freshBattleRngValue: FRESH };
    // Streak 19 is an ordinary battle; so is streak 20 once the silver symbol is held (frontier_util.c:1657-1698).
    expect(() => createFactoryRoundBattleOrchestrator({ ...config(19, 0), adoptedInitialBrainOpponent })).toThrow(/needs a Frontier Brain battle/);
    expect(() => createFactoryRoundBattleOrchestrator({ ...config(20, 1), adoptedInitialBrainOpponent })).toThrow(/needs a Frontier Brain battle/);
    // The silver party is not the gold battle's party (other set range, other fixed IV).
    expect(() => createFactoryRoundBattleOrchestrator({ ...config(41, 1), adoptedInitialBrainOpponent })).toThrow(/built for challenge 2, but win streak 41 is challenge 5/);
  });
});
