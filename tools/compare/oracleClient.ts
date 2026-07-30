// HTTP client for the shared oracle service (see the harness's oracle/ dir).
// Unlike pokered-pewter, the oracle here is not importable in-process — it is
// an mGBA-backed Python service — so the compare tooling always talks HTTP.

import { PNG } from "pngjs";
import {
  oracleUrlForProfile,
  type OracleProfile,
} from "./oracleProfiles.ts";

export { oracleUrlForProfile, type OracleProfile } from "./oracleProfiles.ts";

export interface TraceSegment {
  frames: number;
  buttons?: string[];
}

export interface Trace {
  segments: TraceSegment[];
  captureFrames?: number[];
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

export async function oracleInfo(
  profile: OracleProfile = "battle-scene-on",
): Promise<Record<string, unknown>> {
  const response = await fetch(`${oracleUrlForProfile(profile)}/v1/info`);
  if (!response.ok) throw new Error(`oracle /v1/info failed: HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

export async function runOracleTrace(trace: Trace): Promise<OracleRunResult> {
  const profile = trace.oracleProfile ?? "battle-scene-on";
  const {
    appStage: _appStage,
    oracleBattleLab: _oracleBattleLab,
    ...oracleTrace
  } = trace;
  const response = await fetch(`${oracleUrlForProfile(profile)}/v1/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(oracleTrace),
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

export async function runOracleBattleLab(
  scenario: Readonly<Record<string, unknown>>,
  trace: Trace,
): Promise<OracleRunResult> {
  const profile = trace.oracleProfile ?? "battle-scene-on";
  const {
    appStage: _appStage,
    oracleBattleLab: _oracleBattleLab,
    oracleProfile: _oracleProfile,
    ...oracleTrace
  } = trace;
  const response = await fetch(`${oracleUrlForProfile(profile)}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...scenario,
      profile,
      trace: oracleTrace,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `oracle /v1/battle-lab/run failed: HTTP ${response.status}: ${await response.text()}`,
    );
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
