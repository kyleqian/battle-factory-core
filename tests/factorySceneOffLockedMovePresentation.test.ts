import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  appendBattleResolutionActionContinuation,
  appendBattleResolutionLockedActionContinuation,
  createBattleResolutionPresentation,
  type BattleResolutionPresentationState,
} from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import type { BattleState } from "../src/engine/battleDecisionBoundary.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";
import type { BattleScriptPartyMemberState, BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";
import {
  submitFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";

const FLY = 19;
const ASSIST = 274;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function member(setId: number): BattleScriptPartyMemberState {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({
    setId,
    personality: natureByName.get(set.nature)!,
    fixedIv: 3,
    abilitySlot: 0,
  });
}

function party(activeSetId: number): BattleScriptPartyState {
  return Object.freeze([
    member(activeSetId),
    member(300),
    member(301),
    member(302),
    member(303),
    member(304),
  ]) as unknown as BattleScriptPartyState;
}

function commandRequest(
  state: BattleState<FactoryFullTurnDecisionRules>,
  side: "player" | "trainer",
) {
  if (
    state.boundary.kind !== "decision-required"
    || state.boundary.request.kind !== "command"
    || state.boundary.request.side !== side
  ) {
    throw new Error(`expected a ${side} command boundary`);
  }
  return state.boundary.request;
}

function submitMove(
  state: BattleState<FactoryFullTurnDecisionRules>,
  side: "player" | "trainer",
  moveSlot: 0 | 1 | 2 | 3,
) {
  const request = commandRequest(state, side);
  const decision = request.legalDecisions.find((candidate) =>
    candidate.kind === "use-move" && candidate.moveSlot === moveSlot
  );
  if (decision === undefined || decision.kind !== "use-move") {
    throw new Error(`expected legal ${side} move slot ${moveSlot}`);
  }
  const transition = submitFactoryFullTurnDecision(state, {
    requestId: request.requestId,
    side,
    decision,
  });
  if (transition.kind !== "decision-required") {
    throw new Error(`expected ${side} move slot ${moveSlot} to reach a command boundary`);
  }
  return Object.freeze({ request, decision, transition });
}

function completedNextCommandHandoff(
  resolution: BattleResolutionPresentationState,
): BattleResolutionPresentationState {
  return Object.freeze({
    ...resolution,
    commandIndex: resolution.segments[0]!.commands.length,
    lifecycle: Object.freeze({ phase: "next-command-handoff" as const, phaseElapsed: 6 }),
    confirmHandoff: null,
  });
}

function groupPlayerLockedFly(input: Readonly<{
  playerParty: BattleScriptPartyState;
  playerMoveSlot: 0 | 1 | 2 | 3;
  opponentParty: BattleScriptPartyState;
}>) {
  const initial = createFreshFactoryBattle({
    requestId: 1,
    rngSeed: 0,
    battleScene: "off",
    playerParty: input.playerParty,
    opponentParty: input.opponentParty,
  });
  const player = submitMove(initial, "player", input.playerMoveSlot);
  const charge = submitMove(player.transition.state, "trainer", 0);
  const presentation = createBattleResolutionPresentation({
    sourceRequest: player.request,
    sourceDecision: player.decision,
    beforeRules: initial.rules,
    transition: charge.transition,
    fieldBoundary: createBattleCommandPresentation(
      player.request,
      initial.rules.rulesContext,
      player.decision.moveSlot,
    ).field,
    confirmHandoff: { fightDisplayCursor: player.decision.moveSlot, idleBounceElapsed: 0 },
  });
  const completed = completedNextCommandHandoff(presentation);
  // The only source-published continuation boundary is the trainer command:
  // HandleTurnActionSelectionState already auto-confirmed the player lock.
  const locked = submitMove(charge.transition.state, "trainer", 0);
  const grouped = appendBattleResolutionActionContinuation({
    resolution: completed,
    transition: locked.transition,
    fieldBoundary: createBattleResolutionPresentationRenderView(completed).field,
  });
  return Object.freeze({ initial, charge, locked, grouped });
}

function usedMoveEvent(
  events: readonly { readonly payload: unknown }[],
  attacker: 0 | 1,
) {
  const found = events.find((event) => {
    const payload = event.payload as {
      kind?: string;
      messageId?: string;
      actionSnapshot?: { attacker?: number };
    };
    return payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === attacker;
  });
  if (found === undefined) throw new Error(`expected battler ${attacker} used-move receipt`);
  return found.payload as Readonly<{
    kind: "message";
    messageId: "STRINGID_USEDMOVE";
    actionSnapshot: Readonly<{
      attacker: 0 | 1;
      currentMove: number;
      currentMovePosition: number;
    }>;
  }>;
}

describe("Scene-OFF locked-move resolution composition", () => {
  it("groups a real player FLY charge and locked strike without concatenating receipts", () => {
    const flow = groupPlayerLockedFly({
      playerParty: party(44), // Taillow, FLY in source slot 0.
      playerMoveSlot: 0,
      opponentParty: party(8), // Metapod, deterministic Harden response.
    });
    const { grouped } = flow;
    expect(flow.initial.rules.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
    );
    expect(grouped.segments).toHaveLength(2);
    expect(grouped.segments[0]!.events).toBe(flow.charge.transition.events);
    expect(grouped.segments[1]!.events).toBe(flow.locked.transition.events);
    expect(grouped.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 4, side: "player", battler: 0 },
    });

    const hidden = flow.charge.transition.events.findIndex(({ payload }) =>
      payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 0
      && payload.invisible
    );
    const interveningOpponentMove = flow.charge.transition.events.findIndex(({ payload }, index) =>
      index > hidden
      && payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 1
    );
    const lockedMove = usedMoveEvent(flow.locked.transition.events, 0);
    const lockedMoveIndex = flow.locked.transition.events.findIndex(
      ({ payload }) => payload === lockedMove,
    );
    const restored = flow.locked.transition.events.findIndex(({ payload }, index) =>
      index > lockedMoveIndex
      && payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 0
      && !payload.invisible
    );
    expect(hidden).toBeGreaterThanOrEqual(0);
    expect(interveningOpponentMove).toBeGreaterThan(hidden);
    expect(lockedMove.actionSnapshot).toEqual({
      attacker: 0,
      currentMove: FLY,
      currentMovePosition: 0,
    });
    expect(Object.isFrozen(lockedMove.actionSnapshot)).toBe(true);
    expect(restored).toBeGreaterThan(lockedMoveIndex);
    expect(flow.locked.transition.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 0
    )).toBe(false);

    const chargeText = grouped.segments[0]!.commands.find((command) =>
      command.type === "message" && command.lines[0] === "TAILLOW flew"
    );
    const lockedTextIndex = grouped.segments[1]!.commands.findIndex((command) =>
      command.type === "message"
      && command.lines[0] === "TAILLOW used"
      && command.lines[1] === "FLY!"
    );
    const restoreCommandIndex = grouped.segments[1]!.commands.findIndex((command) =>
      command.type === "sprite-visibility" && command.battler === 0 && command.visible
    );
    expect(chargeText).toMatchObject({ type: "message", lines: ["TAILLOW flew", "up high!"] });
    expect(lockedTextIndex).toBeGreaterThanOrEqual(0);
    expect(restoreCommandIndex).toBeGreaterThan(lockedTextIndex);
    const lockedView = createBattleResolutionPresentationRenderView(Object.freeze({
      ...grouped,
      segmentIndex: 1,
      commandIndex: lockedTextIndex,
      lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
      confirmHandoff: null,
    }));
    const restoredView = createBattleResolutionPresentationRenderView(Object.freeze({
      ...grouped,
      segmentIndex: 1,
      commandIndex: restoreCommandIndex,
      lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
      confirmHandoff: null,
    }));
    expect(lockedView.visibility.player.sprite).toBe(false);
    expect(restoredView.visibility.player.sprite).toBe(true);
  });

  it("prints called FLY from Assist's frozen currentMove while retaining Assist's PP slot", () => {
    const sentret = Object.freeze({
      ...member(16),
      moves: Object.freeze([0, 0, 0, ASSIST] as const),
      pp: Object.freeze([0, 0, 0, 20] as const),
    });
    const taillow = Object.freeze({
      ...member(44),
      moves: Object.freeze([FLY, 0, 0, 0] as const),
      pp: Object.freeze([20, 0, 0, 0] as const),
    });
    const noMove = (setId: number) => Object.freeze({
      ...member(setId),
      moves: Object.freeze([0, 0, 0, 0] as const),
      pp: Object.freeze([0, 0, 0, 0] as const),
    });
    const playerParty = Object.freeze([
      sentret,
      taillow,
      noMove(300),
      noMove(301),
      noMove(302),
      noMove(303),
    ]) as unknown as BattleScriptPartyState;
    const flow = groupPlayerLockedFly({
      playerParty,
      playerMoveSlot: 3,
      opponentParty: party(8),
    });
    const lockedMove = usedMoveEvent(flow.locked.transition.events, 0);
    expect(lockedMove.actionSnapshot).toEqual({
      attacker: 0,
      currentMove: FLY,
      currentMovePosition: 3,
    });
    expect(flow.locked.transition.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 0
    )).toBe(false);
    expect(flow.grouped.segments[1]!.commands).toContainEqual(expect.objectContaining({
      type: "message",
      lines: ["SENTRET used", "FLY!"],
    }));
    expect(flow.locked.transition.state.rules.rulesContext.battlers[0]!.pp[3]).toBe(19);
  });

  it("attributes the opponent's locked FLY to its frozen action snapshot", () => {
    const initial = createFreshFactoryBattle({
      requestId: 1,
      rngSeed: 0,
      battleScene: "off",
      playerParty: party(8), // Metapod's Harden is the intervening player action.
      opponentParty: party(44),
    });
    const firstPlayer = submitMove(initial, "player", 0);
    const charge = submitMove(firstPlayer.transition.state, "trainer", 0);
    const chargeResolution = createBattleResolutionPresentation({
      sourceRequest: firstPlayer.request,
      sourceDecision: firstPlayer.decision,
      beforeRules: initial.rules,
      transition: charge.transition,
      fieldBoundary: createBattleCommandPresentation(
        firstPlayer.request,
        initial.rules.rulesContext,
        0,
      ).field,
      confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
    });
    const completedCharge = completedNextCommandHandoff(chargeResolution);
    const intervening = submitMove(charge.transition.state, "player", 0);
    expect(() => appendBattleResolutionLockedActionContinuation({
      resolution: completedCharge,
      transition: intervening.transition,
      fieldBoundary: createBattleResolutionPresentationRenderView(completedCharge).field,
      lockedAction: { battler: 1, currentMove: FLY, currentMovePosition: 1 },
    })).toThrow("no immutable matching action snapshot");
    const resolution = appendBattleResolutionLockedActionContinuation({
      resolution: completedCharge,
      transition: intervening.transition,
      fieldBoundary: createBattleResolutionPresentationRenderView(completedCharge).field,
      lockedAction: { battler: 1, currentMove: FLY, currentMovePosition: 0 },
    });
    const lockedMove = usedMoveEvent(intervening.transition.events, 1);
    expect(resolution.resolutionId).toBe(chargeResolution.resolutionId);
    expect(resolution.segments).toHaveLength(2);
    expect(resolution.segments[0]).toBe(chargeResolution.segments[0]);
    expect(resolution.segments[1]!.events).toBe(intervening.transition.events);
    expect(resolution.resolutionId.requestId).not.toBe(
      commandRequest(charge.transition.state, "player").requestId,
    );
    expect(Object.isFrozen(resolution.segments)).toBe(true);
    expect(Object.isFrozen(resolution.segments[0])).toBe(true);
    expect(lockedMove.actionSnapshot).toEqual({
      attacker: 1,
      currentMove: FLY,
      currentMovePosition: 0,
    });
    expect(intervening.transition.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 1
    )).toBe(false);
    expect(resolution.segments[1]!.commands).toContainEqual(expect.objectContaining({
      type: "message",
      lines: ["Foe TAILLOW used", "FLY!"],
    }));
    expect(intervening.transition.events).toContainEqual(expect.objectContaining({
      payload: {
        kind: "set-battler-sprite-visibility",
        battler: 1,
        invisible: false,
      },
    }));
  });
});
