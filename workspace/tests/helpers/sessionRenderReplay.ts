// Replays a __POKEBENCH_SESSION__ trace like main.ts does: tick, then render,
// every frame. Render throws (the Summary-screen crash class) only surface
// with the render step; tools/replay-session-trace.ts --render is the CLI.

import { createInitialState, render, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import { normalizeButtons } from "../../src/input.ts";
import type { RecordedSegment, SessionTrace } from "../../src/sessionRecorder.ts";

export function replaySessionWithRender(trace: SessionTrace): { frames: number; error: string | null } {
  const presentationRng = presentationRngFromTrace(trace);
  let state = createInitialState({
    ...(trace.appRoute ? { appRoute: trace.appRoute as never } : {}),
    battleScene: trace.battleScene ?? "off",
    presentationSeed: presentationRng.seed,
    presentationRngPolicy: presentationRng.policy,
  });
  let frames = 0;
  for (const segment of trace.segments as RecordedSegment[]) {
    const buttons = new Set(normalizeButtons(segment.buttons ?? []));
    for (let i = 0; i < segment.frames; i += 1) {
      try {
        state = tick(state, buttons);
        render(state);
      } catch (error) {
        return { frames, error: `frame ${frames}: ${error instanceof Error ? error.message : String(error)}` };
      }
      frames += 1;
    }
  }
  return { frames, error: null };
}
