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
  BALL_WIDGETS_SETTLED_TICK,
  generatedBattleStartCommandReady,
  generatedBattleStartPostAcknowledgementComplete,
  generatedBattleStartOpponentReleaseStarted,
  generatedBattleStartPlayerReleaseStarted,
  generatedBattleIntroSourceClock,
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
  /**
   * Display callbacks retained black between the selected field transition
   * completing and BattleIntroSlide3's first displayed callback. This is a
   * source-lifecycle receipt, never a battle/trainer/trace-time selector.
   */
  sceneAssemblyDisplayLag: 0 | 1;
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
  /**
   * True only when `currentOpponent.frontierBrain.status === "silver"`
   * (`GetFrontierBrainStatus`, `frontier_util.c:1657-1698`) — the silver
   * Frontier-Brain reveal, which fires exactly once in a real playthrough
   * (streak 21, zero symbols). ISSUES #87 option (c): this is the one
   * committed compare window whose capture range crosses the ready
   * transition, so `battleScene.ts` adds a measured (not derived) offset to
   * `generatedPlayerReadyLag` only for this route-level identity; see
   * `MEASURED_SILVER_BRAIN_REVEAL_READY_LAG_OFFSET`'s doc there.
   */
  isSilverBrainReveal: boolean;
  /**
   * True only when `currentOpponent.frontierBrain.status === "gold"` — the
   * gold sibling of `isSilverBrainReveal` (same ISSUES #87 option (c)
   * mechanism, same committed compare window shape:
   * `factory-round-battle7-noland-gold-reveal-off`). See
   * `MEASURED_GOLD_BRAIN_REVEAL_READY_LAG_OFFSET`'s doc in `battleScene.ts`.
   */
  isGoldBrainReveal: boolean;
  /**
   * bso226: Battle Scene ON (`config.battleScene === "on"`). Presentation only: the intro's timing, text and RNG are shared; ON adds
   * the species send-out animations (opponent front, player back) that Scene OFF's SKIP_FRONT_ANIM path never launches.
   */
  sceneOn: boolean;
}>;

export function createFactoryBattleStartIntro(
  command: FactoryBattleStartPresentationCommand,
  isCanonicalAnchorIntro: boolean,
  sceneAssemblyDisplayLag: 0 | 1 = 0,
  isSilverBrainReveal = false,
  isGoldBrainReveal = false,
  sceneOn = false,
): FactoryBattleStartIntroState {
  return Object.freeze({
    command,
    elapsed: 0,
    sceneAssemblyDisplayLag,
    acknowledgedElapsed: null,
    isCanonicalAnchorIntro,
    isSilverBrainReveal,
    isGoldBrainReveal,
    sceneOn,
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
  const visualPhase = generatedBattleIntroVisualPhase(
    state.elapsed,
    state.sceneAssemblyDisplayLag,
  );
  if (visualPhase !== "trainer-message") return visualPhase;
  if (!isGeneratedBattleIntroInputReady(state)) return "trainer-message";
  return "awaiting-acknowledgement";
}

/**
 * Whether the complete post-slide status-summary/message assembly has reached
 * its last source-owned entrance frame. The text printer becomes input-ready
 * earlier, at its own string-length-derived cursor edge, while the independent
 * `CreatePartyStatusSummarySprites` callbacks keep moving. All fourteen
 * summary sprites first have `x2 == 0` at `BALL_WIDGETS_SETTLED_TICK`; the
 * following callbacks are the unbounded `PAUSE_UNTIL_PRESS` hold.
 *
 * This is deliberately orthogonal to `factoryBattleStartIntroPhase`: input is
 * accepted as soon as the printer is ready and is never delayed for a visual
 * sprite callback.
 */
export function factoryBattleStartStatusSummaryMessageComplete(
  state: FactoryBattleStartIntroState,
): boolean {
  return generatedBattleIntroSourceClock(
    state.elapsed,
    state.sceneAssemblyDisplayLag,
  ) >= BALL_WIDGETS_SETTLED_TICK;
}

/** Source-complete accepted-A handoff through opponent-summary sprite destroy. */
export function factoryBattleStartPostAcknowledgementComplete(
  state: FactoryBattleStartIntroState,
): boolean {
  return generatedBattleStartPostAcknowledgementComplete(state);
}

export function advanceFactoryBattleStartIntro(
  state: FactoryBattleStartIntroState,
  newKeys: ReadonlySet<GbaButton> = new Set(),
): FactoryBattleStartIntroState {
  const acknowledgedElapsed =
    state.acknowledgedElapsed
    ?? (
      (newKeys.has("A") || newKeys.has("B")) && isGeneratedBattleIntroInputReady(state)
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
