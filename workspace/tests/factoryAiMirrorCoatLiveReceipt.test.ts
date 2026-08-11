import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_MirrorCoat receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-mirrorcoat.md). The live oracle work
// found and fixed a real hardware divergence: the port's `MOVE_COUNTER` was
// 243 (Mirror Coat's OWN id), so `AI_CV_MirrorCoat`'s `if_has_move AI_USER,
// MOVE_COUNTER` gate always took the Counter jump and could never model a
// Counter-less carrier. The real `#define MOVE_COUNTER` is 68
// (include/constants/moves.h:72). The fixture pair
// (tools/battle-lab/mechanic-factory-ai-cv-mirrorcoat-{reach,control}-off.json)
// is the opponent lead vs a single-ability Ground target (Donphan, no
// get-ability draws, no switch-check RNG): control = Corsola [Mirror Coat,
// Splash x3] (no Counter), reach = Wobbuffet [Mirror Coat, Counter, Splash,
// Splash].
//
// The captured turn-2 window starts before BattleTurnPassed's one
// gRandomTurnNumber draw. Unlike older receipts whose start cursor is already
// post-boundary, these rows explicitly give that draw to the decision owner.
// The pinned build's odd-address AI_CV_Counter3 if_has_move never recognizes
// Mirror Coat, so Counter's otherwise-reachable bonus roll is absent.
const request = createBattleCommandRequest({
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
const NEUTRAL_STAGES = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
  speed: DEFAULT_STAT_STAGE,
  acc: DEFAULT_STAT_STAGE,
  evasion: DEFAULT_STAT_STAGE,
});

const MOVE_MIRROR_COAT = 243; // EFFECT_MIRROR_COAT -- dispatches AI_CV_MirrorCoat
const MOVE_COUNTER_REAL = 68; // the real move id (`#define MOVE_COUNTER 68`)
const MOVE_SPLASH = 150;

function mirrorCoatView(reach: boolean): FactoryAiScoredView {
  const moves: readonly [number, number, number, number] = reach
    ? [MOVE_MIRROR_COAT, MOVE_COUNTER_REAL, MOVE_SPLASH, MOVE_SPLASH]
    : [MOVE_MIRROR_COAT, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH];
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
    factory: Object.freeze({
      levelMode: 0 as const,
      battleMode: 0 as const,
      factoryWinStreak: 28,
      trainerOpponentId: 222,
    }),
    moves,
    attacker: Object.freeze(
      reach
        ? {
          // Wobbuffet (FRONTIER_MON_WOBBUFFET_2, set 290: Counter + Mirror Coat)
          types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
          attack: 53, defense: 78, spAttack: 53, spDefense: 78, speed: 53, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 2,
          hp: 265, maxHp: 265,
          ability: "ABILITY_SHADOW_TAG",
        }
        : {
          // Corsola (FRONTIER_MON_CORSOLA, set 151: Mirror Coat, no Counter)
          types: ["TYPE_WATER", "TYPE_ROCK"] as const,
          attack: 75, defense: 105, spAttack: 85, spDefense: 105, speed: 55, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 2,
          hp: 130, maxHp: 130,
          ability: "ABILITY_HUSTLE",
        },
    ),
    target: Object.freeze({
      species: 232, // Donphan -- single-ability Ground/Ground, no switch-check RNG
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 140, defense: 140, spAttack: 80, spDefense: 80, speed: 70, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 165, maxHp: 165,
      ability: "ABILITY_STURDY",
      knownAbility: null,
      lastUsedMoveId: MOVE_SPLASH, // target's turn-1 Splash (power 0 -> power-0 path)
      knownMoveIds: [MOVE_SPLASH],
    }),
  });
}

describe("AI_CV_MirrorCoat live receipt (docs/factory-ai-cv-live-receipts-mirrorcoat.md)", () => {
  it.each([
    ["seed 1 control", false, 3_644_022_420, 7, 3_323_223_981, 0, [0, 0, 0, 0]],
    ["seed 1 reach", true, 3_560_934_917, 7, 3_726_110_690, 3, [0, 0, 0, 0]],
    ["seed 99 control", false, 963_358_333, 8, 1_352_996_645, 1, [0, 0, 0, 0]],
    ["seed 99 reach", true, 3_643_996_146, 7, 1_329_715_331, 0, [4, 0, 0, 0]],
  ] as const)("%s reproduces the ROM draw count, scores, slot, and endpoint", (
    _label, reach, startRng, drawCount, endRng, chosenSlot, cvDeltas,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: mirrorCoatView(reach),
      request,
      rng: { value: startRng, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    expect(result.trace.turnStartRandomNumber.owner).toBe("decision");
    expect(result.trace.draws[0]?.kind).toBe("turn-start-random-number");
    expect(result.trace.draws).toHaveLength(drawCount);
    expect(result.trace.slotScores.map((slot) => slot.checkViabilityDelta)).toEqual(cvDeltas);
    expect(result.trace.slotScores.map((slot) => slot.finalScore))
      .toEqual(cvDeltas.map((delta) => 100 + delta));
    expect(result.trace.draws.map((draw) => draw.kind)).not.toContain("counter-bonus-roll");
    expect(result.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: chosenSlot });
    expect(result.rng).toEqual({ value: endRng, calls: drawCount });
  });

  it("pins the seed-1 control branch ordinals: turn-start then setup, roll-6 jump, tie", () => {
    const control = chooseFactoryAiScoredDecision({
      view: mirrorCoatView(false),
      request,
      rng: { value: 3_644_022_420, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    expect(control.trace.draws.map((draw) => draw.kind)).toEqual([
      "turn-start-random-number",
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
      "mirror-coat-roll-6",
      "best-move-tie",
    ]);
    expect(control.trace.draws.map((draw) => draw.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
