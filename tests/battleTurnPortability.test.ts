import { describe, expect, it } from "vitest";
import { BATTLE2_OFF_TURN1_COMMAND_DURATIONS } from "../src/engine/battle2OffScenario.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import { createFactoryFullTurnBattleState } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  acknowledgeSceneOffCommand,
  pendingSceneOffCommand,
} from "../src/engine/sceneOffPresentation.ts";
import {
  advanceStagedBattleTurn,
  stageFactoryFullTurnBattle,
} from "../src/engine/stagedBattleTurn.ts";

function stageCanonicalKernelTurn() {
  return stageFactoryFullTurnBattle(
    {
      initialState: createFactoryFullTurnBattleState({
        requestId: 1,
        rngSeed: 3530724670,
        player: {
          species: 95,
          moveId: 157,
          moves: [157, 20, 225, 201],
          pp: [10, 20, 20, 10],
          ability: 5,
          item: 142,
          friendship: 0,
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
          pp: [10, 5, 15, 10],
          ability: 4,
          item: 142,
          friendship: 0,
          attack: 118,
          defense: 96,
          spAttack: 93,
          spDefense: 51,
          speed: 61,
          hp: 91,
          maxHp: 91,
          types: ["TYPE_ROCK", "TYPE_WATER"],
        },
      }),
      playerSubmission: {
        requestId: 1,
        side: "player",
        decision: {
          kind: "use-move",
          moveSlot: 0,
          targetBattler: 1,
        },
      },
      trainerSubmission: {
        requestId: 2,
        side: "trainer",
        decision: {
          kind: "use-move",
          moveSlot: 2,
          targetBattler: 0,
        },
      },
      battlers: [
        {
          battler: 0,
          name: "ONIX",
          moveNames: [
            "ROCK SLIDE",
            "BIND",
            "DRAGONBREATH",
            "SANDSTORM",
          ],
        },
        {
          battler: 1,
          name: "KABUTO",
          moveNames: [
            "MEGA DRAIN",
            "ANCIENTPOWER",
            "SAND-ATTACK",
            "PROTECT",
          ],
        },
      ],
    },
    BATTLE2_OFF_TURN1_COMMAND_DURATIONS,
  );
}

