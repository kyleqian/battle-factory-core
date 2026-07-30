/**
 * Source-relative pre-send-out lifecycle for a generated Factory battle.
 *
 * The command is immutable. This reducer owns only the BeginBattleIntro
 * presentation clock and the first PAUSE_UNTIL_PRESS edge, then continues
 * through the opponent controller's ordinary release.
 */

import type { GbaButton } from "../input.ts";
import {
  advanceBattleCommandPresentation,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import {
  generatedBattleStartCommandReady,
  generatedBattleStartOpponentReleaseStarted,
  generatedBattleStartPlayerReleaseStarted,
  generatedBattleIntroVisualPhase,
  isGeneratedBattleIntroInputReady,
} from "./battleScene.ts";
import { factoryBattleStartField } from "./factoryBattleStartPresentation.ts";
import type {
  FactoryBattleStartPresentationCommand,
} from "./factoryBattleStartPresentation.ts";

export type FactoryBattleStartIntroPhase =
  | "handoff"
  | "trainer-slide"
  | "trainer-message"
  | "awaiting-acknowledgement"
  | "opponent-message"
  | "opponent-release"
  | "player-release"
  | "command-ready";

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
  if (state.acknowledgedElapsed !== null) {
    if (generatedBattleStartCommandReady(state)) return "command-ready";
    if (generatedBattleStartPlayerReleaseStarted(state)) return "player-release";
    return generatedBattleStartOpponentReleaseStarted(state)
      ? "opponent-release"
      : "opponent-message";
  }
  const visualPhase = generatedBattleIntroVisualPhase(state.elapsed);
  if (visualPhase !== "trainer-message") return visualPhase;
  if (!isGeneratedBattleIntroInputReady(state)) return "trainer-message";
  return "awaiting-acknowledgement";
}

export function advanceFactoryBattleStartIntro(
  state: FactoryBattleStartIntroState,
  newKeys: ReadonlySet<GbaButton> = new Set(),
): FactoryBattleStartIntroState {
  const acknowledgedElapsed =
    state.acknowledgedElapsed
    ?? (
      newKeys.has("A") && isGeneratedBattleIntroInputReady(state)
        ? state.elapsed
        : null
    );
  return Object.freeze({
    ...state,
    elapsed: state.elapsed + 1,
    acknowledgedElapsed,
  });
}

/**
 * Converts the completed intro into the exact typed command checkpoint used
 * by capture 8 of battle-command-generated-off. The caller supplies the real
 * fresh-battle boundary; this lifecycle only verifies its frozen field and
 * advances the shared controller reducer to that already-proven checkpoint.
 */
export function settleFactoryBattleStartCommand(
  state: FactoryBattleStartIntroState,
  command: BattleCommandPresentationState,
): BattleCommandPresentationState {
  if (!generatedBattleStartCommandReady(state)) {
    throw new Error("Factory battle-start command requested before player-ready");
  }
  if (JSON.stringify(command.field) !== JSON.stringify(factoryBattleStartField(state.command))) {
    throw new Error("Factory battle-start command field does not match the frozen intro");
  }
  let settled = command;
  for (let frame = 0; frame < 8; frame += 1) {
    settled = advanceBattleCommandPresentation(settled, new Set());
  }
  return settled;
}
