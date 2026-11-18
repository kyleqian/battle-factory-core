// lbw7 (ISSUES #221): RETIRE-YES reaches the loss script (LostChallenge), but its `factory_save` wait runs 6 ticks longer than a loss's:
// ROM SE_SAVE at second-page release + 179 (lbra-retire-off: A 7324 -> 7503) vs + 173 (lbra-loss-off: A 3834 -> 4007).
import { describe, expect, it } from "vitest";
import "../tools/compare/harnessPlayerName.ts";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { presentationRngFromTrace } from "../src/engine/presentationRngHost.ts";
import { applyTraceStage } from "../tools/compare/appTrace.ts";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import {
  FACTORY_LOSS_TERMINAL_PROFILE,
  FACTORY_RETIRE_TERMINAL_PROFILE,
  RETIRE_SAVE_EXTRA,
  factoryTerminalRestoreAge,
} from "../src/engine/factoryTerminalPresentation.ts";

function stateAt(name: string, frame: number): EngineState {
  const trace = loadCompareTrace(`tools/compare/traces/${name}.json`);
  const pr = presentationRngFromTrace(trace);
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene, presentationSeed: pr.seed, presentationRngPolicy: pr.policy });
  if (trace.appStage?.frame === 0) state = applyTraceStage(trace, state);
  for (const a of traceAdvances(trace.segments)) {
    state = tick(state, a.buttons);
    if (trace.appStage?.frame === a.frame) state = applyTraceStage(trace, state);
    if (trace.appRngRebase?.frame === a.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
    if (a.frame === frame) break;
  }
  return state;
}

describe("lbw7 retire save wait", () => {
  it("the retire profile is the loss profile with a 6-tick longer status wait", () => {
    expect(RETIRE_SAVE_EXTRA).toBe(6);
    expect(FACTORY_RETIRE_TERMINAL_PROFILE.statusClearDelayFromSecondRelease).toBe(
      FACTORY_LOSS_TERMINAL_PROFILE.statusClearDelayFromSecondRelease + 6,
    );
    expect(FACTORY_RETIRE_TERMINAL_PROFILE.recordPromptDelayFromRestore).toBe(FACTORY_LOSS_TERMINAL_PROFILE.recordPromptDelayFromRestore);
  });

  it("the retire route's terminal restores 56 ticks after the second release, the loss route's 50", () => {
    const retire = stateAt("lbra-retire-off", 7330).factoryTerminal!;
    const loss = stateAt("lbra-loss-off", 3840).factoryTerminal!;
    expect(retire.secondPageReleaseAge).not.toBeNull();
    expect(factoryTerminalRestoreAge(retire)! - retire.secondPageReleaseAge!).toBe(56);
    expect(loss.secondPageReleaseAge).not.toBeNull();
    expect(factoryTerminalRestoreAge(loss)! - loss.secondPageReleaseAge!).toBe(50);
  });
});
