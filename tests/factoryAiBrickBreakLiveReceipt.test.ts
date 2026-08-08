import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

// Live-verified receipt for AI_CV_BrickBreak (docs addendum #25). The numbers
// below are banked from `tools/probe/verify-factory-ai-brickbreak-live.ts`
// replaying `mechanic-factory-ai-cv-brickbreak-{control,reach}-off.json`
// against the Battle Scene OFF ROM at seeds 2 and 3 -- the ROM's observed
// turn-2 decision (chosen slot + exact RNG footprint) matched
// chooseFactoryAiScoredDecision on the same captured view, all four rows
// byte-identical on rerun. This test pins those numbers so a later port of
// the CV handler (or its target-side-Reflect wiring) cannot silently regress
// them. Stats are the ROM-built level-50 values captured live (Alakazam vs
// Vaporeon, 31 IVs / 0 EVs / neutral): the AI used Splash on turn 1 in every
// run, so both sides stand at full HP when turn 2's decision fires.
//
//   control: target side has no Reflect  -> CV delta 0, scores 100,100,100,100
//   reach:   target side Reflect up      -> CV delta +1, scores 101,100,100,100
//   Both:    5 draws (4 setup + 1 tie; BrickBreak's CV body draws nothing)
//            and the engine's tie-break picks the same slot the ROM used.

const SEED_2_START = 1880453303;
const SEED_2_END = 724084258;
const SEED_3_START = 2127127179;
const SEED_3_END = 4200654246;

const NEUTRAL_STAGES = Object.freeze({
  atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6,
});

function brickBreakView(targetSideReflectUp: boolean, targetMove: number): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: [280, 150, 150, 150] as const, // BrickBreak + Splash x3
    attacker: Object.freeze({
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
      attack: 70, defense: 65, spAttack: 155, spDefense: 105, speed: 140,
      level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 130, maxHp: 130,
      ability: "ABILITY_SYNCHRONIZE",
    }),
    target: Object.freeze({
      species: 134,
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
      attack: 85, defense: 80, spAttack: 130, spDefense: 115, speed: 85,
      level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 205, maxHp: 205,
      ability: "ABILITY_WATER_ABSORB",
      knownAbility: null,
      lastUsedMoveId: targetMove,
      knownMoveIds: [targetMove, targetMove, targetMove, targetMove],
      ...(targetSideReflectUp ? { targetSideReflectUp: true } : {}),
    }),
  });
}

const fourSlotRequest = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});

describe("AI_CV_BrickBreak live receipt (banked from the Battle Scene OFF ROM, seeds 2 & 3)", () => {
  it.each([
    ["seed 2 control", 2, SEED_2_START, SEED_2_END, false, 150, 0, [100, 100, 100, 100]],
    ["seed 2 reach", 2, SEED_2_START, SEED_2_END, true, 115, 1, [101, 100, 100, 100]],
    ["seed 3 control", 3, SEED_3_START, SEED_3_END, false, 150, 0, [100, 100, 100, 100]],
    ["seed 3 reach", 3, SEED_3_START, SEED_3_END, true, 115, 1, [101, 100, 100, 100]],
  ] as const)(
    "%s: %d draws, RNG %d -> %d, BrickBreak CV %d, chosen slot matches ROM",
    (_label, _seed, startRng, endRng, targetSideReflectUp, targetMove, cvDelta, scores) => {
      const choice = chooseFactoryAiScoredDecision({
        view: brickBreakView(targetSideReflectUp, targetMove),
        request: fourSlotRequest,
        rng: { value: startRng, calls: 0 },
      });
      expect(choice.trace.draws.length).toBe(5);
      expect(choice.rng.value).toBe(endRng);
      expect(choice.trace.slotScores[0]).toMatchObject({
        checkViabilityDelta: cvDelta,
        finalScore: scores[0],
      });
      expect(choice.trace.slotScores.map((slot) => slot.finalScore)).toEqual(scores);
      const chosen = choice.trace.tie.chosenDecision;
      expect(chosen).toMatchObject({ kind: "use-move", moveSlot: 0 });
    },
  );

  it("banked engine trace shape: setup-simulated-rng x4 then one best-move-tie draw", () => {
    const choice = chooseFactoryAiScoredDecision({
      view: brickBreakView(true, 115),
      request: fourSlotRequest,
      rng: { value: SEED_2_START, calls: 0 },
    });
    expect(choice.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "best-move-tie",
    ]);
    expect(choice.trace.bestMoveSlots).toEqual([0]);
    expect(choice.trace.tie.modulus).toBe(1);
    expect(choice.trace.tie.index).toBe(0);
  });
});
