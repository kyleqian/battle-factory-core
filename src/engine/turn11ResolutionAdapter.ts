/**
 * Typed predecessor receipt for the next FIGHT command after turn 11.
 *
 * The turn-11 opponent-move staging remains independent from this completed
 * boundary: this receipt publishes the canonical post-turn facts directly,
 * just as the turn-5 through turn-10 handoffs do. It must not be gated on
 * `turn11FeatherDancePresentationStaging.ts`.
 */
import { rentalMoveset } from "./battleSetup.ts";

export type Turn11CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-11 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 11's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 11's completed-command facts independently of move staging.
 * The canonical receipt contains nine ROCK_SLIDE uses (turns 1, 3, 4, 5, 6,
 * 7, 9, 10, and 11), turn 8's one BIND use, and turn 2's one
 * DRAGON_BREATH use.
 */
export function resolveTurn11CompletedResolutionNextCommandHandoff(): Turn11CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 9,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn11NextCommandHandoffReady(
  handoff: Turn11CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn11CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
