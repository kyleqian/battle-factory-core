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
  /**
   * True only for the interactive draft anchor's own Battle 1 (the route
   * whose opponent schedule is adopted pre-selected rather than freshly
   * generated, `FactoryRoundBattleOrchestratorConfig.adoptedInitialOpponent`
   * at `battleIndex` 0 — see `beginFactoryRoundBattleStartIntro`). Selects
   * which player-ready-lag calibration `battleScene.ts` uses; see
   * `GENERATED_PLAYER_READY_LAG`'s doc there for both.
   */
  isCanonicalAnchorIntro: boolean;
}>;

export function createFactoryBattleStartIntro(
  command: FactoryBattleStartPresentationCommand,
  isCanonicalAnchorIntro: boolean,
): FactoryBattleStartIntroState {
  return Object.freeze({
    command,
    elapsed: 0,
    acknowledgedElapsed: null,
    isCanonicalAnchorIntro,
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
 * Converts the completed intro into the first visible typed action-menu
 * checkpoint. The caller supplies the real fresh-battle boundary; this
 * lifecycle verifies its frozen field and consumes only PlayerHandleChoose-
 * Action's six blank action-enter callbacks. HandleInputChooseAction starts
 * the two DoBounceEffect clocks on later callbacks (battle_controller_player.c
 * and battle_main.c), so those clocks must remain at age zero at this seam.
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
  if (command.lifecycle.phase !== "action-enter") {
    throw new Error("Factory battle-start command must begin at action-enter");
  }
  let settled = command;
  while (settled.lifecycle.phase === "action-enter") {
    settled = advanceBattleCommandPresentation(settled, new Set());
  }
  return settled;
}
