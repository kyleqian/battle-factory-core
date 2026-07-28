import { describe, expect, it } from "vitest";
import {
  parseBattleState,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import { stageTurn1RockSlideHitChain } from "../src/engine/turn1RockSlidePresentationStaging.ts";
import { stageTurn13SandAttackHitChain } from "../src/engine/turn13SandAttackPresentationStaging.ts";

const CONFIG = {
  requestId: 1,
  rngSeed: 3530724670,
  player: {
    species: 95,
    moveId: 157,
    moves: [157, 20, 225, 201],
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    speed: 76,
    hp: 117,
    maxHp: 117,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
  },
  trainer: {
    species: 140,
    moveId: 72,
    moves: [72, 246, 28, 182],
    attack: 118,
    defense: 96,
    spAttack: 93,
    spDefense: 51,
    speed: 61,
    hp: 91,
    maxHp: 91,
    types: ["TYPE_ROCK", "TYPE_WATER"],
  },
} as const satisfies FactoryFullTurnConfig;

const PLAYER_ROCK_SLIDE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const TRAINER_SAND_ATTACK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 2 as const,
  targetBattler: 0 as const,
});

/**
 * The public full-turn constructor does not yet accept ability, item, or
 * source PP. Rehydrate its serializable public state with the canonical
 * values so this scout can distinguish the move kernel from that constructor
 * gap. This is test-only source/RAM staging, never a production recording
 * import.
 */
function canonicalBattle2State(): BattleState<FactoryFullTurnDecisionRules> {
  const mutable = structuredClone(createFactoryFullTurnBattleState(CONFIG)) as unknown as {
    rules: {
      rulesContext: {
        battlers: Array<{
          ability: number;
          item: number;
          pp: number[];
        }>;
      };
    };
  };
  Object.assign(mutable.rules.rulesContext.battlers[0]!, {
    ability: 5,
    item: 142,
    pp: [10, 20, 20, 10],
  });
  Object.assign(mutable.rules.rulesContext.battlers[1]!, {
    ability: 4,
    item: 142,
    pp: [10, 5, 15, 10],
  });
  return parseBattleState(JSON.stringify(mutable)) as BattleState<FactoryFullTurnDecisionRules>;
}

function runCanonicalBattle2Turn() {
  const afterPlayer = submitFactoryFullTurnDecision(canonicalBattle2State(), {
    requestId: 1,
    side: "player",
    decision: PLAYER_ROCK_SLIDE,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("Battle 2 scout expected the trainer command boundary");
  }
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: TRAINER_SAND_ATTACK,
  });
  if (result.kind !== "decision-required") {
    throw new Error("Battle 2 scout expected the next player command boundary");
  }
  return { afterPlayer, result };
}

