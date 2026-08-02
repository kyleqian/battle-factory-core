/**
 * Typed predecessor receipt for the next FIGHT command after turn 7.
 *
 * The turn-7 FEATHER_DANCE and ROCK_SLIDE staging modules each prove their
 * own move facts, but neither owns the completed combined turn or the
 * settled redraw/input boundary. This receipt therefore publishes the
 * canonical completed-command boundary directly, just as the turn-5 and
 * turn-6 handoffs do; it must not be gated on either staged result being
 * present.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";

export type Turn7CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-7 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 7's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 7's completed-command facts independently of its individual
 * move stages. The canonical receipt contains six ROCK_SLIDE uses (turns 1,
 * 3, 4, 5, 6, and 7) and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn7CompletedResolutionNextCommandHandoff(): Turn7CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 6,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Normalizes the legacy turn-7 receipt into the generic command boundary. */
export function resolveTurn7LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    resolveTurn7CompletedResolutionNextCommandHandoff(),
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn7NextCommandHandoffReady(
  handoff: Turn7CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn7CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
