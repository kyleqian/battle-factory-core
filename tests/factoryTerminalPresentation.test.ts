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
  factoryTerminalActivePage,
  factoryTerminalCompletion,
  factoryTerminalDeclineBoxClearAge,
  factoryTerminalDeclineBoxGoneAge,
  factoryTerminalDeclineEdgeAge,
  factoryTerminalDeclineMenuClearAge,
  factoryTerminalDeclineTextFirstAge,
  factoryTerminalPageTextFirstAge,
  factoryTerminalPageVisualPhase,
  factoryTerminalRecordMenuDrawn,
  factoryTerminalRecordPromptFirstAge,
  factoryTerminalRecordMenuInputReady,
  factoryTerminalRecordMenuVisible,
  factoryTerminalRecordPromptInputReady,
  factoryTerminalRecordPromptTextFirstAge,
  factoryTerminalRestoreAge,
  factoryTerminalVisibleChars,
  isFactoryTerminalRoundWon,
} from "../src/engine/factoryTerminalPresentation.ts";
import { renderFactoryTerminalField, renderFactoryTerminalPresentation } from "../src/engine/factoryTerminalRender.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
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

  // The canonical decline line: page-0 A at 301, page-1 A at 602, record
  // question A at 904 (the app's release ages are the tick after the
  // fixture's own dismiss presses), then the record menu's NO at the decline
  // edge (age 1757 = frame 4989) and the farewell's own second A at the
  // dismiss edge (age 1859 = frame 5091). All ages match the committed
  // scratch-loss-beyond-boundary-probe schedule byte-for-byte.
  function declinedTerminal(command: ReturnType<typeof lossController>["presentation"]["command"]) {
    let terminal = createFactoryTerminalLossPresentation(command);
    terminal = advanceTo(terminal, 301);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceTo(terminal, 602);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceTo(terminal, 904);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceTo(terminal, 1756);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    return terminal;
  }

  it("stores the decline edge on the record menu's NO choice and dismisses on the farewell's own second A", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    expect(FACTORY_LOSS_TERMINAL_PROFILE.declineFarewell).toEqual([
      "We look forward to your next visit.",
      "",
    ]);
    const terminal = declinedTerminal(command);
    expect(terminal).toMatchObject({
      age: 1757,
      recordPromptReleaseAge: 905,
      recordChoice: "no",
      declineFarewellReleaseAge: 1757,
    });
    expect(factoryTerminalDeclineEdgeAge(terminal)).toBe(1757);
    // Dense 1-tick oracle probe of the decline span (frames 4988-5093):
    // the multichoice window clears at the decline edge + 1 (frame 4990),
    // the scrolled record question text clears at edge + 3 (frame 4992),
    // the farewell's first glyph "W" lands at edge + 4 (frame 4993), the
    // 35-glyph line finishes at edge + 38 (frame 5027) and holds from
    // edge + 39 (frame 5028) with no wait-cursor.
    expect(factoryTerminalDeclineMenuClearAge(terminal)).toBe(1758);
    expect(factoryTerminalDeclineBoxClearAge(terminal)).toBe(1760);
    expect(factoryTerminalDeclineTextFirstAge(terminal)).toBe(1761);
    expect(FACTORY_LOSS_TERMINAL_PROFILE.declineFarewell[0].length).toBe(35);
    // The farewell's own A dismiss is accepted from edge + 39 (last glyph
    // + 1, the MSGBOX_DEFAULT waitmessage gate); the real second A (fixture
    // press at frames 5090-5091) registers at age 1859.
    let dismissed = advanceTo(terminal, 1858);
    dismissed = advanceFactoryTerminalPresentation(dismissed, {
      pressedA: true,
    });
    expect(dismissed).toMatchObject({
      age: 1859,
      declineDismissAge: 1859,
    });
    expect(factoryTerminalDeclineBoxGoneAge(dismissed)).toBe(1861);
  });

  it("renders the decline span: menu clears at edge+1, box wipes at edge+3, first 'W' at edge+4, bare field from dismiss+2", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    const atAge = (age: number) => {
      let terminal = declinedTerminal(command);
      terminal = advanceTo(terminal, age);
      return renderFactoryTerminalPresentation(
        terminal,
        () => createFramebuffer(),
      );
    };
    const px = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!];
    };
    const darkAt = (fb: Uint8Array, x: number, y: number) =>
      fb[(y * 240 + x) * 4]! < 200 &&
      fb[(y * 240 + x) * 4 + 1]! < 200 &&
      fb[(y * 240 + x) * 4 + 2]! < 200;
    // Edge (1757): the YES/NO multichoice window border is still drawn at
    // its source (160,64) position.
    const held = atAge(1757);
    expect(px(held, 162, 65)).toEqual([41, 49, 49]);
    // Edge + 1 (1758): the multichoice window is gone (its border pixel now
    // reads as the field behind it) while the scrolled record question text
    // is still drawn in the box.
    const menuCleared = atAge(1758);
    expect(px(menuCleared, 162, 65)).not.toEqual([41, 49, 49]);
    expect(darkAt(menuCleared, 16, 124)).toBe(true);
    // Edge + 3 (1760): FillWindowPixelBuffer wipes the box interior (the
    // farewell has not started typing).
    const boxCleared = atAge(1760);
    expect(darkAt(boxCleared, 16, 124)).toBe(false);
    expect(darkAt(boxCleared, 40, 127)).toBe(false);
    // Edge + 4 (1761): the "W" of "We look forward to your next visit."
    // prints at the box's line-1 origin (x16-21, y124-132), same drawer the
    // record prompt's own "W" used.
    const firstGlyph = atAge(1761);
    expect(firstGlyph).not.toEqual(boxCleared);
    expect(darkAt(firstGlyph, 16, 124)).toBe(true);
    expect(darkAt(firstGlyph, 20, 124)).toBe(true);
    expect(darkAt(firstGlyph, 17, 130)).toBe(true);
    // Edge + 102 (1859) is the real second A: the farewell stays fully drawn
    // through the dismiss, then the box closes into the bare Lobby field from
    // dismiss + 2 (1861) -- the field-only frame equals renderFactoryTerminalField.
    let dismissed = advanceTo(declinedTerminal(command), 1858);
    dismissed = advanceFactoryTerminalPresentation(dismissed, {
      pressedA: true,
    });
    expect(dismissed.age).toBe(1859);
    const stillHeld = renderFactoryTerminalPresentation(
      advanceTo(dismissed, 1860),
      () => createFramebuffer(),
    );
    expect(darkAt(stillHeld, 16, 124)).toBe(true);
    const boxGone = renderFactoryTerminalPresentation(
      advanceTo(dismissed, 1861),
      () => createFramebuffer(),
    );
    expect(boxGone).toEqual(renderFactoryTerminalField());
  });

  it("holds the released page for nextPageVisualDelay ticks, then clears it and starts the next page typing the same tick (the box clear/reopen handoff)", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    let terminal = createFactoryTerminalLossPresentation(command);
    terminal = advanceTo(terminal, 170);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.firstPageReleaseAge).toBe(171);
    // The real CHAR_PROMPT_CLEAR handoff: page-0 stays fully drawn for the
    // profile's nextPageVisualDelay ticks after the release edge, then
    // FillWindowPixelBuffer wipes the box and page-1 prints from the same
    // tick (dense-mapped real schedule: page-1 typing at release+2).
    expect(terminal.profile.nextPageVisualDelay).toBe(2);
    expect(factoryTerminalPageTextFirstAge(terminal, 1)).toBe(173);
    terminal = advanceTo(terminal, 172);
    expect(factoryTerminalPageVisualPhase(terminal, 0)).toBe("held");
    expect(factoryTerminalActivePage(terminal)).toBe(0);
    terminal = advanceTo(terminal, 173);
    expect(factoryTerminalPageVisualPhase(terminal, 0)).toBe("cleared");
    expect(factoryTerminalPageVisualPhase(terminal, 1)).toBe("typing");
    expect(factoryTerminalActivePage(terminal)).toBe(1);
    // Page-1's opening "I " lands on the box frame itself, so the box reads
    // empty for its first two printing ticks (the oracle's 3535-3536 look).
    expect(factoryTerminalVisibleChars(terminal)).toBe(1);
  });

  it("renders the box-clear/reopen phase as the empty frame, then the first visible page-1 glyph at the source-relative position", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    const releasedAt = (age: number) => {
      let terminal = createFactoryTerminalLossPresentation(command);
      terminal = advanceTo(terminal, 170);
      terminal = advanceFactoryTerminalPresentation(terminal, {
        pressedA: true,
      });
      terminal = advanceTo(terminal, age);
      return renderFactoryTerminalPresentation(
        terminal,
        () => createFramebuffer(),
      );
    };
    const darkAt = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return fb[i]! < 200 && fb[i + 1]! < 200 && fb[i + 2]! < 200;
    };
    // Age 172 = release + nextPageVisualDelay - 1: the released page-0 is
    // still fully drawn (its "T" glyph spans x16-21).
    const held = releasedAt(172);
    expect(darkAt(held, 16, 124)).toBe(true);
    // Age 173 = release + nextPageVisualDelay: page-0's text is wiped and
    // page-1's first char ("I") prints onto the box frame itself — page-0's
    // text is gone while the frame region reads as before (the oracle's
    // 3535-3536 clear/reopen look).
    const cleared = releasedAt(173);
    expect(darkAt(cleared, 40, 127)).toBe(false);
    expect(darkAt(cleared, 16, 124)).toBe(true);
    // Age 175 = two more printing ticks: "I w" — the first visible glyph
    // ("w") appears at the source-derived x25-30/y127-132 position.
    const reopening = releasedAt(175);
    expect(reopening).not.toEqual(cleared);
    expect(darkAt(reopening, 25, 127)).toBe(true);
    expect(darkAt(reopening, 27, 127)).toBe(true);
    expect(darkAt(reopening, 29, 127)).toBe(true);
  });

  it("types page-0's first glyph at the source-relative firstPageTextAge (142), one tick after the box opens", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    // Dense oracle re-probe of the committed LOSS fixture pins the real
    // schedule: box frame at terminal age 141 (frame 3373), first page-0
    // glyph "T" at age 142 (frame 3374), "Th" at 143 (frame 3375). The old
    // firstPageTextAge 143 was never oracle-verified (the prior slice's
    // scratch windows only covered page-1's span, 3534+) and delayed every
    // page-0 typing + cursor frame by one tick (frames 3374-3403 typing,
    // 3412-3529 cursor phase).
    expect(createFactoryTerminalLossPresentation(command).profile.firstPageTextAge)
      .toBe(142);
    let terminal = createFactoryTerminalLossPresentation(command);
    terminal = advanceTo(terminal, 141);
    expect(factoryTerminalVisibleChars(terminal)).toBe(0);
    terminal = advanceTo(terminal, 142);
    expect(factoryTerminalVisibleChars(terminal)).toBe(1);
    terminal = advanceTo(terminal, 143);
    expect(factoryTerminalVisibleChars(terminal)).toBe(2);
  });

  it("pins the LOSS record prompt on the real restore-to-question delay (169), so the box clears at second release +220 and types the tick after", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    // Dense 1-tick oracle probe of the committed LOSS fixture pins the real
    // record-question schedule: box clears at frame 4054 (terminal age 822),
    // first glyph "W" of "Would you like..." at 4055 (age 823), first red
    // wait-cursor at 4118 (age 886). The app's releases are the tick after
    // the fixture's own dismiss A (page-0 A at age 301 → release 302, page-1
    // A at age 602 → release 603), so restore = 603 + 50 = 653 and the
    // record prompt must land at 822 — i.e. recordPromptDelayFromRestore is
    // 169, not 172 (the old 172 cleared two ticks late and typed two chars
    // behind every frame 4054-4126, the box-clear residual #73 measured).
    // The roundWon profile already carried 169, so both outcomes now share
    // the same restore-to-question gap.
    expect(FACTORY_LOSS_TERMINAL_PROFILE.recordPromptDelayFromRestore).toBe(169);
    let terminal = createFactoryTerminalLossPresentation(command);
    terminal = advanceTo(terminal, 301);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    terminal = advanceTo(terminal, 602);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
    expect(terminal.firstPageReleaseAge).toBe(302);
    expect(terminal.secondPageReleaseAge).toBe(603);
    expect(factoryTerminalRestoreAge(terminal)).toBe(653);
    expect(factoryTerminalRecordPromptFirstAge(terminal)).toBe(822);
    expect(factoryTerminalRecordPromptTextFirstAge(terminal)).toBe(823);
    // The oracle's first red wait-cursor lands at age 886 (frame 4118);
    // inputReady turns true one tick earlier (822 + recordPromptInputDelay).
    terminal = advanceTo(terminal, 884);
    expect(factoryTerminalRecordPromptInputReady(terminal)).toBe(false);
    terminal = advanceFactoryTerminalPresentation(terminal, {});
    expect(terminal.age).toBe(885);
    expect(factoryTerminalRecordPromptInputReady(terminal)).toBe(true);
  });

  it("renders the LOSS record prompt's dense-mapped box-clear frame empty (age 822) and its first 'W' glyph the next tick (age 823)", () => {
    const command = lossController().presentation!.command;
    if (command.type !== "roundLost") throw new Error("expected roundLost");
    const atAge = (age: number) => {
      let terminal = createFactoryTerminalLossPresentation(command);
      terminal = advanceTo(terminal, 301);
      terminal = advanceFactoryTerminalPresentation(terminal, {
        pressedA: true,
      });
      terminal = advanceTo(terminal, 602);
      terminal = advanceFactoryTerminalPresentation(terminal, {
        pressedA: true,
      });
      terminal = advanceTo(terminal, age);
      return renderFactoryTerminalPresentation(
        terminal,
        () => createFramebuffer(),
      );
    };
    const darkAt = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return fb[i]! < 200 && fb[i + 1]! < 200 && fb[i + 2]! < 200;
    };
    // Age 822 = recordPromptFirstAge (the real frame 4054 box-clear): the
    // old page-2 text is wiped and the record question has not started, so
    // the box interior reads empty.
    const cleared = atAge(822);
    expect(darkAt(cleared, 40, 127)).toBe(false);
    expect(darkAt(cleared, 16, 124)).toBe(false);
    // Age 823 = recordPromptTextFirstAge (the real frame 4055): the "W" of
    // "Would you like to record your last" prints at the box's line-1
    // origin (x16-21, y124-132).
    const firstGlyph = atAge(823);
    expect(firstGlyph).not.toEqual(cleared);
    expect(darkAt(firstGlyph, 16, 124)).toBe(true);
    expect(darkAt(firstGlyph, 20, 124)).toBe(true);
    expect(darkAt(firstGlyph, 17, 130)).toBe(true);
    expect(darkAt(firstGlyph, 19, 130)).toBe(true);
  });

  it("places the bootstrapped save's north-facing Brendan at the source-derived (112,56) OAM anchor, not (113,56)", () => {
    // The real Lobby warp (4,8) and the generic 16x32 feet-anchor put every
    // object event at `tile*16 - cameraOriginPx` (box top y = tile.y*16 -
    // cameraOriginPx.y - 16, event_object_movement.c:1850-1854). The player's
    // tile is (4,8) and cameraOriginPx is {x:-48, y:56}, so the anchor is
    // (112,56). The removed player-only +1px x2 sub-pixel offset (which drew
    // the sprite at (113,56)) reproduced the ~133px oracle residual exactly;
    // the oracle's player at (112,56) matches frame 3365 with 0 diff. These
    // pins assert player-unique pixels at the source-derived screen positions
    // (hat blue-grey 57,74,123 at the sprite's top-left; hat white
    // 222,231,239; dark navy 16,33,57; shirt red 123,66,66) — each would
    // land one column right under the old +1 offset.
    const fb = renderFactoryTerminalField();
    const px = (x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!];
    };
    expect(px(117, 66)).toEqual([57, 74, 123]);
    expect(px(116, 69)).toEqual([222, 231, 239]);
    expect(px(113, 80)).toEqual([123, 66, 66]);
    expect(px(115, 73)).toEqual([16, 33, 57]);
    expect(px(125, 82)).toEqual([16, 33, 57]);
    // The sprite's drawn bbox is 113..126 x 66..85, i.e. the source 16x32
    // frame anchored at (112,56) with its transparent left/right columns:
    // (126,81) is a player-unique dark pixel at the right edge and (117,66)
    // the hat's top-left — the left-edge shirt red at x=113 pins the anchor
    // (under the removed +1 offset it would sit at x=114, i.e. (113,80)
    // would not be the player's shirt).
    expect(px(126, 81)).toEqual([16, 33, 57]);
    expect(px(117, 66)).toEqual([57, 74, 123]);
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
