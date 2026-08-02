// HTTP client for the shared oracle service (see the harness's oracle/ dir).
// Unlike pokered-pewter, the oracle here is not importable in-process — it is
// an mGBA-backed Python service — so the compare tooling always talks HTTP.

import { PNG } from "pngjs";
import {
  oracleUrlForProfile,
  type OracleProfile,
} from "./oracleProfiles.ts";
import { stripAppTraceMetadata } from "./traceMetadata.ts";
import type { Trace } from "./traceTypes.ts";

export { oracleUrlForProfile, type OracleProfile } from "./oracleProfiles.ts";

export type { Trace, TraceSegment } from "./traceTypes.ts";

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

function decodePreCheckpointRun(
  payload: {
    totalFrames: number;
    battleLab?: {
      preCheckpointCaptures?: Array<{ frame: number; sha256: string; pngBase64: string }>;
    };
  },
  frameOffset: number,
  wanted: ReadonlySet<number> | null,
): OracleRunResult {
  const captures = (payload.battleLab?.preCheckpointCaptures ?? [])
    .map((capture) => {
      const png = Buffer.from(capture.pngBase64, "base64");
      const decoded = PNG.sync.read(png);
      return {
        frame: capture.frame - frameOffset,
        sha256: capture.sha256,
        rgba: decoded.data,
        png,
      };
    })
    .filter((capture) => wanted === null || wanted.has(capture.frame));
  return { totalFrames: payload.totalFrames, captures };
}

export async function runOracleBattleLab(
  scenario: Readonly<Record<string, unknown>>,
  trace: Trace,
): Promise<OracleRunResult> {
  const profile = trace.oracleProfile ?? "battle-scene-on";
  const frameOffset = trace.oracleBattleLab?.preCheckpointFrameOffset;
  const {
    oracleProfile: _oracleProfile,
    ...oracleTrace
  } = stripAppTraceMetadata(trace);
  if (frameOffset !== undefined) {
    // Pre-checkpoint captures are driven entirely by the scenario's own
    // preCheckpointCaptureFrames/-AllFrames request field (BATTLE_LAB.md),
    // not by the post-checkpoint trace, so keep the post-checkpoint request
    // minimal — a real (large) post-checkpoint captureFrames list here would
    // just trigger extra full-route replay batches for frames this path
    // never reads.
    const response = await fetch(`${oracleUrlForProfile(profile)}/v1/battle-lab/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...scenario,
        profile,
        trace: { segments: [], captureFrames: [0] },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `oracle /v1/battle-lab/run failed: HTTP ${response.status}: ${await response.text()}`,
      );
    }
    const payload = await response.json() as {
      totalFrames: number;
      battleLab?: {
        preCheckpointCaptures?: Array<{ frame: number; sha256: string; pngBase64: string }>;
      };
    };
    const wanted = trace.captureFrames === undefined ? null : new Set(trace.captureFrames);
    return decodePreCheckpointRun(payload, frameOffset, wanted);
  }
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
