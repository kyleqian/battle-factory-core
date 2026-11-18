// Fix 49 (docs/parity-mac/heard-speech-kept-at-rent.md). A win that pays a rent writes the rent count and nothing else
// (SetBattleFactoryData FACTORY_DATA_WIN_STREAK_SWAPS, battle_factory.c:259-265: factoryRentsCount only); the heard-speech bits are
// battledBrainFlags (frontier_util.c:846-847, 881-882), which no win touches. The engine rebuilt the facility state at that win with the
// rent count alone, so the bits a round started with were gone after its first win (every challenge's first win pays the draft, fix 44):
// with silver Noland's first speech heard and no symbol, battle 21 showed the first speech again. The ROM skips it (round replay, STATUS).
import { describe, expect, it } from "vitest";
import { battleRoomStateForOpponent } from "../src/engine/battleRoom.ts";
import { factoryHeardBrainSpeech } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { createInitialFactoryCarry, type FactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import { driveGeneratedRoundToCompletion, PLAYER_TRAINER_ID } from "../tools/compare/factoryRoundCarrier.ts";

describe("fix 49: a win that pays a rent keeps the heard-speech bits", () => {
  it("silver speech heard, no symbol: the round keeps the bit through its wins, and battle 21 skips the first speech", () => {
    const carry: FactoryCarry = { ...createInitialFactoryCarry(PLAYER_TRAINER_ID, { symbols: 0, heardBrainSpeech: { silver: true, gold: false } }), factoryWinStreak: 14 };
    const round = driveGeneratedRoundToCompletion(carry, 3);
    expect(round.round.rules.phase).toBe("roundComplete");
    // seven wins, the first paid the draft's rent
    expect(round.facilityState.rentsCount).toBe(1);
    expect(round.facilityState.heardBrainSpeech).toEqual({ silver: true, gold: false });
    const noland = round.round.rules.currentOpponent;
    expect(noland.frontierBrain?.status).toBe("silver");
    expect(battleRoomStateForOpponent(noland, undefined, factoryHeardBrainSpeech(round.facilityState, "silver")).brainSpeechFirstEncounter).toBe(false);
  });

  it("one symbol, gold speech heard: the bit survives every paid win", () => {
    const carry: FactoryCarry = { ...createInitialFactoryCarry(PLAYER_TRAINER_ID, { symbols: 1, heardBrainSpeech: { silver: true, gold: true } }), factoryWinStreak: 35 };
    const round = driveGeneratedRoundToCompletion(carry, 14, () => ({ type: "decline" }));
    expect(round.round.rules.phase).toBe("roundComplete");
    expect(round.facilityState.heardBrainSpeech).toEqual({ silver: true, gold: true });
    expect(round.round.rules.currentOpponent.frontierBrain?.status).toBe("gold");
  });
});
