import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";

const SPLASH = 150;

function config(rngSeed: number, playerConfusedStatus2: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 1,
      moveId: SPLASH,
      moves: [SPLASH, 0, 0, 0],
      pp: [40, 0, 0, 0],
      attack: 100,
      defense: 80,
      spAttack: 50,
      spDefense: 80,
      speed: 100,
      hp: 100,
      maxHp: 100,
      status2: playerConfusedStatus2,
    },
    trainer: {
      species: 43,
      moveId: SPLASH,
      attack: 50,
      defense: 100,
      spAttack: 50,
      spDefense: 100,
      speed: 50,
      hp: 100,
    },
  };
}

function runTurn(input: FactoryFullTurnConfig) {
  const initial = createFactoryFullTurnBattleState(input);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command");
  }
  const reduced = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
  });
  return { initial, reduced };
}

describe("confused-battler admission presentation (confusion message family)", () => {
  it("resolves STRINGID_PKMNISCONFUSED through the production resolution presentation path when a confused battler acts", () => {
    const { initial, reduced } = runTurn(config(3, 2));
    if (initial.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary");
    }
    const sourceRequest = initial.boundary.request;
    if (sourceRequest.kind !== "command") {
      throw new Error("expected the player's command request");
    }
    const messageIds = reduced.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);

    const command = createBattleCommandPresentation(
      sourceRequest,
      initial.rules.rulesContext,
      0,
    );
    const resolution = createBattleResolutionPresentation({
      sourceRequest,
      sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      beforeRules: initial.rules,
      transition: reduced,
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
    expect(messageIds).toContain("STRINGID_PKMNISCONFUSED");
    expect(lines).toContainEqual(["BULBASAUR is", "confused!"]);
  });
});
