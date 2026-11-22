// lbf1: after the Lobby's farewell the ROM's `releaseall` returns field control on the frame the dismiss's box is cleared (dismiss A + 2), and a
// d-pad press there turns the player; the app made the walkable Lobby on that tick but did not step it, so the press was lost and the player
// stayed (ROM vs app: lbf1-loss-no-dpad2-off first diff 5094, lbf1-loss-yes-dpad2-off, lbf1-forfeit-dpad2-off). Same rule at both levels.
import { describe, expect, it } from "vitest";
import "../tools/compare/harnessPlayerName.ts";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { presentationRngFromTrace } from "../src/engine/presentationRngHost.ts";
import { applyTraceStage } from "../tools/compare/appTrace.ts";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

function replay(name: string, last: number): Map<number, EngineState> {
  const trace = loadCompareTrace(`tools/compare/traces/${name}.json`);
  const pr = presentationRngFromTrace(trace);
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene, presentationSeed: pr.seed, presentationRngPolicy: pr.policy });
  if (trace.appStage?.frame === 0) state = applyTraceStage(trace, state);
  const rows = new Map<number, EngineState>();
  for (const a of traceAdvances(trace.segments)) {
    state = tick(state, a.buttons);
    if (trace.appStage?.frame === a.frame) state = applyTraceStage(trace, state);
    if (trace.appRngRebase?.frame === a.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
    rows.set(a.frame, state);
    if (a.frame === last) break;
  }
  return rows;
}

describe("lbf1: free control returns on the releaseall frame (dismiss A + 2)", () => {
  const cases = [
    { name: "lbf1-loss-no-dpad2-off", dismiss: 5090, last: 5101 },
    { name: "lbf1-loss-yes-dpad2-off", dismiss: 5120, last: 5131 },
    { name: "lbf1-forfeit-dpad2-off", dismiss: 1022, last: 1033 },
  ];
  for (const c of cases) {
    it(`${c.name}: a DOWN on dismiss + 2 starts the turn, a DOWN on dismiss + 1 is not taken`, () => {
      const rows = replay(c.name, c.last);
      // traceAdvances numbers a tick by 1 + its trace frame: row dismiss + 1 + k is the state after the tick of the frame dismiss + k
      const at = (k: number): EngineState => rows.get(c.dismiss + 1 + k)!;
      expect(at(0).factoryTerminal).not.toBeNull();
      expect(at(1).lobbyFreeRoam).toBeFalsy();
      expect(at(2).lobbyFreeRoam).toBeTruthy();
      expect(at(2).lobbyFreeRoam!.pendingDir).toBe("south");
      expect(at(4).lobbyFreeRoam!.turnTarget).toBe("south");
      expect(at(4).lobbyFreeRoam!.facing === "south" || at(4).lobbyFreeRoam!.turnRemaining > 0).toBe(true);

      const early = tick(at(0), ["DOWN"]);
      const early2 = tick(early, []);
      expect(early.lobbyFreeRoam).toBeFalsy();
      expect(early2.lobbyFreeRoam?.pendingDir ?? null).toBeNull();
    });
  }
});
