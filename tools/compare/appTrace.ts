// App-side trace renderer.
//
// Replays a trace against the real engine code (the same modules the Vite
// build ships) and returns raw RGBA frames for each captured frame, so
// tools/compare/run.ts can diff them against the oracle.

import type { Trace } from "./oracleClient.ts";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
import { normalizeButtons } from "../../src/input.ts";

export interface AppCapture {
  frame: number;
  /** Raw RGBA pixels, 240*160*4 bytes. */
  rgba: Buffer | Uint8Array;
}

export async function renderAppTrace(trace: Trace): Promise<AppCapture[]> {
  let state = createInitialState();
  const captureFrames = new Set(trace.captureFrames ?? []);
  const captures: AppCapture[] = [];
  let frame = 0;

  if (captureFrames.has(frame)) captures.push({ frame, rgba: render(state) });

  for (const segment of trace.segments) {
    const buttons = new Set(normalizeButtons(segment.buttons ?? []));
    for (let i = 0; i < segment.frames; i += 1) {
      state = tick(state, buttons);
      frame += 1;
      if (captureFrames.has(frame)) captures.push({ frame, rgba: render(state) });
    }
  }

  return captures;
}
