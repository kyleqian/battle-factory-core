import {
  resolveTurn13ResolutionAdapter,
  resolveTurn13SwitchInAdapter,
  type Turn13ResolutionAdapter,
  type Turn13SwitchInAdapter,
} from "./turn13ResolutionAdapter.ts";

/**
 * The accepted A edge that dismisses an opponent-faint text controller.
 *
 * This deliberately carries the two presentation consequences together:
 * the visible cursor freezes at the accepted edge and the automatic
 * opponent replacement starts from that same edge.  `acceptedElapsed` is in
 * the battle-scene clock, never a canonical trace tick.
 */
export type OpponentFaintDismissEdge = Readonly<{
  acceptedElapsed: number;
  input: "accepted";
  cursor: Readonly<{
    mode: "frozen";
    frozenAtElapsed: number;
  }>;
  continuation: Readonly<{
    kind: "automatic-opponent-switch-in";
    startedAtElapsed: number;
  }>;
}>;

/**
 * The nonterminal presentation owner for PIDGEOTTO's faint and DESTIN's
 * automatic MURKROW replacement.  The turn-13 adapter remains authority for
 * immutable battle facts; this owner owns only the live controller edge and
 * its presentation consequences.
 */
export type OpponentFaintPresentationOwner = Readonly<{
  resolution: Turn13ResolutionAdapter;
  switchIn: Turn13SwitchInAdapter;
  faintText: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
  dismiss: OpponentFaintDismissEdge | null;
}>;

/** Publishes the owner only once the faint-text controller is input-ready. */
export function createOpponentFaintPresentationOwner(): OpponentFaintPresentationOwner {
  return Object.freeze({
    resolution: resolveTurn13ResolutionAdapter(),
    switchIn: resolveTurn13SwitchInAdapter(),
    faintText: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
    dismiss: null,
  });
}

/**
 * Accepts one fresh A edge.  The cursor and automatic switch-in continuation
 * are published atomically, so callers cannot retain either as a loose clock.
 */
export function storeOpponentFaintDismiss(
  owner: OpponentFaintPresentationOwner,
  acceptedElapsed: number,
): OpponentFaintPresentationOwner {
  if (
    owner.dismiss !== null
    || owner.faintText.redraw !== "settled"
    || owner.faintText.input !== "ready"
  ) {
    return owner;
  }
  const dismiss = Object.freeze({
    acceptedElapsed,
    input: "accepted" as const,
    cursor: Object.freeze({
      mode: "frozen" as const,
      frozenAtElapsed: acceptedElapsed,
    }),
    continuation: Object.freeze({
      kind: "automatic-opponent-switch-in" as const,
      startedAtElapsed: acceptedElapsed,
    }),
  });
  return Object.freeze({ ...owner, dismiss });
}

/** The continuation's sole local clock, null until the accepted edge exists. */
export function opponentFaintContinuationElapsed(
  owner: OpponentFaintPresentationOwner | null | undefined,
  sceneElapsed: number,
): number | null {
  const dismiss = owner?.dismiss;
  return dismiss === null || dismiss === undefined
    ? null
    : sceneElapsed - dismiss.continuation.startedAtElapsed;
}
