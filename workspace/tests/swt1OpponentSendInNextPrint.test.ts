// swt1: after an opponent faint replacement the next script print (here the poisoned player's tick) is 12 rows after the `waitstate` release
// (ROM lab swt1-foe-faint-poison, Scene ON: FaintedMonSendOutNew+0x10 ex0 at 1986 -> FaintedMonEnd+0x0 1991 -> PoisonTurnDmg+0x0 1998 -> glyph 1999 / 2000);
// the engine's next command used to start 3 rows after it. Pins the switch-in's hold (11 + 9) and the gap to the tick message.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { OPPONENT_SEND_IN_NEXT_PRINT_FRAMES, SWITCH_IN_WAITSTATE_HOLD_FRAMES } from "../src/engine/battleResolutionPresentation.ts";
import { readFileSync } from "node:fs";

const appTracePath = "../tools/compare/appTrace.ts";
const { applyTraceStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  applyTraceStage: (trace: unknown, state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>;
};
const lab = JSON.parse(readFileSync(new URL("../tools/battle-lab/swt1-foe-faint-poison.json", import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };

for (const [scene, gap] of [["on", 160]] as const) {
  describe(`opponent faint replacement, next print (Scene ${scene.toUpperCase()}, swt1)`, () => {
    const trace = {
      route: "generated-orchestrator", appRoute: "generated-orchestrator", battleScene: scene, oracleProfile: `battle-scene-${scene}`,
      segments: lab.trace.segments, captureFrames: [0],
      appStage: { id: "lab", frame: 0 }, oracleBattleLab: { scenario: "../../battle-lab/swt1-foe-faint-poison.json" },
    };
    let state = applyTraceStage(trace, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
    const starts: Array<{ frame: number; command: Record<string, unknown> }> = [];
    let last: unknown = null;
    for (const advance of traceAdvances(lab.trace.segments)) {
      if (advance.frame > 2600) break;
      state = tick(state, advance.buttons);
      const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex] as Record<string, unknown> | undefined;
      if (command !== undefined && command !== last) starts.push({ frame: advance.frame, command });
      last = command;
    }
    it("the opponent switch-in holds 9 more frames and the tick message starts that much later", () => {
      const index = starts.findIndex((entry) => entry.command.type === "switch-in" && entry.command.battler === 1);
      expect(index).toBeGreaterThan(0);
      const sendIn = starts[index]!;
      expect(sendIn.command.settleHoldFrames).toBe(SWITCH_IN_WAITSTATE_HOLD_FRAMES + OPPONENT_SEND_IN_NEXT_PRINT_FRAMES);
      const next = starts[index + 1]!;
      expect(next.command.type).toBe("message");
      expect(next.frame - sendIn.frame).toBe(gap);
    });
  });
}