describe("Battle 2 OFF real-kernel seam scout", () => {
  it("records the public constructor's exact canonical-state gap", () => {
    const initial = createFactoryFullTurnBattleState(CONFIG);
    const [onix, kabuto] = initial.rules.rulesContext.battlers;
    expect(onix).toMatchObject({
      ability: 0,
      item: 0,
      pp: [16, 16, 16, 16],
    });
    expect(kabuto).toMatchObject({
      ability: 0,
      item: 0,
      pp: [16, 16, 16, 16],
    });
  });

  it("reaches the next player decision with exact HP/stat/action RNG, while pinning the selected-slot and action-reset barriers", () => {
    const { afterPlayer, result } = runCanonicalBattle2Turn();
    expect(afterPlayer.events).toEqual([]);
    expect(afterPlayer.state.rng).toEqual({ value: 3530724670, calls: 0 });
    expect(result.nextRequest).toEqual({
      kind: "command",
      requestId: 3,
      side: "player",
      battler: 0,
      legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
    });

    const [onix, kabuto] = result.state.rules.rulesContext.battlers;
    expect(onix).toMatchObject({
      hp: 117,
      moves: [157, 20, 225, 201],
      pp: [9, 20, 20, 10],
      statStages: [6, 6, 6, 6, 6, 6, 5, 6],
      ability: 5,
      item: 142,
    });
    expect(kabuto).toMatchObject({
      hp: 63,
      moves: [72, 246, 28, 182],
      // Honest current barrier: submitted slot 2 executes MOVE_SAND_ATTACK,
      // but buildActionContext hard-codes currentMovePosition=0.
      pp: [9, 5, 15, 10],
      ability: 4,
      item: 142,
    });

    let rng: number = CONFIG.rngSeed;
    const actionValues = Array.from({ length: 4 }, () => {
      rng = advanceRngValue(rng);
      return rng;
    });
    expect(actionValues).toEqual([
      2956382169,
      2508258776,
      575948139,
      650807554,
    ]);
    expect(result.state.rng).toEqual({ value: 650807554, calls: 4 });

    expect(result.events.map(({ sequence, payload }) => ({
      sequence,
      kind: payload.kind,
      messageId: payload.kind === "message" ? payload.messageId : null,
      battler: "battler" in payload ? payload.battler : null,
      movePosition: payload.kind === "set-battler-pp-data" ? payload.movePosition : null,
      pp: payload.kind === "set-battler-pp-data" ? payload.pp : null,
      animationId: payload.kind === "animation" ? payload.animationId : null,
      arguments: payload.kind === "animation" ? payload.arguments : null,
      from: "from" in payload ? payload.from : null,
      to: "to" in payload ? payload.to : null,
    }))).toEqual([
      { sequence: 0, kind: "message", messageId: "STRINGID_USEDMOVE", battler: null, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
      { sequence: 1, kind: "set-battler-pp-data", messageId: null, battler: 0, movePosition: 0, pp: 9, animationId: null, arguments: null, from: null, to: null },
      { sequence: 2, kind: "animation", messageId: null, battler: 0, movePosition: null, pp: null, animationId: "MOVE_ANIMATION", arguments: ["157", "0", "75", "28", "0", "0"], from: null, to: null },
      { sequence: 3, kind: "play-se", messageId: null, battler: 1, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
      { sequence: 4, kind: "animation", messageId: null, battler: 1, movePosition: null, pp: null, animationId: "HIT_ANIMATION", arguments: [], from: null, to: null },
      { sequence: 5, kind: "health-bar-update", messageId: null, battler: 1, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
      { sequence: 6, kind: "hp-change", messageId: null, battler: 1, movePosition: null, pp: null, animationId: null, arguments: null, from: 91, to: 63 },
      { sequence: 7, kind: "set-battler-sprite-visibility", messageId: null, battler: 0, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
      { sequence: 8, kind: "set-battler-sprite-visibility", messageId: null, battler: 1, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
      { sequence: 9, kind: "set-battler-pp-data", messageId: null, battler: 1, movePosition: 0, pp: 9, animationId: null, arguments: null, from: null, to: null },
      { sequence: 10, kind: "stat-stage-change", messageId: null, battler: 0, movePosition: null, pp: null, animationId: null, arguments: null, from: 6, to: 5 },
      // Honest action-finish barrier: stale battleMoveDamage=28 leaks into
      // Sand Attack's controller animation arguments.
      { sequence: 11, kind: "animation", messageId: null, battler: 1, movePosition: null, pp: null, animationId: "MOVE_ANIMATION", arguments: ["28", "1", "0", "28", "0", "0"], from: null, to: null },
      { sequence: 12, kind: "animation", messageId: null, battler: 0, movePosition: null, pp: null, animationId: "STATS_CHANGE", arguments: ["27"], from: null, to: null },
      { sequence: 13, kind: "message", messageId: "STRINGID_DEFENDERSSTATFELL", battler: null, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
      { sequence: 14, kind: "set-battler-sprite-visibility", messageId: null, battler: 1, movePosition: null, pp: null, animationId: null, arguments: null, from: null, to: null },
    ]);

    // HITMARKER_ATTACKSTRING_PRINTED also leaks across the action boundary,
    // suppressing the second move's own STRINGID_USEDMOVE event.
    expect(result.events.filter(({ payload }) =>
      payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE"
    )).toHaveLength(1);
    // BattleDecisionBoundary intentionally exposes payloads, not interpreter
    // provenance. A presentation bridge cannot recover sourceLabel from this
    // public result without a contract change.
    expect(result.events.every(({ payload }) =>
      !Object.hasOwn(payload, "provenance")
    )).toBe(true);
  });

  it("pins the source-label/opcode provenance available before the public full-turn boundary strips it", () => {
    const summarize = (events: ReturnType<typeof stageTurn1RockSlideHitChain>["events"]) =>
      events.map((event) => ({
        kind: event.kind,
        sourceLabel: event.provenance.sourceLabel,
        opcodeName: event.provenance.opcodeName,
      }));

    expect(summarize(stageTurn1RockSlideHitChain().events)).toEqual([
      { kind: "message", sourceLabel: "BattleScript_HitFromAtkString", opcodeName: "B_SCR_OP_ATTACKSTRING" },
      { kind: "set-battler-pp-data", sourceLabel: "BattleScript_HitFromAtkString", opcodeName: "B_SCR_OP_PPREDUCE" },
      { kind: "animation", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_ATTACKANIMATION" },
      { kind: "play-se", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_EFFECTIVENESSSOUND" },
      { kind: "animation", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_HITANIMATION" },
      { kind: "health-bar-update", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_HEALTHBARUPDATE" },
      { kind: "hp-change", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_DATAHPUPDATE" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
    ]);

    expect(summarize(stageTurn13SandAttackHitChain().events)).toEqual([
      { kind: "message", sourceLabel: "BattleScript_EffectStatDown", opcodeName: "B_SCR_OP_ATTACKSTRING" },
      { kind: "set-battler-pp-data", sourceLabel: "BattleScript_EffectStatDown", opcodeName: "B_SCR_OP_PPREDUCE" },
      { kind: "stat-stage-change", sourceLabel: "BattleScript_EffectStatDown", opcodeName: "B_SCR_OP_STATBUFFCHANGE" },
      { kind: "animation", sourceLabel: "BattleScript_StatDownDoAnim", opcodeName: "B_SCR_OP_ATTACKANIMATION" },
      { kind: "animation", sourceLabel: "BattleScript_StatDownDoAnim", opcodeName: "B_SCR_OP_PLAYANIMATION" },
      { kind: "message", sourceLabel: "BattleScript_StatDownPrintString", opcodeName: "B_SCR_OP_PRINTFROMTABLE" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
    ]);
  });
});
