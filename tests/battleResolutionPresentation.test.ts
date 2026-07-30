import { describe, expect, it } from "vitest";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  advanceBattleResolutionConfirmHandoff,
  appendBattleResolutionContinuation,
  createBattleResolutionPresentation,
  createBattleTerminalResolutionPresentation,
  storeBattleTerminalPresentationDismiss,
  type BattleResolutionPresentationState,
  type CreateBattleResolutionPresentationInput,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration,
  createBattleResolutionPresentationRenderView,
  isBattleResolutionButtonMessageReady,
  isBattleResolutionCommandComplete,
  isBattleResolutionNextCommandHandoffComplete,
  renderBattleResolutionPresentation,
} from "../src/engine/battleResolutionPresentationRender.ts";
import {
  renderBattleResolutionSceneOffView,
  renderSceneOffTurnView,
} from "../src/engine/battleScene.ts";
import {
  createBattleState,
  type BattleBoundary,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

function initialBattle() {
  return createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 7,
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
    playerBenchHp: [80, 0],
    playerBenchOverride: [{
      species: 66,
      personality: 9,
      level: 50,
      hp: 80,
      maxHP: 80,
      moves: [67, 2, 43, 116],
      pp: [20, 15, 30, 30],
    }, undefined],
  });
}

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_Test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function event(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
): BattleKernelSemanticEvent {
  return Object.freeze({ sequence, payload: Object.freeze(payload), provenance: PROVENANCE });
}

function nextState(
  rules: FactoryFullTurnDecisionRules,
  boundary: BattleBoundary,
) {
  if (boundary.kind === "machine-barrier") {
    throw new Error("test fixture does not build machine barriers");
  }
  if (boundary.kind === "terminal") {
    return Object.freeze({
      ...createBattleState({
        rules,
        rngSeed: 9,
        request: {
          kind: "command",
          requestId: 3,
          side: "player",
          battler: 0,
          legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
        },
      }),
      boundary,
    });
  }
  return createBattleState({ rules, rngSeed: 9, request: boundary.request });
}

function inputFor(
  events: readonly BattleKernelSemanticEvent[],
  boundary: BattleBoundary,
  afterRules?: FactoryFullTurnDecisionRules,
): CreateBattleResolutionPresentationInput {
  if (boundary.kind === "machine-barrier") {
    throw new Error("test fixture does not build machine barriers");
  }
  const initial = initialBattle();
  if (
    initial.boundary.kind !== "decision-required"
    || initial.boundary.request.kind !== "command"
  ) throw new Error("fixture has no source command");
  const rules = afterRules ?? initial.rules;
  const state = nextState(rules, boundary);
  const transition = Object.freeze({
    kind: boundary.kind === "terminal" ? "terminal" : "decision-required",
    state,
    events: Object.freeze(events),
    ...(boundary.kind === "terminal"
      ? { outcome: boundary.outcome }
      : { nextRequest: boundary.request }),
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  return {
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: createBattleCommandPresentation(
      initial.boundary.request,
      initial.rules.rulesContext,
    ).field,
    confirmHandoff: {
      fightDisplayCursor: 0,
      idleBounceElapsed: 0,
    },
  };
}

const NEXT_COMMAND: BattleBoundary = Object.freeze({
  kind: "decision-required",
  request: Object.freeze({
    kind: "command",
    requestId: 3,
    side: "player",
    battler: 0,
    legalDecisions: Object.freeze([
      Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: 1 }),
    ]),
  }),
});

function atRenderClock(
  state: BattleResolutionPresentationState,
  commandIndex: number,
  phaseElapsed: number,
  phase: BattleResolutionPresentationState["lifecycle"]["phase"] = "presenting",
): BattleResolutionPresentationState {
  return Object.freeze({
    ...state,
    commandIndex,
    lifecycle: Object.freeze({ phase, phaseElapsed }),
    confirmHandoff:
      phase === "confirm-handoff" ? state.confirmHandoff : null,
  });
}

function damageResolution(): BattleResolutionPresentationState {
  return createBattleResolutionPresentation(inputFor([
    event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }),
    event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }),
    event(2, { kind: "health-bar-update", battler: 1, healthValue: 17 }),
    event(3, { kind: "hp-change", battler: 1, from: 91, to: 74 }),
    event(4, { kind: "message", messageId: "STRINGID_SUPEREFFECTIVE", substitutions: [] }),
  ], NEXT_COMMAND));
}

