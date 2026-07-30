/**
 * Source-relative pre-send-out lifecycle for a generated Factory battle.
 *
 * The command is immutable. This reducer owns only the BeginBattleIntro
 * presentation clock and the first PAUSE_UNTIL_PRESS edge; send-out
 * controllers are deliberately left to the next lifecycle slice.
 */

import type { GbaButton } from "../input.ts";
import {
  generatedBattleIntroVisualPhase,
  isGeneratedBattleIntroInputReady,
} from "./battleScene.ts";
import type {
  FactoryBattleStartPresentationCommand,
} from "./factoryBattleStartPresentation.ts";

export type FactoryBattleStartIntroPhase =
  | "handoff"
  | "trainer-slide"
  | "trainer-message"
  | "awaiting-acknowledgement"
  | "acknowledged";

export type FactoryBattleStartIntroState = Readonly<{
  command: FactoryBattleStartPresentationCommand;
  /** BeginBattleIntro-relative controller callbacks. */
  elapsed: number;
  /** First accepted PAUSE_UNTIL_PRESS A edge, frozen once. */
  acknowledgedElapsed: number | null;
}>;

export function createFactoryBattleStartIntro(
  command: FactoryBattleStartPresentationCommand,
): FactoryBattleStartIntroState {
  return Object.freeze({
    command,
    elapsed: 0,
    acknowledgedElapsed: null,
  });
}

export function factoryBattleStartIntroPhase(
  state: FactoryBattleStartIntroState,
): FactoryBattleStartIntroPhase {
  if (state.acknowledgedElapsed !== null) return "acknowledged";
  const visualPhase = generatedBattleIntroVisualPhase(state.elapsed);
  if (visualPhase !== "trainer-message") return visualPhase;
  if (!isGeneratedBattleIntroInputReady(state)) return "trainer-message";
  return "awaiting-acknowledgement";
}

export function advanceFactoryBattleStartIntro(
  state: FactoryBattleStartIntroState,
  newKeys: ReadonlySet<GbaButton> = new Set(),
): FactoryBattleStartIntroState {
  if (state.acknowledgedElapsed !== null) return state;
  const acknowledgedElapsed =
    newKeys.has("A") && isGeneratedBattleIntroInputReady(state)
      ? state.elapsed
      : null;
  return Object.freeze({
    ...state,
    elapsed: state.elapsed + 1,
    acknowledgedElapsed,
  });
}
