import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  advanceBattleResolutionConfirmHandoff,
  appendBattleResolutionContinuation,
  createBattleResolutionPresentation,
  createBattleTerminalResolutionPresentation,
  storeBattleTerminalPresentationDismiss,
  SWITCH_IN_SPAN_FRAMES,
  SWITCH_IN_WAITSTATE_HOLD_FRAMES,
  WAITMESSAGE_LONG_MESSAGE_IDS,
  WAITMESSAGE_LONG_TIMING,
  type BattleResolutionPresentationCommand,
  type BattleResolutionPresentationState,
  type CreateBattleResolutionPresentationInput,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration,
  createBattleResolutionPresentationRenderView,
  isBattleResolutionButtonMessageReady,
  isBattleResolutionCommandComplete,
  isBattleResolutionNextCommandHandoffComplete,
  midBattleSwitchInAt,
  MID_BATTLE_SWITCH_BALL_LAND_ELAPSED,
  MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED,
  MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED,
  MID_BATTLE_SWITCH_EMERGE_END_ELAPSED,
  renderBattleResolutionPresentation,
} from "../src/engine/battleResolutionPresentationRender.ts";
import {
  renderBattleResolutionSceneOffView,
  renderSceneOffTurnView,
  sceneOffStatStageBannerView,
  SCENE_OFF_TURN_DEFAULT_IDENTITY,
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
  instructionExecution = 1,
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: Object.freeze({ ...PROVENANCE, instructionExecution }),
  });
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

/**
 * A voluntary mid-battle switch segment: the outgoing mon is recalled, the
 * party status summary is drawn/hidden, and the switch-in-animation marker
 * arrives -- the exact event shape the real `BattleScript_ActionSwitch`
 * window emits (docs/mid-battle-switch-presentation-ground-truth.md §2).
 */
function voluntarySwitchResolution(): BattleResolutionPresentationState {
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
        context.party.player[0]!,
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
  return createBattleResolutionPresentation(inputFor([
    event(0, {
      kind: "message",
      messageId: "STRINGID_RETURNMON",
      substitutions: [],
      introBattler: 0,
      introHpScale: 0,
    }),
    event(1, { kind: "draw-party-status-summary", battler: 0 }),
    event(2, { kind: "switch", side: "player", fromPartyIndex: 0, toPartyIndex: 1 }),
    event(3, { kind: "message", messageId: "STRINGID_SWITCHINMON", substitutions: [] }),
    event(4, { kind: "hide-party-status-summary", battler: 0 }),
    event(5, { kind: "switch-in-animation", battler: 0, partyIndex: 1 }),
  ], NEXT_COMMAND, afterRules));
}

