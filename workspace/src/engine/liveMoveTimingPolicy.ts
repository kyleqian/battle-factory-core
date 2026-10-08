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

export type LiveMoveTimingParameterKind = "optional-lag-age" | "bg-write-row" | "palette-transfer-row" | "scanline-split-line" | "oam-transfer-row"
  | "palette-upload-scanline";
/**
 * "event" = the optional lag frame / late write happens; "no-event" = it does not (the source iteration count). Per kind:
 * - optional-lag-age: "event" = the optional lag frame at `age` is present (one more body row).
 * - bg-write-row: "event" = the LATER of the two write rows (`age`; the slower-CPU phase), "no-event" = the earlier row (`age - 1`).
 *   A tie therefore selects the earlier write row.
 * - palette-transfer-row: "event" = the later transfer row.
 * - oam-transfer-row: "event" = the hardware OAM / matrix buffer of row `age` still shows the sprite state of `age - 2` (the VBlank OAM transfer
 *   of the previous frame did not carry the new affine state), "no-event" = the ordinary one-row latch (`age - 1`).
 * - palette-upload-scanline: a main-loop palette upload lands while row `age` is scanned out; "event" = the measured late band (the upper
 *   scanlines keep the previous row's palette), "no-event" = an earlier upload (a shallower band: none, or fewer lines).
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
  /** Rollout-counter body this parameter applies to (absent = every body): Ice Ball's lag rows are measured per counter body. */
  rolloutCounter?: number;
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
   * S10A Skill Swap (docs/next-adapters-prep35.md s0.4 T / s1.4; tools/integration/fixtures/prep35/skillswap-check-pixels.json windows[].T;
   * prep33 s0.3): (a) an optional lag at row 176 (the restore Task_FadeToBg counts executed frames) in 4 of 6 measured windows (accepted
   * player, ALAKAZAM -> GOLEM player, ESPEON -> WEEZING player, WEEZING -> SNORLAX opponent), absent in the accepted opponent and ALAKAZAM ->
   * GOLEM opponent: 196 body rows with it, 195 without; wrong phase moves the restore fade on rows 177..192. (b) UnsetPsychicBackground's
   * bank-2 restore lands on row 175 in 5 of 6 windows and on row 176 in ALAKAZAM -> GOLEM player (whose restoring iteration the lag splits).
   * Display-neutral: BLDY 16 on rows 175..177 darkens bank 2 to black in both phases.
   */
  285: {
    move: "MOVE_SKILL_SWAP",
    parameters: [{
      kind: "optional-lag-age", age: 176, fixedLagAges: [], iterations: 195,
      alternatives: [{ phase: "event", bodyRows: 196, measured: 4 }, { phase: "no-event", bodyRows: 195, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep35/skillswap-check-pixels.json windows[].T.lagRow176 (4 of 6)", "docs/next-adapters-prep35.md s1.4",
        "tools/integration/fixtures/s10a-live/skill-swap-*.json (the same 6 windows re-probed fresh)"],
    }, {
      kind: "palette-transfer-row", age: 176, fixedLagAges: [], iterations: 195,
      alternatives: [{ phase: "event", bodyRows: 196, measured: 1 }, { phase: "no-event", bodyRows: 196, measured: 5 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep35/skillswap-check-pixels.json windows[].T.restoreRow (175: 5, 176: 1)", "docs/next-adapters-prep35.md s1.4"],
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
   * ISSUES #151 Hyper Voice (docs/issue151-diagnosis.md s1, docs/live-species-audit-7.md): the second effect call's yellow BG blend is uploaded
   * partway into the age-59 frame; scanlines above that point keep the age-58 palette. Band depth per measured window (32 non-shiny windows,
   * twice fresh): 16 for EXPLOUD / LOUDRED / STEELIX / WAILORD attackers (both sides), FLYGON / GOLBAT opponent-side attackers and every target
   * swap (26, incl. the 8 q2-live fixtures); 15 for FLYGON / GOLBAT player-side attackers (2); 0 for PICHU / RATTATA attackers (4). Dominant:
   * the 16-line band (today's reducer). Wrong phase: row 59 only (scanline 15: 229 px; scanlines 0..15: 3,818 / 3,840 px).
   */
  304: {
    move: "MOVE_HYPER_VOICE",
    parameters: [{
      kind: "palette-upload-scanline", age: 59, fixedLagAges: [], iterations: 104,
      alternatives: [{ phase: "event", bodyRows: 104, measured: 26 }, { phase: "no-event", bodyRows: 104, measured: 6 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["docs/issue151-diagnosis.md s1 (band depth 16 / 15 / 0)", "tools/integration/fixtures/issue151/hyper-voice-upper-rows-env.diff (patch proof: measured depth -> 0 px)",
        "tools/integration/fixtures/d4d2-live-receipt.json hyper-voice-* windows"],
    }],
  },
  /**
   * ISSUES #151 Sheer Cold (docs/issue151-diagnosis.md s1-s3, tools/integration/fixtures/issue151/sheer-cold-counters.txt, docs/live-species-audit-7.md):
   * the restorebg fade-in ends one row later when the age-171 frame lags (fixed lags 151, 152 in every window); measured PER SIDE (31 windows,
   * twice fresh): opponent attacker no lag 11 / lag 5 -> no lag (restore fade end 188); player attacker lag 13 / no lag 2 -> lag (189). Both
   * equal the reducer's side defaults (sheerCold.ts restoreEndAge). Wrong phase: one BLDY step on the tail ages 172..189 (~16.6k-18.6k px/row).
   */
  329: {
    move: "MOVE_SHEER_COLD",
    parameters: [{
      kind: "optional-lag-age", age: 171, fixedLagAges: [151, 152], iterations: 188, side: "player",
      alternatives: [{ phase: "event", bodyRows: 191, measured: 13 }, { phase: "no-event", bodyRows: 190, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/issue151/sheer-cold-counters.txt (player attacker: age-171 lag 13 of 15)", "docs/issue151-diagnosis.md s1 table 2"],
    }, {
      kind: "optional-lag-age", age: 171, fixedLagAges: [151, 152], iterations: 188, side: "opponent",
      alternatives: [{ phase: "event", bodyRows: 191, measured: 5 }, { phase: "no-event", bodyRows: 190, measured: 11 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/issue151/sheer-cold-counters.txt (opponent attacker: age-171 lag 5 of 16)", "docs/issue151-diagnosis.md s1 table 2"],
    }],
  },
  /**
   * S10A Dive SETUP body, player attacker (tools/integration/fixtures/s10a-live/dive-*.json, d4d2-live-receipt.json): the splash reuses the
   * ball's affine matrix at age 67; on row 68 the hardware OAM shows the source state of age 66 (the renderer's measured reused-affine
   * exception, battleScene.ts DIVE) in 4 of 6 measured player windows (accepted CHINCHOU -> ONIX, prep25 LANTURN -> GOLEM, CHINCHOU -> SHUCKLE,
   * prep11 CHINCHOU -> GOLEM) and the ordinary age 67 in 2 (CHINCHOU -> GOLBAT and CHINCHOU -> GOLEM after a Tackle): a VBlank-transfer CPU
   * phase. Opponent-attacker setups have no such row (3 of 3 exact under the ordinary latch). Wrong phase: row 68 only (the splash / ball).
   * Also D3 (Random2 droplets).
   */
  291: {
    move: "MOVE_DIVE",
    parameters: [{
      kind: "oam-transfer-row", age: 68, fixedLagAges: [], iterations: 117, side: "player",
      alternatives: [{ phase: "event", bodyRows: 118, measured: 4 }, { phase: "no-event", bodyRows: 118, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/d4d2-live-receipt.json dive-* player windows (row 68 source 66: 4, source 67: 2)",
        "tools/compare/fixtures/dive-evidence.json (accepted player-back setup row 68: source 66)"],
    }, {
      // Species audit 11 / ISSUES #152 (a13fix): an optional main-loop lag at age 64 of an OPPONENT-attacker setup (CLAMPERL after a Tackle,
      // lag ages [64]); the other 6 counted opponent setups have none. The setup still ends on the same row (115 body rows in both phases:
      // the lag is absorbed before the first inactive row), so only the splash / droplet rows 66..95 run one row late. Not rendered.
      kind: "optional-lag-age", age: 64, fixedLagAges: [], iterations: 115, side: "opponent",
      alternatives: [{ phase: "event", bodyRows: 115, measured: 1 }, { phase: "no-event", bodyRows: 115, measured: 6 }],
      chosen: "no-event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/species-audit-11/counters.txt (opponent dive setups: clamperlA lag [64]; tyranitar, tyranitarA, luvdiscA, "
        + "dive-opponent-chinchou-player-onix, dive-extra-opponent-chinchou-golem none)",
        "tools/integration/fixtures/a13fix-live/counters.txt (fresh: s10a-live dive-alt-opponent-lanturn-golem none; the two chinchou fixtures none again)",
        "tools/integration/fixtures/a13fix-live-receipt.json dive"],
    }],
  },
  /**
   * a13fix (species audit 13, docs/live-species-audit-13.md LAG FRAME): Crunch's dark-background body has fixed lags at 98 / 99 and an
   * optional main-loop lag at age 121 (the closing fade one row later): 142 body rows with it, 141 without. Wrong phase: the closing fade
   * rows 123..138 only (~18.2k-19.1k px per row, full field).
   */
  242: {
    move: "MOVE_CRUNCH",
    parameters: [{
      kind: "optional-lag-age", age: 121, fixedLagAges: [98, 99], iterations: 139,
      alternatives: [{ phase: "event", bodyRows: 142, measured: 17 }, { phase: "no-event", bodyRows: 141, measured: 13 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/species-audit-13/receipts (30 defender-doll Crunch windows: 142 rows 17, 141 rows 13)",
        "tools/integration/fixtures/species-audit-13/counters.txt (142-row windows lag [98, 99, 121]; 141-row windows [98, 99])",
        "tools/integration/fixtures/a13fix-live-receipt.json crunch"],
    }],
  },
  /**
   * a13fix (species audit 13 LAG FRAME): Psychic's background body has fixed lags at 101 / 102 and an optional lag at ROM body age 124:
   * 145 rows with it, 144 without (the adapter window starts 5 rows after activation, LIVE_SUBSTITUTE_SWAP_BODY_FRAMING 94). Wrong phase: rows
   * 126..141 only (the closing fade).
   */
  94: {
    move: "MOVE_PSYCHIC",
    parameters: [{
      kind: "optional-lag-age", age: 124, fixedLagAges: [101, 102], iterations: 142,
      alternatives: [{ phase: "event", bodyRows: 145, measured: 26 }, { phase: "no-event", bodyRows: 144, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/species-audit-13/receipts (28 defender-doll Psychic windows: 145 rows 26, 144 rows 2)",
        "tools/integration/fixtures/species-audit-13/counters.txt (145-row windows lag [101, 102, 124]; 144-row windows [101, 102])",
        "tools/integration/fixtures/a13fix-live-receipt.json psychic"],
    }],
  },
  /**
   * a13fix (species audit 11 / ISSUES #152): Extreme Speed has an optional main-loop lag at age 292 before its fixed lag pair (312 / 313
   * without it, 313 / 314 with it): 321 body rows with it, 320 without. Wrong phase: rows 294..309 only.
   */
  245: {
    move: "MOVE_EXTREME_SPEED",
    parameters: [{
      kind: "optional-lag-age", age: 292, fixedLagAges: [312, 313], iterations: 318,
      alternatives: [{ phase: "event", bodyRows: 321, measured: 38 }, { phase: "no-event", bodyRows: 320, measured: 4 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/species-audit-11/receipts (42 Extreme Speed windows: 321 rows 38, 320 rows 4)",
        "tools/integration/fixtures/species-audit-11/counters.txt (321-row windows lag [292, 313, 314]; 320-row windows [312, 313])",
        "tools/integration/fixtures/a13fix-live-receipt.json extreme-speed"],
    }],
  },
  /**
   * S10A Ice Ball (docs/next-adapters-prep26.md s1.4 H / s4 item 6; tools/integration/fixtures/prep26/iceball-check.json lagRows): 0-step lag rows
   * (an animationRng stall: VBlank overrun), measured PER COUNTER BODY (request.rolloutCounter 1..5; 18 bodies): none in any counter 0..2 body
   * (accepted SPHEAL player / opponent + GLALIE -> GOLEM player / opponent: 4 each), counter 3 (body 4) row 38 in 1 of 3 (accepted player; not
   * accepted opponent, not GLALIE player), counter 4 (body 5) row 112 in 2 of 3 (accepted player and opponent; not GLALIE player). Dominant:
   * no lag for counters 0..3, the row-112 lag for counter 4. A lag row repeats the previous hardware OAM, holds the sprites and moves the task
   * step one row earlier. Later counters take the seam-resolved deferred lend (docs/s10a-random2-order-lend-blocker.md design 1). Also D3.
   */
  301: {
    move: "MOVE_ICE_BALL",
    parameters: [
      ...[1, 2, 3].map((rolloutCounter) => ({
        kind: "optional-lag-age" as const, age: 38, fixedLagAges: [], iterations: 75, rolloutCounter,
        alternatives: [{ phase: "event" as const, bodyRows: 77, measured: 0 }, { phase: "no-event" as const, bodyRows: 76, measured: 4 }] as const,
        chosen: "no-event" as const, tieRuleUsed: false,
        evidence: ["tools/integration/fixtures/prep26/iceball-check.json lagRows (counter body: no lag in 4 of 4 windows)"],
      })),
      {
        kind: "optional-lag-age", age: 38, fixedLagAges: [], iterations: 75, rolloutCounter: 4,
        alternatives: [{ phase: "event", bodyRows: 77, measured: 1 }, { phase: "no-event", bodyRows: 76, measured: 2 }],
        chosen: "no-event", tieRuleUsed: false,
        evidence: ["tools/integration/fixtures/prep26/iceball-check.json lagRows (body 4: accepted player [38]; accepted opponent, GLALIE player none)"],
      },
      {
        kind: "optional-lag-age", age: 112, fixedLagAges: [], iterations: 131, rolloutCounter: 5,
        alternatives: [{ phase: "event", bodyRows: 133, measured: 2 }, { phase: "no-event", bodyRows: 132, measured: 1 }],
        chosen: "event", tieRuleUsed: false,
        evidence: ["tools/integration/fixtures/prep26/iceball-check.json lagRows (body 5: accepted player [112], accepted opponent [112]; GLALIE player none)"],
      },
    ],
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
/** The chosen phase of a move's per-side parameter (a parameter without `side` applies to both), or null without one. */
export function liveMoveTimingSidePhase(moveId: number, kind: LiveMoveTimingParameterKind, side: "player" | "opponent"): LiveMoveTimingPhase | null {
  return LIVE_MOVE_TIMING_POLICY[moveId]?.parameters.find((p) => p.kind === kind && (p.side === undefined || p.side === side))?.chosen ?? null;
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

/** Rollout-counter parameter of a move (Ice Ball: one optional-lag parameter per counter body), or null. */
export function liveMoveCounterTimingParameter(moveId: number, kind: LiveMoveTimingParameterKind, rolloutCounter: number): LiveMoveTimingParameter | null {
  return LIVE_MOVE_TIMING_POLICY[moveId]?.parameters.find((p) => p.kind === kind && p.rolloutCounter === rolloutCounter) ?? null;
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
  // ISSUES #151 (reclassified from scoped exact): Hyper Voice (liveQ2Moves.ts liveHyperVoiceInputs; the age-59 palette-upload band; exact fixtures
  // tools/integration/fixtures/q2-live/hyper-voice-*, alternate-phase audit-7 windows tools/integration/fixtures/d4d2-live/hyper-voice-*).
  304,
  // ISSUES #151 (reclassified from scoped exact): Sheer Cold first body (liveProfileMoves.ts liveSheerColdInputs; per-side age-171 restore lag;
  // exact fixtures tools/integration/fixtures/sheer-cold-live, alternate-phase audit-7 windows tools/integration/fixtures/d4d2-live/sheer-cold-*).
  329,
  // S10A: Dive SETUP body (D3 + D4; Random2 droplets from the presentation host; the player row-68 OAM transfer phase; liveMoveAnimation.ts 291;
  // fixtures tools/integration/fixtures/s10a-live/dive-*).
  291,
  // S10A: Skill Swap, known lend (liveOamMoves.ts liveSkillSwapInputs + liveSkillSwapInputs.ts; lag at 176; fixtures
  // tools/integration/fixtures/s10a-live/skill-swap-*).
  285,
  // S10A: Ice Ball counter 0 (D3 + D4; liveIceBallInputs.ts; Random2 shards from the presentation host, counter-keyed plan; no-lag policy;
  // fixtures tools/integration/fixtures/s10a-live/ice-ball-*).
  301,
  // a13fix (reclassified from scoped exact, #151 precedent): Crunch, Psychic, Extreme Speed gained a measured optional-lag parameter
  // (species audits 11 / 13); their exact fixtures stay valid in scope; durations read liveMoveTimingBodyRows.
  242, 94, 245,
]);

/**
 * Status-animation CPU-phase parameters (not move bodies, never counted as faithful-timing adapters). S10A General_SubstituteFade
 * (liveSubstituteFade.ts; docs/next-adapters-prep39.md s3; fade-live-receipt.json): the VBlank copy of BLDALPHA / BLDCNT lands one
 * row early on a minority of steps. The live renderer ships the dominant phase ("event" = the later row, the source write row r
 * read after r + 1; "no-event" = the I/O already holds the write after row r).
 * - each BLDALPHA step (k = 1..16 on RAM rows 6, 9, .., 51): 222 of 224 measured steps (14 windows x 16) on the later row; 2 one
 *   row early, both in prep39-on-player-persian-onix @3822 (display rows 27 and 45, 271 px each: the documented alternate rows);
 * - blendoff (RAM row 61): 12 of 14 windows on the later row; 2 one row early (GOLBAT @3790, GOLEM opponent @3790), 0 px (eva is
 *   0 from row 52 and the BG copy is gone).
 */
export const LIVE_STATUS_ANIMATION_TIMING_POLICY: Readonly<Record<string, Readonly<{
  animation: string; parameters: readonly LiveMoveTimingParameter[];
}>>> = Object.freeze({
  SUBSTITUTE_FADE: {
    animation: "General_SubstituteFade",
    parameters: [{
      kind: "bg-write-row", age: 6, fixedLagAges: [], iterations: 103,
      alternatives: [{ phase: "event", bodyRows: 103, measured: 222 }, { phase: "no-event", bodyRows: 103, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/fade-live-receipt.json (alpha steps: 222 later / 2 early, rows 27 / 45 of persian-onix @3822)",
        "tools/integration/fixtures/prep39/fade-check.json componentMiss bldalpha-one-row-early", "docs/next-adapters-prep39.md s3"],
    }, {
      kind: "bg-write-row", age: 62, fixedLagAges: [], iterations: 103,
      alternatives: [{ phase: "event", bodyRows: 103, measured: 12 }, { phase: "no-event", bodyRows: 103, measured: 2 }],
      chosen: "event", tieRuleUsed: false,
      evidence: ["tools/integration/fixtures/prep39/fade-check.json componentMiss bldcnt-one-row-early (golbat @3790, golem opponent @3790; 0 px)",
        "docs/next-adapters-prep39.md s3"],
    }],
  },
});
