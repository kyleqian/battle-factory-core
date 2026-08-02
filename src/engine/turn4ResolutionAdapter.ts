/**
 * Typed completed-turn receipt for the next command after turn 4.
 *
 * The receipt is published by the source-owned
 * HandleInputChooseAction/DoBounceEffect reset. Its epoch belongs to the
 * completed turn, while the later turn-5 FIGHT open (and any B-close/A-reopen
 * descended from it) only consumes that immutable epoch.
 */
import { rentalMoveset } from "./battleSetup.ts";

export type Turn4CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-4 PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 4's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** Exact field HP after the completed fourth turn. */
  hp: Readonly<{ player: number; opponent: number }>;
  /** Fresh source-owned bounce epoch at the first next-action controller tick. */
  presentationEpoch: Readonly<{
    owner: "HandleInputChooseAction";
    reset: "DoBounceEffect";
    /** Runtime-relative battle-scene elapsed value at the reset event. */
    elapsed: number;
    mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>;
    healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }>;
  }>;
  /** The next action-menu redraw is visible and may consume input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes completed turn-4 facts at the modeled choose-action reset.
 * A later A which opens FIGHT for turn 5 must not recreate or re-anchor it.
 */
export function resolveTurn4CompletedResolutionNextCommandHandoff(
  presentationEpochElapsed: number,
): Turn4CompletedResolutionNextCommandHandoff {
  if (!Number.isInteger(presentationEpochElapsed) || presentationEpochElapsed < 0) {
    throw new Error("turn-4 presentation epoch requires a non-negative runtime elapsed value");
  }
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 3,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    hp: Object.freeze({ player: 88, opponent: 1 }),
    presentationEpoch: Object.freeze({
      owner: "HandleInputChooseAction" as const,
      reset: "DoBounceEffect" as const,
      elapsed: presentationEpochElapsed,
      mon: Object.freeze({ seed: 192 as const, delta: 7 as const, amplitude: 1 as const }),
      healthbox: Object.freeze({ seed: 128 as const, delta: 7 as const, amplitude: 1 as const }),
    }),
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Typed gate shared by the turn-5 controller and presentation readers. */
export function isTurn4NextCommandHandoffReady(
  handoff: Turn4CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn4CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}

/**
 * The original turn-4 submenu predates this reset. Only a later turn-5
 * command lifecycle can consume its epoch, including same-turn reopens.
 */
export function isTurn4NextCommandLifecycleActive(
  handoff: Turn4CompletedResolutionNextCommandHandoff | null | undefined,
  openElapsed: number | null,
): handoff is Turn4CompletedResolutionNextCommandHandoff {
  return isTurn4NextCommandHandoffReady(handoff)
    && openElapsed !== null
    && openElapsed > handoff.presentationEpoch.elapsed;
}

/** Runtime-relative age of the fresh DoBounceEffect epoch. */
export function turn4PresentationEpochElapsedSinceReset(
  handoff: Turn4CompletedResolutionNextCommandHandoff,
  currentElapsed: number,
): number {
  return currentElapsed - handoff.presentationEpoch.elapsed;
}