describe("battle resolution presentation receipt ownership", () => {
  it("uses a frozen Cmd_printstring action snapshot when a locked action has no PP receipt", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "message",
        messageId: "STRINGID_USEDMOVE",
        substitutions: [],
        actionSnapshot: {
          attacker: 0,
          currentMove: 19, // FLY, not the displayed slot-0 ROCK SLIDE.
          currentMovePosition: 2,
        },
      }),
    ], NEXT_COMMAND));

    expect(resolution.segments[0]!.commands).toMatchObject([
      { type: "message", lines: ["ONIX used", "FLY!"] },
      { type: "turn-end" },
    ]);
  });

  it("resolves a no-effect defender from the preceding semantic move owner", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
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
      event(2, {
        kind: "message",
        messageId: "STRINGID_ITDOESNTAFFECT",
        substitutions: [],
      }),
    ], NEXT_COMMAND));

    expect(resolution.segments[0]!.commands).toMatchObject([
      { type: "message", lines: ["ONIX used", "ROCK SLIDE!"] },
      { type: "message", lines: ["It doesn’t affect", "Foe KABUTO…"] },
      { type: "turn-end" },
    ]);
  });

  it("resolves a missed attack from the preceding semantic move owner", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "message",
        messageId: "STRINGID_USEDMOVE",
        substitutions: [],
      }),
      event(1, {
        kind: "set-battler-pp-data",
        battler: 1,
        movePosition: 0,
        pp: 9,
      }),
      event(2, {
        kind: "message",
        messageId: "STRINGID_ATTACKMISSED",
        substitutions: [],
      }),
    ], NEXT_COMMAND));

    expect(resolution.segments[0]!.commands).toMatchObject([
      { type: "message", lines: ["Foe KABUTO used", "MEGA DRAIN!"] },
      { type: "message", lines: ["Foe KABUTO’s", "attack missed!"] },
      { type: "turn-end" },
    ]);
  });

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
        noCursor: false,
        timing: { minimumFrames: 24, holdFrames: 0 },
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
        noCursor: false,
        timing: { minimumFrames: 24, holdFrames: 64 },
      },
      { type: "turn-end", timing: { minimumFrames: 8 } },
    ]);
  });

  it("ISSUES #77: holds the hit-chain effectiveness/crit messages for the source's B_WAIT_TIME_LONG", () => {
    // The whole family is one shared WAITMESSAGE_LONG_TIMING object (holdFrames
    // 64 = B_WAIT_TIME_LONG, reference/pokeemerald/include/constants/battle.h:
    // 324) keyed off WAITMESSAGE_LONG_MESSAGE_IDS membership -- a future id
    // joins the family by joining that set, not as a new literal at the call
    // site (docs/battle-message-hold-cadence-ground-truth.md §bind plan).
    expect(WAITMESSAGE_LONG_MESSAGE_IDS.has("STRINGID_SUPEREFFECTIVE")).toBe(true);
    expect(WAITMESSAGE_LONG_MESSAGE_IDS.has("STRINGID_NOTVERYEFFECTIVE")).toBe(true);
    expect(WAITMESSAGE_LONG_MESSAGE_IDS.has("STRINGID_CRITICALHIT")).toBe(true);
    // STRINGID_CRITICALHIT (Cmd_critmessage -> waitmessage B_WAIT_TIME_LONG,
    // battle_scripts_1.s:262) resolves to the same shared hold object.
    const critical = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }),
      event(2, { kind: "message", messageId: "STRINGID_CRITICALHIT", substitutions: [] }),
    ], NEXT_COMMAND));
    const criticalCommand = critical.segments[0]!.commands.find(
      (c): c is Extract<BattleResolutionPresentationCommand, { type: "message" }> =>
        c.type === "message" && c.lines[0] === "A critical hit!",
    )!;
    expect(criticalCommand).toMatchObject({
      type: "message",
      lines: ["A critical hit!"],
      advance: "automatic",
      noCursor: false,
      timing: { minimumFrames: 24, holdFrames: 64 },
    });
    expect(criticalCommand.timing).toBe(WAITMESSAGE_LONG_TIMING);
    // The duration formula carries the 64-frame post-print hold on top of the
    // 24-frame floor (print length 14 < 24, so 24 + 64 = 88).
    expect(battleResolutionCommandDuration(criticalCommand, critical.field)).toBe(88);
    // STRINGID_NOTVERYEFFECTIVE (Cmd_resultmessage -> waitmessage, :264).
    const notVery = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }),
      event(2, { kind: "message", messageId: "STRINGID_NOTVERYEFFECTIVE", substitutions: [] }),
    ], NEXT_COMMAND));
    const notVeryCommand = notVery.segments[0]!.commands.find(
      (c): c is Extract<BattleResolutionPresentationCommand, { type: "message" }> =>
        c.type === "message" && c.lines[0] === "It’s not very effective…",
    )!;
    expect(notVeryCommand.timing).toBe(WAITMESSAGE_LONG_TIMING);
    // STRINGID_USEDMOVE (Cmd_attackstring) has no waitmessage -- the plain
    // MESSAGE_TIMING floor holds (doc §3), so its holdFrames stays 0.
    const usedMove = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }),
    ], NEXT_COMMAND));
    const usedMoveCommand = usedMove.segments[0]!.commands.find(
      (c): c is Extract<BattleResolutionPresentationCommand, { type: "message" }> =>
        c.type === "message" && c.lines[0] === "ONIX used",
    )!;
    expect(usedMoveCommand.timing).toEqual({
      minimumFrames: 24,
      holdFrames: 0,
    });
    // The faint-family ids are button-dismissed (advance "button") and their
    // scripts print then return with no waitmessage (BattleScript_FaintTarget,
    // battle_scripts_1.s:2822-2824) -- they must NOT join the hold family.
    expect(WAITMESSAGE_LONG_MESSAGE_IDS.has("STRINGID_TARGETFAINTED")).toBe(false);
    expect(WAITMESSAGE_LONG_MESSAGE_IDS.has("STRINGID_ATTACKERFAINTED")).toBe(false);
    const faint = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "health-bar-update", battler: 1, healthValue: 0 }),
      event(1, { kind: "hp-change", battler: 1, from: 91, to: 0 }),
      event(2, { kind: "play-faint-cry", battler: 1 }),
      event(3, { kind: "faint-animation", battler: 1 }),
      event(4, { kind: "message", messageId: "STRINGID_TARGETFAINTED", substitutions: [] }),
    ], NEXT_COMMAND));
    const faintMessage = faint.segments[0]!.commands.find(
      (c): c is Extract<BattleResolutionPresentationCommand, { type: "message" }> =>
        c.type === "message",
    )!;
    expect(faintMessage).toMatchObject({ type: "message", advance: "button" });
    expect(faintMessage.timing).toEqual({ minimumFrames: 24, holdFrames: 0 });
  });

  it("projects Scene-OFF move pause and target hit receipt before immutable HP drain", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, 2),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }, 3),
      event(2, {
        kind: "animation",
        animationId: "SCENE_OFF_ATTACK_PAUSE",
        battler: 0,
        arguments: [],
      }, 14),
      event(3, { kind: "play-se", battler: 1, songId: 1 }, 49),
      event(4, {
        kind: "animation",
        animationId: "HIT_ANIMATION",
        battler: 1,
        arguments: [],
      }, 50),
      event(5, { kind: "health-bar-update", battler: 1, healthValue: 17 }, 52),
      event(6, { kind: "hp-change", battler: 1, from: 91, to: 74 }, 53),
    ], NEXT_COMMAND));

    expect(resolution.segments[0]!.commands).toMatchObject([
      { type: "message" },
      {
        type: "move-animation",
        eventSequence: 2,
        battler: 0,
        timing: { minimumFrames: 48 },
      },
      {
        type: "hit-animation",
        eventSequence: 4,
        battler: 1,
        timing: { minimumFrames: 35, firstDisplayedAge: 1 },
      },
      { type: "hp", eventSequence: 5, from: 91, to: 74 },
      { type: "turn-end" },
    ]);
    expect(battleResolutionCommandDuration(
      resolution.segments[0]!.commands[1]!,
      resolution.field,
    )).toBe(48);

    const setup = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 2, 0),
    );
    expect(setup.effect).toEqual({
      type: "hit",
      battler: 1,
      healthboxY2: 0,
      targetInvisible: false,
    });
    const firstDisplayed = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 2, 1),
    );
    expect(firstDisplayed.effect).toEqual({
      type: "hit",
      battler: 1,
      healthboxY2: 1,
      targetInvisible: false,
    });
    const firstBlink = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 2, 2),
    );
    expect(firstBlink.effect).toEqual({
      type: "hit",
      battler: 1,
      healthboxY2: -1,
      targetInvisible: true,
    });
    expect(firstBlink.visibility.opponent.sprite).toBe(false);
  });

  it("keeps controller MOVE_ANIMATION on the same source-derived no-op hold", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, 2),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }, 3),
      event(2, {
        kind: "animation",
        animationId: "MOVE_ANIMATION",
        battler: 0,
        arguments: [],
      }, 14),
      event(3, {
        kind: "animation",
        animationId: "HIT_ANIMATION",
        battler: 1,
        arguments: [],
      }, 17),
      event(4, { kind: "health-bar-update", battler: 1, healthValue: 17 }, 19),
      event(5, { kind: "hp-change", battler: 1, from: 91, to: 74 }, 20),
    ], NEXT_COMMAND));

    expect(resolution.segments[0]!.commands.slice(0, 4)).toMatchObject([
      { type: "message" },
      { type: "move-animation", eventSequence: 2, timing: { minimumFrames: 48 } },
      { type: "hit-animation", eventSequence: 3 },
      { type: "hp", eventSequence: 4 },
    ]);
  });

  it("projects typed sprite visibility receipts with relative duration and persistent render state", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "set-battler-sprite-visibility",
        battler: 0,
        invisible: false,
      }),
      event(1, {
        kind: "set-battler-sprite-visibility",
        battler: 1,
        invisible: true,
      }),
      event(2, {
        kind: "message",
        messageId: "STRINGID_BUTNOTHINGHAPPENED",
        substitutions: [],
      }),
      event(3, {
        kind: "set-battler-sprite-visibility",
        battler: 1,
        invisible: false,
      }),
    ], NEXT_COMMAND));

    expect(resolution.segments[0]!.commands).toMatchObject([
      {
        type: "sprite-visibility",
        eventSequence: 0,
        battler: 0,
        visible: true,
        timing: { minimumFrames: 1 },
      },
      {
        type: "sprite-visibility",
        eventSequence: 1,
        battler: 1,
        visible: false,
        timing: { minimumFrames: 1 },
      },
      { type: "message" },
      {
        type: "sprite-visibility",
        eventSequence: 3,
        battler: 1,
        visible: true,
        timing: { minimumFrames: 1 },
      },
      { type: "turn-end" },
    ]);
    expect(battleResolutionCommandDuration(
      resolution.segments[0]!.commands[1]!,
      resolution.field,
    )).toBe(1);
    expect(isBattleResolutionCommandComplete(atRenderClock(resolution, 1, 0)))
      .toBe(true);

    // The ordinary visible receipt is a pass-through and never hides player.
    expect(createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 0, 0),
    ).visibility.player.sprite).toBe(true);
    expect(createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 1, 0),
    ).visibility.opponent.sprite).toBe(false);
    // The following command observes the persistent hidden state.
    expect(createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 2, 0),
    ).visibility.opponent.sprite).toBe(false);
    expect(createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 3, 0),
    ).visibility.opponent.sprite).toBe(true);
    expect(createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, 4, 0),
    ).visibility.opponent.sprite).toBe(true);
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
        speechLose: ["PLEASE I NEED", "SOME WATER"] as const,
      }),
    });

    expect(resolution.opponentTrainer).toEqual({
      className: "BUG CATCHER",
      name: "DESTIN",
      speechLose: ["PLEASE I NEED", "SOME WATER"],
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

  it("times the voluntary mid-battle switch-in span so the send-out cadence holds (ISSUES #78)", () => {
    const resolution = voluntarySwitchResolution();

    const commands = resolution.segments[0]!.commands;
    const switchIndex = commands.findIndex((command) => command.type === "switch-in");
    const switchCommand = commands[switchIndex]!;
    if (switchCommand.type !== "switch-in") {
      throw new Error("battle resolution voluntary switch has no typed switch-in command");
    }
    // The real `CONTROLLER_SWITCHINANIM` cadence (1140-1230, 91 frames)
    // must gate the opponent's next move, not the old 1-frame instant swap;
    // the 11-frame waitstate/move-load hold (1231-1241) rides on top so the
    // opponent's "used" message first glyph lands at 1242.
    expect(switchCommand.timing).toEqual({ minimumFrames: SWITCH_IN_SPAN_FRAMES });
    expect(battleResolutionCommandDuration(switchCommand, resolution.field))
      .toBe(SWITCH_IN_SPAN_FRAMES + SWITCH_IN_WAITSTATE_HOLD_FRAMES);
    // The incoming mon is already on field while the "Go!" box owns the span.
    const view = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, switchIndex, Math.floor(SWITCH_IN_SPAN_FRAMES / 2)),
    );
    expect(view.field.player).toMatchObject({
      partyIndex: 1,
      name: "MACHOP",
      hp: 80,
      maxHP: 80,
    });
    expect(view.message).toEqual({
      lines: ["Go! MACHOP!"],
      visibleCharacters: 11,
    });
    // The switch-in command is not complete a frame early and completes
    // exactly at the end of the span (controller 91 + waitstate/move-load 11).
    const switchInDuration = SWITCH_IN_SPAN_FRAMES + SWITCH_IN_WAITSTATE_HOLD_FRAMES;
    expect(isBattleResolutionCommandComplete(
      atRenderClock(resolution, switchIndex, switchInDuration - 2),
    )).toBe(false);
    expect(isBattleResolutionCommandComplete(
      atRenderClock(resolution, switchIndex, switchInDuration - 1),
    )).toBe(true);
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

  it("models the mid-battle switch-in ball-release emerge on the RAM-pinned pa ramp (ISSUES #78 slice 2)", () => {
    // docs/mid-battle-switch-presentation-ground-truth.md §3: the mon becomes
    // visible at frame 1188 (pa 862) and scales down to pa 256 by 1199.
    const paAt = (accumulator: number): number => Math.floor(0x10000 / accumulator);
    const ramp: number[] = [];
    for (let elapsed = MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED;
      elapsed <= MID_BATTLE_SWITCH_EMERGE_END_ELAPSED; elapsed += 1) {
      ramp.push(paAt(midBattleSwitchInAt(elapsed, 0).emergeAccumulator));
    }
    expect(ramp).toEqual([
      862, 697, 585, 504, 442, 394, 356, 324, 297, 275, 256, 256,
    ]);
    // Not visible before the emerge onset; ball visible only during the throw.
    expect(midBattleSwitchInAt(0, 0).monVisible).toBe(false);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED - 1, 0).monVisible)
      .toBe(false);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED, 0).monVisible)
      .toBe(true);
    expect(midBattleSwitchInAt(0, 0).ballVisible).toBe(true);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_BALL_LAND_ELAPSED - 1, 0).ballVisible)
      .toBe(true);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_BALL_LAND_ELAPSED, 0).ballVisible)
      .toBe(false);
    // The ball throws from the player corner toward the mon spot.
    const first = midBattleSwitchInAt(0, 0).ballPosition;
    const last = midBattleSwitchInAt(MID_BATTLE_SWITCH_BALL_LAND_ELAPSED - 1, 0).ballPosition;
    expect(first.x).toBe(24);
    expect(first.y).toBe(68);
    expect(last.x).toBeGreaterThan(50);
    expect(last.y).toBeGreaterThan(80);
  });

  it("models the mid-battle switch-in healthbox slide at 5 px/frame (ISSUES #78 slice 3)", () => {
    // StartHealthboxSlideIn (pokeball.c:1241-1269): x2 110 -> 0 at 5 px/frame
    // over frames 1205-1227 (elapsed 65-87), doc §3.
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED - 1, 0).healthboxDx)
      .toBeNull();
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED, 0).healthboxDx)
      .toBe(110);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED + 1, 0).healthboxDx)
      .toBe(105);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED + 22, 0).healthboxDx)
      .toBe(0);
    expect(midBattleSwitchInAt(MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED + 40, 0).healthboxDx)
      .toBe(0);
  });

  it("exposes the mid-battle switch-in view while the switch-in command owns the field (ISSUES #78 slice 2)", () => {
    const resolution = voluntarySwitchResolution();
    const switchIndex = resolution.segments[0]!.commands.findIndex(
      (command) => command.type === "switch-in",
    );
    const throwing = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, switchIndex, 20),
    );
    expect(throwing.midBattleSwitchIn).toEqual(
      expect.objectContaining({
        battler: 0,
        ballVisible: true,
        monVisible: false,
      }),
    );
    // The generic sprite draw is suppressed; the scene renderer owns the ball.
    expect(throwing.visibility.player.sprite).toBe(false);
    const emerged = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, switchIndex, 55),
    );
    expect(emerged.midBattleSwitchIn).toEqual(
      expect.objectContaining({ ballVisible: false, monVisible: true }),
    );
    expect(emerged.visibility.player.sprite).toBe(false);
    expect(emerged.field.player).toMatchObject({
      partyIndex: 1,
      name: "MACHOP",
      hp: 80,
      maxHP: 80,
    });
    expect(emerged.message).toEqual({
      lines: ["Go! MACHOP!"],
      visibleCharacters: 11,
    });
  });

  it("renders the mid-battle switch-in ball throw and emerge without throwing (ISSUES #78 slice 2)", () => {
    const resolution = voluntarySwitchResolution();
    const switchIndex = resolution.segments[0]!.commands.findIndex(
      (command) => command.type === "switch-in",
    );
    for (const elapsed of [0, 20, 45, 48, 55, 70, 90]) {
      const fb = createFramebuffer();
      renderBattleResolutionPresentation(
        fb,
        atRenderClock(resolution, switchIndex, elapsed),
        { drawScene: renderBattleResolutionSceneOffView },
      );
      expect(fb.length).toBe(240 * 160 * 4);
    }
    // The ball throw actually paints pixels during the throw window.
    const throwing = createFramebuffer();
    renderBattleResolutionPresentation(
      throwing,
      atRenderClock(resolution, switchIndex, 10),
      { drawScene: renderBattleResolutionSceneOffView },
    );
    expect(throwing.some((channel) => channel !== 0 && channel !== 255)).toBe(true);
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

  it("projects stat effects and defers status display to the typed status-icon receipt", () => {
    const statResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "stat-stage-change",
        battler: 0,
        stat: "accuracy",
        from: 6,
        to: 5,
        requestedMagnitude: 1,
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
    ).toBe(2);

    const roseResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "stat-stage-change",
        battler: 1,
        stat: "evasion",
        from: 6,
        to: 7,
        requestedMagnitude: 1,
      }),
      event(1, {
        kind: "message",
        messageId: "STRINGID_DEFENDERSSTATROSE",
        substitutions: [],
      }),
    ], NEXT_COMMAND));
    expect(roseResolution.segments[0]!.commands[1]).toMatchObject({
      type: "message",
      lines: ["Foe KABUTO’s evasiveness", "rose!"],
    });

    const statusResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "set-battler-status-data",
        battler: 1,
        status1: 1 << 4,
      }),
      event(1, {
        kind: "message",
        messageId: "STRINGID_PKMNWASBURNED",
        substitutions: [],
      }),
      event(2, {
        kind: "status-icon-update",
        battler: 1,
        status1: 1 << 4,
        status2: 0,
      }),
    ], NEXT_COMMAND));
    const [rawStatus, burnMessage, statusIcon] = statusResolution.segments[0]!.commands;
    expect([rawStatus, burnMessage, statusIcon].map((command) => command!.type))
      .toEqual(["status", "message", "status-icon"]);
    expect(rawStatus).toMatchObject({ type: "status", eventSequence: 0 });
    expect(burnMessage).toMatchObject({
      type: "message",
      eventSequence: 1,
      lines: ["Foe KABUTO was burned!"],
    });
    expect(statusIcon).toMatchObject({
      type: "status-icon",
      eventSequence: 2,
      battler: 1,
      status1: 1 << 4,
      status2: 0,
      timing: { minimumFrames: 1 },
    });
    if (statusIcon?.type !== "status-icon") throw new Error("expected a typed status-icon receipt");
    expect(Object.isFrozen(statusResolution.segments[0]!.commands)).toBe(true);
    expect(Object.isFrozen(statusIcon)).toBe(true);
    expect(Object.isFrozen(statusIcon.timing)).toBe(true);
    expect(
      battleResolutionCommandDuration(statusIcon, statusResolution.field),
    ).toBe(1);
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statusResolution, 0, 4),
      ).field.opponent.status,
    ).toBe("none");
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statusResolution, 1, 0),
      ).field.opponent.status,
    ).toBe("none");
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statusResolution, 2, 0),
      ).field.opponent.status,
    ).toBe("none");
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(statusResolution, 3, 0),
      ).field.opponent.status,
    ).toBe("burn");

    const clearResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "set-battler-status-data",
        battler: 1,
        status1: 0,
      }),
      event(1, {
        kind: "status-icon-update",
        battler: 1,
        status1: 0,
        status2: 0,
      }),
    ], NEXT_COMMAND));
    const clearFromBurn = Object.freeze({
      ...clearResolution,
      field: Object.freeze({
        ...clearResolution.field,
        opponent: Object.freeze({
          ...clearResolution.field.opponent,
          status: "burn" as const,
        }),
      }),
    });
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(clearFromBurn, 1, 0),
      ).field.opponent.status,
    ).toBe("burn");
    expect(
      createBattleResolutionPresentationRenderView(
        atRenderClock(clearFromBurn, 2, 0),
      ).field.opponent.status,
    ).toBe("none");
  });

  it("ISSUES #69: models the source's post-print hold as a message-phase addition, not a stat-phase fudge", () => {
    // reference/pokeemerald/data/battle_scripts_1.s:511-514,556-560 --
    // BattleScript_StatUp/StatDown's `printfromtable ...; waitmessage
    // B_WAIT_TIME_LONG` -- docs/issue69-omniboost-off-ground-truth.md §2/§6.
    const fellResolution = createBattleResolutionPresentation(inputFor([
      event(0, {
        kind: "stat-stage-change",
        battler: 0,
        stat: "accuracy",
        from: 6,
        to: 5,
        requestedMagnitude: 1,
      }),
      event(1, {
        kind: "message",
        messageId: "STRINGID_DEFENDERSSTATFELL",
        substitutions: [],
      }),
    ], NEXT_COMMAND));
    const [statCommand, messageCommand] = fellResolution.segments[0]!.commands;
    // The RAM write is silent for 2 frames before the box clears (oracle-
    // measured identically across all 5 omniboost banners) -- not a 50-frame
    // placeholder that used to absorb the missing hold instead of modeling it.
    expect(
      battleResolutionCommandDuration(statCommand!, fellResolution.field),
    ).toBe(2);
    // The message's own duration carries print time (the 24-frame floor, this
    // line is short) PLUS the source's 64-frame post-print hold -- a hold
    // *after* printing completes, not a fudge on the print-speed floor/length
    // term itself.
    expect(messageCommand).toMatchObject({
      timing: { minimumFrames: 24, holdFrames: 64 },
    });
    expect(
      battleResolutionCommandDuration(messageCommand!, fellResolution.field),
    ).toBe(88);
    // One banner's total (stat + message) is ~92 frames per the oracle's own
    // measured cadence (docs/issue69-omniboost-off-ground-truth.md §2's four
    // measured gaps: 92/93/91/93, mean 92.25) -- state-level phase breakdown,
    // not pixels.
    expect(
      battleResolutionCommandDuration(statCommand!, fellResolution.field)
      + battleResolutionCommandDuration(messageCommand!, fellResolution.field),
    ).toBe(90);

    // A non-stat-change message (the ordinary "used move!" banner) keeps the
    // old floor -- the hold is scoped to the six stat-change STRINGIDs, not
    // every message this pipeline prints.
    const usedMoveResolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }),
      event(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 }),
    ], NEXT_COMMAND));
    expect(usedMoveResolution.segments[0]!.commands[0]).toMatchObject({
      timing: { minimumFrames: 24, holdFrames: 0 },
    });
    expect(
      battleResolutionCommandDuration(
        usedMoveResolution.segments[0]!.commands[0]!,
        usedMoveResolution.field,
      ),
    ).toBe(24);

    // Repeats identically for every one of the six stat-change STRINGIDs
    // (BattleScript_StatUp/StatDown's own gStatUpStringIds/gStatDownStringIds
    // table, reference/pokeemerald/src/battle_message.c:1006-1022) -- the
    // per-banner shape generalizes, it is not Silver-Wind/accuracy-specific.
    for (
      const messageId of [
        "STRINGID_ATTACKERSSTATROSE",
        "STRINGID_DEFENDERSSTATROSE",
        "STRINGID_STATSWONTINCREASE",
        "STRINGID_ATTACKERSSTATFELL",
        "STRINGID_DEFENDERSSTATFELL",
        "STRINGID_STATSWONTDECREASE",
      ] as const
    ) {
      const resolution = createBattleResolutionPresentation(inputFor([
        event(0, {
          kind: "stat-stage-change",
          battler: 0,
          stat: "attack",
          from: 6,
          to: 7,
          requestedMagnitude: 1,
        }),
        event(1, { kind: "message", messageId, substitutions: [] }),
      ], NEXT_COMMAND));
      expect(resolution.segments[0]!.commands[1]).toMatchObject({
        timing: { holdFrames: 64 },
      });
    }
  });

  it("ISSUES #59/#60: supports rise/drop on either battler through the generated-route Scene-OFF adapter", () => {
    const cases = [
      { battler: 0 as const, stat: "attack" as const, from: 6, to: 4, direction: "decrease" as const, requestedMagnitude: 2 as const },
      { battler: 0 as const, stat: "special-defense" as const, from: 6, to: 7, direction: "increase" as const, requestedMagnitude: 1 as const },
      { battler: 1 as const, stat: "defense" as const, from: 6, to: 5, direction: "decrease" as const, requestedMagnitude: 1 as const },
      // #60's exact novelty gate: the opponent's own DOUBLE_TEAM receipt.
      { battler: 1 as const, stat: "evasion" as const, from: 7, to: 8, direction: "increase" as const, requestedMagnitude: 1 as const },
    ];

    for (const testCase of cases) {
      const resolution = createBattleResolutionPresentation(inputFor([
        event(0, {
          kind: "stat-stage-change",
          battler: testCase.battler,
          stat: testCase.stat,
          from: testCase.from,
          to: testCase.to,
          requestedMagnitude: testCase.requestedMagnitude,
        }),
      ], NEXT_COMMAND));
      const view = createBattleResolutionPresentationRenderView(
        atRenderClock(resolution, 0, 12),
      );
      expect(view.effect).toMatchObject({
        type: "stat",
        battler: testCase.battler,
        stat: testCase.stat,
        from: testCase.from,
        to: testCase.to,
        age: 12,
      });
      if (view.effect?.type !== "stat") throw new Error("expected typed stat effect");
      expect(sceneOffStatStageBannerView(view.effect)).toMatchObject({
        battler: testCase.battler,
        stat: testCase.stat,
        direction: testCase.direction,
      });

      const baseline = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionSceneOffView(baseline, { ...view, effect: null });
      const first = new Uint8Array(240 * 160 * 4);
      const second = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionSceneOffView(first, view);
      renderBattleResolutionSceneOffView(second, view);
      expect(first.every((value, index) => value === second[index])).toBe(true);

      const art = testCase.battler === 0
        ? view.fieldArt.player
        : view.fieldArt.opponent;
      const changedPixels: number[] = [];
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        const offset = pixel * 4;
        if (
          first[offset] !== baseline[offset]
          || first[offset + 1] !== baseline[offset + 1]
          || first[offset + 2] !== baseline[offset + 2]
        ) changedPixels.push(pixel);
      }
      expect(changedPixels.length).toBeGreaterThan(0);
      expect(changedPixels.every((pixel) => {
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        return x >= art.origin.x
          && x < art.origin.x + art.pic.tileset.columns * 8
          && y >= art.origin.y
          && y < art.origin.y + art.pic.tileset.rows * 8;
      })).toBe(true);
    }
  });

  it("ISSUES #60: renders every command completion edge of an opponent rise deterministically", () => {
    const resolution = createBattleResolutionPresentation(inputFor([
      event(0, { kind: "stat-stage-change", battler: 1, stat: "evasion", from: 7, to: 8, requestedMagnitude: 1 }),
      event(1, { kind: "message", messageId: "STRINGID_DEFENDERSSTATROSE", substitutions: [] }),
    ], NEXT_COMMAND));
    const commands = resolution.segments[0]!.commands;
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
      const duration = battleResolutionCommandDuration(
        commands[commandIndex]!,
        resolution.field,
      );
      for (const age of new Set([0, duration - 1])) {
        const view = createBattleResolutionPresentationRenderView(
          atRenderClock(resolution, commandIndex, age),
        );
        const first = new Uint8Array(240 * 160 * 4);
        const second = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionSceneOffView(first, view);
        renderBattleResolutionSceneOffView(second, view);
        expect(first.every((value, index) => value === second[index])).toBe(true);
      }
    }
    const complete = createBattleResolutionPresentationRenderView(
      atRenderClock(resolution, commands.length, 0, "next-command-handoff"),
    );
    expect(() => renderBattleResolutionSceneOffView(
      new Uint8Array(240 * 160 * 4),
      complete,
    )).not.toThrow();
  });

  it("ISSUES #60: rejects malformed or directionless stat banner endpoints", () => {
    for (const [from, to] of [[6, 6], [-1, 1], [11, 13]]) {
      const resolution = createBattleResolutionPresentation(inputFor([
        event(0, { kind: "stat-stage-change", battler: 1, stat: "evasion", from, to, requestedMagnitude: 1 }),
      ], NEXT_COMMAND));
      const view = createBattleResolutionPresentationRenderView(
        atRenderClock(resolution, 0, 12),
      );
      expect(() => renderBattleResolutionSceneOffView(
        new Uint8Array(240 * 160 * 4),
        view,
      )).toThrow(
        `Scene OFF typed stat adapter cannot draw battler 1 evasion ${from}->${to}`,
      );
    }
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
      ...SCENE_OFF_TURN_DEFAULT_IDENTITY,
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
