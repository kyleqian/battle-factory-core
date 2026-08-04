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
import { battleStringPrintableLength } from "../src/engine/battleStringResolver.ts";

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
  provenanceOverride?: Readonly<{ opcodeName?: string }>,
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: Object.freeze({ ...PROVENANCE, ...provenanceOverride }),
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
  pressA = true,
): BattleResolutionPresentationState {
  let current = resolution;
  for (let i = 0; i < budget && !predicate(current); i += 1) {
    current = stepPresenting(current, pressA);
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
    // STRINGID_PLAYERDEFEATEDTRAINER1's own template ends in a literal `\p`
    // (battle_message.c:371) -- an ordinary button message, so it keeps the
    // real down-arrow wait-cursor (noCursor: false). STRINGID_TRAINER1LOSETEXT
    // is a bare `{B_TRAINER1_LOSE_TEXT}` placeholder (battle_message.c:55)
    // whose only wait comes from BufferStringBattle's appended
    // EXT_CTRL_CODE_PAUSE_UNTIL_PRESS (battle_message.c:2741-2748), which
    // never spawns the down-arrow cursor (text.c:1018-1022, 884-900).
    expect(commands[0]).toMatchObject({ type: "message", advance: "button", noCursor: false, lines: ["Player defeated", "BUG CATCHER DESTIN!"] });
    expect(commands[1]).toMatchObject({ type: "trainer-slide", battler: 1, direction: "in", timing: { minimumFrames: 38 } });
    expect(commands[2]).toMatchObject({ type: "message", advance: "button", noCursor: true, lines: ["PLEASE I NEED", "SOME WATER"] });

    // Before the first dismiss: no trainer visual yet (still off-screen/absent).
    expect(createBattleResolutionPresentationRenderView(resolution).trainerSlide).toBeNull();

    // Dismiss the outcome box (a real button-press wait, not instant); land
    // freshly on the slide-in command at phaseElapsed 0, fully off-screen.
    const justSliding = advanceUntil(resolution, (state) => state.commandIndex === 1);
    expect(justSliding.lifecycle).toEqual({ phase: "presenting", phaseElapsed: 0 });
    expect(createBattleResolutionPresentationRenderView(justSliding).trainerSlide)
      .toEqual({ battler: 1, picSymbol: CANONICAL_DESTIN_PRESENTATION.trainerPic, offscreenX2: 76 });

    // Mid-slide: offscreenX2 shrinks 2px/tick toward 0, ported from
    // SpriteCB_TrainerSlideIn (TRAINER_SLIDE_TIMING's doc).
    const midSlide = advanceUntil(
      justSliding,
      (state) => state.commandIndex === 1 && state.lifecycle.phaseElapsed === 20,
    );
    expect(createBattleResolutionPresentationRenderView(midSlide).trainerSlide)
      .toMatchObject({ offscreenX2: 2 * (38 - 20) });

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
        // Real provenance opcodeName (VARIOUS_RETURN_OPPONENT_MON1 dispatches
        // through Cmd_various), not the generic placeholder -- this is the
        // real CONTROLLER_RETURNMONTOBALL receipt
        // (docs/terminal-seam-loss-path-ground-truth.md §2: sprite AND
        // healthbox both gone by oracle tick 2996), which
        // battleResolutionPresentation.ts's "sprite-visibility" command
        // distinguishes from the unrelated CONTROLLER_SPRITEINVISIBILITY
        // (Dig/Fly) receipt by this exact opcode name.
        event(0, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }, { opcodeName: "B_SCR_OP_VARIOUS" }),
        event(1, { kind: "trainer-slide-in", battler: 1 }),
        event(2, { kind: "message", messageId: "STRINGID_TRAINER1WINTEXT", substitutions: [] }),
      ],
      "trainer-win",
      CANONICAL_JENSON_PRESENTATION,
    );
    const commands = resolution.segments[0]!.commands;
    expect(commands.map((c) => c.type)).toEqual(["sprite-visibility", "trainer-slide", "message"]);
    expect(commands[1]).toMatchObject({ type: "trainer-slide", battler: 1, direction: "in", timing: { minimumFrames: 38 } });
    // STRINGID_TRAINER1WINTEXT is the LOSS-side mirror of TRAINER1LOSETEXT
    // above -- same bare `{B_TRAINER1_WIN_TEXT}` placeholder
    // (battle_message.c:1424) and the same appended
    // EXT_CTRL_CODE_PAUSE_UNTIL_PRESS wait with no down-arrow cursor.
    expect(commands[2]).toMatchObject({
      type: "message",
      advance: "button",
      noCursor: true,
      lines: ["YOUR POKéMON DON’T", "MAKE THE CUT"],
    });

    // Different trainer identity resolves a different pic symbol -- the
    // slide-in visual is keyed off opponentTrainer, not hardcoded.
    expect(CANONICAL_JENSON_PRESENTATION.trainerPic).not.toBe(CANONICAL_DESTIN_PRESENTATION.trainerPic);

    const sliding = advanceUntil(resolution, (state) => state.commandIndex === 1);
    const view = createBattleResolutionPresentationRenderView(sliding);
    expect(view.trainerSlide).toMatchObject({ battler: 1, picSymbol: CANONICAL_JENSON_PRESENTATION.trainerPic });

    // The recalled opponent's healthbox clears together with its sprite
    // (ground-truth doc §2, tick 2996): the ROM's own
    // OpponentHandleReturnMonToBall/FreeMonSpriteAfterSwitchOutAnim
    // (battle_controller_opponent.c) calls SetHealthboxSpriteInvisible
    // alongside destroying the sprite -- unlike a Dig/Fly semi-invisible
    // sprite toggle, which never touches the healthbox.
    expect(view.visibility.opponent).toEqual({ sprite: false, healthbox: false });

    const final = driveToTerminalHandoff(resolution);
    expect(final.lifecycle.phase).toBe("terminal-handoff");
    expect(final.pendingBoundary).toEqual({ kind: "terminal", outcome: "trainer-win" });
  });

  it("waitCursor: an ordinary button message shows the down-arrow cursor once ready, a quote-placeholder message never does (ISSUES #73)", () => {
    // Deliberately short lines (unlike the real STRINGID_PLAYERDEFEATEDTRAINER1/
    // STRINGID_TRAINER1LOSETEXT production text above) so both messages
    // reach `isBattleResolutionButtonMessageReady` well before
    // `isBattleResolutionCommandComplete`'s `max(minimumFrames, printableLength)`
    // duration would otherwise force-advance past them -- this test isolates
    // the `noCursor` wiring end-to-end at the rendered view, not the
    // pre-existing printableLength-vs-minimumFrames race longer production
    // strings can hit (out of scope for this step).
    const resolution = terminalResolution(
      [
        event(0, { kind: "health-bar-update", battler: 0, healthValue: 200 }),
        event(1, { kind: "hp-change", battler: 0, from: 200, to: 0 }),
        event(2, { kind: "faint-animation", battler: 0 }),
        event(3, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
        event(4, { kind: "message", messageId: "STRINGID_TRAINER1WINTEXT", substitutions: [] }),
      ],
      "trainer-win",
      { ...CANONICAL_JENSON_PRESENTATION, speechWin: ["HI", "BYE"] },
    );
    const commands = resolution.segments[0]!.commands;
    expect(commands.map((c) => c.type)).toEqual(["hp", "faint", "message", "message"]);
    expect(commands[2]).toMatchObject({ advance: "button", noCursor: false });
    expect(commands[3]).toMatchObject({ advance: "button", noCursor: true, lines: ["HI", "BYE"] });

    const ordinaryReady = advanceUntil(
      resolution,
      (state) => state.commandIndex === 2 && isBattleResolutionButtonMessageReady(state),
      500,
      false,
    );
    expect(createBattleResolutionPresentationRenderView(ordinaryReady).waitCursor).not.toBeNull();

    const quoteStart = advanceUntil(resolution, (state) => state.commandIndex === 3);
    const quoteReady = advanceUntil(
      quoteStart,
      (state) => state.commandIndex === 3 && isBattleResolutionButtonMessageReady(state),
      500,
      false,
    );
    expect(createBattleResolutionPresentationRenderView(quoteReady).waitCursor).toBeNull();
  });

  it("ISSUES #75: DESTIN's real 23-char speechLose quote never completes ahead of its own dismiss wait", () => {
    // DESTIN's speechLose ("PLEASE I NEED"/"SOME WATER") is exactly
    // `minimumFrames - 1` (23, for MESSAGE_TIMING's 24) -- the buggy band's
    // own boundary, so this fixture doubles as the boundary case; a
    // 22-printable-char message sits outside it and never raced.
    const resolution = terminalResolution(
      [
        event(0, { kind: "message", messageId: "STRINGID_PLAYERDEFEATEDTRAINER1", substitutions: [] }),
        event(1, { kind: "trainer-slide-in", battler: 1 }),
        event(2, { kind: "message", messageId: "STRINGID_TRAINER1LOSETEXT", substitutions: [] }),
      ],
      "player-win",
      CANONICAL_DESTIN_PRESENTATION,
    );
    const quoteCommand = resolution.segments[0]!.commands[2]!;
    expect(quoteCommand).toMatchObject({
      type: "message",
      advance: "button",
      lines: ["PLEASE I NEED", "SOME WATER"],
    });
    expect(battleStringPrintableLength(
      (quoteCommand as Extract<typeof quoteCommand, { type: "message" }>).lines,
    )).toBe(23);

    const quoteStart = advanceUntil(resolution, (state) => state.commandIndex === 2);
    expect(quoteStart.lifecycle).toEqual({ phase: "presenting", phaseElapsed: 0 });

    // Drive forward WITHOUT ever pressing A, through the exact tick
    // (`phaseElapsed: 23`) where the pre-fix duration formula
    // (`23 + 1 >= max(24, 23)`) reported the message complete -- one tick
    // before `isBattleResolutionButtonMessageReady` first goes true
    // (`23 >= 24` is false). A button-advance message must never be
    // "complete" ahead of "ready".
    let held = quoteStart;
    for (let tick = 0; tick < 23; tick += 1) {
      held = stepPresenting(held, false);
    }
    expect(held.commandIndex).toBe(2);
    expect(held.lifecycle).toEqual({ phase: "presenting", phaseElapsed: 23 });
    expect(isBattleResolutionButtonMessageReady(held)).toBe(false);
    expect(isBattleResolutionCommandComplete(held)).toBe(false);

    // The very next un-pressed tick is where the old code silently jumped
    // straight to the terminal handoff (`commandIndex` 2 -> 3) with zero
    // button input observed. It must instead still be sitting on the same
    // message, still "presenting" -- not yet ready, not yet dismissed.
    const nextTick = stepPresenting(held, false);
    expect(nextTick.commandIndex).toBe(2);
    expect(nextTick.lifecycle).toEqual({ phase: "presenting", phaseElapsed: 24 });

    // One more un-pressed tick reaches the ready threshold: the message now
    // waits for real dismiss input instead of auto-advancing past it.
    const ready = stepPresenting(nextTick, false);
    expect(ready.commandIndex).toBe(2);
    expect(ready.lifecycle).toEqual({ phase: "awaiting-message-dismiss", phaseElapsed: 24 });
    expect(isBattleResolutionButtonMessageReady(ready)).toBe(true);

    // Continuing to withhold input holds it frozen there -- no silent skip.
    expect(stepPresenting(ready, false)).toEqual(ready);

    // Only a real "A" press advances past the message -- straight to the
    // terminal handoff since it's the segment's last command.
    const dismissed = stepPresenting(ready, true);
    expect(dismissed.commandIndex).toBe(3);
    expect(dismissed.lifecycle.phase).toBe("terminal-handoff");
  });
});
