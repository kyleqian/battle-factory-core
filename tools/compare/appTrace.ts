// App-side trace renderer — STAGE 0 WIRES THIS UP.
//
// Contract: replay a trace against the real engine code (the same modules the
// Vite build ships) and return raw RGBA frames for each captured frame, so
// tools/compare/run.ts can diff them against the oracle. pokered-pewter drove
// its engine through node-canvas here; do whatever fits the engine you build,
// but it MUST exercise the production render path, not a lookalike.

import type { Trace } from "./oracleClient.ts";

export interface AppCapture {
  frame: number;
  /** Raw RGBA pixels, 240*160*4 bytes. */
  rgba: Buffer | Uint8Array;
}

export async function renderAppTrace(_trace: Trace): Promise<AppCapture[]> {
  throw new Error(
    "tools/compare/appTrace.ts is a template stub: the roadmap's first stage wires the real engine here. " +
      "Until then, run traces against the oracle alone with `bin/oracle run`.",
  );
}
