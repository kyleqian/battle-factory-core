import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * Tier-1 insurance for ISSUES #66(b): ChangeStatBuffs's {B_BUFF2}
 * "sharply"/"harshly" selection (battle_script_commands.c:7044,7067) reads
 * the pre-clamp requested magnitude (`GET_STAT_BUFF_VALUE(statValue)`), not
 * the post-clamp `statStages` delta. Oracle-confirmed
 * (docs/issue66b-preclamp-magnitude-verdict.md,
 * tools/compare/fixtures/issue66b-preclamp-magnitude-probe/frame-03900):
 * ONIX with Attack already at stage 11 (one below MAX_STAT_STAGE) using
 * SWORDS DANCE (EFFECT_ATTACK_UP_2, requests +2) lands at stage 12 (a
 * post-clamp delta of only 1) but the real ROM still prints "sharply
 * rose!". This drives the same scenario (MEDITATE x5 to reach stage 11,
 * then SWORDS DANCE) through the real production kernel
 * (createFactoryFullTurnBattleState/submitFactoryFullTurnDecision) and the
 * real production presentation entry point
 * (createBattleResolutionPresentation), asserting the resolved banner text.
 */
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 1,
  player: Object.freeze({
    species: 95, // ONIX
    moveId: 96, // MEDITATE
    moves: [96, 14, 0, 0] as const, // MEDITATE (EFFECT_ATTACK_UP, +1), SWORDS DANCE (EFFECT_ATTACK_UP_2, +2)
    pp: [10, 10, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 90,
    defense: 130,
    spAttack: 55,
    spDefense: 65,
    speed: 100,
    hp: 150,
    maxHp: 150,
    types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
  }),
  trainer: Object.freeze({
    species: 19, // RATTATA
    moveId: 150, // SPLASH
    moves: [150, 0, 0, 0] as const,
    pp: [10, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 56,
    defense: 35,
    spAttack: 25,
    spDefense: 35,
    speed: 50,
    hp: 999,
    maxHp: 999,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  }),
});

const PLAYER_MEDITATE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});
const PLAYER_SWORDS_DANCE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 0 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});

function statChangeLines(transition: ReturnType<typeof submitFactoryFullTurnDecision>) {
  if (transition.kind !== "decision-required") {
    throw new Error("expected a decision boundary after the stat-change turn");
  }
  return transition;
}

describe("ChangeStatBuffs pre-clamp requested-magnitude presentation (ISSUES #66b)", () => {
  it("prints \"sharply rose!\" for a post-clamp delta of 1 (stage 11 + SWORDS DANCE's requested +2)", () => {
    let state = createFactoryFullTurnBattleState(SCENARIO);

    // Five MEDITATE uses raise Attack from the neutral stage 6 to stage 11
    // (+5, one below MAX_STAT_STAGE=12) -- each a plain +1 requested/+1
    // post-clamp move, matching the oracle-staged probe trace exactly.
    for (let turn = 0; turn < 5; turn += 1) {
      const requestId = 1 + turn * 2;
      const afterPlayer = submitFactoryFullTurnDecision(state, {
        requestId,
        side: "player",
        decision: PLAYER_MEDITATE,
      });
      if (afterPlayer.kind !== "decision-required") {
        throw new Error(`expected trainer command boundary on turn ${turn + 1}`);
      }
      const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: requestId + 1,
        side: "trainer",
        decision: TRAINER_SPLASH,
      });
      if (afterTrainer.kind !== "decision-required") {
        throw new Error(`expected player command boundary after turn ${turn + 1}`);
      }
      state = afterTrainer.state;
    }
    expect(state.rules.rulesContext.battlers[0].statStages[1]).toBe(11);

    if (state.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary before the discriminating 6th turn");
    }
    const command = createBattleCommandPresentation(
      state.boundary.request as BattleCommandRequest,
      state.rules.rulesContext,
      1,
    );
    const afterPlayer = statChangeLines(submitFactoryFullTurnDecision(state, {
      requestId: 11,
      side: "player",
      decision: PLAYER_SWORDS_DANCE,
    }));
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 12,
      side: "trainer",
      decision: TRAINER_SPLASH,
    });

    // The post-clamp delta is only 1 (11 -> 12, MAX_STAT_STAGE) -- if the
    // presentation layer read the post-clamp delta instead of SWORDS
    // DANCE's own requested +2, this would render plain "rose!".
    expect(transition.state.rules.rulesContext.battlers[0].statStages[1]).toBe(12);

    const resolution = createBattleResolutionPresentation({
      sourceRequest: state.boundary.request as BattleCommandRequest,
      sourceDecision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
      beforeRules: state.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: null,
    });

    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);

    expect(lines).toContainEqual(["ONIX’s ATTACK", "sharply rose!"]);
  });

  it("prints plain \"rose!\" for a normal +1 requested/+1 post-clamp MEDITATE use", () => {
    const state = createFactoryFullTurnBattleState(SCENARIO);
    if (state.boundary.kind !== "decision-required") {
      throw new Error("expected the player's opening command boundary");
    }
    const command = createBattleCommandPresentation(
      state.boundary.request as BattleCommandRequest,
      state.rules.rulesContext,
      0,
    );
    const afterPlayer = statChangeLines(submitFactoryFullTurnDecision(state, {
      requestId: 1,
      side: "player",
      decision: PLAYER_MEDITATE,
    }));
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_SPLASH,
    });
    expect(transition.state.rules.rulesContext.battlers[0].statStages[1]).toBe(7);

    const resolution = createBattleResolutionPresentation({
      sourceRequest: state.boundary.request as BattleCommandRequest,
      sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      beforeRules: state.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: null,
    });

    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);

    expect(lines).toContainEqual(["ONIX’s ATTACK", "rose!"]);
    expect(lines).not.toContainEqual(["ONIX’s ATTACK", "sharply rose!"]);
  });
});
