/**
 * Typed predecessor receipt for the next FIGHT command after turn 12.
 *
 * The turn-12 ROCK_SLIDE-miss staging remains independent from this completed
 * boundary: this receipt publishes the canonical post-turn facts directly,
 * just as the turn-5 through turn-11 handoffs do. It must not reuse the
 * post-DRAGON_BREATH turn-13 handoff, which belongs one command later.
 */
import { rentalMoveset } from "./battleSetup.ts";

export type Turn12CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-12 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 12's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 12's completed-command facts independently of move staging.
 * The canonical receipt contains ten ROCK_SLIDE uses (turns 1, 3, 4, 5, 6,
 * 7, 9, 10, 11, and 12); turn 12's miss still consumes PP. It also contains
 * turn 8's one BIND use and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn12CompletedResolutionNextCommandHandoff(): Turn12CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 10,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn12NextCommandHandoffReady(
  handoff: Turn12CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn12CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
