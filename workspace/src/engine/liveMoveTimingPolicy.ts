/**
 * Faithful-timing policy (D4, docs/faithful-timing.md; ANIMATION_VERIFICATION.md "CPU-load timing integration"). Some source animation
 * programs contain a CPU-phase parameter that battle state does not determine: an optional lag frame (a VBlank overrun, a main-loop
 * iteration that produces no step), or a VBlank write that lands on one of two rows. The live renderer ships ONE deterministic phase per
 * parameter: the DOMINANT measured phase, i.e. the most frequent across all banked measurements of that parameter. A tie picks the phase
 * WITHOUT the optional event (the source iteration count).
 *
 * The table is fixed, global and presentation-owned: no gameplay state, no RNG, no capture/corpus row, no species. Rendering stays pure,
 * and replay/reset can never select a different phase, so the policy version lives in evidence and documentation (the session export
 * stores nothing: there is no per-battle choice to persist). Adapters consuming this module are counted in the separate "faithful timing"
 * bucket (`docs/animation-integration-live-status.json` faithfulTimingAdapters), never as scoped exact.
 */

export const LIVE_MOVE_TIMING_POLICY_VERSION = "live-move-timing.v1.dominant-measured-phase.tie-no-optional-event" as const;

export type LiveMoveTimingParameterKind = "optional-lag-age" | "bg-write-row" | "palette-transfer-row";
/** "event" = the optional lag frame / late write happens; "no-event" = it does not (the source iteration count). */
export type LiveMoveTimingPhase = "event" | "no-event";

export type LiveMoveTimingAlternative = Readonly<{
  phase: LiveMoveTimingPhase;
  /** Body rows (activation .. first inactive) in this phase. */
  bodyRows: number;
  /** Banked measurements of this phase (scenarios), all sources together. */
  measured: number;
}>;

export type LiveMoveTimingParameter = Readonly<{
  kind: LiveMoveTimingParameterKind;
  /** Body age at which the optional event occurs (the fixed lags are part of the source program, not of the policy). */
  age: number;
  /** Fixed (always present) lag ages of the body, for the record. */
  fixedLagAges: readonly number[];
  /** Constant main-loop iteration count across all measurements. */
  iterations: number;
  alternatives: readonly [LiveMoveTimingAlternative, LiveMoveTimingAlternative];
  chosen: LiveMoveTimingPhase;
  /** True when the measured counts tie and the tie rule (no optional event) chose the phase. */
  tieRuleUsed: boolean;
  evidence: readonly string[];
}>;

export type LiveMoveTimingEntry = Readonly<{ move: string; parameters: readonly LiveMoveTimingParameter[] }>;

/** The dominant phase: the most measured alternative; a tie selects "no-event" (the source iteration count). */
export function dominantLiveMoveTimingPhase(alternatives: readonly LiveMoveTimingAlternative[]): { phase: LiveMoveTimingPhase; tie: boolean } {
  const event = alternatives.filter((a) => a.phase === "event").reduce((n, a) => n + a.measured, 0);
  const none = alternatives.filter((a) => a.phase === "no-event").reduce((n, a) => n + a.measured, 0);
  return event === none ? { phase: "no-event", tie: true } : { phase: event > none ? "event" : "no-event", tie: false };
}

const LAG_EVIDENCE = "tools/integration/fixtures/prep25/lag-frames.json";
const TIEBREAK_EVIDENCE = "tools/integration/fixtures/d4a/lag-frames-tiebreak.json";

/**
 * Per-move CPU-phase parameters. Mach Punch / Nightmare: prep25 measured 2 of 4 scenarios with the optional lag (a tie); the D4a tie-break
 * (4 more scenarios each, same method `prep25LagFrames.py`) measured 3 of 4 with it, so the dominant phase is the lag (5 of 8).
 */
export const LIVE_MOVE_TIMING_POLICY: Readonly<Record<number, LiveMoveTimingEntry>> = Object.freeze({
  183: {
    move: "MOVE_MACH_PUNCH",
    parameters: [{
      kind: "optional-lag-age", age: 91, fixedLagAges: [71, 72], iterations: 107,
      alternatives: [{ phase: "event", bodyRows: 110, measured: 5 }, { phase: "no-event", bodyRows: 109, measured: 3 }],
      chosen: "event", tieRuleUsed: false,
      evidence: [`${LAG_EVIDENCE} mach-punch (2 of 4)`, `${TIEBREAK_EVIDENCE} mach-punch (3 of 4)`, "docs/next-adapters-prep25.md s0.1 item 3"],
    }],
  },
  171: {
    move: "MOVE_NIGHTMARE",
    parameters: [{
      kind: "optional-lag-age", age: 149, fixedLagAges: [21, 129, 130], iterations: 164,
      alternatives: [{ phase: "event", bodyRows: 168, measured: 5 }, { phase: "no-event", bodyRows: 167, measured: 3 }],
      chosen: "event", tieRuleUsed: false,
      evidence: [`${LAG_EVIDENCE} nightmare (2 of 4)`, `${TIEBREAK_EVIDENCE} nightmare (3 of 4)`, "docs/next-adapters-prep25.md s0.1 item 3"],
    }],
  },
});

/** The policy parameter of a move, or null when the move has no D4 timing parameter of that kind. */
export function liveMoveTimingParameter(moveId: number, kind: LiveMoveTimingParameterKind): LiveMoveTimingParameter | null {
  return LIVE_MOVE_TIMING_POLICY[moveId]?.parameters.find((p) => p.kind === kind) ?? null;
}

/** The chosen optional lag age (the lag is rendered), or null when the chosen phase has no optional lag / the move has none. */
export function liveMoveOptionalLagAge(moveId: number): number | null {
  const p = liveMoveTimingParameter(moveId, "optional-lag-age");
  return p !== null && p.chosen === "event" ? p.age : null;
}

/** Body rows in the chosen phase of the move's optional-lag parameter (null without one). */
export function liveMoveTimingBodyRows(moveId: number): number | null {
  const p = liveMoveTimingParameter(moveId, "optional-lag-age");
  return p === null ? null : p.alternatives.find((a) => a.phase === p.chosen)!.bodyRows;
}

/** Production faithful-timing consumers (disjoint from LIVE_MOVE_ANIMATION_IDS and the faithful-random list). */
export const LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS: readonly number[] = Object.freeze([
  // D4a: Mach Punch first body (liveQ2Moves.ts liveMachPunchInputs; fixtures tools/integration/fixtures/d4a-live).
  183,
]);
