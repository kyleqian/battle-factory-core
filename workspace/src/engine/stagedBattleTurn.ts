import type { BattleTurnScenario } from "./battleTurn.ts";
import { resolveBattleTurn } from "./battleTurn.ts";
import type {
  BattleDecisionSubmission,
  BattleDecisionTransitionResult,
  BattleState,
} from "./battleDecisionBoundary.ts";
import {
  SCENE_OFF_TURN_DEFAULT_IDENTITY,
  type SceneOffTurnIdentity,
} from "./battleScene.ts";
import {
  submitFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";
import {
  acknowledgeSceneOffCommand,
  advanceSceneOffAdapter,
  createBattleKernelTurnPresentation,
  createBattleTurnPresentation,
  createSceneOffAdapter,
  pendingSceneOffCommand,
  type BattleTurnPresentationState,
  type SceneOffKernelBattlerMetadata,
  type SceneOffAdapterState,
} from "./sceneOffPresentation.ts";

export interface StagedFactoryFullTurnInput {
  readonly initialState: BattleState<FactoryFullTurnDecisionRules>;
  readonly playerSubmission: BattleDecisionSubmission;
  readonly trainerSubmission: BattleDecisionSubmission;
  readonly battlers: readonly [
    SceneOffKernelBattlerMetadata,
    SceneOffKernelBattlerMetadata,
  ];
}

export interface StagedBattleTurnState {
  readonly scenario: BattleTurnScenario | null;
  readonly kernel: StagedFactoryFullTurnInput | null;
  readonly kernelTransition:
    | BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>
    | null;
  readonly initialOpponentHp: number;
  readonly phase: "awaitingConfirm" | "presenting" | "inputReady";
  readonly presentation: BattleTurnPresentationState | null;
  readonly adapter: SceneOffAdapterState | null;
  readonly commandDurations: readonly number[] | null;
  readonly inputReadyElapsed: number;
  readonly nextInputAccepted: boolean;
  readonly sceneOffIdentity: SceneOffTurnIdentity;
}

export function stageBattleTurn(
  scenario: BattleTurnScenario,
  commandDurations: readonly number[] | null = null,
): StagedBattleTurnState {
  return {
    scenario,
    kernel: null,
    kernelTransition: null,
    initialOpponentHp: scenario.initial.opponent.hp,
    phase: "awaitingConfirm",
    presentation: null,
    adapter: null,
    commandDurations,
    inputReadyElapsed: 0,
    nextInputAccepted: false,
    sceneOffIdentity: SCENE_OFF_TURN_DEFAULT_IDENTITY,
  };
}

function freezeSubmission(
  submission: BattleDecisionSubmission,
): BattleDecisionSubmission {
  return Object.freeze({
    requestId: submission.requestId,
    side: submission.side,
    decision: Object.freeze({ ...submission.decision }),
  });
}

export function stageFactoryFullTurnBattle(
  input: StagedFactoryFullTurnInput,
  commandDurations: readonly number[] | null = null,
): StagedBattleTurnState {
  return Object.freeze({
    scenario: null,
    kernel: Object.freeze({
      initialState: input.initialState,
      playerSubmission: freezeSubmission(input.playerSubmission),
      trainerSubmission: freezeSubmission(input.trainerSubmission),
      battlers: Object.freeze(input.battlers.map((battler) =>
        Object.freeze({
          ...battler,
          moveNames: Object.freeze([...battler.moveNames]),
        })
      )) as unknown as StagedFactoryFullTurnInput["battlers"],
    }),
    kernelTransition: null,
    initialOpponentHp:
      input.initialState.rules.rulesContext.battlers[1]!.hp,
    phase: "awaitingConfirm",
    presentation: null,
    adapter: null,
    commandDurations:
      commandDurations === null
        ? null
        : Object.freeze([...commandDurations]),
    inputReadyElapsed: 0,
    nextInputAccepted: false,
    sceneOffIdentity: SCENE_OFF_TURN_DEFAULT_IDENTITY,
  });
}

/**
 * Generic staged action gate used by compare probes. Logical resolution is
 * committed on confirm; later ticks only pace/ack presentation commands.
 */
export function advanceStagedBattleTurn(
  state: StagedBattleTurnState,
  confirm: boolean,
): StagedBattleTurnState {
  if (state.phase === "inputReady") {
    return {
      ...state,
      inputReadyElapsed: state.inputReadyElapsed + 1,
      nextInputAccepted: state.nextInputAccepted || confirm,
    };
  }
  if (state.phase === "awaitingConfirm") {
    if (!confirm) return state;
    if (state.kernel) {
      const afterPlayer = submitFactoryFullTurnDecision(
        state.kernel.initialState,
        state.kernel.playerSubmission,
      );
      if (afterPlayer.kind !== "decision-required") {
        throw new Error(
          "staged full turn did not reach the trainer command boundary",
        );
      }
      const transition = submitFactoryFullTurnDecision(
        afterPlayer.state,
        state.kernel.trainerSubmission,
      );
      if (transition.kind !== "decision-required") {
        throw new Error(
          "staged full turn did not reach the next player command boundary",
        );
      }
      return {
        ...state,
        phase: "presenting",
        kernelTransition: transition,
        presentation: createBattleKernelTurnPresentation({
          before: state.kernel.initialState.rules.rulesContext,
          after: transition.state.rules.rulesContext,
          events: transition.events,
          boundary: transition.state.boundary,
          rngValue: transition.state.rng.value,
          battlers: state.kernel.battlers,
        }),
        adapter: createSceneOffAdapter(),
      };
    }
    if (!state.scenario) {
      throw new Error("staged turn has neither a scenario nor a kernel input");
    }
    return {
      ...state,
      phase: "presenting",
      presentation: createBattleTurnPresentation(resolveBattleTurn(state.scenario)),
      adapter: createSceneOffAdapter(),
    };
  }

  const presentation = state.presentation!;
  const command = pendingSceneOffCommand(presentation);
  if (command === null) {
    return { ...state, phase: "inputReady" };
  }
  const duration = state.commandDurations?.[presentation.commandIndex];
  const timedCommand = duration === undefined
    ? command
    : { ...command, minimumFrames: duration };
  const advanced = advanceSceneOffAdapter(state.adapter!, timedCommand);
  if (advanced.completion === null) {
    return { ...state, adapter: advanced.adapter };
  }
  const acknowledged = acknowledgeSceneOffCommand(
    presentation,
    advanced.completion.commandId,
  );
  return {
    ...state,
    phase: acknowledged.inputReady ? "inputReady" : "presenting",
    presentation: acknowledged,
    adapter: acknowledged.inputReady ? null : createSceneOffAdapter(),
  };
}
