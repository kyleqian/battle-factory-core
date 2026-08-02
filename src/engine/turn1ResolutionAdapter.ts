/**
 * Typed completed-turn receipt for the next command after turn 1.
 *
 * Unlike the later three-role receipts, this boundary also owns the field HP
 * and the fresh HandleInputChooseAction/DoBounceEffect presentation epoch.
 * Its elapsed value is the runtime scene clock at the reset event; it is not
 * an oracle capture tick and must not be replaced by the later FIGHT reopen.
 */
import { rentalMoveset } from "./battleSetup.ts";

export type Turn1CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-1 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 1's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** Exact field HP after the completed first turn. */
  hp: Readonly<{ player: number; opponent: number }>;
  /**
   * The fresh source-owned bounce epoch emitted by the first execution of
   * HandleInputChooseAction after the redraw DMA completes.
   */
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
 * Publishes the completed turn-1 facts at the modeled choose-action reset.
 * Callers supply the current engine elapsed value exactly when
 * HandleInputChooseAction runs DoBounceEffect; a later A that reopens FIGHT
 * only consumes this immutable receipt.
 */
export function resolveTurn1CompletedResolutionNextCommandHandoff(
  presentationEpochElapsed: number,
): Turn1CompletedResolutionNextCommandHandoff {
  if (!Number.isInteger(presentationEpochElapsed) || presentationEpochElapsed < 0) {
    throw new Error("turn-1 presentation epoch requires a non-negative runtime elapsed value");
  }
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 1,
      bind,
      dragonBreath,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    hp: Object.freeze({ player: 117, opponent: 101 }),
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

/** Typed gate shared by the next-command controller and renderer. */
export function isTurn1NextCommandHandoffReady(
  handoff: Turn1CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn1CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}

/**
 * The following command lifecycle is distinct from receipt publication: the
 * original turn-1 submenu predates the reset, while a later FIGHT open (and
 * any same-turn close/reopen descended from it) consumes the same epoch.
 */
export function isTurn1NextCommandLifecycleActive(
  handoff: Turn1CompletedResolutionNextCommandHandoff | null | undefined,
  openElapsed: number | null,
): handoff is Turn1CompletedResolutionNextCommandHandoff {
  return isTurn1NextCommandHandoffReady(handoff)
    && openElapsed !== null
    && openElapsed > handoff.presentationEpoch.elapsed;
}

/** Runtime-relative age of the fresh DoBounceEffect epoch. */
export function turn1PresentationEpochElapsedSinceReset(
  handoff: Turn1CompletedResolutionNextCommandHandoff,
  currentElapsed: number,
): number {
  return currentElapsed - handoff.presentationEpoch.elapsed;
}
