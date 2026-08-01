/**
 * ISSUES #39 rank-7 bridge: source-own the canonical Scene-OFF FLY lifecycle
 * without teaching the renderer about a turn number.
 *
 * The staged state is the real Battle-1 boundary documented in
 * docs/turn14-notes.md and docs/turn15-notes.md: Onix has 4 HP and selects
 * Dragon Breath, faster Murkrow charges FLY and becomes airborne, Dragon
 * Breath auto-misses, then Murkrow's locked continuation strikes before the
 * re-selected player action and produces a genuine player forced-switch
 * request.  Both source-published transition receipts remain separate
 * immutable presentation segments, matching the live seven-battle
 * FactoryRoundBattleOrchestrator path.
 *
 * This module owns facts only.  The already-oracle-exact legacy renderer
 * keeps its relative pixel clocks until its larger dispatcher is retired.
 */
import { createBattleCommandPresentation } from "./battleCommandPresentation.ts";
import type {
  BattleCommandDecision,
  BattleCommandRequest,
  BattleDecisionTransitionResult,
  BattleForcedSwitchRequest,
  BattleState,
} from "./battleDecisionBoundary.ts";
import {
  createBattleResolutionPresentation,
  type BattleResolutionPresentationCommand,
  type BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import { createBattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";

const FLY = 19;
const DRAGON_BREATH = 225;
const CANONICAL_TURN15_RNG_SEED = 369_617_245;

const PLAYER_DRAGON_BREATH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 2 as const,
  targetBattler: 1 as const,
});
const TRAINER_FLY = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 0 as const,
});

type DecisionRequired = Extract<
  BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  Readonly<{ kind: "decision-required" }>
>;

function expectCommandRequest(
  state: BattleState<FactoryFullTurnDecisionRules>,
  side: "player" | "trainer",
): BattleCommandRequest {
  if (
    state.boundary.kind !== "decision-required"
    || state.boundary.request.kind !== "command"
    || state.boundary.request.side !== side
  ) {
    throw new Error(`turn15FlyResolutionAdapter: expected ${side} command boundary`);
  }
  return state.boundary.request;
}

function expectDecisionRequired(
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  label: string,
): DecisionRequired {
  if (transition.kind !== "decision-required") {
    throw new Error(`turn15FlyResolutionAdapter: ${label} did not publish a decision boundary`);
  }
  return transition;
}

function stageInitialBattle(): BattleState<FactoryFullTurnDecisionRules> {
  const initial = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: CANONICAL_TURN15_RNG_SEED,
    player: {
      species: 95,
      moveId: DRAGON_BREATH,
      moves: [157, 20, DRAGON_BREATH, 201],
      pp: [0, 19, 17, 10],
      ability: 5,
      abilityNum: 1,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      speed: 76,
      hp: 4,
      maxHp: 117,
      statStages: [6, 0, 6, 6, 6, 6, 5, 6],
      types: ["TYPE_ROCK", "TYPE_GROUND"],
    },
    trainer: {
      species: 198,
      moveId: FLY,
      moves: [185, FLY, 259, 269],
      pp: [20, 15, 15, 20],
      ability: 15,
      abilityNum: 0,
      item: 221,
      attack: 91,
      defense: 69,
      spAttack: 91,
      spDefense: 69,
      speed: 97,
      hp: 142,
      maxHp: 142,
      types: ["TYPE_DARK", "TYPE_FLYING"],
    },
    playerBenchHp: [138, 153],
    playerBenchOverride: [
      {
        species: 240,
        level: 50,
        hp: 138,
        maxHP: 138,
        moves: [7, 108, 109, 123],
        pp: [15, 20, 10, 20],
        abilityNum: 0,
        item: 221,
      },
      {
        species: 153,
        level: 50,
        hp: 153,
        maxHP: 153,
        moves: [34, 73, 115, 54],
      },
    ],
  });
  return Object.freeze({
    ...initial,
    rules: Object.freeze({
      ...initial.rules,
      rulesContext: createBattleScriptRulesContext({
        ...initial.rules.rulesContext,
        hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
      }),
    }),
  });
}

export type Turn15FlyResolutionAdapter = Readonly<{
  chargeResolution: BattleResolutionPresentationState;
  strikeResolution: BattleResolutionPresentationState;
  chargeCommands: readonly BattleResolutionPresentationCommand[];
  strikeCommands: readonly BattleResolutionPresentationCommand[];
  chargeLines: readonly string[];
  missLines: readonly string[];
  strikeLines: readonly string[];
  faintLines: readonly string[];
  hp: Readonly<{ from: number; to: number }>;
  forcedRequest: BattleForcedSwitchRequest;
}>;

