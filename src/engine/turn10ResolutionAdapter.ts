/**
 * Typed predecessor receipt for the next FIGHT command after turn 10.
 *
 * The turn-10 move staging remains independent from this completed boundary:
 * this receipt publishes the canonical post-turn facts directly, just as the
 * turn-5 through turn-9 handoffs do. It must not be gated on a turn-10 move
 * staging module.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";

export type Turn10CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-10 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 10's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 10's completed-command facts independently of move staging.
 * The canonical receipt contains eight ROCK_SLIDE uses (turns 1, 3, 4, 5,
 * 6, 7, 9, and 10), turn 8's one BIND use, and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn10CompletedResolutionNextCommandHandoff(): Turn10CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 8,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Normalizes the legacy turn-10 receipt into the generic command boundary. */
export function resolveTurn10LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    resolveTurn10CompletedResolutionNextCommandHandoff(),
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn10NextCommandHandoffReady(
  handoff: Turn10CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn10CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
