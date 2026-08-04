import { describe, expect, it } from "vitest";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  createBattleResolutionPresentation,
  type BattleResolutionPresentationState,
  type CreateBattleResolutionPresentationInput,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleResolutionPresentationRenderView,
  isBattleResolutionButtonMessageReady,
  isBattleResolutionCommandComplete,
} from "../src/engine/battleResolutionPresentationRender.ts";
import {
  createBattleState,
  type BattleBoundary,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  CANONICAL_DESTIN_PRESENTATION,
  CANONICAL_JENSON_PRESENTATION,
} from "../src/engine/factoryTrainerPresentation.ts";

/**
 * ISSUES #73 item 1 (`docs/terminal-seam-round-flow-scout.md` §3(iii)): the
 * generic route's terminal win/loss text now runs a real presentation phase
 * (trainer slide-in, then each resolved message as its own dismissible box)
 * before the postwin/factoryTerminal handoff -- instead of the events
 * silently falling through `projectBattleResolutionCommands` with zero
 * visual (the prior state of the world, per ISSUES #73's own confirmation
 * that no case existed for `trainer-slide-in`/`trainer-slide-out`).
 *
 * Event sequences mirror the real production shapes pinned by
 * `battleScriptFaintedActionsOrchestration.test.ts`'s "the opponent's own
 * terminal outcome" (WIN) and "the LOSS terminal outcome" (LOSS) tests --
 * this file proves what `battleResolutionPresentation.ts` does with that
 * exact event shape, the same "direct resolver-branch" idiom
 * `presentationStringTerminalSeamWin.test.ts` already uses.
 *
 * Red-verified via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/battleResolutionPresentationRender.ts src/engine/battleScene.ts`:
 * both `it`s below fail their very first assertion pre-fix -- the command
 * array is `["message", "message", "turn-end"]` (WIN) /
 * `["sprite-visibility", "message", "turn-end"]` (LOSS): the
 * `trainer-slide-in` event is silently dropped (no case existed in
 * `projectBattleResolutionCommands`, matching ISSUES #73's own "falls
 * through with zero visual" finding) and the quote message defaults to
 * `advance: "automatic"` (no `TERMINAL_SEAM_BUTTON_MESSAGE_IDS` set existed
 * yet), so a synthetic `turn-end` command gets appended instead of ever
 * reaching `terminal-handoff` via a real dismiss.
 */

const MOVE_TACKLE = 33;
const ABILITY_NONE = 0;

const PLAYER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12, // BUTTERFREE
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: ABILITY_NONE,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 80,
  spDefense: 80,
  speed: 120,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});

const TRAINER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 198, // MURKROW
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: ABILITY_NONE,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 60,
  spDefense: 60,
  speed: 60,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_DARK", "TYPE_FLYING"] as const,
});

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function event(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: Object.freeze(PROVENANCE),
  });
}

