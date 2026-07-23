import type { BattleTurnScenario } from "./battleTurn.ts";
import { resolveBattleTurn } from "./battleTurn.ts";
import {
  acknowledgeSceneOffCommand,
  advanceSceneOffAdapter,
  createBattleTurnPresentation,
  createSceneOffAdapter,
  pendingSceneOffCommand,
  type BattleTurnPresentationState,
  type SceneOffAdapterState,
} from "./sceneOffPresentation.ts";

export interface StagedBattleTurnState {
  readonly scenario: BattleTurnScenario;
  readonly phase: "awaitingConfirm" | "presenting" | "inputReady";
  readonly presentation: BattleTurnPresentationState | null;
  readonly adapter: SceneOffAdapterState | null;
}

export function stageBattleTurn(scenario: BattleTurnScenario): StagedBattleTurnState {
  return {
    scenario,
    phase: "awaitingConfirm",
    presentation: null,
    adapter: null,
  };
}

/**
 * Generic staged action gate used by compare probes. Logical resolution is
 * committed on confirm; later ticks only pace/ack presentation commands.
 */
export function advanceStagedBattleTurn(
  state: StagedBattleTurnState,
  confirm: boolean,
): StagedBattleTurnState {
  if (state.phase === "inputReady") return state;
  if (state.phase === "awaitingConfirm") {
    if (!confirm) return state;
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
  const advanced = advanceSceneOffAdapter(state.adapter!, command);
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

