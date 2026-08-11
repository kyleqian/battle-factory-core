import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
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
import { renderGeneratedBattleCommandPresentation } from "../src/engine/battleScene.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { createFactoryAiBattleHistory } from "../src/engine/factoryAiLiveDriver.ts";
import {
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";

const FLY = 19;
const SPLASH = 150;
const SPECIES_ONIX = 95;
const SPECIES_MURKROW = 198;
const ONIX_SET_ID = 156;
const MURKROW_SET_ID = 184;

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function corpusMember(setId: number): BattleScriptPartyMemberState {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({
    setId,
    personality: natureByName.get(set.nature)!,
    fixedIv: 3,
    abilitySlot: 0,
  });
}

function splashOnix(): BattleScriptPartyMemberState {
  const base = corpusMember(ONIX_SET_ID);
  return Object.freeze({
    ...base,
    species: SPECIES_ONIX,
    moves: Object.freeze([SPLASH, SPLASH, SPLASH, SPLASH] as const),
    pp: Object.freeze([16, 16, 16, 16] as const),
  });
}

function flyMurkrow(): BattleScriptPartyMemberState {
  const base = corpusMember(MURKROW_SET_ID);
  return Object.freeze({
    ...base,
    species: SPECIES_MURKROW,
    moves: Object.freeze([FLY, FLY, FLY, FLY] as const),
    pp: Object.freeze([20, 20, 20, 20] as const),
  });
}

function party(
  active: BattleScriptPartyMemberState,
  benchSetIds: readonly number[],
): BattleScriptPartyState {
  const bench = benchSetIds.map(corpusMember);
  return Object.freeze([active, ...bench]) as unknown as BattleScriptPartyState;
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

function viewAt(
  resolution: BattleResolutionPresentationState,
  segmentIndex: number,
  commandIndex: number,
) {
  return createBattleResolutionPresentationRenderView(Object.freeze({
    ...resolution,
    segmentIndex,
    commandIndex,
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    confirmHandoff: null,
  }));
}

/**
 * The ground-truth staged scenario (docs/fly-semi-invisible-off-ground-truth.md):
 * ONIX SPLASH×4 vs MURKROW FLY×4, Battle Scene OFF. Turn 1 the opponent flies
 * up (semi-invulnerable), turn 2 the locked FLY lands. The real game hides the
 * opponent SPRITE for the whole airborne span (frames 170-1768 of the staged
 * trace) and never hides the healthbox (ISSUES #79).
 */
function opponentFlyStagedFlow() {
  const initial = createFreshFactoryBattle({
    requestId: 1,
    rngSeed: 0,
    battleScene: "off",
    playerParty: party(splashOnix(), [300, 301, 302, 303, 304]),
    opponentParty: party(flyMurkrow(), [184, 289, 300, 301, 302]),
  });
  const player = submitMove(initial, "player", 0);
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
  const strike = submitMove(charge.transition.state, "player", 0);
  const strikeResolution = appendBattleResolutionLockedActionContinuation({
    resolution: completed,
    transition: strike.transition,
    fieldBoundary: createBattleResolutionPresentationRenderView(completed).field,
    lockedAction: { battler: 1, currentMove: FLY, currentMovePosition: 0 },
  });
  return Object.freeze({ initial, player, charge, presentation, strike, strikeResolution });
}

const PLAYER_TRAINER_ID = 0x89ab_cdef;

function record(setId: number, fixedIv = 3): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

function createStartedGeneratedBattle(
  seed: number,
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: `fly-semi-invisible-carrier-${seed}`,
    rngValue: seed,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  });
  return acknowledgeAndAdvance(state);
}

/**
 * Enters the public orchestrator at the fight-menu handoff AFTER the real
 * live-kernel opponent-FLY charge turn (the ground-truth staged scenario).
 * The surrounding generated-round controller is carrier state only; the
 * staged battle and resolution are ordinary full-turn kernel receipts, so
 * the menu handoff is driven exactly as production drives it.
 */
