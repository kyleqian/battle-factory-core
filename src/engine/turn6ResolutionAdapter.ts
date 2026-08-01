/**
 * Typed predecessor receipt for the next FIGHT command after turn 6.
 *
 * The turn-6 FEATHER_DANCE and ROCK_SLIDE staging modules each prove their
 * own move facts, but neither owns the completed combined turn or the
 * settled redraw/input boundary. This receipt therefore publishes the
 * canonical completed-command boundary directly, just as turn 5's handoff
 * does; it must not be gated on either staged result being present.
 */
import { rentalMoveset } from "./battleSetup.ts";

export type Turn6CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-6 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 6's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 6's completed-command facts independently of its individual
 * move stages. The canonical receipt contains five ROCK_SLIDE uses (turns 1,
 * 3, 4, 5, and 6) and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn6CompletedResolutionNextCommandHandoff(): Turn6CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 5,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn6NextCommandHandoffReady(
  handoff: Turn6CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn6CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
