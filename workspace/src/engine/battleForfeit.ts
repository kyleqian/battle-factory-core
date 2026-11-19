import {
  FORFEIT_MESSAGE_END_AT,
  FORFEIT_MESSAGE_TEXT,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import { createBattleCommandPresentationRenderView } from "./battleCommandPresentationRender.ts";
import type { BattleResolutionPresentationRenderView } from "./battleResolutionPresentationRender.ts";
import type { BattleJsonObject, BattleState } from "./battleDecisionBoundary.ts";

/** lbw7: the forfeit's post-battle black / room / black tail runs one tick ahead of the WIN-measured postwin boundaries (`lbra-forfeit-off` 304-362: room 56..94, Lobby field from terminal age 114). */
export const FORFEIT_RETURN_TAIL_LEAD = 1;

/** True once the forfeit message has run its ROM span and the battle must end. */
export function battleForfeitMessageDone(
  presentation: BattleCommandPresentationState,
): boolean {
  return presentation.lifecycle.phase === "forfeit-message"
    && presentation.lifecycle.phaseElapsed >= FORFEIT_MESSAGE_END_AT;
}

/**
 * `HandleEndTurn_RanFromBattle` sets B_OUTCOME_FORFEITED; the Factory room
 * script treats every non-WON result as `WarpToLobbyLost`, exactly like a loss.
 * No RNG is consumed (`HandleAction_Run`/`TryRunFromBattle` never call Random).
 */
export function forfeitTerminalBattle<Rules extends BattleJsonObject>(
  battle: BattleState<Rules>,
): BattleState<Rules> {
  return Object.freeze({
    ...battle,
    boundary: Object.freeze({ kind: "terminal" as const, outcome: "trainer-win" as const }),
  });
}

/** The scene the return fade freezes: field plus the fully typed forfeit message. */
export function forfeitFrozenSceneView(
  presentation: BattleCommandPresentationState,
): BattleResolutionPresentationRenderView {
  const view = createBattleCommandPresentationRenderView(presentation);
  return Object.freeze({
    field: view.field as unknown as BattleResolutionPresentationRenderView["field"],
    fieldArt: view.fieldArt,
    healthboxes: view.healthboxes,
    message: Object.freeze({
      lines: Object.freeze([FORFEIT_MESSAGE_TEXT]),
      visibleCharacters: FORFEIT_MESSAGE_TEXT.length,
    }),
    effect: null,
    visibility: Object.freeze({
      player: Object.freeze({ sprite: view.spriteVisibility.player, healthbox: true }),
      opponent: Object.freeze({ sprite: view.spriteVisibility.opponent, healthbox: true }),
    }),
    waitCursor: null,
    bottom: "message" as const,
    confirmHandoff: null,
    switchIn: null,
    midBattleSwitchIn: null,
    switchOut: null,
    partySummary: null,
    midBattleSwitchFade: null,
    midBattleSwitchParticles: null,
    trainerSlide: null,
  });
}

/**
 * ROM lab: the forfeit's lobby return (fade-in, loss pages) runs one frame
 * ahead of the loss path's clock measured from the fade start.
 */
export function advanceForfeitTerminalAge<T extends Readonly<{ age: number }>>(terminal: T): T {
  return Object.freeze({ ...terminal, age: terminal.age + 1 });
}

/** A forfeit sets `disableRecordBattle` (battle_main.c:5062): the Lobby never asks the record question. */
export function disableForfeitRecordQuestion<T extends Readonly<{ recordDisabled: boolean }>>(
  terminal: T,
): T {
  return Object.freeze({ ...terminal, recordDisabled: true });
}