describe("battle resolution presentation receipt ownership", () => {
  it("derives the confirmed-FIGHT handoff from controller and script stages", () => {
    let resolution = createBattleResolutionPresentation({
      ...inputFor([
        event(0, {
          kind: "message",
          messageId: "STRINGID_USEDMOVE",
          substitutions: [],
        }),
        event(1, {
          kind: "set-battler-pp-data",
          battler: 0,
          movePosition: 0,
          pp: 9,
        }),
      ], NEXT_COMMAND),
      confirmHandoff: {
        fightDisplayCursor: 0,
        idleBounceElapsed: 40,
      },
    });
    const stages: string[] = [];
    const bounceClocks: number[] = [];
    const bounceResets: boolean[] = [];
    while (resolution.lifecycle.phase === "confirm-handoff") {
      stages.push(resolution.confirmHandoff!.stage);
      const view = createBattleResolutionPresentationRenderView(resolution);
      expect(view.bottom).toBe("fight");
      expect(view.message).toBeNull();
      expect(view.confirmHandoff?.fightMenu.displayCursor).toBe(0);
      bounceClocks.push(view.confirmHandoff!.idleBounceElapsed);
      bounceResets.push(view.confirmHandoff!.bounceReset);
      resolution = advanceBattleResolutionConfirmHandoff(resolution);
    }
    expect(stages).toEqual([
      "move-selection-response",
      "selection-accepted",
      "stop-bounce-request",
      "actions-confirmed",
      "turn-order",
      "before-turn",
      "action-dispatch",
      "attack-canceler",
      "accuracy-check",
    ]);
    expect(bounceClocks).toEqual([40, 41, 42, 42, 42, 42, 42, 42, 42]);
    expect(bounceResets).toEqual([
      false, false, false, true, true, true, true, true, true,
    ]);
    expect(resolution.lifecycle).toEqual({
      phase: "presenting",
      phaseElapsed: 0,
    });
    expect(resolution.confirmHandoff).toBeNull();
    expect(createBattleResolutionPresentationRenderView(resolution).message)
      .toEqual({
        lines: ["ONIX used", "ROCK SLIDE!"],
        visibleCharacters: 1,
      });
  });

  it("freezes terminal result content behind the immutable terminal boundary", () => {
    const pendingBoundary = Object.freeze({
      kind: "terminal" as const,
      outcome: "player-win" as const,
    });
    const presentation = createBattleTerminalResolutionPresentation({
      pendingBoundary,
      resultLines: ["Player defeated", "BUG CATCHER DESTIN!"],
      opponentLossLines: ["PLEASE I NEED", "SOME WATER"],
      confirmElapsed: 10,
      menuRedrawElapsed: 5,
    });
    expect(presentation.pendingBoundary).toBe(pendingBoundary);
    expect(presentation.command).toEqual({
      type: "terminal-result",
      resultLines: ["Player defeated", "BUG CATCHER DESTIN!"],
      opponentLossLines: ["PLEASE I NEED", "SOME WATER"],
    });
    const dismissed = storeBattleTerminalPresentationDismiss(
      storeBattleTerminalPresentationDismiss(presentation, "faint", 100),
      "result",
      200,
    );
    expect(dismissed).toMatchObject({
      faintDismissElapsed: 100,
      resultDismissElapsed: 200,
      lossDismissElapsed: null,
    });
    expect(storeBattleTerminalPresentationDismiss(dismissed, "faint", 999))
      .toBe(dismissed);
    expect(dismissed.pendingBoundary).toBe(pendingBoundary);
  });

  it("projects noncritical damage and its effectiveness message without exposing settled HP early", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }),
      event(2, { kind: "health-bar-update", battler: 1, healthValue: 17 }),
      event(3, { kind: "hp-change", battler: 1, from: 91, to: 74 }),
      event(4, { kind: "message", messageId: "STRINGID_SUPEREFFECTIVE", substitutions: [] }),
    ], NEXT_COMMAND));

    expect(resolution.field.opponent.hp).toBe(91);
    expect(resolution.segments[0]!.commands).toEqual([
      {
        type: "message",
        eventSequence: 0,
        lines: ["ONIX used", "ROCK SLIDE!"],
        advance: "automatic",
        timing: { minimumFrames: 24 },
      },
      {
        type: "hp",
        eventSequence: 2,
        battler: 1,
        from: 91,
        to: 74,
        healthValue: 17,
        timing: { minimumFrames: 28 },
      },
      {
        type: "message",
        eventSequence: 4,
        lines: ["It’s super effective!"],
        advance: "automatic",
        timing: { minimumFrames: 24 },
      },
      { type: "turn-end", timing: { minimumFrames: 8 } },
    ]);
  });

  it("retains a genuine player forced-switch boundary behind a button-gated faint lifecycle", () => {
    const forced = Object.freeze({
      kind: "decision-required" as const,
      request: Object.freeze({
        kind: "forced-switch" as const,
        requestId: 3,
        side: "player" as const,
        battler: 0 as const,
        faintedPartyIndex: 0 as const,
        legalPartyIndexes: Object.freeze([1 as const]),
      }),
    });
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "health-bar-update", battler: 0, healthValue: 117 }),
      event(1, { kind: "hp-change", battler: 0, from: 117, to: 0 }),
      event(2, { kind: "play-faint-cry", battler: 0 }),
      event(3, { kind: "faint-animation", battler: 0 }),
      event(4, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
    ], forced));

    expect(resolution.forcedRequest).toEqual(forced.request);
    expect(resolution.pendingBoundary).toBe(resolution.pendingBattle.boundary);
    expect(resolution.segments[0]!.commands).toMatchObject([
      { type: "hp", battler: 0, from: 117, to: 0 },
      { type: "faint", battler: 0, partyIndex: 0 },
      {
        type: "message",
        lines: ["ONIX", "fainted!"],
        advance: "button",
      },
    ]);
    expect(resolution.segments[0]!.commands[1]).toMatchObject({
      timing: {
        sink: "player-pixel-rows",
        pixelsPerFrame: 5,
        spriteRows: 64,
        healthboxVanishFrame: 18,
        minimumFrames: 20,
      },
    });
  });

  it("appends a marked forced-switch continuation under the same resolution identity", () => {
    const initial = initialBattle();
    const context = initial.rules.rulesContext;
    const incoming = context.party.player[1]!;
    const switchedBattler = Object.freeze({
      ...context.battlers[0]!,
      ...incoming,
      side: 0 as const,
      partyIndex: 1,
      species: incoming.species,
      types: Object.freeze(["TYPE_FIGHTING", "TYPE_FIGHTING"] as const),
    });
    const afterContext = Object.freeze({
      ...context,
      party: Object.freeze({
        ...context.party,
        player: Object.freeze([
          Object.freeze({ ...context.party.player[0]!, hp: 0 }),
          context.party.player[1]!,
          context.party.player[2]!,
          context.party.player[3]!,
          context.party.player[4]!,
          context.party.player[5]!,
        ]),
      }),
      battlers: Object.freeze([
        switchedBattler,
        context.battlers[1]!,
        context.battlers[2]!,
        context.battlers[3]!,
      ]) as typeof context.battlers,
    });
    const afterRules = Object.freeze({
      ...initial.rules,
      rulesContext: afterContext,
    }) as FactoryFullTurnDecisionRules;
    const forced = Object.freeze({
      kind: "decision-required" as const,
      request: Object.freeze({
        kind: "forced-switch" as const,
        requestId: 3,
        side: "player" as const,
        battler: 0 as const,
        faintedPartyIndex: 0 as const,
        legalPartyIndexes: Object.freeze([1 as const]),
      }),
    });
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "health-bar-update", battler: 0, healthValue: 117 }),
      event(1, { kind: "hp-change", battler: 0, from: 117, to: 0 }),
      event(2, { kind: "faint-animation", battler: 0 }),
      event(3, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
    ], forced));
    const continuationState = nextState(afterRules, NEXT_COMMAND);
    const continuation = Object.freeze({
      kind: "decision-required" as const,
      state: continuationState,
      nextRequest: NEXT_COMMAND.request,
      events: Object.freeze([
        event(4, { kind: "draw-party-status-summary", battler: 0 }),
        event(5, {
          kind: "switch",
          side: "player",
          fromPartyIndex: 0,
          toPartyIndex: 1,
        }),
        event(6, { kind: "message", messageId: "STRINGID_SWITCHINMON", substitutions: [] }),
        event(7, { kind: "hide-party-status-summary", battler: 0 }),
        event(8, {
          kind: "switch-in-animation",
          battler: 0,
          partyIndex: 1,
        }),
      ]),
    }) satisfies BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
    const appended = appendBattleResolutionContinuation({
      resolution,
      transition: continuation,
      fieldBoundary: Object.freeze({
        ...resolution.field,
        player: Object.freeze({ ...resolution.field.player, hp: 0 }),
      }),
    });

    expect(appended.resolutionId).toBe(resolution.resolutionId);
    expect(appended.segments).toHaveLength(2);
    expect(appended.forcedRequest).toBeNull();
    expect(appended.pendingBattle).toBe(continuationState);
    expect(appended.segmentIndex).toBe(1);
    expect(appended.commandIndex).toBe(0);
    expect(appended.lifecycle).toEqual({
      phase: "presenting-switch-in",
      phaseElapsed: 0,
    });
    expect(appended.segments[1]!.commands).toMatchObject([
      { type: "party-summary", battler: 0, visible: true },
      { type: "message", lines: ["Go! MACHOP!"] },
      { type: "party-summary", battler: 0, visible: false },
      {
        type: "switch-in",
        battler: 0,
        fromPartyIndex: 0,
        toPartyIndex: 1,
        incoming: {
          partyIndex: 1,
          species: 66,
          name: "MACHOP",
          hp: 80,
          maxHP: 80,
        },
      },
      { type: "turn-end" },
    ]);
    const view = createBattleResolutionPresentationRenderView(appended);
    expect(view.field.player).toMatchObject({
      partyIndex: 1,
      species: 66,
      name: "MACHOP",
      hp: 80,
      maxHP: 80,
    });
    expect(view.message).toEqual({
      lines: ["Go! MACHOP!"],
      visibleCharacters: 0,
    });
    expect(view.switchIn).toEqual({
      elapsed: 0,
      phase: "submenuHold",
      battler: 0,
      partyStates: ["fainted", "healthy", "empty", "empty", "empty", "empty"],
    });
  });

  it("freezes the trainer class/name used by an opponent switch-in message", () => {
    const initial = initialBattle();
    const context = initial.rules.rulesContext;
    const incoming = context.party.player[1]!;
    const afterContext = Object.freeze({
      ...context,
      party: Object.freeze({
        ...context.party,
        opponent: Object.freeze([
          context.party.opponent[0]!,
          incoming,
          context.party.opponent[2]!,
          context.party.opponent[3]!,
          context.party.opponent[4]!,
          context.party.opponent[5]!,
        ]),
      }),
      battlers: Object.freeze([
        context.battlers[0]!,
        Object.freeze({
          ...context.battlers[1]!,
          ...incoming,
          side: 1 as const,
          partyIndex: 1,
          species: incoming.species,
        }),
        context.battlers[2]!,
        context.battlers[3]!,
      ]) as typeof context.battlers,
    });
    const afterRules = Object.freeze({
      ...initial.rules,
      rulesContext: afterContext,
    }) as FactoryFullTurnDecisionRules;
    const resolution = createBattleResolutionPresentation({
      ...inputFor([
        event(0, {
          kind: "switch",
          side: "opponent",
          fromPartyIndex: 0,
          toPartyIndex: 1,
        }),
        event(1, {
          kind: "message",
          messageId: "STRINGID_SWITCHINMON",
          substitutions: [],
        }),
        event(2, {
          kind: "switch-in-animation",
          battler: 1,
          partyIndex: 1,
        }),
      ], NEXT_COMMAND, afterRules),
      opponentTrainer: Object.freeze({
        className: "BUG CATCHER",
        name: "DESTIN",
      }),
    });

    expect(resolution.opponentTrainer).toEqual({
      className: "BUG CATCHER",
      name: "DESTIN",
    });
    expect(resolution.segments[0]!.commands[0]).toMatchObject({
      type: "message",
      lines: ["BUG CATCHER DESTIN sent", "out MACHOP!"],
    });
    const summaryState = atRenderClock(resolution, 0, 0);
    const summarySegment = Object.freeze({
      ...resolution.segments[0]!,
      commands: Object.freeze([
        Object.freeze({
          type: "party-summary" as const,
          eventSequence: -1,
          battler: 1 as const,
          visible: true,
          states: Object.freeze([
            "healthy", "healthy", "empty", "empty", "empty", "empty",
          ] as const),
        }),
        ...resolution.segments[0]!.commands,
      ]),
    });
    const summaryView = createBattleResolutionPresentationRenderView({
      ...summaryState,
      segments: Object.freeze([summarySegment]),
    });
    expect(summaryView.partySummary).toEqual({
      battler: 1,
      states: ["healthy", "healthy", "empty", "empty", "empty", "empty"],
    });
    const incomingView = createBattleResolutionPresentationRenderView({
      ...summaryState,
      segments: Object.freeze([summarySegment]),
      commandIndex: 3,
    });
    expect(incomingView.field.opponent).toMatchObject({
      partyIndex: 1,
      name: "MACHOP",
      hp: 80,
      maxHP: 80,
    });
  });

  it("fails closed on unpaired HP, missing switch-in markers, and out-of-order sequences", () => {
    expect(() => createBattleResolutionPresentation(inputFor([
      event(0, { kind: "hp-change", battler: 1, from: 91, to: 80 }),
    ], NEXT_COMMAND))).toThrow(/no health-bar update/);
    expect(() => createBattleResolutionPresentation(inputFor([
      event(0, { kind: "switch", side: "player", fromPartyIndex: 0, toPartyIndex: 1 }),
    ], NEXT_COMMAND))).toThrow(/no switch-in-animation/);
    expect(() => createBattleResolutionPresentation(inputFor([
      event(2, { kind: "health-bar-update", battler: 1, healthValue: 11 }),
      event(1, { kind: "hp-change", battler: 1, from: 91, to: 80 }),
    ], NEXT_COMMAND))).toThrow(/not strictly increasing/);
  });
});

