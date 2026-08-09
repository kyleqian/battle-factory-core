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
 * Tier-1 insurance for ISSUES #66(a): battleResolutionPresentation.ts's
 * messageLines had no branch for STRINGID_STATSWONTINCREASE/
 * STRINGID_STATSWONTDECREASE (battleScriptStatBuffs.ts sets
 * multistringChooser = B_MSG_STAT_WONT_CHANGE and still emits a real
 * "message" event once a stat is already at MAX_STAT_STAGE/MIN_STAT_STAGE
 * with allowPtr true), so the resolver's completeness guard threw on any
 * capped-stat boost move in a real battle. SWORDS DANCE
 * (EFFECT_ATTACK_UP_2, MOVE_TARGET_USER) used a 4th time after three prior
 * uses already parked Attack at MAX_STAT_STAGE (12, i.e. "+6" from the
 * neutral stage 6) is a real, deterministic (accuracy 0 -- always hits, no
 * RNG roll) STRINGID_STATSWONTINCREASE source. This drives it through the
 * real production kernel (createFactoryFullTurnBattleState/
 * submitFactoryFullTurnDecision) and the real production presentation
 * entry point (createBattleResolutionPresentation) and asserts the
 * resolved banner text.
 */
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 1,
  player: Object.freeze({
    species: 95, // ONIX
    moveId: 14, // SWORDS DANCE
    moves: [14, 0, 0, 0] as const,
    pp: [10, 0, 0, 0] as const,
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

const PLAYER_SWORDS_DANCE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});

describe("SWORDS DANCE capped-stat STATSWONTINCREASE presentation (ISSUES #66a)", () => {
  it("resolves the capped-stat banner through the production resolution presentation path", () => {
    let state = createFactoryFullTurnBattleState(SCENARIO);

    // Three uses raise Attack from the neutral stage 6 to MAX_STAT_STAGE
    // (12, i.e. +6) via SWORDS DANCE's own +2-per-use EFFECT_ATTACK_UP_2.
    for (let turn = 0; turn < 3; turn += 1) {
      const requestId = 1 + turn * 2;
      const afterPlayer = submitFactoryFullTurnDecision(state, {
        requestId,
        side: "player",
        decision: PLAYER_SWORDS_DANCE,
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
    expect(state.rules.rulesContext.battlers[0].statStages[1]).toBe(12);

    if (state.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary before the capped 4th use");
    }
    const command = createBattleCommandPresentation(
      state.boundary.request as BattleCommandRequest,
      state.rules.rulesContext,
      0,
    );
    const afterPlayer = submitFactoryFullTurnDecision(state, {
      requestId: 7,
      side: "player",
      decision: PLAYER_SWORDS_DANCE,
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected trainer command boundary on the capped 4th turn");
    }
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 8,
      side: "trainer",
      decision: TRAINER_SPLASH,
    });

    const messageIds = transition.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_STATSWONTINCREASE");
    // The cap holds -- the 4th use does not push the stage past MAX_STAT_STAGE.
    expect(transition.state.rules.rulesContext.battlers[0].statStages[1]).toBe(12);

    // Throws before the fix: "battleStringResolver: STRINGID_STATSWONTINCREASE
    // references placeholder {B_BUFF1} with no resolver supplied" -- the same
    // missing-branch gap as the #65 ATTACKER/DEFENDER stat-change crashes,
    // now for the capped case.
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

    expect(lines).toContainEqual(["ONIX’s ATTACK", "won’t go higher!"]);

    // Soak signature 7 (docs/soak-crash-catalog.md §7): the capped change
    // must NOT project a stat banner command -- source routes AROUND
    // setgraphicalstatchangevalues + playanimation B_ANIM_STATS_CHANGE
    // straight to the print when the chooser is B_MSG_STAT_WONT_INCREASE
    // (data/battle_scripts_1.s:495-497; :541-544 for the StatDown mirror),
    // and the Scene-OFF banner adapter (battleScene.ts
    // sceneOffStatStageBannerView) deliberately refuses a from===to draw.
    // Before this pin the projector emitted a 12->12 stat command here and
    // every render of this resolution crashed.
    const statCommands = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd) => cmd.type === "stat");
    expect(statCommands).toEqual([]);
  });
});
