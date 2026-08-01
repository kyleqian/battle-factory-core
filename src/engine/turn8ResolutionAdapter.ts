/**
 * Typed predecessor receipt for the next FIGHT command after turn 8.
 *
 * The turn-8 FEATHER_DANCE and BIND staging modules each prove their own move
 * facts, but neither owns the completed combined turn or the settled
 * redraw/input boundary. This receipt therefore publishes the canonical
 * completed-command boundary directly, just as the turn-5 through turn-7
 * handoffs do; it must not be gated on either staged result being present.
 */
import { rentalMoveset } from "./battleSetup.ts";

export type Turn8CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-8 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 8's BIND command. */
  persistedMoveSlot: 1;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 8's completed-command facts independently of its individual
 * move stages. The canonical receipt contains six ROCK_SLIDE uses (turns 1,
 * 3, 4, 5, 6, and 7), turn 2's one DRAGON_BREATH use, and turn 8's first
 * BIND use.
 */
export function resolveTurn8CompletedResolutionNextCommandHandoff(): Turn8CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 6,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 1 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn8NextCommandHandoffReady(
  handoff: Turn8CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn8CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