describe("battle resolution typed Scene-OFF renderer", () => {
  it("sinks a zero-HP battler, removes its healthbox, and exposes a real button wait", () => {
    const forced = Object.freeze({
      kind: "decision-required" as const,
      request: Object.freeze({
        kind: "forced-switch" as const,
        requestId: 3,
        side: "player" as const,
        battler: 0 as const,
        faintedPartyIndex: 0 as const,
        legalPartyIndexes: Object.freeze([1 as const]),
      }),
    });
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "health-bar-update", battler: 0, healthValue: 117 }),
      event(1, { kind: "hp-change", battler: 0, from: 117, to: 0 }),
      event(2, { kind: "play-faint-cry", battler: 0 }),
      event(3, { kind: "faint-animation", battler: 0 }),
      event(4, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
    ], forced));

    const sinking = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 1, 6),
    );
    expect(sinking.effect).toEqual({
      type: "faint",
      battler: 0,
      healthboxVisible: true,
      sink: { type: "player-pixel-rows", skipPixelRows: 30 },
    });
    expect(sinking.visibility.player).toEqual({
      sprite: true,
      healthbox: true,
    });

    const faintMessage = atRenderClock(resolution, 2, 13);
    const waiting = createBattleResolutionPresentationRenderView(faintMessage);
    expect(waiting.visibility.player).toEqual({
      sprite: false,
      healthbox: false,
    });
    expect(waiting.waitCursor).toEqual({ age: 0 });
    expect(isBattleResolutionButtonMessageReady(faintMessage)).toBe(true);
  });

  it("prints frozen attack/result lines one glyph per relative frame", () => {
    const resolution = damageResolution();
    const first = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 0, 0),
    );
    expect(first.message).toEqual({
      lines: ["ONIX used", "ROCK SLIDE!"],
      visibleCharacters: 1,
    });
    expect(first.field.opponent.hp).toBe(91);
    expect(
      battleResolutionCommandDuration(
        resolution.segments[0]!.commands[0]!,
        resolution.field,
      ),
    ).toBe(24);

    const result = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 2, 2),
    );
    expect(result.field.opponent.hp).toBe(74);
    expect(result.message).toEqual({
      lines: ["It’s super effective!"],
      visibleCharacters: 3,
    });
  });

  it("drains only the typed HP endpoint and preserves the attack string underneath", () => {
    const resolution = damageResolution();
    const start = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 1, 0),
    );
    const middle = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 1, 10),
    );
    const end = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 1, 27),
    );

    expect(start.field.opponent.hp).toBe(91);
    expect(middle.field.opponent.hp).toBe(81);
    expect(end.field.opponent.hp).toBe(74);
    expect(middle.message).toEqual({
      lines: ["ONIX used", "ROCK SLIDE!"],
      visibleCharacters: 20,
    });
    expect(middle.healthboxes.opponent.hpTargetFraction).toBe(74 / 91);
    expect(isBattleResolutionCommandComplete(
      atRenderClock(resolution, 1, 26),
    )).toBe(false);
    expect(isBattleResolutionCommandComplete(
      atRenderClock(resolution, 1, 27),
    )).toBe(true);
  });

  it("projects stat/status effects and commits a status icon only after its command", () => {
    const statResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "stat-stage-change",
        battler: 0,
        stat: "accuracy",
        from: 6,
        to: 5,
      }),
      event(1, {
        kind: "message",
        messageId: "STRINGID_DEFENDERSSTATFELL",
        substitutions: [],
      }),
    ], NEXT_COMMAND));
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statResolution, 0, 12),
      ).effect,
    ).toEqual({
      type: "stat",
      battler: 0,
      stat: "accuracy",
      from: 6,
      to: 5,
      age: 12,
    });
    expect(
      battleResolutionCommandDuration(
        statResolution.segments[0]!.commands[0]!,
        statResolution.field,
      ),
    ).toBe(50);

    const statusResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "set-battler-status-data",
        battler: 1,
        status1: 1 << 3,
      }),
    ], NEXT_COMMAND));
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statusResolution, 0, 4),
      ).field.opponent.status,
    ).toBe("none");
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statusResolution, 1, 0),
      ).field.opponent.status,
    ).toBe("poison");
  });

  it("owns exactly six blank next-command handoff frames", () => {
    const resolution = damageResolution();
    const handoff5 = atRenderClock(
      resolution,
      resolution.segments[0]!.commands.length,
      5,
      "next-command-handoff",
    );
    const handoff6 = atRenderClock(
      resolution,
      resolution.segments[0]!.commands.length,
      6,
      "next-command-handoff",
    );
    expect(createBattleResolutionPresentationRenderView(handoff5).bottom).toBe(
      "blank",
    );
    expect(isBattleResolutionNextCommandHandoffComplete(handoff5)).toBe(false);
    expect(isBattleResolutionNextCommandHandoffComplete(handoff6)).toBe(true);
  });

  it("renders through the source-composed scene adapter without exposing kernel rules", () => {
    const resolution = damageResolution();
    const canonicalField = Object.freeze({
      player: Object.freeze({ ...resolution.field.player, gender: "male" as const }),
      opponent: Object.freeze({ ...resolution.field.opponent, gender: "male" as const }),
    });
    const state = Object.freeze({
      ...atRenderClock(resolution, 0, 40),
      field: canonicalField,
    });
    const typed = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionPresentation(typed, state, {
      drawScene: renderBattleResolutionSceneOffView,
    });

    const legacy = new Uint8Array(240 * 160 * 4);
    renderSceneOffTurnView(legacy, {
      opponentHp: 91,
      messageLines: ["ONIX used", "ROCK SLIDE!"],
      messageChars: 20,
      statEffectAge: null,
      bottom: "message",
    });
    const changed: Array<{ x: number; y: number }> = [];
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 4;
      if (
        typed[offset] !== legacy[offset]
        || typed[offset + 1] !== legacy[offset + 1]
        || typed[offset + 2] !== legacy[offset + 2]
      ) changed.push({ x: pixel % 240, y: Math.floor(pixel / 240) });
    }
    expect({
      count: changed.length,
      bounds: changed.length === 0 ? null : {
        minX: Math.min(...changed.map(({ x }) => x)),
        maxX: Math.max(...changed.map(({ x }) => x)),
        minY: Math.min(...changed.map(({ y }) => y)),
        maxY: Math.max(...changed.map(({ y }) => y)),
      },
    }).toEqual({ count: 0, bounds: null });
  });
});
