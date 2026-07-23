// App-side trace renderer.
//
// Replays a trace against the real engine code (the same modules the Vite
// build ships) and returns raw RGBA frames for each captured frame, so
// tools/compare/run.ts can diff them against the oracle.

import type { Trace } from "./oracleClient.ts";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
import { normalizeButtons } from "../../src/input.ts";
import type { EngineState } from "../../src/engine/core.ts";
import {
  BATTLE2_OFF_TURN1_COMMAND_DURATIONS,
  BATTLE2_OFF_TURN1_SCENARIO,
} from "../../src/engine/battle2OffScenario.ts";
import { stageBattleTurn } from "../../src/engine/stagedBattleTurn.ts";

export interface AppCapture {
  frame: number;
  /** Raw RGBA pixels, 240*160*4 bytes. */
  rgba: Buffer | Uint8Array;
}

type AppStage = (state: EngineState) => EngineState;

/**
 * Named, dev-time-only staging registry. A stage may replace logical state at
 * a target boundary while the oracle still replays the untouched anchor
 * trace. Production code never imports this registry.
 */
const APP_STAGES: Readonly<Record<string, AppStage>> = {
  "battle2-off-turn1-before-confirm": (state) => ({
    ...state,
    rngMode: "frontierBattle",
    rngValue: BATTLE2_OFF_TURN1_SCENARIO.initial.rngValue,
    battleControllerExecFlags: 1,
    battle2Turn1: null,
    stagedBattleTurn: stageBattleTurn(
      BATTLE2_OFF_TURN1_SCENARIO,
      // Confirm-relative OFF ledger: player resolution through +160,
      // opponent text/effect/stat message through +400, turn/menu gate +405.
      BATTLE2_OFF_TURN1_COMMAND_DURATIONS,
    ),
  }),
};

export async function renderAppTrace(trace: Trace): Promise<AppCapture[]> {
  let state = createInitialState();
  const captureFrames = new Set(trace.captureFrames ?? []);
  const captures: AppCapture[] = [];
  let frame = 0;

  const applyStage = (): void => {
    if (!trace.appStage || trace.appStage.frame !== frame) return;
    const stage = APP_STAGES[trace.appStage.id];
    if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
    state = stage(state);
  };

  applyStage();
  if (captureFrames.has(frame)) captures.push({ frame, rgba: render(state) });

  for (const segment of trace.segments) {
    const buttons = new Set(normalizeButtons(segment.buttons ?? []));
    for (let i = 0; i < segment.frames; i += 1) {
      state = tick(state, buttons);
      frame += 1;
      applyStage();
      if (captureFrames.has(frame)) captures.push({ frame, rgba: render(state) });
    }
  }

  return captures;
}