function linesForMessage(
  resolution: BattleResolutionPresentationState,
  messageId: string,
): readonly string[] {
  const segment = resolution.segments[0]!;
  const event = segment.events.find(({ payload }) =>
    payload.kind === "message" && payload.messageId === messageId
  );
  if (event === undefined) {
    throw new Error(`turn15FlyResolutionAdapter: missing ${messageId} receipt`);
  }
  const command = segment.commands.find((candidate) =>
    candidate.type === "message" && candidate.eventSequence === event.sequence
  );
  if (command?.type !== "message") {
    throw new Error(`turn15FlyResolutionAdapter: missing ${messageId} presentation command`);
  }
  return command.lines;
}

/**
 * Builds both source-published halves through the production reducer and
 * generic resolution projector. No turn/tick selector is an input to this
 * adapter; the forced request is accepted only from the reducer's boundary.
 *
 * The live orchestrator's two-segment append is intentionally not used here:
 * it accepts only the trainer command boundary produced by a PLAYER-owned
 * locked action. This canonical lifecycle is TRAINER-owned, so its charge
 * publishes a real intervening player command. That request must remain an
 * independent resolution identity until the orchestrator can retain a
 * trainer-owned locked-action owner across player command presentation.
 */
export function resolveTurn15FlyResolutionAdapter(): Turn15FlyResolutionAdapter {
  const initial = stageInitialBattle();
  const sourceRequest = expectCommandRequest(initial, "player");
  const playerSelected = expectDecisionRequired(
    submitFactoryFullTurnDecision(initial, {
      requestId: sourceRequest.requestId,
      side: "player",
      decision: PLAYER_DRAGON_BREATH,
    }),
    "player selection",
  );
  const trainerRequest = expectCommandRequest(playerSelected.state, "trainer");
  const charge = expectDecisionRequired(
    submitFactoryFullTurnDecision(playerSelected.state, {
      requestId: trainerRequest.requestId,
      side: "trainer",
      decision: TRAINER_FLY,
    }),
    "FLY charge",
  );
  const sourceDecision: BattleCommandDecision = PLAYER_DRAGON_BREATH;
  const chargeResolution = createBattleResolutionPresentation({
    sourceRequest,
    sourceDecision,
    beforeRules: initial.rules,
    transition: charge,
    fieldBoundary: createBattleCommandPresentation(
      sourceRequest,
      initial.rules.rulesContext,
      PLAYER_DRAGON_BREATH.moveSlot,
    ).field,
    confirmHandoff: Object.freeze({
      fightDisplayCursor: PLAYER_DRAGON_BREATH.moveSlot,
      idleBounceElapsed: 0,
    }),
  });
  const continuationRequest = expectCommandRequest(charge.state, "player");
  const strike = expectDecisionRequired(
    submitFactoryFullTurnDecision(charge.state, {
      requestId: continuationRequest.requestId,
      side: "player",
      decision: PLAYER_DRAGON_BREATH,
    }),
    "locked FLY strike",
  );
  const strikeResolution = createBattleResolutionPresentation({
    sourceRequest: continuationRequest,
    sourceDecision: PLAYER_DRAGON_BREATH,
    beforeRules: charge.state.rules,
    transition: strike,
    fieldBoundary: createBattleCommandPresentation(
      continuationRequest,
      charge.state.rules.rulesContext,
      PLAYER_DRAGON_BREATH.moveSlot,
    ).field,
    confirmHandoff: Object.freeze({
      fightDisplayCursor: PLAYER_DRAGON_BREATH.moveSlot,
      idleBounceElapsed: 0,
    }),
  });
  const forcedRequest = strikeResolution.forcedRequest;
  if (forcedRequest === null || forcedRequest.side !== "player") {
    throw new Error("turn15FlyResolutionAdapter: locked FLY did not publish a player forced switch");
  }
  const hp = strikeResolution.segments[0]!.commands.find((command) =>
    command.type === "hp" && command.battler === 0
  );
  if (hp?.type !== "hp") {
    throw new Error("turn15FlyResolutionAdapter: locked FLY has no player HP command");
  }
  return Object.freeze({
    chargeResolution,
    strikeResolution,
    chargeCommands: chargeResolution.segments[0]!.commands,
    strikeCommands: strikeResolution.segments[0]!.commands,
    chargeLines: linesForMessage(chargeResolution, "STRINGID_PKMNFLEWHIGH"),
    missLines: linesForMessage(chargeResolution, "STRINGID_ATTACKMISSED"),
    strikeLines: linesForMessage(strikeResolution, "STRINGID_USEDMOVE"),
    faintLines: linesForMessage(strikeResolution, "STRINGID_TARGETFAINTED"),
    hp: Object.freeze({ from: hp.from, to: hp.to }),
    forcedRequest,
  });
}

/** Cached production bridge shared by the exact renderer and input owner. */
export const CANONICAL_OPPONENT_FLY_RESOLUTION =
  resolveTurn15FlyResolutionAdapter();
