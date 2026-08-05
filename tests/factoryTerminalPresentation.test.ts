import { describe, expect, it } from "vitest";
import type {
  BattleMon,
  BattleOpponent,
  BattleParty,
  FixtureBattleScenario,
} from "../src/engine/battleScenario.ts";
import {
  advanceRoundController,
  chooseRoundSwap,
  completeBattlePresentation,
  createRoundController,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalPresentation,
  createFactoryTerminalLossPresentation,
  createFactoryTerminalRoundWonPresentation,
  FACTORY_LOSS_TERMINAL_PROFILE,
  FACTORY_ROUND_WON_TERMINAL_PROFILE,
  factoryTerminalCompletion,
  factoryTerminalRecordMenuDrawn,
  factoryTerminalRecordPromptFirstAge,
  factoryTerminalRecordMenuInputReady,
  factoryTerminalRecordMenuVisible,
  factoryTerminalVisibleChars,
  isFactoryTerminalRoundWon,
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

function roundWonController() {
  const opponents: BattleOpponent[] = Array.from({ length: 7 }, (_, index) => ({
    id: `win-opponent-${index}`,
    trainerName: `TRAINER ${index}`,
    party: party(`win-opponent-${index}`),
  }));
  const scenario: FixtureBattleScenario = {
    id: "terminal-round-won",
    playerParty: party("winner"),
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
  for (let battleIndex = 0; battleIndex < 7; battleIndex += 1) {
    controller = resolveRoundBattle(controller, {
      outcome: "win",
      playerParty: controller.rules.playerParty,
      opponentParty: controller.rules.currentOpponent.party,
      rngValue: 0x89abcdef,
    });
    if (battleIndex === 6) break;
    controller = advanceRoundController(
      completeBattlePresentation(controller, {
        commandId: controller.presentation!.command.commandId,
      }),
    );
    controller = chooseRoundSwap(
      completeBattlePresentation(controller, {
        commandId: controller.presentation!.command.commandId,
      }),
      { type: "decline" },
    );
    controller = advanceRoundController(
      completeBattlePresentation(controller, {
        commandId: controller.presentation!.command.commandId,
      }),
    );
    controller = advanceRoundController(
      completeBattlePresentation(controller, {
        commandId: controller.presentation!.command.commandId,
      }),
    );
  }
  return controller;
}

function advanceTo(
  state: ReturnType<typeof createFactoryTerminalLossPresentation>,
  age: number,
) {
  while (state.age < age) {
    state = advanceFactoryTerminalPresentation(state, {});
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
    let terminal = advanceTo(createFactoryTerminalLossPresentation(command), 169);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.age).toBe(170);
    expect(terminal.firstPageReleaseAge).toBeNull();
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.firstPageReleaseAge).toBe(171);
    expect(factoryTerminalVisibleChars(terminal)).toBe(28);

    terminal = advanceTo(terminal, 237);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.secondPageReleaseAge).toBe(238);
    terminal = advanceTo(terminal, 287);
    expect(factoryTerminalCompletion(terminal)).toBeNull();
    terminal = advanceFactoryTerminalPresentation(terminal, {});
    expect(terminal).toMatchObject({
      age: 288,
      challengeStatus: "clear",
      partyRestored: true,
      completed: true,
    });
    expect(factoryTerminalCompletion(terminal)).toEqual({
      commandId: command.commandId,
    });
  });

  it("pins canonical +171/+238 releases and acknowledges at +288 without mutating round rules or RNG", () => {
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
    for (let age = 1; age <= 288; age += 1) {
      engine = tick(engine, new Set(age === 171 || age === 238 ? ["A"] : []));
      if (age < 288) {
        expect(engine.roundController!.presentation!.completed).toBe(false);
      }
    }
    expect(engine.factoryTerminal).toMatchObject({
      age: 288,
      firstPageReleaseAge: 171,
      secondPageReleaseAge: 238,
      partyRestored: true,
      challengeStatus: "clear",
      completed: true,
    });
    expect(engine.roundController!.presentation!.completed).toBe(true);
    expect(engine.roundController!.rules).toBe(rules);
    expect(engine.roundController!.rules.phase).toBe("roundLost");
    expect(engine.roundController!.rules.rngValue).toBe(0x89abcdef);
  });

  it("draws the shared default-NO record menu at release +23 and samples input at +25", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    let terminal = createFactoryTerminalLossPresentation(command);
    terminal = advanceTo(terminal, 169);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceTo(terminal, 237);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceTo(terminal, 523);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedB: true });
    expect(terminal.recordPromptReleaseAge).toBe(524);
    expect(terminal.recordMenuCursor).toBe(1);

    terminal = advanceTo(terminal, 546);
    expect(factoryTerminalRecordMenuVisible(terminal)).toBe(false);
    terminal = advanceFactoryTerminalPresentation(terminal, {});
    expect(terminal.age).toBe(547);
    expect(factoryTerminalRecordMenuVisible(terminal)).toBe(true);
    expect(factoryTerminalRecordMenuInputReady(terminal)).toBe(false);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.age).toBe(548);
    expect(terminal.recordChoice).toBeNull();
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.age).toBe(549);
    expect(factoryTerminalRecordMenuInputReady(terminal)).toBe(true);
    expect(terminal.recordChoice).toBe("no");
  });

  it("uses stored key edges: a held prompt-release key cannot also choose a menu item", () => {
    const roundController = lossController();
    const command = roundController.presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    const rules = roundController.rules;
    let engine: EngineState = {
      ...createInitialState(),
      roundController,
      factoryTerminal: createFactoryTerminalLossPresentation(command),
      rngMode: "vblank",
    };
    for (let age = 1; age <= 551; age += 1) {
      const buttons = age === 171 || age === 238
        ? new Set(["A"] as const)
        : age === 524
        ? new Set(["B"] as const)
        : age === 551
        ? new Set(["A"] as const)
        : new Set<never>();
      engine = tick(engine, buttons);
    }
    expect(engine.factoryTerminal).toMatchObject({
      recordPromptReleaseAge: 524,
      recordMenuCursor: 1,
      recordChoice: "no",
    });
    expect(engine.roundController!.rules).toBe(rules);
    expect(engine.roundController!.rules.phase).toBe("roundLost");
    expect(engine.roundController!.rules.rngValue).toBe(0x89abcdef);
  });
});

