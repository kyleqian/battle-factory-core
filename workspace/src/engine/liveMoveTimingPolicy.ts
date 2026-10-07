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

export type LiveMoveTimingParameterKind = "optional-lag-age" | "bg-write-row" | "palette-transfer-row" | "scanline-split-line";
/**
 * "event" = the optional lag frame / late write happens; "no-event" = it does not (the source iteration count). Per kind:
 * - optional-lag-age: "event" = the optional lag frame at `age` is present (one more body row).
 * - bg-write-row: "event" = the LATER of the two write rows (`age`; the slower-CPU phase), "no-event" = the earlier row (`age - 1`).
 *   A tie therefore selects the earlier write row.
 * - palette-transfer-row: "event" = the later transfer row.
 * - scanline-split-line: a main-loop write of BOTH scanline buffers lands while the frame is scanned out; "event" = the write lands below the
 *   top of the distortion window (lines above the beam still show the previous row's values), "no-event" = before the window (split line
 *   S = 0: the displayed buffer is the written one).
 */
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
  /** Body age at which the optional event occurs (bg-write-row: the later write row; the fixed lags are part of the source program). */
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
  /** Attacker side this parameter applies to (absent = both sides): a phase measured per side (Superpower's monbg write row). */
  side?: "player" | "opponent";
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
const PREP24_EVIDENCE = "tools/integration/prep24MegahornCheck.ts phaseOf";
const D4B_EVIDENCE = "tools/integration/fixtures/d4a-live/megahorn-extra-*.json";

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
    }, {
      // prep32 s1.4: the Task_FadeToBg restore iteration that reloads the battle BG palette (bank 2) completes before the row-148 VBlank or
      // not: restore row 149 (accepted P / O, d4a HAUNTER -> SNORLAX P / O) or 148 (prep25 GENGAR -> GOLEM P / O, d4a GENGAR -> GOLBAT P / O),
      // a 4:4 tie -> the earlier row. Display-neutral: BLDY 16 on rows 146..150 darkens the restored bank to black in both phases (moves only
      // the hidden palette rows and the Task_FadeToBg state word on row 148).
      kind: "palette-transfer-row", age: 149, fixedLagAges: [], iterations: 164,
      alternatives: [{ phase: "event", bodyRows: 168, measured: 4 }, { phase: "no-event", bodyRows: 168, measured: 4 }],
      chosen: "no-event", tieRuleUsed: true,
      evidence: ["tools/integration/fixtures/prep32/nightmare-check.json windows[].phase.restoreRow (149: 4, 148: 4)", "docs/next-adapters-prep32.md s1.4"],
    }],
  },
  /**
   * D4b Megahorn (docs/next-adapters-prep24.md s0.2 H / s1.3: 6 windows accepted P/O, HERACROSS -> GOLEM P/O, HERACROSS -> ONIX P/O; the D4b
   * tie-break: 4 more windows chosen before probing, RHYDON -> GOLBAT and NIDOKING -> SNORLAX both orientations, tools/integration/d4aScenarios.py,
   * measured by the same prep22 probe from each scenario's own activation, tools/integration/fixtures/d4a-live/megahorn-*.json).
   * (a) the final restorebg fade (Task_FadeToBg after LoadDefaultBg) ends one row late in 9 of 10 windows (accepted opponent early):
   *     an optional lag before the LoadDefaultBg row 156 -> 177 body rows (176 without). (b) the monbg BGnCNT write lands on row 8 in 7 of
   *     10 windows (accP, accO, onO + all four tie-break windows) and on row 7 in 3 (altP, altO, onP; prep24 alone was a 3:3 tie). With row 7
   *     MoveBattlerSpriteToBG also writes that row's BG scroll; the MEGAHORN renderer branch reads no BGnCNT and draws the monbg target only
   *     once the target OBJ is disabled (row 9), so (b) is pixel-neutral (row-7 windows are 0 px under the row-8 policy).
   */
  224: {
    move: "MOVE_MEGAHORN",
    parameters: [{
      kind: "optional-lag-age", age: 156, fixedLagAges: [], iterations: 176,
      alternatives: [{ phase: "event", bodyRows: 177, measured: 9 }, { phase: "no-event", bodyRows: 176, measured: 1 }],
      chosen: "event", tieRuleUsed: false,
      evidence: [`${PREP24_EVIDENCE} phase.endLate (5 of 6 late)`, `${D4B_EVIDENCE} probe end - start + 1 (4 of 4 late)`,
        "docs/next-adapters-prep24.md s0.1 negative control (16 fade rows 158..173, 17.5k px each)"],
    }, {
      kind: "bg-write-row", age: 8, fixedLagAges: [], iterations: 176,
      alternatives: [{ phase: "event", bodyRows: 177, measured: 7 }, { phase: "no-event", bodyRows: 177, measured: 3 }],
      chosen: "event", tieRuleUsed: false,
      evidence: [`${PREP24_EVIDENCE} phase.monbgCntRow (row 8: accP, accO, onO; row 7: altP, altO, onP)`,
        `${D4B_EVIDENCE} monbgCntRow from the probe regEvents (row 8 in 4 of 4)`, "docs/next-adapters-prep24.md s1.3"],
    }],
  },
  /**
   * D4b Revenge (docs/next-adapters-prep26.md s2.4): the monbg BGnCNT write lands on row 5 (accepted player, MACHOKE -> GOLEM player and opponent)
   * or 4 (accepted opponent; with row 4 MoveBattlerSpriteToBG also writes that row's BG scroll): row 5 dominant, 3 of 4. The body length (145
   * rows) and the blend-cycle arm rows [21, 34, 46, 58] (a measured constant) are equal in every window.
   */
  279: {
    move: "MOVE_REVENGE",
    parameters: [{
      kind: "bg-write-row", age: 5, fixedLagAges: [], iterations: 145,
      alternatives: [{ phase: "event", bodyRows: 145, measured: 5 }, { phase: "no-event", bodyRows: 145, measured: 1 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/prep26RevengeCheck.ts knownFor phase.monbgCntRow (row 5: accP, altP, altO; row 4: accO)", "docs/next-adapters-prep26.md s2.4"],
    }],
  },
  /**
   * D4 Superpower (docs/next-adapters-prep31.md s1.4 T; tools/integration/fixtures/prep31/superpower-*.json): the monbg BGnCNT / HOFS write row
   * (first HOFS change) is 10 or 11, a CPU phase, measured PER SIDE (the reducer's monbg gate superpower.ts:75 is player >= 10, opponent >= 11):
   * player {10: 2 (accepted NIDOQUEEN, prep31 MACHAMP -> WEEZING), 11: 1 (prep25 MACHAMP -> GOLEM)}, opponent {11: 3}. 248 rows in every
   * window. Wrong phase: row 10 only (the monbg copy one row before the ROM moves the attacker to the BG).
   */
  276: {
    move: "MOVE_SUPERPOWER",
    parameters: [{
      kind: "bg-write-row", age: 11, fixedLagAges: [], iterations: 248, side: "player",
      alternatives: [{ phase: "event", bodyRows: 248, measured: 1 }, { phase: "no-event", bodyRows: 248, measured: 2 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/prep31SuperpowerCheck.ts knownFor phase.monbgCntRow (player: row 10 accepted, prep31 alt; row 11 prep25 alt)", "docs/next-adapters-prep31.md s1.4"],
    }, {
      kind: "bg-write-row", age: 11, fixedLagAges: [], iterations: 248, side: "opponent",
      alternatives: [{ phase: "event", bodyRows: 248, measured: 3 }, { phase: "no-event", bodyRows: 248, measured: 0 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/prep31SuperpowerCheck.ts knownFor phase.monbgCntRow (opponent: row 11 accepted, prep25 alt, prep31 alt)", "docs/next-adapters-prep31.md s1.4"],
    }],
  },
  /**
   * D4c Psywave (docs/next-adapters-prep30.md s0.2 T / s2.5; tools/integration/fixtures/prep30/psywave-check.json): an optional lag at task
   * row 185 (Fade 2's VRAM restore row 184, palette restore 185, registers >= 187 one row later): present in 4 of 6 measured windows (accepted
   * player / opponent, ALAKAZAM -> GOLEM player, ESPEON -> CROBAT player), absent in ALAKAZAM -> GOLEM opponent and ESPEON -> CROBAT opponent.
   * Window rows (activation .. first inactive, inclusive) 205 with the lag, 204 without. Wrong phase moves rows 186..201 + the final row.
   */
  149: {
    move: "MOVE_PSYWAVE",
    parameters: [{
      kind: "optional-lag-age", age: 185, fixedLagAges: [], iterations: 204,
      alternatives: [{ phase: "event", bodyRows: 205, measured: 4 }, { phase: "no-event", bodyRows: 204, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep30/psywave-check.json phase.measured (4 of 6 lag)", "docs/next-adapters-prep30.md s2.5",
        "tools/integration/fixtures/d4a-live/psywave-*.json (D4c: the same 6 windows re-probed fresh)"],
    }],
  },
  /**
   * D4c Extrasensory (docs/next-adapters-prep30.md s0.2 T / s1.4 / s1.5; tools/integration/fixtures/prep30/extrasensory-{check,pixels,split}.json):
   * (1) an optional lag at task row 142 (restore Fade 2: data[10] stays 2 on row 141, BG palette restore 142, registers >= 143 one row later): absent
   * in 4 of 6 measured windows (accepted player / opponent, ALAKAZAM -> GOLEM player, ESPEON -> CROBAT opponent) -> 161 rows; wrong phase moves rows
   * 143..158. (2) the distortion task rewrites both scanline buffers during the main loop: for the opponent-target ALAKAZAM -> GOLEM and ESPEON ->
   * CROBAT player windows the write lands inside the target's lines (no constant split line is exact: prep30 split sweep); the other 4 windows are
   * exact at S = 0 (the written buffer; the reducer's source-fitted stage-2 row stays). Body rows are independent of the split.
   */
  326: {
    move: "MOVE_EXTRASENSORY",
    parameters: [{
      kind: "optional-lag-age", age: 142, fixedLagAges: [122, 123], iterations: 161,
      alternatives: [{ phase: "event", bodyRows: 162, measured: 2 }, { phase: "no-event", bodyRows: 161, measured: 4 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep30/extrasensory-check.json phase.measured (2 of 6 lag)", "docs/next-adapters-prep30.md s1.5",
        "tools/integration/fixtures/d4a-live/extrasensory-*.json (D4c: the same 6 windows re-probed fresh)"],
    }, {
      kind: "scanline-split-line", age: 0, fixedLagAges: [], iterations: 161,
      alternatives: [{ phase: "event", bodyRows: 161, measured: 2 }, { phase: "no-event", bodyRows: 161, measured: 4 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep30/extrasensory-split.json (S = 0..36 sweep)", "tools/integration/fixtures/prep30/extrasensory-pixels.json",
        "docs/next-adapters-prep30.md s1.4"],
    }],
  },
  /**
   * D4b Meteor Mash (docs/next-adapters-prep17.md s0.1; tools/integration/fixtures/prep17/meteor-mash-tail-receipt.json): restorebg's
   * LoadDefaultBg frame (row 193) skips the main-loop iteration of row 195 in 4 of 5 measured bodies (accepted opponent, prep12 SHIFTRY ->
   * GOLEM, A2 METANG -> GOLEM, A3 GOLEM -> SHIFTRY; the accepted player METANG -> ONIX body does not lag): first inactive age 213 + L,
   * fade-down first row 196 + L. Window rows (activation .. first inactive, inclusive) 215 with the lag, 214 without. Also D3 (Random2 twinkles).
   */
  309: {
    move: "MOVE_METEOR_MASH",
    parameters: [{
      kind: "optional-lag-age", age: 195, fixedLagAges: [], iterations: 214,
      alternatives: [{ phase: "event", bodyRows: 215, measured: 5 }, { phase: "no-event", bodyRows: 214, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep17/meteor-mash-tail-receipt.json (4 of 5 lag at row 195)", "docs/next-adapters-prep17.md s0.1",
        "tools/integration/fixtures/d4a-live/meteor-mash-extra-*.json (D4b METAGROSS -> GOLBAT: opponent lag, player no lag)"],
    }],
  },
  /**
   * S10A Ice Ball (docs/next-adapters-prep26.md s1.4 H / s4 item 6; tools/integration/fixtures/prep26/iceball-check.json lagRows): 0-step lag rows
   * (an animationRng stall: VBlank overrun) in 3 of 18 measured counter bodies (accepted player body 4 row 38, accepted bodies 5 row 112 both
   * sides), none in the other 15 (accepted bodies 1..3, accepted opponent body 4, every GLALIE -> GOLEM / REGISTEEL alternate body): the
   * dominant phase is no lag. `age` / bodyRows are the counter 0..3 values (counter 4: lag age 112, 132 / 131 rows). A lag row repeats the
   * previous hardware OAM, holds the sprites and moves the task step one row earlier: a lag window under this policy differs on one row of
   * the shake / fade. Only the counter-0 body ships live (later counters decline: docs/s10a-random2-order-lend-blocker.md). Also D3 (Random2 shards).
   */
  301: {
    move: "MOVE_ICE_BALL",
    parameters: [{
      kind: "optional-lag-age", age: 38, fixedLagAges: [], iterations: 75,
      alternatives: [{ phase: "event", bodyRows: 77, measured: 3 }, { phase: "no-event", bodyRows: 76, measured: 15 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep26/iceball-check.json lagRows (3 of 18 windows: accepted player b4 [38], accepted b5 [112] x2)",
        "docs/next-adapters-prep26.md s1.4 / s4 item 6"],
    }],
  },
});

/** The chosen write row of a move's bg-write-row parameter (`age` for "event", `age - 1` for "no-event"), or null without one. */
export function liveMoveBgWriteRow(moveId: number, side?: "player" | "opponent"): number | null {
  const p = LIVE_MOVE_TIMING_POLICY[moveId]?.parameters.find((q) => q.kind === "bg-write-row" && (q.side === undefined || q.side === side)) ?? null;
  return p === null ? null : p.chosen === "event" ? p.age : p.age - 1;
}

/** The chosen row of a move's palette-transfer-row parameter (`age` for "event", `age - 1` for "no-event"), or null without one. */
export function liveMovePaletteTransferRow(moveId: number): number | null {
  const p = liveMoveTimingParameter(moveId, "palette-transfer-row");
  return p === null ? null : p.chosen === "event" ? p.age : p.age - 1;
}
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
  // D4b: Megahorn (liveOamMoves.ts liveMegahornInputs; fixtures tools/integration/fixtures/d4a-live/megahorn-*).
  224,
  // D4b: Revenge (liveOamMoves.ts liveRevengeInputs; fixtures tools/integration/fixtures/d4a-live/revenge-*).
  279,
  // D4c: Psywave (liveOamMoves.ts livePsywaveInputs; fixtures tools/integration/fixtures/d4a-live/psywave-*).
  149,
  // D4c: Extrasensory (liveOamMoves.ts liveExtrasensoryInputs; first bodies; fixtures tools/integration/fixtures/d4a-live/extrasensory-*).
  326,
  // D4b: Meteor Mash (D3 + D4; Random2 twinkles from the presentation host, liveMovePresentationRng.ts plan 309).
  309,
  // S10A: Nightmare (liveOamMoves.ts liveNightmareInputs; any known lend; fixtures tools/integration/fixtures/d4a-live/nightmare-*).
  171,
  // D4 (S10A): Superpower first body (liveSuperpowerInputs.ts; per-side monbg write row; fixtures tools/integration/fixtures/s10a-live/superpower-*).
  276,
  // S10A: Ice Ball counter 0 (D3 + D4; liveIceBallInputs.ts; Random2 shards from the presentation host, counter-keyed plan; no-lag policy;
  // fixtures tools/integration/fixtures/s10a-live/ice-ball-*).
  301,
]);
