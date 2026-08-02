/** Canonical PP values for the active Pokémon's four move slots. */
export type CanonicalPlayerPp = readonly [number, number, number, number];

/**
 * Command-boundary facts shared by every completed-resolution handoff.
 *
 * Presentation content and the successor reopen guard are deliberately not
 * part of this slice's value contract. They remain owned by the existing
 * turn adapters until their semantic bridges are introduced.
 */
export type LatestCompletedCommandHandoff = Readonly<{
  playerPp: CanonicalPlayerPp;
  persistedMoveSlot: 0 | 1 | 2 | 3;
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

export type LatestCompletedCommandPpProjection = Readonly<{
  playerPp: CanonicalPlayerPp;
  persistedMoveSlot: LatestCompletedCommandHandoff["persistedMoveSlot"];
}>;

/** Copies adapter-owned facts into an immutable generic receipt. */
export function createLatestCompletedCommandHandoff(
  values: LatestCompletedCommandHandoff,
): LatestCompletedCommandHandoff {
  return Object.freeze({
    playerPp: Object.freeze([...values.playerPp]) as CanonicalPlayerPp,
    persistedMoveSlot: values.persistedMoveSlot,
    nextCommand: Object.freeze({
      redraw: values.nextCommand.redraw,
      input: values.nextCommand.input,
    }),
  });
}

/** Structural readiness gate for the generic completed-command receipt. */
export function isLatestCompletedCommandHandoffReady(
  handoff: LatestCompletedCommandHandoff | null | undefined,
): handoff is LatestCompletedCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}

/**
 * Projects a generic receipt onto an active moveset without consulting a
 * turn-keyed handoff. The receipt stores the canonical active-mon tuple, so
 * its per-slot PP uses are rebased onto the supplied moveset's own maxima.
 * The persisted cursor is carried with the projection because it is the
 * other value consumed at the same next-command boundary.
 */
export function projectLatestCompletedCommandPp(
  maxPp: CanonicalPlayerPp,
  canonicalMaxPp: CanonicalPlayerPp,
  latest: LatestCompletedCommandHandoff | null,
): LatestCompletedCommandPpProjection | null {
  if (latest === null) return null;
  return Object.freeze({
    playerPp: Object.freeze(maxPp.map(
      (maximum, slot) => maximum - (canonicalMaxPp[slot]! - latest.playerPp[slot]!),
    )) as CanonicalPlayerPp,
    persistedMoveSlot: latest.persistedMoveSlot,
  });
}