function liveOpponentFlyChargeMenuState(): Readonly<{
  state: FactoryRoundBattleOrchestratorState;
  chargeResolution: BattleResolutionPresentationState;
}> {
  const flow = opponentFlyStagedFlow();
  const chargeResolution = flow.presentation;
  if (
    chargeResolution.pendingBoundary.kind !== "decision-required"
    || chargeResolution.pendingBoundary.request.kind !== "command"
    || chargeResolution.pendingBoundary.request.side !== "player"
  ) {
    throw new Error("staged opponent lock did not publish its intervening player command");
  }
  const carrier = createStartedGeneratedBattle(4);
  const fields = [chargeResolution.field.player, chargeResolution.field.opponent] as const;
  const moveSelectionCursors = Object.freeze([0, 0, 0, 0] as const);
  const battlePresentationBoundaries = Object.freeze(fields.map((field, battler) =>
    Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1:
        chargeResolution.segments[0]!.beforeRules.rulesContext.battlers[battler]!.status1,
      spriteVisible: true,
      idleEpoch: 0,
      moveCursor: moveSelectionCursors[battler]!,
    })
  )) as FactoryRoundBattleOrchestratorState["battlePresentationBoundaries"];
  const state = Object.freeze({
    ...carrier,
    battle: chargeResolution.pendingBattle,
    battleCommandPresentation: null,
    battleResolutionPresentation: chargeResolution,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries,
    aiHistory: createFactoryAiBattleHistory(
      chargeResolution.pendingBattle.rules.rulesContext,
    ),
    facilityRngCalls:
      carrier.activeBattleCallStart! + chargeResolution.pendingBattle.rng.calls,
  });
  return Object.freeze({ state, chargeResolution });
}

function advanceMenuToOpen(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (
    let budget = 0;
    budget < 2_000 && next.battleResolutionPresentation !== null;
    budget += 1
  ) {
    next = advanceFactoryRoundBattleResolution(next);
  }
  expect(next.battleResolutionPresentation).toBeNull();
  expect(next.battleCommandPresentation).not.toBeNull();
  return next;
}

/** MURKROW front art origin: (144, 8 + yOffset), 48×48 from mon-pic-coords. */
const MURKROW_FRONT_REGION = Object.freeze({
  x: 144,
  y: 8 + 11,
  width: 48,
  height: 48,
});

function regionEquals(a: Uint8Array, b: Uint8Array, region: typeof MURKROW_FRONT_REGION): boolean {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const index = (y * 240 + x) * 4 + channel;
        if (a[index] !== b[index]) return false;
      }
    }
  }
  return true;
}

