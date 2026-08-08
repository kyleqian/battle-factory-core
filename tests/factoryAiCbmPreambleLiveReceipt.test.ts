import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

// Live-verified receipt for AI_CheckBadMove's universal preamble
// (`data/battle_ai_scripts.s:51-104`), banked from
// `tools/probe/verify-factory-ai-cbm-preamble-live.ts` replaying
// `mechanic-factory-ai-cbm-preamble-{control,reach}-off.json` against the
// Battle Scene OFF ROM at seeds 1 and 2 -- see
// `docs/factory-ai-cbm-live-receipts-preamble.md` for the full write-up. The
// numbers below are the ROM-observed quantities the verifier compared: the
// AI's chosen move slot (from the ROM's PP decrement) plus the attributed
// `Random()` draw count for the decision window, beside
// `chooseFactoryAiScoredDecision`'s output on the same captured view. All
// four rows matched the ROM exactly (chosen slot, draw count, endpoint RNG).
//
//   control: LUDICOLO target (Water/Grass, TWO distinct abilities Swift Swim /
//            Rain Dish), Normal TACKLE not immune -> the preamble falls
//            through gate A to BOTH `get_ability` reads: 2 draws per scored
//            slot x4 = 8 CBM draws (the gate-B redraw-quirk prediction).
//   reach:   BANETTE target (Ghost, single ability; Normal x0 immune) -> gate A
//            `if_type_effectiveness x0` jumps to Score_Minus10 per slot,
//            exiting BEFORE ability read #1: 0 CBM draws.
//   Both:    4 setup-simulated-rng draws + 1 best-move-tie draw surround the
//            CBM pass; the engine's endpoint RNG and tie slot match the ROM.

const NEUTRAL_STAGES = Object.freeze({
  atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6,
});

type Role = "control" | "reach";

const ROLE_VIEW: Record<Role, FactoryAiScoredView> = {
  control: Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: [33, 33, 33, 33], // TACKLE x4
    attacker: Object.freeze({
      types: ["TYPE_BUG", "TYPE_ROCK"], // Shuckle (213)
      attack: 30, defense: 250, spAttack: 30, spDefense: 250, speed: 25, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 95, maxHp: 95,
      ability: "ABILITY_STURDY",
    }),
    target: Object.freeze({
      species: 297, // LUDICOLO -- two distinct abilities, gate-B case
      types: ["TYPE_WATER", "TYPE_GRASS"],
      attack: 90, defense: 90, spAttack: 110, spDefense: 120, speed: 90, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 155, maxHp: 155,
      ability: "ABILITY_SWIFT_SWIM",
      knownAbility: null,
      lastUsedMoveId: 58, // ICE BEAM
      knownMoveIds: [58],
    }),
  }),
  reach: Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: [33, 33, 33, 33], // TACKLE x4
    attacker: Object.freeze({
      types: ["TYPE_BUG", "TYPE_ROCK"], // Shuckle (213)
      attack: 30, defense: 250, spAttack: 30, spDefense: 250, speed: 25, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 95, maxHp: 95,
      ability: "ABILITY_STURDY",
    }),
    target: Object.freeze({
      species: 378, // BANETTE -- Ghost, Normal x0, single ability
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      attack: 135, defense: 85, spAttack: 103, spDefense: 83, speed: 85, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 139, maxHp: 139,
      ability: "ABILITY_INSOMNIA",
      knownAbility: null,
      lastUsedMoveId: 247, // SHADOW BALL
      knownMoveIds: [247],
    }),
  }),
};

// [role, seed, startRng (post-gRTTN), endRng, chosen slot, draw count,
//  CBM draws, expected CBM deltas, expected final scores]
const ROWS: readonly (readonly [
  Role,
  number,
  number,
  number,
  number,
  number,
  number,
  readonly number[],
  readonly number[],
])[] = [
  ["control", 1, 3323223981, 669553864, 3, 13, 8, [0, 0, 0, 0], [99, 99, 99, 100]],
  ["control", 2, 3469321887, 1254004658, 2, 13, 8, [0, 0, 0, 0], [100, 100, 100, 100]],
  ["reach", 1, 3413886777, 2023871260, 1, 5, 0, [-10, -10, -10, -10], [90, 90, 90, 90]],
  ["reach", 2, 206709515, 3130704934, 2, 5, 0, [-10, -10, -10, -10], [90, 90, 90, 90]],
];

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

describe("AI_CheckBadMove preamble live receipt (banked from the Battle Scene OFF ROM, seeds 1 & 2)", () => {
  it.each(ROWS)(
    "%s seed %s: %d draws, RNG %d -> %d, chosen slot %d (matches ROM PP decrement)",
    (role, seed, startRng, endRng, chosenSlot, drawCount, cbmDraws, cbmDeltas, scores) => {
      const choice = chooseFactoryAiScoredDecision({
        view: ROLE_VIEW[role],
        request: fourSlotRequest,
        rng: { value: startRng, calls: 0 },
      });
      expect(choice.trace.draws.length).toBe(drawCount);
      expect(choice.rng.value).toBe(endRng);
      expect(choice.rng.calls).toBe(drawCount);
      const cbm = choice.trace.draws.filter((draw) => draw.phase === "check-bad-move");
      expect(cbm.length).toBe(cbmDraws);
      expect(cbm.every((draw) => draw.kind === "get-ability")).toBe(true);
      expect(choice.trace.slotScores.map((slot) => slot.checkBadMoveDelta)).toEqual(cbmDeltas);
      expect(choice.trace.slotScores.map((slot) => slot.finalScore)).toEqual(scores);
      const chosen = choice.trace.tie.chosenDecision;
      expect(chosen).toMatchObject({ kind: "use-move", moveSlot: chosenSlot });
    },
  );

  it("control row spends exactly 2 get-ability draws per scored slot (gate-B redraw quirk)", () => {
    const choice = chooseFactoryAiScoredDecision({
      view: ROLE_VIEW.control,
      request: fourSlotRequest,
      rng: { value: 3323223981, calls: 0 },
    });
    const perSlot = new Map<number, number>();
    for (const draw of choice.trace.draws.filter((draw) => draw.phase === "check-bad-move")) {
      perSlot.set(draw.moveSlot, (perSlot.get(draw.moveSlot) ?? 0) + 1);
    }
    expect([...perSlot.values()]).toEqual([2, 2, 2, 2]);
    expect(choice.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
      "get-ability", "get-ability", "get-ability", "get-ability",
      "get-ability", "get-ability", "get-ability", "get-ability",
      "best-move-tie",
    ]);
  });

  it("reach row exits gate A before ability read #1: zero CBM draws and all -10 scores", () => {
    const choice = chooseFactoryAiScoredDecision({
      view: ROLE_VIEW.reach,
      request: fourSlotRequest,
      rng: { value: 3413886777, calls: 0 },
    });
    expect(choice.trace.slotScores.map((slot) => slot.checkBadMoveDelta)).toEqual([-10, -10, -10, -10]);
    expect(choice.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
      "best-move-tie",
    ]);
    expect(choice.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
  });
});