describe("Factory Scene-OFF roundWon terminal adapter", () => {
  it("maps the generic seventh-win completion command onto an immutable roundWon profile", () => {
    const controller = roundWonController();
    const command = controller.presentation!.command;
    expect(command.type).toBe("roundCompleted");
    if (command.type !== "roundCompleted") {
      throw new Error("expected roundCompleted");
    }
    const terminal = createFactoryTerminalPresentation(command);
    if (!isFactoryTerminalRoundWon(terminal)) {
      throw new Error("expected roundWon terminal");
    }
    expect(terminal).toMatchObject({
      commandId: command.commandId,
      battleIndex: 6,
      age: 0,
      challengeStatus: "won",
      displayedBattlePoints: 0,
      fanfareRemaining: 0,
      completed: false,
    });
    expect(terminal.profile).toBe(FACTORY_ROUND_WON_TERMINAL_PROFILE);
    expect(Object.isFrozen(terminal.profile)).toBe(true);
    expect(Object.isFrozen(terminal.profile.congratulations)).toBe(true);
    expect(Object.isFrozen(terminal.profile.award)).toBe(true);
    expect(Object.isFrozen(terminal.profile.exchange)).toBe(true);
  });

  it("stores all three source input gates and rejects every early edge", () => {
    const command = roundWonController().presentation!.command;
    if (command.type !== "roundCompleted") {
      throw new Error("expected roundCompleted");
    }
    let terminal = createFactoryTerminalRoundWonPresentation(command);
    for (let age = 1; age <= 2200; age += 1) {
      terminal = advanceFactoryTerminalPresentation(terminal, {
        pressedA: age === 101 || age === 300 || age === 368 ||
          age === 1100 || age === 1140 || age === 2200,
      });
      if (age === 101) {
        expect(terminal.congratulationsReleaseAge).toBeNull();
      } else if (age === 300) {
        expect(terminal.congratulationsReleaseAge).toBe(300);
      } else if (age === 368) {
        expect(terminal.awardScrollReleaseAge).toBeNull();
      } else if (age === 1100) {
        expect(terminal.awardScrollReleaseAge).toBe(1100);
      } else if (age === 1140) {
        expect(terminal.awardReleaseAge).toBeNull();
      }
    }
    expect(terminal).toMatchObject({
      congratulationsReleaseAge: 300,
      awardScrollReleaseAge: 1100,
      awardReleaseAge: 2200,
    });
  });

  it("awards 3 BP at canonical +2201 and ends the 312-frame fanfare at +2513", () => {
    const command = roundWonController().presentation!.command;
    if (command.type !== "roundCompleted") {
      throw new Error("expected roundCompleted");
    }
    let terminal = createFactoryTerminalRoundWonPresentation(command);
    for (let age = 1; age <= 2513; age += 1) {
      terminal = advanceFactoryTerminalPresentation(terminal, {
        pressedA: age === 300 || age === 1100 || age === 2200,
      });
      if (age === 2200) {
        expect(terminal.displayedBattlePoints).toBe(0);
        expect(terminal.fanfareRemaining).toBe(0);
      } else if (age === 2201) {
        expect(terminal.displayedBattlePoints).toBe(3);
        expect(terminal.fanfareRemaining).toBe(312);
      } else if (age === 2512) {
        expect(terminal.fanfareRemaining).toBe(1);
      }
    }
    expect(terminal).toMatchObject({
      age: 2513,
      congratulationsReleaseAge: 300,
      awardScrollReleaseAge: 1100,
      awardReleaseAge: 2200,
      displayedBattlePoints: 3,
      fanfareRemaining: 0,
      partyRestored: false,
      challengeStatus: "won",
      completed: false,
    });
    expect(factoryTerminalCompletion(terminal)).toBeNull();
  });

  it("uses source-relative exchange/restore gates and the shared default-NO record menu through +4424", () => {
    const command = roundWonController().presentation!.command;
    if (command.type !== "roundCompleted") {
      throw new Error("expected roundCompleted");
    }
    let terminal = createFactoryTerminalRoundWonPresentation(command);
    for (let age = 1; age <= 4424; age += 1) {
      terminal = advanceFactoryTerminalPresentation(terminal, {
        pressedA: age === 300 || age === 1100 || age === 2200 ||
          age === 2571 || age === 3500 || age === 3780 ||
          age === 4400 || age === 4422 || age === 4423 || age === 4424,
      });
      if (age === 2571) expect(terminal.exchangeReleaseAge).toBeNull();
      if (age === 3500) expect(terminal.exchangeReleaseAge).toBe(3500);
      if (age === 3548) {
        expect(terminal).toMatchObject({
          partyRestored: false,
          challengeStatus: "won",
          completed: false,
        });
      }
      if (age === 3549) {
        expect(terminal).toMatchObject({
          partyRestored: true,
          challengeStatus: "clear",
          completed: true,
        });
        expect(factoryTerminalCompletion(terminal)).toEqual({
          commandId: command.commandId,
        });
        expect(factoryTerminalRecordPromptFirstAge(terminal)).toBe(3718);
      }
      if (age === 3780) expect(terminal.recordPromptReleaseAge).toBeNull();
      if (age === 4400) expect(terminal.recordPromptReleaseAge).toBe(4400);
      if (age === 4421) expect(factoryTerminalRecordMenuVisible(terminal)).toBe(false);
      if (age === 4422) {
        expect(factoryTerminalRecordMenuDrawn(terminal)).toBe(true);
        expect(factoryTerminalRecordMenuVisible(terminal)).toBe(false);
        expect(factoryTerminalRecordMenuInputReady(terminal)).toBe(false);
        expect(terminal.recordChoice).toBeNull();
      }
      if (age === 4423) {
        expect(factoryTerminalRecordMenuVisible(terminal)).toBe(true);
        expect(terminal.recordChoice).toBeNull();
      }
    }
    expect(factoryTerminalRecordMenuInputReady(terminal)).toBe(true);
    expect(terminal.recordMenuCursor).toBe(1);
    expect(terminal.recordChoice).toBe("no");
  });

  it("auto-connects the live command and never mutates controller rules, RNG, battle index, or fixture inputs", () => {
    const controller = roundWonController();
    const rules = controller.rules;
    const schedule = controller.opponentSchedule;
    const selection = controller.opponentSelection;
    let engine: EngineState = {
      ...createInitialState(),
      roundController: controller,
      factoryTerminal: null,
      rngMode: "vblank",
    };
    for (let age = 1; age <= 2513; age += 1) {
      engine = tick(
        engine,
        new Set(age === 300 || age === 1100 || age === 2200 ? ["A"] : []),
      );
    }
    expect(engine.factoryTerminal).toMatchObject({
      profile: { outcome: "roundWon" },
      age: 2513,
      displayedBattlePoints: 3,
      fanfareRemaining: 0,
    });
    expect(engine.roundController).toBe(controller);
    expect(engine.roundController!.rules).toBe(rules);
    expect(engine.roundController!.rules.phase).toBe("roundComplete");
    expect(engine.roundController!.rules.battleIndex).toBe(6);
    expect(engine.roundController!.rules.rngValue).toBe(0x89abcdef);
    expect(engine.roundController!.opponentSchedule).toBe(schedule);
    expect(engine.roundController!.opponentSelection).toBe(selection);
    expect(engine.roundController!.presentation!.completed).toBe(false);
  });

  it("restores/clears at +3549 and reaches the shared +4422/+4424 menu without mutating round rules or schedule", () => {
    const controller = roundWonController();
    const rules = controller.rules;
    const playerParty = rules.playerParty;
    const currentOpponent = rules.currentOpponent;
    const schedule = controller.opponentSchedule;
    const selection = controller.opponentSelection;
    let engine: EngineState = {
      ...createInitialState(),
      roundController: controller,
      factoryTerminal: null,
      rngMode: "vblank",
    };
    for (let age = 1; age <= 4424; age += 1) {
      const pressed = age === 300 || age === 1100 || age === 2200 ||
        age === 3500 || age === 4400 || age === 4422 || age === 4424;
      engine = tick(engine, new Set(pressed ? ["A"] : []));
      if (age === 3549) {
        expect(engine.factoryTerminal).toMatchObject({
          partyRestored: true,
          challengeStatus: "clear",
          completed: true,
        });
      }
    }
    expect(engine.factoryTerminal).toMatchObject({
      age: 4424,
      recordPromptReleaseAge: 4400,
      recordMenuCursor: 1,
      recordChoice: "no",
    });
    expect(engine.roundController!.rules).toBe(rules);
    expect(engine.roundController!.rules.playerParty).toBe(playerParty);
    expect(engine.roundController!.rules.currentOpponent).toBe(currentOpponent);
    expect(engine.roundController!.rules.phase).toBe("roundComplete");
    expect(engine.roundController!.rules.battleIndex).toBe(6);
    expect(engine.roundController!.rules.rngValue).toBe(0x89abcdef);
    expect(engine.roundController!.opponentSchedule).toBe(schedule);
    expect(engine.roundController!.opponentSelection).toBe(selection);
    expect(engine.roundController!.presentation!.completed).toBe(true);
  });
});