describe("Battle Scene OFF full-turn kernel portability", () => {
  it("deeply preserves the canonical receipt identity, projection, field boundary, and next request", () => {
    const source = stageCanonicalKernelTurn();
    const staged = advanceStagedBattleTurn(source, true);
    const initial = source.kernel!.initialState;
    const transition = staged.kernelTransition!;
    if (
      initial.boundary.kind !== "decision-required"
      || initial.boundary.request.kind !== "command"
    ) throw new Error("canonical fixture has no source command request");
    const fieldBoundary = createBattleCommandPresentation(
      initial.boundary.request,
      initial.rules.rulesContext,
    ).field;
    const resolution = createBattleResolutionPresentation({
      sourceRequest: initial.boundary.request,
      sourceDecision: source.kernel!.playerSubmission.decision,
      beforeRules: initial.rules,
      transition,
      fieldBoundary,
      confirmHandoff: {
        fightDisplayCursor: 0,
        idleBounceElapsed: 0,
      },
    });

    expect(resolution.resolutionId).toEqual({
      requestId: 1,
      side: "player",
      battler: 0,
    });
    expect(resolution.sourceDecision).toEqual({
      kind: "use-move",
      moveSlot: 0,
      targetBattler: 1,
    });
    expect(resolution.field).toEqual(fieldBoundary);
    expect(resolution.pendingBattle).toBe(transition.state);
    expect(resolution.pendingBoundary).toBe(transition.state.boundary);
    expect(resolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 3, side: "player" },
    });
    expect(resolution.forcedRequest).toBeNull();
    expect(resolution.segments).toHaveLength(1);
    expect(resolution.segments[0]).toMatchObject({
      beforeRules: initial.rules,
      afterRules: transition.state.rules,
      events: transition.events,
    });
    expect(resolution.segments[0]!.commands).toEqual([
      {
        type: "message",
        eventSequence: 0,
        lines: ["ONIX used", "ROCK SLIDE!"],
        advance: "automatic",
        timing: { minimumFrames: 24 },
      },
      {
        type: "move-animation",
        eventSequence: 2,
        battler: 0,
        timing: { minimumFrames: 42 },
      },
      {
        type: "hit-animation",
        eventSequence: 4,
        battler: 1,
        timing: { minimumFrames: 35, firstDisplayedAge: 1 },
      },
      {
        type: "hp",
        eventSequence: 5,
        battler: 1,
        from: 91,
        to: 63,
        healthValue: 28,
        timing: { minimumFrames: 28 },
      },
      {
        type: "message",
        eventSequence: 9,
        lines: ["Foe KABUTO used", "SAND-ATTACK!"],
        advance: "automatic",
        timing: { minimumFrames: 24 },
      },
      {
        type: "stat",
        eventSequence: 11,
        battler: 0,
        stat: "accuracy",
        from: 6,
        to: 5,
        timing: { minimumFrames: 32 },
      },
      {
        type: "message",
        eventSequence: 14,
        lines: ["ONIX’s accuracy", "fell!"],
        advance: "automatic",
        timing: { minimumFrames: 24 },
      },
      { type: "turn-end", timing: { minimumFrames: 8 } },
    ]);
    expect(Object.isFrozen(resolution)).toBe(true);
    expect(Object.isFrozen(resolution.segments[0]!.commands)).toBe(true);
  });

  it("projects the immutable semantic events and request-3 boundary into the same nine commands", () => {
    const staged = advanceStagedBattleTurn(stageCanonicalKernelTurn(), true);
    expect(staged.phase).toBe("presenting");
    expect(staged.kernelTransition?.kind).toBe("decision-required");
    expect(staged.kernelTransition?.state.rng).toEqual({
      value: 3011990093,
      calls: 5,
    });
    expect(staged.kernelTransition?.state.boundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 3, side: "player" },
    });
    expect(staged.presentation?.source).toBe("battle-kernel");
    expect(staged.presentation?.commands).toEqual([
      {
        commandId: 1,
        minimumFrames: 24,
        type: "text",
        lines: ["ONIX used", "ROCK SLIDE!"],
      },
      {
        commandId: 2,
        minimumFrames: 1,
        type: "pp",
        actor: "player",
        move: "ROCK SLIDE",
        from: 10,
        to: 9,
      },
      {
        commandId: 3,
        minimumFrames: 28,
        type: "hp",
        target: "opponent",
        from: 91,
        to: 63,
      },
      {
        commandId: 4,
        minimumFrames: 24,
        type: "text",
        lines: ["Foe KABUTO used", "SAND-ATTACK!"],
      },
      {
        commandId: 5,
        minimumFrames: 1,
        type: "pp",
        actor: "opponent",
        move: "SAND-ATTACK",
        from: 15,
        to: 14,
      },
      {
        commandId: 6,
        minimumFrames: 32,
        type: "stat",
        target: "player",
        stat: "accuracy",
        from: 6,
        to: 5,
      },
      {
        commandId: 7,
        minimumFrames: 24,
        type: "text",
        lines: ["ONIX’s accuracy", "fell!"],
      },
      { commandId: 8, minimumFrames: 8, type: "turnEnd" },
      { commandId: 9, minimumFrames: 6, type: "menu", menu: "action" },
    ]);
  });

  it("keeps the real kernel state immutable while presentation acknowledgements advance", () => {
    let staged = advanceStagedBattleTurn(stageCanonicalKernelTurn(), true);
    const transition = staged.kernelTransition;
    expect(transition).not.toBeNull();
    for (let frame = 0; frame < 200; frame += 1) {
      staged = advanceStagedBattleTurn(staged, false);
    }
    expect(staged.kernelTransition).toBe(transition);
    expect(staged.kernelTransition?.state.rng).toEqual({
      value: 3011990093,
      calls: 5,
    });
    expect(Object.isFrozen(staged.kernelTransition)).toBe(true);
    expect(Object.isFrozen(staged.kernelTransition?.state)).toBe(true);
  });

  it("rejects out-of-order completion and gates input through the real boundary's menu command", () => {
    const staged = advanceStagedBattleTurn(stageCanonicalKernelTurn(), true);
    let presentation = staged.presentation!;
    expect(() => acknowledgeSceneOffCommand(presentation, 2)).toThrow(
      /does not match/,
    );
    while (presentation.commandIndex < presentation.commands.length - 1) {
      presentation = acknowledgeSceneOffCommand(
        presentation,
        pendingSceneOffCommand(presentation)!.commandId,
      );
      expect(presentation.inputReady).toBe(false);
    }
    expect(pendingSceneOffCommand(presentation)?.type).toBe("menu");
    presentation = acknowledgeSceneOffCommand(
      presentation,
      pendingSceneOffCommand(presentation)!.commandId,
    );
    expect(presentation.inputReady).toBe(true);
  });

  it("acknowledges at +145,+146,+160,+260,+261,+311,+400,+404,+405 and accepts the next A at +407", () => {
    let staged = advanceStagedBattleTurn(stageCanonicalKernelTurn(), true);
    const acknowledgementFrames: number[] = [];
    let acknowledged = 0;
    for (let elapsed = 1; elapsed <= 405; elapsed += 1) {
      staged = advanceStagedBattleTurn(staged, false);
      const count = staged.presentation?.acknowledgedCommandIds.length ?? 0;
      if (count !== acknowledged) {
        acknowledgementFrames.push(elapsed);
        acknowledged = count;
      }
      if (elapsed < 405) expect(staged.phase).toBe("presenting");
    }
    expect(acknowledgementFrames).toEqual([
      145,
      146,
      160,
      260,
      261,
      311,
      400,
      404,
      405,
    ]);
    expect(staged.phase).toBe("inputReady");
    expect(staged.nextInputAccepted).toBe(false);
    staged = advanceStagedBattleTurn(staged, false);
    expect(staged.nextInputAccepted).toBe(false);
    staged = advanceStagedBattleTurn(staged, true);
    expect(staged.inputReadyElapsed).toBe(2);
    expect(staged.nextInputAccepted).toBe(true);
  });
});
