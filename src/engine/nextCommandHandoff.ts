import {
  createFightCommandPresentation,
  type FightCommandPresentationEpoch,
  type FightCommandPresentation,
} from "./fightCommandPresentation.ts";
import type { GbaButton } from "../input.ts";
import type { BattleSceneResolutionOwner } from "./battleSceneResolutionOwner.ts";

/** Canonical PP values for the active Pokémon's four move slots. */
export type CanonicalPlayerPp = readonly [number, number, number, number];

/**
 * Command-boundary facts shared by every completed-resolution handoff.
 *
 * `content` is optional while the bridge is migrating in bounded source
 * ranges. Its absence means no semantic renderer route exists yet; it never
 * asks a consumer to infer that route from PP or a completed-turn identity.
 */
export type LatestCompletedCommandHandoff = Readonly<{
  playerPp: CanonicalPlayerPp;
  persistedMoveSlot: 0 | 1 | 2 | 3;
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
  content?: FightCommandPresentation;
  /**
   * The source-owned edge which may reopen the following command.  Adapters
   * publish the immutable receipt/content first; core installs this bridge
   * when it links the real 5-13 command sequence.  Keeping it optional
   * preserves the staged adapter ABI while ensuring every live generic owner
   * carries a concrete guard before it reaches production dispatch.
   */
  reopenGuard?: NextCommandReopenGuard;
}>;

/**
 * A completed command's semantic reopen edge.  There is deliberately no
 * turn, PP, or episode member here: readiness is expressed only in terms of
 * the accepted FIGHT confirmation, an optional source-owned continuation,
 * and (for retained actions) the actual active resolution segment.
 */
export type NextCommandReopenGuard = Readonly<{
  /** Minimum source-owned elapsed frames after the accepted move confirm. */
  minimumConfirmElapsed: number;
  /** Optional automatic-opponent-switch continuation gate. */
  minimumOpponentFaintContinuationElapsed?: number;
  /** Optional retained command segment that must still be the active one. */
  requiredActiveResolutionSegment?: BattleSceneResolutionOwner["resolution"]["segments"][number];
  /**
   * The next immutable receipt/owner pair.  An omitted handoff intentionally
   * retains the current generic receipt for a retained-action continuation.
   */
  successor: Readonly<{
    handoff?: LatestCompletedCommandHandoff;
    resolutionOwner?: BattleSceneResolutionOwner;
  }>;
}>;

export type NextCommandReopenTransition = Readonly<{
  /** `null` means retain the current receipt through a locked continuation. */
  handoff: LatestCompletedCommandHandoff | null;
  resolutionOwner: BattleSceneResolutionOwner | null;
}>;

export type NextCommandReopenSubmenu = Readonly<{
  confirmElapsed: number | null;
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
    ...(values.content === undefined
      ? {}
      : { content: createFightCommandPresentation(values.content) }),
  });
}

/** Freezes a semantic reopen edge together with its already-built successor. */
export function createNextCommandReopenGuard(
  values: NextCommandReopenGuard,
): NextCommandReopenGuard {
  return Object.freeze({
    minimumConfirmElapsed: values.minimumConfirmElapsed,
    ...(values.minimumOpponentFaintContinuationElapsed === undefined
      ? {}
      : {
        minimumOpponentFaintContinuationElapsed:
          values.minimumOpponentFaintContinuationElapsed,
      }),
    ...(values.requiredActiveResolutionSegment === undefined
      ? {}
      : { requiredActiveResolutionSegment: values.requiredActiveResolutionSegment }),
    successor: Object.freeze({
      ...(values.successor.handoff === undefined
        ? {}
        : { handoff: values.successor.handoff }),
      ...(values.successor.resolutionOwner === undefined
        ? {}
        : { resolutionOwner: values.successor.resolutionOwner }),
    }),
  });
}

/** Attaches a source-owned reopen edge without changing the frozen receipt data. */
export function withNextCommandReopenGuard(
  handoff: LatestCompletedCommandHandoff,
  reopenGuard: NextCommandReopenGuard,
): LatestCompletedCommandHandoff {
  return Object.freeze({ ...handoff, reopenGuard });
}

/**
 * Consumes one generic reopen edge.  The result installs both successor
 * receipt and resolution owner atomically; no caller needs to discover a
 * successor by inspecting a turn field or a PP tuple.
 */
export function consumeNextCommandReopenGuard(
  reopenGuard: NextCommandReopenGuard,
  resolutionOwner: BattleSceneResolutionOwner | null,
  fightSubmenu: NextCommandReopenSubmenu,
  newKeys: ReadonlySet<GbaButton>,
  elapsed: number,
  opponentFaintContinuationElapsed: number | null = null,
): NextCommandReopenTransition | null {
  const confirmElapsed = fightSubmenu.confirmElapsed;
  if (
    !newKeys.has("A")
    || confirmElapsed === null
    || elapsed < confirmElapsed + reopenGuard.minimumConfirmElapsed
  ) {
    return null;
  }
  const continuationMinimum = reopenGuard.minimumOpponentFaintContinuationElapsed;
  if (
    continuationMinimum !== undefined
    && (opponentFaintContinuationElapsed === null
      || opponentFaintContinuationElapsed < continuationMinimum)
  ) {
    return null;
  }
  const requiredSegment = reopenGuard.requiredActiveResolutionSegment;
  if (
    requiredSegment !== undefined
    && resolutionOwner?.resolution.segments[resolutionOwner.resolution.segmentIndex]
      !== requiredSegment
  ) {
    return null;
  }
  return Object.freeze({
    handoff: reopenGuard.successor.handoff ?? null,
    resolutionOwner: reopenGuard.successor.resolutionOwner ?? resolutionOwner,
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
 * Narrows the generic receipt to the contentful early-boundary form.  Epoch
 * presence is semantic presentation data, never a proxy for a completed-turn
 * number or a PP tuple.
 */
export function latestCompletedCommandPresentationEpoch(
  handoff: LatestCompletedCommandHandoff | null | undefined,
): FightCommandPresentationEpoch | null {
  return handoff?.content?.presentationEpoch ?? null;
}

/**
 * The later FIGHT lifecycle begins after the source-owned reset edge.  A
 * same-turn B-close/A-reopen supplies a new UI open elapsed but deliberately
 * continues to consume the same immutable content epoch.
 */
export function isLatestCompletedCommandLifecycleActive(
  handoff: LatestCompletedCommandHandoff | null | undefined,
  openElapsed: number | null,
): handoff is LatestCompletedCommandHandoff {
  const epoch = latestCompletedCommandPresentationEpoch(handoff);
  return isLatestCompletedCommandHandoffReady(handoff)
    && epoch !== null
    && openElapsed !== null
    && openElapsed > epoch.elapsed;
}

/** Runtime-relative age of a semantic presentation epoch, if this receipt owns one. */
export function latestCompletedCommandPresentationEpochElapsedSinceReset(
  handoff: LatestCompletedCommandHandoff | null | undefined,
  currentElapsed: number,
): number | null {
  const epoch = latestCompletedCommandPresentationEpoch(handoff);
  return epoch === null ? null : currentElapsed - epoch.elapsed;
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
