// HTTP client for the shared oracle service (see the harness's oracle/ dir).
// Unlike pokered-pewter, the oracle here is not importable in-process — it is
// an mGBA-backed Python service — so the compare tooling always talks HTTP.

import { PNG } from "pngjs";

export interface TraceSegment {
  frames: number;
  buttons?: string[];
}

export interface Trace {
  segments: TraceSegment[];
  captureFrames?: number[];
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

export const ORACLE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "");

export async function oracleInfo(): Promise<Record<string, unknown>> {
  const response = await fetch(`${ORACLE_URL}/v1/info`);
  if (!response.ok) throw new Error(`oracle /v1/info failed: HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

export async function runOracleTrace(trace: Trace): Promise<OracleRunResult> {
  const response = await fetch(`${ORACLE_URL}/v1/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(trace),
  });
  if (!response.ok) {
    throw new Error(`oracle /v1/run failed: HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    totalFrames: number;
    captures: Array<{ frame: number; sha256: string; pngBase64: string }>;
  };
  return {
    totalFrames: payload.totalFrames,
    captures: payload.captures.map((capture) => {
      const png = Buffer.from(capture.pngBase64, "base64");
      const decoded = PNG.sync.read(png);
      return { frame: capture.frame, sha256: capture.sha256, rgba: decoded.data, png };
    }),
  };
}