function terminalResolution(
  events: readonly BattleKernelSemanticEvent[],
  outcome: "player-win" | "trainer-win",
  opponentTrainer: Readonly<{
    className: string;
    name: string;
    speechLose: readonly [string, string];
    speechWin?: readonly [string, string];
    trainerPic?: string;
  }>,
): BattleResolutionPresentationState {
  const config: FactoryFullTurnConfig = Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: PLAYER_BASE,
    trainer: TRAINER_BASE,
  });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("fixture has no source command");
  }
  const boundary: BattleBoundary = Object.freeze({ kind: "terminal", outcome });
  const state = Object.freeze({
    ...createBattleState({
      rules: initial.rules,
      rngSeed: 9,
      request: initial.boundary.request,
    }),
    boundary,
  });
  const transition = Object.freeze({
    kind: "terminal" as const,
    state,
    events: Object.freeze(events),
    outcome,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  const command = createBattleCommandPresentation(initial.boundary.request, initial.rules.rulesContext, 0);
  const input: CreateBattleResolutionPresentationInput = {
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
    opponentTrainer,
  };
  return Object.freeze({
    ...createBattleResolutionPresentation(input),
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    confirmHandoff: null,
  });
}

/** Mirrors `advanceFactoryRoundBattleResolution`'s own "presenting"/"awaiting-message-dismiss" step logic (factoryRoundBattleOrchestrator.ts) without the full orchestrator state. */
function stepPresenting(
  resolution: BattleResolutionPresentationState,
  pressA: boolean,
): BattleResolutionPresentationState {
  const segment = resolution.segments[resolution.segmentIndex]!;
  const command = segment.commands[resolution.commandIndex];
  if (command === undefined) {
    return Object.freeze({
      ...resolution,
      lifecycle: Object.freeze({
        phase: resolution.pendingBoundary.kind === "terminal"
          ? "terminal-handoff" as const
          : "next-command-handoff" as const,
        phaseElapsed: 0,
      }),
    });
  }
  if (
    command.type === "message"
    && command.advance === "button"
    && isBattleResolutionButtonMessageReady(resolution)
  ) {
    if (!pressA) {
      return Object.freeze({
        ...resolution,
        lifecycle: Object.freeze({
          phase: "awaiting-message-dismiss" as const,
          phaseElapsed: resolution.lifecycle.phaseElapsed,
        }),
      });
    }
    const nextCommandIndex = resolution.commandIndex + 1;
    return Object.freeze({
      ...resolution,
      commandIndex: nextCommandIndex,
      lifecycle: Object.freeze({
        phase: nextCommandIndex >= segment.commands.length
          ? (resolution.pendingBoundary.kind === "terminal" ? "terminal-handoff" as const : "next-command-handoff" as const)
          : "presenting" as const,
        phaseElapsed: 0,
      }),
    });
  }
  if (resolution.lifecycle.phase === "awaiting-message-dismiss") {
    if (!pressA) return resolution;
    const nextCommandIndex = resolution.commandIndex + 1;
    return Object.freeze({
      ...resolution,
      commandIndex: nextCommandIndex,
      lifecycle: Object.freeze({
        phase: nextCommandIndex >= segment.commands.length
          ? (resolution.pendingBoundary.kind === "terminal" ? "terminal-handoff" as const : "next-command-handoff" as const)
          : "presenting" as const,
        phaseElapsed: 0,
      }),
    });
  }
  if (!isBattleResolutionCommandComplete(resolution)) {
    return Object.freeze({
      ...resolution,
      lifecycle: Object.freeze({
        phase: "presenting" as const,
        phaseElapsed: resolution.lifecycle.phaseElapsed + 1,
      }),
    });
  }
  const nextCommandIndex = resolution.commandIndex + 1;
  return Object.freeze({
    ...resolution,
    commandIndex: nextCommandIndex,
    lifecycle: Object.freeze({
      phase: nextCommandIndex >= segment.commands.length
        ? (resolution.pendingBoundary.kind === "terminal" ? "terminal-handoff" as const : "next-command-handoff" as const)
        : "presenting" as const,
      phaseElapsed: 0,
    }),
  });
}

function advanceUntil(
  resolution: BattleResolutionPresentationState,
  predicate: (state: BattleResolutionPresentationState) => boolean,
  budget = 500,
): BattleResolutionPresentationState {
  let current = resolution;
  for (let i = 0; i < budget && !predicate(current); i += 1) {
    current = stepPresenting(current, true);
  }
  if (!predicate(current)) {
    throw new Error("resolution did not reach the expected state within budget");
  }
  return current;
}

function driveToTerminalHandoff(
  resolution: BattleResolutionPresentationState,
): BattleResolutionPresentationState {
  return advanceUntil(resolution, (state) => state.lifecycle.phase === "terminal-handoff");
}

describe("terminal-seam presentation phase: generic trainer slide-in + dismissible message boxes (ISSUES #73 item 1)", () => {
  it("WIN (DESTIN): message(outcome) -> trainer-slide(in, battler 1) -> message(quote) -> terminal-handoff", () => {
    const resolution = terminalResolution(
      [
        event(0, { kind: "message", messageId: "STRINGID_PLAYERDEFEATEDTRAINER1", substitutions: [] }),
        event(1, { kind: "trainer-slide-in", battler: 1 }),
        event(2, { kind: "message", messageId: "STRINGID_TRAINER1LOSETEXT", substitutions: [] }),
      ],
      "player-win",
      CANONICAL_DESTIN_PRESENTATION,
    );
    const commands = resolution.segments[0]!.commands;
    expect(commands.map((c) => c.type)).toEqual(["message", "trainer-slide", "message"]);
    expect(commands[0]).toMatchObject({ type: "message", advance: "button", lines: ["Player defeated", "BUG CATCHER DESTIN!"] });
    expect(commands[1]).toMatchObject({ type: "trainer-slide", battler: 1, direction: "in", timing: { minimumFrames: 53 } });
    expect(commands[2]).toMatchObject({ type: "message", advance: "button", lines: ["PLEASE I NEED", "SOME WATER"] });

    // Before the first dismiss: no trainer visual yet (still off-screen/absent).
    expect(createBattleResolutionPresentationRenderView(resolution).trainerSlide).toBeNull();

    // Dismiss the outcome box (a real button-press wait, not instant); land
    // freshly on the slide-in command at phaseElapsed 0, fully off-screen.
    const justSliding = advanceUntil(resolution, (state) => state.commandIndex === 1);
    expect(justSliding.lifecycle).toEqual({ phase: "presenting", phaseElapsed: 0 });
    expect(createBattleResolutionPresentationRenderView(justSliding).trainerSlide)
      .toEqual({ battler: 1, picSymbol: CANONICAL_DESTIN_PRESENTATION.trainerPic, offscreenX2: 106 });

    // Mid-slide: offscreenX2 shrinks 2px/tick toward 0, ported from
    // SpriteCB_TrainerSlideIn (TRAINER_SLIDE_TIMING's doc).
    const midSlide = advanceUntil(
      justSliding,
      (state) => state.commandIndex === 1 && state.lifecycle.phaseElapsed === 20,
    );
    expect(createBattleResolutionPresentationRenderView(midSlide).trainerSlide)
      .toMatchObject({ offscreenX2: 2 * (53 - 20) });

    // Fully settled: the slide command completes, the quote message begins,
    // and the trainer stays visible (settled, offscreenX2 0) through it.
    const settled = advanceUntil(midSlide, (state) => state.commandIndex === 2);
    const view = createBattleResolutionPresentationRenderView(settled);
    expect(view.trainerSlide).toEqual({ battler: 1, picSymbol: CANONICAL_DESTIN_PRESENTATION.trainerPic, offscreenX2: 0 });
    expect(view.message?.lines).toEqual(["PLEASE I NEED", "SOME WATER"]);

    const final = driveToTerminalHandoff(settled);
    expect(final.lifecycle.phase).toBe("terminal-handoff");
    expect(final.pendingBoundary).toEqual({ kind: "terminal", outcome: "player-win" });
  });

  it("LOSS (JENSON, non-DESTIN): sprite-visibility(recall) -> trainer-slide(in, battler 1) -> message(quote) -> terminal-handoff -- proves the mapping is data-driven, not DESTIN-hardcoded", () => {
    const resolution = terminalResolution(
      [
        event(0, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
        event(1, { kind: "trainer-slide-in", battler: 1 }),
        event(2, { kind: "message", messageId: "STRINGID_TRAINER1WINTEXT", substitutions: [] }),
      ],
      "trainer-win",
      CANONICAL_JENSON_PRESENTATION,
    );
    const commands = resolution.segments[0]!.commands;
    expect(commands.map((c) => c.type)).toEqual(["sprite-visibility", "trainer-slide", "message"]);
    expect(commands[1]).toMatchObject({ type: "trainer-slide", battler: 1, direction: "in", timing: { minimumFrames: 53 } });
    expect(commands[2]).toMatchObject({
      type: "message",
      advance: "button",
      lines: ["YOUR POKéMON DON’T", "MAKE THE CUT"],
    });

    // Different trainer identity resolves a different pic symbol -- the
    // slide-in visual is keyed off opponentTrainer, not hardcoded.
    expect(CANONICAL_JENSON_PRESENTATION.trainerPic).not.toBe(CANONICAL_DESTIN_PRESENTATION.trainerPic);

    const sliding = advanceUntil(resolution, (state) => state.commandIndex === 1);
    const view = createBattleResolutionPresentationRenderView(sliding);
    expect(view.trainerSlide).toMatchObject({ battler: 1, picSymbol: CANONICAL_JENSON_PRESENTATION.trainerPic });

    const final = driveToTerminalHandoff(resolution);
    expect(final.lifecycle.phase).toBe("terminal-handoff");
    expect(final.pendingBoundary).toEqual({ kind: "terminal", outcome: "trainer-win" });
  });
});
