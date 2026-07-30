// HTTP client for the shared oracle service (see the harness's oracle/ dir).
// Unlike pokered-pewter, the oracle here is not importable in-process — it is
// an mGBA-backed Python service — so the compare tooling always talks HTTP.

import { PNG } from "pngjs";
import {
  oracleUrlForProfile,
  type OracleProfile,
} from "./oracleProfiles.ts";
import { stripAppTraceMetadata } from "./traceMetadata.ts";

export { oracleUrlForProfile, type OracleProfile } from "./oracleProfiles.ts";

export interface TraceSegment {
  frames: number;
  buttons?: string[];
}

export interface Trace {
  segments: TraceSegment[];
  captureFrames?: number[];
  /** App-only battle owner selection; never sent to the ROM oracle. */
  appRoute?: "generated-orchestrator" | "canonical-recorded";
  /**
   * Existing traces predate profiles and therefore default to Battle Scene ON.
   * New main/round-loop traces must opt into battle-scene-off explicitly.
   */
  oracleProfile?: OracleProfile;
  /** Dev-only named state injection consumed by appTrace and stripped here. */
  appStage?: {
    readonly id: string;
    readonly frame: number;
  };
  /**
   * Dev-only honest ROM staging fixture consumed by compare/run.ts.
   * The referenced battle-lab scenario supplies complete pre-battle parties;
   * this trace's controls and captures replace the scenario's nested trace.
   */
  oracleBattleLab?: {
    readonly scenario: string;
  };
}

export interface OracleCapture {
  frame: number;
  sha256: string;
  /** Raw RGBA pixels decoded from the oracle's PNG (240*160*4 bytes). */
  rgba: Buffer;
  png: Buffer;
}

export interface OracleRunResult {
  totalFrames: number;
  captures: OracleCapture[];
}

const ORACLE_MAX_CAPTURES_PER_RUN = 256;

function captureBatches(trace: Trace): Trace[] {
  const captureFrames = trace.captureFrames ?? [];
  if (captureFrames.length <= ORACLE_MAX_CAPTURES_PER_RUN) return [trace];
  const batches: Trace[] = [];
  for (
    let start = 0;
    start < captureFrames.length;
    start += ORACLE_MAX_CAPTURES_PER_RUN
  ) {
    batches.push({
      ...trace,
      captureFrames: captureFrames.slice(
        start,
        start + ORACLE_MAX_CAPTURES_PER_RUN,
      ),
    });
  }
  return batches;
}

function decodeOracleRun(payload: {
  totalFrames: number;
  captures: Array<{ frame: number; sha256: string; pngBase64: string }>;
}): OracleRunResult {
  return {
    totalFrames: payload.totalFrames,
    captures: payload.captures.map((capture) => {
      const png = Buffer.from(capture.pngBase64, "base64");
      const decoded = PNG.sync.read(png);
      return { frame: capture.frame, sha256: capture.sha256, rgba: decoded.data, png };
    }),
  };
}

export async function oracleInfo(
  profile: OracleProfile = "battle-scene-on",
): Promise<Record<string, unknown>> {
  const response = await fetch(`${oracleUrlForProfile(profile)}/v1/info`);
  if (!response.ok) throw new Error(`oracle /v1/info failed: HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

export async function runOracleTrace(trace: Trace): Promise<OracleRunResult> {
  const profile = trace.oracleProfile ?? "battle-scene-on";
  const oracleTrace = stripAppTraceMetadata(trace);
  const results: OracleRunResult[] = [];
  for (const batch of captureBatches(oracleTrace)) {
    const response = await fetch(`${oracleUrlForProfile(profile)}/v1/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      throw new Error(`oracle /v1/run failed: HTTP ${response.status}: ${await response.text()}`);
    }
    results.push(decodeOracleRun(await response.json() as {
      totalFrames: number;
      captures: Array<{ frame: number; sha256: string; pngBase64: string }>;
    }));
  }
  return {
    totalFrames: results[0]?.totalFrames ?? 0,
    captures: results.flatMap(({ captures }) => captures),
  };
}

export async function runOracleBattleLab(
  scenario: Readonly<Record<string, unknown>>,
  trace: Trace,
): Promise<OracleRunResult> {
  const profile = trace.oracleProfile ?? "battle-scene-on";
  const {
    oracleProfile: _oracleProfile,
    ...oracleTrace
  } = stripAppTraceMetadata(trace);
  const results: OracleRunResult[] = [];
  for (const batch of captureBatches(oracleTrace)) {
    const response = await fetch(`${oracleUrlForProfile(profile)}/v1/battle-lab/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...scenario,
        profile,
        trace: batch,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `oracle /v1/battle-lab/run failed: HTTP ${response.status}: ${await response.text()}`,
      );
    }
    results.push(decodeOracleRun(await response.json() as {
      totalFrames: number;
      captures: Array<{ frame: number; sha256: string; pngBase64: string }>;
    }));
  }
  return {
    totalFrames: results[0]?.totalFrames ?? 0,
    captures: results.flatMap(({ captures }) => captures),
  };
}