describe("Scene-OFF FLY semi-invisible live route (ISSUES #79)", () => {
  it("hides the airborne opponent's sprite but not its healthbox from the OFF emission through the strike's moveend", () => {
    const flow = opponentFlyStagedFlow();
    expect(flow.initial.rules.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
    );

    const hidden = flow.charge.transition.events.findIndex(({ payload }) =>
      payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 1
      && payload.invisible
    );
    expect(hidden).toBeGreaterThanOrEqual(0);
    expect(flow.charge.transition.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNFLEWHIGH"
    )).toBe(true);

    const chargeInvisible = flow.charge.transition.events.find(({ payload }) =>
      payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 1
      && payload.invisible
    );
    expect(chargeInvisible?.payload).toMatchObject({ kind: "set-battler-sprite-visibility", battler: 1, invisible: true });

    const strikeEvents = flow.strikeResolution.segments[1]!.events;
    const strikeMove = strikeEvents.findIndex(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 1
      && payload.actionSnapshot.currentMove === FLY
    );
    const restored = strikeEvents.findIndex(({ payload }, index) =>
      index > strikeMove
      && payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 1
      && !payload.invisible
    );
    expect(strikeMove).toBeGreaterThanOrEqual(0);
    expect(restored).toBeGreaterThan(strikeMove);

    const hiddenCommand = flow.presentation.segments[0]!.commands.findIndex((command) =>
      command.type === "sprite-visibility" && command.battler === 1 && !command.visible
    );
    const restoredCommand = flow.strikeResolution.segments[1]!.commands.findIndex((command) =>
      command.type === "sprite-visibility" && command.battler === 1 && command.visible
    );
    expect(hiddenCommand).toBeGreaterThanOrEqual(0);
    expect(restoredCommand).toBeGreaterThanOrEqual(0);

    const airborne = viewAt(flow.strikeResolution, 1, strikeMove);
    expect(airborne.visibility.opponent.sprite).toBe(false);
    expect(airborne.visibility.opponent.healthbox).toBe(true);
    expect(airborne.visibility.player.sprite).toBe(true);

    const restoredView = viewAt(flow.strikeResolution, 1, restoredCommand);
    expect(restoredView.visibility.opponent.sprite).toBe(true);
    expect(restoredView.visibility.opponent.healthbox).toBe(true);
  });

  it("DIG (sibling semi-invulnerable move) takes the same moveend toggle without hiding the healthbox", () => {
    const DIG = 91;
    const initial = createFreshFactoryBattle({
      requestId: 1,
      rngSeed: 0,
      battleScene: "off",
      playerParty: party(splashOnix(), [300, 301, 302, 303, 304]),
      opponentParty: party(Object.freeze({
        ...flyMurkrow(),
        moves: Object.freeze([DIG, DIG, DIG, DIG] as const),
        pp: Object.freeze([10, 10, 10, 10] as const),
      }), [184, 289, 300, 301, 302]),
    });
    const player = submitMove(initial, "player", 0);
    const charge = submitMove(player.transition.state, "trainer", 0);
    const hidden = charge.transition.events.findIndex(({ payload }) =>
      payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 1
      && payload.invisible
    );
    expect(hidden).toBeGreaterThanOrEqual(0);
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
    const strike = submitMove(charge.transition.state, "player", 0);
    const strikeResolution = appendBattleResolutionLockedActionContinuation({
      resolution: completed,
      transition: strike.transition,
      fieldBoundary: createBattleResolutionPresentationRenderView(completed).field,
      lockedAction: { battler: 1, currentMove: DIG, currentMovePosition: 0 },
    });
    const strikeEvents = strikeResolution.segments[1]!.events;
    const strikeMove = strikeEvents.findIndex(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_USEDMOVE"
      && payload.actionSnapshot?.attacker === 1
      && payload.actionSnapshot.currentMove === DIG
    );
    const restored = strikeEvents.findIndex(({ payload }, index) =>
      index > strikeMove
      && payload.kind === "set-battler-sprite-visibility"
      && payload.battler === 1
      && !payload.invisible
    );
    expect(restored).toBeGreaterThan(strikeMove);
    const airborne = viewAt(strikeResolution, 1, strikeMove);
    expect(airborne.visibility.opponent.sprite).toBe(false);
    expect(airborne.visibility.opponent.healthbox).toBe(true);
    expect(viewAt(strikeResolution, 1, restored).visibility.opponent.sprite).toBe(true);
  });

  it("the fight-menu handoff after the charge still knows the airborne opponent's sprite is hidden", () => {
    const { state } = liveOpponentFlyChargeMenuState();
    const menu = advanceMenuToOpen(state).battleCommandPresentation;
    if (menu === null) throw new Error("expected the fight-menu handoff");
    expect(menu.spriteVisibility.opponent).toBe(false);
    expect(menu.spriteVisibility.player).toBe(true);
  });

  it("the fight-menu renderer gates the opponent sprite on the presentation's sprite visibility", () => {
    const { state } = liveOpponentFlyChargeMenuState();
    const menu = advanceMenuToOpen(state).battleCommandPresentation;
    if (menu === null) throw new Error("expected the fight-menu handoff");

    const withSprite = createFramebuffer();
    renderGeneratedBattleCommandPresentation(withSprite, Object.freeze({
      ...menu,
      spriteVisibility: Object.freeze({ player: true, opponent: true }),
    }));
    const hiddenSprite = createFramebuffer();
    renderGeneratedBattleCommandPresentation(hiddenSprite, Object.freeze({
      ...menu,
      spriteVisibility: Object.freeze({ player: true, opponent: false }),
    }));

    // The only renderer-owned difference between the two frames must be the
    // opponent sprite region: hiding it must remove exactly its pixels and
    // the healthbox must stay drawn (ground truth: never hidden).
    expect(regionEquals(withSprite, hiddenSprite, MURKROW_FRONT_REGION)).toBe(false);
    const healthboxFramesDiffer = withSprite.some((value, index) =>
      index % 4 !== 3 && value !== hiddenSprite[index]
    );
    expect(healthboxFramesDiffer).toBe(true);
  });
});
