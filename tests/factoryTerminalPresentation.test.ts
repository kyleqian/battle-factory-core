import { describe, expect, it } from "vitest";
import type {
  BattleMon,
  BattleOpponent,
  BattleParty,
  FixtureBattleScenario,
} from "../src/engine/battleScenario.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  createRoundController,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalLossPresentation,
  FACTORY_LOSS_TERMINAL_PROFILE,
  factoryTerminalCompletion,
  factoryTerminalVisibleChars,
} from "../src/engine/factoryTerminalPresentation.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";

function mon(id: string): BattleMon {
  return { id, species: id.toUpperCase(), maxHp: 100, hp: 100, status: "none" };
}

function party(prefix: string): BattleParty {
  return [mon(`${prefix}-0`), mon(`${prefix}-1`), mon(`${prefix}-2`)];
}

function lossController() {
  const opponents: BattleOpponent[] = Array.from({ length: 7 }, (_, index) => ({
    id: `opponent-${index}`,
    trainerName: `TRAINER ${index}`,
    party: party(`opponent-${index}`),
  }));
  const scenario: FixtureBattleScenario = {
    id: "terminal-loss",
    playerParty: party("player"),
    opponentPool: opponents,
    opponentSelectionInputs: [0, 0, 0, 0, 0, 0, 0],
    initialRngValue: 0x12345678,
  };
  let controller = createRoundController(scenario);
  controller = advanceRoundController(
    completeBattlePresentation(controller, {
      commandId: controller.presentation!.command.commandId,
    }),
  );
  return resolveRoundBattle(controller, {
    outcome: "loss",
    playerParty: controller.rules.playerParty,
    opponentParty: controller.rules.currentOpponent.party,
    rngValue: 0x89abcdef,
  });
}

function advanceTo(
  state: ReturnType<typeof createFactoryTerminalLossPresentation>,
  age: number,
) {
  while (state.age < age) {
    state = advanceFactoryTerminalPresentation(state, false);
  }
  return state;
}

describe("Factory Scene-OFF loss terminal adapter", () => {
  it("is created from the generic roundLost command and retains immutable profile data", () => {
    const controller = lossController();
    expect(controller.presentation?.command.type).toBe("roundLost");
    const command = controller.presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    const terminal = createFactoryTerminalLossPresentation(command);
    expect(terminal).toMatchObject({
      commandId: command.commandId,
      battleIndex: 0,
      age: 0,
      challengeStatus: "lost",
      partyRestored: false,
      completed: false,
    });
    expect(terminal.profile).toBe(FACTORY_LOSS_TERMINAL_PROFILE);
    expect(Object.isFrozen(terminal.profile)).toBe(true);
    expect(Object.isFrozen(terminal.profile.pages)).toBe(true);
  });

  it("rejects early page input, stores source-relative releases, and clears only at second release +50", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    let terminal = advanceTo(createFactoryTerminalLossPresentation(command), 66);
    terminal = advanceFactoryTerminalPresentation(terminal, true);
    expect(terminal.age).toBe(67);
    expect(terminal.firstPageReleaseAge).toBeNull();
    terminal = advanceFactoryTerminalPresentation(terminal, true);
    expect(terminal.firstPageReleaseAge).toBe(68);
    expect(factoryTerminalVisibleChars(terminal)).toBe(28);

    terminal = advanceTo(terminal, 129);
    terminal = advanceFactoryTerminalPresentation(terminal, true);
    expect(terminal.secondPageReleaseAge).toBe(130);
    terminal = advanceTo(terminal, 179);
    expect(factoryTerminalCompletion(terminal)).toBeNull();
    terminal = advanceFactoryTerminalPresentation(terminal, false);
    expect(terminal).toMatchObject({
      age: 180,
      challengeStatus: "clear",
      partyRestored: true,
      completed: true,
    });
    expect(factoryTerminalCompletion(terminal)).toEqual({
      commandId: command.commandId,
    });
  });

  it("pins canonical +80/+160 releases and acknowledges at +210 without mutating round rules or RNG", () => {
    const roundController = lossController();
    const command = roundController.presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    const rules = roundController.rules;
    let engine: EngineState = {
      ...createInitialState(),
      roundController,
      factoryTerminal: createFactoryTerminalLossPresentation(command),
      rngMode: "vblank" as const,
    };
    for (let age = 1; age <= 210; age += 1) {
      engine = tick(engine, new Set(age === 80 || age === 160 ? ["A"] : []));
      if (age < 210) {
        expect(engine.roundController!.presentation!.completed).toBe(false);
      }
    }
    expect(engine.factoryTerminal).toMatchObject({
      age: 210,
      firstPageReleaseAge: 80,
      secondPageReleaseAge: 160,
      partyRestored: true,
      challengeStatus: "clear",
      completed: true,
    });
    expect(engine.roundController!.presentation!.completed).toBe(true);
    expect(engine.roundController!.rules).toBe(rules);
    expect(engine.roundController!.rules.phase).toBe("roundLost");
    expect(engine.roundController!.rules.rngValue).toBe(0x89abcdef);
  });
});
